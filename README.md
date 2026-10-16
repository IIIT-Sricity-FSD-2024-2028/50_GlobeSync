# GlobeSync – Travel Itinerary Planning and Coordination Platform

GlobeSync is a Travel and Hospitality domain project. It is a role-based travel itinerary planning and coordination platform that helps travelers, guides, support staff, admins, and superusers manage travel-related workflows.

The system includes a frontend interface and a NestJS backend. The backend follows modular architecture and supports REST APIs, in-memory data management, DTO validation, role-based access control, error handling, and Swagger API documentation.

---

## Project Structure

```text
root/
├── front-end/
├── back-end/
│   ├── docs/
│   │   └── swagger.json
├── Database/
│   ├── database_schema.sql
│   └── ER.png
└── README.md
```

---

## Prerequisites & Environment

- **Node.js**: `v18.x` or higher (verified on Node `v20.x` / `v22.x`)
- **npm**: `v9.x` or higher
- **OS**: Windows / Linux / macOS (all scripts are cross-platform compatible)

---

## Getting Started & Installation

### 1. Install Dependencies & Start the NestJS Backend
```bash
cd back-end
npm install
npm run start:dev
```
- **Backend API**: `http://localhost:3000`
- **Health Check**: `http://localhost:3000/health`
- **Interactive Swagger Documentation**: `http://localhost:3000/api`

### 2. Install Dependencies & Start the React Frontend Application
In a separate terminal window:
```bash
cd front-end
npm install
npm run dev
```
- **React Frontend**: `http://localhost:5173`

### 3. Production Bundles
```bash
# Frontend optimized production bundle (front-end/dist)
cd front-end
npm run build

# Backend compiled TypeScript bundle (back-end/dist)
cd back-end
npm run build
```


---

## Tech Stack

### Frontend

- React 18 with JSX and functional components
- Vite build tooling & development server
- Plain CSS with curated design tokens (`shared.css`)
- Context API (`SessionContext`) for role-based session state
- Pure Fetch API wrapper (`api.js`) injecting RBAC headers (`x-user-role`, `x-user-id`)
- Client-side routing with `react-router-dom`

### Backend

- NestJS
- TypeScript
- In-memory arrays and objects
- DTO validation using class-validator
- Swagger API documentation
- Role-Based Access Control using Guards

---

## User Roles

The application supports the following roles:

```text
traveler
guide
support
admin
superuser
agency
```

Each role has different access permissions.

---

## Main Features

### Traveler

- Traveler login
- View travel packages
- View available guides
- Create trip
- Create itinerary
- View and manage own trips
- View bookings
- Add expenses
- Raise support tickets
- Send and view messages

### Guide

- Guide login
- View assigned trips
- Accept or reject trip requests
- Update trip status
- View assigned travelers
- View completed trips
- Send and view messages

### Customer Support

- Support login
- View support tickets
- Update ticket status
- Handle refund requests
- Communicate with travelers

### Admin

- Admin login
- View dashboard reports
- Manage packages
- Manage trips
- Manage bookings
- Manage guides
- View reviews
- View reports

### Superuser

- Superuser login
- Full system access
- Manage users
- Manage packages
- Manage trips
- Manage bookings
- View system-level reports

### Agency

- Agency login
- Register as a reseller and await admin approval
- Browse available travel packages
- Add and manage passengers (offline clients — no platform accounts required)
- Book trips on behalf of passengers at retail price
- View own agency bookings
- View own commission ledger (commission earned per completed booking)
- Raise support tickets on behalf of passengers

---

## Backend Architecture

The backend is developed using NestJS and follows modular architecture.

Each major feature is separated into its own module. Each module contains:

```text
module
controller
service
DTOs
```

### Backend Modules

```text
auth
travelers
guides
packages
trips
bookings
payments
refunds
itineraries
expenses
reviews
support-tickets
messages
dashboard
health
agencies
agency-bookings
passengers
```

---

## Modules, Controllers, and Services

### Modules

Modules organize each feature area of the backend.

Example modules:

```text
packages.module.ts
trips.module.ts
guides.module.ts
bookings.module.ts
```

Each module connects its controller and service to the NestJS application.

### Controllers

Controllers handle incoming API requests.

Example controllers:

```text
packages.controller.ts
trips.controller.ts
support-tickets.controller.ts
```

Controllers define REST endpoints such as:

