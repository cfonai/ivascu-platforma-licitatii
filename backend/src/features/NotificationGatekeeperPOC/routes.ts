/**
 * POC: Gatekeeper Routes - API endpoints pentru management Gatekeeper
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../../lib/prisma';
import { authenticateToken, requireRole, AuthRequest } from '../../middleware/auth';
import { processRFQManually } from './service';
import { telegramHandlers } from './telegram/bot';

const router = Router();

// Toate route-urile necesită autentificare
router.use(authenticateToken);

/**
 * GET /api/poc/gatekeeper/stats
 * Obține statistici Gatekeeper (Admin only)
 */
router.get('/stats', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    // Statistici generale
    const totalRFQs = await prisma.rFQ.count();
    const autoApproved = await prisma.rFQ.count({ where: { gatekeeperStatus: 'auto_approved' } });
    const autoRejected = await prisma.rFQ.count({ where: { gatekeeperStatus: 'auto_rejected' } });
    const flaggedHighRisk = await prisma.rFQ.count({ where: { gatekeeperStatus: 'flagged_high_risk' } });
    const pending = await prisma.rFQ.count({
      where: {
        OR: [
          { gatekeeperStatus: null },
          { gatekeeperStatus: 'pending' },
        ],
      },
    });

    // Statistici pentru ultimele 24 ore
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const recentRFQs = await prisma.rFQ.count({
      where: { createdAt: { gte: yesterday } },
    });

    const recentApproved = await prisma.rFQ.count({
      where: {
        createdAt: { gte: yesterday },
        gatekeeperStatus: 'auto_approved',
      },
    });

    const recentRejected = await prisma.rFQ.count({
      where: {
        createdAt: { gte: yesterday },
        gatekeeperStatus: 'auto_rejected',
      },
    });

    const recentHighRisk = await prisma.rFQ.count({
      where: {
        createdAt: { gte: yesterday },
        gatekeeperStatus: 'flagged_high_risk',
      },
    });

    res.json({
      overall: {
        total: totalRFQs,
        autoApproved,
        autoRejected,
        flaggedHighRisk,
        pending,
      },
      last24Hours: {
        total: recentRFQs,
        autoApproved: recentApproved,
        autoRejected: recentRejected,
        flaggedHighRisk: recentHighRisk,
      },
    });
  } catch (error) {
    console.error('Eroare la obținere statistici:', error);
    res.status(500).json({ error: 'Eroare la obținere statistici' });
  }
});

/**
 * GET /api/poc/gatekeeper/auto-rejected
 * Listează RFQ-uri auto-respinse (Admin only)
 */
router.get('/auto-rejected', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const autoRejectedRFQs = await prisma.rFQ.findMany({
      where: { gatekeeperStatus: 'auto_rejected' },
      include: {
        client: {
          select: {
            id: true,
            username: true,
            companyName: true,
            reputationScore: true,
            financialScore: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ rfqs: autoRejectedRFQs });
  } catch (error) {
    console.error('Eroare la listare RFQ-uri auto-respinse:', error);
    res.status(500).json({ error: 'Eroare la listare RFQ-uri' });
  }
});

/**
 * POST /api/poc/gatekeeper/re-evaluate/:rfqId
 * Re-evaluează un RFQ respins și îl publică manual (Admin only)
 */
router.post('/re-evaluate/:rfqId', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { rfqId } = req.params;

    const rfq = await prisma.rFQ.findUnique({
      where: { id: rfqId },
    });

    if (!rfq) {
      res.status(404).json({ error: 'RFQ nu a fost găsit' });
      return;
    }

    // Publică RFQ-ul
    await prisma.rFQ.update({
      where: { id: rfqId },
      data: {
        status: 'published',
        publishedAt: new Date(),
        gatekeeperStatus: 'auto_approved', // Marchează ca aprobat manual
      },
    });

    res.json({
      success: true,
      message: 'RFQ re-evaluat și publicat',
      rfqId,
    });
  } catch (error) {
    console.error('Eroare la re-evaluare:', error);
    res.status(500).json({ error: 'Eroare la re-evaluare RFQ' });
  }
});

/**
 * DELETE /api/poc/gatekeeper/delete-rejected/:rfqId
 * Șterge un RFQ auto-respins (Admin only)
 */
router.delete('/delete-rejected/:rfqId', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { rfqId } = req.params;

    const rfq = await prisma.rFQ.findUnique({
      where: { id: rfqId },
    });

    if (!rfq) {
      res.status(404).json({ error: 'RFQ nu a fost găsit' });
      return;
    }

    if (rfq.gatekeeperStatus !== 'auto_rejected') {
      res.status(400).json({ error: 'Doar RFQ-urile auto-respinse pot fi șterse astfel' });
      return;
    }

    // Șterge RFQ-ul
    await prisma.rFQ.delete({
      where: { id: rfqId },
    });

    res.json({
      success: true,
      message: 'RFQ șters',
      rfqId,
    });
  } catch (error) {
    console.error('Eroare la ștergere:', error);
    res.status(500).json({ error: 'Eroare la ștergere RFQ' });
  }
});

