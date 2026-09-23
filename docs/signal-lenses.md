# Data-center buildout research lenses

Gridline is a focused research workflow for the link between AI/data-center demand, company execution, electric-grid capacity, and market expectations. It deliberately avoids a single buy/sell score. Each lens states its required inputs, calculation or categorical rule, source, observation date, and reason it can be unavailable.

| Lens | Research question | Current rule | Evidence boundary |
| --- | --- | --- | --- |
| Market momentum | What is the market pricing now? | Latest close versus MA5 and MA10 from ten distinct sourced trading closes; above/below/mixed ordering. | Price behavior is not a forecast or explanation of infrastructure fundamentals. |
| Company execution | What has the issuer reported? | Match quarterly diluted EPS or revenue to a comparable prior-year quarter by tag, unit, period and filing date. Show only an up/down direction when both exact-source facts exist; otherwise show a disclosure or unavailable state. | EPS growth is withheld when the prior EPS is non-positive; adjustments and earnings quality require separate work. |
| Grid demand | Is actual load changing in a tracked grid region? | Mean PJM actual demand for a complete UTC day versus the same weekday seven days earlier, each with 24 typed EIA hours. | Regional load cannot identify data-center demand or confirm that any project has secured power. |
| Project milestones | Which permitting, grid or capacity developments have primary evidence? | A specific official page must pass URL, title, date and supporting-text validation. | A record's publication does not prove price impact or company-specific exposure. |

When a source is missing, stale, untyped, or lacks a comparable period, the lens displays **unavailable**. The Overview summarizes the signal name and method; its source link opens the original dataset or document. The Data Health page shows provider status and event-check scope. The price backtest uses past closes only, enters after the signal day, and excludes pending outcomes from performance statistics.

## Interview explanation

> “Most stock apps start with a ticker and add broad market indicators. Gridline starts with the data-center buildout question: demand, grid deliverability, issuer execution, and the market response. Each card is backed by dated observations or a specific primary document. If the source cannot support a claim, the card stays unavailable. The signal rules and retrospective test are reproducible, with their limits shown in the UI.”

This is an engineering and research design, not personal financial advice. The current public price feed is a demo provider; commercial use requires suitable data rights and further validation. [SEC CompanyFacts documentation](https://www.sec.gov/search-filings/edgar-application-programming-interfaces) and [EIA Open Data](https://www.eia.gov/opendata/) describe the structured source families used here.

The public snapshot does not ingest PJM Data Miner numerical feeds by default. [PJM's Data Miner terms](https://www.pjm.com/markets-and-operations/etools/data-miner-2) restrict redistribution without membership; the grid-demand lens uses EIA's public actual-demand data instead. PJM's public news feed remains a candidate source for links to PJM-authored articles.
