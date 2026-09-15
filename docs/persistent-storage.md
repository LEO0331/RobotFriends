# Persistent historical storage

The production API uses the SQLite database at `data/gridline.sqlite` (Node.js 22 `node:sqlite`). The database directory remains git-ignored.

Tables:

- `observations` — immutable normalized external records keyed by deterministic observation ID
- `source_health` — last provider health state
- `score_snapshots` — point-in-time, methodology-versioned company scores
- `scenario_runs` — persisted sensitivity-analysis runs
- `backtest_runs` — persisted validation runs
- `schema_migrations` — storage schema version

The store uses WAL mode and indexes observations by source/time and ticker/type/time. Re-ingesting an identical observation is idempotent; a new historical timestamp produces a new record rather than replacing prior history.

The GitHub Pages build still exports a static JSON snapshot for the public demo. In a long-running API deployment, SQLite is the source of historical persistence. The storage interface is intentionally narrow so SQLite can later be replaced by Postgres without changing the scoring or HTTP layers.
