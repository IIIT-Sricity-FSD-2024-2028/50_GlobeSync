# Complete Functional Audit

Audit date: 23 Nov 2026. App run locally: back end on port 3001 (in-memory demo data), front end on port 5173.

Important honesty notes:
- This is **not** a claim of zero defects. It lists what was checked, how, and what is still wrong.
- "Checked" means one of: an automated test, a scripted API check, a browser test, or a page crawl. Where something was only read in code, it says "code review".
- Not every button on every page was clicked by a script. Every page was opened as its actor on desktop and phone size, and the main flows were driven end to end.

## 1. How each area was tested

| Method | What it covers | Result now |
|---|---|---|
| Page crawl, desktop (1366 px) | All 66 real pages, each opened as its own actor; counts API errors, console errors, page crashes, broken images | 66/66 clean |
| Page crawl, phone (390 px) | Same 66 pages; also checks sideways scrolling | 66/66 clean (before fix: 65 scrolled sideways) |
| Baseline crawl (original code) | Same pages | Every page had a 404 (notifications); admin, superuser, agency, support pages had 403s; profile pages 404 |
| Defect probe script | ≈45 API checks on money, ownership, validation | All defects found were fixed (one expectation changed: guide list is now filtered, so it returns 200 with only own travelers) |
| Workflow script | 50 cross-actor checks | 50/50 |
| `npm run test:audit` (new) | 25 HTTP checks in non-test mode | 25/25 (original code: 13/25) |
| Unit tests (`npm test`) | 206 tests in 12 suites | 206/206 |
| Integration (`npm run test:integration`) | 12 tests | 12/12 |
| Browser E2E (`npm run test:e2e`) | 9 tests: full journey, login picker, 6 role portals with access limits | 9/9 |
| Basic accessibility script | Labels, button names, image alt text, page language, headings on 17 key pages | See section 6 |

## 2. Results by actor

### Traveler
| Feature | How checked | Result |
|---|---|---|
| Sign up, log in, log out, session refresh | browser test, workflows AUTH-1..3 | Works |
| Dashboard shows own trips and bookings | crawl; ID-001 fix | Works (before: empty) |
| Browse packages, plan custom trip, request guide | workflows WA-2, WA-3; crawl | Works |
| Validation of trip form (dates, travelers, package, guide, 24 h lead time) | `test:audit` TRIP-VAL | Works (before: accepted bad data) |
| Book, 15-minute hold, pay exact amount (simulated card) | browser test step 3; WA-9..13 | Works |
| Cancel with refund preview | browser test steps 6–7; WB-4..9 | Works (before: always "already departed") |
| Review after trip | browser test step 8; WE-2 | Works (before: impossible) |
| Expenses, passengers, profile edit | crawl; code review | Pages load and save; not every field combination tested |
| Messages with guide | browser test step 5 | Works |
| Support ticket | crawl; code review | Page loads; ticket create uses real API |
| Phone layout | phone crawl | Fixed |

### Guide
| Feature | How checked | Result |
|---|---|---|
| See requests, accept / decline | WD-1..3; browser test step 4 | Works |
| Calendar: no double booking, dates freed on cancel | GUIDE-001; WB-3, WB-7 | Works (before: dates never freed) |
| Start and complete trip | WD-6, WD-7 | Works |
| See only own travelers | `test:audit` ISO-002 | Works (before: saw all travelers) |
| Reviews and replies | WE-4; crawl | Works |
| Cannot change money fields | `test:audit` TRIP-005 | Works (before: could) |

### Agency
| Feature | How checked | Result |
|---|---|---|
| Sign-up goes to "pending"; only approved agencies log in | code review; AUTH-003 | Works |
| Dashboard, packages resell, create client trip, passengers, bookings, expenses, commission, payments, support | crawl (all 17 routes, desktop + phone) | Pages load with no API errors |
| Subscription page | crawl | **Hidden** (redirects to dashboard) |
| Full agency booking + payment flow | not scripted end to end | **Not fully tested** — recommend next round |

### Support
| Feature | How checked | Result |
|---|---|---|
| Tickets, refunds, messages, profile | crawl | Pages load |
| Refund list shows cancellation refunds | `test:audit` REF-001 | Works (before: always empty) |

