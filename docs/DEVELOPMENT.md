# Development and automated checks

Use this repository's `main` as the development base. Work on a new branch and
open a pull request; do not merge or deploy as part of running checks. The Buying
Advisor is outside this workflow. No product functionality is added by the tests.

## Reproducible local setup

Use Node.js 24 (`.nvmrc`) and npm. From the repository root:

```sh
npm ci --no-audit --no-fund
npx playwright install --with-deps chromium
npm run check
```

`check` runs lint, TypeScript, unit tests, a production build, and browser tests,
in that order. Each command is also available separately. `npm run test:watch`
runs unit tests interactively. Do not run a development server concurrently with
the production build: Next.js shares `.next` between modes. For development run
`npm run dev`; stop it before building. Playwright starts and stops its own server
on `127.0.0.1:3100` and refuses to reuse an existing server. Build before running
`npm run test:e2e` by itself. Failures are not retried or masked.

If a managed environment blocks the browser CDN but supplies Chromium already,
run `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e`.
This uses a different browser build; record that distinction in validation results.
CI ignores this override and installs Playwright's matching browser.

## Data and environment boundaries

- Unit tests import the existing cellar modules into isolated Node processes and
  reset their module state between data tests. Fixtures are synthetic. The current
  storage layer is in memory; no database, user export, or real cellar is used.
- Each browser test gets a fresh, nonpersistent browser context. Browser requests
  outside the exact local test origin are blocked, including third-party fonts.
  No production URL override, saved login, or user browser profile is accepted.
- No `.env.local`, API keys, database secrets, migration, import, reset, deploy,
  or production operation is required. Do not copy credentials into CI. Reassess
  this isolation before replacing the in-memory storage with persistent storage
  or adding server-side network calls; browser routing does not intercept server
  requests.
- Tests protect existing behavior: validation, drinking windows, weighted prices,
  purchase/gift bottle counts, acquisition links, unaffected records, rack moves,
  and preserved acquisition/event history. Desktop and mobile Chromium check
  navigation, the empty cellar, unavailable import, and unknown-wine redirects.
- `tests/TEST_PLAN.md` describes historical OCR routes absent from this checkout.
  Those manual cases are not part of the automated suite and are not reported as
  passing. Real browser creation/import flows remain unavailable in phase 1.

## GitHub Actions

`.github/workflows/ci.yml` runs on pull requests targeting `main`, pushes to
`main`, and manual dispatch. It uses a clean hosted runner, lockfile installation,
Node 24, and Playwright's matching Chromium build. Actions are pinned to commit
SHAs; the token has read-only repository access and is not persisted in checkout.
No secrets, deployment environment, write permissions, or `pull_request_target`
are used. Failed browser results/traces are retained for seven days. Concurrent
runs for the same ref are cancelled and the job times out after twenty minutes.

The workflow reports checks but cannot itself prohibit a merge. A repository
administrator can make **CI / Lint, TypeScript, unit, build and browser tests**
required in a `main` branch ruleset, require pull requests and review, and disable
force pushes. Repository rules and deployment settings are not changed by this
PR. A local passing run does not establish that hosted Actions has run.

## Initial validation (2026-10-28)

Base: `main` at `cc34d278de87989ab73dab85e41c77f10eb7c0cd`.
Node 24.19.0 and npm 11.9.0 were used. Lint, TypeScript and the Next.js production
build passed. All 14 unit cases and all 6 browser cases passed, with no skipped
tests. The browser run used the managed environment's Chromium
154.0.8037.57 because its network policy denied the Playwright CDN download.
The version-matched Chromium 156 download and hosted Actions execution have not
been validated in this environment.

An additional `npm audit --omit=dev` reported three existing vulnerable packages:
Next.js (critical), its PostCSS dependency (high), and `xlsx` (high). npm proposed
a major Next.js 16.4.3 upgrade for the first two and no npm fix for `xlsx`.
Production dependencies were not changed. Treat framework/dependency remediation
as follow-up work before claiming the application itself is secure; green CI
asserts tested behavior, not absence of vulnerabilities. No deployment or data
migration was performed.
