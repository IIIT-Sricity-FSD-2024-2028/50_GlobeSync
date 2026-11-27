# Complete Functionality Inventory

Audit date: 23 Nov 2026. Source: the code in this repository (branch `audit/baseline`), read file by file, plus running the app.

Plain-language summary:
- GlobeSync is a travel platform for India: travelers plan trips, book packages, hire a local guide, pay, chat, cancel with refund rules, and review.
- It has **6 kinds of users (actors)**, **78 front-end routes** (66 real pages after redirects), **166 API endpoints** in **26 API controllers**, and **24 data collections**.
- Back end: NestJS 10 (TypeScript). Front end: React 18 + Vite. Live updates: socket.io.
- Data: kept **in memory** (demo mode) from `back-end/src/data/*.data.ts` plus a login store (`database/test-database.ts`). A PostgreSQL/Prisma path exists but is incomplete; with no database the app falls back to memory. **All changes are lost when the server restarts.**

## 1. Actors

| Actor | Sign-in | Home page | What they can do |
|---|---|---|---|
| Traveler | Self sign-up or demo account | `/traveler/dashboard` | Browse packages, plan custom trip, request guide, book, pay (simulated), cancel with refund preview, expenses, passengers, chat, support tickets, review after trip |
| Guide | Created by admin | `/guide/dashboard` | See requests, accept/decline, see own travelers, suggest itinerary, start/complete trip, chat, see reviews and reply |
| Agency (partner) | Self sign-up, then admin approval | `/agency/dashboard` | Resell packages to clients, create client trips, manage passengers, bookings, expenses, commission, payments, support |
| Support | Created by superuser | `/support/dashboard` | Tickets, refunds, chat with travelers |
| Admin | Created by superuser | `/admin/dashboard` | Packages, guides, agencies (approve/reject), bookings, trips, reviews moderation, reports and CSV export |
| Superuser (platform owner) | Seeded | `/super/dashboard` | Everything admin can do, plus users/staff, payment methods on/off, business rules, API/integrations, revenue |

Demo accounts exist for each actor (shown on the login picker when `VITE_SHOW_DEMO_ACCOUNTS` is on). Passwords are not repeated in this report.

## 2. Front-end routes (all 78)

Public: `/`, `/about`, `/contact`, `/portal-select`, `/login` (+ 8 role aliases such as `/login/guide`), `/signup`, `/signup/traveler`, `/traveler/signup`, `/signup/agency`, `/agency/signup`, `/register`, `/unauthorized`, `*` (not found).

| Actor | Routes |
|---|---|
| Traveler (10) | dashboard, packages, plan, create-itinerary, trips, bookings, expenses, profile, support, messages |
| Guide (7) | dashboard, requests, travelers, completed-trips, reviews, messages, profile |
| Support (5) | dashboard, tickets, refunds, messages, profile |
| Admin (9) | dashboard, bookings, trips, packages, agencies, guides, reviews, reports, profile |
| Superuser (9) | dashboard, revenue, users, agencies, payment-methods, rules-config, api-management, reports, profile |
| Agency (17) | dashboard, packages, book-package, trips, create-trip, create-itinerary, itinerary, bookings, passengers, expenses, commission, revenue, payments, subscription (*redirects to dashboard: feature hidden*), messages, profile, support |

Every route is wrapped in `ProtectedRoute` with an allowed-roles list. Wrong role → `/unauthorized` (checked by the browser test `portal-rbac.spec.ts`).

## 3. Screens, buttons, pop-ups and data used (per page)

Method: static read of each page file (buttons with fixed labels, pop-up components, API groups used) plus the crawl, which counted visible buttons and inputs on every page as each actor. Buttons whose label is built from data (for example "Pay ₹21,400") are counted by the crawl, not listed by name.

