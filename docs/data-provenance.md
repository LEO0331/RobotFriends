# Data provenance and audit trail

Gridline treats every normalized external record as an auditable observation.

Each observation receives a deterministic `observationId` derived from source, type, entity, observation time and value. The attached `provenance` object records:

- provider and source key;
- primary/market/external data class;
- original source URL when available;
- `observedAt` — when the underlying fact or market value applied;
- `retrievedAt` — when Gridline fetched it;
- source confidence;
- lineage identifiers;
- normalization transformation version.

Derived scores store the observation IDs that contributed to the calculation. This allows a reviewer to distinguish source facts from Gridline transformations and lets point-in-time validation reject lineage that falls after a score's historical cutoff.

## Observed time vs retrieval time

Do not overwrite `observedAt` with ingestion time. Historical prices, filings and grid records preserve their original effective timestamp. Re-fetching the same observation later may update retrieval/provenance metadata in persistent storage, but deterministic identity prevents it from becoming a second economic observation.

This distinction is required for lookback calculations and no-look-ahead validation.

## Market-provider provenance

The public demo can use more than one market-data endpoint. Price observations therefore record the **provider actually used for that ticker/history fetch** and its origin URL. If Stooq is unusable and the Yahoo Finance demo fallback is selected, the normalized observation identifies Yahoo Finance rather than inheriting a generic/stale Stooq label.

For a commercial finance deployment, configure approved/licensed endpoints and keep equivalent provider/origin metadata.

## Degradation and retained data

A degraded refresh never changes missing data into zero. For the static GitHub Pages artifact, observations from a degraded source are retained from the last-known-good committed snapshot. Their original `observedAt`/provenance remain intact while `sourceHealth` records that the latest refresh attempt degraded.

This means the UI can separately answer:

- **What data is being displayed?** — observation provenance;
- **Did the latest provider refresh succeed?** — source health/outcome metadata.

The `#health` workspace exposes this distinction to demo users instead of silently presenting retained data as newly fetched data.
