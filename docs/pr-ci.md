# Pull-request quality gate

Every pull request targeting `main` runs the `Pull request quality gate` workflow on Node.js 22.

Blocking checks:

1. install from the lock file with `npm ci`
2. server/domain tests (`npm run test:api`)
3. frontend unit tests (`npm run test:unit`)
4. production build (`npm run build`)

A dependency audit also runs as an advisory job. It is intentionally non-blocking while the project remains on Create React App 5; critical findings should still be reviewed before a release.

For repository settings, require the **Tests and production build** check before merging to `main`.
