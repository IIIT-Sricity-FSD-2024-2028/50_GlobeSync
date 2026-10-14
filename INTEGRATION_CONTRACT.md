# GlobeSync — Multi-Actor Integration Contract

> **Target Audience**: Team members developing separated actor portals (Traveler, Guide, Customer Support, Admin, Superuser, Agency) on separate machines.  
> **Purpose**: Establish strict boundaries, shared contracts, and integration procedures to prevent merge conflicts, broken state, or overwritten features.

---

## 1. Actor Boundaries & File Placement

To keep modules completely independent and allow parallel development across devices:

| Actor | Owned Pages Directory | Owned Feature Components | Primary Developer |
| :--- | :--- | :--- | :--- |
| **Traveler** | `front-end/src/pages/traveler/` | `components/trips/`, `components/bookings/`, `components/expenses/`, `components/itineraries/`, `components/packages/`, `components/passengers/`, `components/profile/`, `components/support/`, `components/messages/` | Assigned to Current Workspace |
| **Guide** | `front-end/src/pages/guide/` | `components/guide/` *(or actor-specific subfolders)* | Teammate Device |
| **Customer Support** | `front-end/src/pages/support/` | `components/support/` *(staff-facing queues)* | Teammate Device |
| **Admin** | `front-end/src/pages/admin/` | `components/admin/` | Teammate Device |
| **Superuser** | `front-end/src/pages/super/` | `components/super/` | Teammate Device |
| **Agency** | `front-end/src/pages/agency/` | `components/agency/` | Teammate Device |
| **Public & Auth** | `front-end/src/pages/public/` | `components/common/` | Shared / Collaborative |

