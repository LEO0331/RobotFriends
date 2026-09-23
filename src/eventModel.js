export const CURRENT_EVENT_DAYS = 30;
export const EVENT_TYPES = ['POWER', 'GRID', 'PERMIT', 'CAPEX'];

export function infrastructureEvents(snapshot, now = new Date()) {
  const byUrl = new Map();
  for (const observation of snapshot?.observations || []) {
    if (observation.source !== 'events' || observation.type !== 'infrastructureEvent') continue;
    const event = observation.value;
    if (!event?.url || !EVENT_TYPES.includes(event.category) || !Number.isFinite(Date.parse(event.publishedAt))) continue;
    const publishedAt = Date.parse(event.publishedAt);
    if (publishedAt > now.getTime()) continue;
    const prior = byUrl.get(event.url);
    if (!prior || String(observation.retrievedAt) > String(prior.retrievedAt)) {
      byUrl.set(event.url, { ...event, id: observation.id, retrievedAt: observation.retrievedAt });
    }
  }
  return [...byUrl.values()].map(event => ({
    ...event,
    archived: now.getTime() - Date.parse(event.publishedAt) >= CURRENT_EVENT_DAYS * 86400000,
  })).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || a.url.localeCompare(b.url));
}
