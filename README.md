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


Sample Login Credentials

Traveler (/login/traveler): Arjun@gmail.com / traveler123 (or Kavya@gmail.com / traveler123)

Guide (/login/staff, role: guide): Devansh@gmail.com / guide123

Support (/login/staff, role: support): Aisha.johnson@gmail.com / support123

Admin (/login/staff, role: admin): admin@ticp.com / admin123

Superuser (/login/superuser): superadmin@ticp.com / super123

Agency (/login/agency): ops@horizontravel.com / horizon123

Testing Instructions

1. Automated Backend Tests

Run the backend test suite from the back-end folder:

cd back-end
npm test


This runs all 7 specification files in sequence using ts-node:

src/trips/backend-fixes.spec.ts (trip status transitions, safe package/trip deletion, guide status reset)

src/support-users/support-users.service.spec.ts (support user profile updates and ownership checks)

src/agencies/agencies.service.spec.ts (agency registration, approval status, and password stripping)

src/admins/admins.service.spec.ts (admin profile updates and self-ownership)

src/common/guards/roles-guard-ownership.spec.ts (role and user ID ownership guard checks)

src/common/guards/child-resource-ownership.spec.ts (ownership checks for itineraries, expenses, payments, and refunds)

src/revenue/revenue-subscriptions-promotions.rbac.spec.ts (role-based access checks for revenue, subscriptions, and promotions)

2. Middleware and Log Verification

Access Logging (LoggerMiddleware): Registered in back-end/src/app.module.ts for all routes. Every request is logged to the console and buffered to back-end/logs/access.log every 10 seconds via LogFileService.

Error Handling (GlobalExceptionFilter): Catches HTTP and validation errors across controllers, returns a consistent JSON error response, and writes error entries to back-end/logs/error.log at 10-second intervals.

File Upload (UploadsController): POST /uploads/attachment accepts .jpg, .jpeg, .png, and .pdf files up to 5 MB and serves them under /uploads/<filename>.

Security and RBAC: helmet() is enabled in back-end/src/main.ts along with CORS, global ValidationPipe, and RolesGuard checking x-user-role and x-user-id request headers.

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