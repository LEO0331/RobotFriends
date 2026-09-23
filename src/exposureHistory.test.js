import { buildCompanyPeriodView, computePeriodReturn, formatPercent, setupCopy } from './exposureHistory';

const price = (ticker, date, value) => ({ source: 'prices', type: 'close', ticker, observedAt: `${date}T00:00:00.000Z`, value, sourceUrl: `https://example.com/${ticker}-history` });

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

test('shows the latest observed close even when the return window is insufficient', () => {
  const company = { ticker: 'CRWV', price: 999, emotion: 66, fundamentals: 76, exposure: 94, gap: 'Elevated' };
  const observations = [price('CRWV', '2026-09-01', 70), price('CRWV', '2026-09-14', 75)];
  const view = buildCompanyPeriodView(company, observations, '90D');
  expect(view.currentPrice).toBe(75);
  expect(view.priceToDate).toBe('2026-09-14T00:00:00.000Z');
  expect(view.priceHistoryAvailable).toBe(false);
  expect(view.periodReturn).toBeNull();
});

test('shows unavailable price and return when no valid dated close exists', () => {
  const company = { ticker: 'NBIS', price: 999, emotion: 39, fundamentals: 83, exposure: 92, gap: 'Positive' };
  const observations = [price('NBIS', '2026-09-14', 0), price('NBIS', '2026-09-15', -10)];
  const view = buildCompanyPeriodView(company, observations, '30D');
  expect(view.currentPrice).toBeNull();
  expect(view.priceToDate).toBeNull();
  expect(view.priceHistoryAvailable).toBe(false);
  expect(view.periodReturn).toBeNull();
});

test('does not expose curated scores, gap, exposure, or confidence as verified signals', () => {
  const company = { ticker: 'ORCL', price: 200, emotion: 58, fundamentals: 71, exposure: 68, gap: 'Balanced' };
  const observations = [price('ORCL', '2026-08-15', 180), price('ORCL', '2026-09-14', 200)];
  const view = buildCompanyPeriodView(company, observations, '30D');
  expect(view).not.toHaveProperty('emotion');
  expect(view).not.toHaveProperty('fundamentals');
  expect(view).not.toHaveProperty('exposure');
  expect(view).not.toHaveProperty('gap');
  expect(view).not.toHaveProperty('confidence');
  expect(view).not.toHaveProperty('price');
  expect(view.periodReturn).toBeCloseTo((200 / 180 - 1) * 100);
});

test('explains a ten-close moving-average signal with observed values', () => {
  const company = { ticker: 'NBIS', name: 'Nebius Group', emotion: 99, fundamentals: 1 };
  const observations = Array.from({ length: 10 }, (_, index) => price('NBIS', `2026-09-${String(index + 1).padStart(2, '0')}`, 100 + index));
  const view = buildCompanyPeriodView(company, observations, '30D');
  expect(view.ma5).toBe(107);
  expect(view.ma10).toBe(104.5);
  expect(view.marketSignal).toBe('MA5 > MA10');
  const copy = setupCopy(view, '30D', (english) => english);
  expect(copy.marketSignal).toContain('MA5 $107.00 > MA10 $104.50');
  expect(copy.body).not.toContain('fundamentals');
});

test('repeated observations for one date do not count as separate moving-average closes', () => {
  const observations = Array.from({ length: 10 }, (_, index) => ({
    ...price('NBIS', '2026-09-10', 100 + index),
    retrievedAt: `2026-09-10T${String(index).padStart(2, '0')}:00:00.000Z`,
  }));
  const view = buildCompanyPeriodView({ ticker: 'NBIS' }, observations, '30D');
  expect(view.marketSignal).toBeNull();
  expect(view.periodReturn).toBeNull();
});

test('carries the observation provider and HTTPS source link with the displayed close', () => {
  const observations = [
    { ...price('ORCL', '2026-09-14', 200), providerName: 'Market provider', sourceUrl: 'https://example.com/orcl-history' },
  ];
  const view = buildCompanyPeriodView({ ticker: 'ORCL', name: 'Oracle' }, observations, '30D');
  expect(view.priceSourceUrl).toBe('https://example.com/orcl-history');
  expect(view.priceProvider).toBe('Market provider');
});

test('does not expose a non-HTTPS observation link', () => {
  const observations = [
    { ...price('ORCL', '2026-09-14', 200), sourceUrl: 'javascript:alert(1)' },
  ];
  const view = buildCompanyPeriodView({ ticker: 'ORCL' }, observations, '30D');
  expect(view.priceSourceUrl).toBeNull();
});

test('lookback and moving averages stay unavailable across mismatched provider datasets', () => {
  const observations = Array.from({ length: 10 }, (_, index) => price('NBIS', `2026-09-${String(index + 1).padStart(2, '0')}`, 100 + index));
  observations[0].sourceUrl = 'https://example.com/other-provider';
  const view = buildCompanyPeriodView({ ticker: 'NBIS' }, observations, '30D');
  expect(view.marketSignal).toBeNull();
  expect(view.ma10).toBeNull();
});
