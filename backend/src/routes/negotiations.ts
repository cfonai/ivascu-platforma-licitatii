import express, { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import { sendNegotiationResponseNotification } from '../features/NotificationGatekeeperPOC/telegram/bot';

const router = express.Router();
const prisma = new PrismaClient();

// Validation schemas
const initiateNegotiationSchema = z.object({
  offerId: z.string().uuid(),
  message: z.string().min(10),
  proposedPrice: z.number().positive().optional(),
  proposedDeliveryTime: z.string().optional(),
});

const respondNegotiationSchema = z.object({
  message: z.string().min(1),  // Allow short messages for accept/reject
  proposedPrice: z.number().positive().optional(),
  proposedDeliveryTime: z.string().optional(),
  acceptFinal: z.boolean().optional(),
});

// POST /api/negotiations - Initiate negotiation (Admin only)
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Doar administratorii pot iniția negocieri' });
    }

    const validation = initiateNegotiationSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Date invalide', details: validation.error });
    }

    const { offerId, message, proposedPrice, proposedDeliveryTime } = validation.data;

    // Check if offer exists and is valid for negotiation
    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      include: { rfq: true, supplier: true },
    });

    if (!offer) {
      return res.status(404).json({ error: 'Oferta nu a fost găsită' });
    }

    if (offer.isLocked) {
      return res.status(400).json({ error: 'Oferta este blocată și nu poate fi negociată' });
    }

    if (offer.status === 'rejected' || offer.status === 'withdrawn') {
      return res.status(400).json({ error: 'Oferta nu este eligibilă pentru negociere' });
    }

    // Check if negotiation already exists for this offer
    const existingNegotiation = await prisma.negotiation.findFirst({
      where: { offerId, status: 'active' },
    });

    if (existingNegotiation) {
      return res.status(400).json({ error: 'Există deja o negociere activă pentru această ofertă' });
    }

    // Create negotiation
    const negotiation = await prisma.negotiation.create({
      data: {
        offerId,
        rfqId: offer.rfqId,
        adminId: req.user.userId,
        supplierId: offer.supplierId,
        rounds: 1,
        status: 'active',
      },
    });

    // Create first message (from admin)
    await prisma.negotiationMessage.create({
      data: {
        negotiationId: negotiation.id,
        senderId: req.user.userId,
        senderRole: 'admin',
        roundNumber: 1,
        message,
        proposedPrice,
        proposedDeliveryTime,
      },
    });

    // Update offer status
    await prisma.offer.update({
      where: { id: offerId },
      data: { status: 'in_negotiation' },
    });

    // Update RFQ status
    await prisma.rFQ.update({
      where: { id: offer.rfqId },
      data: { status: 'negotiation' },
    });

    res.json({ message: 'Negociere inițiată cu succes', negotiation });
  } catch (error) {
    console.error('Error initiating negotiation:', error);
    res.status(500).json({ error: 'Eroare la inițierea negocierii' });
  }
});

// GET /api/negotiations/:id - Get negotiation details with messages
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const negotiation = await prisma.negotiation.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: {
              select: { id: true, username: true, role: true },
            },
          },
        },
        offer: {
          include: {
            supplier: { select: { id: true, username: true, email: true } },
          },
        },
        rfq: {
          select: { id: true, title: true, clientId: true },
        },
      },
    });

    if (!negotiation) {
      return res.status(404).json({ error: 'Negocierea nu a fost găsită' });
    }

    // Check authorization
    const isAdmin = req.user?.role === 'admin';
    const isSupplier = req.user?.userId === negotiation.supplierId;
    const isClient = req.user?.userId === negotiation.rfq.clientId;

    if (!isAdmin && !isSupplier && !isClient) {
      return res.status(403).json({ error: 'Nu aveți permisiunea să vedeți această negociere' });
    }

    res.json({ negotiation });
  } catch (error) {
    console.error('Error fetching negotiation:', error);
    res.status(500).json({ error: 'Eroare la încărcarea negocierii' });
  }
});

// GET /api/negotiations/offer/:offerId - Get negotiation by offer ID
router.get('/offer/:offerId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { offerId } = req.params;

    const negotiation = await prisma.negotiation.findFirst({
      where: { offerId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: {
              select: { id: true, username: true, role: true },
            },
          },
        },
        offer: {
          include: {
            supplier: { select: { id: true, username: true, email: true } },
          },
        },
        rfq: {
          select: { id: true, title: true, clientId: true },
        },
      },
    });

    if (!negotiation) {
      return res.status(404).json({ error: 'Nu există negociere pentru această ofertă' });
    }

    // Check authorization
    const isAdmin = req.user?.role === 'admin';
    const isSupplier = req.user?.userId === negotiation.supplierId;
    const isClient = req.user?.userId === negotiation.rfq.clientId;

    if (!isAdmin && !isSupplier && !isClient) {
      return res.status(403).json({ error: 'Nu aveți permisiunea să vedeți această negociere' });
    }

    res.json({ negotiation });
  } catch (error) {
    console.error('Error fetching negotiation:', error);
    res.status(500).json({ error: 'Eroare la încărcarea negocierii' });
  }
});