```text
GET
POST
PUT
PATCH
DELETE
```

### Services

Services contain the business logic.

Examples:

- Package service adds, updates, deletes, and returns packages.
- Trip service creates trips and updates trip status.
- Support ticket service creates and updates support tickets.
- Dashboard service calculates dashboard statistics.

Controllers call services, and services work with in-memory data.

---

## In-Memory Data Management

No external database is used in this project.

All data is stored using arrays and objects inside the backend data folder. The data represents entities from the project ER diagram.

Main entities include:

```text
travelers
guides
admins
packages
trips
bookings
payments
refunds
itineraries
expenses
reviews
support tickets
messages
```

Relationships are maintained using IDs such as:

```text
travelerId
guideId
tripId
packageId
bookingId
paymentId
refundId
ticketId
```

Example:

A trip is connected to a traveler, guide, and package using:

```text
travelerId
guideId
packageId
```

---

## Role-Based Access Control

Role-Based Access Control is implemented using request headers.

The main role header is:

```text
x-user-role
```

Some APIs also use:

```text
x-user-id
```

Example headers:

```text
x-user-role: guide
x-user-id: 1
```

A custom Roles decorator and RolesGuard are used to restrict API access.

### Access Rules

- Traveler can view packages and create or manage own trips.
- Guide can view assigned trips and update assigned trip status.
- Support can manage support tickets and refunds.
- Admin can manage packages, trips, bookings, guides, reviews, and reports.
- Superuser has full access to all modules.

If the role is missing or unauthorized, the backend returns:

```text
403 Forbidden
```

---

## DTO Validation

DTOs are used to validate request bodies before data reaches the service layer.

Validation is implemented using class-validator decorators such as:

```text
@IsString()
@IsNumber()
@IsNotEmpty()
@IsOptional()
@Min()
```

Example package DTO validates:

```text
name
destinations
budget
duration
description
highlights
image
```

If required fields are missing or invalid, the backend returns:

```text
400 Bad Request
```

---

## Error Handling

The backend handles common errors using proper HTTP status codes.

```text
200 OK              - request successful
201 Created         - resource created successfully
400 Bad Request     - invalid or missing input
403 Forbidden       - unauthorized role access
404 Not Found       - invalid ID or resource not found
```

---

## Swagger Documentation

Swagger is configured for API documentation.

Swagger UI:

```text
http://localhost:3000/api
```

Swagger JSON file:

```text
back-end/docs/swagger.json
```

Swagger documents:

- API endpoints
- Request body schema
- Response schema
- Role headers
- Status codes
- Path parameters
- API descriptions

---

## How to Run Backend

Open terminal and go to the backend folder:

```bash
cd back-end
```

Install dependencies:

```bash
npm install
```

Start backend:

```bash
npm run start:dev
```

Backend runs at:

```text
http://localhost:3000
```

Health check:

```text
http://localhost:3000/health
```

Expected health response:

```json
{
  "status": "ok",
  "service": "GlobeSync API",
  "version": "1.0.0"
}
```

Swagger documentation:

```text
http://localhost:3000/api
```

---

## Execution Procedure & Portal Access

### Step 1: Start the NestJS Backend
From the project root:
```bash
cd back-end
npm run start:dev
```
- **Backend API**: `http://localhost:3000`
- **Health Check**: `http://localhost:3000/health`
- **Swagger Documentation**: `http://localhost:3000/api` (84 endpoints across 24 tag groups)

### Step 2: Start the React + Vite Frontend
In a second terminal window from the project root:
```bash
cd front-end
npm run dev
```
- **Frontend Portal**: `http://localhost:5173`

The frontend communicates with the backend via centralized Fetch API wrappers (`front-end/src/services/api.js`) automatically injecting the active user's `x-user-role` and `x-user-id` headers.

### Seeded Demo Login Credentials (All 6 Roles)

The platform comes seeded with in-memory test credentials for each of the 6 roles. Use the quick-fill buttons on the login gateway (`http://localhost:5173/login`) or supply the credentials manually:

