# Scenario analysis

`#scenario` is a deterministic sensitivity-analysis workspace for stress-testing the physical data-center thesis.

Inputs:

- region
- power-delivery delay (months)
- available-power change (%)
- AI/cloud demand change (%)
- capacity CAPEX change (%)
- regulatory-pressure change (points)

Outputs:

- Expansion Index sensitivity
- Pushback Index sensitivity
- per-driver contribution
- relative company-risk sensitivity for NBIS, CRWV, ORCL and AVGO

The model is versioned as `gridline-scenario-v1.0.0`. The same methodology configuration is bundled into the static demo and required by the server. A connected production API persists scenario inputs and outputs in SQLite for later audit.

Scenario results are not forecasts, price targets or investment recommendations. They show deterministic sensitivity to user-entered assumptions.
