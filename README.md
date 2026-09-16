# Gridline — Data Center Infrastructure Intelligence

Account setup (Supabase Free): [English](docs/accounts.en.md) · [繁體中文](docs/accounts.zh-TW.md).

Gridline is a decision-support and research-validation dashboard that connects physical AI/data-center buildout, power constraints, regulatory events and market expectations. It is not an automated trading system or investment advice.

The public GitHub Pages build is a static demonstration. The same repository also includes a Node.js API profile with persistent historical storage, versioned scores, scenario-run persistence and point-in-time backtesting.

## Production-readiness capabilities

- **Auditable data provenance** — normalized observations carry deterministic IDs, provider metadata, observed/retrieved timestamps, confidence, original-source URLs when available and lineage.
- **Versioned scoring** — company scores are calculated by a domain service with methodology version, component contribution breakdown and point-in-time cutoff.
- **Persistent history** — the API stores observations, source health, score snapshots, scenario runs and backtest runs in SQLite/WAL. Historical observations are retained instead of overwritten.
- **Scenario Lab** — `#scenario` stress-tests power delivery, available power, demand, CAPEX and regulatory assumptions and explains their contribution to regime/company sensitivity.
- **Point-in-time backtesting** — `#backtest` evaluates only signals that were actually recorded, rejects future-dated lineage and leaves incomplete outcomes pending.
- **PR quality gate** — every pull request to `main` runs server/domain tests, frontend unit tests and a production build. A dependency audit is reported separately.

Detailed design notes: [data provenance](docs/data-provenance.md) · [scoring](docs/scoring-methodology.md) · [persistent storage](docs/persistent-storage.md) · [scenario analysis](docs/scenario-analysis.md) · [backtesting](docs/backtesting.md) · [PR CI](docs/pr-ci.md).

## Requirements

- Node.js **22+** for the API/storage profile (`node:sqlite`)
- npm with the committed lock file

## Run locally

```bash
npm ci
npm start
```

Open `http://localhost:3000/RobotFriends`.

## Run the ingestion/API profile

The React app and API intentionally run as separate processes during local development:

```bash
# Terminal 1
npm run api

# Terminal 2: configure provider settings, then refresh a source
set SEC_USER_AGENT=Gridline/0.1 research@example.com
npm run ingest -- sec
```

The API is served at `http://localhost:8787`; Create React App proxies `/api` requests there in development. See [API ingestion documentation](docs/api-ingestion.md) and [.env.example](.env.example) for provider-specific configuration.

Research endpoints include:

```text
GET  /api/health
GET  /api/observations
GET  /api/provenance?observationId=...
GET  /api/scores?ticker=NBIS
POST /api/scenario
GET  /api/scenario/runs
POST /api/backtest
GET  /api/backtest/runs
```

## Architecture

```text
SEC / EIA / PJM / FERC / company IR / prices
                    │
                    ▼
             source adapters
                    │
                    ▼
       normalized observations + provenance
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
 SQLite historical store    versioned scoring
        │                       │
        └───────────┬───────────┘
                    ▼
             research API
        ┌───────────┴───────────┐
        ▼                       ▼
 Scenario engine          point-in-time backtest
        │                       │
        └───────────┬───────────┘
                    ▼
                React UI
```

Key modules:

- `server/sources.js` — source adapters for SEC, EIA, PJM, Data.FERC.gov, official company IR feeds and daily price history.
- `server/provenance.js` — deterministic observation identity and audit metadata.
- `server/database.js` / `server/store.js` — SQLite schema, immutable historical observations and persisted research runs. `data/` is ignored by Git.
- `server/scoring/` — versioned, explainable company scoring.
- `server/scenario-engine.js` — deterministic infrastructure sensitivity analysis.
- `server/backtest.js` — point-in-time signal validation and look-ahead checks.
- `server/service.js` — caching, source health and isolated provider failures.
- `server/index.js` — HTTP API.
- `src/Containers/App.js` — core dashboard/evidence views.
- `src/ScenarioLab.js` and `src/BacktestLab.js` — research workflows.

The storage interface is deliberately narrow so a production deployment can replace SQLite with Postgres without changing scoring, scenario or backtest domain logic.

## Verification

```bash
npm run verify
```

Equivalent checks:

```bash
npm run test:api
npm run test:unit
npm run build
```

Provider credentials are never committed. A missing key, rate-limit response or provider failure is exposed as a `degraded` source-health state and is never represented as zero data.

## Static daily snapshot deployment

For the GitHub Pages demo, [.github/workflows/daily-snapshot.yml](.github/workflows/daily-snapshot.yml) runs at 22:00 UTC on weekdays (after the regular US market close in EST and EDT). It refreshes configured sources, calculates versioned score snapshots and writes `public/data/dashboard-snapshot.json`. GitHub Pages can therefore demonstrate the research UI without a continuously running public API.

Each source is tried up to three times with 1s and 2s backoff. A failure retains the last known-good records from the previously committed snapshot and records a degraded source-health state. Add provider secrets in the repository’s Actions secrets before enabling real ingestion.

The static snapshot and the API database serve different purposes: the JSON file is a portable public-demo artifact; SQLite is the persistent production-profile history used by provenance queries, scenario audit and point-in-time backtests.

## EIA data use and attribution

Where EIA observations appear, the dashboard identifies the **U.S. Energy Information Administration (EIA)** as the source and links to EIA Open Data. Gridline may transform or aggregate EIA observations for display, while source records retain their observation and retrieval timestamps. Gridline scores are not produced, endorsed or approved by EIA; no EIA logo is used. See the [EIA Open Data API](https://www.eia.gov/opendata/) and [Privacy and Security Policy](https://www.eia.gov/about/privacy_security_policy.php).

EIA API data in this project is limited to Gridline’s own research and decision-support dashboard. It is not forwarded to unrelated products, users or services. Keep EIA-derived observations, attribution and source timestamps with any displayed research result.

Traditional Chinese documentation: [README.zh-TW.md](README.zh-TW.md). Deployment runbook: [English](docs/static-snapshot-deployment.en.md) · [繁體中文](docs/static-snapshot-deployment.zh-TW.md).
