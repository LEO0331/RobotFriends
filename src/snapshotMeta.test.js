import { loadDashboardSnapshot, summarizeSnapshot } from './snapshotMeta';

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

test('manual event review keeps the market snapshot date and records its own check time', async () => {
  const originalFetch = global.fetch;
  global.fetch = jest.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ generatedAt: '2026-09-22T23:56:00Z', observations: [], sourceHealth: {} }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ checkedAt: '2026-09-23T07:45:00Z', sourceHealth: { events: { status: 'partial', checkedAt: '2026-09-23T07:45:00Z' } }, observations: [{ id: 'event-1', source: 'events', type: 'infrastructureEvent' }] }) });
  try {
    const result = await loadDashboardSnapshot();
    expect(result.generatedAt).toBe('2026-09-22T23:56:00Z');
    expect(result.sourceHealth.events.checkedAt).toBe('2026-09-23T07:45:00Z');
    expect(result.observations).toHaveLength(1);
  } finally { global.fetch = originalFetch; }
});
