const test = require('node:test');
const assert = require('node:assert/strict');
const { runScenario, normalizeScenario } = require('./scenario-engine');

test('scenario API records assumptions without invented scores or company risk figures', () => {
  const result = runScenario({ region: 'Texas', powerDelayMonths: 12, availablePowerPctChange: -15 });
  assert.equal(result.status, 'assumptions-only');
  assert.equal(result.input.region, 'Texas');
  assert.equal(result.input.powerDelayMonths, 12);
  for (const key of ['baseline', 'result', 'contributions', 'companyImpact']) {
    assert.equal(Object.hasOwn(result, key), false, key);
  }
});

test('scenario input is bounded', () => {
  const value = normalizeScenario({ powerDelayMonths: 100, availablePowerPctChange: -200, demandPctChange: 100 });
  assert.equal(value.powerDelayMonths, 24);
  assert.equal(value.availablePowerPctChange, -30);
  assert.equal(value.demandPctChange, 30);
});
