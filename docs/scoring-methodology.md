# Scoring methodology (prototype)

Scores are explainable deterministic indicators—not investment recommendations. UI values are seeded illustrative observations pending production ingestion.

The 0–100 Expansion Index combines capacity momentum (35%), corporate investment (25%), grid readiness (20%), and project velocity (20%). Pushback combines delayed/cancelled/rejected MW (35%), grid connection friction (25%), regulatory actions (20%), and environmental/community/financing friction (20%). Events are weighted by stage, MW affected, confirmation probability and source quality.

Expansion and pushback intentionally remain separate: high values in both produce **Expanding but constrained**, rather than a net bearish score. Exposure is company-specific: capacity and power delivery matter most to NBIS/CRWV; OCI and diversification temper ORCL; AI networking and accelerator demand dominate AVGO. Market Emotion uses relative return, trend, drawdown, realized volatility and volume; it is not a valuation score.

Confidence declines with stale data, estimated capacity, uncertain entity resolution and single low-quality sources. A production backtest must reconstruct point-in-time signals only, report sample size and confidence intervals, and avoid optimizing weights for return.

## Product thesis: expectations gap, not a buy/sell score

Gridline separates four layers that should not be collapsed into article sentiment or a single recommendation:

1. **Data-center demand** — customer commitments, RPO/backlog and demand trend.
2. **Physical deliverability** — MW tracked independently as announced, approved, power secured, under construction and operational. These are attributes, not a guaranteed linear sequence.
3. **Company execution** — financing, capex, concentration, delivery timing and operating milestones.
4. **Market expectations** — market emotion, valuation and the growth assumptions already embedded in price.

The Expectations Gap compares the first three layers against the fourth. It can identify a potential positive dislocation, elevated expectations, fundamental deterioration, or high uncertainty; it is never a buy/sell instruction.

This framework is supported by disclosures that distinguish capacity stages: Nebius separately reports contracted, connected and active power, while Oracle has disclosed delivered data-center MW alongside OCI growth. Regulation is also assessed directionally rather than as automatically bullish or bearish: FERC’s large-load actions aim to speed integration while adding consumer and reliability safeguards. See [Nebius Q4 update](https://assets.nebius.com/assets/e59fb92e-9027-473a-8cac-04f9d2e9ea9a/Shareholder%20Letter%20Q4%202025.pdf?cache-buster=2026-02-12T11%3A43%3A13.446Z), [Oracle Q1 FY27 results](https://investor.oracle.com/investor-news/news-details/2026/Oracle-Announces-Q1-Results-Driven-by-Triple-Digit-Growth-in-Cloud-Infrastructure-Revenues/default.aspx), and [FERC’s large-load action](https://www.ferc.gov/news-events/news/ferc-launches-aggressive-targeted-action-speed-large-load-integration).
