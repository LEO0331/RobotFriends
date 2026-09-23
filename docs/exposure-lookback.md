# Observed price lookback

The price monitor shows daily closes and 30D, 90D or 1Y returns from dated `prices/close` observations. It never falls back to a stored example price. If there is no close near the requested baseline date, the return is unavailable.

A return is `(latest close / baseline close - 1) × 100`. The baseline is the closest observed close within ten calendar days of the target lookback date. The monitor displays both dates and the provider dataset URL; a provider may restrict direct browser access.

MA5 and MA10 use the latest ten distinct dated closes. They describe historical price behavior, not company fundamentals, data-center exposure, fair value or an investment recommendation. Curated score, gap, confidence and percentile fields were removed from this view.
