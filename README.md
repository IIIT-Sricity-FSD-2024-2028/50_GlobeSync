GlobeSync – Travel Itinerary Planning and Coordination Platform

GlobeSync is a role-based travel itinerary planning and coordination web application built for the Travel and Hospitality domain. It connects travelers, tour guides, customer support staff, travel agencies, administrators, and superusers on a single platform to plan trips, manage bookings, track itineraries and expenses, and handle customer support workflows.

The frontend is built as a single-page application using React 18 and Vite, and the backend is built using NestJS and TypeScript with in-memory data storage, DTO validation, role-based access control, logging and error handling middleware, file uploads, and Swagger API documentation.

Project Structure

root/
├── front-end/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── public/
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── context/
│       ├── layouts/
│       ├── services/
│       ├── styles/
│       ├── pages/
│       └── components/
├── back-end/
│   ├── package.json
│   ├── docs/
│   │   └── swagger.json
│   ├── logs/
│   ├── uploads/
│   └── src/
├── Database/
│   ├── ER.png
│   ├── database_schema.sql
│   └── DBschema.sql
├── Figma/
├── Videos/
├── SRS.pdf
├── DomainExpertInteraction.md
├── definitions.yaml
└── README.md


Project Setup and Dependencies

Prerequisites

Node.js (v18 or above)

npm (v9 or above)

Frontend Dependencies (front-end/package.json)

react and react-dom (^18.3.1) for component rendering and state hooks

react-router-dom (^6.28.1) for client-side routing and protected role routes

vite (^6.0.7) and @vitejs/plugin-react (^4.3.4) for development server and production bundling

Backend Dependencies (back-end/package.json)

@nestjs/common, @nestjs/core, and @nestjs/platform-express (^10.4.15) for modular REST API controllers, services, guards, pipes, and middleware

@nestjs/swagger and swagger-ui-express for API documentation

class-validator and class-transformer for DTO request validation

helmet for HTTP security headers

multer (via @nestjs/platform-express) for handling file attachment uploads

Installing Dependencies

Install backend packages:

cd back-end
npm install


Install frontend packages:

cd ../front-end
npm install


Execution Steps

Keep the backend server running while using the frontend so in-memory records stay active across requests.

1. Start the Backend Server

cd back-end
npm run start:dev


Backend server URL: http://localhost:3000

Health check endpoint: http://localhost:3000/health

Swagger UI documentation: http://localhost:3000/api

2. Start the React Frontend Server

Open a second terminal and run:

cd front-end
npm run dev


Frontend application URL: http://localhost:5173

3. Production Build

To verify the production build for both parts of the project:

cd front-end
npm run build

cd ../back-end
npm run build


Academic Demo Accounts

For assessment, grading, and demonstration purposes, GlobeSync includes pre-configured academic demo accounts across all six platform roles. In development mode (`VITE_SHOW_DEMO_ACCOUNTS=true`), the login screen features an interactive Actor Picker that auto-fills credentials:

| Actor Name | Role | Email | Portal Route | Primary Capabilities |
| :--- | :--- | :--- | :--- | :--- |
| **Arjun Mehta** | Traveler | `Arjun@gmail.com` | `/traveler/dashboard` | Itinerary wizard, package bookings, live guide chat, reviews |
| **Devansh Sharma** | Guide | `Devansh@gmail.com` | `/guide/dashboard` | Trip requests, atomic date availability, verified review hub |
| **Horizon Travel** | Agency | `Horizon@gmail.com` | `/agency/dashboard` | Curated packages, commission tracking, group passenger manifest |
| **Aisha Johnson** | Support | `Aisha.johnson@gmail.com` | `/support/dashboard` | Ticket queue, SLA timers, emergency overrides (<12h) |
| **Manoj Gupta** | Admin | `Manoj@gmail.com` | `/admin/dashboard` | Agency approval, guide contractual rate lock, audit log trail |
| **Super Admin** | Superuser | `superuser@globesync.com` | `/super/dashboard` | Platform policy config, staff provisioning, settled ledger revenue |

> **Security Notice**: In compliance with enterprise standards, zero plaintext passwords are stored or published. All demo credentials are cryptographically hashed using **Argon2 / Bcrypt (cost factor >= 12)** with account lockout protection.

Testing Instructions

GlobeSync includes a comprehensive automated test pyramid spanning unit, integration, and end-to-end browser tests:

1. Automated Backend Unit Test Suite (206 tests, 100% pass)

Run all 12 unit test specification files from the `back-end` directory:

```bash
cd back-end
npm test
```