### Admin
| Feature | How checked | Result |
|---|---|---|
| Create package; edit price keeps old bookings | WA-1, WC-1..3 | Works |
| See all bookings and trips | WA-5, WA-15, WD-9 | Works |
| Approve agencies, register guides (new guides can log in) | code review; AUTH-002 | Works |
| Review moderation | WE-5 | Works |
| Dashboard numbers | DASH-1..5, `test:audit` DASH-001 | Correct (pending count fixed) |
| Reports, CSV export, print | crawl | Pages load; CSV content not checked line by line |

### Superuser
| Feature | How checked | Result |
|---|---|---|
| Users and staff, deactivate staff (they can no longer log in) | code review; AUTH-003 | Works |
| Payment methods on/off, business rules | crawl; payments service rule | Works (rules enforced on server) |
| Revenue, reports, API management | crawl | Pages load; numbers depend on simulated payments |

### Public pages
| Feature | Result |
|---|---|
| Home, about, portal select, login, sign-ups | Load on desktop and phone (phone menu added) |
| Home page search box | **Open**: ignores what you type and sends you to sign-up |
| Contact form | **Open**: no server endpoint. Now says honestly that it was not sent (before: "Message Sent!") |

## 3. Open defects and limits (not fixed)

| ID | Problem | Impact | Severity | Suggested fix |
|---|---|---|---|---|
| OPEN-01 | Data kept in memory; lost on restart; database path incomplete | Any restart wipes demo data | P0 for production / OK for demo | PostgreSQL only, migrations |
| OPEN-02 | Payments are simulated | No real money moves | P0 for production | Real gateway (test mode first) |
| OPEN-03 | Guide fee and platform fee in trip budget never charged | Revenue and guide pay missing | P1 | Decide guide payout model; add a guide-fee booking |
| OPEN-04 | Custom-trip hotel/transport prices come from the browser | Price could be faked for custom items | P1 | Server price list or supplier API |
| OPEN-05 | Trip cancel screen shows 65% of budget; real refund is on paid bookings only | Confusing numbers | P2 | Show booking-based refund on trip screen |
| OPEN-06 | Seeded agency passwords plain text | Risk if demo data reused | P1 | Hash seed data |
| OPEN-07 | 35 backend dependency warnings (16 high) | Security | P1 | NestJS 11 upgrade |
| OPEN-08 | Home search ignores input; contact form not sent | Looks unfinished | P2 | Wire search to packages; add contact endpoint |
| OPEN-09 | Agency subscription page hidden | Feature missing | P2 | Finish or remove from menus |
| OPEN-10 | No "deactivate package" in UI (delete blocked when trips exist) | Admin cannot retire a package | P2 | Add status toggle |
| OPEN-11 | Email is simulated | Users get no emails | P1 for production | Email provider |
| OPEN-12 | Single 500 kB+ JavaScript bundle | Slower first load on phones | P2 | Code-split routes |
| OPEN-13 | 16 form fields on signed-in pages still have no linked label (search boxes, filters, profile form) | Screen readers | P2 | Add `htmlFor`/`aria-label` |
| OPEN-14 | Login and sign-up pages have no `h1` heading | Screen readers | P2 | Add heading |
| OPEN-15 | Agency end-to-end booking flow not scripted | Unknown defects may remain | — | Next test round |
| OPEN-16 | Original unit tests (206) all passed on the broken code | They did not protect against the P0 defects | — | Keep `test:audit` in CI |

## 4. UX findings (simple)
- Fixed: phone layout on all pages, honest contact message, real errors shown instead of silent fallbacks on cancel and payment.
- Good: clear status badges, refund preview before cancelling, retry buttons on load failures, toast messages.
- Improve: show the cancellation table before payment; show "guide usually replies in X hours"; one consistent date format (some screens show ISO dates).

## 5. Responsive check
- Phone width 390 × 844, all 66 pages: no sideways scrolling, no console errors, no failed API calls.
- Tablet sizes were not checked separately (layout rules break at 900 px and 768 px).

## 6. Accessibility check (basic, not a full WCAG audit)
Checked on 17 key pages:
- Images without alt text: 0.
- Buttons/links without a name: 0.
- Page language set: all pages.
- Form fields without a linked label: 33 → **16** after linking labels on login, both sign-ups and contact.
- Pages without an `h1`: 3 (login and sign-ups).
- Not checked: colour contrast, keyboard-only use of every pop-up, screen-reader reading order.
