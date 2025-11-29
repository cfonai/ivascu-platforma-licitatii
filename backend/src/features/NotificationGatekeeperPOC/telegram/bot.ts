/**
 * POC: Telegram Bot - "Centru Decizii AI"
 * Bot Telegram pentru notificări și control RFQ-uri
 */

import TelegramBot from 'node-telegram-bot-api';
import prisma from '../../../lib/prisma';
import {
  createWelcomeMessage,
  createHelpMessage,
  createNormalRFQMessage,
  createHighRiskRFQMessage,
  createHighValueRFQMessage,
  createAutoRejectedMessage,
  createPublishConfirmation,
  createRejectConfirmation,
  createNegotiationStartConfirmation,
  createStatsMessage,
  createErrorMessage,
  createNewSupplierOfferMessage,
  createNegotiationResponseMessage,
  createAcceptOfferConfirmation,
  createRejectOfferConfirmation,
  createOfferNegotiationStartConfirmation,
} from './messages';
import { generateDailyDigest, generateDailyStats } from '../gatekeeper/scoreAI';

let bot: TelegramBot | null = null;

/**
 * Inițializează Telegram Bot
 */
export function initTelegramBot(token: string): TelegramBot {
  if (bot) {
    return bot;
  }

  bot = new TelegramBot(token, { polling: true });
  console.log('✅ Telegram Bot "Centru Decizii AI" inițializat');

  setupCommands();
  setupCallbackHandlers();

  return bot;
}

/**
 * Obține instanța bot-ului
 */
export function getBot(): TelegramBot | null {
  return bot;
}

/**
 * Configurează comenzi Telegram
 */
function setupCommands() {
  if (!bot) return;

  // Comandă /start
  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot?.sendMessage(chatId, createWelcomeMessage(), { parse_mode: 'Markdown' });
  });

  // Comandă /help
  bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    bot?.sendMessage(chatId, createHelpMessage(), { parse_mode: 'Markdown' });
  });

  // Comandă /stats
  bot.onText(/\/stats/, async (msg) => {
    const chatId = msg.chat.id;
    try {
      // Aici vom integra cu baza de date pentru statistici reale
      // Pentru POC, trimitem un mesaj placeholder
      const mockStats = {
        total: 12,
        autoApproved: 8,
        autoRejected: 2,
        flaggedHighRisk: 2,
        pending: 0,
      };
      bot?.sendMessage(chatId, createStatsMessage(mockStats), { parse_mode: 'Markdown' });
    } catch (error) {
      bot?.sendMessage(chatId, createErrorMessage('Nu am putut prelua statisticile.'));
    }
  });

  // Comandă /pending
  bot.onText(/\/pending/, (msg) => {
    const chatId = msg.chat.id;
    bot?.sendMessage(
      chatId,
      '⏳ **RFQ-uri în Așteptare**\n\nÎn acest moment nu există RFQ-uri care așteaptă decizia ta.\n\nVoi trimite notificări automat când apar RFQ-uri noi.',
      { parse_mode: 'Markdown' }
    );
  });

  // Comandă /risks
  bot.onText(/\/risks/, (msg) => {
    const chatId = msg.chat.id;
    bot?.sendMessage(
      chatId,
      '🔴 **RFQ-uri cu Risc Ridicat**\n\nNu există RFQ-uri cu risc ridicat în acest moment.\n\nVoi trimite alertă imediată când detectez unul.',
      { parse_mode: 'Markdown' }
    );
  });

  // Comandă /digest
  bot.onText(/\/digest/, (msg) => {
    const chatId = msg.chat.id;
    const mockStats = {
      total: 12,
      autoApproved: 8,
      autoRejected: 2,
      flaggedHighRisk: 2,
      pending: 0,
    };
    const digest = generateDailyDigest(mockStats);
    bot?.sendMessage(chatId, digest, { parse_mode: 'Markdown' });
  });

  console.log('✅ Comenzi Telegram configurate');
}

/**
 * Configurează callback-uri pentru butoane
 */
