import assert from 'node:assert/strict';
import { configureStore } from '@reduxjs/toolkit';
import adminDashboardSlice from '../src/store/admin-dashboard/admin-dashboard-slice.js';
import adminPackagesSlice from '../src/store/admin-packages/admin-packages-slice.js';
import adminBookingsSlice from '../src/store/admin-bookings/admin-bookings-slice.js';
import adminTripsSlice from '../src/store/admin-trips/admin-trips-slice.js';
import adminAgenciesSlice, { adminAgenciesActions } from '../src/store/admin-agencies/admin-agencies-slice.js';
import adminGuidesSlice from '../src/store/admin-guides/admin-guides-slice.js';
import adminReviewsSlice from '../src/store/admin-reviews/admin-reviews-slice.js';
import adminReportsSlice from '../src/store/admin-reports/admin-reports-slice.js';
import adminProfileSlice from '../src/store/admin-profile/admin-profile-slice.js';
import adminUiSlice from '../src/store/admin-ui/admin-ui-slice.js';
import authSlice from '../src/store/auth/auth-slice.js';

import { fetchAdminDashboard } from '../src/store/admin-dashboard/admin-dashboard-actions.js';
import { fetchAdminPackages, createAdminPackage, updateAdminPackage, archiveAdminPackage } from '../src/store/admin-packages/admin-packages-actions.js';
import { fetchAdminBookings } from '../src/store/admin-bookings/admin-bookings-actions.js';
import { fetchAdminTrips, fetchAdminTripDetails, requestAdminGuideReassignment } from '../src/store/admin-trips/admin-trips-actions.js';
import { fetchAdminAgencies, fetchAdminAgencyById, updateAdminAgency } from '../src/store/admin-agencies/admin-agencies-actions.js';
import { fetchAdminGuides } from '../src/store/admin-guides/admin-guides-actions.js';
import { fetchAdminReviews, deleteAdminReview } from '../src/store/admin-reviews/admin-reviews-actions.js';
import { fetchAdminReports } from '../src/store/admin-reports/admin-reports-actions.js';
import { fetchAdminProfile } from '../src/store/admin-profile/admin-profile-actions.js';
import { resetAllAdminCaches, clearInFlightRequests } from '../src/store/admin-ui/admin-cache-utils.js';

import {
  packagesApi,
  agenciesApi,
  tripsApi,
  bookingsApi,
  guidesApi,
  reviewsApi,
  dashboardApi,
  revenueApi,
  travelersApi,
  paymentsApi,
  adminsApi,
} from '../src/services/api.js';

function createTestStore() {
  return configureStore({
    reducer: {
      auth: authSlice.reducer,
      adminDashboard: adminDashboardSlice.reducer,
      adminPackages: adminPackagesSlice.reducer,
      adminBookings: adminBookingsSlice.reducer,
      adminTrips: adminTripsSlice.reducer,
      adminAgencies: adminAgenciesSlice.reducer,
      adminGuides: adminGuidesSlice.reducer,
      adminReviews: adminReviewsSlice.reducer,
      adminReports: adminReportsSlice.reducer,
      adminProfile: adminProfileSlice.reducer,
      adminUi: adminUiSlice.reducer,
    },
  });
}

function spyMethod(obj, key, impl) {
  const original = obj[key];
  const calls = [];
  obj[key] = (...args) => {
    calls.push(args);
    return impl(...args);
  };
  return {
    calls,
    restore: () => {
      obj[key] = original;
    },
  };
}

