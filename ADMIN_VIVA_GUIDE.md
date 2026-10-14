# GlobeSync — Admin Module React Evaluation & Viva Guide

This comprehensive guide is prepared for technical evaluation and oral viva examination of the **Platform Administrator Module** in GlobeSync. It documents the actual React components, backend REST contracts, guide reassignment reset rules, safe deletion policies, controlled dialogs, and evaluation walkthrough flows.

---

## 1. Architectural Philosophy & Evaluation Pitch

When asked to summarize the architecture of the Admin module:

> *"The Administrator portal in GlobeSync serves as the operational nerve center of the platform. Built using React 18 functional components and native CSS design tokens, it manages system-wide tour packages, cross-actor trips, master bookings, reseller agency applications, tour guide rosters, and traveler reviews. While administrators possess broad operational authority across bookings and trips, security boundaries are strictly maintained: admin profile updates are self-scoped to the logged-in administrator (`PUT /admins/:id`), guide assignments adhere to state machine reset rules (`guideStatus` resets to `Pending` upon reassignment and clears upon unassignment), and safe deletion policies prevent accidental orphan records by rejecting deletions of packages or trips actively referenced in dependent bookings."*

---

## 2. Directory Structure & Component Paths

```text
front-end/src/
├── App.jsx                                     # Protected route definitions with allowedRoles={['admin', 'superuser']}
├── context/
│   └── SessionContext.jsx                     # Global session identity and active role management
├── layouts/
│   └── DashboardLayout.jsx                    # Admin portal layout with sidebar navigation and header
├── services/
│   └── api.js                                 # Centralized REST API wrappers with RBAC header injection
├── pages/admin/
│   ├── AdminDashboardPage.jsx                 # Operational overview KPIs, recent bookings, and review stream
│   ├── AdminPackagesPage.jsx                  # Catalog CRUD, search, filter, and safe deletion checks
│   ├── AdminTripsPage.jsx                     # System-wide trip oversight, guide assignment & trip details editing
│   ├── AdminBookingsPage.jsx                  # Master booking records, payment vs operational status separation
│   ├── AdminAgenciesPage.jsx                  # Reseller partner review, approval/rejection, and commission editing
│   ├── AdminGuidesPage.jsx                    # Tour guide roster management, pricePerTrip CRUD
│   ├── AdminReviewsPage.jsx                   # Moderation table and review deletion controls
│   ├── AdminReportsPage.jsx                   # Aggregated business volume, popularity, and operational metrics
│   └── AdminProfilePage.jsx                   # Self-scoped administrator profile and credentials
└── components/admin/
    ├── AdminUI.jsx                            # Shared presentational widgets (StatsCard, DataTable, Modal, etc.)
    ├── admin.css                              # Scoped styling for admin tables, badges, and modal drawers
    ├── PackageFormDialog.jsx                  # Controlled modal for creating and updating tour packages
    ├── TripEditModal.jsx                      # Controlled form for modifying trip destination, dates, and budget
    ├── TripStatusModal.jsx                    # Controlled dialog for updating trip status and guide assignments
    ├── BookingStatusModal.jsx                 # Controlled dialog for updating operational booking status
    ├── AgencyStatusModal.jsx                  # Controlled dialog for approving/rejecting agencies and setting rates
    └── AgencyDetailsModal.jsx                 # Inspection drawer for agency partner credentials and volume
```

---

## 3. Workflow-by-Workflow Code Walkthrough

### Workflow 1: Admin Dashboard & Operational Overview (`AdminDashboardPage.jsx`)
- **API Endpoints**: `GET /dashboard/admin`, `GET /bookings`, `GET /trips`, `GET /reviews`, `GET /travelers`.
- **KPI Metrics**: Total Bookings, Active Trips, Live Tour Packages, Average Review Rating.
- **Recent Activity**: Combines live booking records with traveler names, destinations, and payment statuses without hardcoded fallbacks.

### Workflow 2: Package Management & Safe Deletion (`AdminPackagesPage.jsx`, `PackageFormDialog.jsx`)
- **API Endpoints**: `GET /packages`, `POST /packages`, `PUT /packages/:id`, `DELETE /packages/:id`.
- **Controlled Form (`PackageFormDialog.jsx`)**:
  - Validated fields: `name`, `destinations`, `duration` (positive integer), `budget` (min 0), `highlights`, `description`.
  - Distinguishes create (`POST`) from edit (`PUT`) mode.
- **Safe Deletion Policy**:
  - The backend `PackagesService.remove()` inspects dependent trips, bookings, itineraries, and expenses.
  - If package `#1` is actively referenced by trips, backend responds with `409 Conflict` (`"Cannot delete package 1: referenced by X trip(s)..."`). The frontend captures this error and displays a clear explanation rather than crashing.

### Workflow 3: Platform Trips Oversight & Guide Assignment (`AdminTripsPage.jsx`, `TripEditModal.jsx`, `TripStatusModal.jsx`)
- **API Endpoints**: `GET /trips`, `GET /travelers`, `GET /guides`, `PUT /trips/:id`, `PATCH /trips/:id/status`, `DELETE /trips/:id`.
- **Guide Assignment & Reset Rules**:
  - When reassigning a trip to a new guide (`guideId` changes), `guideStatus` is automatically reset to `'Pending'` so the new guide must explicitly accept.
  - When unassigning a guide (`guideId` set to `null`), `guideStatus` is completely cleared (`undefined`), preventing stale acceptances.
