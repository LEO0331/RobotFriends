const http = require('http');
const { URL } = require('url');
const config = require('./config');
const { createService } = require('./service');
const { startScheduler } = require('./scheduler');

const service = createService(config);
function send(response, status, payload) { response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' }); response.end(JSON.stringify(payload)); }
async function handler(request, response) {
  if (request.method === 'OPTIONS') { response.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }); return response.end(); }
  const url = new URL(request.url, 'http://localhost'); const source = url.searchParams.get('source');
  try {
    if (request.method === 'GET' && url.pathname === '/api/health') return send(response, 200, { sources: await service.health(), supportedSources: service.sources(), storage: service.store.storage });
    if (request.method === 'GET' && url.pathname === '/api/observations') {
      const ticker = url.searchParams.get('ticker'); const type = url.searchParams.get('type'); const region = url.searchParams.get('region'); const observationSource = url.searchParams.get('source');
      return send(response, 200, await service.observations({ ticker: ticker?.toUpperCase(), type, region, source: observationSource }));
    }
    if (request.method === 'GET' && url.pathname === '/api/provenance') {
      const observationId = url.searchParams.get('observationId');
      if (!observationId) return send(response, 400, { error: 'observationId query parameter is required' });
      const record = await service.store.observationById(observationId);
      return record ? send(response, 200, record) : send(response, 404, { error: 'Observation not found' });
    }
    if (request.method === 'GET' && url.pathname === '/api/scores') {
      const ticker = url.searchParams.get('ticker');
      return send(response, 200, await service.store.scoreSnapshots({ ticker: ticker?.toUpperCase(), since: url.searchParams.get('since'), until: url.searchParams.get('until') }));
    }
    if (request.method === 'POST' && url.pathname === '/api/ingest') { if (!source) return send(response, 400, { error: 'source query parameter is required', supportedSources: service.sources() }); return send(response, 200, await service.ingest(source, url.searchParams.get('force') === 'true')); }
    if (request.method === 'POST' && url.pathname === '/api/ingest/all') { const outcomes = await Promise.all(service.sources().map(item => service.ingest(item, url.searchParams.get('force') === 'true'))); return send(response, 200, { outcomes }); }
    return send(response, 404, { error: 'Not found' });
  } catch (error) { return send(response, 500, { error: error.message }); }
}
http.createServer(handler).listen(config.port, () => {
  console.log(`Gridline API listening on http://localhost:${config.port}`);
  if (config.scheduleEnabled) startScheduler(service, config);
});
