const toTime = value => {
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : null;
};

const sourceUrl = row => {
  const candidate = row?.provenance?.originUrl || row?.sourceUrl || null;
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    return url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
};

const retrievalTime = row => {
  const time = Date.parse(row?.retrievedAt || '');
  return Number.isFinite(time) ? time : -Infinity;
};

export function normalizePriceObservations(observations = [], ticker, cutoff) {
  const hasCutoff = cutoff !== undefined && cutoff !== null;
  const parsedCutoff = hasCutoff ? Date.parse(cutoff) : Infinity;
  if (hasCutoff && !Number.isFinite(parsedCutoff)) return [];
  const cutoffTime = parsedCutoff;
  const candidates = (observations || [])
    .filter(row => row?.source === 'prices' && row?.type === 'close' && row?.ticker === ticker &&
      Number.isFinite(Number(row.value)) && Number(row.value) > 0 &&
      toTime(row.observedAt) !== null && toTime(row.observedAt) <= cutoffTime)
    .sort((a, b) => toTime(a.observedAt) - toTime(b.observedAt));

  const byDay = new Map();
  for (const row of candidates) {
    const date = new Date(toTime(row.observedAt)).toISOString().slice(0, 10);
    const existing = byDay.get(date);
    if (!existing || retrievalTime(row) >= retrievalTime(existing.raw)) {
      byDay.set(date, {
        id: row.id || null,
        date,
        observedAt: row.observedAt,
        value: Number(row.value),
        sourceUrl: sourceUrl(row),
        provider: row?.provenance?.provider || row?.providerName || null,
        raw: row,
      });
    }
  }

  return [...byDay.values()]
    .sort((a, b) => toTime(a.observedAt) - toTime(b.observedAt))
    .map(({ raw, ...row }) => row);
}

export function latestSourceSegment(rows = []) {
  if (!rows.length) return [];
  const latestSource = rows[rows.length - 1]?.sourceUrl;
  if (!latestSource) return [];
  let start = rows.length - 1;
  while (start > 0 && rows[start - 1]?.sourceUrl === latestSource) start -= 1;
  return rows.slice(start);
}

export function evidenceFor(rows = [], minimumObservations = 0) {
  const segment = latestSourceSegment(rows);
  const window = minimumObservations > 0 ? segment.slice(-minimumObservations) : segment;
  const latest = segment[segment.length - 1] || null;
  return {
    observationCount: segment.length,
    windowObservationCount: window.length,
    sourceUrl: latest?.sourceUrl || null,
    provider: latest?.provider || null,
    observationIds: window.map(row => row.id).filter(Boolean),
  };
}
