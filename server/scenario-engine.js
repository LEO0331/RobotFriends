const methodology = require('../src/data/scenarioMethodology.json');

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const round1 = value => Math.round(value * 10) / 10;

function normalizeScenario(input = {}) {
  return {
    region: methodology.regionMultipliers[input.region] ? input.region : 'All regions',
    powerDelayMonths: clamp(Number(input.powerDelayMonths || 0), 0, 24),
    availablePowerPctChange: clamp(Number(input.availablePowerPctChange || 0), -30, 30),
    demandPctChange: clamp(Number(input.demandPctChange || 0), -20, 30),
    capexPctChange: clamp(Number(input.capexPctChange || 0), -20, 30),
    regulatoryPressureDelta: clamp(Number(input.regulatoryPressureDelta || 0), -20, 40),
  };
}

function runScenario(input = {}) {
  const scenario = normalizeScenario(input);
  const multiplier = methodology.regionMultipliers[scenario.region] || 1;
  const expansionContributions = {
    powerDelay: -0.45 * scenario.powerDelayMonths * multiplier,
    availablePower: 0.25 * scenario.availablePowerPctChange * multiplier,
    demand: 0.18 * scenario.demandPctChange,
    capex: 0.12 * scenario.capexPctChange,
    regulation: -0.10 * scenario.regulatoryPressureDelta * multiplier,
  };
  const pushbackContributions = {
    powerDelay: 0.65 * scenario.powerDelayMonths * multiplier,
    availablePower: -0.18 * scenario.availablePowerPctChange * multiplier,
    demand: -0.08 * scenario.demandPctChange,
    capex: -0.05 * scenario.capexPctChange,
    regulation: 0.35 * scenario.regulatoryPressureDelta * multiplier,
  };
  const expansionDelta = Object.values(expansionContributions).reduce((sum, value) => sum + value, 0);
  const pushbackDelta = Object.values(pushbackContributions).reduce((sum, value) => sum + value, 0);
  const companyImpact = Object.entries(methodology.companySensitivity).map(([ticker, sensitivity]) => {
    const riskDelta = (
      (scenario.powerDelayMonths / 12) * sensitivity.powerDelay * 10
      + (-scenario.availablePowerPctChange / 10) * sensitivity.availablePower * 4
      - (scenario.demandPctChange / 10) * sensitivity.demand * 2
      - (scenario.capexPctChange / 10) * sensitivity.capex * 1.5
      + (scenario.regulatoryPressureDelta / 10) * sensitivity.regulation * 3
    ) * multiplier;
    return { ticker, riskDelta: round1(riskDelta) };
  });
  return {
    methodologyVersion: methodology.version,
    generatedAt: new Date().toISOString(),
    input: scenario,
    baseline: methodology.baseline,
    result: {
      expansion: clamp(Math.round(methodology.baseline.expansion + expansionDelta), 0, 100),
      pushback: clamp(Math.round(methodology.baseline.pushback + pushbackDelta), 0, 100),
      expansionDelta: round1(expansionDelta),
      pushbackDelta: round1(pushbackDelta),
    },
    contributions: {
      expansion: Object.fromEntries(Object.entries(expansionContributions).map(([key, value]) => [key, round1(value)])),
      pushback: Object.fromEntries(Object.entries(pushbackContributions).map(([key, value]) => [key, round1(value)])),
    },
    companyImpact,
    disclaimer: 'Deterministic sensitivity analysis, not a forecast or investment recommendation.',
  };
}

module.exports = { runScenario, normalizeScenario, methodology };
