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

// Admin commission rate (5-10% of each completed order)
const MIN_COMMISSION_RATE = 0.05; // 5%
const MAX_COMMISSION_RATE = 0.10; // 10%

/**
 * Calculate admin commission based on order value
 * Higher value orders get lower commission rate (sliding scale)
 */
function calculateCommission(orderValue: number): number {
  if (orderValue < 100000) {
    return orderValue * MAX_COMMISSION_RATE; // 10% for orders under 100k
  } else if (orderValue < 500000) {
    return orderValue * 0.08; // 8% for orders 100k-500k
  } else if (orderValue < 1000000) {
    return orderValue * 0.07; // 7% for orders 500k-1M
  } else {
    return orderValue * MIN_COMMISSION_RATE; // 5% for orders over 1M
  }
}

/**
 * GET /api/statistics/earnings
 * Get comprehensive admin earnings and business statistics
 * Only accessible by admin role
 */
router.get('/earnings', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Doar administratorii pot accesa statisticile de venit' });
    }

    const { period = 'all' } = req.query; // all, today, week, month, year

    // Calculate date range based on period
    const now = new Date();
    let startDate: Date | undefined;

    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = undefined;
    }

    // Build where clause for date filtering
    const dateFilter = startDate
      ? {
          createdAt: {
            gte: startDate,
          },
        }
      : {};

    // Fetch completed orders (finalized or archived)
    const completedOrders = await prisma.order.findMany({
      where: {
        status: { in: ['finalized', 'archived'] },
        ...dateFilter,
      },
      include: {
        rfq: { select: { title: true } },
        client: { select: { username: true } },
        supplier: { select: { username: true, reputationScore: true } },
      },
    });

    // Calculate total earnings and order statistics
    let totalRevenue = 0;
    let totalCommission = 0;
    const ordersByCategory: Record<string, { count: number; revenue: number; commission: number }> = {};
    const topClients: Record<string, { count: number; revenue: number }> = {};
    const topSuppliers: Record<string, { count: number; revenue: number; rating: number }> = {};

    completedOrders.forEach((order) => {
      const orderValue = order.finalPrice;
      const commission = calculateCommission(orderValue);

      totalRevenue += orderValue;
      totalCommission += commission;

      // Category breakdown - using title prefix as category for now
      const titleParts = order.rfq.title.split(' ');
      const category = titleParts.length > 0 ? titleParts[0] : 'General';
      if (!ordersByCategory[category]) {
        ordersByCategory[category] = { count: 0, revenue: 0, commission: 0 };
      }
      ordersByCategory[category].count++;
      ordersByCategory[category].revenue += orderValue;
      ordersByCategory[category].commission += commission;

      // Top clients
      if (!topClients[order.client.username]) {
        topClients[order.client.username] = { count: 0, revenue: 0 };
      }
      topClients[order.client.username].count++;
      topClients[order.client.username].revenue += orderValue;

      // Top suppliers
      if (!topSuppliers[order.supplier.username]) {
        topSuppliers[order.supplier.username] = { count: 0, revenue: 0, rating: order.supplier.reputationScore || 0 };
      }
      topSuppliers[order.supplier.username].count++;
      topSuppliers[order.supplier.username].revenue += orderValue;
    });

    // Sort and get top 5
    const top5Clients = Object.entries(topClients)
      .sort(([, a], [, b]) => b.revenue - a.revenue)
      .slice(0, 5)
      .map(([name, data]) => ({ name, ...data }));

    const top5Suppliers = Object.entries(topSuppliers)
      .sort(([, a], [, b]) => b.revenue - a.revenue)
      .slice(0, 5)
      .map(([name, data]) => ({ name, ...data }));

    // RFQ statistics
    const totalRFQs = await prisma.rFQ.count({ where: dateFilter });
    const publishedRFQs = await prisma.rFQ.count({
      where: { status: { in: ['published', 'offers_received', 'negotiation'] }, ...dateFilter },
    });
    const closedRFQs = await prisma.rFQ.count({
      where: { status: 'closed', ...dateFilter },
    });

    // Offer statistics
    const totalOffers = startDate
      ? await prisma.offer.count({ where: { submittedAt: { gte: startDate } } })
      : await prisma.offer.count();
    const acceptedOffers = startDate
      ? await prisma.offer.count({ where: { status: 'accepted', submittedAt: { gte: startDate } } })
      : await prisma.offer.count({ where: { status: 'accepted' } });

    // Negotiation statistics
    const totalNegotiations = await prisma.negotiation.count({ where: dateFilter });
    const completedNegotiations = await prisma.negotiation.count({
      where: { status: 'completed', ...dateFilter },
    });

    // Average order value
    const avgOrderValue = completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0;

    // Conversion rates
    const rfqToOrderRate = totalRFQs > 0 ? (completedOrders.length / totalRFQs) * 100 : 0;
    const offerAcceptanceRate = totalOffers > 0 ? (acceptedOffers / totalOffers) * 100 : 0;

    // Earnings trend (last 7 days for daily view, or monthly for other periods)
    const earningsTrend = await generateEarningsTrend(period as string, startDate);

    res.json({
      period,
      summary: {
        totalOrders: completedOrders.length,
        totalRevenue,
        totalCommission,
        avgOrderValue,
        avgCommissionRate: totalRevenue > 0 ? (totalCommission / totalRevenue) * 100 : 0,
      },
      rfqStats: {
        total: totalRFQs,
        published: publishedRFQs,
        closed: closedRFQs,
        conversionRate: rfqToOrderRate,
      },
      offerStats: {
        total: totalOffers,
        accepted: acceptedOffers,
        acceptanceRate: offerAcceptanceRate,
      },
      negotiationStats: {
        total: totalNegotiations,
        completed: completedNegotiations,
        successRate: totalNegotiations > 0 ? (completedNegotiations / totalNegotiations) * 100 : 0,
      },
      categoryBreakdown: Object.entries(ordersByCategory)
        .map(([category, data]) => ({ category, ...data }))
        .sort((a, b) => b.revenue - a.revenue),
      topClients: top5Clients,
      topSuppliers: top5Suppliers,
      earningsTrend,
    });
  } catch (error) {
    console.error('Error fetching earnings statistics:', error);
    res.status(500).json({ error: 'Eroare la încărcarea statisticilor de venit' });
  }
});

