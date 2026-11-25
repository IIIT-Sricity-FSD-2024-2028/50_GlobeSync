import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  Optional,
} from '@nestjs/common';
import {
  PolicyConfig,
  PolicySnapshot,
  CancellationPreview,
  CancellationResult,
  EmergencyOverrideDto,
  EmergencyOverrideResult,
} from './interfaces/policy.interface';
import { testDb } from '../database/test-database';
import { bookings, trips, payments, refunds, commissionLedger } from '../data';
import { RealtimeService } from '../realtime/realtime.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../notifications/email.service';

const DEFAULT_POLICY_CONFIG: PolicyConfig = {
  cancellationPenaltyPercent: 35, // default refund = 100 - 35 = 65%
  leadTimeHours: 24,
  tier1CutoffHours: 72,
  tier2CutoffHours: 12,
  emergencyOverrideThresholdMinor: 500000, // ₹5,000.00
  cancellationProtectionTier1RefundPercent: 90,
  cancellationProtectionTier2RefundPercent: 50,
  cancellationProtectionRatePercent: 5, // Introductory configurable 5% rate
};

@Injectable()
export class PolicyService {
  private config: PolicyConfig = { ...DEFAULT_POLICY_CONFIG };

  constructor(
    @Optional() private readonly realtimeService?: RealtimeService,
    @Optional() private readonly notificationsService?: NotificationsService,
    @Optional() private readonly emailService?: EmailService,
  ) {}

  // Pending emergency overrides waiting for Admin approval
  private pendingOverrides: Map<
    number,
    {
      booking: any;
      reason: string;
      supportAgentId: number;
      supportAgentName?: string;
      requestedAt: string;
      refundAmountMinor: number;
    }
  > = new Map();

  // ─── CONFIGURATION MANAGEMENT ──────────────────────────────────────────────

