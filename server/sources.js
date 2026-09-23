const { getJson, getText } = require('./http');
const { fetchTickerHistory } = require('./price-history');
const { ingestEvents } = require('./event-ingestion');

const SEC_TICKERS = 'https://www.sec.gov/files/company_tickers.json';
const SEC_SUBMISSIONS = cik => `https://data.sec.gov/submissions/CIK${String(cik).padStart(10, '0')}.json`;
const SEC_FACTS = cik => `https://data.sec.gov/api/xbrl/companyfacts/CIK${String(cik).padStart(10, '0')}.json`;
const now = () => new Date().toISOString();
const observation = (source, type, value, extra = {}) => ({ id: `${source}:${type}:${extra.ticker || extra.region || 'all'}`, source, type, value, observedAt: extra.observedAt || now(), retrievedAt: now(), confidence: extra.confidence || 0.9, ...extra });
const latestFact = (facts, name) => {
  const units = facts?.facts?.['us-gaap']?.[name]?.units || {}; const entries = Object.values(units).flat();
  return entries.filter(item => item.form === '10-K' || item.form === '10-Q').sort((a, b) => String(b.filed).localeCompare(String(a.filed)))[0];
};

async function ingestSec(config) {
  if (!config.secUserAgent) throw new Error('SEC_USER_AGENT is required for SEC requests.');
  const headers = { 'User-Agent': config.secUserAgent, 'Accept-Encoding': 'gzip, deflate' };
  const directory = await getJson(SEC_TICKERS, headers); const matches = Object.values(directory).filter(item => config.tickers.includes(item.ticker));
  const payload = []; const observations = [];
  for (const company of matches) {
    const [submissions, facts] = await Promise.all([getJson(SEC_SUBMISSIONS(company.cik_str, headers), headers), getJson(SEC_FACTS(company.cik_str), headers)]);
    payload.push({ ticker: company.ticker, submissions, facts });
    const filings = submissions.filings?.recent || {}; const forms = (filings.form || []).map((form, index) => ({ form, filed: filings.filingDate[index], accession: filings.accessionNumber[index], primaryDocument: filings.primaryDocument[index] })).filter(item => ['10-K', '10-Q', '8-K'].includes(item.form)).slice(0, 12);
    observations.push(observation('sec', 'filings', forms, { ticker: company.ticker, confidence: 1 }));
    for (const [factName, label] of [['Revenues', 'revenue'], ['PaymentsToAcquirePropertyPlantAndEquipment', 'capex'], ['LongTermDebtCurrent', 'currentDebt'], ['LongTermDebtNoncurrent', 'longTermDebt']]) {
      const fact = latestFact(facts, factName); if (fact) observations.push(observation('sec', label, Number(fact.val), { ticker: company.ticker, unit: fact.unit, periodEnd: fact.end, filedAt: fact.filed, form: fact.form, confidence: 1 }));
    }
  }
  return { payload, observations, message: `${matches.length} tracked issuers ingested` };
}
async function ingestEia(config) {
  if (!config.eiaKey) throw new Error('EIA_API_KEY is not configured.');
  const url = `https://api.eia.gov/v2/electricity/rto/region-data/data/?api_key=${encodeURIComponent(config.eiaKey)}&frequency=hourly&data[0]=value&facets[respondent][]=PJM&length=24&sort[0][column]=period&sort[0][direction]=desc`;
  const payload = await getJson(url); const rows = payload.response?.data || [];
  return { payload, observations: rows.map(row => observation('eia', 'rtoLoad', Number(row.value), { region: row.respondent || 'PJM', unit: row['value-units'], observedAt: row.period, confidence: 1 })), message: `${rows.length} EIA records ingested` };
}
async function ingestPjm(config) {
  if (!config.pjmKey) throw new Error('PJM_API_KEY is not configured.');
  const url = `https://api.pjm.com/api/v1/gen_by_fuel?rowCount=48&startRow=1&subscription-key=${encodeURIComponent(config.pjmKey)}`;
  const payload = await getJson(url); const rows = payload.items || [];
  return { payload, observations: rows.map(row => observation('pjm', 'generationByFuel', Number(row.mw || row.generation_mw || 0), { region: 'PJM', fuel: row.fuel_type || row.fuel, observedAt: row.datetime_beginning_utc || now(), confidence: 1 })), message: `${rows.length} PJM records ingested` };
}
async function ingestFerc(config) {
  if (!config.fercKey) throw new Error('FERC_API_KEY is not configured.');
  const payload = await getJson('https://api.data.ferc.gov/v1/dataset/0/details/', { 'X-Api-Key': config.fercKey });
  return { payload, observations: [observation('ferc', 'datasetCatalog', { retrieved: true }, { confidence: 1 })], message: 'FERC dataset catalog ingested; configure a selected dataset connector next.' };
}
async function ingestIr(config) {
  const feeds = Object.entries(config.companyIrFeeds); if (!feeds.length) throw new Error('COMPANY_IR_FEEDS has no configured official feed URLs.');
  const payload = []; const observations = [];
  for (const [ticker, url] of feeds) { const text = await getText(url, { 'User-Agent': config.secUserAgent || 'Gridline research client' }); payload.push({ ticker, url, text }); observations.push(observation('company-ir', 'officialFeed', { url }, { ticker, confidence: 0.85 })); }
  return { payload, observations, message: `${feeds.length} official IR feeds ingested` };
}
async function ingestPrices(config) {
  const payload = [];
  const observations = [];
  const providerCounts = new Map();
  const tickers = config.tickers || [];
  if (!tickers.length) throw new Error('No tracked tickers are configured for price ingestion.');

  for (const ticker of tickers) {
    const history = await fetchTickerHistory({
      ticker,
      priceBaseUrl: config.priceBaseUrl,
      priceFallbackBaseUrl: config.priceFallbackBaseUrl,
      getText,
      getJson,
    });
    const rows = history.rows.slice(-260);
    payload.push({ ticker, provider: history.provider, providerUrl: history.providerUrl, rows });
    providerCounts.set(history.provider, (providerCounts.get(history.provider) || 0) + 1);
    rows.forEach(row => observations.push(observation('prices', 'close', row.close, {
      ticker,
      currency: 'USD',
      observedAt: `${row.date}T00:00:00.000Z`,
      confidence: history.provider === 'Stooq' ? 0.7 : 0.68,
      providerName: history.provider,
      sourceUrl: history.providerUrl,
    })));
  }

  const coveredTickers = new Set(observations.map(item => item.ticker));
  const missing = tickers.filter(ticker => !coveredTickers.has(ticker));
  if (missing.length) throw new Error(`Incomplete price coverage; missing usable history for ${missing.join(', ')}.`);
  const providers = [...providerCounts.entries()].map(([provider, count]) => `${provider}:${count}`).join(', ');
  return {
    payload,
    observations,
    message: `${observations.length} daily price observations ingested across ${coveredTickers.size}/${tickers.length} tickers (${providers})`,
  };
}
module.exports = { sec: ingestSec, eia: ingestEia, pjm: ingestPjm, ferc: ingestFerc, 'company-ir': ingestIr, prices: ingestPrices, events: ingestEvents };
