/**
 * Shared authoritative GlobeSync trip date & duration policy (Frontend).
 * Synchronized with back-end/src/common/config/trip-date-policy.ts.
 */
export const TRIP_DATE_POLICY = {
  MIN_ADVANCE_NOTICE_DAYS: 1,
  MAX_BOOKING_HORIZON_DAYS: 330,
  MIN_CUSTOM_DURATION_DAYS: 1,
  MAX_CUSTOM_DURATION_DAYS: 30,
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function todayLocalYmd() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function parseStrictYmdToUtc(ymd) {
  const s = String(ymd || '').slice(0, 10);
  if (!ISO_DATE.test(s)) return NaN;
  const [y, m, d] = s.split('-').map(Number);
  const utc = Date.UTC(y, m - 1, d);
  const check = new Date(utc);
  if (
    check.getUTCFullYear() !== y ||
    check.getUTCMonth() !== m - 1 ||
    check.getUTCDate() !== d
  ) {
    return NaN;
  }
  return utc;
}

export function addDaysYmd(ymd, days) {
  const utc = parseStrictYmdToUtc(ymd);
  if (Number.isNaN(utc)) return '';
  return new Date(utc + days * 86400000).toISOString().slice(0, 10);
}

export function getBookingDateBounds() {
  const today = todayLocalYmd();
  return {
    today,
    minStartDate: addDaysYmd(today, TRIP_DATE_POLICY.MIN_ADVANCE_NOTICE_DAYS),
    maxHorizonDate: addDaysYmd(today, TRIP_DATE_POLICY.MAX_BOOKING_HORIZON_DAYS),
  };
}

/**
 * Inclusive calendar-day count: Dec 10 -> Dec 14 = 5 days (4 nights); Dec 10 -> Dec 10 = 1 day (0 nights).
 */
export function getInclusiveDurationDays(startYmd, endYmd) {
  const sUtc = parseStrictYmdToUtc(startYmd);
  const eUtc = parseStrictYmdToUtc(endYmd);
  if (Number.isNaN(sUtc) || Number.isNaN(eUtc)) return 0;
  return Math.round((eUtc - sUtc) / 86400000) + 1;
}

/**
 * Package end date: Start date + (packageDuration - 1) days.
 * E.g. 5-day package starting Dec 10 ends Dec 14.
 */
export function calculatePackageEndDate(startYmd, packageDurationDays) {
  const dur = Math.max(1, parseInt(packageDurationDays, 10) || 1);
  return addDaysYmd(startYmd, dur - 1);
}

/**
 * Maximum permitted end date for customized trips:
 * min(startDate + MAX_CUSTOM_DURATION_DAYS - 1, maxHorizonDate).
 */
export function getMaxCustomEndDate(startYmd) {
  const { maxHorizonDate } = getBookingDateBounds();
  if (!startYmd || Number.isNaN(parseStrictYmdToUtc(startYmd))) {
    return maxHorizonDate;
  }
  const maxByDuration = addDaysYmd(startYmd, TRIP_DATE_POLICY.MAX_CUSTOM_DURATION_DAYS - 1);
  return maxByDuration < maxHorizonDate ? maxByDuration : maxHorizonDate;
}

/**
 * Validate startDate & endDate against shared GlobeSync policy.
 * Returns { startDate, endDate } error messages (empty object if valid).
 */
export function validateTripDateRange({
  startDate,
  endDate,
  isPackage = false,
  packageDurationDays = null,
  allowUnchangedPastStart = false,
  originalStartDate = '',
}) {
  const errors = {};
  const { minStartDate, maxHorizonDate } = getBookingDateBounds();
  const startYmd = String(startDate || '').slice(0, 10);
  const endYmd = String(endDate || '').slice(0, 10);

  if (!startYmd) {
    errors.startDate = 'Start date is required.';
  } else if (Number.isNaN(parseStrictYmdToUtc(startYmd))) {
    errors.startDate = 'Please enter a valid calendar start date.';
  } else {
    const startUnchanged = allowUnchangedPastStart && originalStartDate && startYmd === String(originalStartDate).slice(0, 10);
    if (!startUnchanged && startYmd < minStartDate) {
      errors.startDate = `Trip can start from tomorrow onwards (${minStartDate}). Today or past dates are not allowed.`;
    } else if (startYmd > maxHorizonDate) {
      errors.startDate = `Start date exceeds the ${TRIP_DATE_POLICY.MAX_BOOKING_HORIZON_DAYS}-day booking horizon (latest: ${maxHorizonDate}).`;
    }
  }

  if (!endYmd) {
    errors.endDate = 'End date is required.';
  } else if (Number.isNaN(parseStrictYmdToUtc(endYmd))) {
    errors.endDate = 'Please enter a valid calendar end date.';
  } else if (endYmd > maxHorizonDate) {
    errors.endDate = `End date exceeds the ${TRIP_DATE_POLICY.MAX_BOOKING_HORIZON_DAYS}-day booking horizon (latest: ${maxHorizonDate}).`;
  } else if (startYmd && !Number.isNaN(parseStrictYmdToUtc(startYmd))) {
    if (endYmd < startYmd) {
      errors.endDate = 'End date cannot be earlier than start date.';
    } else {
      const days = getInclusiveDurationDays(startYmd, endYmd);
      if (isPackage && packageDurationDays) {
        const expectedDur = Math.max(1, Number(packageDurationDays));
        if (days !== expectedDur) {
          errors.endDate = `Package duration is fixed at ${expectedDur} calendar days (expected ${calculatePackageEndDate(startYmd, expectedDur)}).`;
        }
      } else if (!isPackage && days > TRIP_DATE_POLICY.MAX_CUSTOM_DURATION_DAYS) {
        errors.endDate = `Customized trips cannot exceed ${TRIP_DATE_POLICY.MAX_CUSTOM_DURATION_DAYS} calendar days (currently ${days} days).`;
      }
    }
  }

  return errors;
}
