# GlobeSync Travel Platform

A full-stack travel management platform with role-based portals for Travelers, Guides, Support agents, Admins, and Super Users.

---

## Review–4 Setup Instructions

### 1. Backend Installation & Startup

```bash
# Navigate to the backend directory
cd back-end

# Install all dependencies
npm install

# Start the development server (with hot reload)
npm run start:dev
```

The backend starts on **http://localhost:3000**

---

### 2. Frontend

The frontend is pure HTML/CSS/JavaScript — no build step required.

**Option A — Open directly in browser:**
```
front-end/index.html
```

**Option B — Serve with VS Code Live Server:**
- Install the "Live Server" extension
- Right-click `front-end/index.html` → Open with Live Server

**Option C — Simple HTTP server:**
```bash
cd front-end
npx serve .
```

---

### 3. Swagger UI

Once the backend is running, open:

```
http://localhost:3000/api
```

**Swagger JSON** is auto-generated on startup at:
```
back-end/docs/swagger.json
```

It is also accessible live at:
```
http://localhost:3000/api-json
```

---

### 4. Role Header Examples

All protected API calls require the `x-user-role` header. Some also require `x-user-id`.

| Role | Header |
|---|---|
| Super User | `x-user-role: superuser` |
| Admin | `x-user-role: admin` |
| Guide | `x-user-role: guide` |
| Support Agent | `x-user-role: support` |
| Traveler | `x-user-role: traveler` + `x-user-id: <travelerId>` |

**Example cURL:**
```bash
# Get all travelers (superuser)
curl http://localhost:3000/travelers -H "x-user-role: superuser"

# Get all support tickets (support)
curl http://localhost:3000/support-tickets -H "x-user-role: support"

# Get traveler dashboard (traveler, id=1)
curl http://localhost:3000/dashboard/traveler/1 -H "x-user-role: traveler" -H "x-user-id: 1"

# Get messages conversation (support)
curl "http://localhost:3000/messages/conversation?senderType=traveler&senderId=1&receiverType=guide&receiverId=1" \
  -H "x-user-role: support"
```

---

### 5. Sample Test Credentials

These credentials work on the login pages and authenticate via `POST /auth/login`:

| Role | Email | Password | Portal |
|---|---|---|---|
| Super User | `super@globesync.com` | `super123` | `front-end/super-login.html` |
| Admin | `admin@globesync.com` | `admin123` | `front-end/login.html` |
| Guide | `ravi@guide.com` | `guide123` | `front-end/login.html` |
| Support | `support@globesync.com` | `support123` | `front-end/login.html` |
| Traveler | `arjun@gmail.com` | `pass123` | `front-end/traveler-login.html` |

---

### 6. RBAC Verification

| Scenario | Expected |
|---|---|
| No `x-user-role` header | **403 Forbidden** |
| Wrong role (e.g., `traveler` on `/travelers`) | **403 Forbidden** |
| Correct role | **200 OK** |
| Missing required fields (POST) | **400 Bad Request** |
| Invalid ID (e.g., `/travelers/99999`) | **404 Not Found** |

---

### 7. Implemented Backend Modules

All 14 modules are registered in `AppModule` and fully operational:

| Module | Endpoints |
|---|---|
| **health** | `GET /health` |
| **auth** | `POST /auth/login`, `POST /auth/login/staff` |
| **travelers** | Full CRUD `/travelers` |
| **guides** | Full CRUD `/guides` |
| **packages** | Full CRUD `/packages` |
| **trips** | Full CRUD `/trips`, `PATCH /trips/:id/status` |
| **bookings** | Full CRUD `/bookings` |
| **itineraries** | CRUD `/itineraries/trip/:tripId` |
| **expenses** | CRUD `/expenses/trip/:tripId` |
| **payments** | `GET`, `POST /payments` |
| **refunds** | `GET`, `POST /refunds`, `PATCH /refunds/:id/status` |
| **reviews** | `GET`, `POST`, `DELETE /reviews` |
| **support-tickets** | Full CRUD `/support-tickets`, `PATCH /support-tickets/:id/status` |
| **messages** | `GET /messages`, `GET /messages/conversation`, `POST /messages` |
| **dashboard** | `GET /dashboard/superuser`, `/dashboard/admin`, `/dashboard/traveler/:id`, `/dashboard/guide/:id`, `/dashboard/support` |

---

### 8. Frontend Portals

| Portal | Entry Point | Role |
|---|---|---|
| **Super User** | `front-end/super/super-dashboard.html` | superuser |
| **Admin** | `front-end/admin/admin-dashboard.html` | admin |
| **Support** | `front-end/support/support-dashboard.html` | support |
| **Guide** | `front-end/guide/` | guide |
| **Traveler** | `front-end/Traveler/` | traveler |

All portals are fully migrated from `mockData.js` to live backend API calls via `front-end/JS/api.js`.

---

### 9. API Helper (api.js)

All frontend API calls go through `front-end/JS/api.js`:

```javascript
// GET with automatic camelCase→snake_case conversion
const travelers = await apiGetSnake('/travelers');

// POST
const ticket = await apiPost('/support-tickets', { subject, description, travelerId });

// PUT (full update)
await apiPut(`/packages/${id}`, pkgData);

// PATCH (partial update)
await apiPatch(`/support-tickets/${id}/status`, { status: 'Resolved' });

// DELETE
await apiDelete(`/travelers/${id}`);
```

The `x-user-role` and `x-user-id` headers are automatically injected from `localStorage` on every request.

---

*GlobeSync — Review 4 | Backend: NestJS | Frontend: Vanilla HTML/CSS/JS*