/**
 * GET /api/poc/gatekeeper/high-risk
 * Listează RFQ-uri cu risc ridicat (Admin only)
 */
router.get('/high-risk', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const highRiskRFQs = await prisma.rFQ.findMany({
      where: { gatekeeperStatus: 'flagged_high_risk' },
      include: {
        client: {
          select: {
            id: true,
            username: true,
            companyName: true,
            reputationScore: true,
            financialScore: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ rfqs: highRiskRFQs });
  } catch (error) {
    console.error('Eroare la listare RFQ-uri risc înalt:', error);
    res.status(500).json({ error: 'Eroare la listare RFQ-uri' });
  }
});

/**
 * GET /api/poc/gatekeeper/logs
 * Listează log-uri Gatekeeper (Admin only)
 */
router.get('/logs', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const logs = await prisma.gatekeeperLog.findMany({
      include: {
        rfq: {
          select: {
            title: true,
            client: {
              select: {
                companyName: true,
                username: true,
              },
            },
          },
        },
      },
      orderBy: { processedAt: 'desc' },
      take: 100,
    });

    res.json({ logs });
  } catch (error) {
    console.error('Eroare la listare log-uri:', error);
    res.status(500).json({ error: 'Eroare la listare log-uri' });
  }
});

/**
 * POST /api/poc/gatekeeper/process/:rfqId
 * Procesează manual un RFQ prin Gatekeeper (Admin only)
 */
router.post('/process/:rfqId', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { rfqId } = req.params;

    const result = await processRFQManually(rfqId);

    res.json(result);
  } catch (error: any) {
    console.error('Eroare la procesare manuală:', error);
    res.status(500).json({ error: error.message || 'Eroare la procesare' });
  }
});

/**
 * POST /api/poc/telegram-action
 * Endpoint pentru acțiuni din Telegram (callback pentru butoane)
 */
router.post('/telegram-action', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const actionSchema = z.object({
      action: z.enum(['publish', 'reject', 'negotiate']),
      rfqId: z.string().uuid(),
    });

    const { action, rfqId } = actionSchema.parse(req.body);

    // Verifică dacă RFQ există
    const rfq = await prisma.rFQ.findUnique({
      where: { id: rfqId },
    });

    if (!rfq) {
      res.status(404).json({ error: 'RFQ nu a fost găsit' });
      return;
    }

    // Aplică acțiunea
    switch (action) {
      case 'publish':
        // Publică RFQ (actualizează status la published)
        await prisma.rFQ.update({
          where: { id: rfqId },
          data: {
            status: 'published',
            publishedAt: new Date(),
          },
        });

        res.json({
          success: true,
          message: 'RFQ publicat cu succes',
          rfqId,
        });
        break;

      case 'reject':
        // Respinge RFQ (păstrează status draft dar marchează ca respins)
        await prisma.rFQ.update({
          where: { id: rfqId },
          data: {
            gatekeeperStatus: 'auto_rejected',
          },
        });

        res.json({
          success: true,
          message: 'RFQ respins',
          rfqId,
        });
        break;

      case 'negotiate':
        // Începe negociere (aici se va integra cu sistemul de negociere existent)
        res.json({
          success: true,
          message: 'Negociere inițiată (placeholder)',
          rfqId,
        });
        break;
    }
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
      return;
    }
    console.error('Eroare acțiune Telegram:', error);
    res.status(500).json({ error: 'Eroare la procesare acțiune' });
  }
});

/**
 * GET /api/poc/client-profile/:userId
 * Obține profilul unui client (Admin only)
 */
router.get('/client-profile/:userId', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;

    const client = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        companyName: true,
        companyAge: true,
        annualRevenue: true,
        reputationScore: true,
        financialScore: true,
        completedRFQs: true,
        rejectedRFQs: true,
        categoryExpertise: true,
        location: true,
        createdAt: true,
        createdRFQs: {
          select: {
            id: true,
            title: true,
            budget: true,
            status: true,
            createdAt: true,
            gatekeeperStatus: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!client) {
      res.status(404).json({ error: 'Client nu a fost găsit' });
      return;
    }

    res.json({ client });
  } catch (error) {
    console.error('Eroare la obținere profil client:', error);
    res.status(500).json({ error: 'Eroare la obținere profil' });
  }
});

export default router;
