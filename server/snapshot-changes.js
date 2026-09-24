const CURRENT_EVENT_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
const VERSION = 'snapshot-diff-v1';

const validTime = value => {
  const time = Date.parse(value || '');
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

function latestPrices(snapshot = {}, tickers = []) {
  const cutoff = validTime(snapshot.generatedAt);
  if (cutoff === null) return new Map();
  const wanted = new Set(tickers || []);
  const byTickerDay = new Map();
  for (const row of snapshot.observations || []) {
    const time = validTime(row?.observedAt);
    if (row?.source !== 'prices' || row?.type !== 'close' || !wanted.has(row?.ticker) ||
        time === null || time > cutoff || !Number.isFinite(Number(row.value)) || Number(row.value) <= 0) continue;
    const key = `${row.ticker}:${String(row.observedAt).slice(0, 10)}`;
    const existing = byTickerDay.get(key);
    const retrieved = validTime(row.retrievedAt) ?? -Infinity;
    const existingRetrieved = validTime(existing?.retrievedAt) ?? -Infinity;
    if (!existing || retrieved >= existingRetrieved) byTickerDay.set(key, row);
  }

  const latest = new Map();
  for (const row of byTickerDay.values()) {
    const prior = latest.get(row.ticker);
    if (!prior || validTime(row.observedAt) > validTime(prior.observedAt)) latest.set(row.ticker, row);
  }
  return latest;
}

function scoreMap(snapshot = {}, tickers = []) {
  const wanted = new Set(tickers || []);
  return new Map(
    (snapshot.scores || [])
      .filter(score => wanted.has(score?.ticker))
      .map(score => [score.ticker, score])
  );
}

function eventMap(snapshot = {}) {
  const byUrl = new Map();
  for (const row of snapshot.observations || []) {
    if (row?.source !== 'events' || row?.type !== 'infrastructureEvent') continue;
    const event = row.value;
    if (!event?.url || !validTime(event.publishedAt)) continue;
    let url;
    try {
      url = new URL(event.url).protocol === 'https:' ? event.url : null;
    } catch {
      url = null;
    }
    if (!url) continue;
    const prior = byUrl.get(url);
    const retrieved = validTime(row.retrievedAt) ?? -Infinity;
    const priorRetrieved = validTime(prior?.retrievedAt) ?? -Infinity;
    if (!prior || retrieved >= priorRetrieved) {
      byUrl.set(url, {
        ...event,
        observationId: row.id || null,
        retrievedAt: row.retrievedAt || null,
      });
    }
  }
  return byUrl;
}

function isArchived(event, snapshotTime) {
  const published = validTime(event?.publishedAt);
  const asOf = validTime(snapshotTime);
  if (published === null || asOf === null) return false;
  return asOf - published >= CURRENT_EVENT_DAYS * DAY_MS;
}

function healthStatus(snapshot = {}, source) {
  const health = snapshot.sourceHealth?.[source];
  return health?.status || null;
}

function signalValue(score) {
  const signal = score?.marketSignal;
  if (!signal) return { available: false, state: null, sourceUrl: null, observedAt: null };
  return {
    available: signal.available === true,
    state: signal.available === true ? signal.trend || null : null,
    sourceUrl: sourceUrl(signal) || signal.sourceUrl || null,
    observedAt: signal.observedAt || null,
    methodologyVersion: score.methodologyVersion || null,
  };
}

function comparableEvent(event) {
  if (!event) return null;
  return {
    title: event.title || null,
    category: event.category || null,
    region: event.region || null,
    publishedAt: event.publishedAt || null,
    source: event.source || null,
    url: event.url || null,
    summary: event.summary || null,
  };
}

function changedEvent(before, after) {
  return JSON.stringify(comparableEvent(before)) !== JSON.stringify(comparableEvent(after));
}

function changeId(parts) {
  return parts.filter(Boolean).join(':');
}

function buildSnapshotChanges(previous = {}, current = {}, options = {}) {
  const tickers = options.tickers || [];
  const from = validTime(previous.generatedAt) === null ? null : previous.generatedAt;
  const to = validTime(current.generatedAt) === null ? null : current.generatedAt;
  if (!from || !to) {
    return {
      version: VERSION,
      available: false,
      reason: !from ? 'previous-snapshot-unavailable' : 'current-snapshot-invalid',
      from,
      to,
      changes: [],
      summary: { total: 0, price: 0, signal: 0, event: 0, sourceHealth: 0 },
    };
  }

  const changes = [];
  const previousPrices = latestPrices(previous, tickers);
  const currentPrices = latestPrices(current, tickers);
  const previousScores = scoreMap(previous, tickers);
  const currentScores = scoreMap(current, tickers);

  for (const ticker of tickers) {
    const before = previousPrices.get(ticker) || null;
    const after = currentPrices.get(ticker) || null;
    const beforeValue = before ? Number(before.value) : null;
    const afterValue = after ? Number(after.value) : null;
    const priceChanged = beforeValue !== afterValue ||
      String(before?.observedAt || '') !== String(after?.observedAt || '');
    if (after && priceChanged) {
      changes.push({
        id: changeId(['price', ticker, String(after.observedAt).slice(0, 10)]),
        type: 'price',
        ticker,
        before: beforeValue,
        after: afterValue,
        observedAt: after.observedAt,
        provider: after?.provenance?.provider || after?.providerName || null,
        sourceUrl: sourceUrl(after),
      });
    }

    const beforeSignal = signalValue(previousScores.get(ticker));
    const afterSignal = signalValue(currentScores.get(ticker));
    if (beforeSignal.available !== afterSignal.available || beforeSignal.state !== afterSignal.state) {
      changes.push({
        id: changeId(['signal', ticker, afterSignal.state || 'unavailable', String(afterSignal.observedAt || to).slice(0, 10)]),
        type: 'signal',
        ticker,
        before: beforeSignal.state,
        after: afterSignal.state,
        beforeAvailable: beforeSignal.available,
        afterAvailable: afterSignal.available,
        observedAt: afterSignal.observedAt,
        methodologyVersion: afterSignal.methodologyVersion,
        sourceUrl: afterSignal.sourceUrl,
      });
    }
  }

  const previousEvents = eventMap(previous);
  const currentEvents = eventMap(current);
  for (const [url, after] of currentEvents) {
    const before = previousEvents.get(url);
    if (!before) {
      changes.push({
        id: changeId(['event-added', after.observationId || url]),
        type: 'event-added',
        title: after.title || null,
        category: after.category || null,
        region: after.region || null,
        publishedAt: after.publishedAt || null,
        source: after.source || null,
        sourceUrl: url,
      });
      continue;
    }

    if (changedEvent(before, after)) {
      changes.push({
        id: changeId(['event-updated', after.observationId || url]),
        type: 'event-updated',
        title: after.title || null,
        category: after.category || null,
        region: after.region || null,
        publishedAt: after.publishedAt || null,
        source: after.source || null,
        sourceUrl: url,
      });
    }

    if (!isArchived(before, from) && isArchived(after, to)) {
      changes.push({
        id: changeId(['event-archived', after.observationId || url]),
        type: 'event-archived',
        title: after.title || null,
        category: after.category || null,
        region: after.region || null,
        publishedAt: after.publishedAt || null,
        source: after.source || null,
        sourceUrl: url,
      });
    }
  }

  const sources = [...new Set([
    ...Object.keys(previous.sourceHealth || {}),
    ...Object.keys(current.sourceHealth || {}),
  ])].sort();
  for (const source of sources) {
    const before = healthStatus(previous, source);
    const after = healthStatus(current, source);
    if (before !== after) {
      changes.push({
        id: changeId(['source-health', source, before || 'none', after || 'none']),
        type: 'source-health',
        source,
        before,
        after,
        checkedAt: current.sourceHealth?.[source]?.checkedAt || null,
      });
    }
  }

  const order = {
    'event-added': 10,
    'event-updated': 20,
    signal: 30,
    price: 40,
    'source-health': 50,
    'event-archived': 60,
  };
  changes.sort((a, b) =>
    (order[a.type] || 99) - (order[b.type] || 99) ||
    String(a.ticker || a.title || a.source || '').localeCompare(String(b.ticker || b.title || b.source || '')) ||
    String(a.id).localeCompare(String(b.id))
  );

  const summary = {
    total: changes.length,
    price: changes.filter(item => item.type === 'price').length,
    signal: changes.filter(item => item.type === 'signal').length,
    event: changes.filter(item => item.type.startsWith('event-')).length,
    sourceHealth: changes.filter(item => item.type === 'source-health').length,
  };

  return {
    version: VERSION,
    available: true,
    reason: null,
    from,
    to,
    changes,
    summary,
  };
}

module.exports = {
  CURRENT_EVENT_DAYS,
  VERSION,
  buildSnapshotChanges,
  latestPrices,
  eventMap,
  isArchived,
};
