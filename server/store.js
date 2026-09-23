const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { openDatabase } = require('./database');

function safeName(value) { return String(value).replace(/[^a-z0-9_.-]/gi, '_'); }
async function ensure(dir) { await fs.mkdir(dir, { recursive: true }); }
async function writeJson(file, data) { await ensure(path.dirname(file)); await fs.writeFile(file, JSON.stringify(data, null, 2)); }
const parse = value => { try { return JSON.parse(value); } catch { return null; } };
const runId = prefix => `${prefix}_${crypto.randomUUID()}`;

function fallbackObservationId(source, item) {
  return `legacy_${crypto.createHash('sha256').update(JSON.stringify([source, item.type, item.ticker, item.region, item.observedAt, item.value])).digest('hex').slice(0, 24)}`;
}

function createStore(dataDir) {
  const { db, file, schemaVersion } = openDatabase(dataDir);
  const insertObservation = db.prepare(`
    INSERT INTO observations(id, source, type, ticker, region, observed_at, retrieved_at, confidence, value_json, provenance_json, record_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      retrieved_at = excluded.retrieved_at,
      confidence = excluded.confidence,
      provenance_json = excluded.provenance_json,
      record_json = excluded.record_json
  `);
  const upsertHealth = db.prepare(`
    INSERT INTO source_health(source, status, last_success_at, cache_minutes, record_count, message, checked_at, record_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(source) DO UPDATE SET
      status = excluded.status,
      last_success_at = excluded.last_success_at,
      cache_minutes = excluded.cache_minutes,
      record_count = excluded.record_count,
      message = excluded.message,
      checked_at = excluded.checked_at,
      record_json = excluded.record_json
  `);
  const upsertScore = db.prepare(`
    INSERT INTO score_snapshots(id, ticker, as_of, methodology_version, calculated_at, payload_json)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(ticker, as_of, methodology_version) DO UPDATE SET
      calculated_at = excluded.calculated_at,
      payload_json = excluded.payload_json
  `);

  return {
    storage: { engine: 'sqlite', file, schemaVersion },
    async cacheFresh(source) {
      const row = db.prepare('SELECT record_json FROM source_health WHERE source = ?').get(source);
      const record = row ? parse(row.record_json) : null;
      return Boolean(record && record.status === 'ok' && record.lastSuccessAt && Date.now() - Date.parse(record.lastSuccessAt) < Number(record.cacheMinutes || 0) * 60000);
    },
    async saveRaw(source, payload) {
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const rawFile = path.join(dataDir, 'bronze', safeName(source), `${stamp}.json`);
      await writeJson(rawFile, { retrievedAt: new Date().toISOString(), source, payload });
      return rawFile;
    },
    async saveObservations(source, observations) {
      const now = new Date().toISOString();
      db.exec('BEGIN');
      try {
        for (const item of observations || []) {
          const id = item.id || item.observationId || fallbackObservationId(source, item);
          const observedAt = item.observedAt || item.periodEnd || item.retrievedAt || now;
          const retrievedAt = item.retrievedAt || now;
          insertObservation.run(
            id,
            item.source || source,
            item.type || null,
            item.ticker || null,
            item.region || null,
            observedAt,
            retrievedAt,
            Number.isFinite(Number(item.confidence)) ? Number(item.confidence) : null,
            JSON.stringify(item.value ?? null),
            JSON.stringify(item.provenance || null),
            JSON.stringify({ ...item, id, observedAt, retrievedAt }),
            now
          );
        }
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
    async observations(filters = {}) {
      const where = [];
      const args = [];
      for (const [field, column] of [['source', 'source'], ['ticker', 'ticker'], ['type', 'type'], ['region', 'region']]) {
        if (filters[field]) { where.push(`${column} = ?`); args.push(filters[field]); }
      }
      if (filters.since) { where.push('observed_at >= ?'); args.push(filters.since); }
      if (filters.until) { where.push('observed_at <= ?'); args.push(filters.until); }
      const pagination = Number.isInteger(filters.limit) ? ' LIMIT ? OFFSET ?' : '';
      if (pagination) { args.push(filters.limit, filters.offset || 0); }
      const sql = `SELECT record_json FROM observations${where.length ? ` WHERE ${where.join(' AND ')}` : ''} ORDER BY observed_at ASC, id ASC${pagination}`;
      return db.prepare(sql).all(...args).map(row => parse(row.record_json)).filter(Boolean);
    },
    async observationById(id) {
      const row = db.prepare('SELECT record_json FROM observations WHERE id = ?').get(id);
      return row ? parse(row.record_json) : null;
    },
    async recordHealth(source, result) {
      const checkedAt = new Date().toISOString();
      const record = { ...result, checkedAt };
      upsertHealth.run(source, record.status || 'unknown', record.lastSuccessAt || null, Number(record.cacheMinutes || 0), Number(record.recordCount || 0), record.message || null, checkedAt, JSON.stringify(record));
    },
    async health() {
      const rows = db.prepare('SELECT source, record_json FROM source_health ORDER BY source').all();
      return Object.fromEntries(rows.map(row => [row.source, parse(row.record_json)]));
    },
    async saveScoreSnapshots(scores) {
      for (const score of scores || []) {
        const asOf = score.asOf || score.calculatedAt || new Date().toISOString();
        const version = score.methodologyVersion || 'unknown';
        const id = `score:${score.ticker}:${asOf}:${version}`;
        upsertScore.run(id, score.ticker, asOf, version, score.calculatedAt || new Date().toISOString(), JSON.stringify(score));
      }
    },
    async scoreSnapshots(filters = {}) {
      const where = [];
      const args = [];
      if (filters.ticker) { where.push('ticker = ?'); args.push(filters.ticker); }
      if (filters.methodologyVersion) { where.push('methodology_version = ?'); args.push(filters.methodologyVersion); }
      if (filters.since) { where.push('as_of >= ?'); args.push(filters.since); }
      if (filters.until) { where.push('as_of <= ?'); args.push(filters.until); }
      const pagination = Number.isInteger(filters.limit) ? ' LIMIT ? OFFSET ?' : '';
      if (pagination) { args.push(filters.limit, filters.offset || 0); }
      const sql = `SELECT payload_json FROM score_snapshots${where.length ? ` WHERE ${where.join(' AND ')}` : ''} ORDER BY as_of ASC${pagination}`;
      return db.prepare(sql).all(...args).map(row => parse(row.payload_json)).filter(Boolean);
    },
    async saveScenarioRun(input, output, methodologyVersion) {
      const id = runId('scenario');
      const createdAt = new Date().toISOString();
      db.prepare('INSERT INTO scenario_runs(id, created_at, methodology_version, input_json, output_json) VALUES (?, ?, ?, ?, ?)').run(id, createdAt, methodologyVersion, JSON.stringify(input), JSON.stringify(output));
      return { id, createdAt };
    },
    async scenarioRuns(limit = 20, methodologyVersion = null) {
      const safeLimit = Math.max(1, Math.min(100, Number(limit) || 20));
      const query = `SELECT id, created_at, methodology_version, input_json, output_json FROM scenario_runs${methodologyVersion ? ' WHERE methodology_version = ?' : ''} ORDER BY created_at DESC LIMIT ?`;
      const args = methodologyVersion ? [methodologyVersion, safeLimit] : [safeLimit];
      return db.prepare(query).all(...args).map(row => ({ id: row.id, createdAt: row.created_at, methodologyVersion: row.methodology_version, input: parse(row.input_json), output: parse(row.output_json) }));
    },
    async saveBacktestRun(input, output, methodologyVersion) {
      const id = runId('backtest');
      const createdAt = new Date().toISOString();
      db.prepare('INSERT INTO backtest_runs(id, created_at, methodology_version, input_json, output_json) VALUES (?, ?, ?, ?, ?)').run(id, createdAt, methodologyVersion, JSON.stringify(input), JSON.stringify(output));
      return { id, createdAt };
    },
    async backtestRuns(limit = 20, methodologyVersion = null) {
      const safeLimit = Math.max(1, Math.min(100, Number(limit) || 20));
      const query = `SELECT id, created_at, methodology_version, input_json, output_json FROM backtest_runs${methodologyVersion ? ' WHERE methodology_version = ?' : ''} ORDER BY created_at DESC LIMIT ?`;
      const args = methodologyVersion ? [methodologyVersion, safeLimit] : [safeLimit];
      return db.prepare(query).all(...args).map(row => ({ id: row.id, createdAt: row.created_at, methodologyVersion: row.methodology_version, input: parse(row.input_json), output: parse(row.output_json) }));
    },
    close() { db.close(); },
  };
}
module.exports = { createStore };
