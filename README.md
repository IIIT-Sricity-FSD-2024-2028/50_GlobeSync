# GlobeSync – Travel Itinerary Planning and Coordination Platform

GlobeSync is a travel itinerary planning and coordination platform developed for Review–4 evaluation. The system supports multiple user roles such as Traveler, Guide, Customer Support, Admin, and Superuser.

The project includes a frontend interface and a NestJS backend. The backend uses in-memory data structures, REST APIs, role-based access control, DTO validation, proper error handling, and Swagger API documentation.

---

## Project Structure

```text
root/
├── front-end/
├── back-end/
│   ├── docs/
│   │   └── swagger.json
├── Videos/
└── README.md
```

---

## Tech Stack

### Frontend

- HTML
- CSS
- JavaScript
- Fetch API

### Backend

- NestJS
- TypeScript
- In-memory arrays and objects
- DTO validation using `class-validator`
- Swagger API documentation
- Role-Based Access Control using Guards

---

## User Roles

The application supports the following roles:

```text
traveler
guide
support
admin
superuser
```

Each role has different access permissions.

---

## Main Features

### Traveler

- Traveler login
- View travel packages
- View available guides
- Create trip
- Create itinerary
- View and manage own trips
- View bookings
- Add expenses
- Raise support tickets
- Send and view messages

### Guide

- Guide login
- View assigned trips
- Accept or reject trip requests
- Update trip status
- View assigned travelers
- View completed trips
- Send and view messages

### Customer Support

- Support login
- View support tickets
- Update ticket status
- Handle refund requests
- Communicate with travelers

### Admin

- Admin login
- View dashboard reports
- Manage packages
- Manage trips
- Manage bookings
- Manage guides
- View reviews
- View reports

### Superuser

- Superuser login
- Full system access
- Manage users
- Manage packages
- Manage trips
- Manage bookings
- View system-level reports

---

## Backend Architecture

The backend is developed using NestJS and follows modular architecture.

Each major feature is separated into its own module. Each module contains:

```text
module
controller
service
DTOs
```

### Backend Modules

```text
auth
travelers
guides
packages
trips
bookings
payments
refunds
itineraries
expenses
reviews
support-tickets
messages
dashboard
health
```

---

## Modules, Controllers, and Services

### Modules

Modules organize each feature area of the backend.

Example modules:

```text
packages.module.ts
trips.module.ts
guides.module.ts
bookings.module.ts
```

Each module connects its controller and service to the NestJS application.

### Controllers

Controllers handle incoming API requests.

Example controllers:

```text
packages.controller.ts
trips.controller.ts
support-tickets.controller.ts
```

Controllers define REST endpoints such as:

```text
GET
POST
PUT
PATCH
DELETE
```

### Services

Services contain the business logic.

Examples:

- Package service adds, updates, deletes, and returns packages.
- Trip service creates trips and updates trip status.
- Support ticket service creates and updates support tickets.
- Dashboard service calculates dashboard statistics.

Controllers call services, and services work with in-memory data.

---

## In-Memory Data Management

No external database is used in this project.

All data is stored using arrays and objects inside the backend data folder. The data represents entities from the project ER diagram.

Main entities include:

```text
travelers
guides
admins
packages
trips
bookings
payments
refunds
itineraries
expenses
reviews
support tickets
messages
```

Relationships are maintained using IDs such as:

```text
travelerId
guideId
tripId
packageId
bookingId
paymentId
refundId
ticketId
```

Example:

A trip is connected to a traveler, guide, and package using:

```text
travelerId
guideId
packageId
```

---

## Role-Based Access Control

Role-Based Access Control is implemented using request headers.

The main role header is:

```text
x-user-role
```

Some APIs also use:

```text
x-user-id
```

Example headers:

```text
x-user-role: guide
x-user-id: 1
```

A custom Roles decorator and RolesGuard are used to restrict API access.

### Access Rules

- Traveler can view packages and create or manage own trips.
- Guide can view assigned trips and update assigned trip status.
- Support can manage support tickets and refunds.
- Admin can manage packages, trips, bookings, guides, reviews, and reports.
- Superuser has full access to all modules.

If the role is missing or unauthorized, the backend returns:

```text
403 Forbidden
```

---

## DTO Validation

DTOs are used to validate request bodies before data reaches the service layer.

Validation is implemented using `class-validator` decorators such as:

```text
@IsString()
@IsNumber()
@IsNotEmpty()
@IsOptional()
@Min()
```

Example package DTO validates:

```text
name
destinations
budget
duration
description
highlights
image
```

If required fields are missing or invalid, the backend returns:

```text
400 Bad Request
```

---

## Error Handling

The backend handles common errors using proper HTTP status codes.

```text
200 OK              - request successful
201 Created         - resource created successfully
400 Bad Request     - invalid or missing input
403 Forbidden       - unauthorized role access
404 Not Found       - invalid ID or resource not found
```

---

## Swagger Documentation

Swagger is configured for API documentation.

Swagger UI:

```text
http://localhost:3000/api
```

Swagger JSON file:

```text
back-end/docs/swagger.json
```

Swagger documents:

- API endpoints
- Request body schema
- Response schema
- Role headers
- Status codes
- Path parameters
- API descriptions

---

## How to Run Backend

Open terminal and go to the backend folder:

```bash
cd back-end
```

Install dependencies:

```bash
npm install
```

Start backend:

```bash
npm run start:dev
```

Backend runs at:

```text
http://localhost:3000
```

Health check:

```text
http://localhost:3000/health
```

Expected health response:

```json
{
  "status": "ok",
  "service": "GlobeSync API",
  "version": "1.0.0"
}
```

Swagger documentation:

