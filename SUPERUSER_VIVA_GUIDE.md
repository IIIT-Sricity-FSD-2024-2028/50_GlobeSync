# GlobeSync — Superuser Module React Evaluation & Viva Guide

This comprehensive guide is prepared for technical evaluation and oral viva examination of the **Superuser Governance & Platform Controls Module** in GlobeSync. It documents the actual React components, in-memory system configuration APIs, financial telemetry, honest integration disclosures, and evaluation walkthrough flows.

---

## 1. Architectural Philosophy & Evaluation Pitch

When asked to summarize the architecture of the Superuser module:

> *"The Superuser portal represents the supreme governance layer of GlobeSync. Built with React 18 functional components and custom SVG charts, it oversees platform-wide user directories, financial revenue streams, B2B partner agreements, and live system policies. Unlike fragile demo interfaces that store rules purely in local React state, our implementation communicates with validated, superuser-protected in-memory configuration endpoints (`/system-config/rules`, `/system-config/payment-methods`, `/system-config/integrations`, and `/system-config/audit-logs`). These policies actively govern backend operations—such as rejecting payments exceeding the platform ceiling or using disabled payment methods—and changes survive page refreshes and multi-session access. External services like Amadeus or Stripe are disclosed honestly as simulation demonstrators, and all financial metrics strictly distinguish gross volume, commissions, payouts, and cumulative subscriptions."*

---

## 2. Directory Structure & Component Paths

```text
front-end/src/
├── App.jsx                                     # Superuser protected routes (allowedRoles={['superuser']})
├── context/
│   └── SessionContext.jsx                     # Superuser session credentials and global role
├── layouts/
│   └── DashboardLayout.jsx                    # Superuser sidebar navigation and header
├── services/
│   └── api.js                                 # Centralized REST API wrappers including systemConfigApi
├── pages/super/
│   ├── SuperDashboardPage.jsx                 # Platform command center with measured latency & honest ratings
│   ├── SuperUsersPage.jsx                     # User directory with Traveler and Guide CRUD
│   ├── SuperAgenciesPage.jsx                  # Reseller ecosystem administration and commission contracts
│   ├── SuperRevenuePage.jsx                   # Financial intelligence, net platform margin, and monetization
│   ├── SuperReportsPage.jsx                   # Telemetry analytics, monthly trends, and population disclosures
│   ├── SuperRulesConfigPage.jsx               # Live platform business rules (ceilings, cutoffs, auto-confirm)
│   ├── SuperPaymentMethodsPage.jsx            # Payment channels governance and active status enforcement
│   ├── SuperApiManagementPage.jsx             # Third-party integration connector and simulation monitor
│   └── SuperProfilePage.jsx                   # Administrator identity update (name & email)
└── components/super/
    ├── AuditLogDrawer.jsx                     # Real-time drawer displaying audit trail of saved system changes
    └── ConfirmationDialog.jsx                 # Controlled modal for destructive or governance confirmations
```

---

## 3. Workflow-by-Workflow Code Walkthrough

### Workflow 1: Superuser Dashboard & Measured Health (`SuperDashboardPage.jsx`)
- **API Endpoints**: `GET /dashboard/superuser`, `GET /health`, `GET /reviews`.
- **Honest Telemetry**:
  - Replaces hardcoded "99.9% uptime" or "4ms latency" claims with measured API ping latency via `healthApi.check()`.
  - Calculates average ratings from actual review records (`tripRating` and `guideRating`), displaying "No reviews yet" when no reviews exist rather than inventing a false 5.0 score.
  - Distinguishes registered user counts from active usage.

### Workflow 2: Master User Directory (`SuperUsersPage.jsx`)
- **API Endpoints**: `GET /travelers`, `GET /guides`, `POST /guides`, `PUT /travelers/:id`, `PUT /guides/:id`, `DELETE /travelers/:id`, `DELETE /guides/:id`.
- **Guide Fee Consistency**:
  - Uses `pricePerTrip` consistently across reads, forms, and updates.
  - Preserves valid zero values (`₹0` honorary guides) instead of substituting arbitrary defaults.
- **Controlled Forms**: Field validation for phone numbers, languages, and traveler credentials.

### Workflow 3: Agency Governance & Commission Contracts (`SuperAgenciesPage.jsx`)
- **API Endpoints**: `GET /agencies`, `POST /agencies`, `PATCH /agencies/:id`, `PATCH /agencies/:id/status`, `DELETE /agencies/:id`.
- **Commission Contract Enforcement**:
  - Valid contract rate range: `0.5%` to `1.5%`. Values outside this range are rejected by DTO validation (`"commissionRate must not be greater than 1.5"`).
  - Distinguishes omitting a rate from changing a rate.
  - Handles agency profile-update success followed by status-update failure gracefully, surfacing specific errors without corrupting the partner record.

