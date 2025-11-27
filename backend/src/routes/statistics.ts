import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';

const router = Router();

/**
 * GET /api/statistics
 * Get dashboard statistics based on user role
 */
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    let statistics: any = {};

    if (userRole === 'admin') {
      // Admin statistics
      const activeRFQs = await prisma.rFQ.count({
        where: {
          status: {
            in: ['published', 'offers_received', 'negotiation', 'final_offer_selected', 'sent_to_client']
          }
        }
      });

      const offersReceived = await prisma.offer.count();

      const activeOrders = await prisma.order.count({
        where: {
          status: {
            not: 'archived'
          }
        }
      });

      statistics = {
        activeRFQs,
        offersReceived,
        activeOrders
      };
    } else if (userRole === 'client') {
      // Client statistics
      const rfqsPosted = await prisma.rFQ.count({
        where: {
          clientId: userId
        }
      });

      const finalOffers = await prisma.offer.count({
        where: {
          rfq: {
            clientId: userId
          },
          status: {
            in: ['final_confirmed', 'accepted']
          }
        }
      });

      const activeOrders = await prisma.order.count({
        where: {
          clientId: userId,
          status: {
            not: 'archived'
          }
        }
      });

      statistics = {
        rfqsPosted,
        finalOffers,
        activeOrders
      };
    } else if (userRole === 'supplier') {
      // Supplier statistics
      const availableRFQs = await prisma.rFQ.count({
        where: {
          status: {
            in: ['published', 'offers_received', 'negotiation']
          }
        }
      });

      const offersSubmitted = await prisma.offer.count({
        where: {
          supplierId: userId
        }
      });

      const ordersWon = await prisma.order.count({
        where: {
          supplierId: userId
        }
      });

      statistics = {
        availableRFQs,
        offersSubmitted,
        ordersWon
      };
    }

    res.json({ statistics });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ error: 'Eroare la obținerea statisticilor' });
  }
});

export default router;
