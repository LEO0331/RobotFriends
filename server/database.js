const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const SCHEMA_VERSION = 1;

function openDatabase(dataDir, filename = 'gridline.sqlite') {
  fs.mkdirSync(dataDir, { recursive: true });
  const file = path.join(dataDir, filename);
  const db = new DatabaseSync(file);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS observations (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      type TEXT,
      ticker TEXT,
      region TEXT,
      observed_at TEXT NOT NULL,
      retrieved_at TEXT NOT NULL,
      confidence REAL,
      value_json TEXT,
      provenance_json TEXT,
      record_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_observations_source_time ON observations(source, observed_at);
    CREATE INDEX IF NOT EXISTS idx_observations_ticker_type_time ON observations(ticker, type, observed_at);
    CREATE TABLE IF NOT EXISTS source_health (
      source TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      last_success_at TEXT,
      cache_minutes INTEGER,
      record_count INTEGER,
      message TEXT,
      checked_at TEXT NOT NULL,
      record_json TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS score_snapshots (
      id TEXT PRIMARY KEY,
      ticker TEXT NOT NULL,
      as_of TEXT NOT NULL,
      methodology_version TEXT NOT NULL,
      calculated_at TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      UNIQUE(ticker, as_of, methodology_version)
    );
    CREATE INDEX IF NOT EXISTS idx_score_ticker_time ON score_snapshots(ticker, as_of);
    CREATE TABLE IF NOT EXISTS scenario_runs (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      methodology_version TEXT NOT NULL,
      input_json TEXT NOT NULL,
      output_json TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS backtest_runs (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      methodology_version TEXT NOT NULL,
      input_json TEXT NOT NULL,
      output_json TEXT NOT NULL
    );
  `);
  db.prepare('INSERT OR IGNORE INTO schema_migrations(version, applied_at) VALUES (?, ?)').run(SCHEMA_VERSION, new Date().toISOString());
  return { db, file, schemaVersion: SCHEMA_VERSION };
}

module.exports = { openDatabase, SCHEMA_VERSION };