Shared pop-ups/components: `PaymentModal`, `BookingCancelModal` (refund preview), `BookingDetailModal`, `TripEditModal`, `TripCancelModal`, `ExpenseFormModal`, `PassengerFormModal`, `PackageFormDialog`, `GuideFormModal`, `AgencyFormModal`, `AgencyStatusModal`, `AgencyDetailsModal`, `BookingStatusModal`, `TripStatusModal`, `DeleteDialog`, `AdminDialog`, `AgencyResellModal`, `AgencyCheckoutModal`, `AgencyEditTripModal`, `AgencyCancelTripModal`, `PassengerModal`, `GuideActivityModal`, `GuideSuggestItineraryModal`, `SupportCreateTicketModal`, `SupportTicketDetailModal`, `SupportCreateRefundModal`, `SupportRefundDetailModal`, plus the notification bell drop-down in the header and a toast system.

### AdminAgenciesPage
- Buttons (static labels): Create agency
- Popups: AgencyDetailsModal, AgencyFormModal, AgencyStatusModal, DeleteDialog
- Data calls: agenciesApi
- Hooks: useAdminData

### AdminBookingsPage
- Buttons (static labels): —
- Popups: BookingStatusModal, DeleteDialog
- Data calls: agenciesApi, bookingsApi, paymentsApi, travelersApi, tripsApi
- Hooks: useAdminData

### AdminDashboardPage
- Buttons (static labels): —
- Popups: —
- Data calls: dashboardApi
- Hooks: useAdminData

### AdminGuidesPage
- Buttons (static labels): Register Guide
- Popups: AdminDialog, DeleteDialog, GuideFormModal
- Data calls: guidesApi
- Hooks: useAdminData

### AdminPackagesPage
- Buttons (static labels): ➕ Create Package
- Popups: DeleteDialog, PackageFormDialog
- Data calls: packagesApi
- Hooks: useAdminData

### AdminProfilePage
- Buttons (static labels): —
- Popups: —
- Data calls: adminsApi
- Hooks: useAdminData, useSession

### AdminReportsPage
- Buttons (static labels): Export Transactions CSV, Export Trips CSV, Print Report
- Popups: —
- Data calls: bookingsApi, dashboardApi, revenueApi, reviewsApi, tripsApi
- Hooks: useAdminData

### AdminReviewsPage
- Buttons (static labels): Delete review
- Popups: DeleteDialog
- Data calls: guidesApi, reviewsApi, travelersApi, tripsApi
- Hooks: useAdminData

### AdminTripsPage
- Buttons (static labels): —
- Popups: DeleteDialog, TripEditModal, TripStatusModal
- Data calls: agenciesApi, guidesApi, packagesApi, travelersApi, tripsApi
- Hooks: useAdminData

### AgencyBookPackagePage
- Buttons (static labels): —
- Popups: —
- Data calls: bookingsApi, packagesApi, passengersApi, paymentsApi, tripsApi
- Hooks: useNavigate, useSearchParams, useSession

### AgencyBookingsPage
- Buttons (static labels): —
- Popups: BookingDetailModal
- Data calls: bookingsApi
- Hooks: useNavigate, useSession

### AgencyCommissionPage
- Buttons (static labels): 📥 Export to CSV
- Popups: —
- Data calls: agenciesApi, agencyApi
- Hooks: useSession

### AgencyCreateTripPage
- Buttons (static labels): ← Back to Client Trips
- Popups: —
- Data calls: —
- Hooks: useNavigate, useSession

### AgencyDashboardPage
- Buttons (static labels): —
- Popups: —
- Data calls: agenciesApi, agencyApi, packagesApi, passengersApi, tripsApi
- Hooks: useNavigate, useSession

### AgencyExpensesPage
- Buttons (static labels): —
- Popups: —
- Data calls: expensesApi, tripsApi
- Hooks: useNavigate, useSearchParams, useSession

### AgencyItineraryPage
- Buttons (static labels): —
- Popups: —
- Data calls: —
- Hooks: —

### AgencyMessagesPage
- Buttons (static labels): —
- Popups: —
- Data calls: guidesApi, messagesApi
- Hooks: useSession