/**
 * Generate earnings trend data
 */
async function generateEarningsTrend(period: string, startDate?: Date) {
  const now = new Date();
  const trend: Array<{ date: string; revenue: number; commission: number; orders: number }> = [];

  if (period === 'today' || period === 'week') {
    // Daily breakdown for last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const orders = await prisma.order.findMany({
        where: {
          status: { in: ['finalized', 'archived'] },
          createdAt: {
            gte: date,
            lt: nextDate,
          },
        },
        select: { finalPrice: true },
      });

      const revenue = orders.reduce((sum, order) => sum + order.finalPrice, 0);
      const commission = orders.reduce((sum, order) => sum + calculateCommission(order.finalPrice), 0);

      trend.push({
        date: date.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' }),
        revenue,
        commission,
        orders: orders.length,
      });
    }
  } else if (period === 'month' || period === 'year') {
    // Weekly breakdown for last 4 weeks or monthly breakdown for year
    const weeks = period === 'month' ? 4 : 12;
    const unit = period === 'month' ? 'week' : 'month';

    for (let i = weeks - 1; i >= 0; i--) {
      const date = new Date(now);
      if (unit === 'week') {
        date.setDate(date.getDate() - i * 7);
      } else {
        date.setMonth(date.getMonth() - i);
        date.setDate(1);
      }
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      if (unit === 'week') {
        nextDate.setDate(nextDate.getDate() + 7);
      } else {
        nextDate.setMonth(nextDate.getMonth() + 1);
      }

      const orders = await prisma.order.findMany({
        where: {
          status: { in: ['finalized', 'archived'] },
          createdAt: {
            gte: date,
            lt: nextDate,
          },
        },
        select: { finalPrice: true },
      });

      const revenue = orders.reduce((sum, order) => sum + order.finalPrice, 0);
      const commission = orders.reduce((sum, order) => sum + calculateCommission(order.finalPrice), 0);

      trend.push({
        date:
          unit === 'week'
            ? `Săpt ${date.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })}`
            : date.toLocaleDateString('ro-RO', { month: 'long' }),
        revenue,
        commission,
        orders: orders.length,
      });
    }
  }

  return trend;
}

export default router;