| Role | Email | Password | Access Code | Landing Route | Key Capabilities |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Traveler** | `Arjun@gmail.com` | `traveler123` | *(None)* | `/traveler/packages` | Browse packages, create trips/itineraries, book transit/hotels, log expenses, submit support tickets with attachments |
| **Tour Guide** | `Devansh@gmail.com` | `guide123` | `GUIDE-2026` | `/guide/dashboard` | Accept/decline trip requests, view assigned travelers, track completed tours, manage daily itineraries |
| **Customer Support** | `Aisha.johnson@gmail.com` | `support123` | `SUPP-2026` | `/support/dashboard` | Triage ticket queue (Open -> In Progress -> Resolved), audit & approve refund requests, customer messaging |
| **Platform Administrator** | `admin@ticp.com` | `admin123` | `ADMIN-TICP` | `/admin/dashboard` | Manage packages & trip assignments, oversee guide status, approve agency reseller partners |
| **Superuser (Governance)** | `superadmin@ticp.com` | `super123` | `SUPER-2026` | `/super/dashboard` | Live platform rules (ceilings, cutoffs), toggle payment gateways, manage staff, audit trail |
| **Travel Agency Partner** | `ops@horizontravel.com` | `horizon123` | *(None)* | `/agency/dashboard` | Manage offline client passengers, book trips on clients' behalf, view commission ledger & subscriptions |


---

## Important APIs

### Auth APIs

```http
POST /auth/traveler-login
POST /auth/staff-login
```

Staff login is used for:

```text
guide
support
admin
superuser
```

---

### Package APIs

```http
GET /packages
GET /packages/:id
POST /packages
PUT /packages/:id
DELETE /packages/:id
```

Example create package request body:

```json
{
  "name": "Goa Beach Escape",
  "destinations": "Goa",
  "budget": 12000,
  "duration": 3,
  "description": "Beach package",
  "highlights": "Baga Beach, Fort Aguada",
  "image": "../static/destinations/goa.png"
}
```

---

### Trip APIs

```http
GET /trips
GET /trips/:id
GET /trips/traveler/:travelerId
GET /trips/guide/:guideId
POST /trips
PUT /trips/:id
PATCH /trips/:id/status
DELETE /trips/:id
```

---

### Booking APIs

```http
GET /bookings
GET /bookings/:id
GET /bookings/traveler/:travelerId
POST /bookings
PUT /bookings/:id
DELETE /bookings/:id
```

---

### Guide APIs

```http
GET /guides
GET /guides/:id
POST /guides
PUT /guides/:id
DELETE /guides/:id
GET /trips/guide/:guideId
GET /dashboard/guide/:guideId
```

---

### Support Ticket APIs

```http
GET /support-tickets
GET /support-tickets/:id
GET /support-tickets/traveler/:travelerId
POST /support-tickets
PATCH /support-tickets/:id/status
DELETE /support-tickets/:id
```

---

### Dashboard APIs

```http
GET /dashboard/admin
GET /dashboard/superuser
GET /dashboard/traveler/:travelerId
GET /dashboard/guide/:guideId
GET /dashboard/support
GET /dashboard/agency/:agencyId
```

---

### Agency APIs

```http
POST /auth/agency-login
POST /agencies/register
GET  /agencies
GET  /agencies/:id
PATCH /agencies/:id/status
PATCH /agencies/:id
```

---

### Passenger APIs

```http
GET  /passengers
GET  /passengers/:id
GET  /passengers/traveler/:travelerId
GET  /passengers/agency/:agencyId
POST /passengers
PATCH /passengers/:id
DELETE /passengers/:id
```

---

## Sample Role Headers

### Traveler

```text
x-user-role: traveler
x-user-id: 1
```

### Guide

```text
x-user-role: guide
x-user-id: 1
```

### Support

```text
x-user-role: support
```

### Admin

```text
x-user-role: admin
```

### Superuser

```text
x-user-role: superuser
```

### Agency

```text
x-user-role: agency
x-user-id: 1
```

---

## Sample Guide Login

```text
Email: Devansh@gmail.com
Password: guide123
Access Code: GUIDE-2026
```

---

## Review–4 Requirements Covered

### Backend Development

- Backend developed using NestJS.
- Proper modular architecture is followed.
- Modules, controllers, services, and DTOs are separated.

### In-Memory Data Management

- No external database is used.
- Data is stored using arrays and objects.
- CRUD operations are implemented.

### Role-Based Access Control

- Roles are passed using request headers.
- Guards are used to enforce access control.
- Unauthorized access returns 403 Forbidden.

### REST API Development