// POST /api/negotiations/:id/respond - Respond to negotiation (Supplier only)
router.post('/:id/respond', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'supplier') {
      return res.status(403).json({ error: 'Doar furnizorii pot răspunde la negocieri' });
    }

    const { id } = req.params;
    const validation = respondNegotiationSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({ error: 'Date invalide', details: validation.error });
    }

    const { message, proposedPrice, proposedDeliveryTime, acceptFinal } = validation.data;

    // Get negotiation
    const negotiation = await prisma.negotiation.findUnique({
      where: { id },
      include: { offer: true, messages: true },
    });

    if (!negotiation) {
      return res.status(404).json({ error: 'Negocierea nu a fost găsită' });
    }

    if (negotiation.supplierId !== req.user.userId) {
      return res.status(403).json({ error: 'Nu aveți permisiunea să răspundeți la această negociere' });
    }

    if (negotiation.status !== 'active') {
      return res.status(400).json({ error: 'Negocierea nu mai este activă' });
    }

    // Check rounds limit only if NOT accepting final offer
    if (!acceptFinal && negotiation.rounds >= 3) {
      return res.status(400).json({ error: 'Numărul maxim de runde a fost atins' });
    }

    // Create response message
    await prisma.negotiationMessage.create({
      data: {
        negotiationId: id,
        senderId: req.user.userId,
        senderRole: 'supplier',
        roundNumber: negotiation.rounds,
        message,
        proposedPrice,
        proposedDeliveryTime,
      },
    });

    // If supplier accepts final offer
    if (acceptFinal) {
      // Complete negotiation
      await prisma.negotiation.update({
        where: { id },
        data: {
          status: 'completed',
          completedAt: new Date(),
        },
      });

      // Lock and update offer
      await prisma.offer.update({
        where: { id: negotiation.offerId },
        data: {
          status: 'final_confirmed',
          isLocked: true,
          price: proposedPrice || negotiation.offer.price,
          deliveryTime: proposedDeliveryTime || negotiation.offer.deliveryTime,
        },
      });

      // POC: Send Telegram notification about acceptance (if Gatekeeper is enabled)
      try {
        const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
        const gatekeeperEnabled = process.env.GATEKEEPER_ENABLED === 'true';

        if (adminChatId && gatekeeperEnabled) {
          const rfq = await prisma.rFQ.findUnique({ where: { id: negotiation.rfqId }, select: { title: true } });
          const supplier = await prisma.user.findUnique({ where: { id: negotiation.supplierId }, select: { username: true } });

          if (rfq && supplier) {
            await sendNegotiationResponseNotification(adminChatId, {
              negotiationId: id,
              offerId: negotiation.offerId,
              rfqTitle: rfq.title,
              supplierName: supplier.username,
              roundNumber: negotiation.rounds,
              message,
              proposedPrice,
              proposedDeliveryTime,
              acceptedFinal: true,
            });
            console.log(`📱 Telegram notification sent: Supplier accepted final offer for negotiation ${id}`);
          }
        }
      } catch (telegramError) {
        console.error('Failed to send Telegram notification:', telegramError);
      }

      return res.json({ message: 'Oferta finală a fost confirmată și blocată', completed: true });
    }

    // Otherwise, increment round counter
    await prisma.negotiation.update({
      where: { id },
      data: { rounds: negotiation.rounds + 1 },
    });

    // POC: Send Telegram notification about counter-proposal (if Gatekeeper is enabled)
    try {
      const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
      const gatekeeperEnabled = process.env.GATEKEEPER_ENABLED === 'true';

      if (adminChatId && gatekeeperEnabled) {
        const rfq = await prisma.rFQ.findUnique({ where: { id: negotiation.rfqId }, select: { title: true } });
        const supplier = await prisma.user.findUnique({ where: { id: negotiation.supplierId }, select: { username: true } });

        if (rfq && supplier) {
          await sendNegotiationResponseNotification(adminChatId, {
            negotiationId: id,
            offerId: negotiation.offerId,
            rfqTitle: rfq.title,
            supplierName: supplier.username,
            roundNumber: negotiation.rounds + 1,
            message,
            proposedPrice,
            proposedDeliveryTime,
            acceptedFinal: false,
          });
          console.log(`📱 Telegram notification sent: Supplier responded to negotiation ${id}, round ${negotiation.rounds + 1}`);
        }
      }
    } catch (telegramError) {
      console.error('Failed to send Telegram notification:', telegramError);
    }

    res.json({ message: 'Răspuns trimis cu succes' });
  } catch (error) {
    console.error('Error responding to negotiation:', error);
    res.status(500).json({ error: 'Eroare la trimiterea răspunsului' });
  }
});