async function runTests() {
  clearInFlightRequests();

  // 1. Packages: initial miss, cache hit, concurrent deduplication, force refresh, failed refresh preservation
  {
    const store = createTestStore();
    let shouldFail = false;
    const pkgSpy = spyMethod(packagesApi, 'getAll', async () => {
      if (shouldFail) throw new Error('Network down');
      return [{ packageId: 1, name: 'Goa Retreat', status: 'active' }];
    });

    await store.dispatch(fetchAdminPackages());
    assert.equal(pkgSpy.calls.length, 1, 'First fetch calls API once');
    assert.equal(store.getState().adminPackages.loaded, true);

    await store.dispatch(fetchAdminPackages());
    assert.equal(pkgSpy.calls.length, 1, 'Second fetch hits cache (0 new calls)');

    await Promise.all([
      store.dispatch(fetchAdminPackages({ force: true })),
      store.dispatch(fetchAdminPackages({ force: true })),
    ]);
    assert.equal(pkgSpy.calls.length, 2, 'Concurrent force refresh deduplicates to 1 additional call');

    shouldFail = true;
    await assert.rejects(() => store.dispatch(fetchAdminPackages({ force: true })), /Network down/);
    assert.equal(store.getState().adminPackages.packages.length, 1, 'Preserves valid cached data on failed refresh');
    pkgSpy.restore();
  }

  // 2. Valid empty collection ([]) treated as loaded cache hit
  {
    const store = createTestStore();
    const pkgSpy = spyMethod(packagesApi, 'getAll', async () => []);
    await store.dispatch(fetchAdminPackages());
    await store.dispatch(fetchAdminPackages());
    assert.equal(pkgSpy.calls.length, 1, 'Empty array is cached as valid loaded state');
    pkgSpy.restore();
  }

  // 3. Agency View Details cache + mutation sync + close modal does not clear cache
  {
    const store = createTestStore();
    const detailSpy = spyMethod(agenciesApi, 'getById', async (id) => ({
      agencyId: id,
      businessName: 'Horizon Travels',
      status: 'approved',
    }));

    await store.dispatch(fetchAdminAgencyById(42));
    assert.equal(detailSpy.calls.length, 1);

    store.dispatch(adminAgenciesActions.closeDetailsModal());
    assert.ok(store.getState().adminAgencies.detailsByAgencyId[42], 'Closing modal preserves detailsByAgencyId');

    await store.dispatch(fetchAdminAgencyById(42));
    assert.equal(detailSpy.calls.length, 1, 'Reopening agency details uses cache (0 GETs)');

    const updSpy = spyMethod(agenciesApi, 'update', async (id, payload) => ({ agencyId: id, ...payload }));
    await store.dispatch(updateAdminAgency(42, { businessName: 'Horizon Pro' }));
    assert.equal(store.getState().adminAgencies.detailsByAgencyId[42].data.businessName, 'Horizon Pro');
    updSpy.restore();
    detailSpy.restore();
  }

  // 4. Trip Details ID cache + cross-slice bookings reuse + reassignment invalidation
  {
    const store = createTestStore();
    const spies = [
      spyMethod(tripsApi, 'getAll', async () => [{ tripId: 10, destination: 'Leh', guideId: 2 }]),
      spyMethod(bookingsApi, 'getAll', async () => []),
      spyMethod(travelersApi, 'getAll', async () => []),
      spyMethod(agenciesApi, 'getAll', async () => []),
      spyMethod(guidesApi, 'getAll', async () => []),
      spyMethod(packagesApi, 'getAll', async () => []),
      spyMethod(paymentsApi, 'getAll', async () => []),
      spyMethod(tripsApi, 'getReassignments', async () => [{ id: 1, status: 'PENDING' }]),
    ];

    await store.dispatch(fetchAdminTripDetails(10));
    assert.equal(spies[7].calls.length, 1, 'First trip detail open fetches reassignments once');
    assert.equal(spies[1].calls.length, 1, 'Bookings fetched once even when empty []');

    await store.dispatch(fetchAdminTripDetails(10));
    assert.equal(spies[7].calls.length, 1, 'Reopening trip 10 uses detailsByTripId cache (0 GETs)');
    assert.equal(spies[1].calls.length, 1, 'Empty bookings [] is not refetched');

    const reassignSpy = spyMethod(tripsApi, 'requestReassignment', async () => ({ ok: true }));
    await store.dispatch(requestAdminGuideReassignment(10, { replacementGuideId: 5 }));
    assert.equal(store.getState().adminTrips.detailsByTripId[10].stale, true, 'Reassignment invalidates trip detail cache');
    reassignSpy.restore();
    spies.forEach((s) => s.restore());
  }

  // 5. Cross-slice reuse in Guides, Reviews & Reports + Logout cache reset
  {
    const store = createTestStore();
    const spies = [
      spyMethod(dashboardApi, 'getAdmin', async () => ({ totalTrips: 1 })),
      spyMethod(tripsApi, 'getAll', async () => [{ tripId: 1, destination: 'Kochi' }]),
      spyMethod(bookingsApi, 'getAll', async () => [{ bookingId: 1, tripId: 1 }]),
      spyMethod(travelersApi, 'getAll', async () => []),
      spyMethod(agenciesApi, 'getAll', async () => []),
      spyMethod(guidesApi, 'getAll', async () => [{ guideId: 1, name: 'Asha' }]),
      spyMethod(packagesApi, 'getAll', async () => [{ packageId: 1, name: 'Kerala' }]),
      spyMethod(paymentsApi, 'getAll', async () => []),
      spyMethod(reviewsApi, 'getAll', async () => [{ reviewId: 9, tripId: 1, guideId: 1 }]),
      spyMethod(revenueApi, 'getOverview', async () => ({ totalRevenue: 1000 })),
      spyMethod(revenueApi, 'getBreakdown', async () => ({})),
      spyMethod(revenueApi, 'getTransactions', async () => []),
      spyMethod(revenueApi, 'getConfig', async () => []),
    ];

    await store.dispatch(fetchAdminReports());
    assert.equal(spies[0].calls.length, 1, 'Dashboard fetched once');
    assert.equal(spies[1].calls.length, 1, 'Trips fetched once across Reports/Bookings/Reviews');
    assert.equal(spies[5].calls.length, 1, 'Guides fetched once');
    assert.equal(spies[6].calls.length, 1, 'Packages fetched once');

    await store.dispatch(fetchAdminGuides());
    await store.dispatch(fetchAdminReviews());
    await store.dispatch(fetchAdminBookings());
    await store.dispatch(fetchAdminTrips());
    await store.dispatch(fetchAdminDashboard());

    assert.equal(spies[1].calls.length, 1, 'All subsequent page loads reuse cached trips (0 extra GETs)');
    assert.equal(spies[2].calls.length, 1, 'Bookings reused (0 extra GETs)');
    assert.equal(spies[5].calls.length, 1, 'Guides reused (0 extra GETs)');
    assert.equal(spies[6].calls.length, 1, 'Packages reused (0 extra GETs)');

    store.dispatch(resetAllAdminCaches());
    assert.equal(store.getState().adminPackages.loaded, false, 'Logout resets all Admin caches');
    assert.equal(store.getState().adminTrips.loaded, false);
    assert.equal(store.getState().adminBookings.loaded, false);

    spies.forEach((s) => s.restore());
  }

  console.log('ALL ADMIN REDUX CACHE TESTS PASSED (5/5 suites)');
}

runTests().catch((err) => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
