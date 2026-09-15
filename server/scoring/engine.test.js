const test = require('node:test');
const assert = require('node:assert/strict');
const companies = require('../../src/data/companyExposure.json');
const { scoreCompany, weightedFundamentals, classifyGap } = require('./engine');

test('versioned fundamentals are deterministic and explainable', () => {
  const result = scoreCompany(companies.find(item => item.ticker === 'NBIS'), [], '2026-09-15T22:00:00.000Z');
  assert.equal(result.methodologyVersion, 'gridline-company-v1.0.0');
  assert.equal(result.fundamentals, 83);
  assert.equal(result.emotion, 39);
  assert.equal(result.gap, 'Positive');
  assert.equal(result.scores.fundamentals.components.length, 5);
});

test('gap classification preserves elevated high-expectation setups', () => {
  assert.equal(classifyGap(76, 66, 94).label, 'Elevated');
  assert.equal(classifyGap(71, 58, 68).label, 'Balanced');
});

test('fundamental component weights sum to one', () => {
  const result = weightedFundamentals({ revenueQuality: 100, capexCommitment: 100, balanceSheet: 100, execution: 100, powerConfidence: 100 });
  assert.equal(result.value, 100);
});
