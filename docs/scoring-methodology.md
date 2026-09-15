# Scoring methodology (prototype)

Scores are explainable deterministic indicators—not investment recommendations. UI values are seeded illustrative observations pending production ingestion.

The 0–100 Expansion Index combines capacity momentum (35%), corporate investment (25%), grid readiness (20%), and project velocity (20%). Pushback combines delayed/cancelled/rejected MW (35%), grid connection friction (25%), regulatory actions (20%), and environmental/community/financing friction (20%). Events are weighted by stage, MW affected, confirmation probability and source quality.

Expansion and pushback intentionally remain separate: high values in both produce **Expanding but constrained**, rather than a net bearish score. Exposure is company-specific: capacity and power delivery matter most to NBIS/CRWV; OCI and diversification temper ORCL; AI networking and accelerator demand dominate AVGO. Market Emotion uses relative return, trend, drawdown, realized volatility and volume; it is not a valuation score.

Confidence declines with stale data, estimated capacity, uncertain entity resolution and single low-quality sources. A production backtest must reconstruct point-in-time signals only, report sample size and confidence intervals, and avoid optimizing weights for return.
