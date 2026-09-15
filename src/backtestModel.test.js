import { runRecordedBacktest } from './backtestModel';

test('recorded backtest keeps incomplete future windows pending', () => {
  const history = [{ ticker: 'NBIS', observedAt: '2026-09-01T22:00:00Z', gap: 'Positive' }];
  const observations = [{ source: 'prices', type: 'close', ticker: 'NBIS', observedAt: '2026-09-02T00:00:00Z', value: 100 }];
  const result = runRecordedBacktest({ ticker: 'NBIS', horizonDays: 30 }, history, observations);
  expect(result.status).toBe('insufficient-data');
  expect(result.metrics.pendingSignals).toBe(1);
  expect(result.metrics.sampleSize).toBe(0);
});
