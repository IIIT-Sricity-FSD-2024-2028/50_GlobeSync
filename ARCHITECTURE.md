# GlobeSync System Architecture Specification

## 1. System Overview & Platform Topology

GlobeSync is a full-stack, enterprise-grade travel coordination and itinerary orchestration platform built specifically for the Online Travel Agency (OTA) and hospitality domain. The platform interconnects six specialized business personas:

1. **Traveler (Arjun Mehta)**: Itinerary planning wizard, package booking, budget vs. real expense tracker, in-app guide coordination chat, pre-flight cancellation previews, verified post-trip reviews.
2. **Tour Guide (Devansh Sharma)**: Atomic date-overlap checks, trip request acceptance/rejection, real-time traveler messaging, transparent aggregated rating analytics.
3. **Travel Agency (Horizon Travel Partners)**: Curated wholesale package creation, group booking passenger manifests, commission earnings lifecycle (`Pending -> Earned -> Settled`).
4. **Customer Support (Aisha Johnson)**: 24/7 ticket queue triage, SLA timers, traveler-guide conflict resolution, auditable Emergency Override adjudication under `< 12h` departure windows.
5. **Platform Administrator (Manoj Gupta)**: Commercial agency vetting, guide credential verification, contractual guide rate lock, cross-actor governance, operational audit logs.
6. **Super Administrator (Executive Superuser)**: Global financial settings (commission %, cancellation penalty %), subscription plan tiering, staff account provisioning, immutable ledger analytics.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          GlobeSync Architecture                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                  │
          ┌───────────────────────┴───────────────────────┐
          ▼                                               ▼
┌──────────────────┐                            ┌──────────────────┐
│  React 18 SPA    │  ◄── WebSocket (Events) ── │   NestJS 10 API  │
│  Vite Bundler    │  ─── HTTP / REST + JWT ──► │  Modular Engine  │
│  Context + UI    │                            │  Guards & Pipes  │
└──────────────────┘                            └──────────────────┘
                                                          │
          ┌───────────────────────────────────────────────┴───────────────┐
          ▼                                                               ▼
┌───────────────────────────────┐                           ┌───────────────────────────┐
│     Core Domain Engines       │                           │    Storage & Security     │
│ ───────────────────────────── │                           │ ───────────────────────── │
│ • PolicyService (Rules Engine)│                           │ • PostgreSQL (Prisma ORM) │
│ • BookingStateMachine         │                           │ • In-Memory Test DB       │
│ • Server-Side Pricing Engine  │                           │ • Append-Only Ledger      │
│ • Inventory & 15m Hold Expiry │                           │ • S3-Compatible Uploads   │
│ • RealtimeGateway (Socket.IO) │                           │ • Pino Logging & Auditing │
└───────────────────────────────┘                           └───────────────────────────┘
```

---

## 2. Hexagonal / Layered Architecture

The backend follows a layered, modular domain design implemented in NestJS 10:

```
[ HTTP Requests / WebSockets ]
             │
             ▼
[ Middleware Layer ]
   ├── Helmet & CORS Allow-list
   ├── CorrelationIdMiddleware (UUIDv4)
   └── Pino Structured HTTP Logger
             │
             ▼
[ Guards & Interceptors ]
   ├── ThrottlerGuard (Rate Limiting)
   ├── JwtAuthGuard & RolesGuard (RBAC)
   ├── ChildResourceOwnershipGuard
   └── AuditLogInterceptor
             │
             ▼
[ Controllers / Gateways ]
   ├── REST Controllers with DTO Validation (ValidationPipe)
   └── RealtimeGateway (Authenticated Socket.IO Rooms)
             │
             ▼
[ Domain Services & Business Rules ]
   ├── PolicyService (Centralized Business Logic)
   ├── BookingsService & BookingStateMachine
   ├── PricingService (Authoritative Server-Side Calculation)
   ├── InventoryService (Capacity Locks)
   ├── LedgerService (Financial Tracking)
   └── HoldExpiryService (Background Scheduler)
             │
             ▼
[ Data Access Layer ]
   ├── PrismaService (Live PostgreSQL ORM)
   └── TestDatabase (Transactional Mock for Isolated Tests)
