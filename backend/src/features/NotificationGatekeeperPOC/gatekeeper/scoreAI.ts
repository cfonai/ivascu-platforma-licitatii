/**
 * POC: Mock AI Scoring - Generare explicații și analiză "inteligentă"
 * Simulează un sistem AI care explică deciziile în limbaj natural
 */

interface ClientProfile {
  companyName?: string | null;
  companyAge?: number | null;
  annualRevenue?: number | null;
  reputationScore?: number | null;
  financialScore?: number | null;
  completedRFQs?: number | null;
  rejectedRFQs?: number | null;
  location?: string | null;
}

interface RFQData {
  title: string;
  budget?: number | null;
  deadline: Date;
}

/**
 * Generează badge-uri pentru profil client
 */
export function generateClientBadges(client: ClientProfile): string[] {
  const badges: string[] = [];

  if (client.reputationScore && client.reputationScore >= 4.8) {
    badges.push('🏆 Client Premium');
  }

  if (client.completedRFQs && client.completedRFQs > 50) {
    badges.push('📈 Volum Mare');
  }

  if (client.companyAge && client.companyAge > 15) {
    badges.push('⭐ Partener Vechi');
  }

  if (client.annualRevenue && client.annualRevenue > 10000000) {
    badges.push('💰 Top Venituri');
  }

  const completedRFQs = client.completedRFQs || 0;
  const rejectedRFQs = client.rejectedRFQs || 0;
  const totalRFQs = completedRFQs + rejectedRFQs;

  if (totalRFQs > 0) {
    const successRate = (completedRFQs / totalRFQs) * 100;
    if (successRate >= 90) {
      badges.push('✅ Rată Succes 90%+');
    }
  }

  if (client.companyAge && client.companyAge <= 3 && client.reputationScore && client.reputationScore >= 4.0) {
    badges.push('🚀 Rising Star');
  }

  if (client.reputationScore && client.reputationScore < 3.5) {
    badges.push('⚠️ Credit Watch');
  }

  return badges;
}

/**
 * Generează explicație AI pentru decizie (stil ChatGPT)
 */
export function generateAIExplanation(
  decision: 'auto_approved' | 'auto_rejected' | 'flagged_high_risk',
  client: ClientProfile,
  rfq: RFQData
): string {
  const companyName = client.companyName || 'Client necunoscut';
  const reputation = client.reputationScore || 0;
  const financialScore = client.financialScore || 0;
  const rfqValue = rfq.budget || 0;

  if (decision === 'auto_approved') {
    return `Am analizat cererea de ofertă "${rfq.title}" și am decis să o aprob automat.

**Motivul deciziei:**
Compania ${companyName} are un profil excelent:
- Reputație: ${reputation.toFixed(1)}★ din 5
- Scor financiar: ${financialScore}/100
- Istoric: ${client.completedRFQs || 0} RFQ-uri finalizate cu succes

Valoarea RFQ-ului (${rfqValue.toLocaleString('ro-RO')} RON) este în parametri normali pentru acest client.

**Recomandare:** Puteți publica această cerere către furnizori imediat.`;
  }

  if (decision === 'flagged_high_risk') {
    return `⚠️ Am detectat un RFQ cu risc ridicat care necesită atenția ta.

**De ce este risc înalt:**
- Valoare RFQ: ${rfqValue.toLocaleString('ro-RO')} RON (foarte mare)
- Reputație client: ${reputation.toFixed(1)}★ (sub medie)
- Istoric limitat: ${client.completedRFQs || 0} contracte finalizate

**Recomandare AI:**
Înainte de a publica acest RFQ, sugerez să:
1. Verifici manual datele clientului ${companyName}
2. Soliciti informații suplimentare despre capacitatea de plată
3. Eventual să negociezi termeni de plată mai siguri

Nu am respins automat cererea pentru că suma este semnificativă și merită evaluată manual.`;
  }

  // auto_rejected
  return `Am respins automat RFQ-ul "${rfq.title}" din motive de siguranță.

**Motivul respingerii:**
Compania ${companyName} nu îndeplinește criteriile minime:
- Reputație: ${reputation.toFixed(1)}★ (minim necesar: 4.0★)
- Scor financiar: ${financialScore}/100 (minim necesar: 70/100)
- Istoric: ${client.completedRFQs || 0} RFQ-uri finalizate (minim: 3)

**Ce se întâmplă acum:**
Cererea a fost arhivată în secțiunea "Auto-Respinse". O poți reexamina manual dacă există circumstanțe speciale.

**Sugestie:** Dacă acest client devine recurent, poți ajusta pragurile sau să-l incluzi într-o listă albă.`;
}

/**
 * Generează statistici mock pentru dashboard
 */
export function generateDailyStats(rfqs: Array<{ gatekeeperStatus?: string | null }>) {
  const stats = {
    total: rfqs.length,
    autoApproved: rfqs.filter(r => r.gatekeeperStatus === 'auto_approved').length,
    autoRejected: rfqs.filter(r => r.gatekeeperStatus === 'auto_rejected').length,
    flaggedHighRisk: rfqs.filter(r => r.gatekeeperStatus === 'flagged_high_risk').length,
    pending: rfqs.filter(r => !r.gatekeeperStatus || r.gatekeeperStatus === 'pending').length,
  };

  return stats;
}

/**
 * Generează rezumat pentru digest zilnic
 */
export function generateDailyDigest(stats: ReturnType<typeof generateDailyStats>): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString('ro-RO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `🤖 **Raport Zilnic Centru Decizii AI**
${dateStr}

📊 **Sumar:**
- Total RFQ-uri procesate: ${stats.total}
- ✅ Aprobate automat: ${stats.autoApproved}
- ❌ Respinse automat: ${stats.autoRejected}
- ⚠️ Marcate risc înalt: ${stats.flaggedHighRisk}
- ⏳ În așteptare: ${stats.pending}

${stats.flaggedHighRisk > 0 ? `⚠️ **Atenție:** ${stats.flaggedHighRisk} RFQ-uri cu risc înalt necesită revizuire manuală.` : '✅ Niciun RFQ cu risc înalt astăzi.'}

${stats.autoRejected > 0 ? `ℹ️ ${stats.autoRejected} RFQ-uri au fost respinse automat și arhivate.` : ''}

Ai o zi productivă!`;
}

/**
 * Determină emoji-ul și culoarea pentru nivel de risc
 */
export function getRiskIndicators(riskLevel: string): { emoji: string; color: string } {
  switch (riskLevel) {
    case 'high_risk':
      return { emoji: '🔴', color: 'red' };
    case 'high_value':
      return { emoji: '🟡', color: 'yellow' };
    case 'normal':
    default:
      return { emoji: '🟢', color: 'green' };
  }
}
