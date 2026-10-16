/**
 * tripCalculations.js
 *
 * Route-aware transport catalog and pure calculation functions.
 * Dynamically computes transit pricing, travel durations, and line items
 * based on Departure City (From) and Destination City (To).
 */

/**
 * Detects the route tier based on departure (origin) and destination cities.
 * Evaluates distances and transit tiers to simulate realistic travel costs.
 */
export function analyzeRoute(origin = '', destination = '') {
  const o = (origin || '').toLowerCase().trim();
  const d = (destination || '').toLowerCase().trim();

  const internationalKeywords = [
    'paris', 'france', 'tokyo', 'japan', 'kyoto', 'swiss', 'alps', 'switzerland',
    'new york', 'usa', 'america', 'dubai', 'uae', 'bali', 'indonesia', 'singapore',
    'malaysia', 'london', 'uk', 'rome', 'italy', 'sydney', 'australia', 'cape town',
    'south africa', 'cairo', 'egypt', 'reykjavik', 'iceland', 'machu picchu', 'peru'
  ];

  const regionalInternationalKeywords = [
    'dubai', 'uae', 'bali', 'indonesia', 'singapore', 'malaysia', 'thailand', 'bangkok'
  ];

  const isDestIntl = internationalKeywords.some((k) => d.includes(k));
  const isDestRegionalIntl = regionalInternationalKeywords.some((k) => d.includes(k));
  const isOriginIntl = internationalKeywords.some((k) => o.includes(k));

  if (isDestIntl || isOriginIntl) {
    if (isDestRegionalIntl) {
      return {
        tier: 'regional_international',
        name: 'Regional International Route',
        label: 'Mid-Haul International (~3,000–5,000 km)',
        badge: 'International Mid-Haul',
        color: '#6366f1',
      };
    }
    return {
      tier: 'long_haul_international',
      name: 'Global Long-Haul Route',
      label: 'Intercontinental Long-Haul (~6,000–12,000 km)',
      badge: 'Long-Haul International',
      color: '#8b5cf6',
    };
  }

  // Check if same or neighboring regional route
  const isNearby =
    (o.includes('mumbai') && d.includes('goa')) ||
    (o.includes('goa') && d.includes('mumbai')) ||
    (o.includes('delhi') && d.includes('rajasthan')) ||
    (o.includes('rajasthan') && d.includes('delhi')) ||
    (o.includes('delhi') && d.includes('jaipur')) ||
    (o.includes('bengaluru') && d.includes('kerala')) ||
    (o.includes('chennai') && d.includes('kerala'));

  if (isNearby) {
    return {
      tier: 'local',
      name: 'Regional Express Route',
      label: 'Short-Haul Domestic (~300–600 km)',
      badge: 'Domestic Short-Haul',
      color: '#10b981',
    };
  }

  return {
    tier: 'domestic',
    name: 'National Trunk Route',
    label: 'Domestic Long-Haul (~1,000–2,500 km)',
    badge: 'National Domestic Route',
    color: '#0284c7',
  };
}

/**
 * Returns route-specific transit operators and pricing based on the journey from origin to destination.
 */
