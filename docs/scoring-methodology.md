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

## Market emotion

When at least 90 days of price history are available, market emotion is computed from 30-day momentum, 90-day momentum and realized volatility. If sufficient point-in-time market history is unavailable, v1 uses an explicitly labelled curated fallback rather than fabricating historical data.

## Expectations gap

The expectations gap compares fundamentals with market emotion while also considering structural data-center exposure. The returned payload includes both the label and numerical spread.

## Auditability

Every score records:

- methodology version
- `asOf` point-in-time cutoff
- calculation timestamp
- component breakdown
- confidence
- source observation lineage

Historical score snapshots must not be recomputed with information that arrived after their `asOf` timestamp.