- APIs are implemented using GET, POST, PUT, PATCH, and DELETE.
- APIs are aligned with frontend modules.
- Request and response formats are kept consistent.

### Validation and Error Handling

- DTOs are used for validation.
- Invalid inputs and missing data are handled.
- Proper HTTP status codes are returned.

### Frontend–Backend Integration

- Frontend uses backend APIs through Fetch API.
- Major CRUD operations are backend-driven.
- Mock data usage is replaced with backend API calls for core workflows.

### API Documentation

- Swagger documentation is available at `/api`.
- Swagger JSON is generated inside `back-end/docs/swagger.json`.
- Swagger includes request body, response schema, role headers, and status codes.

### Code Structure

- Code is clean and modular.
- Controllers, services, DTOs, guards, and data are separated properly.

---

## Demo Workflows

Recommended workflows for demonstration:

1. Traveler login and dashboard
2. Traveler views packages
3. Traveler views guides
4. Traveler creates a trip
5. Traveler views and manages trips
6. Traveler creates a support ticket
7. Admin login and dashboard
8. Admin package CRUD
9. Admin trips and bookings management
10. Guide login and assigned trips
11. Guide accepts or rejects a trip request
12. Support updates ticket or refund status
13. Superuser dashboard and user management
14. Swagger and DTO demonstration

---

## Backend Code Walkthrough Points

During backend code walkthrough, explain:

1. `back-end/src` contains backend source code.
2. Each feature is divided into a separate module.
3. Controllers handle API routes.
4. Services contain business logic.
5. DTOs validate request bodies.
6. Data folder contains in-memory arrays.
7. Common folder contains RBAC decorators and guards.
8. Relationships are maintained using IDs.
9. `main.ts` configures CORS, validation, Swagger, and server startup.
10. `back-end/docs/swagger.json` contains generated API documentation.

---

## DTO and Swagger Demonstration APIs

Show at least these APIs in Swagger:

1. `POST /auth/traveler-login`
2. `GET /packages`
3. `POST /packages`
4. `GET /trips/guide/{guideId}`
5. `PATCH /support-tickets/{id}/status`

For each API, show:

- Request body
- Response schema
- Role header
- Status codes

---

## Notes

- This project uses in-memory data only.
- Data resets when the backend server restarts.
- No external database is used.
- No JWT authentication is used.
- Authorization is handled through the `x-user-role` header.
- Swagger documentation is available at `/api`.
- The project follows Review–4 folder structure and requirements.

---

## Testing & Middleware Verification Instructions

### 1. Automated Backend Unit & RBAC Test Suite
GlobeSync provides 7 sequential automated test suites covering RBAC boundaries, state machine transitions, and data protection rules. Run the full test suite via `ts-node`:
```bash
cd back-end
npm test
```
**Test Results: 132 tests, 132 passed, 0 failed (100% pass rate)**:
- `src/trips/backend-fixes.spec.ts` (23 tests): Trip lifecycle finite state machine (`Planning` -> `Pending` -> `Confirmed`), guide assignment decoupling, guideStatus initialization (`Pending`), genuine revenue calculation without synthetic inflation.
- `src/support-users/support-users.service.spec.ts` (16 tests): Support user profile CRUD, password sanitization on output, caller identity ownership enforcement via `RolesGuard`.
- `src/agencies/agencies.service.spec.ts` (17 tests): Reseller agency registration, password protection, status-based login gating (`pending` rejected, `approved` allowed).
- `src/admins/admins.service.spec.ts` (17 tests): Admin profile management, immutable role boundaries, strict administrator identity matching.
- `src/common/guards/roles-guard-ownership.spec.ts` (17 tests): Multi-tenant RBAC headers (`x-user-role`, `x-user-id`), cross-role caller identity matching, dashboard and message privacy.
- `src/common/guards/child-resource-ownership.spec.ts` (19 tests): Deep child resource ownership verification across itineraries, expenses, payments, and refunds.
- `src/revenue/revenue-subscriptions-promotions.rbac.spec.ts` (23 tests): Agency revenue access boundaries, subscription billing tiers, and promotional discount RBAC.

### 2. Production Bundle Verification
Verify that both frontend and backend compile to optimized production assets:
```bash
# Frontend Build (Vite)
cd front-end
npm run build
# Result: 173 modules transformed into front-end/dist/ with zero errors

# Backend Build (NestJS)
cd back-end
npm run build
# Result: Compiled into back-end/dist/ with zero errors
```

