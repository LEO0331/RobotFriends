# Gridline — Data Center Infrastructure Intelligence

Gridline is a decision-support dashboard for connecting physical AI/data-center buildout, power constraints, regulatory events and market expectations. It is not an automated trading system or investment advice.

## Run locally

```bash
npm install
npm start
```

Open `http://localhost:3000/RobotFriends`.

## Run the ingestion API

The React app and API intentionally run as separate processes during local development:

```bash
# Terminal 1
npm run api

# Terminal 2: configure non-secret example settings, then refresh a source
set SEC_USER_AGENT=Gridline/0.1 research@example.com
npm run ingest -- sec
```

The API is served at `http://localhost:8787`; Create React App proxies `/api` requests there in development. See [API ingestion documentation](docs/api-ingestion.md) and [.env.example](.env.example) for provider-specific configuration.

## Architecture

- `server/sources.js` — source adapters for SEC, EIA, PJM, Data.FERC.gov, official company IR feeds and daily price history.
- `server/store.js` — bronze/silver/gold-style local storage. `data/` is ignored by Git.
- `server/service.js` — caching, health status and isolated source failures.
- `server/index.js` — HTTP endpoints for health, normalized observations and source refreshes.
- `src/Containers/App.js` — the dashboard UI and evidence exploration views.

## Verification

```bash
npm run test:api
npm run build
```

Provider credentials are never committed. A missing key, rate-limit response, or provider failure is exposed as a `degraded` source-health state and is never represented as zero data.

## Static daily snapshot deployment

For the GitHub Pages demo, [.github/workflows/daily-snapshot.yml](.github/workflows/daily-snapshot.yml) runs at 22:00 UTC on weekdays (after the regular US close in EST and EDT). It refreshes the configured sources, writes `public/data/dashboard-snapshot.json`, and commits that static file only when it changes. GitHub Pages then serves the latest snapshot without a continuously running API.

Each source is tried up to three times with 1s and 2s backoff. A failure retains the last known-good records from the previously committed snapshot and records a degraded source-health state. Add provider secrets in the repository’s Actions secrets before enabling real ingestion.

## EIA data use and attribution

Where EIA observations appear, the dashboard identifies the **U.S. Energy Information Administration (EIA)** as the source and links to EIA Open Data. Gridline may transform or aggregate EIA observations for display, while source records retain their observation and retrieval timestamps. Gridline scores are not produced, endorsed, or approved by EIA; no EIA logo is used. See the [EIA Open Data API](https://www.eia.gov/opendata/) and [Privacy and Security Policy](https://www.eia.gov/about/privacy_security_policy.php).

EIA API data in this project is limited to Gridline’s own research and decision-support dashboard. It is not forwarded to unrelated products, users, or services. Keep EIA-derived observations, attribution, and source timestamps with any displayed research result.

Traditional Chinese documentation: [README.zh-TW.md](README.zh-TW.md). Deployment runbook: [English](docs/static-snapshot-deployment.en.md) · [繁體中文](docs/static-snapshot-deployment.zh-TW.md).
