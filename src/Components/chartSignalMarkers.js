import {
  DEFAULT_SIGNAL_METHOD_ID,
  evaluateSnapshotSignalMethod,
  getSignalMethod,
} from '../signals/registry';

export function buildChartSignalMarkers({
  snapshot = {},
  ticker,
  methodId = DEFAULT_SIGNAL_METHOD_ID,
  chartPoints = [],
}) {
  const method = getSignalMethod(methodId) || getSignalMethod(DEFAULT_SIGNAL_METHOD_ID);
  const result = evaluateSnapshotSignalMethod(method.id, snapshot, ticker);
  const pointsByDate = new Map(
    (chartPoints || []).map(point => [String(point.date || point.observedAt || '').slice(0, 10), point])
  );

  if (result.state === 'unavailable') {
    return {
      available: false,
      reason: 'signal-method-unavailable',
      methodId: method.id,
      family: method.family,
      result,
      markers: [],
      visibleEventCount: 0,
      totalEventCount: result.events.length,
    };
  }

  const markers = result.events
    .map((event, eventIndex) => {
      const date = String(event.observedAt || '').slice(0, 10);
      const point = pointsByDate.get(date);
      if (!point) return null;
      return {
        id: `${method.id}:${date}:${eventIndex}`,
        methodId: method.id,
        family: method.family,
        date,
        observedAt: event.observedAt,
        state: event.state,
        price: Number(point.value),
        pointIndex: point.index,
        eventValue: event.value || null,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.pointIndex - b.pointIndex);

  return {
    available: true,
    reason: null,
    methodId: method.id,
    family: method.family,
    result,
    markers,
    visibleEventCount: markers.length,
    totalEventCount: result.events.length,
  };
}