This executes all 12 test specifications in sequence:
- `src/trips/backend-fixes.spec.ts` (Trip status transitions, referential integrity, guide status lifecycle)
- `src/support-users/support-users.service.spec.ts` (Support user profile immutability and ownership guards)
- `src/agencies/agencies.service.spec.ts` (Agency registration, approval status, password stripping)
- `src/admins/admins.service.spec.ts` (Admin profile governance, immutable roles, self-ownership)
- `src/common/guards/roles-guard-ownership.spec.ts` (Role-based access control and ID boundary guards)
- `src/common/guards/child-resource-ownership.spec.ts` (Ownership enforcement on itineraries, expenses, payments, refunds)
- `src/revenue/revenue-subscriptions-promotions.rbac.spec.ts` (Settled ledger revenue, subscription tiers, promotions)
- `src/auth/auth-security.spec.ts` (JWT tokens, role escalation prevention, Bcrypt cost >= 12, account lockout)
- `src/policy/policy.spec.ts` (Centralized PolicyService, lead time >= 24h, table-driven 73h/72h/12h/0h tiers, snapshots, emergency overrides)
- `src/bookings/booking-concurrency.spec.ts` (Concurrent last-seat reservation, 15m hold expiry, state machine, payment webhooks)
- `src/realtime/realtime.spec.ts` (Socket.IO authenticated rooms, cross-room isolation, live event dispatching)
- `src/common/production-readiness.spec.ts` (Fail-fast config validation, correlation IDs, virus scan hook, audit log trails)

2. Supertest Integration Tests (12 tests, 100% pass)

Run the full end-to-end database lifecycle integration test:

```bash
cd back-end
npm run test:integration
```

Verifies the complete traveler lifecycle against a real database flow:
`register -> login -> book -> pay -> guide accepts -> chat -> cancel preview -> cancel -> refund & ledger -> review policy`

3. Business Logic Coverage Threshold Check (>= 80% Threshold)

Evaluate code coverage on core business services (`PolicyService`, `BookingStateMachine`, `PricingService`, `HoldExpiryService`):

```bash
cd back-end
npm run test:cov
```

Current verified coverage metrics:
- Overall Tested Services: **90.1%** lines
- `PolicyService`: **86.0%** lines / **93.8%** functions
- `BookingStateMachine`: **95.2%** lines / **100%** functions
- `PricingService`: **92.9%** lines / **100%** functions

4. Playwright End-to-End Browser Tests (9 tests, 100% pass)

Run cross-browser user journey and portal boundary tests:

```bash
cd front-end
npx playwright test
```

Covers:
- **Actor Login Picker & Auto-Fill**: Verifies selecting all 6 actors auto-fills credentials, and confirms the picker is hidden when `VITE_SHOW_DEMO_ACCOUNTS=false`.
- **Portal RBAC Boundaries**: Verifies each of the 6 actors lands on their designated dashboard (`/traveler/dashboard`, `/guide/dashboard`, `/agency/dashboard`, `/support/dashboard`, `/admin/dashboard`, `/super/dashboard`) and is strictly blocked (`/unauthorized`) when attempting unauthorized cross-portal access.
- **Full User Journey**: Complete browser journey from traveler registration through booking, payment, guide acceptance, chat, cancellation, refund, and review.

5. Continuous Integration (GitHub Actions)

Configured under `.github/workflows/ci.yml`. Executes on every push and pull request to `main`:
- Backend typecheck (`tsc --noEmit`), unit tests, integration tests, coverage checks, and production build.
- Frontend build verification.
- Headless Playwright browser automation tests.

Individual Contribution

Name: Sai Koushik Chowdary Thati

Module: Traveler Portal (React Implementation and Backend API Integration)

Overview of Work Done

I developed the React implementation for the Traveler module and integrated it with the NestJS backend endpoints. My work covers traveler registration and login integration, the traveler dashboard, package browsing with filters, the multi-step trip creation wizard, daily itinerary management, booking checkout and payment recovery, trip expense tracking with CSV export, direct messaging with guides and support, raising support tickets with booking references and file attachments, and managing the traveler's profile and saved co-traveler passenger list.

Key React features implemented in my module:

Reusable functional components communicating through props and callback handlers between parent page containers and child UI/modal components.

Local state management using useState for multi-step forms, filters, and modals, useRef for smooth section scrolling, and global session access via SessionContext.

Controlled forms with client-side validation across trip creation, itinerary items, card/UPI payments, expense logging, support tickets, profile editing, passenger management, and traveler signup.

Lifecycle side effects using useEffect with AbortController cleanup for API calls, URL query parameter synchronization (?tripId= and ?packageId=), and sessionStorage recovery for interrupted trip submissions.

Specific Files Developed or Modified

Traveler Pages (front-end/src/pages/):

front-end/src/pages/traveler/TravelerDashboardPage.jsx – Traveler dashboard showing trip counts, spending summary, upcoming trips, and package shortcuts.

front-end/src/pages/traveler/TravelerPackagesPage.jsx – Tour package catalog with keyword search, duration filter, budget filter, sorting, and package details modal.

front-end/src/pages/traveler/TravelerCreateTripPage.jsx – Multi-step trip planning wizard supporting pre-planned packages and custom trips, transport and hotel selection, guide assignment, live cost calculation, and step recovery.

front-end/src/pages/traveler/TravelerTripsPage.jsx – Trip list management, status and keyword filtering, trip edit/cancel actions, useRef scroll navigation, and daily itinerary scheduling.

