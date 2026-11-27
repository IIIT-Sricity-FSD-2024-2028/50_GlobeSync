# Database, API and Security Audit

Audit date: 23 Nov 2026. Scope: `back-end/` (NestJS) and how `front-end/` calls it. No real database, payment service or email service was touched.

## 1. Short answer
- **Before the audit:** the API was effectively open. No login was needed for private data, and anyone could claim to be the platform owner with one header. Money rules could be bypassed from the browser.
- **After the audit:** every protected route checks a signed token, the role, and (for travelers, guides, agencies) ownership of the record and of each field being changed. Money amounts come from the server.
- **Still not production-ready:** data lives in memory, payments are simulated, 35 dependency warnings remain, tokens are kept in browser storage.

## 2. Data layer

| Item | Finding | Status |
|---|---|---|
| Storage mode | Business data in memory arrays (`src/data/*.data.ts`) + login store (`database/test-database.ts`). Lost on every restart. | **Open (P0 for production, OK for demo)** |
| Prisma / PostgreSQL | Schema did not validate (`@default(PENDING)` not in enum). Fixed to `HELD`. Schema and migrations have drifted; some services use Prisma first, then fall back to memory, so the two stores can disagree. | Schema fixed; hybrid design **open** |
| Two id systems | Account id (login) vs profile id (business data) caused owners to be locked out of their own data. | **Fixed** (`identity.util.ts`, `pid` in token) |
| Referential checks | Trips accepted unknown package/guide ids; bookings accepted any trip. | **Fixed** |
| Refund records | Two refund stores; admin screens read the empty one; refund always linked to payment #1. | **Fixed** (linked to real payment, mirrored) |
| Deleting packages with trips | Blocked with 409 (good). No "deactivate" button in the UI. | Open (P2) |
| Backups / migrations | Not applicable in memory mode. | Open with database work |

Approval note: no database migration, bulk delete or production change was made. All work ran against local in-memory data.

## 3. API inventory and protection
- 166 endpoints in 26 controllers (full list in `COMPLETE_FUNCTIONALITY_INVENTORY.md`).
- Public by design: health, login, sign-up, refresh, forgot/reset password, package catalogue, agency lookup, payment webhook (signature checked).
- Everything else declares `@Roles(...)` and is now enforced by `GlobalAuthGuard`.

### How a request is checked now
1. Token read from `Authorization: Bearer` or the `access_token` cookie, signature and expiry checked.
2. Account still allowed (not deactivated, agency still approved).
3. Role in the route's `@Roles` list.
4. Ownership: traveler/agency/guide can only reach their own trips, bookings, payments, itineraries, expenses, messages, dashboards (`roles.guard.ts`).
5. Field rules inside the service: who may change status, price, guide decision, ownership (`trip-permissions.ts`, `restrictOwnerUpdate`, `payments.service.ts`).

## 4. Security findings

| ID | Finding | Severity | Status | Evidence |
|---|---|---|---|---|
| SEC-001 | Private data readable without login | P0 | Fixed | `test:audit` SEC-001 |
| SEC-002 | `x-user-role` header gave superuser rights | P0 | Fixed (header only in `NODE_ENV=test`) | `test:audit` SEC-002 |
| SEC-003 | Traveler token on admin route | P0 | Fixed (403) | `test:audit` SEC-003 |
| AUTH-003 | Deactivated staff could log in | P0 | Fixed | code + workflows |
| PAY-001 | Client decided the amount paid | P0 | Fixed | `test:audit` PAY-001 |
| BOOK-001 | Client could change price/status | P0 | Fixed | `test:audit` BOOK-002 |
| BOOK-002 / ISO | Cross-account booking on someone else's trip; cross-account cancel preview | P0/P1 | Fixed | `test:audit` ISO-001 |
| TRIP-001..004 | Self-confirm, self-accept, ownership transfer, guide edits money | P0 | Fixed | `test:audit` TRIP-002..006 |
| GUIDE-002 | Guide could list all travelers' personal data | P1 | Fixed | `test:audit` ISO-002 |
| BOOK-006 | Guide could list all bookings | P1 | Fixed | probe RBAC-guide-allbookings |
| RT-001 | Live notification rooms shared across roles | P1 | Fixed | `realtime.spec.ts` |
| AUTH-005 | Reset token printed in logs | P1 | Fixed | code review |
| AUTH-006 | New passwords stored in plain text | P1 | Fixed for travelers, guides, staff | code review |
| SEC-OPEN-1 | Seeded agency passwords plain text in `agencies.data.ts` | P1 | **Open** (demo data; hash before any real use) | code review |
| SEC-OPEN-2 | Access token kept in `localStorage` (readable by any script if an XSS bug appears). Cookie support exists. | P2 | **Open** | code review |
| SEC-OPEN-3 | 35 backend dependency warnings (3 low, 16 moderate, 16 high, 0 critical) e.g. `@nestjs/core <=11.1.17`, `body-parser`, `lodash`, `js-yaml`. Front end: 3 moderate. | P1 | **Open** (needs NestJS 11 upgrade; not done to avoid a risky upgrade during audit) | `npm audit`, 23 Nov 2026 |
| SEC-OPEN-4 | Demo account picker on the login page | P2 | Open by design; turn off with `VITE_SHOW_DEMO_ACCOUNTS=false` (browser test confirms the switch works) | `login-picker.spec.ts` |
| SEC-OPEN-5 | Payment gateway is a simulation; webhook signature check exists but untested against a real provider | P1 for production | Open | code review |

### Good things already present
- Helmet security headers, request size limits, CORS allow-list, validation pipe with `whitelist` and `forbidNonWhitelisted`.
- Login lock after 5 wrong passwords for 15 minutes; login/sign-up rate limits.
- Signed payment webhooks; idempotency keys on payments and bookings.
- Upload virus-scan hook and signed download links.
- Structured logs with a correlation id per request.

## 5. Rate limiting
- Global: `RATE_LIMIT_MAX` per `RATE_LIMIT_TTL` (default 600 per minute). Was 120, which broke normal page loads.
- Login 10/min, agency sign-up 5/min, traveler sign-up 10/min (unchanged).
- Note for testers: running many automated logins in one minute will hit 429. That is the login limit working, not a bug.

## 6. Privacy
- Traveler personal data now visible only to the traveler, staff, and guides on that traveler's trips.
- Reports contain no passwords or secrets. `.env` is ignored by git; `.env.example` holds placeholders only.

## 7. What to do before production (in order)
1. Move to PostgreSQL only; remove the memory fallback; write migrations from the fixed schema.
2. Real payment provider in test mode first, then live, with the exact-amount rule kept on the server.
3. Upgrade to NestJS 11 and clear high-severity `npm audit` items.
4. Hash all seeded passwords; move tokens to httpOnly cookies only.
5. Independent penetration test.
