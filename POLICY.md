# GlobeSync Business Rules & Cancellation Policy Specification

## 1. Overview & Architecture

All business validation rules, cancellation policies, refund calculations, and emergency overrides in GlobeSync are centralized within `PolicyService` (`back-end/src/policy/policy.service.ts`). 

### Core Architectural Principles:
1. **Config-Driven & Superuser Controlled**: Policy variables (such as lead times, tier cutoff thresholds, penalties, and protection rates) are centrally managed via `PolicyConfig` and can be inspected (`GET /system-config/policy`) or updated (`PUT /system-config/policy`) exclusively by the Superuser. Percentages are strictly validated between 0 and 100.
2. **Policy Snapshotting (Immutability)**: When a booking is created (`POST /bookings`), an immutable `policy_snapshot` JSON record is permanently embedded in the booking row. Subsequent changes to platform-wide penalty percentages never mutate historical bookings.
3. **UTC Normalization**: All time evaluations use `departure_at_utc` and the current time `now` in UTC. Timezone offsets (such as Asia/Kolkata +05:30 or America/New_York -05:00) are parsed to ensure exact hour differences without daylight saving or local machine drift.
4. **Server-Side Financial Safety & Idempotency**: Refund amounts are computed strictly server-side. Cancellations insert a `Refunds` record, write an append-only `LedgerEntry` (debiting traveler payable/cash reserves), and lock the booking status to `CANCELLED`. Calling cancellation multiple times is strictly rejected (idempotent; cannot double refund).
5. **Transparency (Pre-flight Preview)**: Travelers are shown a preview of the tier, hours remaining, penalty percentage, and exact refund amount (`GET /bookings/:id/cancellation-preview`) before confirming cancellation.

---

## 2. Booking Lead Time Rules

- **Rule**: A booking's departure time (`departure_at_utc`) must be at least **24 hours** from the current timestamp (`now` in UTC).
- **Validation**: If `hours_until_departure < 24.0`, the system rejects the booking with an HTTP `400 Bad Request`:
  > *"Departure must be at least 24 hours from now. Earliest available departure is {earliestUtc}."*
- **Boundary**: Exactly 24.0 hours is permitted. 23 hours 59 minutes is rejected.

---

## 3. Cancellation Policy Tiers & Boundaries

Cancellation is evaluated based on `hours_until_departure = (departure_at_utc - now_utc) / 3600000`:

| Tier | Window (`hours_until_departure`) | Standard Refund | With Cancellation Protection | HTTP Status / Behavior |
| :--- | :--- | :--- | :--- | :--- |
| **Tier 1** | `>= 72.0 hours` | `100 - cancellationPenaltyPercent`% (Default: **65%**) | **90%** (Penalty reduced from 35% to 10%) | `200 OK` — Allowed, refund credited, ledger entry created |
| **Tier 2** | `>= 12.0 hours` and `< 72.0 hours` | **0%** (100% penalty) | **50%** (Protected partial refund) | `200 OK` — Allowed, refund ₹0 (or 50% if protected) |
| **Tier 3** | `< 12.0 hours` | **Blocked** | **Blocked** (Fast-tracked support override) | `403 Forbidden` — Blocked; prompt traveler to contact Support |
| **Past** | `<= 0.0 hours` | **Blocked** | **Blocked** | `400 Bad Request` — Cannot cancel past or active departure |

### Boundary Precision:
- **`>= 72.0h`**: Exactly 72h 00m falls into **Tier 1**.
- **`71h 59m` (`71.9833h`)**: Falls into **Tier 2**.
- **`>= 12.0h`**: Exactly 12h 00m falls into **Tier 2**.
- **`11h 59m` (`11.9833h`)**: Falls into **Tier 3** (`403 Forbidden`).

---

## 4. Cancellation Protection Add-on

When creating a booking, travelers can select optional **Cancellation Protection** (`has_cancellation_protection: true`).

### What Cancellation Protection Changes:
1. **Tier 1 Boost (>= 72h)**: Instead of receiving the default 65% refund (35% penalty), the traveler receives a **90% refund** (penalty reduced to 10%).
2. **Tier 2 Recovery (12h - 72h)**: In standard bookings, cancellations between 12h and 72h result in a 0% refund. With Cancellation Protection, the traveler recovers **50% of the refundable amount**.
3. **Emergency Priority (< 12h)**: While automatic self-service cancellation remains blocked under 12 hours for operational logistics, Support agents can submit an emergency override flagged with protection status for priority executive sign-off.

---

## 5. Superuser Config & Policy Snapshotting

