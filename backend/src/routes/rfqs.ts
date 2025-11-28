import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Validation schemas
const createRFQSchema = z.object({
  title: z.string().min(3, 'Titlul trebuie să aibă minim 3 caractere'),
  description: z.string().min(10, 'Descrierea trebuie să aibă minim 10 caractere'),
  requirements: z.string().min(10, 'Cerințele trebuie să aibă minim 10 caractere'),
  deadline: z.string().datetime('Data limită invalidă'),
  budget: z.number().positive('Bugetul trebuie să fie pozitiv').optional(),
});

/**
 * POST /api/rfqs
 * Create a new RFQ (Client only) - Creates in Draft status
 */
router.post('/', requireRole('client'), async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, requirements, deadline, budget } = createRFQSchema.parse(req.body);

    const rfq = await prisma.rFQ.create({
      data: {
        title,
        description,
        requirements,
        deadline: new Date(deadline),
        budget,
        status: 'draft',
        clientId: req.user!.userId,
      },
      include: {
        client: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    res.status(201).json({
      rfq,
      message: 'Cerere RFQ creată cu succes',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
      return;
    }
    console.error('Create RFQ error:', error);
    res.status(500).json({ error: 'Eroare la crearea cererii RFQ' });
  }
});

/**
 * GET /api/rfqs
 * List RFQs (filtered by role)
 * - Client: only their own RFQs
 * - Supplier: only published RFQs
 * - Admin: all RFQs
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userRole = req.user!.role;
    const userId = req.user!.userId;

    let where: any = {};

    if (userRole === 'client') {
      // Clients can only see their own RFQs
      where.clientId = userId;
    } else if (userRole === 'supplier') {
      // Suppliers can only see published RFQs
      where.status = { in: ['published', 'offers_received', 'negotiation'] };
    } else if (userRole === 'admin') {
      // POC: Admins see all RFQs EXCEPT auto-rejected ones (those are in separate page)
      where.NOT = {
        gatekeeperStatus: 'auto_rejected',
      };
    }

    const rfqs = await prisma.rFQ.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        _count: {
          select: {
            offers: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({ rfqs });
  } catch (error) {
    console.error('Get RFQs error:', error);
    res.status(500).json({ error: 'Eroare la obținerea cererilor RFQ' });
  }
});

/**
 * GET /api/rfqs/:id
 * Get RFQ details by ID
 */
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userRole = req.user!.role;
    const userId = req.user!.userId;

    const rfq = await prisma.rFQ.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        offers: {
          include: {
            supplier: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!rfq) {
      res.status(404).json({ error: 'Cererea RFQ nu a fost găsită' });
      return;
    }

    // Check permissions
    if (userRole === 'client' && rfq.clientId !== userId) {
      res.status(403).json({ error: 'Nu ai permisiunea să vezi această cerere' });
      return;
    }

    if (userRole === 'supplier' && !['published', 'offers_received', 'negotiation'].includes(rfq.status)) {
      res.status(403).json({ error: 'Nu ai permisiunea să vezi această cerere' });
      return;
    }

    res.json({ rfq });
  } catch (error) {
    console.error('Get RFQ error:', error);
    res.status(500).json({ error: 'Eroare la obținerea cererii RFQ' });
  }
});

/**
 * PATCH /api/rfqs/:id/publish
 * Publish an RFQ (Admin only)
 */
router.patch('/:id/publish', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check if RFQ exists
    const rfq = await prisma.rFQ.findUnique({
      where: { id },
    });

    if (!rfq) {
      res.status(404).json({ error: 'Cererea RFQ nu a fost găsită' });
      return;
    }

    // Check if RFQ is in draft status
    if (rfq.status !== 'draft') {
      res.status(400).json({ error: 'Doar cererile în status Draft pot fi publicate' });
      return;
    }

    // Publish RFQ
    const updatedRFQ = await prisma.rFQ.update({
      where: { id },
      data: {
        status: 'published',
        publishedAt: new Date(),
      },
      include: {
        client: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    res.json({
      rfq: updatedRFQ,
      message: 'Cerere RFQ publicată cu succes',
    });
  } catch (error) {
    console.error('Publish RFQ error:', error);
    res.status(500).json({ error: 'Eroare la publicarea cererii RFQ' });
  }
});

/**
 * PATCH /api/rfqs/:id/send-to-client
 * Send final offer to client (Admin only)
 */
router.patch('/:id/send-to-client', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { offerId } = req.body;

    // Check if RFQ exists
    const rfq = await prisma.rFQ.findUnique({
      where: { id },
      include: {
        offers: true,
      },
    });

    if (!rfq) {
      res.status(404).json({ error: 'Cererea RFQ nu a fost găsită' });
      return;
    }

    // Verify the offer belongs to this RFQ and is final_confirmed
    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
    });

    if (!offer || offer.rfqId !== id) {
      res.status(400).json({ error: 'Oferta nu aparține acestei cereri RFQ' });
      return;
    }

    if (offer.status !== 'final_confirmed') {
      res.status(400).json({ error: 'Doar ofertele confirmate final pot fi trimise către client' });
      return;
    }

    // Update RFQ status to sent_to_client
    const updatedRFQ = await prisma.rFQ.update({
      where: { id },
      data: {
        status: 'sent_to_client',
      },
      include: {
        client: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    res.json({
      rfq: updatedRFQ,
      message: 'Oferta finală a fost trimisă către client',
    });
  } catch (error) {
    console.error('Send to client error:', error);
    res.status(500).json({ error: 'Eroare la trimiterea ofertei către client' });
  }
});

/**
 * DELETE /api/rfqs/:id
 * Delete RFQ (only Draft status can be deleted)
 */
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userRole = req.user!.role;
    const userId = req.user!.userId;

    // Check if RFQ exists
    const rfq = await prisma.rFQ.findUnique({
      where: { id },
    });

    if (!rfq) {
      res.status(404).json({ error: 'Cererea RFQ nu a fost găsită' });
      return;
    }

    // Check permissions: Only client who created it or admin can delete
    if (userRole === 'client' && rfq.clientId !== userId) {
      res.status(403).json({ error: 'Nu ai permisiunea să ștergi această cerere' });
      return;
    }

    if (userRole === 'supplier') {
      res.status(403).json({ error: 'Nu ai permisiunea să ștergi cereri RFQ' });
      return;
    }

    // Check if RFQ is in draft status (only draft can be deleted)
    if (rfq.status !== 'draft') {
      res.status(400).json({ error: 'Doar cererile în status Draft pot fi șterse' });
      return;
    }

    // Delete RFQ
    await prisma.rFQ.delete({
      where: { id },
    });

    res.json({ message: 'Cerere RFQ ștearsă cu succes' });
  } catch (error) {
    console.error('Delete RFQ error:', error);
    res.status(500).json({ error: 'Eroare la ștergerea cererii RFQ' });
  }
});

export default router;