```text
http://localhost:3000/api
```

---

## How to Run Frontend

Open another terminal from the project root:

```bash
npx http-server -p 5501
```

Open in browser:

```text
http://127.0.0.1:5501/front-end/
```

The frontend communicates with the backend using Fetch API.

Backend base URL:

```text
http://localhost:3000
```

---

## Important APIs

### Auth APIs

```http
POST /auth/traveler-login
POST /auth/staff-login
```

Staff login is used for:

```text
guide
support
admin
superuser
```

---

### Package APIs

```http
GET /packages
GET /packages/:id
POST /packages
PUT /packages/:id
DELETE /packages/:id
```

Example create package request body:

```json
{
  "name": "Goa Beach Escape",
  "destinations": "Goa",
  "budget": 12000,
  "duration": 3,
  "description": "Beach package",
  "highlights": "Baga Beach, Fort Aguada",
  "image": "../static/destinations/goa.png"
}
```

---

### Trip APIs

```http
GET /trips
GET /trips/:id
GET /trips/traveler/:travelerId
GET /trips/guide/:guideId
POST /trips
PUT /trips/:id
PATCH /trips/:id/status
DELETE /trips/:id
```

---

### Booking APIs

```http
GET /bookings
GET /bookings/:id
GET /bookings/traveler/:travelerId
POST /bookings
PUT /bookings/:id
DELETE /bookings/:id
```

---

### Guide APIs

```http
GET /guides
GET /guides/:id
POST /guides
PUT /guides/:id
DELETE /guides/:id
GET /trips/guide/:guideId
GET /dashboard/guide/:guideId
```

---

### Support Ticket APIs

```http
GET /support-tickets
GET /support-tickets/:id
GET /support-tickets/traveler/:travelerId
POST /support-tickets
PATCH /support-tickets/:id/status
DELETE /support-tickets/:id
```

---

### Dashboard APIs

```http
GET /dashboard/admin
GET /dashboard/superuser
GET /dashboard/traveler/:travelerId
GET /dashboard/guide/:guideId
GET /dashboard/support
```

---

## Sample Role Headers

### Traveler

```text
x-user-role: traveler
x-user-id: 1
```

### Guide

```text
x-user-role: guide
x-user-id: 1
```

### Support

```text
x-user-role: support
```

### Admin

```text
x-user-role: admin
```

### Superuser

```text
x-user-role: superuser
```

---

## Sample Guide Login

```text
Email: Devansh@gmail.com
Password: guide123
Access Code: GUIDE-2026
```

---

## Review–4 Requirements Covered

### Backend Development

- Backend developed using NestJS.
- Proper modular architecture is followed.
- Modules, controllers, services, and DTOs are separated.

### In-Memory Data Management

- No external database is used.
- Data is stored using arrays and objects.
- CRUD operations are implemented.

### Role-Based Access Control

- Roles are passed using request headers.
- Guards are used to enforce access control.
- Unauthorized access returns 403 Forbidden.

### REST API Development

- APIs are implemented using GET, POST, PUT, PATCH, and DELETE.
- APIs are aligned with frontend modules.
- Request and response formats are kept consistent.

### Validation and Error Handling

- DTOs are used for validation.
- Invalid inputs and missing data are handled.
- Proper HTTP status codes are returned.

### Frontend–Backend Integration

- Frontend uses backend APIs through Fetch API.
- Major CRUD operations are backend-driven.
- Mock data usage is replaced with backend API calls for core workflows.

### API Documentation

- Swagger documentation is available at `/api`.
- Swagger JSON is generated inside `back-end/docs/swagger.json`.
- Swagger includes request body, response schema, role headers, and status codes.

### Code Structure

- Code is clean and modular.
- Controllers, services, DTOs, guards, and data are separated properly.

---

## Demo Workflows

Recommended workflows for demonstration:

1. Traveler login and dashboard
2. Traveler views packages
3. Traveler views guides
4. Traveler creates a trip
5. Traveler views and manages trips
6. Traveler creates a support ticket
7. Admin login and dashboard
8. Admin package CRUD
9. Admin trips and bookings management
10. Guide login and assigned trips
11. Guide accepts or rejects a trip request
12. Support updates ticket or refund status
13. Superuser dashboard and user management
14. Swagger and DTO demonstration

---

## Backend Code Walkthrough Points

During backend code walkthrough, explain:

1. `back-end/src` contains backend source code.
2. Each feature is divided into a separate module.
3. Controllers handle API routes.
4. Services contain business logic.
5. DTOs validate request bodies.
6. Data folder contains in-memory arrays.
7. Common folder contains RBAC decorators and guards.
8. Relationships are maintained using IDs.
9. `main.ts` configures CORS, validation, Swagger, and server startup.
10. `back-end/docs/swagger.json` contains generated API documentation.

---

## DTO and Swagger Demonstration APIs

Show at least these APIs in Swagger:

1. `POST /auth/traveler-login`
2. `GET /packages`
3. `POST /packages`
4. `GET /trips/guide/{guideId}`
5. `PATCH /support-tickets/{id}/status`

For each API, show:

- Request body
- Response schema
- Role header
- Status codes

---

## Notes

- This project uses in-memory data only.
- Data resets when the backend server restarts.
- No external database is used.
- No JWT authentication is used.
- Authorization is handled through the `x-user-role` header.
- Swagger documentation is available at `/api`.
- The project follows Review–4 folder structure and requirements.

---

## Project Status

```text
Frontend: Integrated with backend APIs
Backend: NestJS modular backend completed
Database: In-memory arrays and objects
RBAC: Implemented using x-user-role header
Validation: Implemented using DTOs
Swagger: Implemented
Review–4: Ready for demonstration
```
