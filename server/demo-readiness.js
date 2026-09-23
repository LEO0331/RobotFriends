const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_TICKERS = ['NBIS', 'CRWV', 'ORCL', 'AVGO'];
const MIN_PRICE_ROWS = 60;
const MAX_PRICE_STALENESS_DAYS = 10;

function validDate(value) {
  return Number.isFinite(Date.parse(value));
}

function priceRows(snapshot, ticker) {
  return (snapshot?.observations || [])
    .filter(item => item.source === 'prices' && item.type === 'close' && item.ticker === ticker && Number.isFinite(Number(item.value)) && validDate(item.observedAt))
    .sort((a, b) => Date.parse(a.observedAt) - Date.parse(b.observedAt));
}

function check(id, severity, ok, message, detail = null) {
  return { id, severity, ok: Boolean(ok), message, detail };
}

function evaluateDemoReadiness(snapshot, {
  tickers = DEFAULT_TICKERS,
  now = snapshot?.generatedAt || new Date().toISOString(),
  minPriceRows = MIN_PRICE_ROWS,
  maxPriceStalenessDays = MAX_PRICE_STALENESS_DAYS,
} = {}) {
  const checks = [];
  const generatedAt = validDate(snapshot?.generatedAt) ? snapshot.generatedAt : null;
  checks.push(check('schema-v4', 'blocker', Number(snapshot?.schemaVersion) >= 4, 'Static snapshot uses schemaVersion 4 or newer.', { actual: snapshot?.schemaVersion ?? null }));
  checks.push(check('generated-at', 'blocker', Boolean(generatedAt), 'Snapshot has a valid generatedAt timestamp.', { actual: snapshot?.generatedAt ?? null }));
  checks.push(check('observations-array', 'blocker', Array.isArray(snapshot?.observations), 'Snapshot contains an observations array.'));
  checks.push(check('history-array', 'blocker', Array.isArray(snapshot?.companyHistory), 'Snapshot contains companyHistory.'));
  checks.push(check('backtest-coverage', 'blocker', Boolean(snapshot?.backtestCoverage && typeof snapshot.backtestCoverage === 'object'), 'Snapshot contains backtestCoverage.'));
  checks.push(check('methodology-version', 'blocker', Boolean(snapshot?.methodologies?.companyScore), 'Snapshot identifies the company-score methodology version.', { actual: snapshot?.methodologies?.companyScore ?? null }));

  const reference = validDate(now) ? Date.parse(now) : Date.now();
  const coverage = {};
  for (const ticker of tickers) {
    const rows = priceRows(snapshot, ticker);
    const latest = rows[rows.length - 1] || null;
    const earliest = rows[0] || null;
    const stalenessDays = latest ? Math.max(0, (reference - Date.parse(latest.observedAt)) / DAY_MS) : null;
    coverage[ticker] = {
      count: rows.length,
      earliest: earliest?.observedAt || null,
      latest: latest?.observedAt || null,
      provider: latest?.provenance?.provider || latest?.providerName || null,
      stalenessDays: stalenessDays === null ? null : Math.round(stalenessDays * 10) / 10,
    };
    checks.push(check(
      `prices-${ticker}`,
      'blocker',
      rows.length >= minPriceRows && stalenessDays !== null && stalenessDays <= maxPriceStalenessDays,
      `${ticker} has at least ${minPriceRows} usable, recent daily price observations.`,
      coverage[ticker],
    ));
  }

  for (const [source, health] of Object.entries(snapshot?.sourceHealth || {})) {
    if (health?.status === 'ok') {
      checks.push(check(
        `healthy-source-${source}`,
        'blocker',
        source === 'events' || Number(health.recordCount ?? 1) > 0,
        source === 'events' ? 'An empty verified event feed is allowed.' : `${source} is not labelled healthy with zero records.`,
        { status: health.status, recordCount: health.recordCount ?? null },
      ));
    } else if (health?.status === 'degraded') {
      checks.push(check(
        `degraded-source-${source}`,
        'warning',
        false,
        `${source} is degraded; the demo should disclose last-known-good or unavailable data.`,
        { message: health.message || null },
      ));
    }
  }

  const ageHours = generatedAt ? Math.max(0, (Date.now() - Date.parse(generatedAt)) / (60 * 60 * 1000)) : null;
  checks.push(check(
    'snapshot-age',
    'warning',
    ageHours !== null && ageHours <= 96,
    'Snapshot is no more than 96 hours old (weekday schedule allows weekend gaps).',
    { ageHours: ageHours === null ? null : Math.round(ageHours * 10) / 10 },
  ));

  const blockers = checks.filter(item => item.severity === 'blocker' && !item.ok);
  const warnings = checks.filter(item => item.severity === 'warning' && !item.ok);
  return {
    status: blockers.length ? 'blocked' : warnings.length ? 'ready-with-warnings' : 'ready',
    ready: blockers.length === 0,
    blockerCount: blockers.length,
    warningCount: warnings.length,
    checks,
    priceCoverage: coverage,
  };
}

module.exports = {
  DEFAULT_TICKERS,
  MIN_PRICE_ROWS,
  MAX_PRICE_STALENESS_DAYS,
  evaluateDemoReadiness,
  priceRows,
};
