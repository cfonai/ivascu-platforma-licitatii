import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';
import { sendNewSupplierOfferNotification } from '../features/NotificationGatekeeperPOC/telegram/bot';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Validation schemas
const createOfferSchema = z.object({
  rfqId: z.string().uuid('ID RFQ invalid'),
  price: z.number().positive('Prețul trebuie să fie pozitiv'),
  deliveryTime: z.string().min(3, 'Timpul de livrare trebuie să aibă minim 3 caractere'),
  description: z.string().min(10, 'Descrierea trebuie să aibă minim 10 caractere'),
  terms: z.string().min(10, 'Termenii trebuie să aibă minim 10 caractere'),
});

/**
 * POST /api/offers
 * Submit an offer to a published RFQ (Supplier only)
 */
router.post('/', requireRole('supplier'), async (req: AuthRequest, res: Response) => {
  try {
    const { rfqId, price, deliveryTime, description, terms } = createOfferSchema.parse(req.body);

    // Check if RFQ exists and is published
    const rfq = await prisma.rFQ.findUnique({
      where: { id: rfqId },
    });

    if (!rfq) {
      res.status(404).json({ error: 'Cererea RFQ nu a fost găsită' });
      return;
    }

    if (rfq.status !== 'published' && rfq.status !== 'offers_received') {
      res.status(400).json({ error: 'Această cerere RFQ nu este deschisă pentru oferte' });
      return;
    }

    // Check if supplier already submitted an offer for this RFQ
    const existingOffer = await prisma.offer.findFirst({
      where: {
        rfqId,
        supplierId: req.user!.userId,
      },
    });

    if (existingOffer) {
      res.status(400).json({ error: 'Ai depus deja o ofertă pentru această cerere RFQ' });
      return;
    }

    // Create offer
    const offer = await prisma.offer.create({
      data: {
        rfqId,
        supplierId: req.user!.userId,
        price,
        deliveryTime,
        description,
        terms,
        status: 'submitted',
        isLocked: false,
      },
      include: {
        supplier: {
          select: {
            id: true,
            username: true,
            email: true,
            reputationScore: true,
          },
        },
        rfq: {
          select: {
            id: true,
            title: true,
            budget: true,
          },
        },
      },
    });

    // Update RFQ status to offers_received if it's the first offer
    if (rfq.status === 'published') {
      await prisma.rFQ.update({
        where: { id: rfqId },
        data: { status: 'offers_received' },
      });
    }

    // POC: Send Telegram notification to admin about new offer (if Gatekeeper is enabled)
    try {
      const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
      const gatekeeperEnabled = process.env.GATEKEEPER_ENABLED === 'true';

      if (adminChatId && gatekeeperEnabled) {
        // Calculate supplier stats for smart notification
        const completedOrders = await prisma.order.count({
          where: {
            supplierId: req.user!.userId,
            status: { in: ['finalized', 'archived'] },
          },
        });

        const onTimeDeliveries = await prisma.order.count({
          where: {
            supplierId: req.user!.userId,
            status: { in: ['finalized', 'archived'] },
            deliveryStatus: 'received',
          },
        });

        const onTimeRate = completedOrders > 0 ? (onTimeDeliveries / completedOrders) * 100 : 0;

        await sendNewSupplierOfferNotification(adminChatId, {
          offerId: offer.id,
          rfqTitle: offer.rfq.title,
          supplierName: offer.supplier.username,
          price: offer.price,
          deliveryTime: offer.deliveryTime,
          description: offer.description,
          budget: offer.rfq.budget,
          supplierReputation: offer.supplier.reputationScore || undefined,
          supplierCompletedOrders: completedOrders,
          supplierOnTimeRate: onTimeRate,
        });
        console.log(`📱 Telegram notification sent for new offer: ${offer.id}`);
      }
    } catch (telegramError) {
      // Don't fail the request if Telegram notification fails
      console.error('Failed to send Telegram notification:', telegramError);
    }

    res.status(201).json({
      offer,
      message: 'Ofertă depusă cu succes',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
      return;
    }
    console.error('Create offer error:', error);
    res.status(500).json({ error: 'Eroare la depunerea ofertei' });
  }
});

/**
 * GET /api/offers
 * List offers (filtered by role)
 * - Supplier: only their own offers
 * - Client: offers for their own RFQs
 * - Admin: all offers
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userRole = req.user!.role;
    const userId = req.user!.userId;

    let where: any = {};

    if (userRole === 'supplier') {
      // Suppliers can only see their own offers
      where.supplierId = userId;
    } else if (userRole === 'client') {
      // Clients can see offers for their RFQs
      where.rfq = {
        clientId: userId,
      };
    }
    // Admins can see all offers (no filter)

    const offers = await prisma.offer.findMany({
      where,
      include: {
        supplier: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        rfq: {
          select: {
            id: true,
            title: true,
            clientId: true,
          },
        },
      },
      orderBy: {
        submittedAt: 'desc',
      },
    });

    res.json({ offers });
  } catch (error) {
    console.error('Get offers error:', error);
    res.status(500).json({ error: 'Eroare la obținerea ofertelor' });
  }
});

/**
 * GET /api/offers/rfq/:rfqId
 * Get all offers for a specific RFQ
 */
router.get('/rfq/:rfqId', async (req: AuthRequest, res: Response) => {
  try {
    const { rfqId } = req.params;
    const userRole = req.user!.role;
    const userId = req.user!.userId;

    // Check if RFQ exists
    const rfq = await prisma.rFQ.findUnique({
      where: { id: rfqId },
    });

    if (!rfq) {
      res.status(404).json({ error: 'Cererea RFQ nu a fost găsită' });
      return;
    }

    // Check permissions
    if (userRole === 'client' && rfq.clientId !== userId) {
      res.status(403).json({ error: 'Nu ai permisiunea să vezi ofertele pentru această cerere' });
      return;
    }

    if (userRole === 'supplier') {
      // Suppliers can only see their own offer
      const offers = await prisma.offer.findMany({
        where: {
          rfqId,
          supplierId: userId,
        },
        include: {
          supplier: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
      });
      res.json({ offers });
      return;
    }

    // Admin or Client (owner) can see all offers
    const offers = await prisma.offer.findMany({
      where: { rfqId },
      include: {
        supplier: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
      orderBy: {
        submittedAt: 'desc',
      },
    });

    res.json({ offers });
  } catch (error) {
    console.error('Get offers for RFQ error:', error);
    res.status(500).json({ error: 'Eroare la obținerea ofertelor' });
  }
});

/**
 * DELETE /api/offers/:id
 * Delete offer (only if not Locked)
 */
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userRole = req.user!.role;
    const userId = req.user!.userId;

    // Check if offer exists
    const offer = await prisma.offer.findUnique({
      where: { id },
    });

    if (!offer) {
      res.status(404).json({ error: 'Oferta nu a fost găsită' });
      return;
    }

    // Check permissions: Only supplier who created it or admin can delete
    if (userRole === 'supplier' && offer.supplierId !== userId) {
      res.status(403).json({ error: 'Nu ai permisiunea să ștergi această ofertă' });
      return;
    }

    if (userRole === 'client') {
      res.status(403).json({ error: 'Nu ai permisiunea să ștergi oferte' });
      return;
    }

    // Check if offer is locked
    if (offer.isLocked) {
      res.status(400).json({ error: 'Această ofertă este blocată și nu poate fi ștearsă' });
      return;
    }

    // Check if offer is in negotiation or accepted status (these are locked)
    if (['in_negotiation', 'final_confirmed', 'accepted'].includes(offer.status)) {
      res.status(400).json({ error: 'Această ofertă nu poate fi ștearsă deoarece este în proces de negociere sau acceptată' });
      return;
    }

    // Delete offer
    await prisma.offer.delete({
      where: { id },
    });

    res.json({ message: 'Ofertă ștearsă cu succes' });
  } catch (error) {
    console.error('Delete offer error:', error);
    res.status(500).json({ error: 'Eroare la ștergerea ofertei' });
  }
});

