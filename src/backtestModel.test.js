import { runPriceBacktest } from './backtestModel';

const price = (session, value, sourceUrl = 'https://stooq.com/q/d/l/?s=nbis.us&i=d') => ({
  source: 'prices', type: 'close', ticker: 'NBIS', value, sourceUrl,
  observedAt: new Date(Date.UTC(2026, 0, session)).toISOString(),
});

test('MA5/MA10 crossover uses only closes known on signal day and enters next session', () => {
  const observations = Array.from({ length: 10 }, (_, index) => price(index + 1, 100));
  observations.push(price(11, 110));
  observations.push(...Array.from({ length: 11 }, (_, index) => price(index + 12, 111 + index)));
  const result = runPriceBacktest({ ticker: 'NBIS' }, observations);
  expect(result.coverage.priceObservations).toBe(22);
  expect(result.coverage.totalSignals).toBe(1);
  expect(result.rows[0]).toMatchObject({ signalAt: price(11, 110).observedAt, entryAt: price(12, 111).observedAt, exitAt: price(22, 121).observedAt, status: 'complete', direction: 'bullish' });
  expect(result.rows[0].forwardReturn).toBeCloseTo(121 / 111 - 1, 4);
  expect(result.rows[0].sourceUrl).toContain('stooq.com');
  const revisedFuture = [...observations.slice(0, 11), ...observations.slice(11).map(item => ({ ...item, value: item.value * 2 }))];
  expect(runPriceBacktest({ ticker: 'NBIS' }, revisedFuture).rows[0].signalAt).toBe(result.rows[0].signalAt);
});

test('pending outcome is not counted until ten later sessions exist', () => {
  const observations = [...Array.from({ length: 10 }, (_, index) => price(index + 1, 100)), price(11, 110), price(12, 111)];
  const result = runPriceBacktest({ ticker: 'NBIS' }, observations);
  expect(result.status).toBe('insufficient-data');
  expect(result.metrics).toMatchObject({ sampleSize: 0, pendingSignals: 1, directionalHitRate: null, averageDirectionalReturn: null });
});

test('bearish crossover evaluates the direction without using later prices in the averages', () => {
  const observations = Array.from({ length: 10 }, (_, index) => price(index + 1, 100));
  observations.push(price(11, 90));
  observations.push(...Array.from({ length: 11 }, (_, index) => price(index + 12, 89 - index)));
  const result = runPriceBacktest({ ticker: 'NBIS' }, observations);
  expect(result.rows[0].direction).toBe('bearish');
  expect(result.rows[0].ma5).toBe(98);
  expect(result.rows[0].ma10).toBe(99);
  expect(result.rows[0].forwardReturn).toBeCloseTo(79 / 89 - 1, 4);
  expect(result.rows[0].success).toBe(true);
});

test('unreferenced, invalid, duplicate and other-ticker prices cannot create a signal', () => {
  const rows = [...Array.from({ length: 10 }, (_, index) => price(index + 1, 100)), price(11, 110, ''), { ...price(11, 110), ticker: 'ORCL' }, price(11, -1), price(10, 100)];
  const result = runPriceBacktest({ ticker: 'NBIS' }, rows);
  expect(result.coverage.priceObservations).toBe(10);
  expect(result.coverage.totalSignals).toBe(0);
  expect(result.rows).toEqual([]);
});