### 3. FDFED Middleware Verification
The GlobeSync backend integrates 4 enterprise-grade middlewares meeting all FDFED requirements:

1. **Router-Level Access Logging (`LoggerMiddleware`)**:
   - Location: `back-end/src/common/middleware/logger.middleware.ts`
   - Log destination: `back-end/logs/access.log`
   - Behavior: Automatically logs every incoming HTTP request with method, URL, response status code, and execution duration in milliseconds.

2. **Global Exception Filter (`GlobalExceptionFilter`)**:
   - Location: `back-end/src/common/filters/http-exception.filter.ts`
   - Log destination: `back-end/logs/error.log`
   - Behavior: Intercepts all unhandled HTTP exceptions, serializes standardized JSON responses (`statusCode`, `message`, `error`, `timestamp`, `path`), and appends the detailed error stack to `back-end/logs/error.log`.

3. **Helmet Security Headers (`helmet()`)**:
   - Configured in: `back-end/src/main.ts`
   - Behavior: Protects against common web vulnerabilities by injecting secure headers including `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, and `Strict-Transport-Security`.

4. **File Upload Middleware (`UploadsController` via Multer)**:
   - Endpoint: `POST /uploads/attachment`
   - Static Asset Hosting: Uploaded files are served at `http://localhost:3000/uploads/<filename>`
   - Constraints: Max file size 5 MB; allowed formats `.jpg`, `.jpeg`, `.png`, `.pdf` (validated before disk write).
   - Frontend Integration: Connected in `front-end/src/services/api.js` via `uploadsApi.uploadAttachment(file)` and wired into Support Ticket creation (`front-end/src/components/support/TicketForm.jsx`).

### 4. Single Shared Backend Instance Architecture
The NestJS backend runs strictly in memory (`back-end/src/*/data/*.ts`). There is no persistent external database.
- **Why Cross-Role Checks Require One Shared Instance**:
  In-memory data structures are held within the running Node.js process memory. Separate `localhost:3000` instances on different developer machines do **not** synchronize memory. A booking created on Laptop A does not exist on Laptop B.
- **Shared Verification Host**:
  All 6 actor portals connect to a single active backend process (`http://localhost:3000`), ensuring that Traveler trip bookings, Guide assignments, Support tickets, and Agency transactions reflect across role views in real time.


---

## Team Member Real Contribution & Evaluation Viva Mapping

Every team member owns an independent actor portal and can explain their complete **Action $\rightarrow$ API $\rightarrow$ State $\rightarrow$ Render** flow and demonstrate a small live modification.

### Member 1: Traveler Portal
* **Owner Files**: [`TravelerCreateTripPage.jsx`](front-end/src/pages/traveler/TravelerCreateTripPage.jsx), [`TravelerBookingsPage.jsx`](front-end/src/pages/traveler/TravelerBookingsPage.jsx), [`TravelerTripsPage.jsx`](front-end/src/pages/traveler/TravelerTripsPage.jsx)
* **Components / Props**: Multi-step wizard (`TripForm`, `TransportSelectStep`, `HotelSelectStep`, `GuideSelectStep`, `TripCostSummary`), passing step handlers (`onNext`, `onBack`, `formData`, `onChange`).
* **State / Events**: Wizard step progression (`step`, `setStep`), `sessionStorage` draft recovery, `costBreakdown` dynamic recalculation.
* **Controlled Forms**: Controlled inputs for dates, destination, passenger selection, and card payment modal with Luhn validation.
* **useEffect / Side Effects**: Data fetching with `AbortController`, recovery of existing paid bookings to prevent duplicate payment.
* **Complete Action $\rightarrow$ API $\rightarrow$ State $\rightarrow$ Render Flow**:
  1. *Action*: Traveler completes trip wizard and clicks "Confirm Booking".
  2. *API*: Sends `POST /trips` (creates trip in `Planning` status) followed by `POST /bookings` with package amount.
  3. *State*: Stores created `tripId` and `bookingId` into component state and updates `sessionStorage`.
  4. *Render*: Advances to Payment Step, rendering live cost breakdown and card gateway input.
* **Live Viva Modification**: In `TripCostSummary.jsx`, add a 5% transit surcharge or add a destination keyword filter in `TravelerTripsPage.jsx`.

