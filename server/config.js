const path = require('path');

const root = path.resolve(__dirname, '..');
const parseJson = (value, fallback) => {
  try { return value ? JSON.parse(value) : fallback; } catch { return fallback; }
};

module.exports = {
  port: Number(process.env.PORT || 8787),
  dataDir: process.env.DATA_DIR || path.join(root, 'data'),
  tickers: (process.env.TICKERS || 'NBIS,CRWV,ORCL,AVGO').split(',').map(value => value.trim().toUpperCase()).filter(Boolean),
  secUserAgent: process.env.SEC_USER_AGENT || '',
  eiaKey: process.env.EIA_API_KEY || '',
  pjmKey: process.env.PJM_API_KEY || '',
  fercKey: process.env.FERC_API_KEY || '',
  companyIrFeeds: parseJson(process.env.COMPANY_IR_FEEDS, {}),
  priceBaseUrl: process.env.PRICE_BASE_URL || 'https://stooq.com/q/d/l/',
  cacheMinutes: Number(process.env.CACHE_MINUTES || 60),
};
