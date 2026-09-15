import { runScenarioModel } from './scenarioModel';

test('scenario model preserves baseline with zero shocks', () => {
  const result = runScenarioModel({});
  expect(result.result.expansion).toBe(76);
  expect(result.result.pushback).toBe(58);
});

test('scenario model reacts to delayed power delivery', () => {
  const result = runScenarioModel({ region: 'Northern Virginia', powerDelayMonths: 12, availablePowerPctChange: -15 });
  expect(result.result.expansion).toBeLessThan(76);
  expect(result.result.pushback).toBeGreaterThan(58);
});
