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

Registered slices: travelers, agencies, passengers, packages, trips, itineraries, bookings, expenses, payments, refunds, guides, reviews, supportTickets, and messages.
