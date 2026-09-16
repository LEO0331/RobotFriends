# Persistent historical storage

The production-style API profile uses the SQLite database at `data/gridline.sqlite` (Node.js 22 `node:sqlite`). The database directory remains git-ignored.

Tables:

- `observations` — immutable normalized external records keyed by deterministic observation ID;
- `source_health` — latest provider health state;
- `score_snapshots` — point-in-time, methodology-versioned company scores;
- `scenario_runs` — persisted sensitivity-analysis runs;
- `backtest_runs` — persisted validation runs;
- `schema_migrations` — storage schema version.

The store uses WAL mode and indexes observations by source/time and ticker/type/time. Re-ingesting an identical observation is idempotent; a new historical timestamp produces a new record rather than replacing prior history. Empty/degraded ingestion does not erase previously persisted observations.

## Static public-demo artifact

GitHub Pages does not expose this SQLite file. The scheduled exporter instead commits `public/data/dashboard-snapshot.json` as a portable read-only artifact.

The current schema-v4 snapshot includes:

- normalized observations and source health;
- current versioned scores;
- `companyHistory` with native recorded and labelled reconstructed rows;
- `backtestCoverage`;
- `demoReadiness` summary.

Successful sources replace the corresponding static-source rows; degraded sources retain last-known-good static observations. The daily workflow runs `npm run demo:check` before committing an updated public snapshot, so a structurally incomplete demo-critical artifact is not intentionally published.

In a long-running API deployment, SQLite is the source of persistent operational/research history. In the GitHub Pages profile, the committed schema-v4 JSON is the public presentation artifact. The storage interface remains intentionally narrow so SQLite can later be replaced by Postgres without changing scoring, scenario, backtest or HTTP domain contracts.
