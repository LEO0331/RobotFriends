const http = require('http');
const { URL } = require('url');
const config = require('./config');
const { createService } = require('./service');

const service = createService(config);
function send(response, status, payload) { response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' }); response.end(JSON.stringify(payload)); }
async function handler(request, response) {
  if (request.method === 'OPTIONS') { response.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' }); return response.end(); }
  const url = new URL(request.url, 'http://localhost'); const source = url.searchParams.get('source');
  try {
    if (request.method === 'GET' && url.pathname === '/api/health') return send(response, 200, { sources: await service.health(), supportedSources: service.sources() });
    if (request.method === 'GET' && url.pathname === '/api/observations') { const observations = await service.observations(); const ticker = url.searchParams.get('ticker'); const type = url.searchParams.get('type'); return send(response, 200, observations.filter(item => (!ticker || item.ticker === ticker.toUpperCase()) && (!type || item.type === type))); }
    if (request.method === 'POST' && url.pathname === '/api/ingest') { if (!source) return send(response, 400, { error: 'source query parameter is required', supportedSources: service.sources() }); return send(response, 200, await service.ingest(source, url.searchParams.get('force') === 'true')); }
    if (request.method === 'POST' && url.pathname === '/api/ingest/all') { const outcomes = await Promise.all(service.sources().map(item => service.ingest(item, url.searchParams.get('force') === 'true'))); return send(response, 200, { outcomes }); }
    return send(response, 404, { error: 'Not found' });
  } catch (error) { return send(response, 500, { error: error.message }); }
}
http.createServer(handler).listen(config.port, () => console.log(`Gridline API listening on http://localhost:${config.port}`));