function setupCallbackHandlers() {
  if (!bot) return;

  bot.on('callback_query', async (query) => {
    const chatId = query.message?.chat.id;
    const data = query.data;

    if (!chatId || !data) return;

    try {
      const [action, rfqId] = data.split(':');

      switch (action) {
        case 'publish':
          await handlePublishRFQ(chatId, rfqId, query.message!.message_id);
          break;
        case 'reject':
          await handleRejectRFQ(chatId, rfqId, query.message!.message_id);
          break;
        case 'negotiate':
          await handleStartNegotiation(chatId, rfqId, query.message!.message_id);
          break;
        case 'details':
          await handleViewDetails(chatId, rfqId);
          break;
        case 'accept_offer':
          await handleAcceptOffer(chatId, rfqId, query.message!.message_id);
          break;
        case 'reject_offer':
          await handleRejectOffer(chatId, rfqId, query.message!.message_id);
          break;
        case 'start_offer_negotiation':
          await handleStartOfferNegotiation(chatId, rfqId, query.message!.message_id);
          break;
        case 'view_offer_details':
          await handleViewOfferDetails(chatId, rfqId);
          break;
      }

      // Răspunde la callback pentru a opri "loading"
      bot?.answerCallbackQuery(query.id);
    } catch (error) {
      console.error('Eroare callback:', error);
      bot?.answerCallbackQuery(query.id, { text: 'A apărut o eroare!' });
    }
  });

  console.log('✅ Callback handlers configurate');
}

/**
 * Handler pentru publicare RFQ
 */
async function handlePublishRFQ(chatId: number, rfqId: string, messageId: number) {
  try {
    console.log(`📤 Publicare RFQ: ${rfqId}`);

    // ACTUAL: Publică RFQ-ul în baza de date
    const rfq = await prisma.rFQ.findUnique({ where: { id: rfqId } });

    if (!rfq) {
      bot?.sendMessage(chatId, createErrorMessage('RFQ nu a fost găsit.'));
      return { success: false, error: 'RFQ not found' };
    }

    await prisma.rFQ.update({
      where: { id: rfqId },
      data: {
        status: 'published',
        publishedAt: new Date(),
        gatekeeperStatus: 'auto_approved', // Marchează ca aprobat manual de admin
      },
    });

    console.log(`✅ RFQ ${rfqId} publicat cu succes din Telegram`);

    // Editează mesajul original pentru a arăta că a fost procesat
    bot?.editMessageReplyMarkup(
      { inline_keyboard: [] },
      { chat_id: chatId, message_id: messageId }
    );

    // Trimite confirmare
    bot?.sendMessage(
      chatId,
      createPublishConfirmation(rfq.title),
      { parse_mode: 'Markdown' }
    );

    return { success: true, rfqId };
  } catch (error) {
    console.error('Eroare la publicare:', error);
    bot?.sendMessage(chatId, createErrorMessage('Nu am putut publica RFQ-ul.'));
    return { success: false, error };
  }
}

/**
 * Handler pentru respingere RFQ
 */
async function handleRejectRFQ(chatId: number, rfqId: string, messageId: number) {
  try {
    console.log(`❌ Respingere RFQ: ${rfqId}`);

    // ACTUAL: Marchează RFQ-ul ca respins în baza de date
    const rfq = await prisma.rFQ.findUnique({ where: { id: rfqId } });

    if (!rfq) {
      bot?.sendMessage(chatId, createErrorMessage('RFQ nu a fost găsit.'));
      return { success: false, error: 'RFQ not found' };
    }

    await prisma.rFQ.update({
      where: { id: rfqId },
      data: {
        gatekeeperStatus: 'auto_rejected',
        // Păstrează status draft - nu îl publicăm
      },
    });

    console.log(`✅ RFQ ${rfqId} respins cu succes din Telegram`);

    bot?.editMessageReplyMarkup(
      { inline_keyboard: [] },
      { chat_id: chatId, message_id: messageId }
    );

    bot?.sendMessage(
      chatId,
      createRejectConfirmation(rfq.title),
      { parse_mode: 'Markdown' }
    );

    return { success: true, rfqId };
  } catch (error) {
    console.error('Eroare la respingere:', error);
    bot?.sendMessage(chatId, createErrorMessage('Nu am putut respinge RFQ-ul.'));
    return { success: false, error };
  }
}