front-end/src/pages/traveler/TravelerBookingsPage.jsx – Bookings overview, type/status filtering, booking cancellation, payment modal integration, and payment history inspection.

front-end/src/pages/traveler/TravelerExpensesPage.jsx – Trip expense tracker with category breakdown bars, search filter, add/edit expense modal, and CSV report export.

front-end/src/pages/traveler/TravelerMessagesPage.jsx – Two-pane messaging page for chatting with assigned tour guides and customer support with per-conversation message drafts.

front-end/src/pages/traveler/TravelerSupportPage.jsx – Support ticket creation and tracking page with linked booking selection and file attachment support.

front-end/src/pages/traveler/TravelerProfilePage.jsx – Personal profile editor, password update form, and saved co-traveler passenger list management.

front-end/src/pages/public/TravelerSignupPage.jsx – Controlled traveler signup form with input validation and session initialization.

Traveler and Feature Components (front-end/src/components/):

front-end/src/components/trips/PlanningModeSelect.jsx – Planning mode selection step (package vs. custom trip).

front-end/src/components/trips/TripForm.jsx – Multi-step trip form coordinator.

front-end/src/components/trips/TransportSelectStep.jsx – Transport mode and tier selection step.

front-end/src/components/trips/HotelSelectStep.jsx – Hotel tier and room selection step.

front-end/src/components/trips/GuideSelectStep.jsx – Tour guide selection step.

front-end/src/components/trips/TripCostSummary.jsx – Live cost breakdown component for base fare, transport, hotel, guide fee, and travel insurance.

front-end/src/components/trips/TripSubmissionRecoveryBanner.jsx – Recovery banner for retrying interrupted multi-step trip submissions.

front-end/src/components/trips/TripCreationSuccessView.jsx – Confirmation screen displaying created trip and booking references.

front-end/src/components/trips/tripCalculations.js – Helper functions for calculating trip duration and itemized costs.

front-end/src/components/trips/TripFilterBar.jsx – Search bar and status filter pills for the trips page.

front-end/src/components/trips/ActiveTripHeader.jsx – Header banner for the currently selected trip.

front-end/src/components/trips/TripList.jsx – Grid layout for displaying traveler trips.

front-end/src/components/trips/TripCard.jsx – Individual trip card with status badge and action buttons.

front-end/src/components/trips/TripEditModal.jsx – Controlled modal for editing trip destination, dates, budget, and preferences.

front-end/src/components/itineraries/ItineraryList.jsx – Day-wise itinerary activity list.

front-end/src/components/itineraries/ItineraryForm.jsx – Controlled form for adding and updating itinerary activities.

front-end/src/components/bookings/BookingStats.jsx – Summary cards for booking counts and amounts.

front-end/src/components/bookings/BookingList.jsx – Table component for transport and hotel bookings.

front-end/src/components/bookings/PaymentModal.jsx – Controlled payment modal with card/UPI validation, duplicate payment check, and trip status synchronization.

front-end/src/components/bookings/BookingDetailModal.jsx – Modal displaying payment ledger history and refund request submission.

front-end/src/components/bookings/paymentHelpers.js – Validation helpers for card number, expiry date, and CVV inputs.

front-end/src/components/expenses/ExpenseStats.jsx – Expense summary and category progress bars.

front-end/src/components/expenses/ExpenseList.jsx – Table of logged trip expenses.

front-end/src/components/expenses/ExpenseFormModal.jsx – Controlled modal for adding and editing expenses.

front-end/src/components/packages/PackageFilter.jsx – Search, duration, budget, and sort controls for packages.

front-end/src/components/packages/PackageList.jsx – Grid container for package cards.

front-end/src/components/packages/PackageCard.jsx – Package card displaying destination details, pricing, and action buttons.

front-end/src/components/passengers/PassengerList.jsx – List component for saved co-traveler companions.

front-end/src/components/passengers/PassengerFormModal.jsx – Controlled modal for adding and editing co-traveler details.

front-end/src/components/profile/ProfileForm.jsx – Controlled form for updating traveler profile details.

front-end/src/components/messages/ConversationList.jsx – Sidebar list of message contacts.

front-end/src/components/messages/MessageThread.jsx – Message history view for active conversations.

front-end/src/components/messages/MessageInput.jsx – Controlled message input bar.

front-end/src/components/support/TicketList.jsx – List of submitted traveler support tickets.

front-end/src/components/support/TicketForm.jsx – Controlled support ticket form with booking link and attachment upload.

Shared Application Files Modified:

front-end/src/App.jsx – Configured /traveler/*, /login/traveler, and /signup/traveler routes with ProtectedRoute.

front-end/src/context/SessionContext.jsx – Session state management for storing user details and active role.

front-end/src/services/api.js – Fetch API client helper methods (travelersApi, packagesApi, tripsApi, itinerariesApi, bookingsApi, paymentsApi, refundsApi, expensesApi, passengersApi, messagesApi, supportTicketsApi, uploadsApi) with x-user-role and x-user-id headers.