# Exposure monitor lookback windows

The `30D`, `90D`, and `1Y` controls in **Overview → Where the regime matters** are analytical lookback windows, not alternate current snapshots.

## What changes with the window

- **Period return** is calculated from observed daily closing-price records from the `prices` source.
- **Market emotion / fundamentals / DC exposure** remain point-in-time scores until a matching historical score snapshot exists for the selected lookback.
- Once historical score snapshots exist, the UI shows score deltas versus the selected lookback date.
- **Expectations gap** remains the current classification. The UI does not invent historical classifications when they were not recorded at the time.

## Historical integrity

The daily snapshot job appends one score snapshot per ticker per day to `companyHistory` in `public/data/dashboard-snapshot.json`. Existing history is retained for 400 days. This avoids reconstructing historical proprietary scores with information that was only learned later.

Price history is already supplied by the `prices` adapter, which retains roughly the latest 260 daily observations per tracked ticker. If a ticker does not have enough history for a requested window, the UI displays an unavailable state rather than reusing a current number.

## Data availability behavior

Immediately after this feature is deployed, historical **price returns** become available after the next successful daily snapshot refresh. Historical **score deltas** need to accumulate naturally: approximately 30 days for 30D, 90 days for 90D, and one year for 1Y.
