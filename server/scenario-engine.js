const methodology = require('../src/data/scenarioMethodology.json');

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const boundedNumber = (value, min, max) => {
  const number = Number(value);
  return clamp(Number.isFinite(number) ? number : 0, min, max);
};

function normalizeScenario(input = {}) {
  return {
    region: methodology.regions.includes(input.region) ? input.region : 'All regions',
    powerDelayMonths: boundedNumber(input.powerDelayMonths, 0, 24),
    availablePowerPctChange: boundedNumber(input.availablePowerPctChange, -30, 30),
    demandPctChange: boundedNumber(input.demandPctChange, -20, 30),
    capexPctChange: boundedNumber(input.capexPctChange, -20, 30),
    regulatoryPressureDelta: boundedNumber(input.regulatoryPressureDelta, -20, 40),
  };
}

function runScenario(input = {}) {
  return {
    methodologyVersion: methodology.version,
    generatedAt: new Date().toISOString(),
    status: methodology.status,
    input: normalizeScenario(input),
    disclaimer: 'Saved user assumptions only. No calibrated score, company sensitivity, or investment forecast is available.',
  };
}

module.exports = { runScenario, normalizeScenario, methodology };
