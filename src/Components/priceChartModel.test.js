import {
  buildPriceChartModel,
  DEFAULT_PRICE_CHART_RANGE,
  PRICE_CHART_RANGES,
} from './priceChartModel';

const day = index => new Date(Date.UTC(2026, 0, index + 1)).toISOString();

const snapshotWith = (count, source = 'https://example.com/prices') => ({
  generatedAt: day(count + 1),
  observations: Array.from({ length: count }, (_, index) => ({
    id: `p${index}`,
    source: 'prices',
    type: 'close',
    ticker: 'NBIS',
    value: 100 + index,
    observedAt: day(index),
    retrievedAt: day(index + 200),
    provenance: { provider: 'Fixture', originUrl: source },
  })),
});

test('price chart defaults to 60 sourced sessions and calculates the range change', () => {
  const model = buildPriceChartModel(snapshotWith(100), 'NBIS');

  expect(DEFAULT_PRICE_CHART_RANGE).toBe(60);
  expect(PRICE_CHART_RANGES).toEqual([30, 60, 90]);
  expect(model.available).toBe(true);
  expect(model.sessions).toBe(60);
  expect(model.points).toHaveLength(60);
  expect(model.points[0].value).toBe(140);
  expect(model.latestClose).toBe(199);
  expect(model.changePercent).toBeCloseTo((199 / 140 - 1) * 100, 6);
  expect(model.provider).toBe('Fixture');
  expect(model.sourceUrl).toBe('https://example.com/prices');
  expect(model.rangeAvailability).toEqual({ 30: true, 60: true, 90: true });
});

test('requested chart range does not silently fall back to fewer observations', () => {
  const model = buildPriceChartModel(snapshotWith(60), 'NBIS', 90);

  expect(model.available).toBe(false);
  expect(model.reason).toBe('price-history-insufficient');
  expect(model.sessions).toBe(90);
  expect(model.availableSessions).toBe(60);
  expect(model.points).toEqual([]);
  expect(model.rangeAvailability).toEqual({ 30: true, 60: true, 90: false });
});

test('chart model never stitches across provider segments', () => {
  const snapshot = snapshotWith(80);
  snapshot.observations.slice(-20).forEach(row => {
    row.provenance = { provider: 'Replacement', originUrl: 'https://example.com/replacement' };
  });

  const model = buildPriceChartModel(snapshot, 'NBIS', 30);

  expect(model.available).toBe(false);
  expect(model.availableSessions).toBe(20);
  expect(model.provider).toBe('Replacement');
  expect(model.sourceUrl).toBe('https://example.com/replacement');
  expect(model.rangeAvailability[30]).toBe(false);
});

test('chart model respects the snapshot point-in-time cutoff', () => {
  const snapshot = snapshotWith(70);
  snapshot.generatedAt = day(59);

  const model = buildPriceChartModel(snapshot, 'NBIS', 60);

  expect(model.available).toBe(true);
  expect(model.points).toHaveLength(60);
  expect(model.latestClose).toBe(159);
  expect(model.endDate.slice(0, 10)).toBe(day(59).slice(0, 10));
});

test('invalid or missing snapshot time fails closed', () => {
  const snapshot = snapshotWith(70);
  snapshot.generatedAt = 'invalid';

  const model = buildPriceChartModel(snapshot, 'NBIS', 30);

  expect(model.available).toBe(false);
  expect(model.reason).toBe('price-history-missing');
  expect(model.availableSessions).toBe(0);
});
