import express, { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { z } from 'zod';

const router = express.Router();
const prisma = new PrismaClient();

// Validation schemas
const createOrderSchema = z.object({
  offerId: z.string().uuid(),
});

const updatePaymentSchema = z.object({
  status: z.enum(['initiated', 'confirmed']),
});

const updateDeliverySchema = z.object({
  status: z.enum(['in_progress', 'delivered', 'received']),
});

// POST /api/orders - Create order (Client accepts final offer)
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'client') {
      return res.status(403).json({ error: 'Doar clienții pot crea comenzi' });
    }

    const validation = createOrderSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Date invalide', details: validation.error });
    }

    const { offerId } = validation.data;

    // Get offer with RFQ
    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      include: {
        rfq: true,
        supplier: { select: { id: true, username: true, email: true } },
      },
    });

    if (!offer) {
      return res.status(404).json({ error: 'Oferta nu a fost găsită' });
    }

    // Check if client owns the RFQ
    if (offer.rfq.clientId !== req.user.userId) {
      return res.status(403).json({ error: 'Nu aveți permisiunea să acceptați această ofertă' });
    }

    // Check if offer is confirmed
    if (offer.status !== 'final_confirmed') {
      return res.status(400).json({ error: 'Oferta nu este confirmată final' });
    }

    // Check if RFQ is sent to client
    if (offer.rfq.status !== 'sent_to_client') {
      return res.status(400).json({ error: 'Oferta nu a fost trimisă spre aprobare' });
    }

    // Check if order already exists
    const existingOrder = await prisma.order.findFirst({
      where: { offerId },
    });

    if (existingOrder) {
      return res.status(400).json({ error: 'Comanda există deja pentru această ofertă' });
    }

    // Create order
    const order = await prisma.order.create({
      data: {
        rfqId: offer.rfqId,
        offerId,
        clientId: req.user.userId,
        supplierId: offer.supplierId,
        finalPrice: offer.price,
        finalTerms: offer.terms,
        status: 'created',
        isLocked: true,
        paymentMockStatus: 'pending',
        deliveryStatus: 'pending',
      },
      include: {
        rfq: { select: { id: true, title: true } },
        offer: true,
        client: { select: { id: true, username: true, email: true } },
        supplier: { select: { id: true, username: true, email: true } },
      },
    });

    // Update RFQ status
    await prisma.rFQ.update({
      where: { id: offer.rfqId },
      data: { status: 'closed' },
    });

    // Update offer status
    await prisma.offer.update({
      where: { id: offerId },
      data: { status: 'accepted' },
    });

    res.json({ message: 'Comanda a fost creată cu succes', order });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Eroare la crearea comenzii' });
  }
});

// GET /api/orders - List orders (filtered by role)
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const isAdmin = req.user?.role === 'admin';
    const isClient = req.user?.role === 'client';
    const isSupplier = req.user?.role === 'supplier';

    const where: any = {};

    if (isClient) {
      where.clientId = req.user.userId;
    } else if (isSupplier) {
      where.supplierId = req.user.userId;
    }
    // Admin sees all

    const orders = await prisma.order.findMany({
      where,
      include: {
        rfq: { select: { id: true, title: true } },
        client: { select: { id: true, username: true, email: true } },
        supplier: { select: { id: true, username: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ orders });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Eroare la încărcarea comenzilor' });
  }
});

// GET /api/orders/:id - Get order details
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        rfq: { select: { id: true, title: true, description: true, requirements: true } },
        offer: true,
        client: { select: { id: true, username: true, email: true } },
        supplier: { select: { id: true, username: true, email: true } },
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Comanda nu a fost găsită' });
    }

    // Check authorization
    const isAdmin = req.user?.role === 'admin';
    const isClient = req.user?.userId === order.clientId;
    const isSupplier = req.user?.userId === order.supplierId;

    if (!isAdmin && !isClient && !isSupplier) {
      return res.status(403).json({ error: 'Nu aveți permisiunea să vedeți această comandă' });
    }

    res.json({ order });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Eroare la încărcarea comenzii' });
  }
});

// PATCH /api/orders/:id/payment - Update payment status (Admin only)
router.patch('/:id/payment', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Doar administratorii pot actualiza plățile' });
    }

    const { id } = req.params;
    const validation = updatePaymentSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({ error: 'Date invalide', details: validation.error });
    }

    const { status: paymentStatus } = validation.data;

    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      return res.status(404).json({ error: 'Comanda nu a fost găsită' });
    }

    // Update payment status and order status
    const newOrderStatus =
      paymentStatus === 'initiated'
        ? 'payment_initiated'
        : paymentStatus === 'confirmed'
        ? 'payment_confirmed'
        : order.status;

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        paymentMockStatus: paymentStatus,
        status: newOrderStatus,
        isLocked: paymentStatus === 'confirmed' ? true : order.isLocked,
      },
      include: {
        rfq: { select: { id: true, title: true } },
        client: { select: { id: true, username: true } },
        supplier: { select: { id: true, username: true } },
      },
    });

    res.json({ message: 'Statusul plății a fost actualizat', order: updatedOrder });
  } catch (error) {
    console.error('Error updating payment:', error);
    res.status(500).json({ error: 'Eroare la actualizarea plății' });
  }
});

