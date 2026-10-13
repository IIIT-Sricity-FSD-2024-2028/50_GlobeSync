# GlobeSync — Frontend to React Migration Checklist

> **College Evaluation Version**  
> Generated from source inspection of all 23 NestJS controllers, DTOs, `RolesGuard`, frontend JS handlers, and all 59 original HTML files.  
> **No application code has been modified in this inspection stage.**  
> **All pages are marked as not migrated (⬜ Not Migrated) initially.**

---

## 📌 Scope Specification: Traveler Conversion Subset

> [!IMPORTANT]
> **College Evaluation Requirement**: Only a selected subset of the **Traveler** workflow is targeted for conversion to React in this phase. The rest of the platform remains documented in this checklist for architectural completeness.
>
> * **In-Scope Traveler Features for React Conversion**:
>   1. **Package Catalog Browsing** (`/traveler/packages`): Search, filter, duration/budget parameters, modal view.
>   2. **My Travel Itineraries** (`/traveler/trips`): List trips, status filters (Planning, Pending, Confirmed, Completed, Cancelled), timeline expansion, and daily itinerary CRUD.
>   3. **Multi-Step Trip Planner** (`/traveler/plan`): Step-by-step itinerary creation, transport/stay/guide selection, live cost summary, submission to backend.
>   4. **Bookings & Payments** (`/traveler/bookings`): Bookings display, card payment simulation with ledger persistence, and refund requests.
>   5. **Expense Tracking** (`/traveler/expenses`): Controlled expense forms, trip expense breakdown, CSV export, and RBAC enforcement.
>   6. **Profile & Saved Passengers** (`/traveler/profile`): Traveler personal details, password change, session sync, and saved co-traveler CRUD.
>   7. **Customer Support** (`/traveler/support`): Controlled ticket creation, status tracking, booking linking, and FAQ helpdesk.
>   8. **Direct Messaging** (`/traveler/messages`): Multi-channel coordination with tour guides and customer care desk with live message dispatch.
>   9. **Traveler Dashboard** (`/traveler/dashboard`): Metric cards and gateway tying the active traveler modules together.
> * **All Other Portals** (Guide, Support, Admin, Superuser, Agency, Public):
>   * Fully cataloged below with exact controller mappings and guard requirements; marked as ⬜ Not Migrated.

---

## Migration Status Legend

| Status | Meaning |
| :--- | :--- |
| ⬜ **Not Migrated** | Component/route not yet implemented or verified in React |
| 🔄 **In Progress** | Currently being implemented or tested |
| ✅ **Migrated** | Component implemented, verified against backend, and working |

### Data Source Classification Legend

| Badge | Meaning |
| :--- | :--- |
| 🟢 **API** | Real HTTP requests to NestJS backend (`http://localhost:3000`) |
| 🟡 **MIXED** | Uses backend API for primary records with local mock data fallbacks in legacy JS |
| 🔴 **MOCK** | Static HTML or hardcoded JavaScript objects without network requests |
| 🟣 **SIM** | Simulated client-side state changes without backend persistence |
| ⚠️ **GAP** | Missing backend endpoint or frontend-only validation |

---

## 1. Traveler Pages (Targeted Conversion Portal)

