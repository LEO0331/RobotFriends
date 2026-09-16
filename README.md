# Gridline — Data Center Infrastructure Intelligence

Gridline is a bilingual decision-support and research-validation dashboard that connects physical AI/data-center buildout, power constraints, regulatory events and market expectations. It is a **production-style research-platform demo**: not an automated trading system, not a production market-data terminal, and not investment advice.

Public demo: `https://leo0331.github.io/RobotFriends/`

Demo readiness: [English](docs/demo-readiness.en.md) · [繁體中文](docs/demo-readiness.zh-TW.md)  
Account setup (optional Supabase): [English](docs/accounts.en.md) · [繁體中文](docs/accounts.zh-TW.md)

## What the demo demonstrates

- **Infrastructure intelligence** — national and selected-region data-center buildout views for Arizona, Texas, Ohio/PJM and Northern Virginia.
- **Period-aware company exposure** — 30D / 90D / 1Y market lookbacks with explicit insufficient-history states rather than fabricated values.
- **Auditable provenance** — deterministic observation IDs, provider/source metadata, `observedAt` vs `retrievedAt`, confidence, origin URLs and lineage.
- **Versioned scoring** — explainable company scores with methodology version, component contributions and a point-in-time cutoff.
- **Persistent history** — the Node API profile stores immutable observations, source health, score snapshots, scenario runs and backtest runs in SQLite/WAL.
- **Scenario Lab** — deterministic sensitivity analysis for power delivery, available power, demand, CAPEX and regulatory assumptions.
- **Point-in-time Validation** — Recorded vs Reconstructed signals, 30D / 90D forward outcomes, pending windows and no-look-ahead controls.
- **Data Health** — `#health` exposes the exact public snapshot's freshness, provider degradation, price coverage, methodology and reconstruction coverage.
- **Fail-closed ingestion** — empty/invalid provider responses are degraded, not successful; last-known-good history is retained.
- **Bilingual research UX** — core Research Lab workflows support English and Traditional Chinese.
- **Optional accounts** — Supabase signup/signin/recovery/preferences are implemented in the React project but do not block the public research demo.
- **Engineering quality gates** — PR tests/build/audit, static-snapshot acceptance checks, GitHub Pages deployment and Lighthouse CI.

Detailed design notes: [provenance](docs/data-provenance.md) · [scoring](docs/scoring-methodology.md) · [storage](docs/persistent-storage.md) · [scenario analysis](docs/scenario-analysis.md) · [backtesting](docs/backtesting.md) · [CI](docs/pr-ci.md).

## Requirements

- Node.js **22+** (`node:sqlite` is used by the API/storage profile)
- npm using the committed `package-lock.json`

## Quick start

```bash
npm ci
npm run dev
```

`npm run dev` starts both:

- React UI: `http://localhost:3000/RobotFriends`
- Research API: `http://localhost:8787`

Use `Ctrl+C` to stop both processes. For UI-only development, use `npm start`. For API-only development, use `npm run api`.

Provider configuration is documented in [.env.example](.env.example) and the [ingestion guide](docs/api-ingestion.md).

## Architecture

```text
 SEC / EIA / PJM / FERC / official IR / market prices
                         │
                         ▼
                  source adapters
                         │
            validate + fail closed
                         │
                         ▼
          normalized observations + provenance
                         │
             ┌───────────┴───────────┐
             ▼                       ▼
       SQLite/WAL history       versioned scoring
             │                       │
             └───────────┬───────────┘
                         ▼
                    research API
              ┌──────────┼──────────┐
              ▼          ▼          ▼
        Scenario Lab  Backtest   audit queries
                         │
                         ▼
                     React UI

GitHub Pages profile:
provider refresh → schema-v4 snapshot → demo readiness gate
                → commit to main → Pages build/deploy → Lighthouse CI
```

Key modules:

- `server/sources.js` — SEC, EIA, PJM, FERC, official company IR and market-price adapters.
- `server/price-history.js` — validated Stooq history plus Yahoo Finance demo fallback.
- `server/service.js` — cache/source health and zero-row fail-closed behavior.
- `server/provenance.js` — deterministic observation identity and audit metadata.
- `server/database.js` / `server/store.js` — SQLite schema and persistent research history.
- `server/scoring/` — versioned/explainable company scoring.
- `server/scenario-engine.js` — deterministic infrastructure sensitivity model.
- `server/backtest.js` / `src/backtestModel.js` — point-in-time validation.
- `server/historical-reconstruction.js` — explicitly labelled demo reconstruction with historical cutoffs.
- `server/demo-readiness.js` — public-snapshot acceptance criteria.
- `src/DataHealth.js` — operational/demo-readiness workspace.
- `src/ScenarioLab.js` / `src/BacktestLab.js` — research workflows.

