# Static daily snapshot deployment

## Flow

Gridline separates **data refresh** from **site deployment**.

1. `Refresh daily dashboard snapshot` starts at `22:00 UTC`, Monday–Friday, or manually via `workflow_dispatch`. GitHub's scheduler may start a few minutes late; `generatedAt` is the source of truth.
2. `npm run snapshot` refreshes configured providers sequentially. Each source gets up to three attempts: immediately, after 1 second, and after 2 seconds.
3. Price history is validated per ticker. Stooq is the primary demo provider and Yahoo Finance chart data is the fallback. Empty, stale, undersized, or incomplete price coverage is treated as degradation, not success.
4. Successful sources replace their previous static observations. A degraded source retains its last-known-good observations, so an upstream empty response cannot erase history.
5. The generator writes a **schemaVersion 4** `public/data/dashboard-snapshot.json` containing source health, outcomes, observations, versioned scores, `companyHistory`, `backtestCoverage`, and a compact `demoReadiness` summary.
6. `npm run demo:check` validates demo-critical invariants before anything is committed. If a blocker is present, the refresh workflow fails and the existing public snapshot remains unchanged.
7. When the snapshot changes and passes the gate, the workflow commits it to `main`.
8. The refresh workflow then explicitly dispatches `Deploy to GitHub Pages` with `workflow_dispatch`. This explicit dispatch is required because GitHub suppresses ordinary workflow chaining for pushes created with the repository `GITHUB_TOKEN`.
9. The Pages workflow installs from the lockfile, builds the React app from the refreshed `main`, deploys the Pages artifact, then runs Lighthouse CI against the deployed site.

A snapshot commit by itself is **not** proof that GitHub Pages has been updated. Confirm the subsequent `Deploy to GitHub Pages` run, or compare the deployed `#health` generation time with the committed snapshot.

## What a successful refresh updates

The Action writes a new `generatedAt` timestamp and provider outcome/health metadata. Successful providers replace their portion of the static observations; degraded providers retain prior usable observations and receive a new checked/error status. The generator then recalculates company scores, appends the daily company-history point, updates point-in-time/backtest coverage, and evaluates demo readiness. Market-price history and EIA observations therefore move when those providers succeed.

The dashboard's snapshot labels read `generatedAt` directly from the deployed JSON and display it in the viewer's local time zone. The Data Health page exposes the exact UTC timestamp. `generatedAt` represents when the file was generated; an observation's own `observedAt` remains the date of the underlying market or operating data.

The headline Expansion/Pushback regime values, curated driver cards, and regional project assumptions are currently editorial MVP inputs. They do not change merely because the Action ran. A later methodology version can calculate those values from normalized observations once sufficient primary-source coverage exists.

The Events page and regime evidence timeline use a separate infrastructure-event pipeline. The scheduled `events` adapter discovers candidates from PJM's official Inside Lines RSS feed and reads additional exact-record candidates from `server/event-candidates.json`. Candidates must have a known primary-source host, a specific article path, a publication date, a relevant category and region, and an accessible page whose heading matches the candidate title. Failed checks are reported as rejected and do not create public events. ERCOT's news listing currently blocks automated requests, so ERCOT records require curated exact URLs. SEC filings are not used as infrastructure-event cards merely because a company filed them.

Events stay in Current for 30 days from publication, then appear in Archive. Both are views over the same records. A successful refresh retains earlier event observations and revisions in the static snapshot and SQLite rather than deleting them when they age out of Current. On a feed failure, last-known-good events remain and the event source is marked degraded. The checked-in snapshot has no verified infrastructure events yet, so the page shows an empty state until the first successful event refresh finds a qualifying record. External sites can change or deny access after a record was validated; the archive retains the original URL and date.

To submit an exact primary record for a source without an automatic feed, add an object to `server/event-candidates.json` with `source` (`ERCOT`, `Loudoun`, `Oracle`, or `PJM`), `title` matching the source page heading, `category` (`POWER`, `GRID`, `PERMIT`, or `CAPEX`), `publishedAt` as an ISO timestamp, `region`, and the article `url`. A factual `summary` requires an `evidenceText` excerpt that must appear on the source page. The daily job rejects generic pages, unrelated hosts, unreachable pages, title mismatches, and missing supporting text. Do not enter an inferred headline or an unverified date.

## Demo-readiness gate

The public snapshot must satisfy these critical checks before the daily workflow may publish it:

- snapshot schema is v4 or newer;
- `generatedAt`, `companyHistory`, `backtestCoverage`, and company-score methodology metadata are present;
- NBIS, CRWV, ORCL and AVGO each have at least 60 usable daily price rows and the latest row is no more than 10 calendar days stale;
- no provider may be labelled `ok` while reporting zero records;
- point-in-time history contains at least one explicitly labelled historical reconstruction.

Degraded optional providers are **warnings**, not automatic blockers, if the retained public snapshot still satisfies the critical data requirements. This makes partial-data behavior visible without unnecessarily taking down a useful demo.

Run the same gate locally with:

```bash
npm run demo:check
```

To run tests/build first and then validate the current static snapshot:

```bash
npm run verify:demo
```

`verify:demo` is expected to fail against an old or intentionally incomplete committed snapshot. Generate a current snapshot first when validating the end-to-end demo state.

## Setup

Add the provider configuration you intend to use under repository **Settings → Secrets and variables → Actions**:

- `SEC_USER_AGENT`
- `EIA_API_KEY`
- `PJM_API_KEY`
- `FERC_API_KEY`
- optional `COMPANY_IR_FEEDS`

The market-price demo providers do not currently require a repository secret. `PRICE_BASE_URL` and `PRICE_FALLBACK_BASE_URL` can be overridden in another deployment profile when using approved/licensed providers.

Supabase variables are used only by the Pages build when optional account functionality is configured:

- `REACT_APP_SUPABASE_URL`
- `REACT_APP_SUPABASE_PUBLISHABLE_KEY`

Authentication is not required for the public research dashboard or the snapshot refresh.

## Failure policy

Gridline fails closed at the data boundary:

- HTTP success with zero usable observations is degradation, not success;
- failed/degraded sources do not erase last-known-good static history;
- if retained history still meets the demo-critical gate, the snapshot may publish with visible warnings;
- if market history, schema-v4 point-in-time data, or another critical invariant is missing, `demo:check` fails before the snapshot is committed;
- a total snapshot-script failure also fails the workflow and leaves the existing public artifact untouched;
- if snapshot commit succeeds but the explicit Pages dispatch fails, the repository contains the new data but the deployed site remains on the prior build. Re-run `Deploy to GitHub Pages` manually and investigate the dispatch step.

Use the in-app **Research Lab → Data health** workspace (`#health`) to inspect the same snapshot that the deployed public dashboard is serving.
