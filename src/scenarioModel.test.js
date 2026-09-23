import { normalizeScenario, runScenarioModel } from './scenarioModel';

test('scenario model records assumptions without invented scores or company risk figures', () => {
  const result = runScenarioModel({ region: 'Texas', powerDelayMonths: 12, availablePowerPctChange: -15 });
  expect(result.status).toBe('assumptions-only');
  expect(result.input).toMatchObject({ region: 'Texas', powerDelayMonths: 12, availablePowerPctChange: -15 });
  expect(result).not.toHaveProperty('baseline');
  expect(result).not.toHaveProperty('result');
  expect(result).not.toHaveProperty('contributions');
  expect(result).not.toHaveProperty('companyImpact');
});

test('scenario input is bounded without replacing user assumptions with regional coefficients', () => {
  const value = normalizeScenario({ region: 'Texas', powerDelayMonths: 100, availablePowerPctChange: -200 });
  expect(value).toMatchObject({ region: 'Texas', powerDelayMonths: 24, availablePowerPctChange: -30 });
});