### Workflow 4: Financial Intelligence & Revenue Breakdown (`SuperRevenuePage.jsx`)
- **API Endpoints**: `GET /api/admin/revenue/overview`, `GET /api/admin/revenue/breakdown`, `GET /api/admin/revenue/transactions`.
- **Clear Financial Distinctions**:
  - **Gross Paid Booking Volume**: Total client funds processed.
  - **Platform Commission Margin**: GlobeSync net revenue.
  - **Agency Payouts / Reseller Margins**: Partner commissions disbursed.
  - **Subscription Revenue**: Total fees collected from reseller licenses, labeled as cumulative subscriptions rather than recurring MRR without recurring billing telemetry.

### Workflow 5: In-Memory Platform Rules & Ceilings (`SuperRulesConfigPage.jsx`)
- **API Endpoints**: `GET /system-config/rules`, `PUT /system-config/rules`.
- **Backend Policy Enforcement**:
  - `bookingLimit`: Configures single transaction maximum (e.g. ₹6,00,000). The backend `PaymentsService.create()` directly enforces this rule, rejecting payments exceeding the ceiling with `400 Bad Request`.
  - `cancellationCutoffHours`: Cancellation threshold (e.g. 72 hours).
  - Changes are recorded in in-memory audit logs and survive page refresh and multi-session access.

### Workflow 6: Payment Methods Channel Governance (`SuperPaymentMethodsPage.jsx`)
- **API Endpoints**: `GET /system-config/payment-methods`, `PUT /system-config/payment-methods/:id`.
- **Live Channel Protection**:
  - Toggling a channel (e.g. UPI) to `Inactive` immediately prevents any traveler or agency from paying via UPI (`PaymentsService.create()` throws `"Payment method 'UPI' is currently disabled by platform administrator."`).
  - Safe constraint: The system blocks disabling the last remaining active payment channel to prevent platform payment deadlocks.

### Workflow 7: Third-Party API Demonstrators (`SuperApiManagementPage.jsx`)
- **API Endpoints**: `GET /system-config/integrations`, `PUT /system-config/integrations/:id`.
- **Honest Integration Disclosure**:
  - GlobeSync Core REST Engine is listed as Active live service.
  - External connectors (Amadeus Flight Search, Stripe Payment Gateway, OpenWeather API) are explicitly disclosed as simulated sandbox connectors.

---

## 4. Multi-Tenant RBAC & Security Boundaries

| Operation | Method | Endpoint | Allowed Roles | Enforcement Mechanism |
| :--- | :--- | :--- | :--- | :--- |
| Superuser Dashboard | `GET` | `/dashboard/superuser` | `superuser` | `RolesGuard` strictly allows only superuser |
| Manage Platform Rules | `PUT` | `/system-config/rules` | `superuser` | Admins, travelers, agencies blocked (`403`) |
| Toggle Payment Channel | `PUT` | `/system-config/payment-methods/:id` | `superuser` | Admins blocked (`403`) |
| Toggle Integrations | `PUT` | `/system-config/integrations/:id` | `superuser` | Superuser exclusive |
| Audit Trail Logs | `GET` | `/system-config/audit-logs` | `superuser` | Superuser exclusive |
| Provision Staff Accounts | `POST`, `DELETE` | `/super/admins`, `/super/support-users` | `superuser` | Superuser exclusive; self-deletion blocked |
| Superuser Profile | `PUT` | `/admins/:id` | `superuser`, `admin` | Self-scoped: `:id` must match `x-user-id` |

---

## 5. Complete Flow Walkthrough (Action → API → State → Render)

```text
User Action: Superuser adjusts Single Booking Ceiling to ₹6,00,000 on SuperRulesConfigPage.
    │
    ▼
Event Handler: `handleSaveRules(e)` fires with `{ bookingLimit: 600000, cancellationCutoffHours: 72 }`.
    │
    ▼
API Request: Calls `systemConfigApi.updateRules({ ...rulesPayload })`.
    Headers: `x-user-role: superuser`, `x-user-id: 1`.
    │
    ▼
Backend Processing: `SystemConfigService.updateRules()` validates parameters, updates in-memory
    configuration, and writes an entry into `systemAuditLogs` with timestamp and user ID.
    │
    ▼
Component State Update: React updates local `rules` state, displays success notification,
    and refreshes the Audit Log drawer.
    │
    ▼
System-Wide Effect: A concurrent traveler or agency attempting to create a payment of ₹7,50,000
    is immediately rejected by `PaymentsService.create()` with HTTP 400 Bad Request.
```

---

## 6. Live Viva Code Modification Demonstration

When asked to demonstrate a live code change to prove ownership of the codebase:

- **Modification Scenario**: Add a quick search filter to `SuperUsersPage.jsx` to filter travelers and guides by email domain (e.g. `@gmail.com` or `@ticp.com`).
- **Code Change**:
  ```jsx
  // In SuperUsersPage.jsx, inside the filteredUsers useMemo:
  const matchesDomain = selectedDomain === 'all' 
    ? true 
    : (user.email || '').toLowerCase().endsWith(selectedDomain);
  return matchesSearch && matchesRole && matchesDomain;
  ```
- **Explanation**: Show how extracting the domain check into the declarative `useMemo` filter pipeline updates the user directory grid instantly without mutating original array records or triggering unneeded network requests.
