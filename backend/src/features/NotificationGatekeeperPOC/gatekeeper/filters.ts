/**
 * POC: Notification Gatekeeper - Filtere de eligibilitate și detectare risc
 * Acest modul decide automat dacă un RFQ trebuie aprobat, respins sau marcat ca risc înalt
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
  categoryExpertise?: string | null;
}

interface RFQData {
  id: string;
  title: string;
  budget?: number | null;
  deadline: Date;
  description: string;
  requirements: string;
}

export interface GatekeeperDecision {
  decision: 'auto_approved' | 'auto_rejected' | 'flagged_high_risk';
  riskLevel: 'normal' | 'high_value' | 'high_risk';
  reason: string;
  aiScore: number; // 0-100 - Scor de încredere în decizie
  shouldNotifyAdmin: boolean;
  suggestedSuppliers?: string[];
}

// Configurare praguri (se vor citi din .env în producție)
const THRESHOLDS = {
  MIN_RFQ_VALUE: process.env.GATEKEEPER_MIN_RFQ_VALUE ? parseInt(process.env.GATEKEEPER_MIN_RFQ_VALUE) : 100000,
  HIGH_VALUE_THRESHOLD: process.env.GATEKEEPER_HIGH_VALUE_THRESHOLD ? parseInt(process.env.GATEKEEPER_HIGH_VALUE_THRESHOLD) : 2000000,
  MIN_REPUTATION: process.env.GATEKEEPER_MIN_REPUTATION ? parseFloat(process.env.GATEKEEPER_MIN_REPUTATION) : 4.0,
  MIN_FINANCIAL_SCORE: 70,
  MIN_COMPLETED_RFQS: 3,
};

/**
 * Funcția principală de evaluare a unui RFQ
 */
export function evaluateRFQ(
  rfq: RFQData,
  client: ClientProfile
): GatekeeperDecision {
  const rfqValue = rfq.budget || 0;
  const reputation = client.reputationScore || 0;
  const financialScore = client.financialScore || 0;
  const completedRFQs = client.completedRFQs || 0;

  // 1. Verificare valoare minimă RFQ
  if (rfqValue < THRESHOLDS.MIN_RFQ_VALUE) {
    return {
      decision: 'auto_rejected',
      riskLevel: 'normal',
      reason: `Valoare RFQ sub pragul minim de ${THRESHOLDS.MIN_RFQ_VALUE.toLocaleString('ro-RO')} RON. RFQ respins automat.`,
      aiScore: 95,
      shouldNotifyAdmin: false, // Nu deranjăm adminul pentru astea
    };
  }

  // 2. Detectare HIGH-RISK: Valoare mare + Reputație scăzută
  if (rfqValue > THRESHOLDS.HIGH_VALUE_THRESHOLD && reputation < THRESHOLDS.MIN_REPUTATION) {
    return {
      decision: 'flagged_high_risk',
      riskLevel: 'high_risk',
      reason: `⚠️ RFQ cu valoare foarte mare (${rfqValue.toLocaleString('ro-RO')} RON) și reputație scăzută (${reputation.toFixed(1)}★). Necesită aprobare manuală.`,
      aiScore: 88,
      shouldNotifyAdmin: true, // Alertă specială pentru admin
    };
  }

  // 3. Detectare HIGH-VALUE: Valoare mare dar client de încredere
  if (rfqValue > THRESHOLDS.HIGH_VALUE_THRESHOLD && reputation >= THRESHOLDS.MIN_REPUTATION) {
    return {
      decision: 'auto_approved',
      riskLevel: 'high_value',
      reason: `✅ RFQ cu valoare mare (${rfqValue.toLocaleString('ro-RO')} RON) de la client de încredere (${reputation.toFixed(1)}★). Aprobat automat.`,
      aiScore: 92,
      shouldNotifyAdmin: true, // Notificare admin pentru vizibilitate
    };
  }

  // 4. Verificare reputație sau scor financiar
  const hasGoodReputation = reputation >= THRESHOLDS.MIN_REPUTATION;
  const hasGoodFinancialScore = financialScore >= THRESHOLDS.MIN_FINANCIAL_SCORE;
  const hasHistory = completedRFQs >= THRESHOLDS.MIN_COMPLETED_RFQS;

  if (hasGoodReputation || (hasGoodFinancialScore && hasHistory)) {
    return {
      decision: 'auto_approved',
      riskLevel: 'normal',
      reason: `✅ Client eligibil: ${
        hasGoodReputation
          ? `Reputație excelentă (${reputation.toFixed(1)}★)`
          : `Scor financiar bun (${financialScore}/100) și istoric pozitiv`
      }. Aprobat automat.`,
      aiScore: 90,
      shouldNotifyAdmin: true,
    };
  }

  // 5. Client fără istoric suficient sau scor scăzut
  if (!hasHistory) {
    return {
      decision: 'auto_rejected',
      riskLevel: 'normal',
      reason: `❌ Client nou fără istoric suficient (${completedRFQs} RFQ-uri finalizate). Necesită validare manuală înainte de aprobare.`,
      aiScore: 75,
      shouldNotifyAdmin: true, // Admin poate decide să-l accepte manual
    };
  }

  // 6. Scor general prea scăzut
  return {
    decision: 'auto_rejected',
    riskLevel: 'normal',
    reason: `❌ Scor client insuficient: Reputație ${reputation.toFixed(1)}★, Scor financiar ${financialScore}/100. Sub pragurile minime.`,
    aiScore: 80,
    shouldNotifyAdmin: true, // Logare pentru audit
  };
}

/**
 * Generează recomandări de furnizori bazat pe categoria RFQ
 */
export function suggestSuppliers(
  rfqCategory: string,
  allSuppliers: Array<{ id: string; categoryExpertise?: string | null; reputationScore?: number | null }>
): string[] {
  if (!rfqCategory) return [];

  const categoryKeywords = rfqCategory.toLowerCase().split(',').map(c => c.trim());

  const matchedSuppliers = allSuppliers
    .filter(supplier => {
      if (!supplier.categoryExpertise) return false;
      const supplierCategories = supplier.categoryExpertise.toLowerCase().split(',').map(c => c.trim());
      return categoryKeywords.some(keyword => supplierCategories.some(cat => cat.includes(keyword)));
    })
    .sort((a, b) => (b.reputationScore || 0) - (a.reputationScore || 0))
    .slice(0, 3);

  return matchedSuppliers.map(s => s.id);
}

/**
 * Calculează scorul de încredere (0-100) pentru un client
 */
export function calculateClientTrustScore(client: ClientProfile): number {
  let score = 50; // Scor de bază

  // Reputație (30 puncte)
  if (client.reputationScore) {
    score += (client.reputationScore / 5) * 30;
  }

  // Scor financiar (25 puncte)
  if (client.financialScore) {
    score += (client.financialScore / 100) * 25;
  }

  // Istoric RFQ-uri (20 puncte)
  const completedRFQs = client.completedRFQs || 0;
  const rejectedRFQs = client.rejectedRFQs || 0;
  const totalRFQs = completedRFQs + rejectedRFQs;

  if (totalRFQs > 0) {
    const successRate = completedRFQs / totalRFQs;
    score += successRate * 20;
  }

  // Vechime companie (15 puncte)
  if (client.companyAge) {
    score += Math.min(client.companyAge / 10, 1) * 15;
  }

  // Venit anual (10 puncte bonus pentru stabilitate)
  if (client.annualRevenue && client.annualRevenue > 1000000) {
    score += 10;
  }

  return Math.round(Math.min(Math.max(score, 0), 100));
}
