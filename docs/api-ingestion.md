# Ingestion API

Run the API in a separate terminal with `npm run api`. It listens on `http://localhost:8787` by default. Copy `.env.example` to a local environment file or export its values before running production ingestion.

| Endpoint | Purpose |
|---|---|
| `GET /api/health` | Per-source status, latest success and degradation reason. |
| `GET /api/observations?ticker=ORCL&type=close` | Normalized silver observations. |
| `POST /api/ingest?source=sec` | Refresh one adapter. Sources: `sec`, `eia`, `pjm`, `ferc`, `company-ir`, `prices`. |
| `POST /api/ingest/all` | Refresh all adapters independently; unavailable credentials degrade only that source. |

The service writes immutable raw responses to `data/bronze`, normalized source-replaceable records to `data/silver`, and source health records to `data/gold`. `data/` is intentionally ignored by Git.

## Provider requirements

- **SEC EDGAR:** public API, server-side only. `SEC_USER_AGENT` is mandatory and must identify the caller. The app respects the SEC's 10 request/second guidance by using a small sequential issuer loop.
- **EIA:** API key required. The starter connector reads PJM hourly RTO regional data.
- **PJM Data Miner 2:** a PJM account/API subscription key is required. The starter connector reads `gen_by_fuel`; comply with PJM terms before redistribution.
- **Data.FERC.gov:** API key required. The starter connector validates and snapshots the dataset catalog; choose and configure a specific FERC dataset before using it as a production indicator.
- **Company IR:** set only official RSS/Atom feeds in `COMPANY_IR_FEEDS`. The raw document remains preserved for a future parser/versioned extraction pass.
- **Prices:** the default Stooq CSV adapter is convenient for local development but should be replaced by a licensed market-data provider for production use.

No missing response is converted to zero. A failed adapter is reported as `degraded` while cached records remain available.

## EIA attribution and integrity

When an EIA-derived observation is displayed, identify the U.S. Energy Information Administration (EIA) as its source and link to EIA Open Data. Keep the raw EIA observation, observation period, and retrieval time separate from Gridline-derived metrics. Do not use the EIA logo or language that implies EIA endorsement of the dashboard, scores, or investment conclusions.

## Post-close schedule

With `SCHEDULE_ENABLED=true` (the default), the local API checks once per minute and triggers one refresh at or after **4:15 PM America/New_York**, Monday through Friday. It runs once per trading weekday; holidays are harmless because providers simply retain the latest valid observation. The source list is configurable with `SCHEDULE_SOURCES`.

For a demo, this is deliberately a low-frequency, low-connection model: one compact request sequence after close rather than continuous polling. SEC is free/public with a declared User-Agent; EIA, PJM and FERC offer free keys/accounts; official IR feeds are configured explicitly; Stooq is a free convenience price feed. Replace the price adapter with a licensed provider before commercial use.
