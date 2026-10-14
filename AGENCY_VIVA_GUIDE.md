# GlobeSync — Agency Module React Evaluation & Viva Guide

This comprehensive guide is prepared for technical evaluation and oral viva examination of the **Travel Agency Partner Module** in GlobeSync. It documents the actual React components, backend REST contracts, ownership validation, state structures, recovery mechanisms, and business calculation rules.

---

## 1. Architectural Philosophy & Evaluation Pitch

When asked to summarize the architecture of the Agency module:

> *"The Travel Agency partner module is an enterprise reseller portal built with React 18 functional components, declarative JSX, controlled inputs, and vanilla CSS tokens without third-party form libraries or heavy Redux/MobX state abstractions. Each feature page maintains its own state and consumes backend REST endpoints using standard `fetch` enhanced with `AbortController` cleanup to guarantee race-condition freedom. Identity and authorization are managed globally via `SessionContext`, while strict multi-tenant ownership (`x-user-role: agency` and `x-user-id: <agencyId>`) is validated both client-side and enforced server-side by NestJS `RolesGuard`. Simulated corporate ledger accounting distinguishes in-memory partner billing from live payment gateways, and package booking workflows incorporate crash recovery to prevent orphaned client bookings."*

---

## 2. Directory Structure & Component Paths

```text
front-end/src/
├── App.jsx                                     # Protected route definitions and route access guards
├── context/
│   └── SessionContext.jsx                     # Partner authentication session state and credentials
├── layouts/
│   ├── DashboardLayout.jsx                    # Core agency dashboard shell and role navigation menu
│   └── PublicLayout.jsx                       # Public header/footer layout
├── services/
│   └── api.js                                 # Centralized API service layer with role header injection
├── pages/public/
│   └── AgencySignupPage.jsx                   # Public B2B partner registration screen
├── pages/agency/
│   ├── AgencyDashboardPage.jsx                # Reseller KPI summary, live metrics, and quick actions
│   ├── AgencyPackagesPage.jsx                 # Wholesale package catalog with partner margin previews
│   ├── AgencyBookPackagePage.jsx              # Resale booking wizard with crash recovery & insurance
│   ├── AgencyBookingsPage.jsx                 # Client booking oversight and financial inspection
│   ├── AgencyPassengersPage.jsx               # Agency-owned passenger roster CRUD
│   ├── AgencyItineraryPage.jsx                # Custom client itinerary and trip planner
│   ├── AgencyPaymentsPage.jsx                 # Corporate payments & refund settlements ledger
│   ├── AgencyExpensesPage.jsx                 # Trip spend accounting and operational expense logging
│   ├── AgencyCommissionPage.jsx               # Commission ledger & net earnings statement
│   ├── AgencySubscriptionPage.jsx             # Platform reseller tiers & featured package promotions
│   ├── AgencyMessagesPage.jsx                 # Coordination channels with guides and support desk
│   ├── AgencyProfilePage.jsx                  # Partner corporate profile and business identity
│   └── AgencySupportPage.jsx                  # Helpdesk ticketing and partner operational FAQ
└── components/agency/
    ├── PassengerModal.jsx                     # Controlled dialog for creating & editing roster passengers
    └── BookingDetailModal.jsx                 # Dialog displaying itemized booking fees & commission margins
```

---

## 3. Workflow-by-Workflow Code Walkthrough

### Workflow 1: Registration, Approval, Login & Dashboard
- **Public Registration (`AgencySignupPage.jsx`)**:
  - Endpoint: `POST /agencies/register` via `authApi.registerAgency`.
  - Body: `{ businessName, contactEmail, contactPhone, password }`.
  - Automatically enters `status: 'pending'`. The page displays an informative success banner explaining that platform administrators review and approve accounts prior to activation.