### Rules for Modification:
1. **Confine actor logic**: Traveler work must stay inside `src/pages/traveler/` and the components dedicated to traveler views.
2. **Never delete or overwrite another actor’s files**: Do not touch `src/pages/guide/`, `src/pages/support/`, `src/pages/admin/`, `src/pages/super/`, or `src/pages/agency/`.
3. **Shared files require minimal, atomic edits**: [`src/App.jsx`](file:///c:/Users/aasht/50_GlobeSync/front-end/src/App.jsx), [`src/context/SessionContext.jsx`](file:///c:/Users/aasht/50_GlobeSync/front-end/src/context/SessionContext.jsx), [`src/services/api.js`](file:///c:/Users/aasht/50_GlobeSync/front-end/src/services/api.js), and [`src/layouts/DashboardLayout.jsx`](file:///c:/Users/aasht/50_GlobeSync/front-end/src/layouts/DashboardLayout.jsx) are shared. When adding a route or export, append only your actor's entries; do not replace existing routes or change common signatures.

---

## 2. SessionContext Interface & Actor Identity

Authentication state is centralized in [`src/context/SessionContext.jsx`](file:///c:/Users/aasht/50_GlobeSync/front-end/src/context/SessionContext.jsx). Do not introduce secondary auth providers, custom storage keys, or Redux.

### Context Value Signature
```javascript
const {
  user,            // Active user object restored from localStorage.getItem('user')
  role,            // String: 'traveler' | 'guide' | 'support' | 'admin' | 'superuser' | 'agency'
  isAuthenticated, // Boolean: Boolean(role && user)
  login,           // Function: login(newRole, newUser) -> saves to localStorage and state
  logout,          // Function: logout() -> removes keys and resets state
  updateUser,      // Function: updateUser(updatedFields) -> merges fields into user and persists
  getDashboardPath // Helper: () => string (returns role-specific dashboard path)
} = useSession();
```

### Identifier Keys Recognized Across Actors
The backend uses different ID fields for different actors. `SessionContext` and `api.js` automatically normalize these:

| Actor Role | Primary Key Field on User Object | Stored Key Examples |
| :--- | :--- | :--- |
| `traveler` | `user.travelerId` | `travelerId`, `traveler_id`, `id` |
| `guide` | `user.guideId` | `guideId`, `guide_id`, `id` |
| `support` | `user.careId` | `careId`, `care_id`, `id` |
| `admin` | `user.adminId` | `adminId`, `admin_id`, `id` |
| `superuser` | `user.adminId` | `adminId`, `admin_id`, `id` |
| `agency` | `user.agencyId` | `agencyId`, `agency_id`, `id` |

### Profile Synchronization:
When updating a profile in any portal, always call `updateUser({ name: 'New Name', ... })` immediately after the backend PUT/PATCH call succeeds to keep the header and sidebar in sync without requiring page reloads.

---

## 3. RolesGuard & Request Header Contract

The NestJS backend enforces role-based access control via `RolesGuard` ([`back-end/src/auth/guards/roles.guard.ts`](file:///c:/Users/aasht/50_GlobeSync/back-end/src/auth/guards/roles.guard.ts)).

### Required HTTP Request Headers
Every request to protected backend endpoints must carry:
1. `Content-Type: application/json`
2. `x-user-role: <role>` (`traveler`, `guide`, `support`, `admin`, `superuser`, or `agency`)
3. `x-user-id: <id>` (Stringified numeric ID, e.g. `'1'`)

> [!IMPORTANT]
> The centralized helper [`front-end/src/services/api.js`](file:///c:/Users/aasht/50_GlobeSync/front-end/src/services/api.js) automatically injects `x-user-role` and `x-user-id` from active session storage. You do not need to construct these headers manually when using `apiGet`, `apiPost`, `apiPut`, `apiPatch`, or the feature API modules.

### Ownership Constraints
* **Self-Scoped Enforcement**:
  * `GET/PUT /travelers/:id` requires `:id === x-user-id` and `x-user-role === 'traveler'` (or `'superuser'`).
  * `GET /trips/traveler/:travelerId` requires `:travelerId === x-user-id`.
  * `GET /bookings/traveler/:travelerId` requires `:travelerId === x-user-id`.
  * `GET /passengers/traveler/:travelerId` requires `:travelerId === x-user-id`.
  * `GET /dashboard/traveler/:travelerId` requires `:travelerId === x-user-id`.
  * `POST /trips` and `POST /bookings` require payload `travelerId` to match `x-user-id`.
* **Cross-Actor Restrictions**:
  * Travelers cannot inspect or edit trips belonging to other travelers.
  * Guides can only view trips where `guideId === x-user-id`.
  * Agencies can only view/mutate bookings and passengers where `agencyId === x-user-id`.
  * Superusers bypass read restrictions across operational entities.

---

## 4. Central API Helper Layer & Error Handling

All HTTP communication must go through [`front-end/src/services/api.js`](file:///c:/Users/aasht/50_GlobeSync/front-end/src/services/api.js).

### Reusable Method Wrappers
```javascript
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from '../../services/api';

// Options accept { signal, headers }
const data = await apiGet('/packages', { signal: controller.signal });
const created = await apiPost('/trips', tripPayload);
const updated = await apiPut(`/trips/${id}`, updatedPayload);
const patched = await apiPatch(`/trips/${id}/status`, { status: 'Confirmed' });
await apiDelete(`/itineraries/${id}`);
```

### Pre-Exported Feature Modules
Do not create duplicate API fetchers. The central service already exports:
* `authApi`: Login & signup endpoints for traveler, staff, agency.
* `travelersApi`: `getById`, `update`, `delete`.
* `passengersApi`: `getAll`, `getById`, `getByTraveler`, `getByAgency`, `create`, `update`, `delete`.
* `packagesApi`: `getAll`, `getById`, `create`, `update`, `delete`.
* `tripsApi`: `getAll`, `getById`, `getByTraveler`, `getByGuide`, `getByAgency`, `create`, `update`, `updateStatus`, `delete`.
* `itinerariesApi`: `getByTrip`, `create`, `update`, `delete`.
* `bookingsApi`: `getAll`, `getById`, `getByTraveler`, `getByAgency`, `create`, `update`, `delete`.
* `expensesApi`: `getByTrip`, `create`, `update`, `delete`.
* `paymentsApi`: `getAll`, `getById`, `getByBooking`, `getByAgency`, `create`.
* `refundsApi`: `getAll`, `getById`, `getByAgency`, `create`, `updateStatus`.
* `guidesApi`: `getAll`, `getById`, `update`.
* `reviewsApi`: `getAll`, `getById`, `getByTrip`, `create`, `delete`.
* `supportTicketsApi`: `getAll`, `getByTraveler`, `getByAgency`, `create`, `updateStatus`.
* `messagesApi`: `getAll`, `getByUser`, `getConversation`, `create`.
* `dashboardApi`: `getAdmin`, `getSuperuser`, `getTraveler`, `getGuide`, `getSupport`, `getAgency`.
* `healthApi`: `check`.

### Error Format Contract (`ApiError`)
The backend returns standard NestJS `GlobalExceptionFilter` payloads:
```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": ["budget must not be less than 0", "duration must not be less than 1"],
  "timestamp": "2026-10-12T11:40:00.000Z",
  "path": "/trips"
}
```
When caught in React components:
```javascript
try {
  await tripsApi.create(payload);
} catch (err) {
  if (err.isCancelled) return; // Ignore AbortController unmount cancellation
  // err.message contains joined validation messages or friendly server error
  // err.status contains HTTP status code (e.g. 400, 403, 404, 500)
  // err.data contains raw response JSON
  setError(err.message);
}
```

---

## 5. Backend DTO Fields & Canonical Status Enums

To avoid runtime validation rejections (`ValidationPipe`), frontend requests must strictly match backend DTO field names and enum values:

| Entity | DTO Name | Required Fields | Optional Fields | Allowed Status / Enum Values |
| :--- | :--- | :--- | :--- | :--- |
| **Trip** | `CreateTripDto`, `UpdateTripDto`, `UpdateTripStatusDto` | `destination` (str), `startDate` (str: YYYY-MM-DD), `endDate` (str: YYYY-MM-DD), `budget` (num >= 0) | `travelerId` (int), `agencyId` (int), `guideId` (int), `packageId` (int), `status` (str), `guideStatus` (str) | **Status**: `'Planning'`, `'Pending'`, `'Confirmed'`, `'Active'`, `'Completed'`, `'Cancelled'` *(Includes 'Active' for guide starting tour)*<br>**Guide Status**: `'Pending'`, `'Accepted'`, `'Declined'` *(Resolves guide acceptance vs payment confirmation)* |
| **Itinerary** | `CreateItineraryDto` | `tripId` (int), `city` (str), `dayNumber` (int >= 1), `activity` (str), `time` (str: HH:mm) | `activityStatus` (str) | **Activity Status**: `'Pending'`, `'Confirmed'`, `'Completed'` |
| **Booking** | `CreateBookingDto` | `bookingDate` (str), `tripId` (num), `service` (str), `type` (str), `amount` (num >= 0) | `travelerId` (num), `agencyId` (num), `status` (str), `insuranceSelected` (bool), `transportMode` (str), `cancellationProtectionSelected` (bool) | **Type**: `'Flight'`, `'Hotel'`, `'Transport'`, `'Activity'`<br>**Status**: `'Pending'`, `'Confirmed'`, `'Cancelled'`<br>*Note: Guides access bookings strictly via scoped `GET /bookings/guide/:guideId` without accessing global bookings or violating authorization.* |
| **Payment** | `CreatePaymentDto` | `amount` (num >= 0), `paymentDate` (str: YYYY-MM-DD), `method` (str) | `status` (str), `bookingId` (num), `tripId` (num), `agencyId` (num) | **Method**: `'Card'`, `'UPI'`, `'Cash'`<br>**Status**: `'Paid'`, `'Pending'` |
| **Expense** | `CreateExpenseDto` | `amount` (num >= 0), `type` (str), `tripId` (int), `description` (str) | None | **Type**: `'Hotel'`, `'Flight'`, `'Transport'`, `'Food'`, `'Activity'`, `'Shopping'` |
| **Refund** | `CreateRefundDto` | `paymentId` (num), `refundDate` (str) | `refundTime` (str), `refundStatus` (str), `agencyId` (num) | **Refund Status**: `'Processing'`, `'Completed'`, `'Rejected'` |
| **Support Ticket** | `CreateTicketDto` | `issueType` (str), `description` (str) | `travelerId` (int), `agencyId` (int), `careId` (int), `priority` (str), `status` (str) | **Priority**: `'High'`, `'Medium'`, `'Low'`<br>**Status**: `'Open'`, `'In Progress'`, `'Resolved'`, `'Closed'` |
| **Message** | `CreateMessageDto` | `sender` (str), `senderId` (int), `receiver` (str), `receiverId` (int), `content` (str) | None | **Actor Types**: `'traveler'`, `'guide'`, `'support'`, `'agency'` |
| **Passenger** | `CreatePassengerDto` | `name` (str), `age` (num), `gender` (str) | `travelerId` (num), `agencyId` (num) | **Gender**: `'Male'`, `'Female'`, `'Other'` |
| **Agency** | `UpdateAgencyStatusDto` | `status` (str) | `commissionRate` (num: 1.0 to 1.5) | **Status**: `'pending'`, `'approved'`, `'rejected'` *(Note: lowercase)* |
| **Revenue Config** | `UpdateRevenueConfigDto` | `value` (num: 0 to 100) | None | Universal bounded percentage rate (0–100%). Strictly rejects non-numeric types, NaN, negative values, and values > 100 with HTTP 400. |

---

## 6. Route Prefixes & Actor Navigation Contract

All routes are registered in [`front-end/src/App.jsx`](file:///c:/Users/aasht/50_GlobeSync/front-end/src/App.jsx) and use clean, dedicated URL prefixes:

```text
/                              -> Public Landing Page (PublicLayout)
/about                         -> About Us
/contact                       -> Contact Form
/portal-select                 -> Role Selection Hub
/login                         -> Unified Login Form
/login/traveler                -> Traveler Login
/login/staff                   -> Staff Login (Admin, Guide, Support)
/login/agency                  -> Travel Agency Login
/login/superuser               -> Superuser Login
/unauthorized                  -> 403 Forbidden Screen

/traveler/*                    -> Traveler Portal (DashboardLayout, protected: traveler, superuser)
  /traveler/dashboard          -> Dashboard overview
  /traveler/packages           -> Catalog browser
  /traveler/plan               -> Multi-step trip planner wizard
  /traveler/trips              -> My travel itineraries & activity CRUD
  /traveler/bookings           -> Bookings & payment executions
  /traveler/expenses           -> Expense breakdown & reports
  /traveler/profile            -> Profile & saved passengers
  /traveler/support            -> Customer support tickets
  /traveler/messages           -> Live direct messages

/guide/*                       -> Guide Portal (DashboardLayout, protected: guide, superuser)
  /guide/dashboard             -> Guide dashboard
  /guide/requests              -> Pending trip requests
  /guide/travelers             -> Assigned travelers
  /guide/completed-trips       -> Completed tours history
  /guide/messages              -> Coordination chat
  /guide/profile               -> Guide profile & settings

/support/*                     -> Support Portal (DashboardLayout, protected: support, superuser)
  /support/dashboard           -> Support metrics
  /support/tickets             -> Ticket management queue
  /support/refunds             -> Refund reviews & approvals
  /support/messages            -> Direct messaging desk

/admin/*                       -> Admin Portal (DashboardLayout, protected: admin, superuser)
  /admin/dashboard             -> Platform analytics & overview
  /admin/bookings              -> Global bookings table
  /admin/trips                 -> Global trips oversight
  /admin/packages              -> Tour package CRUD
  /admin/agencies              -> Partner agency reviews
  /admin/reviews               -> Review moderation
  /admin/reports               -> Revenue & operational reports

/super/*                       -> Superuser Portal (DashboardLayout, protected: superuser ONLY)
  /super/dashboard             -> Root command center
  /super/revenue               -> Platform financials & monetization
  /super/users                 -> Master user directory
  /super/agencies              -> Reseller network management
  /super/reports               -> Telemetry & reports

/agency/*                      -> Travel Agency Portal (DashboardLayout, protected: agency, superuser)
  /agency/dashboard            -> Agency sales & client KPI overview
  /agency/packages             -> B2B catalog browser
  /agency/bookings             -> Client bookings & commissions
  /agency/passengers           -> Offline client roster
  /agency/commission           -> Payout ledger
```

---

## 7. Shared Layouts, Sidebar Menus & CSS Conventions

### Shared Components Inventory
Inspect and use these existing components in [`src/components/common/`](file:///c:/Users/aasht/50_GlobeSync/front-end/src/components/common) instead of rewriting duplicates:
* [`Sidebar.jsx`](file:///c:/Users/aasht/50_GlobeSync/front-end/src/components/common/Sidebar.jsx): Renders navigation items passed as props (`menuItems=[{ label, path, icon }]`), active highlight, user badge, and mobile drawer.
* [`Header.jsx`](file:///c:/Users/aasht/50_GlobeSync/front-end/src/components/common/Header.jsx): Top navigation bar with page title, simulated notification bell, user profile chip, and logout button.
* [`Navbar.jsx`](file:///c:/Users/aasht/50_GlobeSync/front-end/src/components/common/Navbar.jsx): Public landing page top navbar with role login links.
* [`Footer.jsx`](file:///c:/Users/aasht/50_GlobeSync/front-end/src/components/common/Footer.jsx): Public site footer.
* [`StatusBadge.jsx`](file:///c:/Users/aasht/50_GlobeSync/front-end/src/components/common/StatusBadge.jsx): Renders color-coded status pills (`Pending`, `Confirmed`, `Completed`, `Cancelled`, `Open`, `In Progress`, `Resolved`, `Closed`).
* [`Modal.jsx`](file:///c:/Users/aasht/50_GlobeSync/front-end/src/components/common/Modal.jsx): Accessible popup dialog with backdrop, escape key listener, and title header.
* [`Toast.jsx`](file:///c:/Users/aasht/50_GlobeSync/front-end/src/components/common/Toast.jsx): Lightweight auto-dismissing banner for action feedback.
* [`ProtectedRoute.jsx`](file:///c:/Users/aasht/50_GlobeSync/front-end/src/components/common/ProtectedRoute.jsx): Enforces role access and redirects unauthenticated users to `/login`.

### Sidebar Menu Configuration (`ROLE_MENU_CONFIG`)
Actor navigation menus are defined in [`src/layouts/DashboardLayout.jsx`](file:///c:/Users/aasht/50_GlobeSync/front-end/src/layouts/DashboardLayout.jsx):
```javascript
const ROLE_MENU_CONFIG = {
  traveler: [...],
  guide: [...],
  support: [...],
  admin: [...],
  superuser: [...],
  agency: [...]
};
```
Teammates extending a role menu should append items directly to their role's array in `ROLE_MENU_CONFIG`.

### CSS Tokens & Design Standards
Defined in [`src/styles/shared.css`](file:///c:/Users/aasht/50_GlobeSync/front-end/src/styles/shared.css) and [`src/styles/index.css`](file:///c:/Users/aasht/50_GlobeSync/front-end/src/styles/index.css):
* **Colors**:
  * `--primary`: `#E8467C` (Vibrant pink)
  * `--primary-dark`: `#C73568`
  * `--secondary`: `#F5A623` (Warm orange)
  * `--gradient`: `linear-gradient(135deg, #E8467C 0%, #F5A623 100%)`
  * `--bg`: `#ffffff`
  * `--bg-soft`: `#fcfade` (Warm parchment background)
  * `--text-primary`: `#1a1a2e`
  * `--text-secondary`: `#6b7280`
  * `--border`: `#f0e6e6`
* **Typography**: Google Fonts `'Inter', sans-serif`.
* **Standard Classes**:
  * `.card`: White background, border, `border-radius: 16px`, `box-shadow: var(--shadow-sm)`.
  * `.btn`: Standard button base with hover transition.
  * `.btn-primary`: Gradient background with white text.
  * `.btn-secondary`: Light outline button.
  * `.form-group`: Standard vertical label + input container.
  * `.form-control`: Styled input/select field with focus glow.
  * `.table`: Clean stripped data table with padded headers and rounded border.

---

## 8. Multi-Device Git Workflow & Shared Integration Backend

### The In-Memory Backend Gotcha
> [!CAUTION]
> The NestJS backend uses **in-memory arrays** (`packages.data.ts`, `trips.data.ts`, `bookings.data.ts`, etc.) as its datastore.  
> If Developer A runs `npm run start` on `localhost:3000` and Developer B runs `npm run start` on `localhost:3000` on a separate laptop:
> 1. Developer A's created trips exist **only on Developer A's laptop**.
> 2. Developer B cannot see Developer A's data.
> 3. Restarting the backend server **resets all data back to the default seed arrays**.

### Connecting to a Shared Integration Backend via `VITE_API_BASE_URL`
To test cross-actor interactions (e.g. Traveler creates a trip $\rightarrow$ Guide accepts the trip $\rightarrow$ Support reviews ticket for that trip):
1. Choose one designated machine or server to host the Integration NestJS Backend.
2. Find that machine's reachable IP address or hostname (e.g. `http://192.168.1.100:3000` or a deployed host).
3. On your local device, create an uncommitted local environment file:
   ```bash
   # front-end/.env.local
   VITE_API_BASE_URL=http://192.168.1.100:3000
   ```
4. **Never hardcode an IP address into committed code**:
   * [`front-end/src/services/api.js`](file:///c:/Users/aasht/50_GlobeSync/front-end/src/services/api.js) is configured to read:
     ```javascript
     export const API_BASE_URL =
       import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
     ```
   * Keeping this fallback intact guarantees that offline/standalone development continues to work seamlessly on `localhost:3000` while allowing integration testing via `.env.local`.

### Git Branching and Clean Integration Protocol
1. **Branch per feature**:
   * Traveler features: `feat/traveler-<feature>`
   * Guide features: `feat/guide-<feature>`
   * Admin features: `feat/admin-<feature>`
2. **Pre-Merge Verification Checklist**:
   * [ ] Run `npm run build` in `front-end` to verify zero JSX or bundle errors.
   * [ ] Verify that no other actor's files in `src/pages/` were modified or deleted.
   * [ ] Verify that changes to `App.jsx` only register new routes under the actor's dedicated prefix.
   * [ ] Verify that any new endpoints or DTO changes are documented in this integration contract.
   * [ ] Verify that no API keys or local machine IPs are committed.
3. **Merging to `main`**:
   * Pull the latest `main`: `git pull origin main --rebase`
   * Resolve any conflicts in shared files (`App.jsx`, `DashboardLayout.jsx`) by keeping both actors' additions.
   * Push your verified branch: `git push origin feat/<name>`.

---

## 9. Backend Referential Integrity, Status Transitions & Revenue Contracts

### 9.1 Safe Deletion & Referential Integrity Policy
To protect relational consistency and historical reporting:
* **Package Safe Deletion (`DELETE /packages/:id`)**:
  * A package **cannot** be deleted if referenced by any dependent records:
    * Trips referencing `packageId`
    * Package bookings referencing `packageId`
    * Indirect dependents through associated trips: Bookings, Itineraries, Expenses, Payments, and Commission Ledger entries
  * When references exist, the backend rejects deletion with **`HTTP 409 ConflictException`** and returns a descriptive list of all referencing entities.
  * Only completely unreferenced packages can be deleted.

* **Trip Safe Deletion (`DELETE /trips/:id`)**:
  * A trip **cannot** be deleted if referenced by:
    * Dependent Bookings
    * Itinerary items
    * Expenses
    * Direct Payments (`payment.tripId === tripId`)
    * Payments tied to the trip's bookings (`payment.bookingId === booking.bookingId`)
    * Commission Ledger entries
  * When references exist, the backend rejects deletion with **`HTTP 409 ConflictException`**.
  * **No Silent Cascade-Deletions**: Financial history (payments, commissions, expenses) is never silently deleted. Referenced trips must have dependent records removed or reassigned explicitly before deletion.

### 9.2 Trip Status Transition Finite State Machine (FSM)
Trip status updates on both `PUT /trips/:id` and `PATCH /trips/:id/status` must follow strict transition rules. Arbitrary jumps (e.g. `Planning` directly to `Active`) are rejected with **`HTTP 400 BadRequestException`**.

```text
                  ┌──────────────────────┐
                  │       Planning       │
                  └──────────┬───────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │       Pending        │
                  └──────────┬───────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │      Confirmed       │
                  └──────────┬───────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │        Active        │
                  └──────────┬───────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │      Completed       │ (Terminal)
                  └──────────────────────┘
                             ▲
                             │ (Any non-terminal status can transition to Cancelled)
                  ┌──────────┴───────────┐
                  │      Cancelled       │ (Terminal)
                  └──────────────────────┘
```

* **Valid Transitions**:
  * `Planning` $\rightarrow$ `Pending` | `Cancelled`
  * `Pending` $\rightarrow$ `Confirmed` | `Cancelled`
  * `Confirmed` $\rightarrow$ `Active` | `Cancelled`
  * `Active` $\rightarrow$ `Completed` | `Cancelled`
  * `Completed` $\rightarrow$ *(None — terminal)*
  * `Cancelled` $\rightarrow$ *(None — terminal)*
* **Idempotency**: Providing the same status that the trip already possesses is accepted as a valid, idempotent operation.
* **Side Effects**: When a trip status transitions to `Completed`, all pending commission entries for that trip in `commissionLedger` are automatically settled (`status: 'settled'`).

### 9.3 Guide Status & Assignment Lifecycle
* **Independent Status**: `guideStatus` (`'Pending'` | `'Accepted'` | `'Declined'`) tracks guide response and is decoupled from trip status and payment status.
* **Initialization on Assignment**:
  * When a trip is created with `guideId` assigned, `guideStatus` is automatically initialized to `'Pending'`.
  * When a trip is created without a guide (`guideId: null`), `guideStatus` is `undefined`.
* **Reassignment Reset**:
  * If a trip's `guideId` is updated to a new guide ID, `guideStatus` automatically resets to `'Pending'`.
  * If a trip's guide is unassigned (`guideId: null`), `guideStatus` is cleared (`undefined`).
* **Explicit Seed Fixtures**: Seed fixtures in `trips.data.ts` explicitly declare `guideStatus` for all trips with guides rather than requiring frontend code to infer acceptance from payment confirmation.

### 9.4 Revenue Configuration Updates (`PUT /api/admin/revenue/config/:key`)
* **Role Requirement**: Superuser only (`Role.SUPERUSER`).
* **Validation**: Request body must conform to `UpdateRevenueConfigDto`:
  * `value`: Required numeric value between `0` and `100` inclusive.
  * Rejects strings, non-finite values, `NaN`, negative numbers, or numbers exceeding 100 with **`HTTP 400 BadRequestException`**.
  * Unknown configuration keys return **`HTTP 404 NotFoundException`**.

### 9.5 Genuine Revenue & Financial Calculation
* All dashboard and revenue reporting endpoints (`/api/admin/revenue/overview`, `/api/admin/revenue/breakdown`, `/api/agencies/:id/revenue`, `/dashboard/*`) calculate totals strictly from genuine transaction data (`payments`, `commissionLedger`, `revenueTransactions`).
* No synthetic or dynamic mock data is injected into empty months. Unsettled or empty months naturally reflect `0` revenue with zeroed category breakdowns.

---

## 10. Single Shared Backend & Cross-Actor Verification Model

### 10.1 In-Memory Architecture Principle
The NestJS backend runs strictly in memory (`back-end/src/*/data/*.ts`). There is no persistent external SQL or NoSQL database.
* **Single Instance Requirement**: Cross-actor workflows (e.g. Traveler plans trip $\rightarrow$ Admin assigns guide $\rightarrow$ Guide accepts $\rightarrow$ Support inspects linked refund) depend on shared in-memory records. Running independent local backends on separate laptops isolates memory spaces: changes made on Laptop A are invisible to Laptop B.
* **Shared Host**: For team integration, one designated machine hosts the backend (`http://localhost:3000` or LAN IP), and all actor portals connect to this single origin.

### 10.2 Automated Cross-Actor Verification Test Matrix
The platform includes automated end-to-end integration suites executed against the shared backend:

| Test Suite File | Workflows Verified | Pass Rate |
| :--- | :--- | :---: |
| `verify_traveler_e2e_recovery.js` | Traveler trip recovery, duplicate payment rejection, status FSM progression | 100% (4/4 passed) |
| `test_traveler_payment_recovery.js` | Booking payment recovery, card validation, ledger immutability | 100% (9/9 passed) |
| `verify_guide_shared_contracts.js` | Guide accept/decline decoupling, reassignment reset rule, itinerary lifecycle | 100% (42/42 passed) |
| `scratch/verify_admin_e2e.js` | Package safe deletion 409 conflict, trip guide reassignment, agency approval gating | 100% (All passed) |
| `scratch/verify_super_workflows.js` | Guide `pricePerTrip` preservation, agency commission contract, super profile | 100% (All passed) |
| `scratch/verify_super_controls_e2e.js` | System rules ceiling enforcement, payment gateway toggle, audit trail persistence | 100% (24/24 passed) |
| `scratch/verify_support_e2e.js` | Support ticket queue triage, refund audit verification, messaging threads | 100% (40/40 passed) |
| `scratch/verify_agency_e2e.js` | Agency signup gating, passenger CRUD, package booking recovery, commission ledger | 100% (33/33 passed) |

---

## 11. Multi-Actor Workflow Contracts & Error Policies

### 11.1 Traveler-to-Guide Lifecycle
1. **Assignment**: Traveler or Admin assigns `guideId` to a trip $\rightarrow$ backend sets `guideStatus: 'Pending'`.
2. **Acceptance**: Guide calls `PATCH /trips/:id/status` with `{ guideStatus: 'Accepted' }` $\rightarrow$ trip status remains unperturbed while guide status becomes active.
3. **Reassignment**: If Admin updates trip with a different `guideId` $\rightarrow$ backend automatically resets `guideStatus: 'Pending'`. If guide is removed (`guideId: null`), `guideStatus` is cleared.

### 11.2 Payment Recovery & Idempotency
1. **Single Payment Rule**: Only one completed payment may exist per booking. A subsequent `POST /payments` for an already-paid booking is rejected with `HTTP 400 BadRequestException`.
2. **Session Recovery**: In `TravelerBookingsPage` and `AgencyBookingsPage`, existing payment records are fetched directly from `GET /payments/booking/:bookingId`. Bookings marked `Paid` in the ledger display confirmed status and lock out duplicate payment buttons.

### 11.3 Agency Reseller Lifecycle & Login Gating
1. **Registration**: Reseller registers at `/signup/agency` (`POST /agencies/register`). Account is created with `status: 'Pending'`.
2. **Login Gating**: `POST /auth/agency-login` strictly rejects pending or rejected agencies with `HTTP 401 UnauthorizedException` ("Agency account is pending approval").
3. **Approval**: Admin or Superuser reviews agency and calls `PATCH /agencies/:id/status` with `{ status: 'Approved', commissionRate: 0.01 }`. Agency login now succeeds.

### 11.4 Safe Entity Deletion & Conflict Integrity (HTTP 409)
* **Packages**: `DELETE /packages/:id` checks if any trips or bookings reference the package ID. If active references exist, returns `HTTP 409 ConflictException`.
* **Trips**: `DELETE /trips/:id` checks for dependent bookings, itineraries, payments, and commission entries. Deletion is blocked if financial records exist.
* **Guides & Travelers**: `DELETE /guides/:id` and `DELETE /travelers/:id` are blocked if assigned to active or upcoming trips.

### 11.5 Commission Representation & Formatting
* Stored database rates are stored as raw fractional decimals: `0.01` represents `1.0%`.
* Display layers across Agency Commission Page and Admin Agency Page format this as `(rate * 100).toFixed(1) + '%'`.
* DTO validation on `PATCH /agencies/:id/status` requires `commissionRate` between `0.005` and `0.015` (0.5% to 1.5%).

### 11.6 Superuser System-Wide Controls & Enforcement
* **Rules Endpoint**: `GET /system-config/rules` and `PUT /system-config/rules` store platform policies (`maxSinglePaymentCeiling`, `autoConfirmBookings`, `allowCancellations`).
* **Enforcement**: In `PaymentsService.create()`, transactions with `amount > rules.maxSinglePaymentCeiling` are rejected with `HTTP 400 BadRequestException` ("Payment amount exceeds maximum system limit").
* **Audit Trail**: Every update to rules or payment methods logs an entry to `/system-config/audit-logs` recording timestamp, actor, and old/new values.

