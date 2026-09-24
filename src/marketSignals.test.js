import { marketSignals } from './marketSignals';

const prices = values => ({
  generatedAt: '2026-09-23T00:00:00Z',
  observations: values.map((value, index) => ({
    id: `p${index}`, source: 'prices', type: 'close', ticker: 'NBIS', value,
    observedAt: `2026-09-${String(index + 1).padStart(2, '0')}T00:00:00Z`,
    provenance: { provider: 'Fixture', originUrl: 'https://example.com/price' },
  })),
});

test('MA5 and MA10 use only dated price observations at the snapshot cutoff', () => {
  const snapshot = prices([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  snapshot.observations.push({ ...snapshot.observations[9], id: 'future', value: 999, observedAt: '2026-09-24T00:00:00Z' });
  const result = marketSignals(snapshot, 'NBIS');
  expect(result.close).toBe(10);
  expect(result.ma5).toBe(8);
  expect(result.ma10).toBe(5.5);
  expect(result.trend).toBe('above');
  expect(result.observationIds).toHaveLength(10);
  expect(result.sourceUrl).toBe('https://example.com/price');
  expect(result.signalMethodId).toBe('trend-moving-average');
  expect(result.signalMethod).toMatchObject({
    family: 'trend',
    state: 'upward',
    requirements: { met: true },
  });
});

test('missing or short price history cannot create a trend', () => {
  expect(marketSignals(prices([]), 'NBIS')).toBeNull();
  expect(marketSignals(prices([1, 2]), 'NBIS').trend).toBe('unavailable');
});

test('duplicate dates and mixed provider URLs cannot manufacture a ten-close signal', () => {
  const duplicate = prices([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  duplicate.observations.push({ ...duplicate.observations[8], id: 'duplicate', value: 10 });
  expect(marketSignals(duplicate, 'NBIS').ma10).toBeNull();
  const mixed = prices([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  mixed.observations[0].provenance.originUrl = 'https://example.com/other';
  expect(marketSignals(mixed, 'NBIS').trend).toBe('unavailable');
});