/**
 * Handler pentru începere negociere
 */
async function handleStartNegotiation(chatId: number, rfqId: string, messageId: number) {
  try {
    console.log(`🤝 Începere negociere: ${rfqId}`);

    bot?.editMessageReplyMarkup(
      { inline_keyboard: [] },
      { chat_id: chatId, message_id: messageId }
    );

    bot?.sendMessage(
      chatId,
      createNegotiationStartConfirmation(`RFQ #${rfqId.substring(0, 8)}`),
      { parse_mode: 'Markdown' }
    );

    return { success: true, rfqId };
  } catch (error) {
    console.error('Eroare la negociere:', error);
    bot?.sendMessage(chatId, createErrorMessage('Nu am putut începe negocierea.'));
    return { success: false, error };
  }
}

/**
 * Handler pentru vizualizare detalii
 */
async function handleViewDetails(chatId: number, rfqId: string) {
  try {
    console.log(`📊 Detalii RFQ: ${rfqId}`);

    bot?.sendMessage(
      chatId,
      `📊 **Detalii RFQ #${rfqId.substring(0, 8)}**\n\nPentru detalii complete, accesează platforma web:\n\nhttps://app.platforma-licitatii.ro/rfqs/${rfqId}`,
      { parse_mode: 'Markdown' }
    );

    return { success: true, rfqId };
  } catch (error) {
    console.error('Eroare la detalii:', error);
    return { success: false, error };
  }
}

/**
 * Handler pentru acceptare ofertă
 */
async function handleAcceptOffer(chatId: number, offerId: string, messageId: number) {
  try {
    console.log(`✅ Acceptare ofertă: ${offerId}`);

    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      include: {
        rfq: { include: { client: { select: { id: true } } } },
        supplier: { select: { id: true, username: true } },
      },
    });

    if (!offer) {
      bot?.sendMessage(chatId, createErrorMessage('Oferta nu a fost găsită.'));
      return { success: false, error: 'Offer not found' };
    }

    // Check if order already exists
    const existingOrder = await prisma.order.findFirst({
      where: { offerId },
    });

    if (existingOrder) {
      bot?.sendMessage(chatId, createErrorMessage('Comanda există deja pentru această ofertă.'));
      return { success: false, error: 'Order already exists' };
    }

    // Check if there's an active negotiation with a counter-offer
    const negotiation = await prisma.negotiation.findFirst({
      where: { offerId, status: 'active' },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    // Use negotiated price if available, otherwise use original offer price
    const latestMessage = negotiation?.messages[0];
    const finalPrice = latestMessage?.proposedPrice || offer.price;
    const finalDeliveryTime = latestMessage?.proposedDeliveryTime || offer.deliveryTime;

    // Update offer with negotiated terms
    await prisma.offer.update({
      where: { id: offerId },
      data: {
        status: 'accepted',
        isLocked: true,
        price: finalPrice,
        deliveryTime: finalDeliveryTime,
      },
    });

    // Create Order (admin accepts directly on behalf of client)
    const order = await prisma.order.create({
      data: {
        rfqId: offer.rfqId,
        offerId,
        clientId: offer.rfq.client.id,
        supplierId: offer.supplier.id,
        finalPrice,
        finalTerms: offer.terms,
        status: 'created',
        isLocked: true,
        paymentMockStatus: 'pending',
        deliveryStatus: 'pending',
      },
    });

    // Update RFQ status to closed (order created)
    await prisma.rFQ.update({
      where: { id: offer.rfqId },
      data: { status: 'closed' },
    });

    // Complete negotiation if exists
    if (negotiation) {
      await prisma.negotiation.update({
        where: { id: negotiation.id },
        data: {
          status: 'completed',
          completedAt: new Date(),
        },
      });
    }

    console.log(
      `✅ Ofertă ${offerId} acceptată la prețul ${finalPrice} RON și comandă ${order.id} creată cu succes din Telegram`
    );

    bot?.editMessageReplyMarkup(
      { inline_keyboard: [] },
      { chat_id: chatId, message_id: messageId }
    );

    bot?.sendMessage(
      chatId,
      createAcceptOfferConfirmation(offer.rfq.title, offer.supplier.username),
      { parse_mode: 'Markdown' }
    );

    return { success: true, offerId, orderId: order.id };
  } catch (error) {
    console.error('Eroare la acceptare ofertă:', error);
    bot?.sendMessage(chatId, createErrorMessage('Nu am putut accepta oferta.'));
    return { success: false, error };
  }
}

