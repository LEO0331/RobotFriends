import { buildPriceChartModel } from './priceChartModel';
import { buildChartSignalMarkers } from './chartSignalMarkers';
import { SIGNAL_METHOD_IDS } from '../signals/registry';

const day = index => new Date(Date.UTC(2026, 0, index + 1)).toISOString();

const snapshotFromValues = values => ({
  generatedAt: day(values.length + 1),
  observations: values.map((value, index) => ({
    id: `p${index}`,
    source: 'prices',
    type: 'close',
    ticker: 'NBIS',
    value,
    observedAt: day(index),
    provenance: { provider: 'Fixture', originUrl: 'https://example.com/prices' },
  })),
});

test('maps moving-average crossover events to exact visible chart points', () => {
  const snapshot = snapshotFromValues([
    ...Array(15).fill(100),
    ...Array(45).fill(110),
  ]);
  const chart = buildPriceChartModel(snapshot, 'NBIS', 60);
  const markers = buildChartSignalMarkers({
    snapshot,
    ticker: 'NBIS',
    methodId: SIGNAL_METHOD_IDS.TREND_MOVING_AVERAGE,
    chartPoints: chart.points,
  });

  expect(markers.available).toBe(true);
  expect(markers.markers).toHaveLength(1);
  expect(markers.markers[0]).toMatchObject({
    state: 'upward',
    date: day(15).slice(0, 10),
    price: 110,
    pointIndex: 15,
  });
  expect(markers.totalEventCount).toBe(1);
});

test('filters method events that fall outside the displayed chart range', () => {
  const snapshot = snapshotFromValues([
    ...Array(15).fill(100),
    ...Array(45).fill(110),
  ]);
  const chart = buildPriceChartModel(snapshot, 'NBIS', 30);
  const markers = buildChartSignalMarkers({
    snapshot,
    ticker: 'NBIS',
    methodId: SIGNAL_METHOD_IDS.TREND_MOVING_AVERAGE,
    chartPoints: chart.points,
  });

  expect(markers.totalEventCount).toBe(1);
  expect(markers.visibleEventCount).toBe(0);
  expect(markers.markers).toEqual([]);
});

test('RSI and Bollinger events use the same generic marker contract', () => {
  const risingSnapshot = snapshotFromValues(Array.from({ length: 60 }, (_, index) => 100 + index));
  const risingChart = buildPriceChartModel(risingSnapshot, 'NBIS', 60);
  const rsi = buildChartSignalMarkers({
    snapshot: risingSnapshot,
    ticker: 'NBIS',
    methodId: SIGNAL_METHOD_IDS.MOMENTUM_RSI,
    chartPoints: risingChart.points,
  });

  expect(rsi.markers[0]).toEqual(expect.objectContaining({
    methodId: 'momentum-rsi',
    family: 'momentum',
    state: 'upper-reference-range',
    price: 114,
    pointIndex: 14,
  }));

  const bandSnapshot = snapshotFromValues([
    ...Array(20).fill(100),
    150,
    ...Array(39).fill(150),
  ]);
  const bandChart = buildPriceChartModel(bandSnapshot, 'NBIS', 60);
  const bollinger = buildChartSignalMarkers({
    snapshot: bandSnapshot,
    ticker: 'NBIS',
    methodId: SIGNAL_METHOD_IDS.VOLATILITY_BOLLINGER,
    chartPoints: bandChart.points,
  });

  expect(bollinger.markers[0]).toEqual(expect.objectContaining({
    methodId: 'volatility-bollinger',
    family: 'volatility',
    state: 'above-upper-band',
    price: 150,
    pointIndex: 20,
  }));
});

test('signal marker layer reports unavailable methods without inventing events', () => {
  const snapshot = snapshotFromValues(Array.from({ length: 10 }, (_, index) => 100 + index));
  const chartPoints = snapshot.observations.map((row, index) => ({
    index,
    date: row.observedAt.slice(0, 10),
    observedAt: row.observedAt,
    value: row.value,
  }));
  const markers = buildChartSignalMarkers({
    snapshot,
    ticker: 'NBIS',
    methodId: SIGNAL_METHOD_IDS.VOLATILITY_BOLLINGER,
    chartPoints,
  });

  expect(markers.available).toBe(false);
  expect(markers.reason).toBe('signal-method-unavailable');
  expect(markers.markers).toEqual([]);
  expect(markers.visibleEventCount).toBe(0);
});