### Global Configuration Parameters (`PolicyConfig`):
- `leadTimeHours` (default: `24`)
- `tier1CutoffHours` (default: `72`)
- `tier2CutoffHours` (default: `12`)
- `defaultCancellationPenaltyPercent` (default: `35`, yields 65% refund)
- `protectedTier1RefundPercent` (default: `90`)
- `protectedTier2RefundPercent` (default: `50`)
- `emergencyOverrideThresholdMinor` (default: `100000`, i.e., ₹1,000.00)

### Policy Snapshot Schema (`policy_snapshot` in `bookings`):
```json
{
  "snapshotted_at": "2026-11-22T14:00:00.000Z",
  "lead_time_hours": 24,
  "tier1_cutoff_hours": 72,
  "tier2_cutoff_hours": 12,
  "cancellation_penalty_percent": 35,
  "has_cancellation_protection": false,
  "protected_tier1_refund_percent": 90,
  "protected_tier2_refund_percent": 50,
  "emergency_override_threshold_minor": 100000
}
```
If a Superuser later raises `cancellationPenaltyPercent` to 80% or lowers it to 20%, previously booked trips retain their original snapshotted penalty rate upon cancellation.

---

## 6. Financial Integrity: Server-Side Refunds & Append-Only Ledger

When a valid cancellation is confirmed:
1. **Idempotency Guard**:
   - The booking's status is checked. If it is already `CANCELLED`, the system throws `409 Conflict: Booking has already been cancelled`.
2. **Refund Calculation**:
   - `refund_minor = Math.round(total_minor * (refund_percent / 100))`
3. **Atomic Records**:
   - **`Refunds` entry created**:
     - `amount_minor`: calculated refund.
     - `status`: `'COMPLETED'` (or `'PENDING'` if requiring bank dispatch).
     - `reason`: Cancellation explanation + tier summary.
   - **Append-Only `LedgerEntry`**:
     - `booking_id`: Foreign key reference.
     - `entry_type`: `'REFUND'`.
     - `amount_minor`: `-refund_minor`.
     - `balance_after_minor`: Updated net platform position.
     - `description`: Audit trace of the refund action.
   - **`Booking` status update**:
     - Status updated to `CANCELLED`.
     - Cancellation timestamp and refunded minor amount recorded.

---

## 7. Support Emergency Override (< 12h) Workflow

For extenuating circumstances (medical emergency, flight grounding, natural disasters) occurring within `< 12 hours` of departure:

1. **Traveler Contacts Support**: Direct cancellation in portal is blocked with message:
   > *"Cancellations less than 12 hours before departure cannot be processed online. Please contact 24/7 Support for emergency assistance."*
2. **Support Agent Initiates Override**:
   - Endpoint: `POST /bookings/:id/emergency-override`
   - Payload:
     ```json
     {
       "reason": "Hospitalization certificate provided by traveler",
       "refundPercent": 80,
       "supportAgentId": "sup_1",
       "supportAgentName": "Aisha Khan"
     }
     ```
3. **Threshold Check & Audit Logging**:
   - Every emergency override generates an **`AuditLog`** record:
     `"Emergency override requested by Support Aisha Khan: Hospitalization certificate provided by traveler"`
   - If the requested refund amount (`refundMinor`) exceeds `emergencyOverrideThresholdMinor` (e.g., > ₹1,000.00):
     - The override status is set to `PENDING_ADMIN_APPROVAL`.
     - The booking remains active until an Admin or Superuser reviews and approves.
   - If within threshold:
     - The override is automatically applied, refund created, ledger entry appended, and booking cancelled immediately.
4. **Admin Approval**:
   - Endpoint: `POST /bookings/:id/approve-override` (Admin or Superuser only).
   - Once approved, the refund is executed and an audit entry logged.

---

## 8. API Endpoints Summary

| Method | Endpoint | Access | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/system-config/policy` | Authenticated Users | Inspect current global business rules & cancellation tiers |
| `PUT` | `/system-config/policy` | Superuser Only | Update platform policy settings (0-100% validation) |
| `GET` | `/bookings/:id/cancellation-preview` | Traveler (Owner), Admin, Support | Pre-flight cancellation preview showing exact refund & tier |
| `POST` | `/bookings/:id/cancel` | Traveler (Owner), Admin | Confirm cancellation; server-side refund & ledger entry |
| `POST` | `/bookings/:id/emergency-override` | Support, Admin | Request emergency override for `< 12h` window |
| `POST` | `/bookings/:id/approve-override` | Admin, Superuser | Approve high-value emergency override |