### AgencyPackagesPage
- Buttons (static labels): —
- Popups: AgencyResellModal
- Data calls: agenciesApi, packagesApi
- Hooks: useNavigate, useSession

### AgencyPassengersPage
- Buttons (static labels): —
- Popups: PassengerModal
- Data calls: agencyApi, passengersApi, tripsApi
- Hooks: useSession

### AgencyPaymentsPage
- Buttons (static labels): —
- Popups: —
- Data calls: paymentsApi, refundsApi
- Hooks: useSession

### AgencyProfilePage
- Buttons (static labels): —
- Popups: —
- Data calls: agencyApi
- Hooks: useSession

### AgencySupportPage
- Buttons (static labels): —
- Popups: —
- Data calls: agencyApi, supportTicketsApi, tripsApi
- Hooks: useSession

### AgencyTripsPage
- Buttons (static labels): —
- Popups: AgencyCancelTripModal, AgencyCheckoutModal, AgencyEditTripModal
- Data calls: agencyApi, passengersApi, tripsApi
- Hooks: useNavigate, useSearchParams, useSession

### GuideCompletedTripsPage
- Buttons (static labels): Retry Connection + filter tabs
- Popups: —
- Data calls: agenciesApi, reviewsApi, travelersApi, tripsApi
- Hooks: useSession

### GuideDashboardPage
- Buttons (static labels): Retry Connection
- Popups: —
- Data calls: dashboardApi, guidesApi
- Hooks: useSession

### GuideMessagesPage
- Buttons (static labels): Retry
- Popups: —
- Data calls: agenciesApi, messagesApi, travelersApi, tripsApi
- Hooks: useSession

### GuideProfilePage
- Buttons (static labels): Retry
- Popups: —
- Data calls: guidesApi
- Hooks: useSession

### GuideRequestsPage
- Buttons (static labels): Retry Loading + filter tabs
- Popups: —
- Data calls: agenciesApi, messagesApi, travelersApi, tripsApi
- Hooks: useRealtimeEvent, useSession

### GuideReviewsPage
- Buttons (static labels): Retry
- Popups: —
- Data calls: guidesApi, reviewsApi, travelersApi, tripsApi
- Hooks: useSession

### GuideTravelersPage
- Buttons (static labels): Retry Connection
- Popups: GuideActivityModal, GuideSuggestItineraryModal
- Data calls: agenciesApi, bookingsApi, itinerariesApi, messagesApi, travelersApi, tripsApi
- Hooks: useSession

### AboutPage
- Buttons (static labels): —
- Popups: —
- Data calls: —
- Hooks: —

### AgencySignupPage
- Buttons (static labels): —
- Popups: —
- Data calls: authApi
- Hooks: useNavigate

### ContactPage
- Buttons (static labels): Send Another Message, Send Message
- Popups: —
- Data calls: —
- Hooks: —

### LandingPage
- Buttons (static labels): Search Trips
- Popups: —
- Data calls: —
- Hooks: useNavigate

### LoginPage
- Buttons (static labels): —
- Popups: —
- Data calls: ApiError, authApi
- Hooks: useLocation, useNavigate, useSearchParams, useSession

### RoleSelectPage
- Buttons (static labels): —
- Popups: —
- Data calls: —
- Hooks: —

### TravelerSignupPage
- Buttons (static labels): ⚡ Quick-Fill Sample Traveler
- Popups: —
- Data calls: authApi
- Hooks: useNavigate, useSession

### UnauthorizedPage
- Buttons (static labels): Sign In with Another Account
- Popups: —
- Data calls: —
- Hooks: useNavigate, useSession

### SuperAgenciesPage
- Buttons (static labels): + Register Agency
- Popups: AdminDialog, DeleteDialog
- Data calls: agenciesApi
- Hooks: useAdminData

### SuperApiManagementPage
- Buttons (static labels): —
- Popups: —
- Data calls: healthApi, systemConfigApi
- Hooks: —

