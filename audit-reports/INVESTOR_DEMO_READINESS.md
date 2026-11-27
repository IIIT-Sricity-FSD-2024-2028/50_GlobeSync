# Investor Demo Readiness

Assessment date: 23 Nov 2026.

## 1. Verdict

| Use | Verdict | Why (short) |
|---|---|---|
| **Live investor demo** (laptop, demo data, scripted path) | **CONDITIONAL GO** | Main journeys now work end to end for all 6 roles and are covered by tests. Conditions below must be met. |
| **Pilot with real customers / real money** | **NO-GO** | Data is lost on restart, payments are simulated, email is simulated, dependency security warnings remain. |

### Conditions for the demo GO
1. Run from this fixed branch, not the original zip (the original could not show a traveler's own trips, and cancellation always failed).
2. Restart the server right before the demo (fresh demo data) and do not restart during it.
3. Say clearly: "payments are in test mode" and "data is demo data".
4. Follow the demo script in section 3. Avoid: home-page search box, contact form, agency subscription page.
5. Use one browser profile per role (or a private window), because one browser shares one login.
6. Do not run automated tests against the demo server just before the demo (login rate limit is 10 per minute).

## 2. Readiness scorecard (1 = poor, 5 = strong)

| Area | Before | After | Note |
|---|---|---|---|
| Core booking journey | 1 | 4 | Works end to end; tested in browser |
| Security / access control | 1 | 4 | Token + role + ownership + field rules; dependency upgrade pending |
| Money correctness | 1 | 3.5 | Server sets price for packages; custom-item prices and guide fee open |
| Data durability | 1 | 1 | In memory only |
| Mobile web | 2 | 4 | All pages fit a phone now; no app |
| Test coverage that matters | 2 | 4 | New HTTP regression + browser tests |
| Competitive story | 3 | 3 | Niche: local guide matching + agency resell |
| Production operations | 1 | 1.5 | Health checks, logs exist; no database, email, real payments |

## 3. Five-minute demo script (tested path)

1. **Home → Login picker** (1 min): show the six roles. Pick **Traveler**.
2. **Traveler** (2 min): Packages → pick one → plan trip, choose guide → book → **Pay** (test card) → booking shows Confirmed. Open **Cancel** to show the refund preview (do not confirm if you want to keep the booking).
3. **Guide** (separate window, 1 min): Requests → accept the new request → show calendar protection (another overlapping request cannot be accepted).
4. **Admin** (30 s): Dashboard numbers, bookings list shows the new booking, review moderation page.
5. **Superuser** (30 s): payment-method switches and business rules (cancellation policy, booking limit) — explain that rules are enforced on the server.
6. Optional: phone view (browser dev tools, 390 px) to show the mobile layout.

Talking points while demoing: verified reviews only after a completed trip; refunds calculated by policy on the server; guide double-booking prevented; agency partners can resell packages with commission tracking.

## 4. Investor questions (36) with honest answers

Personas: **VC** (venture investor), **Angel** (individual, product-minded), **Tech DD** (technical due diligence), **Travel operator** (industry expert), **Finance** (unit economics / CFO view).

| # | Persona | Question | Honest answer today |
|---|---|---|---|
| 1 | VC | What problem do you solve that Booking.com, GetYourGuide or MakeMyTrip do not? | Matching travelers with a verified local guide for the whole trip, with calendar and booking in one place, plus an agency resell channel. Big sites list tours by operators; they do not manage a personal guide's calendar. |
| 2 | VC | Who is the first customer segment? | Indian domestic travelers wanting guided trips, and small Indian travel agencies. (Needs market data from the founders.) |
| 3 | VC | How big is the market? | Not answered by this audit; founders should bring sourced numbers. |
| 4 | VC | Why now? | To be answered by founders. |
| 5 | VC | What is defensible? | Guide network and trust (verified reviews, policy-based refunds). Software alone is copyable. |
| 6 | VC | Do you have users or revenue? | Demo data only. No live payments. |
| 7 | VC | What will the money be used for? | Suggested: database + real payments + security upgrade (production basics), guide onboarding, mobile app later. |
| 8 | Angel | Show me a traveler booking end to end. | Yes, see demo script; covered by a browser test. |
| 9 | Angel | What happens if the guide says no? | The request shows as declined and the guide's dates are released. The traveler can choose another guide while the trip is still being planned (checked in code, not in a scripted test). No automatic re-matching yet. |
| 10 | Angel | How fast does a guide reply? | Not tracked yet. Recommended feature. |
| 11 | Angel | Can I cancel? What do I get back? | Yes until 12 hours before. 65% if 72+ hours before; 0% at 12–72 hours (50% with paid protection). Preview shown before confirming. |
| 12 | Angel | Why is your refund stricter than GetYourGuide's 24-hour full refund? | Guided multi-day trips block a guide's calendar; but this is a conversion risk. Consider a free-cancel window. |
| 13 | Angel | Is it usable on a phone? | Yes as mobile web (fixed in this audit). No native app. |
| 14 | Tech DD | Where is the data stored? | In memory for the demo. PostgreSQL schema exists but the path is incomplete. Production needs a database migration. |
| 15 | Tech DD | What happens on a server restart? | Demo data resets. Known, listed as P0 for production. |
| 16 | Tech DD | How do you secure the API? | Signed tokens, role checks, ownership checks, field-level rules, rate limits, security headers, input validation. Independently re-tested in this audit. |
| 17 | Tech DD | Were there security problems? | Yes, serious ones before this audit (open API, header spoofing, client-set payment amounts). All fixed and covered by tests. See `DATABASE_API_SECURITY_AUDIT.md`. |
| 18 | Tech DD | Dependency vulnerabilities? | 35 backend warnings (16 high, 0 critical) as of 23 Nov 2026; fix path is a NestJS 11 upgrade. |
| 19 | Tech DD | Test coverage? | 206 unit, 12 integration, 25 HTTP regression, 9 browser tests, 50 scripted cross-role checks — all passing. Old unit tests missed the main defects; new tests target them. |
| 20 | Tech DD | Can it scale? | Not tested. Single process with memory data cannot scale out. Needs database and stateless servers first. |
| 21 | Tech DD | How are payments handled? | Simulated gateway in test mode with signed webhooks and idempotency. No real provider integrated yet. |
| 22 | Tech DD | Who can see personal data? | Traveler, staff, and only guides assigned to that traveler's trips (fixed in audit). |
| 23 | Travel operator | How do you verify guides? | Admin registers and can verify guides. No document/KYC check in the product yet. |
| 24 | Travel operator | How are guides paid? | **Gap:** guide fee shows in the trip budget but is not charged or paid out by the platform. Must be designed. |
| 25 | Travel operator | Can agencies sell your packages? | Yes: agency portal with resell, client trips, passengers, commission tracking. Agencies need admin approval. |
| 26 | Travel operator | How do you handle no-shows or emergencies? | Booking has emergency override with approval in the API. Not demoed. |
| 27 | Travel operator | How do hotel and transport prices work for custom trips? | **Gap:** prices currently come from the browser; needs a supplier or server price list. Package prices are server-side. |
| 28 | Travel operator | Support for travelers during the trip? | Ticketing and chat with support staff. No phone line or 24/7 promise yet (competitors offer 24/7). |
| 29 | Travel operator | Reviews: can they be faked? | Only after a completed trip, one per booking, linked to the trip's real guide. No automated fraud detection (Tripadvisor stopped 2.7 million fake reviews in 2024 — this is a scale problem for later). |
| 30 | Finance | How do you make money? | Commission on bookings, agency commission split, agency subscriptions (subscription page currently hidden). Rates are configurable by the superuser. |
| 31 | Finance | What is the take rate? | Configurable; founders should state the planned rate with reasoning. |
| 32 | Finance | Is revenue reporting accurate? | Dashboards match stored records in tests; refunds now appear in admin lists. All payments are simulated, so no real revenue yet. |
| 33 | Finance | How are refunds accounted for? | Refund recorded against the real payment, ledger entries created, shown to admin/support (fixed in audit). |
| 34 | Finance | Biggest cost drivers? | Not analysed in this audit. |
| 35 | VC | What are the top 3 risks? | (1) No production data layer and real payments, (2) guide payout model undefined, (3) competition on price/refund flexibility from large platforms. |
| 36 | VC | What would make this production-ready, and how long? | Database migration, real payment and email providers, NestJS upgrade, guide payout, pen test. Time estimate should come from the team. |

## 5. Risks during the demo and what to do

| Risk | Chance | What to do |
|---|---|---|
| Someone asks to "restart and show it again" | Medium | Explain demo data resets; production uses a database (roadmap). |
| Typing in the home search box | Medium | It goes to sign-up; avoid it in the script. |
| Many quick logins | Low | Login is limited to 10 a minute — wait a minute. |
| Second booking with same guide and dates | Medium | Expected refusal (double-booking protection) — can be shown as a feature. |
| Asking about real payment | High | Say "test mode"; show that the server refuses wrong amounts. |

## 6. Bottom line
- **Demo: CONDITIONAL GO** — the product story works and is now protected by tests.
- **Production / real money: NO-GO** — fix data storage, payments, email, dependency upgrade and guide payouts first.
