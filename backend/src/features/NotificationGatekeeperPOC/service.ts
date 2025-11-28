/**
 * POC: Notification Gatekeeper Service
 * Serviciu principal care monitorizează RFQ-uri noi și aplică filtrele
 */

import prisma from '../../lib/prisma';
import { evaluateRFQ, suggestSuppliers } from './gatekeeper/filters';
import { generateAIExplanation, generateClientBadges } from './gatekeeper/scoreAI';
import {
  initTelegramBot,
  sendNormalRFQNotification,
  sendHighRiskRFQNotification,
  sendHighValueRFQNotification,
  sendAutoRejectedNotification,
  sendDailyDigest,
} from './telegram/bot';

let isServiceRunning = false;
let pollingInterval: NodeJS.Timeout | null = null;

/**
 * Pornește serviciul Gatekeeper
 */
export function startGatekeeperService() {
  if (isServiceRunning) {
    console.log('⚠️ Gatekeeper Service deja pornit');
    return;
  }

  const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
  const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;

  if (!telegramToken || !adminChatId) {
    console.log('⚠️ TELEGRAM_BOT_TOKEN sau TELEGRAM_ADMIN_CHAT_ID nu sunt configurate');
    console.log('ℹ️ Gatekeeper Service nu va porni');
    return;
  }

  // Inițializează Telegram Bot
  initTelegramBot(telegramToken);

  // Pornește polling pentru RFQ-uri noi (la fiecare 10 secunde)
  pollingInterval = setInterval(async () => {
    await checkForNewRFQs(adminChatId);
  }, 10000);

  // Schedule daily digest (9:00 AM)
  scheduleDailyDigest(adminChatId);

  // Schedule auto-delete for old rejected RFQs (runs daily)
  scheduleAutoDeleteOldRejected();

  isServiceRunning = true;
  console.log('✅ Gatekeeper Service pornit - monitorizez RFQ-uri noi');
}

/**
 * Oprește serviciul Gatekeeper
 */
export function stopGatekeeperService() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
  isServiceRunning = false;
  console.log('⏹️ Gatekeeper Service oprit');
}

/**
 * Verifică RFQ-uri noi care nu au fost procesate
 */
async function checkForNewRFQs(adminChatId: string) {
  try {
    // Găsește RFQ-uri în status draft care nu au fost procesate de Gatekeeper
    const newRFQs = await prisma.rFQ.findMany({
      where: {
        status: 'draft',
        OR: [
          { gatekeeperStatus: null },
          { gatekeeperStatus: 'pending' },
        ],
      },
      include: {
        client: {
          select: {
            id: true,
            username: true,
            companyName: true,
            companyAge: true,
            annualRevenue: true,
            reputationScore: true,
            financialScore: true,
            completedRFQs: true,
            rejectedRFQs: true,
            location: true,
            categoryExpertise: true,
          },
        },
      },
      take: 10, // Procesează maxim 10 RFQ-uri pe iterație
    });

    if (newRFQs.length > 0) {
      console.log(`🔍 Procesez ${newRFQs.length} RFQ-uri noi...`);
    }

    for (const rfq of newRFQs) {
      await processRFQ(rfq, adminChatId);
    }
  } catch (error) {
    console.error('❌ Eroare la verificare RFQ-uri:', error);
  }
}

/**
 * Procesează un RFQ prin Gatekeeper
 */
async function processRFQ(rfq: any, adminChatId: string) {
  try {
    const client = rfq.client;

    // Evaluează RFQ-ul prin filtre
    const decision = evaluateRFQ(rfq, client);

    // Generează explicație AI
    const aiExplanation = generateAIExplanation(decision.decision, client, rfq);

    // Generează badge-uri client
    const badges = generateClientBadges(client);

    // Găsește furnizori sugerați
    const allSuppliers = await prisma.user.findMany({
      where: { role: 'supplier' },
      select: {
        id: true,
        categoryExpertise: true,
        reputationScore: true,
      },
    });

    const suggestedSupplierIds = suggestSuppliers(
      client.categoryExpertise || '',
      allSuppliers
    );

    // Actualizează RFQ cu decizia Gatekeeper
    await prisma.rFQ.update({
      where: { id: rfq.id },
      data: {
        gatekeeperStatus: decision.decision,
        riskLevel: decision.riskLevel,
        autoProcessedAt: new Date(),
        aiDecisionReason: aiExplanation,
        aiConfidenceScore: decision.aiScore,
        suggestedSuppliers: suggestedSupplierIds.join(','),
      },
    });

    // Salvează în log
    await prisma.gatekeeperLog.create({
      data: {
        rfqId: rfq.id,
        decision: decision.decision,
        reason: decision.reason,
        aiScore: decision.aiScore,
        riskLevel: decision.riskLevel,
        clientReputation: client.reputationScore,
        rfqValue: rfq.budget,
      },
    });

    // Trimite notificare Telegram dacă e necesar
    if (decision.shouldNotifyAdmin) {
      await sendTelegramNotification(adminChatId, {
        rfq,
        client,
        decision,
        aiExplanation,
        badges,
        suggestedSupplierIds,
      });
    }

    console.log(`✅ RFQ "${rfq.title}" procesat: ${decision.decision} (${decision.riskLevel})`);
  } catch (error) {
    console.error(`❌ Eroare procesare RFQ ${rfq.id}:`, error);
  }
}

/**
 * Trimite notificare Telegram bazată pe tip de decizie
 */
