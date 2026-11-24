# Audit Progress (for continuing later)

Last updated: 23 Nov 2026.

## Where things are
- Code: branch `audit/baseline`. Baseline commit `ccd3fe0` = the zip as supplied (note: that commit is missing `back-end/src/uploads/` because the old `.gitignore` hid it; the folder is now tracked).
- Reports: this folder. Raw logs: `evidence/`. Re-runnable scripts: `scripts/` (set `PW_*` env vars to the demo passwords; see `AUTOMATED_TEST_RESULTS.md` §4).

## How to run
1. `cd back-end && npm ci && npm run start:dev` (port 3001, in-memory demo data).
2. `cd front-end && npm ci && npm run dev` (port 5173).
3. Tests: `back-end`: `npm test`, `npm run test:integration`, `npm run test:audit`. `front-end`: `npm run test:e2e` (needs both servers running).

## Done
- Inventory, baseline, defect probes, fixes (see `FIXES_IMPLEMENTED.md`), regression tests, workflows A–E, crawl desktop + phone, basic accessibility, competitor sources, all 8 reports + acceptance report.

## Next steps (suggested order)
1. Script the agency end-to-end flow (resell → client trip → passengers → booking → payment → commission).
2. Fix OPEN-13/14 (remaining form labels, `h1` on login and sign-up).
3. Wire home search to packages; add a contact endpoint (OPEN-08).
4. Decide guide payout model (OPEN-03) and server-side prices for custom items (OPEN-04).
5. PostgreSQL-only data layer (OPEN-01), real payment provider in test mode (OPEN-02), email provider.
6. NestJS 11 upgrade to clear `npm audit` high items (OPEN-07).
7. Add `npm run test:audit` and the browser tests to CI.