### SuperDashboardPage
- Buttons (static labels): —
- Popups: —
- Data calls: bookingsApi, dashboardApi, guidesApi, revenueApi, travelersApi, tripsApi
- Hooks: useAdminData, useSession

### SuperPaymentMethodsPage
- Buttons (static labels): —
- Popups: AdminDialog
- Data calls: paymentsApi, systemConfigApi
- Hooks: —

### SuperProfilePage
- Buttons (static labels): —
- Popups: —
- Data calls: adminsApi
- Hooks: useAdminData, useSession

### SuperReportsPage
- Buttons (static labels): —
- Popups: —
- Data calls: bookingsApi, dashboardApi, revenueApi, reviewsApi, tripsApi
- Hooks: useAdminData

### SuperRevenuePage
- Buttons (static labels): —
- Popups: AdminDialog
- Data calls: revenueApi
- Hooks: useAdminData

### SuperRulesConfigPage
- Buttons (static labels): —
- Popups: —
- Data calls: systemConfigApi
- Hooks: —

### SuperUsersPage
- Buttons (static labels): —
- Popups: AdminDialog, DeleteDialog
- Data calls: getStoredUserId, guidesApi, superUsersApi, travelersApi
- Hooks: useAdminData

### SupportDashboardPage
- Buttons (static labels): —
- Popups: SupportCreateTicketModal, SupportTicketDetailModal
- Data calls: dashboardApi, supportTicketsApi, travelersApi
- Hooks: useNavigate, useSession

### SupportMessagesPage
- Buttons (static labels): —
- Popups: —
- Data calls: messagesApi, travelersApi
- Hooks: useNavigate, useSearchParams, useSession

### SupportProfilePage
- Buttons (static labels): —
- Popups: —
- Data calls: supportUsersApi
- Hooks: useSession

### SupportRefundsPage
- Buttons (static labels): —
- Popups: SupportCreateRefundModal, SupportRefundDetailModal
- Data calls: bookingsApi, paymentsApi, refundsApi, travelersApi
- Hooks: useSearchParams

### SupportTicketsPage
- Buttons (static labels): —
- Popups: SupportCreateTicketModal, SupportTicketDetailModal
- Data calls: supportTicketsApi, travelersApi
- Hooks: useNavigate, useRealtimeEvent, useSession

### TravelerBookingsPage
- Buttons (static labels): Reset Filters ↺, Retry Connection ↺, Retry Trip Confirmation ↺, ↻ Refresh Records
- Popups: BookingCancelModal, BookingDetailModal, PaymentModal
- Data calls: bookingsApi, reviewsApi, tripsApi
- Hooks: useRealtimeEvent, useSession

### TravelerCreateTripPage
- Buttons (static labels): Retry Guides ↺
- Popups: —
- Data calls: apiPost, bookingsApi, guidesApi, packagesApi, tripsApi
- Hooks: useSearchParams, useSession

### TravelerDashboardPage
- Buttons (static labels): —
- Popups: —
- Data calls: dashboardApi
- Hooks: useSession

### TravelerExpensesPage
- Buttons (static labels): + Add Expense, ⬇ Export CSV
- Popups: ExpenseFormModal
- Data calls: expensesApi, tripsApi
- Hooks: useSession

### TravelerMessagesPage
- Buttons (static labels): —
- Popups: —
- Data calls: guidesApi, messagesApi
- Hooks: useSession

### TravelerPackagesPage
- Buttons (static labels): —
- Popups: —
- Data calls: ApiError, packagesApi
- Hooks: useNavigate

### TravelerProfilePage
- Buttons (static labels): Retry Passengers ↺
- Popups: PassengerFormModal
- Data calls: passengersApi, travelersApi
- Hooks: useSession

### TravelerSupportPage
- Buttons (static labels): —
- Popups: —
- Data calls: bookingsApi, supportTicketsApi
- Hooks: useSession

### TravelerTripsPage
- Buttons (static labels): ↻ Refresh
- Popups: TripCancelModal, TripEditModal
- Data calls: itinerariesApi, tripsApi
- Hooks: useSearchParams, useSession

