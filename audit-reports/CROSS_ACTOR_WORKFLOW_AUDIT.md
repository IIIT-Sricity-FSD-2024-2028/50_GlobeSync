# Cross-Actor Workflow Audit

Audit date: 23 Nov 2026.

What "cross-actor" means: one person does something, and another person must see the right result (for example, a traveler pays and the admin and guide see it). These flows are where the original app broke most.

How it was tested:
- A script drove the real running API as several real accounts (traveler, guide, admin, a second traveler) and checked what each one sees. 50 checks.
- The browser test `front-end/e2e/full-journey.spec.ts` repeats the main journey through the real screens (sign up → book → pay on screen → guide accepts → chat → cancel on screen → guide completes → review).
- Final run: **50 of 50 checks pass** (fresh server, 23 Nov 2026). Browser journey passes.
- On the original code this journey could not get past the first steps: the traveler and guide could not see their own records (ID-001), and cancellation always failed (BOOK-004).

Tip for anyone re-running the script: run it on a fresh server. A second run on the same server fails some guide steps because the guide is already booked for those dates from the first run. That is the double-booking rule working, not a bug.

---

## Workflow A: Admin adds a package → traveler books and pays → everyone sees it

| Step | Who | Check | Result |
|---|---|---|---|
| WA-1 | Admin | creates a package | Pass |
| WA-2 | Traveler | sees the new package | Pass |
| WA-3 | Traveler | plans a trip on it and requests a guide | Pass |
| WA-4 | Traveler | books a hotel (held for 15 minutes) | Pass |
| WA-5 | Admin | sees the booking | Pass |
| WA-6 | Guide | sees the request | Pass |
| WA-7 | Guide | gets a notification | Pass |
| WA-8 | Traveler | does **not** get the guide's notification | Pass (failed before RT-001 fix) |
| WA-9 | Traveler | paying less than the price is refused | Pass (failed before PAY-001 fix) |
| WA-10 | Traveler | cannot say "I paid cash" | Pass |
| WA-11 | Traveler | exact payment accepted | Pass |
| WA-12 | Traveler | second payment refused | Pass |
| WA-13 | System | booking becomes CONFIRMED and stays so | Pass |
| WA-14 | System | trip confirmed automatically when everything is paid | Pass (new rule) |
| WA-15 | Admin | sees the trip as Confirmed | Pass |

## Workflow B: Traveler cancels → refund → guide is free again

| Step | Check | Result |
|---|---|---|
| WB-1 | traveler pays for trip 2 | Pass |
| WB-2 | guide accepts trip 2 | Pass |
| WB-3 | guide cannot accept another trip on overlapping dates | Pass |
| WB-4 | refund preview shows 65% of the amount actually paid (≥72 hours before) | Pass (before: "already departed" error) |
| WB-5 | traveler cancels the trip | Pass |
| WB-6 | the trip's booking is cancelled too | Pass (before: stayed active) |
| WB-7 | guide's calendar is freed, so the overlapping trip can now be accepted | Pass (before: blocked forever) |
| WB-8 | guide sees the trip as Cancelled | Pass |
| WB-9 | cancelling again does not refund twice | Pass |
| Extra (`test:audit` REF-001) | admin sees the refund under Refunds | Pass (before: refunds list empty) |

## Workflow C: Admin changes a package after people booked

| Step | Check | Result |
|---|---|---|
| WC-1 | admin changes the package price | Pass |
| WC-2 | an existing booking keeps the price it was confirmed at | Pass |
| WC-3 | trip history survives package delete / deactivate (delete is blocked while trips exist) | Pass |

## Workflow D: Guide accepts, starts and completes a trip

| Step | Check | Result |
|---|---|---|
| WD-1 | guide cannot start a trip before accepting | Pass |
| WD-2 | guide accepts | Pass |
| WD-3 | guide cannot switch an accepted trip to declined | Pass |
| WD-4 | traveler is notified | Pass |
| WD-5 | traveler cannot mark the trip completed | Pass (before: traveler could) |
| WD-6 | guide starts the trip | Pass |
| WD-7 | guide completes the trip | Pass |
| WD-8 | bookings become COMPLETED with the trip | Pass (before: never happened) |
| WD-9 | admin sees the trip as Completed | Pass |

## Workflow E: Review after the trip

| Step | Check | Result |
|---|---|---|
| WE-1 | review naming a guide who was not on the trip is refused | Pass |
| WE-2 | review accepted after completion | Pass (before: impossible, see WD-8) |
| WE-3 | second review for the same booking refused | Pass |
| WE-4 | guide sees the review | Pass |
| WE-5 | admin sees it for moderation | Pass |
| WE-6 | traveler cannot delete reviews | Pass |

## Also checked
- Dashboard numbers match the records (DASH-1..5) and the pending count now includes held bookings (`test:audit` DASH-001).
- Login session: refresh token rotates, old one cannot be reused, bad token refused (AUTH-1..3).
- Isolation between two travelers: traveler B cannot read or change A's trip, booking, payment, itinerary, expenses, messages, dashboard, or cancellation preview (probe script + `test:audit` ISO-001).

## Gaps that remain in cross-actor flows (not fixed)
1. **Guide fee and platform fee** are added to the trip budget shown to the traveler, but nothing charges them. The guide is never paid through the platform. Needs a business decision on how the guide is paid.
2. **Trip-level vs booking-level refund:** the trip cancel screen talks about 65% of the trip budget, but money is only refunded on bookings actually paid. Numbers can differ on screen.
3. **Custom trips:** hotel and transport prices are sent by the browser; there is no server price list for them. Package prices are server-side.
4. **Auto-confirm switch:** if the superuser turns off auto-confirm, paid bookings stay "held" until staff confirm. Works as configured, but there is no staff screen prompt for it.
5. **Agency subscription** page is hidden (redirects to dashboard).
6. **Email** to users is simulated (written to the server log).
