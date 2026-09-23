# Demo readiness and data integrity

`npm run demo:check` validates the committed public snapshot before deployment. It requires schema v4 or newer, a generation timestamp, observation/history fields, a methodology version, and at least 60 recent positive dated closes for each tracked ticker (NBIS, CRWV, ORCL, AVGO). A source labelled `ok` cannot report zero usable records, except the event source: zero verified events is a valid result. Degraded optional sources are warnings. A snapshot older than 96 hours is flagged.

New company signals are MA5/MA10 calculations over ten cited closes. Fundamental, exposure, emotion, confidence, valuation, and regional capacity figures are unavailable until a sourced method exists. Historical v1 reconstructions are not required or published. The price-only backtest is a separate retrospective analysis and does not make the demo investment-ready.

The event feed has separate status. A curated review file may show a partial check with its actual `checkedAt`, scope, and `coverageThrough`; this is not a claim that every possible event source was searched. Later automated event checks replace the displayed status when newer, while older verified event observations remain available.
