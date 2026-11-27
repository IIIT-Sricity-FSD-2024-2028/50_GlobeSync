# GlobeSync Admin Actor — Redux Toolkit Architecture
## Prescribed by Prof. Mallikarjun Reddy Sir

## 1. Architectural Principles

The Admin actor state management follows the mandatory academic pattern prescribed by Prof. Mallikarjun Reddy Sir:

1. **Mandatory Store Directory**:
   All Redux files reside under `src/store/`. The root store is configured in `src/store/index.js`.
2. **Kebab-Case Feature Directories**:
   Each domain has a dedicated kebab-case folder: `admin-dashboard/`, `admin-packages/`, `admin-bookings/`, `admin-trips/`, `admin-agencies/`, `admin-guides/`, `admin-reviews/`, `admin-reports/`, `admin-profile/`, and `admin-ui/`.
3. **Pure Synchronous Immer Slices**:
   Each `admin-<domain>-slice.js` imports `createSlice`, defines initial state with `loading: false` and `error: null`, and contains **only** pure synchronous reducers. Zero network calls or side effects.
4. **Strict Prohibition of `createAsyncThunk`**:
   No `createAsyncThunk`, no `pending`/`fulfilled`/`rejected` extraReducers.
5. **Standard Manual Thunks**:
   All asynchronous API operations reside in `admin-<domain>-actions.js` following the pattern:
   `setLoading(true)` → `setError(null)` → `try { API call; dispatch(successReducer) } catch { dispatch(setError) } finally { dispatch(setLoading(false)) }`.
6. **Slice Action & Default Exports**:
   Named export: `export const admin<Domain>Actions = admin<Domain>Slice.actions;`
   Default export: `export default admin<Domain>Slice;`
7. **Component Integration**:
   Data accessed via `useSelector((state) => state.admin<Domain>.<field>)`.
   Mutations dispatched via `dispatch(manualThunk(...))` without `.unwrap()`.

---

## 2. Directory Layout

```
front-end/src/store/
├── index.js                               # Centralized store configuration
├── selectors.js                           # Top-level selectors re-export
│
├── admin-dashboard/
│   ├── admin-dashboard-slice.js           # Pure synchronous slice
│   └── admin-dashboard-actions.js         # Manual thunks: fetchAdminDashboard
│
├── admin-packages/
│   ├── admin-packages-slice.js           # Pure synchronous slice
│   └── admin-packages-actions.js         # Manual thunks: fetch, create, update, archive
│
├── admin-bookings/
│   ├── admin-bookings-slice.js           # Pure synchronous slice
│   └── admin-bookings-actions.js         # Manual thunks: fetchAdminBookings (composite)
│
├── admin-trips/
│   ├── admin-trips-slice.js              # Pure synchronous slice
│   └── admin-trips-actions.js            # Manual thunks: fetchAdminTrips, requestReassignment
│
├── admin-agencies/
│   ├── admin-agencies-slice.js           # Pure synchronous slice
│   └── admin-agencies-actions.js         # Manual thunks: fetch, create, update, status, deactivate
│
├── admin-guides/
│   ├── admin-guides-slice.js             # Pure synchronous slice
│   └── admin-guides-actions.js           # Manual thunks: fetch, create, update, verify, deactivate
│
├── admin-reviews/
│   ├── admin-reviews-slice.js            # Pure synchronous slice
│   └── admin-reviews-actions.js          # Manual thunks: fetchAdminReviews, deleteAdminReview
│
├── admin-reports/
│   ├── admin-reports-slice.js            # Pure synchronous slice
│   └── admin-reports-actions.js          # Manual thunks: fetchAdminReports (8 endpoints)
│
├── admin-profile/
│   ├── admin-profile-slice.js            # Pure synchronous slice
│   └── admin-profile-actions.js          # Manual thunks: fetchAdminProfile, updateAdminProfile
│
└── admin-ui/
    └── admin-ui-slice.js                 # Pure synchronous UI slice (sidebar, active tab, alerts)
```
