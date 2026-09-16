# MVP data-source plan

This prototype uses explicitly labelled sample observations. Production ingestion should prefer primary, timestamped records and preserve raw responses in a bronze store before normalization.

| Source | Access | MVP use | Cadence / depth | Reliability notes |
|---|---|---|---|---|
| SEC EDGAR submissions + company facts | Free public API, no key | Yes | Filing-driven, multi-year | Primary. Respect User-Agent and SEC rate guidance. Use filing date as availability time. |
| Company investor relations | Public web/RSS | Yes | Earnings and announcement-driven | Primary for guidance and contracts; retain URL and release date. |
| EIA Open Data | Free API key | Yes | Monthly/annual, long history | Primary energy series; cache requests and preserve observation periods. |
| FERC and PJM filings | Public search / account | Yes, curated | Docket-driven | Primary regulatory/grid evidence; begin with curated high-impact records. |
| Regional ISOs / utilities | Mixed public portals | Enhancement | Varies | Add region-by-region connectors after confirming terms. |
| GDELT | Free public datasets | Optional | Near-real-time / historical | Discovery only; deduplicate against primary records. |
| Market prices | Free demo providers / licensed production provider | Yes | Daily history | Stooq is attempted first and the Yahoo Finance chart feed is a demo fallback. Each tracked ticker must have a non-stale, usable history window. A zero-row, stale, undersized, or incomplete ticker refresh is degraded rather than successful, so the static snapshot retains last-known-good price history. Record the actual provider in provenance and replace demo feeds with approved/licensed market data for production use. |

## Confidence controls

Bronze records retain raw payload, source URL and retrieval time. Silver normalizes identifiers, dates and units. Gold derives scores. Primary records receive quality 5; grid operators/company releases 4; established media 3; local media 2; community signals 1. Missing data remains null, never zero.

## Fail-closed snapshot refresh

A provider response is not considered healthy merely because the HTTP request succeeded. Ingestion must produce usable observations. Empty responses are marked `degraded`. Price ingestion additionally requires complete coverage for every configured ticker before the source can be marked `ok`. During static snapshot export, only successful sources replace their previous records; degraded sources retain their last-known-good observations. This prevents an upstream empty response from erasing the history needed by lookback and point-in-time validation features.
