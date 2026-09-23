import { CURRENT_EVENT_DAYS, infrastructureEvents } from './eventModel';

const record = (publishedAt, url = 'https://insidelines.pjm.com/a/') => ({ source: 'events', type: 'infrastructureEvent', id: url, retrievedAt: '2026-09-20T00:00:00Z', value: { title: 'PJM updates its load forecast', category: 'POWER', region: 'Mid-Atlantic', source: 'PJM', publishedAt, url } });

test('shows primary events for 30 days and then archives them', () => {
  const now = new Date('2026-09-23T00:00:00Z');
  expect(infrastructureEvents({ observations: [record('2026-09-01T00:00:00Z')] }, now)[0].archived).toBe(false);
  expect(infrastructureEvents({ observations: [record('2026-08-24T00:00:00Z')] }, now)[0].archived).toBe(true);
  expect(CURRENT_EVENT_DAYS).toBe(30);
});

test('omits unrelated observations and keeps the latest revision of an event', () => {
  const old = record('2026-09-01T00:00:00Z');
  const updated = { ...old, id: 'revision', retrievedAt: '2026-09-22T00:00:00Z', value: { ...old.value, title: 'Updated PJM load forecast' } };
  const unrelated = { ...old, type: 'filings' };
  expect(infrastructureEvents({ observations: [old, updated, unrelated] }, new Date('2026-09-23T00:00:00Z'))).toHaveLength(1);
  expect(infrastructureEvents({ observations: [old, updated] }, new Date('2026-09-23T00:00:00Z'))[0].title).toBe('Updated PJM load forecast');
});
