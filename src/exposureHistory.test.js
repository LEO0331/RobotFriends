import { buildCompanyPeriodView, computePeriodReturn, formatPercent } from './exposureHistory';

const price = (ticker, date, value) => ({ source: 'prices', type: 'close', ticker, observedAt: `${date}T00:00:00.000Z`, value });

test('computes a return from the closest trading date to the requested window', () => {
  const observations = [
    price('NBIS', '2026-08-14', 100),
    price('NBIS', '2026-09-14', 110),
  ];
  const result = computePeriodReturn(observations, 'NBIS', '30D');
  expect(result.available).toBe(true);
  expect(result.returnPct).toBeCloseTo(10);
  expect(formatPercent(result.returnPct)).toBe('+10.0%');
});

test('does not invent a return when the requested lookback is not covered', () => {
  const observations = [
    price('CRWV', '2026-09-01', 70),
    price('CRWV', '2026-09-14', 75),
  ];
  expect(computePeriodReturn(observations, 'CRWV', '90D').available).toBe(false);
});

test('keeps point-in-time scores while exposing deltas only when score history exists', () => {
  const company = { ticker: 'ORCL', price: 200, emotion: 58, fundamentals: 71, exposure: 68, gap: 'Balanced' };
  const observations = [price('ORCL', '2026-08-15', 180), price('ORCL', '2026-09-14', 200)];
  const history = [{ ticker: 'ORCL', observedAt: '2026-08-15T22:00:00.000Z', emotion: 52, fundamentals: 69, exposure: 67, gap: 'Balanced' }];
  const view = buildCompanyPeriodView(company, observations, history, '30D', '2026-09-14T22:00:00.000Z');
  expect(view.emotion).toBe(58);
  expect(view.emotionDelta).toBe(6);
  expect(view.fundamentalsDelta).toBe(2);
  expect(view.exposureDelta).toBe(1);
});
