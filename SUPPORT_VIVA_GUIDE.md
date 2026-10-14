# GlobeSync — Customer Support Specialist Actor: Viva & Defense Guide

---

## 1. Executive Summary

The **Customer Support Specialist** (`Role.SUPPORT`) actor is responsible for real-time customer care, incident resolution, refund claims ledger oversight, and direct traveler messaging. 

In this phase, the Customer Support module was converted from the legacy HTML backup (`front-end/support/`) into a modular, modern, component-driven React implementation within `front-end/src/pages/support/` and `front-end/src/components/support/`, strictly integrated with the NestJS backend API.

---

## 2. Architecture & File Structure

```
front-end/
├── src/
│   ├── pages/
│   │   └── support/
│   │       ├── SupportDashboardPage.jsx    # Real-time KPIs, velocity chart, recent tickets feed
│   │       ├── SupportTicketsPage.jsx      # Ticket queue, filtering, bulk actions, status transitions
│   │       ├── SupportRefundsPage.jsx      # Refund ledger, booking preview, processing actions
│   │       ├── SupportMessagesPage.jsx      # Two-pane direct traveler communication center
│   │       └── SupportProfilePage.jsx       # Personal desk info, self-scoped profile updates
│   ├── components/
│   │   └── support/
│   │       ├── SupportTicketDetailModal.jsx # Detailed view, traveler info card, status update
│   │       ├── SupportCreateTicketModal.jsx # Controlled form to log tickets for travelers
│   │       ├── SupportRefundDetailModal.jsx # Inspection, ledger crediting vs gateway disclaimer
│   │       ├── SupportCreateRefundModal.jsx # Select traveler/booking, preview, create refund
│   │       └── SupportChatWindow.jsx        # Message thread, sender/receiver bubbles, reply input
│   ├── layouts/
│   │   └── DashboardLayout.jsx             # Role-based menu registered with Profile destination
│   ├── services/
│   │   └── api.js                          # supportTicketsApi, refundsApi, messagesApi, supportUsersApi
│   └── App.jsx                             # Registered /support/* routes under ProtectedRoute
```

---

## 3. Core Workflows & Business Policies

### Workflow 1: Backend-Driven Dashboard & Operations Center
- **Endpoint**: `GET /dashboard/support`
- **Metrics Displayed**: Total Tickets, Open Tickets, Resolved Tickets, Refund Requests, Pending Refunds.
- **Agent Presence Toggle**: Local state toggle for *Agent Online / Offline* with visual status dot and notification feedback.
- **Velocity Visualization**: 7-day resolution throughput and SLA compliance tracking.
- **Recent Requests**: Displays the 5 latest support tickets with quick status indicators and an immediate "View Details" modal.

### Workflow 2: Ticket Queue & Status Transitions
- **Endpoints**: `GET /support-tickets`, `PATCH /support-tickets/:id/status`, `POST /support-tickets`
- **Supported Status Values**: `Open` $\rightarrow$ `In Progress` $\rightarrow$ `Resolved` $\rightarrow$ `Closed`.
- **Validation**:
  - `UpdateTicketStatusDto`: requires `@IsIn(['Open', 'In Progress', 'Resolved', 'Closed'])`.
  - Rejects invalid arbitrary statuses with HTTP 400.
- **Features**:
  - Multi-criteria filtering by Keyword Search, Priority (`High`, `Medium`, `Low`), and Status.
  - Multi-select checkbox bar for bulk actions (e.g. Bulk Resolve).
  - Ticket Details Modal: Displays traveler customer details (`TC00{id}`), contact info, quick action to message traveler, internal resolution notes, and status decision buttons.

### Workflow 3: Refund Ledger & Gateway vs. Internal Distinction
- **Endpoints**: `GET /refunds`, `POST /refunds`, `PATCH /refunds/:id/status`
- **Supported Status Values**: `Processing` $\rightarrow$ `Completed` | `Rejected`.
- **CRITICAL TRANSPARENCY RULE**:
  > **Internal Ledger Update vs. Payment Gateway Rails**:
  > Marking a refund claim as `Completed` records an approved credit in GlobeSync's internal financial ledger and triggers internal revenue deduction hooks. 
  > Real-world credit card reversals, automated ACH transfers, or merchant bank chargebacks require payment processor settlement (5-7 business days) or simulated demo confirmation. **The system never invents successful fake external bank transfers.**