```

---

## 3. Actor Model & Academic Demo Accounts

GlobeSync models six distinct roles. For demonstration and assessment purposes, pre-configured demo actors are seeded in the platform:

| Actor Name | Designated Role | Portal Path | Responsibilities & Access Scope |
| :--- | :--- | :--- | :--- |
| **Arjun Mehta** | `TRAVELER` | `/traveler/dashboard` | Bookings, Itineraries, Expenses, Reviews, Chat |
| **Devansh Sharma** | `GUIDE` | `/guide/dashboard` | Assignment Acceptance, Reviews Hub, Roster |
| **Horizon Travel** | `AGENCY` | `/agency/dashboard` | Package Publishing, Commission Tracking, Subscriptions |
| **Aisha Johnson** | `SUPPORT` | `/support/dashboard` | Ticket Triage, SLA Timers, Emergency Overrides |
| **Manoj Gupta** | `ADMIN` | `/admin/dashboard` | Agency Approvals, Guide Rate Locks, Audit Log Trails |
| **Super Admin** | `SUPERUSER` | `/super/dashboard` | Global Policy Settings, Staff Provisioning, Ledger Analytics |

> **Security Note**: In compliance with production security standards, passwords are never stored in plaintext. Passwords are cryptographically hashed using **Argon2 / Bcrypt (cost factor >= 12)**. In frontend evaluation modes, the login screen provides a quick-fill actor picker driven by `VITE_SHOW_DEMO_ACCOUNTS=true`.

---

## 4. Centralized Business Rules: PolicyService

All business validation rules, cancellation policies, refund calculations, and emergency overrides are centralized within `PolicyService` (`back-end/src/policy/policy.service.ts`):

1. **Advance Booking Rule (Lead Time >= 24h)**:
   - Evaluated strictly using `departure_at_utc` and `now` in UTC.
   - If `hours_until_departure < 24.0`, throws HTTP `400 Bad Request`.
2. **Three-Tier Cancellation Matrix**:
   - **Tier 1 (`>= 72.0h`)**: Allowed. Default refund = `(100 - cancellationPenaltyPercent)%` (Default: **65% refund**, 35% penalty). With Cancellation Protection: upgraded to **90% refund** (10% penalty).
   - **Tier 2 (`>= 12.0h` and `< 72.0h`)**: Allowed. Standard refund = **0%**. With Cancellation Protection: upgraded to **50% refund**.
   - **Tier 3 (`< 12.0h`)**: Blocked (`403 Forbidden`). Prompts traveler to contact Support for emergency adjudication.
   - **Past Departure (`<= 0h`)**: Blocked (`400 Bad Request`).
3. **Policy Snapshotting (Immutability)**:
   - When a booking is created, an immutable `policy_snapshot` JSON record is permanently embedded in the booking row.
   - Subsequent changes to platform-wide penalty percentages never mutate historical bookings.
4. **Server-Side Financial Safety & Idempotency**:
   - Refunds are calculated strictly on the server from the snapshotted policy.
   - Creates a `Refunds` record, an append-only `LedgerEntry`, and updates status to `CANCELLED`.
   - Calling cancel twice is idempotent and strictly returns `409 Conflict`.
5. **Support Emergency Override (< 12h)**:
   - Support agents submit an override with mandatory reason.
   - Automatically logged to `AuditLog`.
   - If the refund amount exceeds `emergencyOverrideThresholdMinor` (e.g., > ₹1,000.00), Admin approval is required before execution.

---

## 5. Concurrency & Booking Lifecycle State Machine

1. **Inventory & Capacity Locks**:
   - Inventory items (`inventory_items`) maintain total and reserved capacities for flight seats, hotel rooms, and package slots.
   - Uses DB transactions and optimistic concurrency control to prevent double-booking the last seat.
2. **15-Minute Hold Expiry**:
   - Creating a booking places it in `HELD` state with `holdExpiresAtUtc = now + 15 min`.
   - `HoldExpiryService` checks periodically; expired holds automatically release inventory and free guide availability.
3. **Finite State Machine**:
   - Legal lifecycle transitions: `DRAFT -> HELD -> PAID -> CONFIRMED -> COMPLETED`.
   - Terminal & exception transitions: `HELD -> EXPIRED`, `CONFIRMED -> CANCELLED -> REFUNDED`.
   - Illegal transitions strictly throw `BadRequestException`.
4. **Idempotency-Key Header**:
   - All booking creation and payment endpoints support `Idempotency-Key` / `x-idempotency-key` headers to prevent duplicate charges or reservations upon network retry.

---

## 6. Real-Time Communication Architecture

1. **NestJS WebSocket Gateway (Socket.IO)**:
   - Authenticated using signed JWT tokens passed in handshake query or headers.
   - Clients join scoped rooms: `user_{userId}` and `booking_{bookingId}`.
   - Cross-room joining attempts by unauthorized actors are strictly rejected.
2. **Event Dispatching**:
   - `guide_request.created / accepted / declined`
   - `booking.status_changed`
   - `message.created`
   - `ticket.updated`
   - `refund.processed`
   - `notification.created`
3. **Frontend Realtime Context**:
   - Single persistent WebSocket connection with exponential backoff reconnection.
   - In-app notification bell with unread badge counter and real-time dropdown.
   - State updates occur live in the UI without requiring page reload.

---

## 7. Append-Only Financial Ledger

All platform transactions follow double-entry accounting principles via `LedgerService`:

- **Transaction Types**: `BOOKING_PAYMENT`, `REFUND`, `COMMISSION_EARNED`, `COMMISSION_SETTLED`, `SUBSCRIPTION_FEE`.
- **Integrity**: Entries are strictly append-only. Numerical amounts are stored in minor currency units (cents/paise) to eliminate floating-point rounding errors.
- **Revenue Analytics**: Platform analytics are computed exclusively from settled ledger entries with timestamp filtering; never synthesized or faked.

---

## 8. Quality Assurance & Testing Strategy

GlobeSync enforces a multi-tier Quality Gate across backend and frontend:

| Test Tier | Technology | Test Count | Pass Rate | Scope |
| :--- | :--- | :--- | :--- | :--- |
| **Unit Tests** | `ts-node` + Node Assert | 206 tests (12 suites) | 100% (206/206) | State machines, RBAC guards, ownership, pricing, hold expiry, policy tiers |
| **Integration Tests** | Supertest + TestDb | 12 tests (1 suite) | 100% (12/12) | End-to-end full user journey (`register -> book -> pay -> guide accepts -> chat -> cancel -> refund -> review`) |
| **End-to-End Tests** | Playwright (Chromium) | 9 tests (3 suites) | 100% (9/9) | Actor picker auto-fill, RBAC portal isolation, complete traveler lifecycle |
| **Code Coverage** | `c8` Engine | >= 80% on core services | **90.1% Overall** | PolicyService (86.0%), BookingStateMachine (95.2%), PricingService (92.9%) |

### Continuous Integration (GitHub Actions)

Workflow defined in `.github/workflows/ci.yml`:
- Triggered on every pull request and push to `main`.
- Parallel jobs: `backend-quality` (typecheck, unit, integration, coverage, build), `frontend-quality` (Vite build), and `e2e-quality` (Playwright Chromium browser automation).