/**
 * PATCH /api/offers/:id/reject
 * Reject a final offer (Client only - for offers sent to client)
 */
router.patch('/:id/reject', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Get offer with RFQ
    const offer = await prisma.offer.findUnique({
      where: { id },
      include: { rfq: true },
    });

    if (!offer) {
      res.status(404).json({ error: 'Oferta nu a fost găsită' });
      return;
    }

    // Check if client owns the RFQ
    if (req.user!.role !== 'client' || offer.rfq.clientId !== req.user!.userId) {
      res.status(403).json({ error: 'Nu aveți permisiunea să respingeți această ofertă' });
      return;
    }

    // Check if offer is final_confirmed and RFQ is sent_to_client
    if (offer.status !== 'final_confirmed') {
      res.status(400).json({ error: 'Doar ofertele confirmate final pot fi respinse' });
      return;
    }

    if (offer.rfq.status !== 'sent_to_client') {
      res.status(400).json({ error: 'Oferta nu a fost trimisă spre aprobare' });
      return;
    }

    // Reject offer
    await prisma.offer.update({
      where: { id },
      data: {
        status: 'rejected',
      },
    });

    // Update RFQ status back to negotiation
    await prisma.rFQ.update({
      where: { id: offer.rfqId },
      data: {
        status: 'negotiation',
      },
    });

    res.json({ message: 'Oferta a fost respinsă' });
  } catch (error) {
    console.error('Reject offer error:', error);
    res.status(500).json({ error: 'Eroare la respingerea ofertei' });
  }
});

export default router;