- **Login Journey (`LoginPage.jsx`)**:
  - Endpoint: `POST /auth/agency-login` via `authApi.loginAgency`.
  - Backend rule: Rejects pending agency accounts with `401 Unauthorized` (`"Agency account is pending approval. Only approved agencies can log in."`).
  - Upon approved login (`status: 'approved'`), stores authenticated user `{ agencyId, businessName, contactEmail, commissionRate, role: 'agency' }` in `SessionContext`.
- **Live Dashboard (`AgencyDashboardPage.jsx`)**:
  - Endpoint: `GET /dashboard/agency/:agencyId` via `dashboardApi.getAgency`.
  - Displays KPIs: Active Client Bookings, Registered Roster Passengers, Pending Commission, and Settled Commission.
  - Displays recent client bookings, quick booking buttons, and mini package catalog preview.

### Workflow 2: Agency-Owned Passenger CRUD
- **Roster Page (`AgencyPassengersPage.jsx`) & Modal (`PassengerModal.jsx`)**:
  - Endpoint: `GET /passengers/agency/:agencyId` via `passengersApi.getByAgency`.
  - Create: `POST /passengers` with `{ name, age, gender, agencyId }`.
  - Edit: `PATCH /passengers/:id` with `{ name, age, gender, agencyId }`.
  - Delete: `DELETE /passengers/:id` with confirmation dialog.
- **Multi-Tenant Ownership Rule**:
  - `RolesGuard.enforceAgencyPassengerOwnership`: Verifies that `passenger.agencyId === Number(userId)`. Attempting to access, edit, or delete another agency's passenger immediately throws `403 Forbidden`.

### Workflow 3: Package Browsing & Resale Booking Wizard
- **Wholesale Catalog (`AgencyPackagesPage.jsx`)**:
  - Endpoint: `GET /packages` via `packagesApi.getAll`.
  - Live margin calculation: Displays retail price and calculates agency reseller margin `price * (commissionRate / 100)` based on the agency's contracted rate.
- **Booking Wizard (`AgencyBookPackagePage.jsx`)**:
  - Step 1: Package selection & trip dates.
  - Step 2: Passenger assignment from agency roster (with inline quick-add passenger option).
  - Step 3: Mandatory 7% travel insurance calculation, optional 5% cancellation protection, and wholesale cost breakdown.
  - Step 4: Atomic creation of `POST /trips` with `agencyId` followed by `POST /bookings` with `agencyId, tripId, amount`.
  - **Crash / Interruption Recovery**: If trip creation succeeds but network disconnects before booking is recorded, the wizard stores the generated `tripId` in `sessionStorage` (`globesync_pending_agency_trip`), allowing the agency partner to resume without generating duplicate orphan trips.

### Workflow 4: Trip / Itinerary & Client Booking Views
- **Bookings View (`AgencyBookingsPage.jsx`)**:
  - Endpoint: `GET /bookings/agency/:agencyId` via `bookingsApi.getByAgency`.
  - Inspect dialog (`BookingDetailModal.jsx`): Shows itemized base fare, transport breakdown, mandatory travel insurance (7%), optional cancellation protection, recorded payment status, and calculated agency commission.
- **Itinerary Planner (`AgencyItineraryPage.jsx`)**:
  - Endpoint: `GET /trips/agency/:agencyId` via `tripsApi.getByAgency`.
  - Enables creating custom client itineraries with optional licensed guide assignment.
  - Preserves backend rule: Exactly one owner per trip (`!!travelerId !== !!agencyId`).

### Workflow 5: Payments, Refunds, Expenses, Commissions & Revenue
- **Payments Ledger (`AgencyPaymentsPage.jsx`)**:
  - Endpoints: `GET /payments/agency/:agencyId` and `GET /refunds/agency/:agencyId`.
  - Transparency Notice: Emphasizes that transactions reflect simulated corporate ledger confirmations and not real bank or card processing.
  - Cross-references payments with active refund requests (`Processing` vs `Completed`).
- **Trip Expenses (`AgencyExpensesPage.jsx`)**:
  - Endpoint: `GET /expenses/trip/:tripId` and `POST /expenses`.
  - Category breakdown: Hotel, Flight, Transport, Food, Activity, Shopping with visual percentage progress tracks.