The storage interface is deliberately narrow so SQLite can be replaced by Postgres in a production deployment without rewriting the scoring/scenario/backtest domain logic.

## Research API

The API is local-only by default (`127.0.0.1`). If deliberately exposed on a network, configure `HOST`, `ALLOWED_ORIGINS` and a long random `API_WRITE_TOKEN`; state-changing requests outside loopback require the bearer token. Never put that token in the static React build.

Selected endpoints:

```text
GET  /api/health
GET  /api/observations
GET  /api/provenance?observationId=...
GET  /api/scores?ticker=NBIS
POST /api/ingest?source=prices
POST /api/scenario
GET  /api/scenario/runs
POST /api/backtest
GET  /api/backtest/runs
```

See [docs/api-ingestion.md](docs/api-ingestion.md).

## Market-price ingestion

The public demo attempts Stooq first. If a ticker's history is empty, stale, undersized or unusable, it falls back to the Yahoo Finance chart endpoint. A healthy `prices` refresh requires every configured ticker to have at least 60 usable recent daily observations.

An HTTP `200` with zero usable rows is **degraded**, not `ok`. Degraded refreshes do not erase existing history. Provider identity and origin URL are preserved in provenance. Free demo feeds should be replaced by an approved/licensed market-data provider for commercial finance use.

## Point-in-time validation

The public demo distinguishes:

- **Recorded** — score snapshots created on their original date.
- **Reconstructed** — later point-in-time reconstructions that enforce a historical `asOf` cutoff.
- **Partial reconstruction quality** — methodology-v1 fundamentals and structural exposure do not yet have complete historical-vintage source inputs.

30D and 90D are **calendar-day** horizons. If the target lands on a weekend or market holiday, Gridline uses the first available subsequent close within the documented tolerance; it never interpolates a nonexistent market price. As daily snapshots advance, old signals remain fixed while pending outcomes can mature into completed outcomes.

See [docs/backtesting.md](docs/backtesting.md).

## Verification

Code quality gate:

```bash
npm run verify
```

Equivalent commands:

```bash
npm run test:api
npm run test:unit
npm run build
```

After generating a current static snapshot, validate the public-demo data state:

```bash
npm run demo:check
```

Or run both code verification and snapshot acceptance:

```bash
npm run verify:demo
```

`verify:demo` is intentionally stricter than PR CI and can fail when the committed snapshot is old/incomplete. PR CI validates code independently of live provider availability.

## Static daily snapshot and Pages deployment

`Refresh daily dashboard snapshot` runs at **22:00 UTC on weekdays** and supports manual dispatch. It retries sources, preserves last-known-good data for degraded providers, generates schemaVersion 4 history (`scores`, `companyHistory`, `backtestCoverage`, `demoReadiness`), and then runs `npm run demo:check`.

Only a snapshot that passes the demo-critical gate is committed to `main`. That push triggers the separate `Deploy to GitHub Pages` workflow, which performs a Node 22 lockfile install, production build, Pages deployment and Lighthouse CI.

The gate requires, among other things, usable recent price history for all four tracked tickers and at least one labelled historical reconstruction. Optional degraded providers remain visible as warnings rather than being silently hidden.

Deployment runbook: [English](docs/static-snapshot-deployment.en.md) · [繁體中文](docs/static-snapshot-deployment.zh-TW.md).

## Data Health

Open **Research Lab → Data health** or navigate to `#health` to inspect the same committed snapshot used by the public dashboard. It reports:

- generation time / age;
- source health and degradation reasons;
- per-ticker price row count, range and provider;
- schema/methodology version;
- Recorded vs Reconstructed point-in-time coverage;
- `DEMO READY`, `READY WITH WARNINGS`, or `ATTENTION REQUIRED`.

This is an operational transparency surface, not a claim that every optional provider is currently live.

## Optional Supabase accounts

The React project contains signup, email confirmation/resend, sign-in, session restoration, password recovery/change, preference load/save and sign-out. The public research demo remains usable without Supabase configuration.

To demonstrate live accounts, configure the project, redirects, RLS SQL and browser-safe publishable variables as described in [docs/accounts.en.md](docs/accounts.en.md). No service-role/secret key belongs in the frontend.

## EIA attribution

Where EIA observations appear, Gridline identifies the **U.S. Energy Information Administration (EIA)** as the source and retains observation/retrieval timestamps. Gridline scores are not produced, endorsed or approved by EIA. Keep EIA attribution and time context with any displayed derived research result.

Traditional Chinese README: [README.zh-TW.md](README.zh-TW.md).