/**
 * Handler pentru respingere ofertă
 */
async function handleRejectOffer(chatId: number, offerId: string, messageId: number) {
  try {
    console.log(`❌ Respingere ofertă: ${offerId}`);

    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      include: {
        rfq: { select: { title: true } },
        supplier: { select: { username: true } },
      },
    });

    if (!offer) {
      bot?.sendMessage(chatId, createErrorMessage('Oferta nu a fost găsită.'));
      return { success: false, error: 'Offer not found' };
    }

    await prisma.offer.update({
      where: { id: offerId },
      data: { status: 'rejected' },
    });

    console.log(`✅ Ofertă ${offerId} respinsă cu succes din Telegram`);

    bot?.editMessageReplyMarkup(
      { inline_keyboard: [] },
      { chat_id: chatId, message_id: messageId }
    );

    bot?.sendMessage(
      chatId,
      createRejectOfferConfirmation(offer.rfq.title, offer.supplier.username),
      { parse_mode: 'Markdown' }
    );

    return { success: true, offerId };
  } catch (error) {
    console.error('Eroare la respingere ofertă:', error);
    bot?.sendMessage(chatId, createErrorMessage('Nu am putut respinge oferta.'));
    return { success: false, error };
  }
}

/**
 * Handler pentru începere negociere ofertă
 */
async function handleStartOfferNegotiation(chatId: number, offerId: string, messageId: number) {
  try {
    console.log(`🤝 Începere negociere ofertă: ${offerId}`);

    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      include: {
        rfq: { select: { title: true } },
        supplier: { select: { id: true, username: true } },
      },
    });

    if (!offer) {
      bot?.sendMessage(chatId, createErrorMessage('Oferta nu a fost găsită.'));
      return { success: false, error: 'Offer not found' };
    }

    // Get admin user (assumes first admin)
    const admin = await prisma.user.findFirst({ where: { role: 'admin' } });
    if (!admin) {
      bot?.sendMessage(chatId, createErrorMessage('Nu s-a găsit administrator.'));
      return { success: false, error: 'Admin not found' };
    }

    // Check if negotiation already exists
    const existingNegotiation = await prisma.negotiation.findFirst({
      where: { offerId, status: 'active' },
    });

    if (existingNegotiation) {
      bot?.sendMessage(chatId, createErrorMessage('Există deja o negociere activă pentru această ofertă.'));
      return { success: false, error: 'Negotiation already exists' };
    }

    // Create negotiation
    const negotiation = await prisma.negotiation.create({
      data: {
        offerId,
        rfqId: offer.rfqId,
        adminId: admin.id,
        supplierId: offer.supplierId,
        rounds: 1,
        status: 'active',
      },
    });

    // Create first message
    await prisma.negotiationMessage.create({
      data: {
        negotiationId: negotiation.id,
        senderId: admin.id,
        senderRole: 'admin',
        roundNumber: 1,
        message: 'Negociere inițiată din Telegram. Te rog să răspunzi cu o contraofertă.',
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

    console.log(`✅ Negociere inițiată pentru oferta ${offerId} din Telegram`);

    bot?.editMessageReplyMarkup(
      { inline_keyboard: [] },
      { chat_id: chatId, message_id: messageId }
    );

    bot?.sendMessage(
      chatId,
      createOfferNegotiationStartConfirmation(offer.rfq.title, offer.supplier.username),
      { parse_mode: 'Markdown' }
    );

    return { success: true, offerId, negotiationId: negotiation.id };
  } catch (error) {
    console.error('Eroare la inițiere negociere:', error);
    bot?.sendMessage(chatId, createErrorMessage('Nu am putut iniția negocierea.'));
    return { success: false, error };
  }
}

/**
 * Handler pentru vizualizare detalii ofertă
 */
async function handleViewOfferDetails(chatId: number, offerId: string) {
  try {
    console.log(`📊 Detalii ofertă: ${offerId}`);

    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      include: {
        rfq: { select: { title: true } },
        supplier: { select: { username: true } },
      },
    });

    if (!offer) {
      bot?.sendMessage(chatId, createErrorMessage('Oferta nu a fost găsită.'));
      return { success: false, error: 'Offer not found' };
    }

    bot?.sendMessage(
      chatId,
      `📊 **Detalii Ofertă Complete**

📋 **RFQ:** ${offer.rfq.title}
👤 **Furnizor:** ${offer.supplier.username}
💰 **Preț:** ${offer.price.toLocaleString('ro-RO')} RON
🚚 **Livrare:** ${offer.deliveryTime}

**Descriere:**
${offer.description}

**Termeni:**
${offer.terms}

Pentru detalii complete, accesează platforma web.`,
      { parse_mode: 'Markdown' }
    );

    return { success: true, offerId };
  } catch (error) {
    console.error('Eroare la detalii ofertă:', error);
    return { success: false, error };
  }
}

