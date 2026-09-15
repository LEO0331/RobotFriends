# Data provenance and audit trail

Gridline treats every normalized external record as an auditable observation.

Each observation receives a deterministic `observationId` derived from source, type, entity, observation time and value. The attached `provenance` object records:

- provider and source key
- primary/market/external data class
- original source URL when available
- `observedAt` (when the underlying fact applied)
- `retrievedAt` (when Gridline fetched it)
- source confidence
- lineage identifiers
- normalization transformation version

Derived scores must store the observation IDs that contributed to the calculation. This makes the score reproducible and allows a reviewer to distinguish source facts from Gridline transformations.

Do not overwrite `observedAt` with ingestion time. Historical prices, filings and grid records must preserve their original effective timestamp so later backtests can enforce point-in-time correctness.