### Visible controls per page (crawl, desktop, signed in as the page's actor)

| Actor | Page | Buttons | Inputs |
|---|---|---|---|
| public | / | 1 | 3 |
| public | /about | 0 | 0 |
| public | /contact | 1 | 3 |
| public | /portal-select | 0 | 0 |
| public | /login | 11 | 2 |
| public | /signup/traveler | 3 | 7 |
| public | /signup/agency | 3 | 5 |
| public | /unauthorized | 0 | 0 |
| public | /does-not-exist | 0 | 0 |
| traveler | /traveler/dashboard | 4 | 0 |
| traveler | /traveler/packages | 24 | 4 |
| traveler | /traveler/plan | 4 | 0 |
| traveler | /traveler/create-itinerary | 4 | 0 |
| traveler | /traveler/trips | 10 | 1 |
| traveler | /traveler/bookings | 4 | 3 |
| traveler | /traveler/expenses | 5 | 1 |
| traveler | /traveler/profile | 6 | 7 |
| traveler | /traveler/support | 5 | 7 |
| traveler | /traveler/messages | 5 | 2 |
| guide | /guide/dashboard | 4 | 0 |
| guide | /guide/requests | 7 | 2 |
| guide | /guide/travelers | 4 | 1 |
| guide | /guide/completed-trips | 7 | 2 |
| guide | /guide/reviews | 10 | 2 |
| guide | /guide/messages | 6 | 2 |
| guide | /guide/profile | 5 | 0 |
| admin | /admin/dashboard | 4 | 0 |
| admin | /admin/bookings | 4 | 2 |
| admin | /admin/trips | 4 | 2 |
| admin | /admin/packages | 27 | 1 |
| admin | /admin/agencies | 11 | 2 |
| admin | /admin/guides | 10 | 1 |
| admin | /admin/reviews | 4 | 2 |
| admin | /admin/reports | 12 | 2 |
| admin | /admin/profile | 5 | 2 |
| support | /support/dashboard | 5 | 0 |
| support | /support/tickets | 4 | 3 |
| support | /support/refunds | 4 | 2 |
| support | /support/messages | 6 | 2 |
| support | /support/profile | 4 | 3 |
| agency | /agency/dashboard | 13 | 0 |
| agency | /agency/packages | 13 | 7 |
| agency | /agency/book-package | 7 | 4 |
| agency | /agency/trips | 11 | 3 |
| agency | /agency/create-trip | 7 | 6 |
| agency | /agency/create-itinerary | 11 | 3 |
| agency | /agency/itinerary | 11 | 3 |
| agency | /agency/bookings | 4 | 2 |
| agency | /agency/passengers | 5 | 1 |
| agency | /agency/expenses | 4 | 1 |
| agency | /agency/commission | 9 | 1 |
| agency | /agency/revenue | 9 | 1 |
| agency | /agency/payments | 7 | 1 |
| agency | /agency/subscription | 13 | 0 |
| agency | /agency/messages | 4 | 1 |
| agency | /agency/profile | 4 | 8 |
| agency | /agency/support | 5 | 0 |
| superuser | /super/dashboard | 4 | 0 |
| superuser | /super/revenue | 10 | 3 |
| superuser | /super/users | 22 | 2 |
| superuser | /super/agencies | 12 | 2 |
| superuser | /super/payment-methods | 9 | 6 |
| superuser | /super/rules-config | 4 | 10 |
| superuser | /super/api-management | 21 | 1 |
| superuser | /super/reports | 4 | 0 |
| superuser | /super/profile | 5 | 2 |

## 4. API endpoints (166)

Grouped by controller. "Who" is the `@Roles` list after the audit; public = no login needed.