// PATCH /api/orders/:id/delivery - Update delivery status
router.patch('/:id/delivery', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const validation = updateDeliverySchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({ error: 'Date invalide', details: validation.error });
    }

    const { status: deliveryStatus } = validation.data;

    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      return res.status(404).json({ error: 'Comanda nu a fost găsită' });
    }

    // Only admin and supplier can update delivery
    const isAdmin = req.user?.role === 'admin';
    const isSupplier = req.user?.userId === order.supplierId;
    const isClient = req.user?.userId === order.clientId;

    // in_progress: only admin/supplier
    // delivered: only admin/supplier
    // received: only admin/client
    if (deliveryStatus === 'received' && !isAdmin && !isClient) {
      return res.status(403).json({ error: 'Doar clientul poate confirma primirea' });
    }

    if ((deliveryStatus === 'in_progress' || deliveryStatus === 'delivered') && !isAdmin && !isSupplier) {
      return res.status(403).json({ error: 'Doar furnizorul poate actualiza livrarea' });
    }

    // Update delivery status and order status
    const newOrderStatus =
      deliveryStatus === 'in_progress'
        ? 'delivery_in_progress'
        : deliveryStatus === 'delivered'
        ? 'delivered'
        : deliveryStatus === 'received'
        ? 'received'
        : order.status;

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        deliveryStatus,
        status: newOrderStatus,
      },
      include: {
        rfq: { select: { id: true, title: true } },
        client: { select: { id: true, username: true } },
        supplier: { select: { id: true, username: true } },
      },
    });

    res.json({ message: 'Statusul livrării a fost actualizat', order: updatedOrder });
  } catch (error) {
    console.error('Error updating delivery:', error);
    res.status(500).json({ error: 'Eroare la actualizarea livrării' });
  }
});

// PATCH /api/orders/:id/finalize - Finalize order (Admin only)
router.patch('/:id/finalize', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Doar administratorii pot finaliza comenzi' });
    }

    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      return res.status(404).json({ error: 'Comanda nu a fost găsită' });
    }

    if (order.status !== 'received') {
      return res.status(400).json({ error: 'Comanda trebuie să fie primită înainte de finalizare' });
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status: 'finalized',
        finalizedAt: new Date(),
        isLocked: true,
      },
      include: {
        rfq: { select: { id: true, title: true } },
        client: { select: { id: true, username: true } },
        supplier: { select: { id: true, username: true } },
      },
    });

    res.json({ message: 'Comanda a fost finalizată', order: updatedOrder });
  } catch (error) {
    console.error('Error finalizing order:', error);
    res.status(500).json({ error: 'Eroare la finalizarea comenzii' });
  }
});

// PATCH /api/orders/:id/archive - Archive order (Admin only)
router.patch('/:id/archive', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Doar administratorii pot arhiva comenzi' });
    }

    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      return res.status(404).json({ error: 'Comanda nu a fost găsită' });
    }

    if (order.status !== 'finalized') {
      return res.status(400).json({ error: 'Comanda trebuie să fie finalizată înainte de arhivare' });
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status: 'archived',
        archivedAt: new Date(),
        isLocked: true,
      },
      include: {
        rfq: { select: { id: true, title: true } },
        client: { select: { id: true, username: true } },
        supplier: { select: { id: true, username: true } },
      },
    });

    res.json({ message: 'Comanda a fost arhivată', order: updatedOrder });
  } catch (error) {
    console.error('Error archiving order:', error);
    res.status(500).json({ error: 'Eroare la arhivarea comenzii' });
  }
});

/**
 * DELETE /api/orders/:id - Delete order with restrictions
 * Only admin can delete
 * Cannot delete orders with payment confirmed or later stages
 */
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Doar administratorii pot șterge comenzi' });
    }

    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        rfq: { select: { id: true, status: true } },
        offer: { select: { id: true, status: true } },
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Comanda nu a fost găsită' });
    }

    // Business rules: Can only delete orders in 'created' or 'payment_initiated' status
    // Cannot delete if payment is confirmed or delivery has started
    const deletableStatuses = ['created', 'payment_initiated'];
    if (!deletableStatuses.includes(order.status)) {
      return res.status(400).json({
        error: 'Nu se poate șterge comanda după ce plata a fost confirmată sau livrarea a început',
        currentStatus: order.status,
      });
    }

    // Revert RFQ status back to appropriate state
    if (order.rfq.status === 'closed') {
      await prisma.rFQ.update({
        where: { id: order.rfqId },
        data: { status: 'sent_to_client' },
      });
    }

    // Unlock the offer so it can be reused if needed
    await prisma.offer.update({
      where: { id: order.offerId },
      data: { isLocked: false },
    });

    // Delete the order
    await prisma.order.delete({
      where: { id },
    });

    res.json({ message: 'Comanda a fost ștearsă cu succes' });
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({ error: 'Eroare la ștergerea comenzii' });
  }
});

export default router;
