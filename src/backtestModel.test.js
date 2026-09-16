import { runRecordedBacktest } from './backtestModel';

test('recorded backtest keeps incomplete future windows pending', () => {
  const history = [{ ticker: 'NBIS', observedAt: '2026-09-01T22:00:00Z', gap: 'Positive', origin: 'recorded' }];
  const observations = [{ source: 'prices', type: 'close', ticker: 'NBIS', observedAt: '2026-09-02T00:00:00Z', value: 100 }];
  const result = runRecordedBacktest({ ticker: 'NBIS', horizonDays: 30 }, history, observations);
  expect(result.status).toBe('insufficient-data');
  expect(result.metrics.pendingSignals).toBe(1);
  expect(result.metrics.sampleSize).toBe(0);
  expect(result.coverage.recordedSignals).toBe(1);
  expect(result.coverage.reconstructedSignals).toBe(0);
});

test('backtest exposes reconstructed origin and completed forward return', () => {
  const history = [{
    ticker: 'NBIS',
    observedAt: '2026-06-01T22:00:00Z',
    gap: 'Positive',
    origin: 'historical-reconstruction',
    pointInTimeQuality: 'partial',
  }];
  const observations = [
    { source: 'prices', type: 'close', ticker: 'NBIS', observedAt: '2026-06-02T00:00:00Z', value: 100 },
    { source: 'prices', type: 'close', ticker: 'NBIS', observedAt: '2026-07-02T00:00:00Z', value: 110 },
  ];
  const result = runRecordedBacktest({ ticker: 'NBIS', horizonDays: 30 }, history, observations);
  expect(result.status).toBe('complete');
  expect(result.coverage.reconstructedSignals).toBe(1);
  expect(result.coverage.quality).toBe('partial');
  expect(result.rows[0].origin).toBe('historical-reconstruction');
  expect(result.rows[0].pointInTimeQuality).toBe('partial');
  expect(result.rows[0].forwardReturn).toBe(0.1);
});
