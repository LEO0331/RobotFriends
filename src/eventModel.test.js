import { CURRENT_EVENT_DAYS, filingEvents } from './eventModel';

const filing = (filed, extra = {}) => ({ form: '8-K', filed, accession: '0001193125-26-389274', primaryDocument: 'orcl-20260831.htm', cik: '1341439', ...extra });
const snapshot = value => ({ observations: [{ source: 'sec', type: 'filings', ticker: 'ORCL', value }] });

test('creates a direct issuer filing link and archives after 30 days', () => {
  const now = new Date('2026-09-23T00:00:00Z');
  const current = filingEvents(snapshot([filing('2026-09-11')]), now);
  expect(current[0].url).toBe('https://www.sec.gov/Archives/edgar/data/1341439/000119312526389274/orcl-20260831.htm');
  expect(current[0].archived).toBe(false);
  expect(filingEvents(snapshot([filing('2026-08-24')]), now)[0].archived).toBe(true);
  expect(CURRENT_EVENT_DAYS).toBe(30);
});

test('omits filings without exact, safe document identifiers', () => {
  const now = new Date('2026-09-23T00:00:00Z');
  expect(filingEvents(snapshot([filing('2026-09-11', { cik: undefined }), filing('2026-09-11', { primaryDocument: '../wrong.htm' })]), now)).toEqual([]);
});