- **Commission & Revenue Statement (`AgencyCommissionPage.jsx`)**:
  - Endpoints: `dashboardApi.getAgency` and `/api/agencies/:id/revenue`.
  - Contract Commission Rate: Read accurately from backend records (e.g. `1.5%` or `10%`) without fallback substitutions.
  - Settlement lifecycle: Explicitly distinguishes **Pending Commission** (client trips currently in progress) from **Settled Commission** (trips marked `Completed`).

### Workflow 6: Messages, Support, Profile, Subscriptions & Promotions
- **Partner Messages (`AgencyMessagesPage.jsx`)**:
  - Endpoint: `GET /messages/user/agency/:agencyId` and `POST /messages`.
  - DTO conformance: Sends `{ sender: 'agency', senderId, receiver, receiverId, content }`.
  - Direct conversation channels with assigned tour guides and GlobeSync Customer Care Desk.
- **Support Helpdesk (`AgencySupportPage.jsx`)**:
  - Endpoints: `GET /support-tickets/agency/:agencyId` and `POST /support-tickets`.
  - Issue categories: Commission query, booking discrepancy, passenger roster changes, cancellation assistance.
- **Agency Profile (`AgencyProfilePage.jsx`)**:
  - Endpoints: `GET /agencies/:id` and `PATCH /agencies/:id`.
  - Editable business attributes: `businessName`, `contactEmail`, `contactPhone`, optional password reset.
  - Propagates updates immediately to active `SessionContext` without requiring manual page reload.
- **Subscriptions & Promotions (`AgencySubscriptionPage.jsx`)**:
  - Endpoints: `GET /api/subscriptions/plans`, `GET /api/agencies/:id/subscription`, `POST /api/subscriptions`.
  - Featured Promotions: `GET /api/promotions`, `POST /api/promotions` with placement types `HOMEPAGE` and `SEARCH_RESULT`.

---

## 4. Multi-Tenant RBAC & Ownership Matrix

| Endpoint | Method | Permitted Roles | Multi-Tenant Ownership Check |
| :--- | :--- | :--- | :--- |
| `/agencies/register` | `POST` | Public | Status set to `pending` |
| `/auth/agency-login` | `POST` | Public | Rejects with `401` if status is not `approved` |
| `/agencies/:id` | `GET`, `PATCH` | `agency`, `admin`, `superuser` | Agency can only access `:id === agencyId` (`403` otherwise) |
| `/passengers/agency/:id` | `GET` | `agency`, `admin`, `superuser` | Agency can only access `:id === agencyId` |
| `/passengers/:id` | `PATCH`, `DELETE` | `agency`, `traveler`, `superuser` | Verified against passenger's stored `agencyId` |
| `/trips/agency/:id` | `GET` | `agency`, `admin`, `superuser` | Agency can only access `:id === agencyId` |
| `/bookings/agency/:id` | `GET` | `agency`, `admin`, `superuser` | Agency can only access `:id === agencyId` |
| `/payments/agency/:id` | `GET` | `agency`, `admin`, `superuser` | Agency can only access `:id === agencyId` |
| `/refunds/agency/:id` | `GET` | `agency`, `admin`, `superuser` | Agency can only access `:id === agencyId` |
| `/expenses/trip/:tripId` | `GET`, `POST` | `agency`, `traveler`, `admin`, `superuser` | Agency verified as owner of `tripId` |
| `/api/agencies/:id/revenue` | `GET` | `agency`, `admin`, `superuser` | Agency can only access `:id === agencyId` |
| `/messages/user/agency/:id` | `GET` | `agency`, `admin`, `superuser` | Agency can only access `:id === agencyId` |
| `/support-tickets/agency/:id` | `GET`, `POST` | `agency`, `admin`, `superuser` | Agency can only access `:id === agencyId` |
| `/api/subscriptions` | `POST` | `agency`, `admin`, `superuser` | Agency `body.agencyId` must match session `:id` |
| `/api/promotions` | `POST` | `agency`, `admin`, `superuser` | Agency `body.agencyId` must match session `:id` |

