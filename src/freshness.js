const DAY_MS = 24 * 60 * 60 * 1000;
export const MARKET_RECENCY_DAYS = 10;

const validTime = value => {
  const time = Date.parse(value || '');
  return Number.isFinite(time) ? time : null;
};

export function observationRecency(observedAt, snapshotGeneratedAt) {
  const observed = validTime(observedAt);
  const snapshot = validTime(snapshotGeneratedAt);
  if (observed === null || snapshot === null || observed > snapshot) {
    return { available: false, days: null, status: 'unknown' };
  }
  const days = Math.floor((snapshot - observed) / DAY_MS);
  return {
    available: true,
    days,
    status: days <= MARKET_RECENCY_DAYS ? 'current' : 'stale',
  };
}

export function observationRecencyLabel(observedAt, snapshotGeneratedAt, language = 'en') {
  const result = observationRecency(observedAt, snapshotGeneratedAt);
  if (!result.available) return language === 'zh-TW' ? '資料時效無法判定' : 'Recency unavailable';

  const zh = language === 'zh-TW';
  const age = result.days === 0
    ? (zh ? '與快照同日' : 'same day as snapshot')
    : result.days === 1
      ? (zh ? '較快照早 1 天' : '1 day before snapshot')
      : (zh ? `較快照早 ${result.days} 天` : `${result.days} days before snapshot`);

  if (result.status === 'stale') {
    return zh ? `${age} · 超過示範涵蓋時效` : `${age} · beyond demo coverage window`;
  }
  return age;
}
