import { buildResearchBrief, documentedRelationships } from './researchBriefModel';

const snapshot = { generatedAt: '2026-09-29T01:00:00Z', observations: [], sourceHealth: {} };

test('relationship register accepts only dated HTTPS evidence for the selected company and region', () => {
  const records = [
    { ticker: 'ORCL', facility: 'Abilene', grid: 'ERCOT', region: 'Texas', relationship: 'Oracle identifies its facility.', relationshipZh: 'Oracle 確認其設施。', sourceTitle: 'Official Oracle release', publishedAt: '2026-09-15', reviewedAt: '2026-09-29', sourceUrl: 'https://www.oracle.com/news/announcement/example' },
    { ticker: 'ORCL', facility: 'Unverified', grid: 'ERCOT', region: 'Texas', relationship: 'Claim', relationshipZh: '主張', sourceTitle: 'Unofficial', publishedAt: '2026-09-15', reviewedAt: '2026-09-29', sourceUrl: 'https://example.com/story' },
  ];
  expect(documentedRelationships('ORCL', 'Texas', records)).toHaveLength(1);
  expect(documentedRelationships('ORCL', 'Northern Virginia', records)).toHaveLength(0);
  expect(documentedRelationships('NBIS', 'Texas', records)).toHaveLength(0);
});

test('Oracle Abilene relationship does not create an ERCOT demand or company price claim', () => {
  const brief = buildResearchBrief(snapshot, { ticker: 'ORCL', region: 'Texas', now: new Date('2026-09-29T01:00:00Z') });
  expect(brief.relationships).toHaveLength(1);
  expect(brief.relationships[0]).toMatchObject({ ticker: 'ORCL', facility: 'Abilene data center', grid: 'ERCOT', region: 'Texas' });
  expect(brief.lanes.find(item => item.id === 'grid').available).toBe(false);
  expect(brief.lanes.find(item => item.id === 'market').available).toBe(false);
  expect(buildResearchBrief(snapshot, { ticker: 'NBIS', region: 'All regions' }).relationships).toHaveLength(0);
});

test('project evidence remains regional and does not become company attribution', () => {
  const observed = { ...snapshot, observations: [{
    id: 'event-1', source: 'events', type: 'infrastructureEvent', retrievedAt: '2026-09-28T01:00:00Z',
    value: { title: 'Loudoun permit record', category: 'PERMIT', region: 'Northern Virginia', source: 'Loudoun', publishedAt: '2026-09-18T00:00:00Z', url: 'https://www.loudoun.gov/example' },
  }] };
  const brief = buildResearchBrief(observed, { ticker: 'NBIS', region: 'Northern Virginia', now: new Date('2026-09-29T01:00:00Z') });
  expect(brief.lanes.find(item => item.id === 'projects')).toMatchObject({ available: true, lastVerifiedAt: '2026-09-28' });
  expect(brief.relationships).toHaveLength(0);
  expect(brief.lanes.find(item => item.id === 'projects').detail).toContain('no company attribution');
});
