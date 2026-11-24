# Automated Test Results

Final run: 23 Nov 2026, on a fresh server, after all fixes. Raw logs are in `audit-reports/evidence/`.
Only tests that were actually run are reported. Nothing below is estimated.

## 1. Summary

| Suite | Command | Before (original code) | After (fixed code) |
|---|---|---|---|
| TypeScript check | `npx tsc --noEmit` (back-end) | — | Pass |
| Back-end unit tests (12 suites) | `npm test` | 206 / 206 pass | 206 / 206 pass |
| Back-end integration | `npm run test:integration` | 12 / 12 pass | 12 / 12 pass |
| **New** audit regression (HTTP, non-test mode) | `npm run test:audit` | **13 / 25 pass (12 fail)** | **25 / 25 pass** |
| Browser E2E (Playwright, Chromium) | `npm run test:e2e` (front-end) | Not run on original code (this machine's browser build differs from the pinned Playwright; see 4). Its journey test was written around two bugs: hard-coded guide id 4 and the traveler setting booking status to COMPLETED | **9 / 9 pass** |
| Cross-actor workflow script | `audit-reports/scripts/workflows.js` | Could not run (owners locked out of own data) | **50 / 50 pass** |
| Defect probe script | `audit-reports/scripts/probe1.js` | **19 pass / 18 fail** (each fail = a confirmed defect) | All defects fixed (see note) |
| Page crawl, desktop, 66 pages | `audit-reports/scripts/crawl.js` | **57 of 66 pages** had failed API calls (51 × 403, 118 × 404) | **66 / 66 clean** |
| Page crawl, phone 390 px, 66 pages | `MOBILE=1 crawl.js` | 65 of 66 pages scrolled sideways (measured after the API fixes) | **66 / 66 clean** |
| Basic accessibility, 17 pages | `audit-reports/scripts/a11y.js` | 33 unlabelled fields | 16 unlabelled fields (open) |
| Front-end build | `npm run build` | Pass (with chunk-size warning) | Pass (same warning) |
| Clean install | `npm ci` (back-end) | **Fail** (peer-dependency conflict) | Pass |

Key lesson: the original 206 unit tests and 12 integration tests all passed while the app had more than 15 P0/P1 defects. They tested pieces in isolation with header-based identities and never started the app the way a browser uses it. The new `test:audit` suite closes that gap and should run in CI.

Probe note: one probe changed meaning after the fix. "Guide can list all travelers" now returns 200 with **only the guide's own travelers** (correct behaviour); the regression suite checks that the list is filtered.

## 2. New regression suite (`back-end/src/test/audit-regression.e2e-spec.ts`)
Starts the real app with `NODE_ENV=development` so the header shortcut used by old unit tests is off.

| ID | Check | Before | After |
|---|---|---|---|
| SEC-001 | private data needs a token | Fail | Pass |
| SEC-002 | spoofed superuser header ignored | Fail | Pass |
| SEC-003 | traveler cannot call admin routes | Pass | Pass |
| ID-001 | login gives role profile id; owner can read own profile | Fail | Pass |
| AUTH-004 | refresh works without a database | Fail (500) | Pass |
| NOTIF-001 | notifications endpoint exists | Pass | Pass |
| TRIP-VAL ×2 | bad dates and unknown guide refused | Pass* | Pass |
| TRIP-001 | traveler creates trip with guide | Fail | Pass |
| TRIP-002..005 | no self-accept, no ownership transfer, no self-confirm, guide cannot change budget | Pass* | Pass |
| TRIP-006 | guide accepts | Fail | Pass |
| GUIDE-001 | overlapping trip refused | Fail | Pass |
| BOOK-001 | traveler books on own trip | Fail | Pass |
| PAY-001..004 | underpay, cash, exact pay, duplicate | Pass* / Fail | Pass |
| BOOK-002 | amount cannot be rewritten | Pass* | Pass |
| ISO-001 | traveler B blocked from A's trip and preview | Fail | Pass |
| ISO-002 | guide sees only own travelers | Fail | Pass |
| REF-001 | cancellation refund visible to admin | Fail | Pass |
| DASH-001 | pending count includes held bookings | Pass* | Pass |

\* On the original code these "passes" are not real protection: earlier steps failed (trip and booking were never created because of the id mix-up), so the later calls failed for the wrong reason. The probe script, which used correct ids, showed these defects directly (for example a ₹1 payment confirmed a ₹21,400 booking).

## 3. Browser E2E (Playwright)
| Test | Result |
|---|---|
| Full journey: sign up → book → pay on screen → guide accepts → chat → cancel on screen with refund → guide completes → review | Pass |
| Login picker fills each of the 6 demo accounts | Pass |
| Picker hidden when `VITE_SHOW_DEMO_ACCOUNTS=false` | Pass |
| Traveler, guide, agency, support, admin, superuser each land on their portal and are blocked from another portal | 6 × Pass |

## 4. Notes on running the tests yourself
- Start back end (`cd back-end && npm run start:dev`) and front end (`cd front-end && npm run dev`) first for the browser tests and scripts.
- The repo pins `@playwright/test@^1.65`. If your machine has a different browser build, run `npx playwright install chromium` once.
- Login is limited to 10 attempts per minute per address. Running all suites back to back can hit "429 Too Many Requests"; wait one minute between suites. This is the security limit working.
- Run the workflow script on a fresh server (it uses fixed dates; a second run collides with the guide's bookings from the first run).
- Scripts read demo passwords from environment variables `PW_TRAVELER`, `PW_GUIDE`, `PW_ADMIN`, `PW_SUPER`, `PW_SUPPORT`, `PW_AGENCY` (the values are the demo seed passwords; not written in this report).

## 5. What is NOT covered by automation
- Agency end-to-end booking and payment flow.
- CSV export contents, print layout.
- Real payment gateway, real email, PostgreSQL mode.
- Colour contrast, keyboard-only navigation of every pop-up, tablet sizes.
- Load / performance testing.
