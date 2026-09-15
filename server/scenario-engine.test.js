const test = require('node:test');
const assert = require('node:assert/strict');
const { runScenario, normalizeScenario } = require('./scenario-engine');

test('scenario baseline returns the configured regime scores', () => {
  const result = runScenario({});
  assert.equal(result.result.expansion, 76);
  assert.equal(result.result.pushback, 58);
  assert.equal(result.methodologyVersion, 'gridline-scenario-v1.0.0');
});

test('power delay raises pushback and lowers expansion', () => {
  const result = runScenario({ region: 'Texas', powerDelayMonths: 12, availablePowerPctChange: -20 });
  assert.ok(result.result.expansion < result.baseline.expansion);
  assert.ok(result.result.pushback > result.baseline.pushback);
  assert.ok(result.companyImpact.find(item => item.ticker === 'CRWV').riskDelta > 0);
});

test('scenario input is bounded', () => {
  const value = normalizeScenario({ powerDelayMonths: 100, availablePowerPctChange: -200, demandPctChange: 100 });
  assert.equal(value.powerDelayMonths, 24);
  assert.equal(value.availablePowerPctChange, -30);
  assert.equal(value.demandPctChange, 30);
});
