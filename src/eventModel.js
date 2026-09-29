export const CURRENT_EVENT_DAYS = 30;
export const EVENT_TYPES = ['POWER', 'GRID', 'PERMIT', 'CAPEX'];

export const REGION_ZH = {
  'Northern Virginia': '北維吉尼亞', Texas: '德州', Arizona: '亞利桑那州', Ohio: '俄亥俄州',
  'PJM region': 'PJM 區域', 'All regions': '所有區域',
};

const TITLE_ZH = {
  'https://insidelines.pjm.com/reliability-standards-to-manage-large-load-disconnection-events-proposed-by-pjm/': ['PJM Proposes Reliability Standards to Manage Large Load Disconnection Events', 'PJM 提議大型用電負載斷線事件的可靠性標準'],
  'https://insidelines.pjm.com/pjm-issues-maximum-generation-alert-for-sept-17/': ['PJM Issues Maximum Generation Alert for Sept. 17', 'PJM 就 9 月 17 日發布最大發電量警報'],
  'https://www.loudoun.gov/m/newsflash/home/detail/10874': ['Board Approves Process that Could Pause Legislative Data Center & Substation Applications', '勞登郡董事會同意考慮暫緩部分資料中心與變電站申請的決議案'],
  'https://www.loudoun.gov/m/newsflash/Home/Detail/10876': ['Loudoun Board Opposes Valley North Transmission Line, Denies Substation Near Dulles Airport', '勞登郡董事會反對 Valley North 輸電線，否決杜勒斯機場附近的變電站申請'],
  'https://investor.oracle.com/investor-news/news-details/2026/Oracle-Announces-Q1-Results-Driven-by-Triple-Digit-Growth-in-Cloud-Infrastructure-Revenues/default.aspx': ['Oracle Announces Q1 Results Driven by Triple Digit Growth in Cloud Infrastructure Revenues', 'Oracle 公布第一季業績，雲端基礎設施營收呈三位數成長'],
};

export const CATEGORY_ZH = { POWER: '供電', GRID: '電網', PERMIT: '許可', CAPEX: '資本支出' };

export function eventTitle(event, language = 'en') {
  if (language !== 'zh-TW') return event.title;
  const translated = TITLE_ZH[event.url];
  if (translated?.[0] === event.title) return translated[1];
  return `已驗證${CATEGORY_ZH[event.category] || '基礎設施'}紀錄（${event.source || '原始來源'}）`;
}

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