- `GET /health`
- `GET /health/ready`
- `GET /ready`
- `POST /auth/register/traveler`
- `POST /auth/register/agency`
- `POST /auth/login`
- `POST /auth/traveler-login`
- `POST /auth/staff-login`
- `POST /auth/agency-login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `GET /auth/me`
- `GET /travelers`
- `GET /travelers/:id`
- `POST /travelers`
- `PUT /travelers/:id`
- `DELETE /travelers/:id`
- `GET /guides`
- `GET /guides/:id`
- `POST /guides`
- `PUT /guides/:id`
- `DELETE /guides/:id`
- `GET /packages`
- `GET /packages/agency/:agencyId`
- `GET /packages/:id`
- `POST /packages`
- `PUT /packages/:id`
- `DELETE /packages/:id`
- `GET /trips`
- `GET /trips/:id`
- `GET /trips/traveler/:travelerId`
- `GET /trips/guide/:guideId`
- `GET /trips/agency/:agencyId`
- `POST /trips`
- `PUT /trips/:id`
- `PATCH /trips/:id`
- `PATCH /trips/:id/status`
- `DELETE /trips/:id`
- `GET /bookings`
- `GET /bookings/:id`
- `GET /bookings/traveler/:travelerId`
- `GET /bookings/agency/:agencyId`
- `GET /bookings/guide/:guideId`
- `POST /bookings`
- `PUT /bookings/:id`
- `DELETE /bookings/:id`
- `GET /bookings/:id/cancellation-preview`
- `POST /bookings/:id/cancel`
- `POST /bookings/:id/emergency-override`
- `POST /bookings/:id/approve-override`
- `GET /itineraries/trip/:tripId`
- `POST /itineraries`
- `PUT /itineraries/:id`
- `DELETE /itineraries/:id`
- `GET /expenses/trip/:tripId`
- `GET /expenses/trip/:tripId/budget-gauge`
- `POST /expenses`
- `PUT /expenses/:id`
- `DELETE /expenses/:id`
- `GET /payments`
- `GET /payments/:id`
- `GET /payments/booking/:bookingId`
- `GET /payments/agency/:agencyId`
- `POST /payments`
- `POST /payments/intent`
- `POST /payments/webhook`
- `GET /api/admin/revenue/overview`
- `GET /api/admin/revenue/analytics/settled`
- `GET /api/admin/revenue/breakdown`
- `GET /api/admin/revenue/transactions`
- `GET /api/admin/revenue/config`
- `PUT /api/admin/revenue/config/:key`
- `GET /api/agencies/:id/revenue`
- `GET /system-config/policy`
- `PUT /system-config/policy`
- `GET /system-config/rules`
- `PUT /system-config/rules`
- `GET /system-config/history`
- `GET /system-config/payment-methods`
- `PUT /system-config/payment-methods/:id`
- `GET /system-config/integrations`
- `PUT /system-config/integrations/:id`
- `GET /system-config/audit-logs`
- `GET /super/admins`
- `POST /super/admins`
- `PATCH /super/admins/:id/status`
- `DELETE /super/admins/:id`
- `GET /super/support-users`
- `POST /super/support-users`
- `PATCH /super/support-users/:id/status`
- `DELETE /super/support-users/:id`
- `GET /refunds`
- `GET /refunds/:id`
- `GET /refunds/agency/:agencyId`
- `POST /refunds`
- `PATCH /refunds/:id/status`
- `GET /reviews`
- `GET /reviews/guide/:guideId/stats`
- `GET /reviews/:id`
- `GET /reviews/trip/:tripId`
- `GET /reviews/guide/:guideId`
- `POST /reviews`
- `POST /reviews/:id/response`
- `DELETE /reviews/:id`
- `GET /support-tickets`
- `GET /support-tickets/:id`
- `GET /support-tickets/traveler/:travelerId`
- `GET /support-tickets/agency/:agencyId`
- `POST /support-tickets`
- `PATCH /support-tickets/:id/assign`
- `POST /support-tickets/:id/notes`
- `POST /support-tickets/:id/adjudicate-refund`
- `POST /support-tickets/:id/reply`
- `PATCH /support-tickets/:id/status`
- `DELETE /support-tickets/:id`
- `GET /messages`
- `GET /messages/user/:userType/:userId`
- `GET /messages/conversation`
- `POST /messages`
- `PATCH /messages/:id/read`
- `GET /dashboard/admin`
- `GET /dashboard/superuser`
- `GET /dashboard/traveler/:travelerId`
- `GET /dashboard/guide/:guideId`
- `GET /dashboard/support`
- `GET /dashboard/agency/:agencyId`
- `POST /agencies/register`
- `POST /agencies`
- `GET /agencies/lookup`
- `GET /agencies`
- `GET /agencies/:id`
- `PATCH /agencies/:id/status`
- `PATCH /agencies/:id`
- `DELETE /agencies/:id`
- `GET /api/agency/passengers`
- `GET /api/agency/commissions`
- `GET /api/agency/profile`
- `PATCH /api/agency/profile`
- `PATCH /api/agency/trips/:id`
- `GET /api/agency/support/:id`
- `POST /api/agency/support/:id/reply`
- `POST /passengers`
- `GET /passengers`
- `GET /passengers/:id`
- `GET /passengers/traveler/:travelerId`
- `GET /passengers/agency/:agencyId`
- `PATCH /passengers/:id`
- `DELETE /passengers/:id`
- `GET /admins/audit-logs`
- `PATCH /admins/guides/:id/verify`
- `GET /admins/:id`
- `PUT /admins/:id`
- `GET /support-users/:id`
- `PUT /support-users/:id`
- `POST /uploads/attachment`
- `GET /uploads/signed/:filename`
- `GET /api/subscriptions/plans`
- `GET /api/agencies/:id/subscription`
- `POST /api/subscriptions`
- `GET /api/promotions`
- `POST /api/promotions`
- `GET /notifications`
- `PATCH /notifications/:id/read`
- `PATCH /notifications/read-all`

Swagger (interactive API docs) runs at `http://localhost:3001/api` when the server is on.

