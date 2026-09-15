# Point-in-time backtesting

Gridline backtesting is designed to answer **what the system actually knew at the time**, not what can be reconstructed today.

Current backtest methodology: `gridline-point-in-time-backtest-v1.0.0`.

## Signal rules

- `Positive` expectations-gap snapshots are treated as constructive signals.
- `Elevated` expectations-gap snapshots are treated as caution signals.
- `Balanced` snapshots are not treated as directional signals.
- Supported forward horizons are 30 and 90 calendar days.
- Entry and exit prices use the first available market observation after the target timestamp within a small trading-day tolerance.

## Point-in-time guardrails

1. Only score snapshots that were actually persisted are eligible.
2. A versioned score's `asOf` timestamp is the information cutoff.
3. If score lineage references an observation dated after that cutoff, the signal is marked invalid and excluded from performance statistics.
4. Historical proprietary scores are never reconstructed with current information.
5. Signals without a completed forward price window remain `pending`; they are not silently discarded.
6. Small samples remain visible. Gridline does not claim predictive power from incomplete history.

## Reported diagnostics

- completed signal count
- pending outcome count
- invalid-lineage count (server backtest)
- directional hit rate
- average directional return
- average forward return by Positive/Elevated signal type

The static GitHub Pages demo can validate recorded `companyHistory` as it accumulates. The production API additionally reads versioned score snapshots and provenance from SQLite and persists each backtest run for audit.

Backtest statistics are descriptive research diagnostics, not investment advice or evidence that future performance will match historical results.
