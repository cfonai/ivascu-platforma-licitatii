/**
 * POC: Telegram Message Templates - Toate mesajele în română
 */

import { getRiskIndicators } from '../gatekeeper/scoreAI';

interface RFQNotificationData {
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

/**
 * Mesaj pentru RFQ normal eligibil
 */
export function createNormalRFQMessage(data: RFQNotificationData): string {
  const { emoji } = getRiskIndicators(data.riskLevel);

  return `${emoji} **Cerere RFQ Nouă Eligibilă**

📋 **Titlu:** ${data.title}
💰 **Valoare:** ${data.budget.toLocaleString('ro-RO')} RON
🏢 **Client:** ${data.clientName}
⭐ **Reputație:** ${data.reputationScore.toFixed(1)}★ / 5
📊 **Scor Financiar:** ${data.financialScore}/100
🤖 **Încredere AI:** ${data.aiScore}%

${data.badges && data.badges.length > 0 ? `🏆 **Badge-uri:** ${data.badges.join(', ')}\n` : ''}
${data.suggestedSuppliers && data.suggestedSuppliers.length > 0 ? `💼 **Furnizori Sugerați:** ${data.suggestedSuppliers.length} găsiți\n` : ''}
---
**Decizie AI:** Aprobat automat - client de încredere.`;
}

/**
 * Mesaj pentru RFQ cu risc înalt
 */
export function createHighRiskRFQMessage(data: RFQNotificationData): string {
  return `🔴 **ALERTĂ: RFQ Risc Ridicat**

⚠️ **NECESITĂ ATENȚIE MANUALĂ** ⚠️

📋 **Titlu:** ${data.title}
💰 **Valoare:** ${data.budget.toLocaleString('ro-RO')} RON (⚠️ VALOARE FOARTE MARE)
🏢 **Client:** ${data.clientName}
⭐ **Reputație:** ${data.reputationScore.toFixed(1)}★ (⚠️ SUB MEDIE)
📊 **Scor Financiar:** ${data.financialScore}/100
🤖 **Încredere AI:** ${data.aiScore}%

🚨 **Nivel Risc:** RIDICAT

---
**Analiză AI:**
${data.aiExplanation}

---
**Ce vrei să faci?**`;
}

/**
 * Mesaj pentru RFQ valoare mare (dar client bun)
 */
export function createHighValueRFQMessage(data: RFQNotificationData): string {
  return `🟡 **RFQ Valoare Mare**

✨ **OPORTUNITATE IMPORTANTĂ** ✨

📋 **Titlu:** ${data.title}
💰 **Valoare:** ${data.budget.toLocaleString('ro-RO')} RON (💎 VALOARE MARE)
🏢 **Client:** ${data.clientName}
⭐ **Reputație:** ${data.reputationScore.toFixed(1)}★ (✅ EXCELENT)
📊 **Scor Financiar:** ${data.financialScore}/100
🤖 **Încredere AI:** ${data.aiScore}%

${data.badges && data.badges.length > 0 ? `🏆 **Badge-uri:** ${data.badges.join(', ')}\n` : ''}
💼 **Furnizori Sugerați:** ${data.suggestedSuppliers?.length || 0} găsiți

---
**Decizie AI:** Aprobat automat - client premium, valoare mare.

**Recomandare:** Acest RFQ are potențial ridicat. Poți începe direct negocierea sau să îl publici către furnizori.`;
}

/**
 * Mesaj pentru RFQ auto-respins (doar pentru log)
 */
export function createAutoRejectedMessage(data: RFQNotificationData): string {
  return `❌ **RFQ Auto-Respins** (Doar informare)

📋 **Titlu:** ${data.title}
💰 **Valoare:** ${data.budget.toLocaleString('ro-RO')} RON
🏢 **Client:** ${data.clientName}
⭐ **Reputație:** ${data.reputationScore.toFixed(1)}★
📊 **Scor Financiar:** ${data.financialScore}/100

---
**Motiv Respingere:**
${data.aiExplanation}

ℹ️ RFQ-ul a fost arhivat în secțiunea "Auto-Respinse". Poți vizualiza toate respingerile în dashboard.`;
}

/**
 * Mesaj confirmare publicare
 */
export function createPublishConfirmation(rfqTitle: string): string {
  return `✅ **RFQ Publicat cu Succes**

Cererea "${rfqTitle}" a fost publicată către furnizori.

Furnizorii vor putea vizualiza și să trimită oferte începând de acum.`;
}

/**
 * Mesaj confirmare respingere
 */
export function createRejectConfirmation(rfqTitle: string): string {
  return `❌ **RFQ Respins**

Cererea "${rfqTitle}" a fost respinsă și mutată în arhivă.

Clientul nu va fi notificat automat.`;
}

/**
 * Mesaj confirmare începere negociere
 */
export function createNegotiationStartConfirmation(rfqTitle: string): string {
  return `🤝 **Negociere Inițiată**

Am început procesul de negociere pentru "${rfqTitle}".

Vei putea gestiona negocierea din platforma web.`;
}

/**
 * Mesaj eroare
 */
export function createErrorMessage(error: string): string {
  return `❌ **Eroare**

A apărut o problemă: ${error}

Te rog să încerci din nou sau să contactezi suportul tehnic.`;
}

/**
 * Mesaj ajutor
 */
export function createHelpMessage(): string {
  return `🤖 **Centru Decizii AI - Ajutor**

**Comenzi disponibile:**

/start - Pornește bot-ul
/help - Acest mesaj de ajutor
/pending - Afișează RFQ-uri în așteptare
/risks - Afișează doar RFQ-urile cu risc ridicat
/stats - Statistici zilnice
/digest - Raport rezumativ

**Butoane interactive:**
📤 **Publică** - Publică RFQ către furnizori
❌ **Respinge** - Respinge RFQ și arhivează
🤝 **Negociază** - Începe negociere directă
📊 **Detalii** - Vezi informații complete

**Notificări automate:**
- 🟢 RFQ-uri normale aprobate
- 🟡 RFQ-uri cu valoare mare
- 🔴 RFQ-uri cu risc ridicat
- 📊 Raport zilnic la 9:00 AM

Ai întrebări? Scrie-mi oricând!`;
}

/**
 * Mesaj statistici zilnice
 */
export function createStatsMessage(stats: {
  total: number;
  autoApproved: number;
  autoRejected: number;
  flaggedHighRisk: number;
  pending: number;
}): string {
  const now = new Date().toLocaleDateString('ro-RO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return `📊 **Statistici Astăzi**
${now}

📈 **Total RFQ-uri:** ${stats.total}
✅ **Aprobate automat:** ${stats.autoApproved}
❌ **Respinse automat:** ${stats.autoRejected}
⚠️ **Risc ridicat:** ${stats.flaggedHighRisk}
⏳ **În așteptare:** ${stats.pending}

${stats.flaggedHighRisk > 0 ? `\n🔴 Ai ${stats.flaggedHighRisk} RFQ-uri cu risc ridicat care necesită atenție!` : '\n✅ Niciun RFQ cu risc ridicat astăzi.'}`;
}

/**
 * Mesaj bun venit
 */
export function createWelcomeMessage(): string {
  return `👋 **Bine ai venit la Centru Decizii AI!**

🤖 Sunt asistentul tău automat pentru gestionarea cererilor de ofertă (RFQ).

**Ce fac pentru tine:**
✅ Analizez automat toate RFQ-urile noi
✅ Aprob automat clienții de încredere
✅ Detectez RFQ-urile cu risc ridicat
✅ Îți trimit alerte pentru decizii importante
✅ Îți ofer statistici și rapoarte zilnice

**Primul pas:**
Folosește comanda /help pentru a vedea toate opțiunile disponibile.

Să începem! 🚀`;
}