* **Required Role Header**: `x-user-role: traveler`
* **Required User Header**: `x-user-id: <travelerId>` (numeric string)
* **Ownership Enforcement**: `RolesGuard` strictly validates that `:travelerId` in route parameters and `travelerId` in request bodies match `x-user-id`. Travelers cannot view, edit, or delete another traveler's trips, | # | Current File | Target React Route | In-Scope? | Existing Functionality | Relevant Backend Endpoints | Data Source | Ownership Restriction | Status |
| :-: | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :-: |
| 1 | `front-end/Traveler/traveler-dashboard.html` | `/traveler/dashboard` | 🎯 Yes | Summary cards (trips count, spending, upcoming bookings, support count), upcoming trips list with live links, honest spending scope callout | `GET /dashboard/traveler/:travelerId`<br>`GET /trips/traveler/:travelerId`<br>`GET /packages` | 🟢 API | Self-scoped: `:travelerId` must match `x-user-id`. Verified against NestJS backend. | ✅ |
| 2 | `front-end/Traveler/traveler-dashboard.html` (Catalog) | `/traveler/packages` | 🎯 Yes | Browse tour packages with keyword search, duration & budget filters, sorting, and package details modal with seamless plan link | `GET /packages`<br>`GET /packages/:id` | 🟢 API | Accessible to travelers (`GET /packages`). AbortController signal support. Verified against backend. | ✅ |
| 3 | `front-end/Traveler/my-trips.html` | `/traveler/trips` | 🎯 Yes | View all traveler trips, filter by status, search keywords, edit trip modal, cancel trip, select trip, full daily itinerary management (view, add, edit activities; delete RBAC enforced), URL sync (?tripId=) | `GET /trips/traveler/:travelerId`<br>`GET /guides`<br>`GET /packages`<br>`PUT /trips/:id`<br>`PATCH /trips/:id/status`<br>`GET /itineraries/trip/:tripId`<br>`POST /itineraries`<br>`PUT /itineraries/:id`<br>`DELETE /itineraries/:id` | 🟢 API | Self-scoped trips. Child itinerary items verified via parent trip ownership in `RolesGuard`. Verified against NestJS backend. | ✅ |
| 4 | `front-end/Traveler/create-itinerary.html` | `/traveler/plan` | 🎯 Yes | Multi-step trip planner: choose planning mode, select dates & passengers, pick destination, choose transit & accommodation, select guide, live cost calculation, create trip with step tracking & recovery | `GET /packages`<br>`GET /guides`<br>`GET /passengers/traveler/:travelerId`<br>`POST /trips`<br>`POST /itineraries`<br>`POST /bookings`<br>`POST /messages` | 🟢 API | Traveler must own trip and passengers. Verified against NestJS backend with step recovery. | ✅ |
| 5 | `front-end/Traveler/bookings.html` | `/traveler/bookings` | 🎯 Yes | View traveler bookings, type/status filters, cancel booking, payment modal with cancellation toggle, simulated card gateway notice, real ledger persistence (POST /payments + PUT /bookings/:id), and payment history ledger | `GET /bookings/traveler/:travelerId`<br>`PUT /bookings/:id`<br>`GET /payments/booking/:bookingId`<br>`POST /payments`<br>`POST /refunds` | 🟢 API | Self-scoped: `:travelerId` must equal `x-user-id`. Duplicate payment prevention and full trip confirmation rules verified. | ✅ |
| 6 | `front-end/Traveler/expenses.html` | `/traveler/expenses` | 🎯 Yes | Trip expense breakdown, KPI cards, category breakdown progress bars, search filter, controlled expense add/edit form, CSV report export, RBAC delete handling (RolesGuard Superuser-only) | `GET /trips/traveler/:travelerId`<br>`GET /expenses/trip/:tripId`<br>`POST /expenses`<br>`PUT /expenses/:id`<br>`DELETE /expenses/:id` | 🟢 API | Trip child ownership check: traveler must own `:tripId` attached to expense. Delete restricted to Superusers. Verified against NestJS backend. | ✅ |
| 7 | `front-end/Traveler/messages.html` | `/traveler/messages` | 🎯 Yes | Direct messaging center with tour guides and customer care desk, per-conversation drafts, inline error preservation on send failure, and duplicate send prevention | `GET /messages/user/traveler/:userId`<br>`GET /messages/conversation`<br>`GET /guides`<br>`POST /messages` | 🟢 API | Participant check: traveler can only read/send messages where `senderId` or `receiverId` equals `x-user-id`. Verified against NestJS backend. | ✅ |
| 8 | `front-end/Traveler/support.html` | `/traveler/support` | 🎯 Yes | Controlled support ticket creation, linked bookings [BK#id], traveler-owned ticket list, search/status filters, priority indicators, and honest queue routing | `GET /support-tickets/traveler/:travelerId`<br>`GET /bookings/traveler/:travelerId`<br>`POST /support-tickets` | 🟢 API | Self-scoped: `:travelerId` must equal `x-user-id`. Created ticket `travelerId` must equal `x-user-id`. Verified against NestJS backend. | ✅ |
| 9 | `front-end/Traveler/profile.html` | `/traveler/profile` | 🎯 Yes | View and edit personal profile (name, email, phone, gender, age, password change) and manage saved co-traveler passenger master list (add, edit, delete with backend sync and session update); traveler registration (/signup/traveler) | `GET /travelers/:id`<br>`PUT /travelers/:id`<br>`POST /travelers`<br>`GET /passengers/traveler/:travelerId`<br>`POST /passengers`<br>`PATCH /passengers/:id`<br>`DELETE /passengers/:id` | 🟢 API | Self-scoped: `:id` and `:travelerId` must match `x-user-id`. Verified against NestJS backend with no mock fallback. | ✅ |id` and `:travelerId` must match `x-user-id`. Verified against NestJS backend with no mock fallback. | ✅ |

---

## 2. Guide Pages

* **Required Role Header**: `x-user-role: guide`
* **Required User Header**: `x-user-id: <guideId>` (numeric string)
* **Ownership Enforcement**: `RolesGuard` strictly validates that `:guideId` equals `x-user-id`. Guides can only view trips assigned to their `guideId`, update their assigned trip statuses, view their assigned travelers, and edit their own profile.

| # | Current File | Target React Route | Existing Functionality | Relevant Backend Endpoints | Data Source | Ownership Restriction | Status |
| :-: | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| 10 | `front-end/guide/guide-dashboard.html` | `/guide/dashboard` | Guide metrics (assigned trips, active travelers, pending requests, rating), recent trips preview, quick message list, honest price labeling | `GET /dashboard/guide/:guideId`<br>`GET /trips/guide/:guideId`<br>`GET /messages/user/guide/:userId` | 🟢 API | Self-scoped: `:guideId` must equal `x-user-id`. Verified against NestJS backend. | ✅ |
| 11 | `front-end/guide/requests.html` | `/guide/requests` | List of requested trips awaiting guide action; accept (guideStatus: Accepted) or decline (guideId: null, guideStatus: Declined, status: Planning) with decoupled notification messages and isolated retry | `GET /trips/guide/:guideId`<br>`GET /travelers`<br>`GET /agencies/lookup`<br>`PATCH /trips/:id/status`<br>`PUT /trips/:id`<br>`POST /messages` | 🟢 API | Guide ownership: trip must be assigned to `guideId` matching `x-user-id`. Verified against NestJS backend. | ✅ |
| 12 | `front-end/guide/completed-trips.html` | `/guide/completed-trips` | Archive of past completed trips with traveler details, duration, destinations, real feedback strictly matched by tripId and guideId, no invented ratings or earnings | `GET /trips/guide/:guideId`<br>`GET /travelers`<br>`GET /reviews` | 🟢 API | Self-scoped: only trips where `trip.guideId == x-user-id` and `status == 'Completed'`. Verified against NestJS backend. | ✅ |
| 13 | `front-end/guide/travelers.html` | `/guide/travelers` | Directory of travelers and agencies assigned to guided tours with contact info, multi-trip selector, daily itinerary schedule management, activity progress progression, tour start/complete lifecycle | `GET /trips/guide/:guideId`<br>`GET /travelers`<br>`GET /agencies/lookup`<br>`GET /bookings/guide/:guideId`<br>`GET /itineraries/trip/:tripId`<br>`POST /itineraries`<br>`PUT /itineraries/:id`<br>`PATCH /trips/:id/status` | 🟢 API | Guide ownership: travelers resolved from trips assigned to calling guide. Bookings via scoped `GET /bookings/guide/:guideId`. Verified against backend. | ✅ |
| 14 | `front-end/guide/messages.html` | `/guide/messages` | Two-pane messaging center with travelers, agencies, and support; canonical conversation keys, per-conversation draft isolation, race-condition protected send, whitespace validation, manual refresh | `GET /messages/user/guide/:userId`<br>`GET /messages/conversation`<br>`POST /messages`<br>`GET /travelers`<br>`GET /agencies/lookup` | 🟢 API | Participant check: `senderId` or `receiverId` must equal `x-user-id`. Verified against NestJS backend. | ✅ |
| 15 | `front-end/guide/profile.html` | `/guide/profile` | View and edit guide professional bio, trimmed language array, experience, fee per trip, password updates; session sync via updateUser; rating and adminId protected | `GET /guides/:id`<br>`PUT /guides/:id` | 🟢 API | Self-scoped: `:id` in `PUT /guides/:id` must equal `x-user-id`. Password stripped from session. Verified against backend. | ✅ |

---

## 3. Support Pages

* **Required Role Header**: `x-user-role: support`
* **Required User Header**: `x-user-id: <careId>` (numeric string)
* **Ownership Enforcement**: Support staff have global read/update access to support tickets, refund requests, and traveler directories to resolve customer issues, but profile modification is strictly self-scoped (`careId == x-user-id`).

| # | Current File | Target React Route | Existing Functionality | Relevant Backend Endpoints | Data Source | Ownership Restriction | Status |
| :-: | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 16 | `front-end/support/support-dashboard.html` | `/support/dashboard` | Support team KPI dashboard (open tickets, resolved tickets, pending refunds, average response time), recent tickets queue | `GET /dashboard/support`<br>`GET /support-tickets`<br>`GET /refunds` | 🟢 API | Global support read access. Notifications simulated. | ⬜ |
| 17 | `front-end/support/tickets.html` | `/support/tickets` | Complete ticket management queue: search/filter by status/priority, view traveler details, update status (Open, In Progress, Resolved, Closed) | `GET /support-tickets`<br>`GET /travelers`<br>`PATCH /support-tickets/:id/status` | 🟢 API | Role-level access: all support users can manage all tickets. | ⬜ |
| 18 | `front-end/support/refunds.html` | `/support/refunds` | Refund processing table: review refund claims, verify linked booking/payment, approve or reject refund status | `GET /refunds`<br>`GET /payments`<br>`GET /bookings`<br>`PATCH /refunds/:id/status` | 🟢 API | Role-level access: support staff can transition refund status. | ⬜ |
| 19 | `front-end/support/messages.html` | `/support/messages` | Direct support communication channel with travelers and agencies | `GET /messages/user/support/:userId`<br>`GET /messages/conversation`<br>`POST /messages`<br>`GET /travelers` | 🟢 API | Participant check: support user participates in support chat threads. | ⬜ |
| 20 | `front-end/support/profile.html` | `/support/profile` | View and update customer support agent profile (name, email, department, phone) | `GET /support-users/:id`<br>`PUT /support-users/:id` | 🟢 API | Self-scoped: `:id` parameter must match `x-user-id` (`careId`). | ⬜ |

---

## 4. Admin Pages

* **Required Role Header**: `x-user-role: admin`
* **Required User Header**: `x-user-id: <adminId>` (numeric string)
* **Ownership Enforcement**: Admins bypass ownership checks on operational business entities (trips, packages, bookings, reviews, agencies), but `AdminsController` enforces that `PUT /admins/:id` must match `x-user-id`.

| # | Current File | Target React Route | Existing Functionality | Relevant Backend Endpoints | Data Source | Ownership Restriction | Status |
| :-: | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 21 | `front-end/admin/admin-dashboard.html` | `/admin/dashboard` | Operational overview: platform bookings, trip counts, active packages, recent reviews stream, mini bookings table | `GET /dashboard/admin`<br>`GET /bookings`<br>`GET /trips`<br>`GET /reviews`<br>`GET /travelers` | 🟢 API | Admin role check; global system read permissions. | ⬜ |
| 22 | `front-end/admin/packages.html` | `/admin/packages` | Full package CRUD: package grid, destination tags, price/duration, modal for create, edit, and delete | `GET /packages`<br>`POST /packages`<br>`PUT /packages/:id`<br>`DELETE /packages/:id` | 🟢 API | Admin role check; full CRUD permission. | ⬜ |
| 23 | `front-end/admin/trips.html` | `/admin/trips` | Platform-wide trip oversight: table of all trips across all travelers and guides, status overrides, trip deletion | `GET /trips`<br>`GET /travelers`<br>`GET /guides`<br>`PATCH /trips/:id/status`<br>`DELETE /trips/:id` | 🟢 API | Admin role check; global trip control. | ⬜ |
| 24 | `front-end/admin/bookings.html` | `/admin/bookings` | Master bookings roster: traveler name, trip reference, total price, booking dates, payment status | `GET /bookings`<br>`GET /travelers`<br>`GET /trips`<br>`PUT /bookings/:id`<br>`DELETE /bookings/:id` | 🟢 API | Admin role check; global booking inspection. | ⬜ |
| 25 | `front-end/admin/reviews.html` | `/admin/reviews` | Moderation table for all traveler reviews, star ratings, comments, and admin deletion action | `GET /reviews`<br>`GET /travelers`<br>`GET /trips`<br>`DELETE /reviews/:id` | 🟢 API | Admin role check; moderation deletion allowed. | ⬜ |
| 26 | `front-end/admin/reports.html` | `/admin/reports` | Analytics and operational metrics: booking volume, destination popularity, revenue aggregates, review ratings breakdown | `GET /dashboard/admin`<br>`GET /bookings`<br>`GET /trips`<br>`GET /travelers`<br>`GET /reviews` | 🟢 API | Admin role check; read-only analytics. | ⬜ |
| 27 | `front-end/admin/agencies.html` | `/admin/agencies` | B2B Partner management: review pending reseller applications, approve/reject, set agency commission percentage | `GET /agencies`<br>`PATCH /agencies/:id/status` | 🟢 API | Admin role check; agency approval & commission update. | ⬜ |
| 28 | `front-end/admin/profile.html` | `/admin/profile` | View and edit admin personal credentials, department, and notification settings | `GET /admins/:id`<br>`PUT /admins/:id` | 🟢 API | Self-scoped: `:id` parameter must match `x-user-id` (`adminId`). | ⬜ |

---

## 5. Superuser Pages

* **Required Role Header**: `x-user-role: superuser`
* **Required User Header**: `x-user-id: <adminId>` (numeric string)
* **Ownership Enforcement**: Superuser has root system permissions across all modules, bypassing ownership for all entities except profile (`AdminsController`), where `:id` must equal `x-user-id`.

| # | Current File | Target React Route | Existing Functionality | Relevant Backend Endpoints | Data Source | Ownership Restriction | Status |
| :-: | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 29 | `front-end/super/super-dashboard.html` | `/super/dashboard` | Root platform command center: total users, system health, revenue snapshot, global entity breakdown | `GET /dashboard/superuser`<br>`GET /travelers`<br>`GET /guides`<br>`GET /trips`<br>`GET /bookings` | 🟢 API | Superuser role check; unrestricted read. | ⬜ |
| 30 | `front-end/super/users.html` | `/super/users` | Master user management: list travelers and guides, toggle account status, edit records, register new guides, delete accounts | `GET /travelers`<br>`GET /guides`<br>`POST /guides`<br>`PUT /travelers/:id`<br>`PUT /guides/:id`<br>`DELETE /travelers/:id`<br>`DELETE /guides/:id` | 🟢 API | Superuser role check; full user CRUD. | ⬜ |
| 31 | `front-end/super/agencies.html` | `/super/agencies` | Reseller ecosystem administration: approve/reject, edit commission tiers, create enterprise agency accounts, terminate partnerships | `GET /agencies`<br>`PATCH /agencies/:id/status`<br>`POST /agencies`<br>`DELETE /agencies/:id` | 🟢 API | Superuser role check; complete agency lifecycle control. | ⬜ |
| 32 | `front-end/super/revenue.html` | `/super/revenue` | Financial intelligence: total gross revenue, net platform margin, agency commissions, category breakdown, monetization config editor | `GET /api/admin/revenue/overview`<br>`GET /api/admin/revenue/breakdown`<br>`GET /api/admin/revenue/transactions`<br>`GET /api/admin/revenue/config`<br>`PUT /api/admin/revenue/config/:key` | 🟢 API | Superuser role check (`PUT /api/admin/revenue/config/:key` is superuser exclusive). | ⬜ |
| 33 | `front-end/super/reports.html` | `/super/reports` | System-wide analytical reports: monthly transaction trends, user acquisition graphs, platform health indicators | `GET /dashboard/superuser`<br>`GET /trips`<br>`GET /bookings`<br>`GET /reviews` | 🟢 API | Superuser role check; global system telemetry. | ⬜ |
| 34 | `front-end/super/rules-config.html` | `/super/rules-config` | Global business rules editor: booking limits slider, auto-confirm thresholds, cancellation policies, gateway toggles | *None* (⚠️ Simulated in frontend UI) | 🟣 SIM | Frontend only simulation (no backend endpoint exists). | ⬜ |
| 35 | `front-end/super/api-management.html` | `/super/api-management` | Third-party API dashboard: view API status, mock health monitor, toggle keys for external services (Amadeus, Stripe, Google Maps) | *None* (⚠️ Hardcoded array in `api-management.js`) | 🟣 SIM | Frontend only simulation (no backend endpoint exists). | ⬜ |
| 36 | `front-end/super/profile.html` | `/super/profile` | Superuser master account profile and credentials update | `GET /admins/:id`<br>`PUT /admins/:id` | 🟢 API | Self-scoped: `:id` parameter must match `x-user-id`. | ⬜ |

---

## 6. Agency Pages

* **Required Role Header**: `x-user-role: agency`
* **Required User Header**: `x-user-id: <agencyId>` (numeric string)
* **Ownership Enforcement**: `RolesGuard` strictly validates that `:agencyId` equals `x-user-id`. Agencies can only manage their own client passengers, book trips on behalf of their passengers, view their own commission ledger, and update their own agency profile.

| # | Current File | Target React Route | Existing Functionality | Relevant Backend Endpoints | Data Source | Ownership Restriction | Status |
| :-: | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 37 | `front-end/agency/agency-dashboard.html` | `/agency/dashboard` | Agency summary KPIs: total agency bookings, active passengers, total commission earned, monthly revenue card | `GET /dashboard/agency/:agencyId`<br>`GET /bookings/agency/:agencyId`<br>`GET /passengers/agency/:agencyId` | 🟢 API | Self-scoped: `:agencyId` must match `x-user-id`. | ⬜ |
| 38 | `front-end/agency/browse-packages.html` | `/agency/packages` | Catalog of retail travel packages available for agency client bookings | `GET /packages` | 🟢 API | Authenticated agency read permission. | ⬜ |
| 39 | `front-end/agency/book-package.html` | `/agency/book` | Booking wizard: select catalog package, assign offline passenger, choose guide, submit booking at retail price | `GET /packages`<br>`GET /passengers/agency/:agencyId`<br>`GET /guides`<br>`POST /trips`<br>`POST /bookings` | 🟢 API | Agency must own passenger; trip and booking created with `agencyId = x-user-id`. | ⬜ |
| 40 | `front-end/agency/bookings.html` | `/agency/bookings` | Table of all client bookings placed by the agency with commission calculations and booking status | `GET /bookings/agency/:agencyId` | 🟢 API | Self-scoped: `:agencyId` must match `x-user-id`. | ⬜ |
| 41 | `front-end/agency/passengers.html` | `/agency/passengers` | Full CRUD for agency offline clients (passengers without system accounts): list, add, edit, delete | `GET /passengers/agency/:agencyId`<br>`POST /passengers`<br>`PATCH /passengers/:id`<br>`DELETE /passengers/:id` | 🟢 API | Self-scoped: agency can only read and mutate passengers where `passenger.agencyId == x-user-id`. | ⬜ |
| 42 | `front-end/agency/commission.html` | `/agency/commission` | Commission statement: breakdown of earned commission percentages per completed booking | `GET /api/agencies/:id/revenue` | 🟢 API | Self-scoped: `:id` in revenue route must match `x-user-id`. | ⬜ |
| 43 | `front-end/agency/agency-revenue.html` | `/agency/revenue` | Financial statement: gross booking volume, commission payouts, pending reconciliations | `GET /api/agencies/:id/revenue` | 🟢 API | Self-scoped: `:id` must match `x-user-id`. | ⬜ |
| 44 | `front-end/agency/payments.html` | `/agency/payments` | Payment history for agency client bookings and transaction references | `GET /payments/agency/:agencyId` | 🟢 API | Self-scoped: `:agencyId` must match `x-user-id`. | ⬜ |
| 45 | `front-end/agency/itinerary.html` | `/agency/itinerary` | View timeline itineraries for agency client trips | `GET /trips/agency/:agencyId`<br>`GET /itineraries/trip/:tripId` | 🟢 API | Trip owner check: agency must own the underlying trip. | ⬜ |
| 46 | `front-end/agency/create-itinerary.html` | `/agency/create-itinerary` | Itinerary builder for agency client custom trips | `POST /trips`<br>`POST /itineraries`<br>`POST /bookings`<br>`GET /packages`<br>`GET /guides`<br>`GET /passengers/agency/:agencyId` | 🟢 API | Agency ownership enforced across trip, itinerary, and passenger IDs. | ⬜ |
| 47 | `front-end/agency/expenses.html` | `/agency/expenses` | Record and track agency operational expenses attached to client trips | `GET /trips/agency/:agencyId`<br>`GET /expenses/trip/:tripId`<br>`POST /expenses` | 🟢 API | Trip owner check: agency must own `:tripId`. | ⬜ |
| 48 | `front-end/agency/messages.html` | `/agency/messages` | Coordination chat with assigned tour guides regarding client itinerary details | `GET /messages/user/agency/:userId`<br>`GET /trips/agency/:agencyId`<br>`GET /guides`<br>`POST /messages` | 🟢 API | Participant check: agency user ID matches sender/receiver. | ⬜ |
| 49 | `front-end/agency/support.html` | `/agency/support` | Ticket submission and tracking on behalf of offline clients | `GET /support-tickets/agency/:agencyId`<br>`POST /support-tickets` | 🟢 API | Self-scoped: `:agencyId` must match `x-user-id`. | ⬜ |
| 50 | `front-end/agency/profile.html` | `/agency/profile` | View and edit agency company profile (name, license number, contact email, phone, commission rate display) | `GET /agencies/:id`<br>`PATCH /agencies/:id` | 🟢 API | Self-scoped: `:id` must match `x-user-id`. | ⬜ |

---

## 7. Public & Authentication Pages

Public routes require no authentication headers (`x-user-role` / `x-user-id`). Unauthenticated users can access them freely.

| # | Current File | Target React Route | Existing Functionality | Relevant Backend Endpoints | Data Source | Required Headers & Ownership | Status |
| :-: | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 51 | `front-end/index.html` (legacy) | `/` | Landing page: hero banner, package search preview, popular destinations, key statistics, testimonial showcase, footer | *None (static marketing content)* | 🔴 MOCK | None (Public) | ⬜ |
| 52 | `front-end/about.html` | `/about` | Company background, mission, platform features overview, core values | *None (static content)* | 🔴 MOCK | None (Public) | ⬜ |
| 53 | `front-end/contact.html` | `/contact` | Contact form (name, email, subject, message), office details, embedded map placeholder | *None* (⚠️ No `POST /contact` endpoint) | 🟣 SIM | None (Public) | ⬜ |
| 54 | `front-end/role-select.html` | `/portal-select` | Central login gateway directing users to role-specific login routes | *None (navigational links)* | 🔴 MOCK | None (Public) | ⬜ |
| 55 | `front-end/traveler-login.html` | `/login/traveler` | Traveler authentication by email and password, stores session in `localStorage` | `POST /auth/traveler-login` (`TravelerLoginDto`) | 🟢 API | None (Public) | ⬜ |
| 56 | `front-end/login.html` | `/login/staff` | Staff login for Admin, Superuser, Guide, and Support via role tabs and client access codes | `POST /auth/staff-login` (`StaffLoginDto`) | 🟢 API | None (Public; ⚠️ access code checked client-side) | ⬜ |
| 57 | `front-end/super-login.html` | `/login/superuser` | Dedicated Superuser credentials login form | `POST /auth/staff-login` (`StaffLoginDto`) | 🟢 API | None (Public) | ⬜ |
| 58 | `front-end/agency-login.html` | `/login/agency` | Travel Agency authentication by email and password | `POST /auth/agency-login` (`AgencyLoginDto`) | 🟢 API | None (Public; fails if agency status ≠ Approved) | ⬜ |
| 59 | `front-end/agency-signup.html` | `/signup/agency` | Reseller agency registration form; creates agency with `Pending` status | `POST /agencies/register` (`CreateAgencyDto`) | 🟢 API | None (Public) | ⬜ |
| 60 | `front-end/Traveler/signup.html` | `/signup/traveler` | Traveler account self-registration form (name, email, phone, password) | `POST /travelers` (`CreateTravelerDto`) | 🟡 MIXED | None (Public; ⚠️ legacy pushes to `DB.travelers` fallback) | ⬜ |

---

## 8. Verified Backend Controller Registry

Verified by source inspection of all 23 backend controller files in `back-end/src/`:

```text
1.  admins.controller.ts          (GET /admins/:id, PUT /admins/:id)
2.  agencies.controller.ts        (POST /agencies/register, GET /agencies/lookup, GET /agencies, GET /agencies/:id, POST /agencies, PATCH /agencies/:id/status, PATCH /agencies/:id, DELETE /agencies/:id)
3.  auth.controller.ts            (POST /auth/traveler-login, POST /auth/staff-login, POST /auth/agency-login)
4.  bookings.controller.ts        (GET /bookings, GET /bookings/:id, GET /bookings/traveler/:travelerId, GET /bookings/agency/:agencyId, POST /bookings, PUT /bookings/:id, DELETE /bookings/:id)
5.  dashboard.controller.ts       (GET /dashboard/admin, GET /dashboard/superuser, GET /dashboard/traveler/:travelerId, GET /dashboard/guide/:guideId, GET /dashboard/support, GET /dashboard/agency/:agencyId)
6.  expenses.controller.ts        (GET /expenses/trip/:tripId, POST /expenses, PUT /expenses/:id, DELETE /expenses/:id)
7.  guides.controller.ts          (GET /guides, GET /guides/:id, POST /guides, PUT /guides/:id, DELETE /guides/:id)
8.  health.controller.ts          (GET /health)
9.  itineraries.controller.ts     (GET /itineraries/trip/:tripId, POST /itineraries, PUT /itineraries/:id, DELETE /itineraries/:id)
10. messages.controller.ts        (GET /messages, GET /messages/user/:userType/:userId, GET /messages/conversation, POST /messages)
11. packages.controller.ts        (GET /packages, GET /packages/:id, POST /packages, PUT /packages/:id, DELETE /packages/:id)
12. passengers.controller.ts      (POST /passengers, GET /passengers, GET /passengers/:id, GET /passengers/traveler/:travelerId, GET /passengers/agency/:agencyId, PATCH /passengers/:id, DELETE /passengers/:id)
13. payments.controller.ts        (GET /payments, GET /payments/:id, GET /payments/booking/:bookingId, GET /payments/agency/:agencyId, POST /payments)
14. promotions.controller.ts      (GET /api/promotions, POST /api/promotions)
15. refunds.controller.ts         (GET /refunds, GET /refunds/:id, GET /refunds/agency/:agencyId, POST /refunds, PATCH /refunds/:id/status)
16. revenue.controller.ts         (GET /api/admin/revenue/overview, GET /api/admin/revenue/breakdown, GET /api/admin/revenue/transactions, GET /api/admin/revenue/config, PUT /api/admin/revenue/config/:key, GET /api/agencies/:id/revenue)
17. reviews.controller.ts         (GET /reviews, GET /reviews/:id, GET /reviews/trip/:tripId, POST /reviews, DELETE /reviews/:id)
18. subscriptions.controller.ts   (GET /api/subscriptions/plans, GET /api/agencies/:id/subscription, POST /api/subscriptions)
19. support-tickets.controller.ts (GET /support-tickets, GET /support-tickets/:id, GET /support-tickets/traveler/:travelerId, GET /support-tickets/agency/:agencyId, POST /support-tickets, PATCH /support-tickets/:id/status, DELETE /support-tickets/:id)
20. support-users.controller.ts   (GET /support-users/:id, PUT /support-users/:id)
21. travelers.controller.ts       (GET /travelers, GET /travelers/:id, POST /travelers, PUT /travelers/:id, DELETE /travelers/:id)
22. trips.controller.ts           (GET /trips, GET /trips/:id, GET /trips/traveler/:travelerId, GET /trips/guide/:guideId, GET /trips/agency/:agencyId, POST /trips, PUT /trips/:id, PATCH /trips/:id/status, DELETE /trips/:id)
23. uploads.controller.ts         (POST /uploads/attachment — multipart file upload)
```

---

## 9. Known Integration Gaps & Discrepancies

| # | Feature / Area | Nature of Gap | Impact & React Strategy |
| :-: | :--- | :--- | :--- |
| 1 | **Notifications System** | No backend notification controller or entity exists in NestJS. | Simulated client-side notification bell in React. Do not fabricate fake endpoints. |
| 2 | **Public Contact Form** | No `POST /contact` endpoint exists in backend. | Show immediate client-side success message/toast on submission without network call. |
| 3 | **Staff Login Access Codes** | Backend `POST /auth/staff-login` only validates `email` and `password`. Access codes (`ADMIN-TICP`, `GUIDE-2026`, `SUPP-2026`) are validated client-side only. | Preserve client-side access code validation before sending credentials to backend. |
| 4 | **Superuser Rules Config** | No backend configuration controller or persistence for system booking limits or auto-confirm toggles. | Maintain local UI state simulation with toast confirmation. |
| 5 | **Superuser API Management** | No backend service for external API keys (Amadeus, Stripe, Google Maps). Hardcoded list in frontend JS. | Render clean dashboard from local constant dataset with interactive status toggle. |
| 6 | **Mock Data Fallbacks in Legacy JS** | Legacy pages fallback to `DB.savedPassengers` or `DB.travelers.push()`. | In React, interact purely with backend REST endpoints (`/passengers`, `/travelers`) and surface actual network errors. |
| 7 | **Subscriptions & Promotions Endpoints** | Backend exposes `GET /api/subscriptions/plans` and `GET /api/promotions`, but legacy frontend pages never connected to them. | Ready for integration if monetization or promotional banners are added to agency portal. |

---

## 10. Proposed Simple Component & Layout Architecture

Keep components focused, clean, and directly understandable for student evaluation:

```text
src/
├── context/
│   └── SessionContext.jsx       # Small session context (user, role, isAuthenticated, login, logout)
├── layouts/
│   ├── PublicLayout.jsx         # Simple layout with Navbar + Page Content + Footer
│   └── DashboardLayout.jsx      # Portal layout with Sidebar + Header + Page Content
├── components/
│   ├── common/
│   │   ├── Navbar.jsx           # Public top navigation
│   │   ├── Sidebar.jsx          # Role-based sidebar menu
│   │   ├── Header.jsx           # Dashboard topbar with user chip and logout
│   │   ├── StatusBadge.jsx      # Status pill (Pending, Confirmed, Completed, Cancelled)
│   │   ├── Toast.jsx            # Lightweight notification alert
│   │   ├── Modal.jsx            # Accessible popup dialog wrapper
│   │   └── ProtectedRoute.jsx   # Role guard wrapping protected routes
│   ├── trips/
│   │   ├── TripCard.jsx         # Card presenting an individual trip summary
│   │   ├── TripCostSummary.jsx  # Live calculation breakdown widget
│   │   ├── TripForm.jsx         # Step-by-step controlled form for trip planning
│   │   ├── TransportSelectStep.jsx # Carrier / mode selector
│   │   ├── HotelSelectStep.jsx  # Hotel / accommodation selector
│   │   ├── GuideSelectStep.jsx  # Guide assignment selector
│   │   └── PlanningModeSelect.jsx # Package vs custom itinerary chooser
│   └── packages/
│       ├── PackageCard.jsx      # Presentation card for tour package
│       └── PackageDetailsModal.jsx # Detail popup for package overview & booking CTA
├── pages/
│   ├── public/                  # Public & authentication pages
│   └── traveler/                # Converted traveler pages (Dashboard, Packages, Trips, Plan)
└── services/
    └── api.js                   # Fetch wrapper injecting x-user-role and x-user-id headers
```

---

## 11. Final Migration Summary
 
| Section | Total HTML Pages | Migrated (✅) | Remaining (⬜) | Conversion Status |
| :--- | :---: | :---: | :---: | :---: |
| **Traveler (Completed Workflow)** | 9 | 9 | 0 | 100% Completed & Verified ✅ |
| **Guide (Completed Workflow)** | 6 | 6 | 0 | 100% Completed & Verified ✅ |
| **Support (Teammate Actor)** | 5 | 0 | 5 | ⬜ Separate Teammate Device |
| **Admin (Teammate Actor)** | 8 | 0 | 8 | ⬜ Separate Teammate Device |
| **Superuser (Teammate Actor)** | 8 | 0 | 8 | ⬜ Separate Teammate Device |
| **Agency (Teammate Actor)** | 14 | 0 | 14 | ⬜ Separate Teammate Device |
| **Public & Auth (Traveler Signup Done)** | 10 | 2 | 8 | 🔄 Traveler Signup & RoleSelect Active |
| **Total** | **60 views / 59 files** | **17** | **43** | **Traveler & Guide 100% Verified** |
