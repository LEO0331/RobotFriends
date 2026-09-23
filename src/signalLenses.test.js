import { signalLens } from './signalLenses';

test('execution lens withholds stale or generic SEC facts', () => {
  const snapshot = { generatedAt: '2026-09-23T00:00:00Z', observations: [{ source: 'sec', type: 'revenue', ticker: 'ORCL', value: 100, periodEnd: '2024-05-31', filedAt: '2026-09-11', sourceUrl: 'https://www.sec.gov/edgar/search/' }] };
  expect(signalLens(snapshot, 'ORCL', 'execution').available).toBe(false);
});

test('execution lens names a recent exact-source EPS disclosure without inferring growth', () => {
  const snapshot = { generatedAt: '2026-09-23T00:00:00Z', observations: [{ source: 'sec', type: 'dilutedEps', ticker: 'ORCL', value: 1.56, unit: 'USD/shares', periodEnd: '2026-08-31', filedAt: '2026-09-11', form: '10-Q', sourceUrl: 'https://www.sec.gov/Archives/edgar/data/1341439/filing.htm' }] };
  const result = signalLens(snapshot, 'ORCL', 'execution');
  expect(result.label).toBe('Diluted EPS disclosed');
  expect(result.method).toContain('not an earnings-growth verdict');
});

test('execution lens uses matched quarterly EPS periods for a direction, not an invented score', () => {
  const current = { source: 'sec', type: 'dilutedEps', ticker: 'ORCL', value: 1.56, unit: 'USD/shares', periodStart: '2026-06-01', periodEnd: '2026-08-31', filedAt: '2026-09-11', form: '10-Q', sourceUrl: 'https://www.sec.gov/Archives/edgar/data/1341439/current.htm' };
  const prior = { ...current, type: 'dilutedEpsPrior', value: 1.12, periodStart: '2025-06-01', periodEnd: '2025-08-31', filedAt: '2025-09-11', sourceUrl: 'https://www.sec.gov/Archives/edgar/data/1341439/prior.htm' };
  const result = signalLens({ generatedAt: '2026-09-23T00:00:00Z', observations: [current, prior] }, 'ORCL', 'execution');
  expect(result.label).toContain('increased');
  expect(result.additionalSourceUrl).toBe(prior.sourceUrl);
  expect(result.method).toContain('Matched');
});

test('grid lens cannot misrepresent untyped historical EIA rows', () => {
  const snapshot = { generatedAt: '2026-09-23T00:00:00Z', observations: [{ source: 'eia', type: 'rtoLoad', value: 90000 }] };
  expect(signalLens(snapshot, 'NBIS', 'grid').available).toBe(false);
});

test('grid lens compares only complete typed PJM days one week apart', () => {
  const rows = [1, 8].flatMap(day => Array.from({ length: 24 }, (_, hour) => ({
    source: 'eia', type: 'rtoDemandActual', dataType: 'D', unit: 'megawatthours', region: 'PJM', value: day === 8 ? 110 : 100,
    observedAt: `2026-09-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:00:00Z`,
    sourceUrl: 'https://api.eia.gov/v2/electricity/rto/region-data/data/',
  })));
  expect(signalLens({ generatedAt: '2026-09-09T00:00:00Z', observations: rows }, 'NBIS', 'grid').label).toBe('PJM actual demand above prior week');
  expect(signalLens({ generatedAt: '2026-09-09T00:00:00Z', observations: rows.slice(1) }, 'NBIS', 'grid').available).toBe(false);
});
