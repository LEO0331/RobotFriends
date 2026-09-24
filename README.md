# Gridline — Data Center Infrastructure Intelligence

Gridline is a bilingual decision-support and research-validation dashboard that connects physical AI/data-center buildout, power constraints, regulatory events and market expectations. It is a **production-style research-platform demo**: not an automated trading system, not a production market-data terminal, and not investment advice.

Public demo: `https://leo0331.github.io/RobotFriends/`

Demo readiness: [English](docs/demo-readiness.en.md) · [繁體中文](docs/demo-readiness.zh-TW.md)  
Account setup (optional Supabase): [English](docs/accounts.en.md) · [繁體中文](docs/accounts.zh-TW.md)

## What the demo demonstrates

- **Infrastructure intelligence** — region navigation and verified primary-source milestones; unsourced regional capacity/stage figures are withheld.
- **Price lookback** — 30D / 90D / 1Y observed closes with explicit insufficient-history states.
- **Auditable provenance** — deterministic observation IDs, provider/source metadata, observation and retrieval dates, origin URLs and lineage.
- **Extensible technical signals** — a common registry covers trend/moving averages, RSI momentum and Bollinger volatility with dated evidence, provider continuity checks and descriptive states rather than buy/sell verdicts.
- **Persistent history** — the Node API profile stores immutable observations, source health, score snapshots, scenario runs and backtest runs in SQLite/WAL.
- **Scenario Lab** — records bounded user assumptions for power, demand, CAPEX and regulation without an uncalibrated forecast.
- **Retrospective price test** — MA5/MA10 crossover outcomes using the next observed session and a ten-session exit, with pending windows and no-look-ahead rules.
- **Data Health** — `#health` exposes market-snapshot freshness, source status, price coverage, and the separately dated event review.
- **Fail-closed ingestion** — empty/invalid provider responses are degraded, not successful; last-known-good history is retained.
- **Bilingual research UX** — core Research Lab workflows support English and Traditional Chinese.
- **Optional accounts** — Supabase signup/signin/recovery/preferences are implemented in the React project but do not block the public research demo.
- **Engineering quality gates** — PR tests/build/audit, static-snapshot acceptance checks, GitHub Pages deployment and Lighthouse CI.

Detailed design notes: [provenance](docs/data-provenance.md) · [signal methods](docs/signal-methods.md) · [scoring](docs/scoring-methodology.md) · [storage](docs/persistent-storage.md) · [scenario analysis](docs/scenario-analysis.md) · [backtesting](docs/backtesting.md) · [CI](docs/pr-ci.md).

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
                → commit to main → explicit Pages dispatch
                → Pages build/deploy → Lighthouse CI
```

Key modules:

- `server/sources.js` — SEC, EIA, PJM, FERC, official company IR and market-price adapters.
- `server/price-history.js` — validated Stooq history plus Yahoo Finance demo fallback.
- `server/service.js` — cache/source health and zero-row fail-closed behavior.
- `server/provenance.js` — deterministic observation identity and audit metadata.
- `server/database.js` / `server/store.js` — SQLite schema and persistent research history.
- `server/scoring/` — versioned MA5/MA10 signal from cited prices; unsupported company scores are null.
- `server/scenario-engine.js` — bounded user assumptions without an uncalibrated forecast.
- `server/backtest.js` / `src/backtestModel.js` — retrospective price-only MA5/MA10 crossover test.
- `server/historical-reconstruction.js` — recorded-history coverage summary; no v1 reconstructions are generated.
- `server/demo-readiness.js` — public-snapshot acceptance criteria.
- `src/signals/registry.js` — common frontend contract for trend, momentum and volatility methods; calculations fail closed when the latest provider segment is insufficient.
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

## Niche signal lenses and retrospective test

The Overview lets a researcher switch between **market signals**, **company execution**, **grid demand**, and **project milestones**. Each lens shows its source, date, rule, and unavailable state. It avoids a composite buy/sell score. Company execution uses period-aware SEC revenue or diluted EPS only when an exact record link exists. Grid demand requires explicitly typed EIA actual load and complete comparable days. Project milestones require exact primary records. See [Signal lenses](docs/signal-lenses.md) and [Market signal methodology](docs/scoring-methodology.md).

The frontend signal explorer exposes three conventional technical-analysis families under one result contract: moving-average trend, 14-period Wilder RSI momentum, and 20-period Bollinger volatility bands. Users can switch methods on the Overview and open an “About this signal” drawer showing what the method measures, common use, settings, sourced evidence, data requirements and interpretation limits. Each method remains descriptive and does not emit a buy/sell verdict. See [Technical signal methods](docs/signal-methods.md).

The MA5/MA10 backtest uses only dated closes, enters at the next observed session close and evaluates ten observed sessions later. It is a retrospective descriptive calculation with no transaction costs or claim of predictive skill. See [Backtesting](docs/backtesting.md).

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

`Refresh daily dashboard snapshot` runs at **22:00 UTC on weekdays** and supports manual dispatch. It retries sources, preserves last-known-good data for degraded providers, generates a schemaVersion 4 snapshot with price-derived v2 signals, source health and `demoReadiness`, and then runs `npm run demo:check`.

Only a snapshot that passes the demo-critical gate is committed to `main`. The refresh workflow then explicitly dispatches `Deploy to GitHub Pages`, which performs a Node 22 lockfile install, production build, Pages deployment and Lighthouse CI. This explicit dispatch is necessary because a push made by a workflow using the repository `GITHUB_TOKEN` does not itself start another push-triggered workflow.

The gate requires usable recent price history for all four tracked tickers. Historical v1 reconstructions are no longer published or required. Optional degraded providers remain visible as warnings.

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

Where EIA observations appear, Gridline identifies the **U.S. Energy Information Administration (EIA)** as the source and retains observation/retrieval timestamps. Gridline's derived grid-demand comparison is not produced, endorsed or approved by EIA. Keep attribution and time context with any displayed result.

Traditional Chinese README: [README.zh-TW.md](README.zh-TW.md).
