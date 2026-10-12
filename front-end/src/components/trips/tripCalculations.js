/**
 * tripCalculations.js
 *
 * Small, named pure calculation functions and simulated transit catalog.
 * Unifies duration, passenger multipliers, round-trip calculations,
 * and fee structures across planning steps, summaries, and backend payloads.
 */

// Simulated transport carriers and baseline pricing from legacy planning logic
export const TRANSPORT_CATALOG = {
  Flight: [
    { name: 'SkyHigh Airlines', time: 'Non-stop • 2h 45m', price: 14500, icon: '✈' },
    { name: 'Global Wings Express', time: '1 Stop • 5h 20m', price: 9800, icon: '✈' },
  ],
  Train: [
    { name: 'Expressrail Gold', time: 'Direct • 4h 30m', price: 3200, icon: '🚂' },
    { name: 'Shatabdi Connect', time: '3 Stops • 6h 15m', price: 1800, icon: '🚂' },
  ],
  Bus: [
    { name: 'CityBus Luxury Volvo', time: 'Direct • 8h 15m', price: 1800, icon: '🚌' },
    { name: 'RedLine Sleeper Deluxe', time: '2 Stops • 10h 45m', price: 1200, icon: '🚌' },
  ],
};

/**
 * Returns the default carrier option for a given transit type.
 */
export function getDefaultCarrier(transportType) {
  const options = TRANSPORT_CATALOG[transportType] || [];
  return options[0] || { name: '', price: 0 };
}

/**
 * calculateTripCosts: Pure function calculating all line items and overall trip budget.
 *
 * Persisted vs Estimated Breakdown:
 * - Persisted in Backend:
 *     - Trip.budget: totalBudget
 *     - Transport Booking amount: transportCost + insuranceCost + cancellationFee
 *     - Hotel Booking amount: hotelCost
 *     - Trip.guideId: assigned guide ID (or null)
 *     - Trip.packageId: assigned package ID (or null for custom)
 * - Estimated / Line Item Breakdown:
 *     - Platform coordination fee (₹500): planning estimate included in overall trip budget
 *     - Simulated carrier & hotel rates: realistic benchmark pricing
 *     - Compulsory travel insurance: 7% on transit fare
 *     - Flexible cancellation protection: Flight ₹100, Bus ₹70, Train ₹50
 */
export function calculateTripCosts(formData = {}) {
  const {
    startDate = '',
    endDate = '',
    numPersons = 1,
    transportType = 'Flight',
    tripType = 'round',
    transportPrice = 0,
    includeCancellationProtection = false,
    hotelPrice = 0,
    guidePrice = 0,
  } = formData;

  // 1. Duration calculation (minimum 1 day)
  let days = 1;
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diff = Math.ceil((end - start) / 86400000);
    days = diff > 0 ? diff : 1;
  }

  // 2. Traveler passenger count (at least 1)
  const persons = Math.max(1, parseInt(numPersons) || 1);

  // 3. Transport base fare: price * legs * persons
  const legs = tripType === 'round' ? 2 : 1;
  const baseTransport = Number(transportPrice || 0) * legs * persons;

  // 4. Compulsory Travel Insurance (7% on transport fare when transport selected)
  const insuranceRate = 0.07;
  const insuranceCost = baseTransport > 0 ? Math.round(baseTransport * insuranceRate) : 0;

  // 5. Flexible Cancellation Protection (flat fee depending on transport mode)
  let cancellationFee = 0;
  if (includeCancellationProtection && baseTransport > 0) {
    if (transportType === 'Flight') cancellationFee = 100;
    else if (transportType === 'Bus') cancellationFee = 70;
    else if (transportType === 'Train') cancellationFee = 50;
  }

  // Total transport booking persisted in backend
  const totalTransportBooking = baseTransport + insuranceCost + cancellationFee;

  // 6. Hotel accommodation: price per night * days * persons
  const hotelCost = Number(hotelPrice || 0) * days * persons;

  // 7. Tour guide allocation: flat fee per trip
  const guideCost = Number(guidePrice || 0);

  // 8. Platform coordination fee: fixed estimate
  const platformFee = 500;

  // 9. Total calculated trip budget (persisted on Trip.budget)
  const totalBudget = baseTransport + insuranceCost + cancellationFee + hotelCost + guideCost + platformFee;

  return {
    days,
    numPersons: persons,
    legs,
    transportCost: baseTransport,
    insuranceCost,
    insuranceRate,
    cancellationFee,
    totalTransportBooking,
    hotelCost,
    guideCost,
    platformFee,
    totalBudget,
  };
}
