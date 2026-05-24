# GlobeSync Travel Platform

A full-stack travel management platform with role-based portals for travelers, guides, support agents, admins, and super users.

---

## Review-4 Status

Review-4 backend APIs are implemented in NestJS and run against in-memory seed data.

Frontend status for Review-4:
- Core pages are connected to the backend through `front-end/JS/api.js`.
- Some pages and helper flows still use `localStorage` or `mockData.js` for local UI state and demo behavior.
- The frontend should be treated as a hybrid demo, not a fully backend-driven client.

---

## 1. Backend Setup

```bash
cd back-end
npm install
npm run start:dev
```

Backend base URL:

```text
http://localhost:3000
```

Health check:

```text
http://localhost:3000/health
```

Swagger UI:

```text
http://localhost:3000/api
```

Swagger JSON is also written on startup to:

```text
back-end/docs/swagger.json
```

---

## 2. Frontend Setup

The frontend is plain HTML/CSS/JavaScript with no build step.

Recommended local URL with Live Server:

```text
http://127.0.0.1:5501/front-end/
```

Typical Live Server workflow:
- Open the repository in VS Code.
- Start Live Server from the project root.
- Open `front-end/index.html`.

You can also open HTML files directly, but some flows are designed for a local web server.

---

## 3. Auth Endpoints

The implemented login endpoints are:

```text
POST /auth/traveler-login
POST /auth/staff-login
```

There is no `POST /auth/login` endpoint in the current backend.

---

## 4. Role Headers

Protected API routes use these headers:

```text
x-user-role
x-user-id
```

Header examples by role:

| Role | Required Headers |
|---|---|
| Super User | `x-user-role: superuser` |
| Admin | `x-user-role: admin` |
| Support | `x-user-role: support` |
| Guide | `x-user-role: guide` |
| Traveler | `x-user-role: traveler`, `x-user-id: <travelerId>` |

Notes:
- `x-user-role` is required on protected routes.
- `x-user-id` is required for self-service ownership checks on traveler and guide routes.
- Admin and superuser can access all records allowed by role.

Example requests:

```bash
# Health
curl http://localhost:3000/health

# Traveler dashboard
curl http://localhost:3000/dashboard/traveler/1 \
  -H "x-user-role: traveler" \
  -H "x-user-id: 1"

# Support tickets list
curl http://localhost:3000/support-tickets \
  -H "x-user-role: support"

# Superuser traveler list
curl http://localhost:3000/travelers \
  -H "x-user-role: superuser"
```

---

## 5. Sample Credentials From Seed Data

These credentials match the current in-memory seed data.

### Traveler Login

Endpoint:

```text
POST /auth/traveler-login
```

Portal:

```text
front-end/traveler-login.html
```

| Role | Email | Password |
|---|---|---|
| Traveler | `Arjun@gmail.com` | `traveler123` |
| Traveler | `Kavya@gmail.com` | `traveler123` |
| Traveler | `Rohan@gmail.com` | `traveler123` |
| Traveler | `Nitin@gmail.com` | `Nitin123` |

### Staff Login

Endpoint:

```text
POST /auth/staff-login
```

Portal:

```text
front-end/login.html
```

| Role | Email | Password |
|---|---|---|
| Super User | `superadmin@ticp.com` | `super123` |
| Admin | `admin@ticp.com` | `admin123` |
| Admin | `sanjay@gmail.com` | `sanjay123` |
| Guide | `Devansh@gmail.com` | `guide123` |
| Support | `Aisha.johnson@gmail.com` | `support123` |

Note:
- `front-end/super-login.html` still uses its own mock-data-based superuser login flow for the demo UI.

---

## 6. Implemented Backend Modules

The backend currently exposes these module groups:

| Module | Implemented Endpoints |
|---|---|
| `health` | `GET /health` |
| `auth` | `POST /auth/traveler-login`, `POST /auth/staff-login` |
| `travelers` | CRUD under `/travelers` |
| `guides` | CRUD under `/guides` |
| `packages` | CRUD under `/packages` |
| `trips` | CRUD under `/trips`, `PATCH /trips/:id/status` |
| `bookings` | CRUD under `/bookings` |
| `itineraries` | CRUD under `/itineraries/trip/:tripId` |
| `expenses` | CRUD under `/expenses/trip/:tripId` |
| `payments` | `GET /payments`, `POST /payments` |
| `refunds` | `GET /refunds`, `POST /refunds`, `PATCH /refunds/:id/status` |
| `reviews` | `GET /reviews`, `POST /reviews`, `DELETE /reviews/:id` |
| `support-tickets` | CRUD under `/support-tickets`, `PATCH /support-tickets/:id/status` |
| `messages` | `GET /messages`, `GET /messages/user/:userType/:userId`, `GET /messages/conversation`, `POST /messages` |
| `dashboard` | `GET /dashboard/superuser`, `GET /dashboard/admin`, `GET /dashboard/traveler/:travelerId`, `GET /dashboard/guide/:guideId`, `GET /dashboard/support` |

---

## 7. RBAC Notes

Current RBAC behavior in Review-4:
- Missing `x-user-role` returns `403 Forbidden`.
- Wrong role for a route returns `403 Forbidden`.
- Traveler and guide self-service routes enforce ownership with `x-user-id`.
- If a user tries to access another user's resource, the API returns:

```text
Access denied. You can only access your own resources.
```

---

## 8. Frontend Portals

| Portal | Entry Point | Primary Role |
|---|---|---|
| Landing | `front-end/index.html` | public |
| Traveler Login | `front-end/traveler-login.html` | traveler |
| Staff Login | `front-end/login.html` | admin / guide / support |
| Super User Login | `front-end/super-login.html` | superuser demo flow |
| Traveler Portal | `front-end/Traveler/` | traveler |
| Guide Portal | `front-end/guide/` | guide |
| Support Portal | `front-end/support/` | support |
| Admin Portal | `front-end/admin/` | admin |
| Super User Portal | `front-end/super/` | superuser |

---

## 9. API Helper

Most frontend API calls go through:

```text
front-end/JS/api.js
```

Example usage:

```javascript
const travelers = await apiGetSnake('/travelers');
const ticket = await apiPost('/support-tickets', { subject, description, travelerId });
await apiPut(`/packages/${id}`, pkgData);
await apiPatch(`/support-tickets/${id}/status`, { status: 'Resolved' });
await apiDelete(`/travelers/${id}`);
```

The helper injects `x-user-role` and `x-user-id` from `localStorage` when available.

---

GlobeSync | Review-4 | Backend: NestJS | Frontend: Vanilla HTML/CSS/JS