/**
 * Trimite notificare pentru RFQ normal
 */
export async function sendNormalRFQNotification(
  chatId: string,
  data: {
    rfqId: string;
    title: string;
    budget: number;
    clientName: string;
    reputationScore: number;
    financialScore: number;
    riskLevel: string;
    aiExplanation: string;
    aiScore: number;
    suggestedSuppliers?: string[];
    badges?: string[];
  }
) {
  if (!bot) return;

  const message = createNormalRFQMessage(data);

  const keyboard = {
    inline_keyboard: [
      [
        { text: '📤 Publică', callback_data: `publish:${data.rfqId}` },
        { text: '❌ Respinge', callback_data: `reject:${data.rfqId}` },
      ],
      [{ text: '📊 Detalii Complete', callback_data: `details:${data.rfqId}` }],
    ],
  };

  await bot.sendMessage(chatId, message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard,
  });
}

/**
 * Trimite notificare pentru RFQ cu risc ridicat
 */
export async function sendHighRiskRFQNotification(
  chatId: string,
  data: {
    rfqId: string;
    title: string;
    budget: number;
    clientName: string;
    reputationScore: number;
    financialScore: number;
    riskLevel: string;
    aiExplanation: string;
    aiScore: number;
  }
) {
  if (!bot) return;

  const message = createHighRiskRFQMessage(data);

  const keyboard = {
    inline_keyboard: [
      [
        { text: '📤 Publică Oricum', callback_data: `publish:${data.rfqId}` },
        { text: '❌ Respinge', callback_data: `reject:${data.rfqId}` },
      ],
      [{ text: '🤝 Începe Negociere', callback_data: `negotiate:${data.rfqId}` }],
      [{ text: '📊 Detalii Complete', callback_data: `details:${data.rfqId}` }],
    ],
  };

  await bot.sendMessage(chatId, message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard,
  });
}

/**
 * Trimite notificare pentru RFQ valoare mare
 */
