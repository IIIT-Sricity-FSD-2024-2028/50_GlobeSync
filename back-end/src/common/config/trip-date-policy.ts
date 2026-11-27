import { BadRequestException } from '@nestjs/common';

/**
 * Shared authoritative GlobeSync trip date & duration policy.
 *
 * Defaults:
 * - Minimum advance notice: 1 calendar day (tomorrow onwards)
 * - Maximum booking horizon: 330 calendar days from today
 * - Minimum customized trip duration: 1 calendar day (inclusive)
 * - Maximum customized trip duration: 30 calendar days (inclusive)
 */
export const TRIP_DATE_POLICY = {
  MIN_ADVANCE_NOTICE_DAYS: Number(process.env.TRIP_MIN_ADVANCE_DAYS || 1),
  MAX_BOOKING_HORIZON_DAYS: Number(process.env.TRIP_MAX_HORIZON_DAYS || 330),
  MIN_CUSTOM_DURATION_DAYS: Number(process.env.TRIP_MIN_CUSTOM_DAYS || 1),
  MAX_CUSTOM_DURATION_DAYS: Number(process.env.TRIP_MAX_CUSTOM_DAYS || 30),
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Parse YYYY-MM-DD strictly to UTC midnight timestamp, rejecting invalid calendar dates like 2026-02-30. */
export function parseStrictCalendarDate(label: string, raw: string): number {
  const s = String(raw || '').slice(0, 10);
  if (!ISO_DATE.test(s)) {
    throw new BadRequestException(`${label} must be a valid date in YYYY-MM-DD format.`);
  }
  const [y, m, d] = s.split('-').map(Number);
  const utcMs = Date.UTC(y, m - 1, d);
  const check = new Date(utcMs);
  if (
    check.getUTCFullYear() !== y ||
    check.getUTCMonth() !== m - 1 ||
    check.getUTCDate() !== d
  ) {
    throw new BadRequestException(`${label} is not a valid calendar date (${s}).`);
  }
  return utcMs;
}

export function addCalendarDaysYmd(ymd: string, days: number): string {
  const utc = parseStrictCalendarDate('Date', ymd);
  return new Date(utc + days * 86400000).toISOString().slice(0, 10);
}

export function inclusiveCalendarDays(startYmd: string, endYmd: string): number {
  const startUtc = parseStrictCalendarDate('Start date', startYmd);
  const endUtc = parseStrictCalendarDate('End date', endYmd);
  return Math.round((endUtc - startUtc) / 86400000) + 1;
}

export function todayInIndiaYmd(): string {
  return new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
}

export interface ValidateTripDatesOptions {
  startDate?: string;
  endDate?: string;
  packageDurationDays?: number | null;
  enforceAdvanceAndHorizon?: boolean;
  enforcePackageDuration?: boolean;
}

/**
 * Shared backend validator for all trip creation, rescheduling, and booking operations.
 */
export function validateTripDates(opts: ValidateTripDatesOptions): { inclusiveDays: number } | null {
  if (!opts.startDate && !opts.endDate) return null;

  const startYmd = opts.startDate ? String(opts.startDate).slice(0, 10) : undefined;
  const endYmd = opts.endDate ? String(opts.endDate).slice(0, 10) : undefined;

  if (startYmd) parseStrictCalendarDate('Start date', startYmd);
  if (endYmd) parseStrictCalendarDate('End date', endYmd);

  const todayYmd = todayInIndiaYmd();
  const minStartYmd = addCalendarDaysYmd(todayYmd, TRIP_DATE_POLICY.MIN_ADVANCE_NOTICE_DAYS);
  const maxHorizonYmd = addCalendarDaysYmd(todayYmd, TRIP_DATE_POLICY.MAX_BOOKING_HORIZON_DAYS);

  if (opts.enforceAdvanceAndHorizon !== false) {
    if (startYmd && startYmd < minStartYmd) {
      throw new BadRequestException(
        `Trip can start from tomorrow onwards (${minStartYmd}). Today or past dates are not allowed.`,
      );
    }
    if (startYmd && startYmd > maxHorizonYmd) {
      throw new BadRequestException(
        `Trip start date (${startYmd}) exceeds the maximum ${TRIP_DATE_POLICY.MAX_BOOKING_HORIZON_DAYS}-day booking horizon (latest: ${maxHorizonYmd}).`,
      );
    }
    if (endYmd && endYmd > maxHorizonYmd) {
      throw new BadRequestException(
        `Trip end date (${endYmd}) exceeds the maximum ${TRIP_DATE_POLICY.MAX_BOOKING_HORIZON_DAYS}-day booking horizon (latest: ${maxHorizonYmd}).`,
      );
    }
  }

  if (startYmd && endYmd) {
    if (endYmd < startYmd) {
      throw new BadRequestException('Trip end date cannot be earlier than the start date.');
    }
    const inclusiveDays = inclusiveCalendarDays(startYmd, endYmd);
    if (inclusiveDays < TRIP_DATE_POLICY.MIN_CUSTOM_DURATION_DAYS) {
      throw new BadRequestException(`Trip duration must be at least ${TRIP_DATE_POLICY.MIN_CUSTOM_DURATION_DAYS} calendar day.`);
    }

    if (opts.packageDurationDays != null && opts.enforcePackageDuration) {
      const expected = Math.max(1, Number(opts.packageDurationDays));
      if (inclusiveDays !== expected) {
        throw new BadRequestException(
          `Preplanned package duration is fixed at ${expected} calendar days. Expected end date ${addCalendarDaysYmd(startYmd, expected - 1)}.`,
        );
      }
    } else if (opts.packageDurationDays == null && inclusiveDays > TRIP_DATE_POLICY.MAX_CUSTOM_DURATION_DAYS) {
      throw new BadRequestException(
        `Customized trip duration (${inclusiveDays} calendar days) exceeds the maximum limit of ${TRIP_DATE_POLICY.MAX_CUSTOM_DURATION_DAYS} calendar days.`,
      );
    }

    return { inclusiveDays };
  }

  return null;
}