- **Initiating Refunds**: Selects traveler $\rightarrow$ filters active traveler bookings $\rightarrow$ auto-populates original amount $\rightarrow$ validates refund amount $\le$ booking amount $\rightarrow$ submits `POST /refunds`.

### Workflow 4: Two-Way Direct Messaging
- **Endpoints**: `GET /messages`, `POST /messages`, `GET /messages/conversation`
- **Communication Flow**:
  - Traveler sends inquiry: `{ sender: 'traveler', senderId, receiver: 'support', receiverId: careId, content }`.
  - Support receives inquiry in real-time conversation list.
  - Support replies: `{ sender: 'support', senderId: careId, receiver: 'traveler', receiverId: travelerId, content }`.
  - Deep-Linking: Navigating with query param `?travelerId=...` from Ticket Details or Dashboard automatically selects and opens the conversation.

### Workflow 5: Support Specialist Profile & Security Scoping
- **Endpoints**: `GET /support-users/:id`, `PUT /support-users/:id`
- **Self-Scoping Enforcement**:
  - Under `RolesGuard`, a `Role.SUPPORT` user can ONLY read and update their own record (`x-user-id === :id`). Attempting to view or modify another agent's profile returns **403 Forbidden**.
- **Permitted Fields**: `name`, `contact`, `email`.
- **Security Constraint**: Password and role modifications are immutable via `/support-users/:id`. The form clearly documents this policy to prevent deceptive UI behavior.
- **Session Sync**: Updates session context via `updateUser(...)` so top navigation headers and badges reflect the new identity immediately.

---

## 4. API Endpoints Contract Reference

| Method | Endpoint | Allowed Roles | Description |
|---|---|---|---|
| `GET` | `/dashboard/support` | `SUPPORT`, `SUPERUSER` | Aggregated ticket and refund KPIs |
| `GET` | `/support-tickets` | `SUPPORT`, `ADMIN`, `SUPERUSER` | All support tickets |
| `GET` | `/support-tickets/:id` | `SUPPORT`, `TRAVELER`, `ADMIN`, `SUPERUSER` | Single ticket details |
| `POST` | `/support-tickets` | `SUPPORT`, `TRAVELER`, `AGENCY`, `SUPERUSER` | Create new support ticket |
| `PATCH` | `/support-tickets/:id/status` | `SUPPORT`, `ADMIN`, `SUPERUSER` | Update ticket status (`Open`, `In Progress`, `Resolved`, `Closed`) |
| `GET` | `/refunds` | `SUPPORT`, `ADMIN`, `SUPERUSER` | All refund records |
| `POST` | `/refunds` | `SUPPORT`, `TRAVELER`, `SUPERUSER` | Record a refund claim (`Processing`) |
| `PATCH` | `/refunds/:id/status` | `SUPPORT`, `SUPERUSER` | Update refund status (`Processing`, `Completed`, `Rejected`) |
| `GET` | `/messages` | `SUPPORT`, `ADMIN`, `SUPERUSER` | Global message records |
| `POST` | `/messages` | `SUPPORT`, `TRAVELER`, `GUIDE`, `AGENCY`, `SUPERUSER` | Post bidirectional direct message |
| `GET` | `/support-users/:id` | `SUPPORT` (own), `ADMIN`, `SUPERUSER` | Get agent profile (self-scoped) |
| `PUT` | `/support-users/:id` | `SUPPORT` (own), `ADMIN`, `SUPERUSER` | Update agent `name`, `contact`, `email` |

---

## 5. Verification & Test Evidence

End-to-end verification executed via `scratch/verify_support_e2e.js` against the live backend daemon:

```
====================================================
STARTING SUPPORT ACTOR WORKFLOW VERIFICATION SUITE
====================================================

1. Testing Support Dashboard API (GET /dashboard/support)...
  ✓ Dashboard returns 200 (Got 200)
  ✓ Contains totalTickets metric
  ✓ Contains openTickets metric
  ✓ Contains refundRequests metric

2. Testing Ticket Lifecycle (Traveler -> Support -> Refresh)...
  ✓ Ticket created by traveler (Got 201)
  ✓ Ticket assigned ID #105
  ✓ Initial ticket status is Open
  ✓ Support can access ticket queue
  ✓ Newly created ticket visible in support queue
  ✓ Support can update status to In Progress
  ✓ Status updated to In Progress
  ✓ Support can update status to Resolved
  ✓ Status updated to Resolved
  ✓ Traveler can fetch their tickets
  ✓ Traveler sees status Resolved upon refresh
  ✓ Rejects invalid ticket status with 400 (Got 400)

3. Testing Refund Ledger Workflows...
  ✓ Support can read refunds ledger
  ✓ Refunds response is an array
  ✓ Refund created with 201 (Got 201)
  ✓ Refund assigned REF002
  ✓ Initial status is Processing
  ✓ Support can mark refund as Completed
  ✓ Refund status updated to Completed
  ✓ Support can update refund to Rejected
  ✓ Refund status updated to Rejected
  ✓ Rejects invalid refund status with 400 (Got 400)

4. Testing Two-Way Direct Messaging...
  ✓ Traveler message sent successfully
  ✓ Support reply sent successfully
  ✓ Can retrieve bidirectional conversation
  ✓ Conversation data is an array
  ✓ Conversation contains traveler inquiry
  ✓ Conversation contains support reply

5. Testing Support User Profile Updates & RBAC Security...
  ✓ Support can read own profile
  ✓ Profile returned for careId #1
  ✓ Password field is never exposed in profile response
  ✓ Support can update permitted profile fields
  ✓ Name updated correctly
  ✓ Contact updated correctly
  ✓ Support blocked from other support profiles (Got 403)
  ✓ Rejects invalid email format with 400 (Got 400)

====================================================
TEST SUITE COMPLETE: 40 PASSED, 0 FAILED
====================================================
```

Frontend production build check:
`npm run build` compiled 158 modules in 5.05s with 0 errors.

---

## 6. Viva / Defense Questions & Model Answers

### Q1: How does the support actor manage ticket state transitions, and how do you guarantee data consistency across roles?
**Answer**:
Ticket updates use explicit `PATCH /support-tickets/:id/status` calls validated by NestJS's `UpdateTicketStatusDto`. Only four states are permitted: `Open`, `In Progress`, `Resolved`, and `Closed`. When a support agent modifies a ticket, the change is persisted in the backend database/store. When the traveler reloads their ticket list via `GET /support-tickets/traveler/:id`, the updated status is immediately visible. The UI does not depend on stale client state.

### Q2: Why is it crucial to distinguish an internal refund record update from a real payment gateway refund?
**Answer**:
Marking a refund as `Completed` in an ERP or internal booking ledger updates accounting records and marks the platform claim as resolved. However, actual disbursement of funds back to a traveler's credit card requires payment gateway settlement (Stripe/merchant processor API rails) or manual banking wire transfers, which take 5-7 business days or remain simulated demo records. Claiming that clicking "Completed" executed an automated instantaneous bank transfer would be fraudulent and technically misleading.

### Q3: How is authorization and privacy enforced for support agent profile management?
**Answer**:
The `SupportUsersController` is guarded by `RolesGuard`. For `Role.SUPPORT`, the guard inspects the request header `x-user-id` and ensures it strictly equals the target route parameter `:id`. An agent cannot inspect or mutate another agent's profile. Furthermore, the endpoint only accepts `name`, `contact`, and `email`; passwords and role levels cannot be altered via this endpoint.

### Q4: How does messaging between travelers and support work in React without WebSockets?
**Answer**:
We use standard REST endpoints (`GET /messages`, `POST /messages`). Conversations are grouped bidirectionally by traveler ID. When a message is sent, the UI applies an optimistic update and queries the latest thread. If navigation occurs from a specific ticket card (`/support/messages?travelerId=1`), the URL search parameter automatically mounts and scrolls the chat directly to that traveler.