export async function sendHighValueRFQNotification(
  chatId: string,
  data: {
    rfqId: string;
    title: string;
    budget: number;
    clientName: string;
    reputationScore: number;
    financialScore: number;
    riskLevel: string;
    aiExplanation: string;
    aiScore: number;
    suggestedSuppliers?: string[];
    badges?: string[];
  }
) {
  if (!bot) return;

  const message = createHighValueRFQMessage(data);

  const keyboard = {
    inline_keyboard: [
      [
        { text: '📤 Publică', callback_data: `publish:${data.rfqId}` },
        { text: '🤝 Negociază Direct', callback_data: `negotiate:${data.rfqId}` },
      ],
      [{ text: '📊 Detalii Complete', callback_data: `details:${data.rfqId}` }],
    ],
  };

  await bot.sendMessage(chatId, message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard,
  });
}

/**
 * Trimite notificare pentru RFQ auto-respins (doar log)
 */
export async function sendAutoRejectedNotification(
  chatId: string,
  data: {
    rfqId: string;
    title: string;
    budget: number;
    clientName: string;
    reputationScore: number;
    financialScore: number;
    aiExplanation: string;
  }
) {
  if (!bot) return;

  const message = createAutoRejectedMessage({
    ...data,
    riskLevel: 'normal',
    aiScore: 75,
  });

  await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
}

/**
 * Trimite digest zilnic
 */
export async function sendDailyDigest(chatId: string, stats: any) {
  if (!bot) return;

  const digest = generateDailyDigest(stats);
  await bot.sendMessage(chatId, digest, { parse_mode: 'Markdown' });
}

/**
 * Trimite notificare pentru ofertă nouă de la furnizor
 */
export async function sendNewSupplierOfferNotification(
  chatId: string,
  data: {
    offerId: string;
    rfqTitle: string;
    supplierName: string;
    price: number;
    deliveryTime: string;
    description: string;
  }
) {
  if (!bot) return;

  const message = createNewSupplierOfferMessage(data);

  const keyboard = {
    inline_keyboard: [
      [
        { text: '✅ Acceptă Oferta', callback_data: `accept_offer:${data.offerId}` },
        { text: '❌ Respinge', callback_data: `reject_offer:${data.offerId}` },
      ],
      [
        { text: '🤝 Începe Negociere', callback_data: `start_offer_negotiation:${data.offerId}` },
      ],
      [{ text: '📊 Detalii Complete', callback_data: `view_offer_details:${data.offerId}` }],
    ],
  };

  await bot.sendMessage(chatId, message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard,
  });
}

/**
 * Trimite notificare pentru răspuns furnizor la negociere
 */
export async function sendNegotiationResponseNotification(
  chatId: string,
  data: {
    negotiationId: string;
    offerId: string;
    rfqTitle: string;
    supplierName: string;
    roundNumber: number;
    message: string;
    proposedPrice?: number;
    proposedDeliveryTime?: string;
    acceptedFinal?: boolean;
  }
) {
  if (!bot) return;

  const message = createNegotiationResponseMessage(data);

  // If supplier accepted final, no more buttons needed
  if (data.acceptedFinal) {
    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    return;
  }

  // Otherwise, show options to continue negotiation
  // Use offerId for accept/reject buttons so they can update the offer
  const keyboard = {
    inline_keyboard: [
      [
        { text: '✅ Acceptă Contraoferta', callback_data: `accept_offer:${data.offerId}` },
        { text: '❌ Respinge', callback_data: `reject_offer:${data.offerId}` },
      ],
      [{ text: '📊 Vezi Detalii Negociere', callback_data: `view_offer_details:${data.offerId}` }],
    ],
  };

  await bot.sendMessage(chatId, message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard,
  });
}

/**
 * Oprește bot-ul
 */
export function stopTelegramBot() {
  if (bot) {
    bot.stopPolling();
    bot = null;
    console.log('⏹️ Telegram Bot oprit');
  }
}

// Export handlers pentru folosire în routes
export const telegramHandlers = {
  handlePublishRFQ,
  handleRejectRFQ,
  handleStartNegotiation,
  handleViewDetails,
  handleAcceptOffer,
  handleRejectOffer,
  handleStartOfferNegotiation,
  handleViewOfferDetails,
};
