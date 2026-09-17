export const emptySnapshot = { generatedAt: null, freshness: 'unknown', sourceHealth: {}, outcomes: [] };

export async function loadDashboardSnapshot() {
  const response = await fetch(`${process.env.PUBLIC_URL}/data/dashboard-snapshot.json`, { cache: 'no-store' });
  if (!response.ok) throw new Error('Snapshot unavailable');
  return { ...emptySnapshot, ...await response.json() };
}

export function summarizeSnapshot(snapshot = emptySnapshot, language = 'en', timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone) {
  const date = new Date(snapshot.generatedAt || '');
  const valid = Number.isFinite(date.getTime());
  const locale = language === 'zh-TW' ? 'zh-TW' : 'en-US';
  const generatedLabel = valid
    ? new Intl.DateTimeFormat(locale, { year: 'numeric', month: language === 'zh-TW' ? 'long' : 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short', timeZone }).format(date)
    : null;
  const sources = Object.values(snapshot.sourceHealth || {});
  const healthySources = sources.filter(item => item?.status === 'ok').length;
  const latestMarketDate = (snapshot.observations || [])
    .filter(item => item?.source === 'prices' && item?.type === 'close' && Number.isFinite(Date.parse(item.observedAt)))
    .reduce((latest, item) => !latest || item.observedAt > latest ? item.observedAt : latest, null);
  return {
    generatedAt: snapshot.generatedAt || null,
    generatedLabel: valid ? (language === 'zh-TW' ? generatedLabel : generatedLabel.toUpperCase()) : (language === 'zh-TW' ? '正在載入快照' : 'LOADING SNAPSHOT'),
    generatedUtc: valid ? date.toISOString() : null,
    healthySources,
    totalSources: sources.length,
    freshness: snapshot.freshness || 'unknown',
    latestMarketDate,
  };
}
