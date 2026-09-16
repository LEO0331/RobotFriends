export const PIPELINE_STAGES = [
  { key: 'permitting', label: 'Permitting', labelZh: '許可 / 前期審查' },
  { key: 'power-secured', label: 'Power secured', labelZh: '供電已確保' },
  { key: 'under-construction', label: 'Under construction', labelZh: '施工中' },
  { key: 'capacity-online', label: 'Capacity online', labelZh: '容量上線' },
];

export const REGION_FOCUS = {
  Arizona: {
    name: 'Arizona',
    nameZh: '亞利桑那州',
    grid: 'WECC',
    planned: 1.1,
    secured: 0.6,
    friction: 44,
    stageIndex: 0,
    constraint: 'Water review monitored',
    constraintZh: '持續監測用水審查',
    milestone: 'Land & utility review',
    milestoneZh: '土地與公用事業審查',
    insight: 'Earlier-stage pipeline; site and utility review remain the main execution dependencies.',
    insightZh: '仍屬較前期階段；場址與公用事業審查是目前主要執行依賴。',
    x: 20,
    y: 58,
    tone: 'amber',
  },
  Texas: {
    name: 'Texas',
    nameZh: '德州',
    grid: 'ERCOT',
    planned: 3.2,
    secured: 1.7,
    friction: 71,
    stageIndex: 1,
    constraint: 'Delivery timing revised',
    constraintZh: '交付時程已調整',
    milestone: 'Interconnection / delivery review',
    milestoneZh: '併網 / 交付審查',
    insight: 'The largest tracked pipeline, but delivery timing remains the central execution variable.',
    insightZh: '目前追蹤中規模最大的容量管線，但交付時程仍是主要執行變數。',
    x: 43,
    y: 68,
    tone: 'coral',
  },
  Ohio: {
    name: 'Ohio',
    nameZh: '俄亥俄州',
    grid: 'PJM',
    planned: 0.9,
    secured: 0.5,
    friction: 38,
    stageIndex: 0,
    constraint: 'Approvals progressing',
    constraintZh: '核准流程持續推進',
    milestone: 'Utility readiness / construction',
    milestoneZh: '公用事業就緒 / 進入施工',
    insight: 'Approvals are progressing; the next question is whether secured power converts into construction.',
    insightZh: '核准持續推進；下一個觀察重點是已確保供電能否順利轉化為施工進度。',
    x: 61,
    y: 39,
    tone: 'blue',
  },
  'Northern Virginia': {
    name: 'Northern Virginia',
    nameZh: '北維吉尼亞',
    grid: 'PJM',
    planned: 2.4,
    secured: 1.1,
    friction: 62,
    stageIndex: 3,
    constraint: 'Transmission queue pressure',
    constraintZh: '輸電佇列壓力',
    milestone: 'Transmission & utility delivery',
    milestoneZh: '輸電與公用事業交付',
    insight: 'Capacity is more mature, while transmission queue pressure remains the primary constraint to expansion.',
    insightZh: '容量成熟度較高，但輸電佇列壓力仍是後續擴張的主要限制。',
    x: 77,
    y: 44,
    tone: 'green',
  },
};

export const REGION_NAMES = Object.keys(REGION_FOCUS);

export function securedPercent(region) {
  if (!region || !Number.isFinite(region.planned) || region.planned <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((region.secured / region.planned) * 100)));
}

export function infrastructureLocation(hash = '') {
  const clean = String(hash).replace(/^#/, '');
  const [view = '', rawQuery = ''] = clean.split('?');
  const query = new URLSearchParams(rawQuery);
  return {
    isInfrastructure: view.toLowerCase() === 'infrastructure',
    region: query.get('region') || 'All regions',
  };
}

export function regionHash(region) {
  return region === 'All regions' ? 'infrastructure' : `infrastructure?region=${encodeURIComponent(region)}`;
}
