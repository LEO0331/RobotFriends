import methodology from './data/scenarioMethodology.json';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const boundedNumber = (value, min, max) => {
  const number = Number(value);
  return clamp(Number.isFinite(number) ? number : 0, min, max);
};

export const scenarioRegions = methodology.regions;

export function normalizeScenario(input = {}) {
  return {
    region: scenarioRegions.includes(input.region) ? input.region : 'All regions',
    powerDelayMonths: boundedNumber(input.powerDelayMonths, 0, 24),
    availablePowerPctChange: boundedNumber(input.availablePowerPctChange, -30, 30),
    demandPctChange: boundedNumber(input.demandPctChange, -20, 30),
    capexPctChange: boundedNumber(input.capexPctChange, -20, 30),
    regulatoryPressureDelta: boundedNumber(input.regulatoryPressureDelta, -20, 40),
  };
}

export function runScenarioModel(input = {}) {
  return {
    methodologyVersion: methodology.version,
    status: methodology.status,
    input: normalizeScenario(input),
  };
}