### Member 2: Tour Guide Portal
* **Owner Files**: [`GuideRequestsPage.jsx`](front-end/src/pages/guide/GuideRequestsPage.jsx), [`GuideTravelersPage.jsx`](front-end/src/pages/guide/GuideTravelersPage.jsx), [`GuideCompletedTripsPage.jsx`](front-end/src/pages/guide/GuideCompletedTripsPage.jsx)
* **Components / Props**: `RequestCard`, `ItineraryProgress`, `GuideMessagePane`.
* **State / Events**: Filter tabs (`All`, `Pending`, `Accepted`), modal confirmation state, optimistic trip status updates.
* **Controlled Forms**: Controlled feedback/reply input, hourly/per-trip fee configuration in profile.
* **useEffect / Side Effects**: Loads guide-scoped trips (`GET /trips/guide/:guideId`) and assigned travelers (`GET /travelers`).
* **Complete Action $\rightarrow$ API $\rightarrow$ State $\rightarrow$ Render Flow**:
  1. *Action*: Guide clicks "Accept" on an incoming trip request card.
  2. *API*: Calls `PATCH /trips/:id/status` with `{ guideStatus: 'Accepted' }` (decoupled from traveler trip status).
  3. *State*: Filters out accepted trip from `pendingRequests` state and appends to `activeTrips` state.
  4. *Render*: Request card disappears from Requests tab and appears in Assigned Travelers roster.
* **Live Viva Modification**: In `GuideTravelersPage.jsx`, add a search filter input to filter travelers by client name.

### Member 3: Admin Portal
* **Owner Files**: [`AdminPackagesPage.jsx`](front-end/src/pages/admin/AdminPackagesPage.jsx), [`AdminTripsPage.jsx`](front-end/src/pages/admin/AdminTripsPage.jsx), [`AdminAgenciesPage.jsx`](front-end/src/pages/admin/AdminAgenciesPage.jsx)
* **Components / Props**: `AdminPackageCard`, `AdminTripRow`, `AdminAgencyModal`.
* **State / Events**: Modals for edit/create, safe deletion conflict warnings (HTTP 409).
* **Controlled Forms**: Package creation form with duration, price, tags, and agency commission rate slider (0.5% - 1.5%).
* **useEffect / Side Effects**: Loads system packages, trips, guides, and agencies with cleanup.
* **Complete Action $\rightarrow$ API $\rightarrow$ State $\rightarrow$ Render Flow**:
  1. *Action*: Admin selects a new guide from the dropdown in Trip Oversight and clicks "Save Assignment".
  2. *API*: Sends `PUT /trips/:id` with updated `guideId`. Backend automatically resets `guideStatus: 'Pending'`.
  3. *State*: Updates trip in `trips` state array with new `guideId` and `guideStatus: 'Pending'`.
  4. *Render*: Trip row updates showing new guide name with yellow `Pending Acceptance` pill.
* **Live Viva Modification**: In `AdminBookingsPage.jsx`, add a quick filter button for bookings over $1,000.

### Member 4: Superuser Portal
* **Owner Files**: [`SuperRulesConfigPage.jsx`](front-end/src/pages/super/SuperRulesConfigPage.jsx), [`SuperPaymentMethodsPage.jsx`](front-end/src/pages/super/SuperPaymentMethodsPage.jsx), [`SuperRevenuePage.jsx`](front-end/src/pages/super/SuperRevenuePage.jsx), [`SuperUsersPage.jsx`](front-end/src/pages/super/SuperUsersPage.jsx)
* **Components / Props**: `MetricCard`, `RuleSlider`, `GatewayToggleCard`, `AuditLogTable`.
* **State / Events**: Live config values, measured health ping latency, audit trail log pagination.
* **Controlled Forms**: `maxSinglePaymentCeiling` slider, auto-confirm toggle, payment gateway switches.
* **useEffect / Side Effects**: Fetches `/system-config/rules`, `/system-config/audit-logs`, and measures latency against `/health`.
* **Complete Action $\rightarrow$ API $\rightarrow$ State $\rightarrow$ Render Flow**:
  1. *Action*: Superuser moves the "Max Single Payment Ceiling" slider to $10,000 and clicks "Save Platform Policies".
  2. *API*: Sends `PUT /system-config/rules` with `{ maxSinglePaymentCeiling: 10000 }`.
  3. *State*: Backend updates in-memory config and appends to audit log; component updates `rules` and `auditLogs` state.
  4. *Render*: Toast notification confirms "System policies updated", and the audit log table renders the new entry.