  getConfig(): PolicyConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<PolicyConfig>, superuserId?: number): PolicyConfig {
    if (updates.cancellationPenaltyPercent !== undefined) {
      if (
        typeof updates.cancellationPenaltyPercent !== 'number' ||
        updates.cancellationPenaltyPercent < 0 ||
        updates.cancellationPenaltyPercent > 100
      ) {
        throw new BadRequestException('cancellationPenaltyPercent must be a number between 0 and 100');
      }
      this.config.cancellationPenaltyPercent = updates.cancellationPenaltyPercent;
    }

    if (updates.leadTimeHours !== undefined) {
      if (typeof updates.leadTimeHours !== 'number' || updates.leadTimeHours < 0) {
        throw new BadRequestException('leadTimeHours must be a non-negative number');
      }
      this.config.leadTimeHours = updates.leadTimeHours;
    }

    if (updates.tier1CutoffHours !== undefined) {
      if (typeof updates.tier1CutoffHours !== 'number' || updates.tier1CutoffHours < 0) {
        throw new BadRequestException('tier1CutoffHours must be a non-negative number');
      }
      this.config.tier1CutoffHours = updates.tier1CutoffHours;
    }

    if (updates.tier2CutoffHours !== undefined) {
      if (typeof updates.tier2CutoffHours !== 'number' || updates.tier2CutoffHours < 0) {
        throw new BadRequestException('tier2CutoffHours must be a non-negative number');
      }
      this.config.tier2CutoffHours = updates.tier2CutoffHours;
    }

    if (updates.emergencyOverrideThresholdMinor !== undefined) {
      if (typeof updates.emergencyOverrideThresholdMinor !== 'number' || updates.emergencyOverrideThresholdMinor < 0) {
        throw new BadRequestException('emergencyOverrideThresholdMinor must be >= 0');
      }
      this.config.emergencyOverrideThresholdMinor = updates.emergencyOverrideThresholdMinor;
    }

    if (updates.cancellationProtectionTier1RefundPercent !== undefined) {
      if (
        typeof updates.cancellationProtectionTier1RefundPercent !== 'number' ||
        updates.cancellationProtectionTier1RefundPercent < 0 ||
        updates.cancellationProtectionTier1RefundPercent > 100
      ) {
        throw new BadRequestException('cancellationProtectionTier1RefundPercent must be 0-100');
      }
      this.config.cancellationProtectionTier1RefundPercent = updates.cancellationProtectionTier1RefundPercent;
    }

    if (updates.cancellationProtectionTier2RefundPercent !== undefined) {
      if (
        typeof updates.cancellationProtectionTier2RefundPercent !== 'number' ||
        updates.cancellationProtectionTier2RefundPercent < 0 ||
        updates.cancellationProtectionTier2RefundPercent > 100
      ) {
        throw new BadRequestException('cancellationProtectionTier2RefundPercent must be 0-100');
      }
      this.config.cancellationProtectionTier2RefundPercent = updates.cancellationProtectionTier2RefundPercent;
    }

    if (updates.cancellationProtectionRatePercent !== undefined) {
      if (
        typeof updates.cancellationProtectionRatePercent !== 'number' ||
        isNaN(updates.cancellationProtectionRatePercent) ||
        updates.cancellationProtectionRatePercent < 0 ||
        updates.cancellationProtectionRatePercent > 100
      ) {
        throw new BadRequestException('cancellationProtectionRatePercent must be a finite number between 0 and 100');
      }
      this.config.cancellationProtectionRatePercent = updates.cancellationProtectionRatePercent;
    }

    this.recordAuditLog(
      superuserId || 1,
      'UPDATE_POLICY_CONFIG',
      'POLICY',
      0,
      { updatedConfig: this.config },
    );

    return { ...this.config };
  }

  // ─── BOOKING LEAD TIME RULE ────────────────────────────────────────────────

  /**
   * Booking lead time: departure must be >= 24 hours from now in UTC.
   * Otherwise throws 400 BadRequestException with a clear message.
   */
  validateBookingLeadTime(
    departureAtUtc: string | Date,
    nowUtc?: Date,
  ): { isValid: boolean; hoursUntilDeparture: number } {
    const departure = this.parseUtcDate(departureAtUtc);
    const now = nowUtc || new Date();

    const diffMs = departure.getTime() - now.getTime();
    const hoursUntilDeparture = diffMs / (3600 * 1000);

    if (hoursUntilDeparture < this.config.leadTimeHours) {
      throw new BadRequestException(
        `Booking lead time violation: Departure must be scheduled at least ${this.config.leadTimeHours} hours in advance. (Requested departure is in ${hoursUntilDeparture.toFixed(1)} hours).`,
      );
    }

    return { isValid: true, hoursUntilDeparture };
  }

  // ─── POLICY SNAPSHOTTING ───────────────────────────────────────────────────

  /**
   * Creates an immutable snapshot of cancellation rules at booking creation time.
   * Stored in booking.policy_snapshot so later setting changes never alter existing bookings.
   */
  createSnapshot(
    hasCancellationProtection = false,
    protectionMeta?: { feeMinor?: number; eligibleSubtotalMinor?: number; ratePercent?: number },
  ): PolicySnapshot {
    return {
      cancellationPenaltyPercent: this.config.cancellationPenaltyPercent,
      defaultRefundPercent: Math.max(0, 100 - this.config.cancellationPenaltyPercent),
      hasCancellationProtection,
      ...(hasCancellationProtection && {
        cancellationProtectionRatePercent: protectionMeta?.ratePercent ?? this.config.cancellationProtectionRatePercent,
        cancellationProtectionFeeMinor: protectionMeta?.feeMinor,
        eligibleSubtotalMinor: protectionMeta?.eligibleSubtotalMinor,
      }),
      protectedFirstTierRefundPercent: this.config.cancellationProtectionTier1RefundPercent,
      protectedSecondTierRefundPercent: this.config.cancellationProtectionTier2RefundPercent,
      leadTimeHoursRequired: this.config.leadTimeHours,
      tier1CutoffHours: this.config.tier1CutoffHours,
      tier2CutoffHours: this.config.tier2CutoffHours,
      snapshottedAtUtc: new Date().toISOString(),
    };
  }

  // ─── CANCELLATION EVALUATION (PURE RULES) ───────────────────────────────────

  /**
   * Calculates hours until departure from departure timestamp (or timezone string) and now in UTC.
   */
  calculateHoursUntilDeparture(
    departureAtUtc: string | Date,
    nowUtc?: Date,
    timezone = 'UTC',
  ): number {
    const depUtc = this.parseUtcDate(departureAtUtc, timezone);
    const now = nowUtc || new Date();
    return (depUtc.getTime() - now.getTime()) / (3600 * 1000);
  }

  /**
   * Evaluates the cancellation tier and exact refund calculation for any booking.
   * Boundaries:
   *   - Exactly 72h counts as the first tier (hours >= 72)
   *   - Exactly 12h counts as the second tier (12 <= hours < 72)
   *   - < 12h is blocked (403)
   */
  evaluateCancellation(booking: any, nowUtc?: Date): CancellationPreview {
    // Departure = explicit departure time, else the start date of the booking's trip.
    // (Previously this fell back to the booking date, i.e. "today", so every booking
    // made through the trip planner looked already departed and could never be cancelled.)
    const parentTrip = booking.tripId ? trips.find((t: any) => t.tripId === booking.tripId) : undefined;
    const departureRaw =
      booking.departure_at_utc || booking.departureAtUtc || booking.startDate || parentTrip?.startDate || booking.bookingDate;
    if (!departureRaw) {
      throw new BadRequestException('Booking has no valid departure date/time.');
    }

    const timezone = booking.departure_timezone || booking.departureTimezone || 'UTC';
    const hoursUntilDeparture = this.calculateHoursUntilDeparture(departureRaw, nowUtc, timezone);

    // Resolve snapshot rules or fallback to active config
    const snapshot: PolicySnapshot = booking.policy_snapshot || booking.policySnapshot || this.createSnapshot(
      Boolean(booking.cancellationProtectionSelected || booking.hasCancellationProtection),
    );

    const hasProtection = Boolean(
      snapshot.hasCancellationProtection ||
      booking.cancellationProtectionSelected ||
      booking.hasCancellationProtection,
    );

    // Refunds are calculated on what was actually charged. An unpaid (HELD/DRAFT)
    // booking has nothing to refund.
    const unpaid = ['HELD', 'DRAFT', 'PENDING'].includes(String(booking.status || '').toUpperCase());
    const totalMinor = unpaid ? 0 : (booking.total_minor ?? (booking.amount ? Math.round(booking.amount * 100) : 0));
    const totalAmount = totalMinor / 100;

    // Past departure check
    if (hoursUntilDeparture <= 0) {
      return {
        bookingId: booking.id || booking.bookingId,
        departureAtUtc: this.parseUtcDate(departureRaw, timezone).toISOString(),
        departureTimezone: timezone,
        hoursUntilDeparture,
        tier: 'TIER_DEPARTED',
        tierDescription: 'Past Departure — Cancellation not allowed',
        isAllowed: false,
        totalMinor,
        totalAmount,
        refundPercentage: 0,
        refundAmountMinor: 0,
        refundAmount: 0,
        penaltyPercentage: 100,
        penaltyAmountMinor: totalMinor,
        hasCancellationProtection: hasProtection,
        protectionBenefitNote: null,
        requiresSupportAssistance: false,
      };
    }

    // Tier 3: < 12h (Blocked)
    if (hoursUntilDeparture < (snapshot.tier2CutoffHours || 12)) {
      return {
        bookingId: booking.id || booking.bookingId,
        departureAtUtc: this.parseUtcDate(departureRaw, timezone).toISOString(),
        departureTimezone: timezone,
        hoursUntilDeparture,
        tier: 'TIER_3_BLOCKED',
        tierDescription: 'Less than 12 hours to departure — Standard cancellation blocked',
        isAllowed: false,
        totalMinor,
        totalAmount,
        refundPercentage: 0,
        refundAmountMinor: 0,
        refundAmount: 0,
        penaltyPercentage: 100,
        penaltyAmountMinor: totalMinor,
        hasCancellationProtection: hasProtection,
        protectionBenefitNote: hasProtection
          ? 'Cancellation Protection active: Contact Support for priority expedited emergency override.'
          : null,
        requiresSupportAssistance: true,
      };
    }

    // Tier 2: >= 12h and < 72h (Allowed, 0% refund or 50% with Protection)
    if (hoursUntilDeparture < (snapshot.tier1CutoffHours || 72)) {
      const refundPct = hasProtection
        ? (snapshot.protectedSecondTierRefundPercent || 50)
        : 0;
      const penaltyPct = 100 - refundPct;
      const refundAmountMinor = Math.round((totalMinor * refundPct) / 100);
      const penaltyAmountMinor = totalMinor - refundAmountMinor;

      return {
        bookingId: booking.id || booking.bookingId,
        departureAtUtc: this.parseUtcDate(departureRaw, timezone).toISOString(),
        departureTimezone: timezone,
        hoursUntilDeparture,
        tier: 'TIER_2_LATE',
        tierDescription: 'Late Cancellation (12h to 72h before departure)',
        isAllowed: true,
        totalMinor,
        totalAmount,
        refundPercentage: refundPct,
        refundAmountMinor,
        refundAmount: refundAmountMinor / 100,
        penaltyPercentage: penaltyPct,
        penaltyAmountMinor,
        hasCancellationProtection: hasProtection,
        protectionBenefitNote: hasProtection
          ? `Cancellation Protection upgraded refund from 0% to ${refundPct}% (₹${(refundAmountMinor / 100).toFixed(2)})`
          : 'Standard policy: 0% refund between 12h and 72h notice.',
        requiresSupportAssistance: false,
      };
    }

    // Tier 1: >= 72h (Allowed, standard 65% or 90% with Protection)
    const baseRefundPct = snapshot.defaultRefundPercent !== undefined
      ? snapshot.defaultRefundPercent
      : (100 - (snapshot.cancellationPenaltyPercent ?? 35));

    const refundPct = hasProtection
      ? (snapshot.protectedFirstTierRefundPercent || 90)
      : baseRefundPct;

    const penaltyPct = 100 - refundPct;
    const refundAmountMinor = Math.round((totalMinor * refundPct) / 100);
    const penaltyAmountMinor = totalMinor - refundAmountMinor;

    return {
      bookingId: booking.id || booking.bookingId,
      departureAtUtc: this.parseUtcDate(departureRaw, timezone).toISOString(),
      departureTimezone: timezone,
      hoursUntilDeparture,
      tier: 'TIER_1_STANDARD',
      tierDescription: 'Standard Cancellation (>= 72 hours before departure)',
      isAllowed: true,
      totalMinor,
      totalAmount,
      refundPercentage: refundPct,
      refundAmountMinor,
      refundAmount: refundAmountMinor / 100,
      penaltyPercentage: penaltyPct,
      penaltyAmountMinor,
      hasCancellationProtection: hasProtection,
      protectionBenefitNote: hasProtection
        ? `Cancellation Protection upgraded refund from ${baseRefundPct}% to ${refundPct}% (₹${(refundAmountMinor / 100).toFixed(2)})`
        : `Standard refund of ${baseRefundPct}% applied (${snapshot.cancellationPenaltyPercent}% platform penalty deduction).`,
      requiresSupportAssistance: false,
    };
  }

  // ─── CANCELLATION PREVIEW ENDPOINT HELPER ───────────────────────────────────

  previewCancellation(bookingId: number, nowUtc?: Date): CancellationPreview {
    const booking = this.findBookingOrThrow(bookingId);
    return this.evaluateCancellation(booking, nowUtc);
  }

  // ─── IDEMPOTENT SERVER-SIDE CANCELLATION & REFUND ──────────────────────────

  async cancelBooking(
    bookingId: number,
    cancelReason: string,
    actorId?: number,
    nowUtc?: Date,
  ): Promise<CancellationResult> {
    const booking = this.findBookingOrThrow(bookingId);

    if (['EXPIRED', 'REFUNDED', 'COMPLETED'].includes(String(booking.status).toUpperCase())) {
      throw new ConflictException(`Booking with ID ${bookingId} is ${String(booking.status).toLowerCase()} and cannot be cancelled.`);
    }

    // IDEMPOTENCY CHECK: Calling cancel twice cannot refund twice
    if (booking.status === 'Cancelled' || booking.status === 'CANCELLED') {
      throw new ConflictException(
        `Booking with ID ${bookingId} has already been cancelled. Cannot process duplicate cancellation or refund.`,
      );
    }

    const evaluation = this.evaluateCancellation(booking, nowUtc);

    // If < 12h, strictly block standard cancellation (403 Forbidden)
    if (!evaluation.isAllowed) {
      if (evaluation.tier === 'TIER_DEPARTED') {
        throw new BadRequestException('Trip has already departed. Cancellation is not permitted.');
      }
      throw new ForbiddenException(
        'Cancellations within 12 hours of departure are strictly blocked. Please contact 24/7 Support for emergency assistance.',
      );
    }

    const nowIso = (nowUtc || new Date()).toISOString();

    // 1. Mark booking cancelled
    booking.status = 'Cancelled';
    booking.cancellationReason = cancelReason;
    booking.cancelledAt = nowIso;

    // 1b. Mark related agency commission cancelled
    commissionLedger.forEach((entry, i) => {
      if (entry.bookingId === bookingId || (booking.tripId && entry.tripId === booking.tripId)) {
        commissionLedger[i] = { ...entry, status: 'cancelled' };
      }
    });

    // 2. Insert Refund Record (server-side only)
    const refundRecord = this.createRefundRecord(
      booking,
      evaluation.refundAmountMinor,
      evaluation.refundPercentage,
      cancelReason || 'Cancelled by traveler under policy rules',
      nowIso,
    );

    // 3. Insert Append-Only Ledger Entry
    const ledgerEntry = this.createLedgerEntry(
      'DEBIT',
      'PLATFORM',
      evaluation.refundAmountMinor,
      'REFUND',
      refundRecord.id || refundRecord.refundId,
      `Cancellation refund for Booking #${bookingId} (${evaluation.refundPercentage}%)`,
      nowIso,
    );

    // 4. Audit Log
    this.recordAuditLog(
      actorId || booking.travelerId || 1,
      'CANCEL_BOOKING',
      'BOOKING',
      bookingId,
      {
        refundId: refundRecord.id || refundRecord.refundId,
        refundAmountMinor: evaluation.refundAmountMinor,
        refundPercentage: evaluation.refundPercentage,
        tier: evaluation.tier,
      },
    );

    // Realtime events & Notifications
    if (this.realtimeService) {
      this.realtimeService.emitToBooking(bookingId, 'booking.status_changed', {
        bookingId,
        status: 'Cancelled',
        booking,
      });
      this.realtimeService.emitToBooking(bookingId, 'refund.processed', {
        bookingId,
        refundAmountMinor: evaluation.refundAmountMinor,
        refundPercentage: evaluation.refundPercentage,
        status: 'PROCESSED',
      });
      if (booking.travelerId) {
        this.realtimeService.emitToUser(booking.travelerId, 'booking.status_changed', {
          bookingId,
          status: 'Cancelled',
          booking,
        }, 'traveler');
        this.realtimeService.emitToUser(booking.travelerId, 'refund.processed', {
          bookingId,
          refundAmountMinor: evaluation.refundAmountMinor,
          refundPercentage: evaluation.refundPercentage,
          status: 'PROCESSED',
        }, 'traveler');
      }
    }

    if (this.notificationsService && booking.travelerId) {
      const displayRefund = `₹${(evaluation.refundAmountMinor / 100).toFixed(2)}`;
      this.notificationsService.createNotification(
        booking.travelerId,
        `Booking #${bookingId} Cancelled`,
        `Your booking has been cancelled. Processed refund: ${displayRefund} (${evaluation.refundPercentage}%).`,
        { role: 'traveler', type: 'booking_cancelled', metadata: { bookingId, refundAmountMinor: evaluation.refundAmountMinor } },
      ).catch(() => {});
    }

    if (this.emailService && booking.travelerId) {
      const traveler = testDb.users.find((u: any) => u.id === booking.travelerId);
      const email = traveler?.email || 'traveler@ticp.com';
      const displayRefund = `₹${(evaluation.refundAmountMinor / 100).toFixed(2)}`;
      this.emailService.sendBookingCancellation(email, {
        bookingId,
        refundAmount: displayRefund,
        penaltyPercent: evaluation.penaltyPercentage,
      }).catch(() => {});
    }

    return {
      bookingId,
      status: 'Cancelled',
      refundId: refundRecord.id || refundRecord.refundId,
      refundAmountMinor: evaluation.refundAmountMinor,
      refundAmount: evaluation.refundAmount,
      refundPercentage: evaluation.refundPercentage,
      ledgerEntryId: ledgerEntry.id,
      cancelledAt: nowIso,
      message: `Booking #${bookingId} successfully cancelled. Refund of ₹${evaluation.refundAmount.toFixed(2)} (${evaluation.refundPercentage}%) issued.`,
    };
  }

  // ─── EMERGENCY OVERRIDE (< 12h SUPPORT WORKFLOW) ───────────────────────────

  async requestEmergencyOverride(
    bookingId: number,
    dto: EmergencyOverrideDto,
    nowUtc?: Date,
  ): Promise<EmergencyOverrideResult> {
    const booking = this.findBookingOrThrow(bookingId);

    if (booking.status === 'Cancelled' || booking.status === 'CANCELLED') {
      throw new ConflictException(`Booking with ID ${bookingId} is already cancelled.`);
    }

    if (!dto.reason || !dto.reason.trim()) {
      throw new BadRequestException('Emergency override requires a valid documented reason.');
    }

    const totalMinor = booking.total_minor ?? (booking.amount ? Math.round(booking.amount * 100) : 0);
    const nowIso = (nowUtc || new Date()).toISOString();

    // Check if amount exceeds the Superuser-configured threshold requiring Admin approval
    const exceedsThreshold = totalMinor > this.config.emergencyOverrideThresholdMinor;

    if (exceedsThreshold) {
      // Store in pending overrides queue for Admin review
      this.pendingOverrides.set(bookingId, {
        booking,
        reason: dto.reason.trim(),
        supportAgentId: dto.supportAgentId || 6, // Aisha Johnson
        supportAgentName: dto.supportAgentName || 'Aisha Johnson (Support)',
        requestedAt: nowIso,
        refundAmountMinor: totalMinor, // full emergency refund requested
      });

      // Record Audit Log for the pending request
      const auditLog = this.recordAuditLog(
        dto.supportAgentId || 6,
        'EMERGENCY_OVERRIDE_REQUESTED',
        'BOOKING',
        bookingId,
        {
          reason: dto.reason.trim(),
          amountMinor: totalMinor,
          thresholdMinor: this.config.emergencyOverrideThresholdMinor,
          status: 'PENDING_ADMIN_APPROVAL',
        },
      );

      return {
        bookingId,
        status: 'PENDING_ADMIN_APPROVAL',
        requiresAdminApproval: true,
        auditLogId: auditLog.id,
        refundAmountMinor: totalMinor,
        refundAmount: totalMinor / 100,
        reason: dto.reason.trim(),
        message: `Emergency override requested for ₹${(totalMinor / 100).toFixed(2)}. Amount exceeds auto-approval threshold (₹${(this.config.emergencyOverrideThresholdMinor / 100).toFixed(2)}); forwarded to Platform Admin for approval.`,
      };
    }

    // Within threshold: auto-approve emergency cancellation
    booking.status = 'Cancelled';
    booking.cancellationReason = `Emergency Override by Support: ${dto.reason.trim()}`;
    booking.cancelledAt = nowIso;

    // Issue 100% refund for emergency override
    const refund = this.createRefundRecord(
      booking,
      totalMinor,
      100,
      `Support Emergency Override: ${dto.reason.trim()}`,
      nowIso,
    );

    const ledger = this.createLedgerEntry(
      'DEBIT',
      'PLATFORM',
      totalMinor,
      'REFUND',
      refund.id || refund.refundId,
      `Emergency Override refund for Booking #${bookingId}`,
      nowIso,
    );

    const auditLog = this.recordAuditLog(
      dto.supportAgentId || 6,
      'EMERGENCY_OVERRIDE_EXECUTED',
      'BOOKING',
      bookingId,
      {
        reason: dto.reason.trim(),
        refundId: refund.id || refund.refundId,
        amountMinor: totalMinor,
        supportAgent: dto.supportAgentName || 'Support Agent',
      },
    );

    if (this.realtimeService) {
      this.realtimeService.emitToBooking(bookingId, 'booking.status_changed', {
        bookingId,
        status: 'Cancelled',
        booking,
      });
      this.realtimeService.emitToBooking(bookingId, 'refund.processed', {
        bookingId,
        refundAmountMinor: totalMinor,
        refundPercentage: 100,
        status: 'PROCESSED',
      });
      if (booking.travelerId) {
        this.realtimeService.emitToUser(booking.travelerId, 'booking.status_changed', {
          bookingId,
          status: 'Cancelled',
          booking,
        }, 'traveler');
        this.realtimeService.emitToUser(booking.travelerId, 'refund.processed', {
          bookingId,
          refundAmountMinor: totalMinor,
          refundPercentage: 100,
          status: 'PROCESSED',
        }, 'traveler');
      }
    }

    return {
      bookingId,
      status: 'Cancelled',
      requiresAdminApproval: false,
      auditLogId: auditLog.id,
      refundId: refund.id || refund.refundId,
      refundAmountMinor: totalMinor,
      refundAmount: totalMinor / 100,
      reason: dto.reason.trim(),
      message: `Emergency override granted by Support. Full refund of ₹${(totalMinor / 100).toFixed(2)} processed.`,
    };
  }

  async approveEmergencyOverride(
    bookingId: number,
    adminId: number,
    adminName = 'Manoj Gupta (Admin)',
    nowUtc?: Date,
  ): Promise<EmergencyOverrideResult> {
    const pending = this.pendingOverrides.get(bookingId);
    if (!pending) {
      throw new NotFoundException(`No pending emergency override request found for Booking #${bookingId}`);
    }

    if (pending.supportAgentId && pending.supportAgentId === adminId) {
      throw new ForbiddenException(
        'Self-approval is strictly prohibited. The requesting agent cannot approve their own emergency override request.',
      );
    }

    const { booking, reason, refundAmountMinor, supportAgentName } = pending;
    const nowIso = (nowUtc || new Date()).toISOString();

    booking.status = 'Cancelled';
    booking.cancellationReason = `Emergency Override approved by ${adminName}: ${reason}`;
    booking.cancelledAt = nowIso;

    const refund = this.createRefundRecord(
      booking,
      refundAmountMinor,
      100,
      `Emergency Override approved by ${adminName} (Requested by ${supportAgentName}): ${reason}`,
      nowIso,
    );

    this.createLedgerEntry(
      'DEBIT',
      'PLATFORM',
      refundAmountMinor,
      'REFUND',
      refund.id || refund.refundId,
      `Admin-approved Emergency Refund for Booking #${bookingId}`,
      nowIso,
    );

    const auditLog = this.recordAuditLog(
      adminId,
      'EMERGENCY_OVERRIDE_APPROVED',
      'BOOKING',
      bookingId,
      {
        reason,
        approvedBy: adminName,
        refundId: refund.id || refund.refundId,
        refundAmountMinor,
      },
    );

    this.pendingOverrides.delete(bookingId);

    if (this.realtimeService) {
      this.realtimeService.emitToBooking(bookingId, 'booking.status_changed', {
        bookingId,
        status: 'Cancelled',
        booking,
      });
      this.realtimeService.emitToBooking(bookingId, 'refund.processed', {
        bookingId,
        refundAmountMinor,
        refundPercentage: 100,
        status: 'PROCESSED',
      });
      if (booking.travelerId) {
        this.realtimeService.emitToUser(booking.travelerId, 'booking.status_changed', {
          bookingId,
          status: 'Cancelled',
          booking,
        }, 'traveler');
        this.realtimeService.emitToUser(booking.travelerId, 'refund.processed', {
          bookingId,
          refundAmountMinor,
          refundPercentage: 100,
          status: 'PROCESSED',
        }, 'traveler');
      }
    }

    return {
      bookingId,
      status: 'Cancelled',
      requiresAdminApproval: false,
      auditLogId: auditLog.id,
      refundId: refund.id || refund.refundId,
      refundAmountMinor,
      refundAmount: refundAmountMinor / 100,
      reason,
      message: `Emergency override for Booking #${bookingId} officially approved by Admin. Refund of ₹${(refundAmountMinor / 100).toFixed(2)} issued.`,
    };
  }

  // ─── INTERNAL HELPERS ──────────────────────────────────────────────────────

  private parseUtcDate(dateInput: string | Date, timezone = 'UTC'): Date {
    if (dateInput instanceof Date) {
      return dateInput;
    }
    const str = String(dateInput).trim();

    // If explicit ISO offset (+05:30, Z) is present, JS Date parses directly to UTC
    if (str.includes('Z') || /[+-]\d{2}:\d{2}$/.test(str)) {
      return new Date(str);
    }

    // Bare date like "2026-08-10" or "2026-08-10T10:00:00"
    if (timezone === 'UTC' || !timezone) {
      return new Date(str.includes('T') ? `${str}Z` : `${str}T00:00:00Z`);
    }

    // Handled timezone offsets
    if (timezone === 'Asia/Kolkata' || timezone === 'IST') {
      const timePart = str.includes('T') ? str : `${str}T00:00:00`;
      return new Date(`${timePart}+05:30`);
    }
    if (timezone === 'America/New_York' || timezone === 'EST') {
      const timePart = str.includes('T') ? str : `${str}T00:00:00`;
      return new Date(`${timePart}-05:00`);
    }

    return new Date(str);
  }

  private findBookingOrThrow(id: number): any {
    // Check in-memory bookings first
    let found = bookings.find((b) => b.bookingId === id);
    if (found) return found;

    // Check testDb
    found = testDb.bookings.find((b: any) => (b.id === id || b.bookingId === id));
    if (found) return found;

    throw new NotFoundException(`Booking with ID ${id} not found.`);
  }

  private createRefundRecord(
    booking: any,
    amountMinor: number,
    percentage: number,
    reason: string,
    nowIso: string,
  ): any {
    const maxId = testDb.refunds.length > 0
      ? Math.max(...testDb.refunds.map((r: any) => r.id || r.refundId || 0))
      : 0;

    const bookingKey = booking.bookingId ?? booking.id;
    const paidPayment = payments.find((p) => p.bookingId === bookingKey && p.status === 'Paid');

    const record = {
      id: maxId + 1,
      refundId: maxId + 1,
      booking_id: booking.id || booking.bookingId,
      payment_id: paidPayment?.paymentId ?? null,
      traveler_id: booking.travelerId || booking.traveler_id || 1,
      amount_minor: amountMinor,
      amount: amountMinor / 100,
      refund_percentage: percentage,
      reason,
      status: 'COMPLETED',
      refundStatus: 'Completed',
      requested_at: nowIso,
      refundDate: nowIso.split('T')[0],
      refundTime: nowIso.split('T')[1].slice(0, 8),
    };

    testDb.refunds.push(record);

    // Mirror into the business refunds list so admin, support and agency refund
    // screens (GET /refunds) show refunds created by traveler cancellations.
    if (paidPayment && amountMinor > 0) {
      const nextId = refunds.reduce((m, r) => Math.max(m, r.refundId), 0) + 1;
      refunds.push({
        refundId: nextId,
        paymentId: paidPayment.paymentId,
        refundDate: record.refundDate,
        refundTime: record.refundTime,
        refundStatus: 'Completed',
        amount: amountMinor / 100,
        reason: `${reason} (booking #${bookingKey}, ${percentage}% refund)`,
        ...(paidPayment.agencyId !== undefined && { agencyId: paidPayment.agencyId }),
      });
    }
    return record;
  }

  private createLedgerEntry(
    entryType: 'DEBIT' | 'CREDIT',
    accountType: 'PLATFORM' | 'AGENCY' | 'TRAVELER',
    amountMinor: number,
    referenceType: 'REFUND' | 'BOOKING' | 'COMMISSION',
    referenceId: number,
    description: string,
    nowIso: string,
  ): any {
    const maxId = testDb.ledgerEntries.length > 0
      ? Math.max(...testDb.ledgerEntries.map((l: any) => l.id || 0))
      : 0;

    const entry = {
      id: maxId + 1,
      entry_type: entryType,
      account_type: accountType,
      amount_minor: amountMinor,
      currency: 'INR',
      reference_type: referenceType,
      reference_id: referenceId,
      description,
      created_at: nowIso,
    };

    testDb.ledgerEntries.push(entry);
    return entry;
  }

  private recordAuditLog(
    actorId: number,
    action: string,
    entityType: string,
    entityId: number,
    details: any,
  ): any {
    const maxId = testDb.auditLogs.length > 0
      ? Math.max(...testDb.auditLogs.map((a: any) => a.id || 0))
      : 0;

    const log = {
      id: maxId + 1,
      actor_id: actorId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details,
      created_at: new Date().toISOString(),
    };

    testDb.auditLogs.push(log);
    return log;
  }
}
