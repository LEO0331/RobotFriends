const VERSION = 'gridline-company-v1.0.0';

const FUNDAMENTAL_WEIGHTS = {
  revenueQuality: 0.25,
  capexCommitment: 0.20,
  balanceSheet: 0.20,
  execution: 0.20,
  powerConfidence: 0.15,
};

const COMPANY_INPUTS = {
  NBIS: {
    fundamentals: { revenueQuality: 84, capexCommitment: 92, balanceSheet: 75, execution: 88, powerConfidence: 76 },
    structuralExposure: 92,
    fallbackEmotion: 39,
    confidence: 86,
  },
  CRWV: {
    fundamentals: { revenueQuality: 78, capexCommitment: 90, balanceSheet: 60, execution: 84, powerConfidence: 65 },
    structuralExposure: 94,
    fallbackEmotion: 66,
    confidence: 86,
  },
  ORCL: {
    fundamentals: { revenueQuality: 75, capexCommitment: 82, balanceSheet: 86, execution: 62, powerConfidence: 44 },
    structuralExposure: 68,
    fallbackEmotion: 58,
    confidence: 86,
  },
  AVGO: {
    fundamentals: { revenueQuality: 92, capexCommitment: 78, balanceSheet: 88, execution: 80, powerConfidence: 58 },
    structuralExposure: 62,
    fallbackEmotion: 72,
    confidence: 86,
  },
};

const SCORE_DESCRIPTIONS = {
  revenueQuality: 'Revenue durability and growth quality',
  capexCommitment: 'Capital commitment to AI/data-center capacity',
  balanceSheet: 'Balance-sheet capacity to fund the buildout',
  execution: 'Delivery and operating execution',
  powerConfidence: 'Confidence that planned capacity can obtain power',
};

module.exports = { VERSION, FUNDAMENTAL_WEIGHTS, COMPANY_INPUTS, SCORE_DESCRIPTIONS };
