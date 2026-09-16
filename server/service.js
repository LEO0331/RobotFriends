const { createStore } = require('./store');
const adapters = require('./sources');
const { normalizeObservations } = require('./provenance');

function createService(config) {
  const store = createStore(config.dataDir);
  async function ingest(source, force = false) {
    if (!adapters[source]) throw new Error(`Unsupported source '${source}'.`);
    if (!force && await store.cacheFresh(source)) return { source, status: 'cached', message: 'Fresh cached data retained.' };
    try {
      const result = await adapters[source](config);
      await store.saveRaw(source, result.payload);
      const observations = normalizeObservations(source, result.observations);
      if (!observations.length) {
        throw new Error(`${source} returned zero usable observations; last-known-good data retained.`);
      }
      await store.saveObservations(source, observations);
      await store.recordHealth(source, { status: 'ok', lastSuccessAt: new Date().toISOString(), cacheMinutes: config.cacheMinutes, recordCount: observations.length, message: result.message });
      return { source, status: 'ok', recordCount: observations.length, message: result.message };
    } catch (error) {
      await store.recordHealth(source, { status: 'degraded', cacheMinutes: config.cacheMinutes, message: error.message });
      return { source, status: 'degraded', message: error.message };
    }
  }
  return {
    ingest,
    health: () => store.health(),
    observations: (...args) => store.observations(...args),
    sources: () => Object.keys(adapters),
    store,
  };
}
module.exports = { createService };