// POST /api/negotiations/:id/admin-respond - Admin responds to supplier counter-proposal
router.post('/:id/admin-respond', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Doar administratorii pot trimite răspunsuri' });
    }

    const { id } = req.params;
    const validation = respondNegotiationSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({ error: 'Date invalide', details: validation.error });
    }

    const { message, proposedPrice, proposedDeliveryTime } = validation.data;

    // Get negotiation
    const negotiation = await prisma.negotiation.findUnique({
      where: { id },
      include: { offer: true, messages: true },
    });

    if (!negotiation) {
      return res.status(404).json({ error: 'Negocierea nu a fost găsită' });
    }

    if (negotiation.status !== 'active') {
      return res.status(400).json({ error: 'Negocierea nu mai este activă' });
    }

    if (negotiation.rounds >= 3) {
      return res.status(400).json({ error: 'Numărul maxim de runde a fost atins' });
    }

    // Create admin response message
    await prisma.negotiationMessage.create({
      data: {
        negotiationId: id,
        senderId: req.user.userId,
        senderRole: 'admin',
        roundNumber: negotiation.rounds + 1,
        message,
        proposedPrice,
        proposedDeliveryTime,
      },
    });

    // Increment round counter
    await prisma.negotiation.update({
      where: { id },
      data: { rounds: negotiation.rounds + 1 },
    });

    res.json({ message: 'Răspuns trimis cu succes' });
  } catch (error) {
    console.error('Error admin responding to negotiation:', error);
    res.status(500).json({ error: 'Eroare la trimiterea răspunsului' });
  }
});

// PATCH /api/negotiations/:id/cancel - Cancel negotiation (Admin only)
router.patch('/:id/cancel', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Doar administratorii pot anula negocieri' });
    }

    const { id } = req.params;

    const negotiation = await prisma.negotiation.findUnique({
      where: { id },
      include: { offer: true },
    });

    if (!negotiation) {
      return res.status(404).json({ error: 'Negocierea nu a fost găsită' });
    }

    if (negotiation.status !== 'active') {
      return res.status(400).json({ error: 'Negocierea nu este activă' });
    }

    // Cancel negotiation
    await prisma.negotiation.update({
      where: { id },
      data: { status: 'cancelled' },
    });

    // Revert offer status
    await prisma.offer.update({
      where: { id: negotiation.offerId },
      data: { status: 'under_review' },
    });

    res.json({ message: 'Negociere anulată cu succes' });
  } catch (error) {
    console.error('Error cancelling negotiation:', error);
    res.status(500).json({ error: 'Eroare la anularea negocierii' });
  }
});

// POST /api/negotiations/:id/reject - Supplier rejects final offer
router.post('/:id/reject', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'supplier') {
      return res.status(403).json({ error: 'Doar furnizorii pot respinge oferte' });
    }

    const { id } = req.params;
    const { message } = req.body;

    const negotiation = await prisma.negotiation.findUnique({
      where: { id },
      include: { offer: true },
    });

    if (!negotiation) {
      return res.status(404).json({ error: 'Negocierea nu a fost găsită' });
    }

    if (negotiation.supplierId !== req.user.userId) {
      return res.status(403).json({ error: 'Nu aveți permisiunea să respingeți această ofertă' });
    }

    if (negotiation.status !== 'active') {
      return res.status(400).json({ error: 'Negocierea nu mai este activă' });
    }

    // Create rejection message
    if (message) {
      await prisma.negotiationMessage.create({
        data: {
          negotiationId: id,
          senderId: req.user.userId,
          senderRole: 'supplier',
          roundNumber: negotiation.rounds,
          message,
        },
      });
    }

    // Cancel negotiation
    await prisma.negotiation.update({
      where: { id },
      data: {
        status: 'cancelled',
        completedAt: new Date(),
      },
    });

    // Mark offer as rejected
    await prisma.offer.update({
      where: { id: negotiation.offerId },
      data: { status: 'rejected' },
    });

    res.json({ message: 'Oferta a fost respinsă' });
  } catch (error) {
    console.error('Error rejecting offer:', error);
    res.status(500).json({ error: 'Eroare la respingerea ofertei' });
  }
});

export default router;
