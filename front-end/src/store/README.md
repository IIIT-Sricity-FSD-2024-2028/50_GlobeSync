# Redux resource store

## Actor organization

Actor ownership is represented under `src/store/slices/`:

- `traveler/` — trips, bookings, packages, expenses, passengers, support and messages
- `agency/` — agencies, resale trips, passengers, bookings and finance
- `guide/` — assigned trips, travelers, itineraries, reviews and messages
- `support/` — tickets, refunds, messages and operational context
- `admin/` — governed catalog and operational records
- `superuser/` — cross-actor governance and financial visibility

The Redux state remains normalized by backend resource (`state.trips`, `state.bookings`, etc.) so the same record is not duplicated for multiple actors. Actor folders define ownership and exports; selectors use `select<Actor><Resource>` naming.

The store is organized by backend domain. Each resource slice exposes the same operations:

- `load(args)` — GET/list (supports scoped list calls such as `scope: 'getByTraveler'` and `id`)
- `create(payload)` — POST
- `update(id, changes)` — PUT/PATCH through the API module
- `remove(id)` — DELETE
- `upsert(item)` / `replaceAll(items)` — synchronous cache updates for realtime events

Use `useResource('packages')` (or another resource name) in a page. Components read `items`, `status`, and `error` from Redux and dispatch CRUD operations through the returned methods. API modules remain the only layer that knows endpoint URLs.

Registered domain slices include travelers, agencies, passengers, packages, trips, itineraries, bookings, expenses, payments, refunds, guides, reviews, support tickets, messages, actor dashboards, and Super Admin governance resources.

## Evaluation status

- **Guide:** all seven Guide pages currently use `useResource` for page data and dispatch domain actions through the shared Redux resource slices. The Guide area is the reference pattern for actor pages.
- **Super Admin:** dedicated Redux resources are registered for dashboard, reports, revenue, rules, integrations, payment methods, profile, users, and existing governed domain records. Super Admin pages now load data and route CRUD/domain mutations through Redux resources. The API health probe remains a read-only operational check.
- **Admin:** dashboard, profile, agencies, guides, packages, reports, bookings, trips, and reviews now read through Redux resources. CRUD, approval, archive, review moderation, and guide reassignment actions are exposed as Redux operations and dispatched by the pages.
