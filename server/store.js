const fs = require('fs/promises');
const path = require('path');

function safeName(value) { return String(value).replace(/[^a-z0-9_.-]/gi, '_'); }
async function ensure(dir) { await fs.mkdir(dir, { recursive: true }); }
async function writeJson(file, data) { await ensure(path.dirname(file)); await fs.writeFile(file, JSON.stringify(data, null, 2)); }
async function readJson(file, fallback) { try { return JSON.parse(await fs.readFile(file, 'utf8')); } catch (error) { if (error.code === 'ENOENT') return fallback; throw error; } }
function createStore(dataDir) {
  const silverFile = path.join(dataDir, 'silver', 'observations.json');
  const healthFile = path.join(dataDir, 'gold', 'source-health.json');
  return {
    async cacheFresh(source) {
      const health = await readJson(healthFile, {}); const record = health[source];
      return record && record.status === 'ok' && Date.now() - Date.parse(record.lastSuccessAt) < record.cacheMinutes * 60000;
    },
    async saveRaw(source, payload) {
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const file = path.join(dataDir, 'bronze', safeName(source), `${stamp}.json`);
      await writeJson(file, { retrievedAt: new Date().toISOString(), source, payload });
      return file;
    },
    async saveObservations(source, observations) {
      const current = await readJson(silverFile, []); const retained = current.filter(item => item.source !== source);
      await writeJson(silverFile, [...retained, ...observations]);
    },
    async observations() { return readJson(silverFile, []); },
    async recordHealth(source, result) {
      const current = await readJson(healthFile, {});
      current[source] = { ...result, checkedAt: new Date().toISOString() };
      await writeJson(healthFile, current);
    },
    async health() { return readJson(healthFile, {}); },
  };
}
module.exports = { createStore };