export function getRouteTransportCatalog(transportType, origin = '', destination = '') {
  const route = analyzeRoute(origin, destination);

  let flightOptions = [];
  let trainOptions = [];
  let busOptions = [];

  if (route.tier === 'long_haul_international') {
    flightOptions = [
      { name: 'SkyHigh Global Airways', time: 'Direct • 8h 45m', price: 42500, icon: '✈', note: 'Includes 30kg baggage & inflight dining' },
      { name: 'Global Wings Intercontinental', time: '1 Stop • 12h 10m', price: 31200, icon: '✈', note: 'Layover transit with meal voucher' },
    ];
    trainOptions = [
      { name: 'Eurorail / Global Pass Link', time: 'Connecting High-Speed • 6h 30m', price: 8200, icon: '🚂', note: 'Destination high-speed rail pass' },
      { name: 'Scenic Alpine Express', time: 'Panoramic • 7h 45m', price: 6500, icon: '🚂', note: 'Scenic regional mountain connection' },
    ];
    busOptions = [
      { name: 'EuroLines Intercity Express', time: 'Long Distance Coach • 14h 20m', price: 4200, icon: '🚌', note: 'Continental luxury sleeper coach' },
      { name: 'TransContinental Shuttle', time: 'Connecting • 16h 00m', price: 3400, icon: '🚌', note: 'Cross-border verified highway transit' },
    ];
  } else if (route.tier === 'regional_international') {
    flightOptions = [
      { name: 'SkyHigh Airlines', time: 'Non-stop • 4h 15m', price: 21500, icon: '✈', note: 'Direct overseas flight • 25kg checked bag' },
      { name: 'Global Wings Express', time: '1 Stop • 6h 30m', price: 16800, icon: '✈', note: 'Connecting flight with meal' },
    ];
    trainOptions = [
      { name: 'Island Express Rail Link', time: 'Express • 3h 45m', price: 3800, icon: '🚂', note: 'Destination high-speed rail connector' },
      { name: 'Coastal Regional Transit', time: '2 Stops • 5h 20m', price: 2400, icon: '🚂', note: 'Suburban rail network connection' },
    ];
    busOptions = [
      { name: 'CityBus Cross-Border Shuttle', time: 'Direct • 7h 30m', price: 2600, icon: '🚌', note: 'Air-conditioned express coach' },
      { name: 'RedLine Regional Sleeper', time: 'Overnight • 9h 15m', price: 1900, icon: '🚌', note: 'Full-flat sleeper berths' },
    ];
  } else if (route.tier === 'local') {
    flightOptions = [
      { name: 'SkyHigh Regional Flight', time: 'Direct • 1h 10m', price: 4800, icon: '✈', note: 'Short domestic hop • 15kg checked bag' },
      { name: 'AirConnect Shuttle', time: 'Non-stop • 1h 25m', price: 3900, icon: '✈', note: 'Budget regional flyer' },
    ];
    trainOptions = [
      { name: 'Vande Bharat / Expressrail Gold', time: 'Direct High-Speed • 4h 15m', price: 1650, icon: '🚂', note: 'Executive AC chair car & breakfast' },
      { name: 'Jan Shatabdi Express', time: '2 Stops • 5h 30m', price: 920, icon: '🚂', note: 'Reserved AC 3-tier' },
    ];
    busOptions = [
      { name: 'CityBus Luxury Volvo Multi-Axle', time: 'Direct Highway • 6h 30m', price: 1100, icon: '🚌', note: 'AC semi-sleeper with WiFi' },
      { name: 'RedLine Sleeper Deluxe', time: 'Overnight • 7h 45m', price: 780, icon: '🚌', note: 'Upper/lower single berth' },
    ];
  } else {
    // Standard Domestic Route
    flightOptions = [
      { name: 'SkyHigh Airlines', time: 'Non-stop • 2h 20m', price: 7800, icon: '✈', note: 'Direct trunk route • 15kg checked bag' },
      { name: 'Global Wings Express', time: '1 Stop • 4h 45m', price: 5900, icon: '✈', note: 'Economy flex with snack' },
    ];
    trainOptions = [
      { name: 'Rajdhani / Expressrail Gold', time: 'Superfast • 12h 30m', price: 2850, icon: '🚂', note: 'AC 2-Tier with catering included' },
      { name: 'Shatabdi Connect Express', time: 'Direct • 9h 15m', price: 1950, icon: '🚂', note: 'Comfort chair car' },
    ];
    busOptions = [
      { name: 'CityBus Luxury Scania Sleeper', time: 'Overnight • 13h 45m', price: 1750, icon: '🚌', note: 'Twin-deck luxury coach' },
      { name: 'RedLine Interstate Deluxe', time: 'Direct • 15h 00m', price: 1250, icon: '🚌', note: 'Reclining seats with USB chargers' },
    ];
  }

  const catalog = {
    Flight: flightOptions,
    Train: trainOptions,
    Bus: busOptions,
  };

  if (!transportType) return catalog;
  return catalog[transportType] || flightOptions;
}

// Fallback baseline catalog for legacy references
export const TRANSPORT_CATALOG = getRouteTransportCatalog();

/**
 * Returns the default carrier option for a given transit type and route.
 */
export function getDefaultCarrier(transportType, origin = '', destination = '') {
  const options = getRouteTransportCatalog(transportType, origin, destination);
  return options[0] || { name: '', price: 0 };
}

/**
 * calculateTripCosts: Pure function calculating all line items and overall trip budget.
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
