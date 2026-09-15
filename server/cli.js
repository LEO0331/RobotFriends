const config = require('./config');
const { createService } = require('./service');
const [command, source = 'all'] = process.argv.slice(2); const service = createService(config);
if (command !== 'ingest') { console.error('Usage: npm run ingest -- [source|all]'); process.exit(1); }
(async () => { const sources = source === 'all' ? service.sources() : [source]; const outcomes = []; for (const item of sources) outcomes.push(await service.ingest(item, true)); console.log(JSON.stringify({ outcomes }, null, 2)); process.exit(outcomes.some(item => item.status === 'degraded') ? 2 : 0); })();
