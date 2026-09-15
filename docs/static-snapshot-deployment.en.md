# Static daily snapshot deployment

## Flow

1. GitHub Actions starts at `22:00 UTC`, Monday–Friday. This is after the regular US close in both EST and EDT.
2. `npm run snapshot` fetches each configured provider sequentially.
3. Each provider gets three attempts: immediately, after 1 second, and after 2 seconds.
4. The script writes `public/data/dashboard-snapshot.json`, including observations, per-source health, outcomes, freshness, and generation time.
5. On a failed source, observations from the previously committed snapshot remain in place. The new snapshot marks that source `degraded` instead of inventing a zero value.
6. The workflow commits the changed snapshot, builds the React site, and deploys the `build` artifact to GitHub Pages.

## Setup

Add the following repository Actions secrets: `SEC_USER_AGENT`, `EIA_API_KEY`, `PJM_API_KEY`, `FERC_API_KEY`, and optional `COMPANY_IR_FEEDS`. Enable GitHub Pages from Actions. A scheduled GitHub workflow may run a few minutes late, so the displayed generation timestamp is the source of truth.

## Failure policy

The workflow does not discard a useful prior snapshot because one upstream provider fails. It publishes the partial/stale snapshot, surfaces source health, and leaves a GitHub Actions run log for diagnosis. A total script failure still fails the workflow so it is visible to maintainers.
