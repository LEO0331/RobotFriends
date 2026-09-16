# Versioned scoring methodology

Gridline scoring is implemented as a versioned domain service rather than UI constants.

Current company methodology: `gridline-company-v1.0.0`.

## Fundamental score

The v1 fundamental score is a weighted research model:

| Component | Weight |
| --- | ---: |
| Revenue quality | 25% |
| AI/data-center CAPEX commitment | 20% |
| Balance-sheet capacity | 20% |
| Execution | 20% |
| Power-delivery confidence | 15% |

Each score response includes component values, weights and contributions.

The current v1 component inputs are curated methodology inputs. They are versioned and explainable, but they do not yet carry full historical-vintage metadata. That distinction matters for reconstructed historical validation and is surfaced as a quality limitation rather than hidden.

## Market emotion

When sufficient price history exists, market emotion is calculated from:

- 30-calendar-day momentum — 45%;
- 90-calendar-day momentum — 35%;
- realized volatility — 20%.

The implementation uses historical observations at or before the score's `asOf` cutoff. If sufficient point-in-time market history is unavailable for a normal current score, v1 uses an explicitly labelled curated fallback rather than manufacturing price history.

For **historical reconstruction**, that fallback is not permitted: a reconstructed row is emitted only when the market-emotion component is backed by real historical price observations. This prevents a present-day fallback value from being written into an older date.

## Structural data-center exposure

V1 structural exposure is a curated methodology input. It is deliberately slower-moving than market emotion and is returned with the mode `curated-structural-exposure-v1`.

Because both structural exposure and the fundamental component inputs currently lack complete historical vintages, reconstructed history is labelled `pointInTimeQuality: partial`. Native Recorded snapshots remain the strongest point-in-time evidence because they capture the model as it actually existed on that date.

## Expectations gap

The expectations gap compares fundamentals with market emotion while also considering structural data-center exposure. The returned payload includes both the label and numerical spread.

Directional validation currently treats `Positive` as constructive and `Elevated` as cautionary; `Balanced` is non-directional and is not included as a directional backtest signal.

## Auditability

Every score records:

- methodology version;
- `asOf` point-in-time cutoff;
- calculation timestamp;
- component breakdown;
- confidence;
- source observation lineage.

Historical score snapshots must not be recomputed with observations that arrived after their `asOf` timestamp. Historical reconstructions carry an explicit origin label and quality state, and existing reconstructed ticker/date rows are retained rather than silently rewritten on later snapshot refreshes.

See [Point-in-time backtesting](backtesting.md) for Recorded vs Reconstructed semantics, 30D/90D calendar-day handling and no-look-ahead guardrails.
