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
