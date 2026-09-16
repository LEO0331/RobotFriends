function observationKey(item) {
  if (item?.id) return `id:${item.id}`;
  return JSON.stringify([
    item?.source || '', item?.type || '', item?.ticker || '', item?.region || '',
    item?.observedAt || '', item?.value ?? null,
  ]);
}

function mergeSnapshotObservations(previous = [], fresh = [], outcomes = []) {
  const successful = new Set((outcomes || []).filter(item => item.status === 'ok').map(item => item.source));
  const retained = (previous || []).filter(item => !successful.has(item.source));
  const merged = new Map();
  for (const item of [...retained, ...(fresh || [])]) merged.set(observationKey(item), item);
  return [...merged.values()].sort((a, b) => {
    const sourceOrder = String(a.source || '').localeCompare(String(b.source || ''));
    if (sourceOrder) return sourceOrder;
    const dateOrder = String(a.observedAt || '').localeCompare(String(b.observedAt || ''));
    if (dateOrder) return dateOrder;
    return observationKey(a).localeCompare(observationKey(b));
  });
}

module.exports = { mergeSnapshotObservations, observationKey };
