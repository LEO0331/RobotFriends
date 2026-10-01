# Event-source decisions

This log records changes to the **active candidate list**, separate from the historical event observations and source-check history. Removing a candidate stops future checks of that URL; it does not erase past snapshots.

## September 29, 2026 — retire Oracle Q1 IR page from Events

- **URL:** `https://investor.oracle.com/investor-news/news-details/2026/Oracle-Announces-Q1-Results-Driven-by-Triple-Digit-Growth-in-Cloud-Infrastructure-Revenues/default.aspx`
- **Observed check:** the September 29 source check received `403 Forbidden` and excluded this candidate. The [snapshot commit](https://github.com/LEO0331/Gridline/commit/facf0f3) retains that exclusion in `sourceHealth.events.coverage`.
- **Decision:** remove this exact URL from `server/event-candidates.json`. It cannot pass the accessible-page rule, and quarterly results belong in the company-disclosure research lane rather than the project-decision event lane.
- **Continuing evidence:** SEC filing facts remain available in Company disclosures. The separately sourced Oracle–Abilene–ERCOT relationship remains in the [relationship register](relationship-evidence.md).
- **Scope:** this retires one URL, not all Oracle announcements. The Events page describes only configured sources and does not claim complete coverage of Oracle or U.S. infrastructure news.

The dated `public/data/event-review.json` is an older manual review and is left intact as a record of what was accessible at that time; newer automated source checks take precedence in the live dashboard.
