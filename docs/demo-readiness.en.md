# Demo readiness and interview walkthrough

Gridline is intended to be presented as a **production-style research-platform demo**, not as a production trading system or an investment recommendation service.

A demo is considered finished when the important product workflow is coherent, the data state is inspectable, failures are visible, and the repository can demonstrate repeatable engineering practices. More pages or more tickers are not required.

## Finished-demo acceptance criteria

### 1. Public data state is inspectable

Use **Research Lab → Data health** (`#health`). The workspace reads the exact committed `public/data/dashboard-snapshot.json` used by GitHub Pages and displays:

- snapshot generation time and age;
- schema version and score-methodology version;
- per-source status, record count, last success and degradation reason;
- NBIS / CRWV / ORCL / AVGO price-history coverage and actual provider;
- recorded vs reconstructed point-in-time coverage;
- an overall `DEMO READY`, `READY WITH WARNINGS`, or `ATTENTION REQUIRED` state.

Optional providers may be degraded and still produce `READY WITH WARNINGS` if the demo-critical historical data remains complete. A degraded provider must never be hidden.

### 2. Static snapshot passes the automated acceptance gate

After a real snapshot refresh:

```bash
npm run demo:check
```

The gate blocks publication when any critical invariant fails:

- schemaVersion < 4;
- missing generation/history/methodology metadata;
- fewer than 60 recent daily price rows for any tracked ticker;
- a source labelled `ok` while reporting zero records;
- no labelled historical reconstruction for the point-in-time demo.

The scheduled snapshot workflow runs this check before it commits a refreshed public snapshot.

### 3. CI is green

Every PR should pass:

```bash
npm run test:api
npm run test:unit
npm run build
```

The GitHub PR workflow also runs a high-severity dependency audit. The Pages deployment performs a production build and Lighthouse CI against the deployed site.

### 4. Local startup is simple

Requirements: Node.js 22+ and the committed npm lockfile.

```bash
npm ci
npm run dev
```

`npm run dev` starts the research API on `http://localhost:8787` and the React UI on `http://localhost:3000/RobotFriends`. `Ctrl+C` stops both.

For a static-UI-only session, `npm start` remains available.

### 5. Point-in-time history is honestly labelled

The validation page distinguishes:

- `Recorded` — native score snapshots created on their original date;
- `Reconstructed` — later point-in-time reconstruction with historical cutoffs;
- `Partial` reconstruction quality — current methodology-v1 fundamentals and structural exposure do not yet have historical-vintage inputs.

30D/90D are calendar-day horizons. Weekends and market holidays use the first available subsequent market close within the documented tolerance. Future prices evaluate an already-existing signal; they never create the signal.

### 6. Authentication is optional for the public demo

The React project implements the Supabase signup/signin/recovery/preferences flows, but Supabase project configuration is intentionally a deployment choice. The public research dashboard, Data Health, Scenario Lab, and point-in-time validation do not require login.

If account functionality is shown in an interview, complete the Supabase setup and the acceptance checks in `docs/accounts.en.md`. Otherwise, it is acceptable to present it as an implemented optional integration that is not configured in the public demo.

## Suggested 5–7 minute interview flow

1. **Overview — thesis and regime**  
   Explain that Gridline connects physical data-center buildout, power/regulatory constraints and market expectations rather than producing a buy/sell signal.

2. **Infrastructure — selected-region drill-down**  
   Select Ohio/PJM or Texas. Show that the national context becomes a region-focused view with stage, secured power and constraint context.

3. **Company exposure — analytical lookback**  
   Select NBIS/CRWV and switch 30D ↔ 90D. Explain that return history changes with the window while structural exposure is a slower-moving point-in-time input.

4. **Evidence / provenance**  
   Show source timestamps, provider identity and confidence. Explain `observedAt` vs `retrievedAt` and why missing data is not converted to zero.

5. **Scenario Lab**  
   Stress power delivery, available power or demand. Show deterministic regime/company sensitivity and contribution breakdown; state that it is sensitivity analysis, not a price forecast.

6. **Point-in-time Validation**  
   Show Recorded vs Reconstructed, completed vs pending 30D/90D outcomes, and the no-look-ahead guardrail.

7. **Data Health + repository engineering**  
   Open `#health`, show provider degradation/price coverage, then briefly show GitHub CI, versioned scoring, SQLite persistence and the fail-closed price pipeline.

A useful backend interview failure example is:

```text
Provider returns HTTP 200 + 0 usable rows
                 ↓
        source = degraded
                 ↓
     do not save empty success
                 ↓
retain last-known-good price history
                 ↓
public snapshot must still pass demo:check
```

## Current deliberate boundaries

These are not hidden defects; they are explicit demo/product boundaries:

- some fundamental and structural-exposure inputs remain curated methodology inputs rather than historical-vintage source records;
- historical reconstruction is therefore labelled `Partial`;
- free demo market-data endpoints should be replaced with an approved/licensed provider for commercial finance use;
- SEC/EIA/PJM/FERC/IR availability depends on credentials/provider behavior, and degraded states remain visible;
- GitHub Pages uses a committed static snapshot; the Node/SQLite profile demonstrates the persistent API architecture separately;
- Supabase requires project-side configuration before live public account flows can be accepted end-to-end;
- Gridline does not claim predictive power or provide investment advice.

## Release checklist

Before an interview or pitch:

```bash
npm ci
npm run verify
```

Then confirm a current post-close snapshot has been generated and run:

```bash
npm run demo:check
```

In the deployed UI verify:

- `#health` does not show `ATTENTION REQUIRED`;
- price coverage is 4/4;
- reconstructed point-in-time history is non-zero;
- the expected 30D/90D rows appear for at least one ticker;
- Scenario Lab and Point-in-time Validation work in both English and Traditional Chinese;
- Infrastructure regional selection and browser back/forward navigation work;
- any degraded provider is explained rather than hidden.

At that point, further work should be driven by a specific interviewer/customer requirement rather than adding generic dashboard features.
