import { summarizeSnapshot } from './snapshotMeta';

test('snapshot summary uses generatedAt and real provider health', () => {
  const result = summarizeSnapshot({
    generatedAt: '2026-09-17T22:05:00.000Z', freshness: 'partial',
    sourceHealth: { prices: { status: 'ok' }, eia: { status: 'ok' }, sec: { status: 'degraded' } },
    observations: [{ source: 'prices', type: 'close', observedAt: '2026-09-17T00:00:00.000Z' }],
  }, 'en', 'UTC');
  expect(result.generatedLabel).toContain('SEP 17, 2026');
  expect(result.generatedLabel).toContain('UTC');
  expect(result.healthySources).toBe(2);
  expect(result.totalSources).toBe(3);
  expect(result.latestMarketDate).toBe('2026-09-17T00:00:00.000Z');
});