## 5. Data collections (business data, `back-end/src/data`)

admins, agencies, agency-subscriptions, bookings, commission-ledger, expenses, featured-listings, guides, itineraries, messages, package-bookings, packages, passengers, payments, refunds, revenue-config, revenue-transactions, reviews, subscription-plans, support-tickets, support-users, system-config, travelers, trips.

Seed sizes (start of a fresh run): 2 travelers, 2 guides, 11 packages, 2 agencies, 1 trip, 1 booking. Login store has 6 accounts (one per actor).

ID model (important, fixed in this audit): one **account id** per login (1–6) and a separate **profile id** per role (for example Arjun = account 3, traveler 1). The token now carries the profile id as `pid`.

## 6. Business rules found in code

- Booking states: DRAFT → HELD (15-minute hold) → PAID → CONFIRMED → COMPLETED; also CANCELLED, EXPIRED, REFUNDED. Moves are checked by `BookingStateMachine`.
- Trip states: Planning → Pending → Confirmed → Active → Completed; Cancelled.
- Guide request: Pending → Accepted / Declined. Calendar blocks overlapping dates.
- Lead time: trips must start at least 24 hours ahead.
- Cancellation: allowed until 12 hours before departure; ≥72 hours: 65% refund; 12–72 hours: 0% (50% if cancellation protection was bought). Refund is only on the amount actually paid.
- Payments: method must be switched on by superuser; single booking ceiling (`bookingLimit`); one paid payment per booking; auto-confirm on payment when `autoConfirm` is on.
- Reviews: only after a completed booking, one per booking, guide taken from the trip.
- Agencies: must be approved before they can sign in; commission recorded per booking.

## 7. External connections

| Connection | Status |
|---|---|
| Payment gateway | Test mode / simulated (`gateway-payment.service.ts`, signed webhooks) |
| Email | Mock: written to the log (`EMAIL-DISPATCH-MOCK`) |
| File uploads | Local disk with a virus-scan hook (`src/uploads`) |
| PostgreSQL (Prisma) | Optional; not running in this audit; schema had drifted from migrations |
| Live updates | socket.io, token-authenticated, role-scoped rooms |