* **Live Viva Modification**: In `SuperUsersPage.jsx`, add a text input to filter the user list by email domain.

### Member 5: Customer Support Portal
* **Owner Files**: [`SupportTicketsPage.jsx`](front-end/src/pages/support/SupportTicketsPage.jsx), [`SupportRefundsPage.jsx`](front-end/src/pages/support/SupportRefundsPage.jsx), [`SupportMessagesPage.jsx`](front-end/src/pages/support/SupportMessagesPage.jsx)
* **Components / Props**: `TicketRow`, `SupportTicketDetailModal`, `SupportRefundDetailModal`.
* **State / Events**: Ticket queue filter (`Open`, `In Progress`, `Resolved`), selected ticket modal state, refund review approval state.
* **Controlled Forms**: Support reply textarea, ticket status select, refund rejection reason input.
* **useEffect / Side Effects**: Fetches tickets (`GET /support-tickets`) and refunds (`GET /refunds`) with linked payment reconciliation.
* **Complete Action $\rightarrow$ API $\rightarrow$ State $\rightarrow$ Render Flow**:
  1. *Action*: Support agent opens ticket #1 and changes status dropdown from `Open` to `In Progress`.
  2. *API*: Dispatches `PATCH /support-tickets/:id/status` with `{ status: 'In Progress' }`.
  3. *State*: Modifies ticket status in `tickets` state array.
  4. *Render*: Ticket row badge changes to blue `In Progress`. If a Traveler views their ticket, they immediately see the updated status.
* **Live Viva Modification**: In `SupportTicketsPage.jsx`, add a filter dropdown to filter tickets by priority (High / Medium / Low).

### Member 6: Travel Agency Portal
* **Owner Files**: [`AgencyBookPackagePage.jsx`](front-end/src/pages/agency/AgencyBookPackagePage.jsx), [`AgencyPassengersPage.jsx`](front-end/src/pages/agency/AgencyPassengersPage.jsx), [`AgencyCommissionPage.jsx`](front-end/src/pages/agency/AgencyCommissionPage.jsx)
* **Components / Props**: `PassengerCard`, `BookingWizardStep`, `CommissionLedgerTable`.
* **State / Events**: Selected offline passenger, step wizard state, commission summary calculations.
* **Controlled Forms**: Passenger creation form (`name`, `age`, `gender`), custom booking dates, promotion submission.
* **useEffect / Side Effects**: Fetches agency passengers (`GET /passengers/agency/:agencyId`) and packages (`GET /packages`).

* **Complete Action $\rightarrow$ API $\rightarrow$ State $\rightarrow$ Render Flow**:
  1. *Action*: Agency submits new client passenger form with name, age, and gender.
  2. *API*: Sends `POST /passengers` with `{ name: 'John Doe', age: 34, gender: 'Male', agencyId: '1' }`.
  3. *State*: Receives created passenger with `passId` and appends to `passengers` state.
  4. *Render*: Closes modal and immediately renders new passenger card in passenger roster with "Add Booking" action.
* **Live Viva Modification**: In `AgencyCommissionPage.jsx`, add a toggle switch between Settled and Pending commissions.

---

## Git Commit & Push Instructions

All Git operations remain strictly manual. Run the following PowerShell-compatible commands from the repository root:

```powershell
# 1. Review status of modified and added files
git status

# 2. Stage all source files, database assets, and documentation
git add README.md Database/
git add front-end/ back-end/

# 3. Commit with genuine, descriptive message
git commit -m "docs: finalize full-platform project setup and verification"

# 4. Push changes to origin (replace 'main' with your target branch if different)
git push origin main
```

---

## Project Status

```text
Frontend: 100% React Migration Completed (61 views across 6 actor portals)
Backend: NestJS modular architecture with genuine system-config APIs
Database: In-memory architecture (Verified against single shared instance)
RBAC: Strictly enforced via RolesGuard (x-user-role and x-user-id)
Validation: class-validator DTOs with strict whitelisting
Build: 0 errors on npm run build (front-end) and tsc --noEmit (back-end)
Review–4: Full platform verified and demonstration-ready ✅
```