- **Trip Editing (`TripEditModal.jsx`)**: Controlled inputs for `destination`, `startDate`, `endDate`, and `budget` with date sequence validation (`endDate >= startDate`).

### Workflow 4: Bookings Master Ledger (`AdminBookingsPage.jsx`, `BookingStatusModal.jsx`)
- **API Endpoints**: `GET /bookings`, `GET /travelers`, `GET /trips`, `PUT /bookings/:id`, `DELETE /bookings/:id`.
- **Status Separation**:
  - Distinguishes **Operational Booking Status** (`Pending`, `Confirmed`, `Cancelled`) from **Payment Status** (`Pending`, `Paid`, `Refunded`).
  - Admin confirmation updates the operational booking state without falsifying or creating simulated payment transactions.
- **Insurance Percentage Handling**: Stored fractional rate `0.07` accurately displayed as `7%` (not `0.07%`).

### Workflow 5: Agency Partner Governance (`AdminAgenciesPage.jsx`, `AgencyStatusModal.jsx`, `AgencyDetailsModal.jsx`)
- **API Endpoints**: `GET /agencies`, `PATCH /agencies/:id/status`.
- **Contract Commission Contract**:
  - Valid range enforced: `0.5%` to `1.5%` (e.g. `1.2%` or `1.5%`). Values exceeding `1.5%` are rejected by DTO validation (`"commissionRate must not be greater than 1.5"`).
  - Distinguishes omitting a rate from changing a rate.
  - Approving an agency transitions status to `'approved'`, immediately allowing the partner to log into the portal.

### Workflow 6: Guide Operations Roster (`AdminGuidesPage.jsx`)
- **API Endpoints**: `GET /guides`, `POST /guides`, `PUT /guides/:id`, `DELETE /guides/:id`.
- **Consistent Field Naming**: Uses `pricePerTrip` consistently in reads, forms, and updates, accurately preserving valid zero values (`₹0` honorary guides) without replacing with arbitrary defaults.

### Workflow 7: Reviews Moderation (`AdminReviewsPage.jsx`)
- **API Endpoints**: `GET /reviews`, `GET /travelers`, `GET /trips`, `DELETE /reviews/:id`.
- Moderation actions allow admins to remove fraudulent or offensive reviews while preserving honest feedback.

---

## 4. Multi-Tenant RBAC & Security Boundaries

| Operation | Method | Endpoint | Admin Permission | Scope / Constraint |
| :--- | :--- | :--- | :--- | :--- |
| Admin Dashboard | `GET` | `/dashboard/admin` | Allowed | Global overview |
| List Packages | `GET` | `/packages` | Allowed | Global read |
| Create Package | `POST` | `/packages` | Allowed | Full CRUD |
| Delete Package | `DELETE` | `/packages/:id` | Allowed | Rejects with `409` if referenced in trips |
| Update Trip | `PUT` | `/trips/:id` | Allowed | Preserves owner, enforces guide reset |
| Delete Trip | `DELETE` | `/trips/:id` | Allowed | Rejects with `409` if referenced in bookings |
| Update Agency Status | `PATCH` | `/agencies/:id/status` | Allowed | Validates commission rate `0.5% - 1.5%` |
| Guide Management | `POST`, `PUT`, `DELETE` | `/guides/:id` | Allowed | Price per trip preserved |
| Admin Profile | `PUT` | `/admins/:id` | Restricted | Self-scoped: `:id` must match `x-user-id` |

---

## 5. Complete Flow Walkthrough (Action → API → State → Render)

```text
User Action: Admin opens Trip Status Modal on Trip #13 and selects Guide #2 (Rahul Sharma).
    │
    ▼
Event Handler: `handleSaveStatus(e)` is invoked with `{ guideId: 2, status: 'Confirmed' }`.
    │
    ▼
API Request: Calls `tripsApi.update(13, { ...tripData, guideId: 2, guideStatus: 'Pending' })`.
    Headers: `x-user-role: admin`, `x-user-id: 1`.
    │
    ▼
Backend Processing: `TripsService.update()` detects guide reassignment from #1 to #2.
    Sets `guideId = 2` and resets `guideStatus = 'Pending'`.
    │
    ▼
Component State Update: React receives updated trip object, updates `trips` state array via
    `setTrips(prev => prev.map(t => t.tripId === 13 ? updatedTrip : t))`.
    │
    ▼
UI Re-render: The trip card immediately displays "Guide: Rahul Sharma (Pending Acceptance)"
    and triggers a success Toast alert.
```

---

## 6. Live Viva Code Modification Demonstration

When asked to demonstrate a live code change to prove ownership of the codebase:

- **Modification Scenario**: Add a quick filter button on `AdminBookingsPage.jsx` to filter by high-value bookings (`> ₹1,00,000`).
- **Code Change**:
  ```jsx
  // In AdminBookingsPage.jsx, inside useMemo filter:
  const isHighValue = showHighValueOnly ? Number(b.amount || 0) >= 100000 : true;
  return matchesSearch && matchesStatus && isHighValue;
  ```
- **Explanation**: Show how adding a single boolean state `showHighValueOnly` coupled to `useMemo` immediately updates the filtered table rows and summary total without triggering unnecessary network calls.