---

## 5. Defense Q&A for Technical Evaluation

### Q1: How does the agency module prevent one agency from modifying or viewing another agency's client passengers?
**Answer**: Multi-tenancy is enforced on two layers:
1. **Frontend Isolation**: Requests to `/passengers/agency/${agencyId}` parameterize the agency's authenticated ID from `useSession()`, and client-side actions filter lists accordingly.
2. **Backend Guarding (`RolesGuard`)**: The backend inspects `x-user-role` and `x-user-id`. In `RolesGuard.enforceAgencyPassengerOwnership()`, the backend looks up the passenger record in data storage and ensures `passenger.agencyId === userId`. If an agency attempts to access or modify passenger `#5` owned by agency `#2`, the server aborts the pipeline and returns `403 Forbidden` (`"Access denied. You can only access your own resources."`).

### Q2: How does the package booking workflow prevent duplicate trips if the network fails during booking creation?
**Answer**: In `AgencyBookPackagePage.jsx`, booking a package requires two atomic steps: creating the operational trip (`POST /trips`) followed by the financial booking record (`POST /bookings`). If the network disconnects after the trip is created, the trip ID is safely stashed in `sessionStorage` under `globesync_pending_agency_trip`. Upon reconnect or retry, the component inspects this storage key, skips re-creating the trip, and directly attaches the new booking to the existing trip ID.

### Q3: Why does the Payments Ledger display a transparency notice regarding simulated corporate billing?
**Answer**: GlobeSync does not connect to a real banking gateway (such as Stripe or Razorpay) for agency wholesale settlements in this demonstration environment. Recording payments in `payments` reflects in-memory corporate invoice simulations. Claiming real credit card processing or live bank transfers would misrepresent the system architecture. The page explicitly informs users that all transactions represent sandbox accounting.

### Q4: How are commission rates and settlement transitions handled?
**Answer**: Each agency record contains a contract `commissionRate` (e.g. `1.5%` or `10%`). When calculating reseller margins, the frontend reads the actual stored numeric rate rather than defaulting with `value || 10`, which would corrupt zero or low percentage rates. Furthermore, commissions remain in `Pending` state while client trips are ongoing, and are automatically transitioned to `Settled` when the trip status reaches `Completed`.

### Q5: How are component lifecycle effects and race conditions handled when navigating between pages?
**Answer**: Every asynchronous effect in the agency module creates an instance of `AbortController` passed to the API call signal (`{ signal: controller.signal }`). During component unmount or fast tab switching, `controller.abort()` is called in the `useEffect` cleanup return. This ensures that in-flight network requests do not attempt to trigger `setState` on unmounted components or overwrite current views with stale responses.

---

## 6. Verification & Build Confirmation

- **Vite Production Bundle**: `npm run build` completed cleanly in `3.02s` transforming 173 modules with zero errors.
- **End-to-End Test Suite**: `scratch/verify_agency_e2e.js` executed 33 comprehensive verification checks across all 6 workflows:
  - Public registration & pending approval status.
  - Login denial for unapproved agencies & successful login for approved agencies.
  - Dashboard live KPI loading & cross-agency access rejection (`403`).
  - Passenger CRUD & cross-agency passenger tampering rejection (`403`).
  - Package browsing, trip creation, and booking listing.
  - Trip oversight & cross-agency trip inspection rejection (`403`).
  - Payments & refunds listing, cross-agency payments access rejection (`403`).
  - Trip expense logging and category calculation.
  - Agency revenue breakdown & cross-agency revenue access rejection (`403`).
  - Direct guide communication via `content` DTO.
  - Support ticket creation & retrieval.
  - Profile update & cross-agency profile tampering rejection (`403`).
  - Active subscription tier management & featured promotion listing.
  - **Result: 33 Passed, 0 Failed.**