async function sendTelegramNotification(
  adminChatId: string,
  data: {
    rfq: any;
    client: any;
    decision: any;
    aiExplanation: string;
    badges: string[];
    suggestedSupplierIds: string[];
  }
) {
  const { rfq, client, decision, aiExplanation, badges, suggestedSupplierIds } = data;

  const notificationData = {
    rfqId: rfq.id,
    title: rfq.title,
    budget: rfq.budget || 0,
    clientName: client.companyName || client.username,
    reputationScore: client.reputationScore || 0,
    financialScore: client.financialScore || 0,
    riskLevel: decision.riskLevel,
    aiExplanation,
    aiScore: decision.aiScore,
    badges,
    suggestedSuppliers: suggestedSupplierIds,
  };

  switch (decision.decision) {
    case 'auto_approved':
      if (decision.riskLevel === 'high_value') {
        await sendHighValueRFQNotification(adminChatId, notificationData);
      } else {
        await sendNormalRFQNotification(adminChatId, notificationData);
      }
      break;

    case 'flagged_high_risk':
      await sendHighRiskRFQNotification(adminChatId, notificationData);
      break;

    case 'auto_rejected':
      // Doar notificare informativă, fără butoane
      await sendAutoRejectedNotification(adminChatId, {
        rfqId: rfq.id,
        title: rfq.title,
        budget: rfq.budget || 0,
        clientName: client.companyName || client.username,
        reputationScore: client.reputationScore || 0,
        financialScore: client.financialScore || 0,
        aiExplanation,
      });
      break;
  }
}

/**
 * Programează trimiterea digest-ului zilnic
 */
function scheduleDailyDigest(adminChatId: string) {
  // Calculează timpul până la următorul 9:00 AM
  const now = new Date();
  const next9AM = new Date();
  next9AM.setHours(9, 0, 0, 0);

  if (now > next9AM) {
    next9AM.setDate(next9AM.getDate() + 1);
  }

  const timeUntil9AM = next9AM.getTime() - now.getTime();

  setTimeout(() => {
    sendDailyDigestNow(adminChatId);

    // Apoi trimite în fiecare zi la 9:00 AM
    setInterval(() => {
      sendDailyDigestNow(adminChatId);
    }, 24 * 60 * 60 * 1000); // 24 ore
  }, timeUntil9AM);

  console.log(`📅 Daily digest programat pentru: ${next9AM.toLocaleString('ro-RO')}`);
}

/**
 * Trimite digest zilnic acum
 */
async function sendDailyDigestNow(adminChatId: string) {
  try {
    // Obține statistici pentru ultimele 24 ore
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const recentRFQs = await prisma.rFQ.findMany({
      where: {
        createdAt: {
          gte: yesterday,
        },
      },
      select: {
        gatekeeperStatus: true,
      },
    });

    const stats = {
      total: recentRFQs.length,
      autoApproved: recentRFQs.filter(r => r.gatekeeperStatus === 'auto_approved').length,
      autoRejected: recentRFQs.filter(r => r.gatekeeperStatus === 'auto_rejected').length,
      flaggedHighRisk: recentRFQs.filter(r => r.gatekeeperStatus === 'flagged_high_risk').length,
      pending: recentRFQs.filter(r => !r.gatekeeperStatus || r.gatekeeperStatus === 'pending').length,
    };

    await sendDailyDigest(adminChatId, stats);
    console.log('📊 Daily digest trimis');
  } catch (error) {
    console.error('❌ Eroare trimitere daily digest:', error);
  }
}

/**
 * Programează ștergerea automată a RFQ-urilor respinse mai vechi de 7 zile
 */
function scheduleAutoDeleteOldRejected() {
  // Rulează imediat la pornire
  deleteOldRejectedRFQs();

  // Apoi rulează zilnic la 3:00 AM
  const now = new Date();
  const next3AM = new Date();
  next3AM.setHours(3, 0, 0, 0);

  if (now > next3AM) {
    next3AM.setDate(next3AM.getDate() + 1);
  }

  const timeUntil3AM = next3AM.getTime() - now.getTime();

  setTimeout(() => {
    deleteOldRejectedRFQs();

    // Apoi rulează în fiecare zi la 3:00 AM
    setInterval(() => {
      deleteOldRejectedRFQs();
    }, 24 * 60 * 60 * 1000); // 24 ore
  }, timeUntil3AM);

  console.log(`🗑️ Auto-delete RFQs respinse programat pentru: ${next3AM.toLocaleString('ro-RO')}`);
}

/**
 * Șterge RFQ-urile auto-respinse mai vechi de 7 zile
 */
async function deleteOldRejectedRFQs() {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const deletedRFQs = await prisma.rFQ.deleteMany({
      where: {
        gatekeeperStatus: 'auto_rejected',
        autoProcessedAt: {
          lt: sevenDaysAgo,
        },
      },
    });

    if (deletedRFQs.count > 0) {
      console.log(`🗑️ ${deletedRFQs.count} RFQ-uri auto-respinse șterse (mai vechi de 7 zile)`);
    }
  } catch (error) {
    console.error('❌ Eroare la ștergere RFQ-uri vechi:', error);
  }
}

/**
 * Procesează manual un RFQ (pentru teste)
 */
export async function processRFQManually(rfqId: string) {
  const rfq = await prisma.rFQ.findUnique({
    where: { id: rfqId },
    include: {
      client: true,
    },
  });

  if (!rfq) {
    throw new Error('RFQ nu a fost găsit');
  }

  const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID!;
  await processRFQ(rfq, adminChatId);

  return { success: true, message: 'RFQ procesat' };
}
