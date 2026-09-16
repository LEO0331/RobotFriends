# Pull-request quality gate

Every pull request targeting `main` runs the `Pull request quality gate` workflow on Node.js 22.

Blocking checks:

1. install exactly from the committed lock file with `npm ci`;
2. server/domain tests (`npm run test:api`);
3. frontend unit tests (`npm run test:unit`);
4. production build (`npm run build`);
5. dependency audit at `high` severity (`npm audit --audit-level=high`).

The dependency job is now blocking: a high/critical finding must be resolved, explicitly mitigated through a reviewed dependency change, or otherwise addressed before the PR is considered green. Keep Node 22 aligned with lockfile regeneration to avoid npm lock-resolution drift.

`npm run verify` reproduces the code-test/build sequence locally. It does not contact external providers and does not require the committed public snapshot to be demo-ready.

Snapshot acceptance is deliberately separate:

```bash
npm run demo:check
```

This checks the data artifact itself (schema v4, price coverage, reconstruction coverage, etc.). The scheduled daily snapshot workflow runs `demo:check` before committing refreshed public data. For a complete pre-demo check after generating a fresh snapshot, use:

```bash
npm run verify:demo
```

The separate Pages workflow builds/deploys `main` and then runs Lighthouse CI against the deployed URL.

For repository settings, require the PR quality-gate checks before merging to `main`.
