// Stable selector naming convention: select<Actor><Resource>.
export const selectTravelerTrips = (state) => state.trips.items;
export const selectTravelerBookings = (state) => state.bookings.items;
export const selectTravelerPackages = (state) => state.packages.items;
export const selectAgencyTrips = (state) => state.trips.items;
export const selectAgencyBookings = (state) => state.bookings.items;
export const selectGuideTrips = (state) => state.trips.items;
export const selectSupportTickets = (state) => state.supportTickets.items;
export const selectAdminPackages = (state) => state.packages.items;
export const selectSuperuserAgencies = (state) => state.agencies.items;

export const selectResourceStatus = (resource) => (state) => state[resource]?.status ?? 'idle';
export const selectResourceError = (resource) => (state) => state[resource]?.error ?? null;
