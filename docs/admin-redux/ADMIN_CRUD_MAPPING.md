# Admin CRUD & Business Operations Mapping

| Domain | Entity | CRUD Operation | Permitted? | Redux Mechanism (Manual Thunk) | Backend API Endpoint |
|---|---|---|---|---|---|
| Dashboard | Metrics | READ | Yes | `fetchAdminDashboard` | `GET /dashboard/admin` |
| Packages | Package | CREATE | Yes | `createAdminPackage` | `POST /packages` |
| Packages | Package | READ | Yes | `fetchAdminPackages` | `GET /packages` |
| Packages | Package | UPDATE | Yes | `updateAdminPackage` | `PUT /packages/:id` |
| Packages | Package | ARCHIVE | Yes | `archiveAdminPackage` | `POST /packages/:id/archive` |
| Bookings | Booking | READ | Yes | `fetchAdminBookings` | `GET /bookings` |
| Bookings | Booking | MUTATE / DELETE | No | *Prohibited by platform rules* | *N/A* |
| Trips | Trip | READ | Yes | `fetchAdminTrips` | `GET /trips` |
| Trips | Trip | REASSIGN GUIDE | Yes | `requestAdminGuideReassignment` | `POST /trips/:id/request-reassignment` |
| Agencies | Agency | CREATE | Yes | `createAdminAgency` | `POST /agencies` |
| Agencies | Agency | READ | Yes | `fetchAdminAgencies` | `GET /agencies` |
| Agencies | Agency | READ (Detail) | Yes | `fetchAdminAgencyById` | `GET /agencies/:id` |
| Agencies | Agency | UPDATE | Yes | `updateAdminAgency` | `PUT /agencies/:id` |
| Agencies | Agency | UPDATE STATUS | Yes | `updateAdminAgencyStatus` | `PATCH /agencies/:id/status` |
| Agencies | Agency | DEACTIVATE | Yes (Category C) | `requestAdminAgencyDeactivation` | `POST /approvals` |
| Guides | Guide | CREATE | Yes | `createAdminGuide` | `POST /guides` |
| Guides | Guide | READ | Yes | `fetchAdminGuides` | `GET /guides` |
| Guides | Guide | UPDATE | Yes | `updateAdminGuide` | `PUT /guides/:id` |
| Guides | Guide | VERIFY | Yes | `verifyAdminGuide` | `PUT /guides/:id` |
| Guides | Guide | DEACTIVATE | Yes (Category C) | `requestAdminGuideDeactivation` | `POST /approvals` |
| Reviews | Review | READ | Yes | `fetchAdminReviews` | `GET /reviews` |
| Reviews | Review | DELETE | Yes | `deleteAdminReview` | `DELETE /reviews/:id` |
| Reports | Analytics | READ | Yes | `fetchAdminReports` | Composite (8 endpoints) |
| Profile | Account | READ | Yes | `fetchAdminProfile` | `GET /admins/:id` |
| Profile | Account | UPDATE | Yes | `updateAdminProfile` | `PUT /admins/:id` |
