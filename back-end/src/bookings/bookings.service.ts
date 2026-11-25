import { Injectable, NotFoundException, BadRequestException, ConflictException, Optional } from '@nestjs/common';
import { bookings, Booking, trips } from '../data';
import { CreateBookingDto, UpdateBookingDto } from './dto';
import { PolicyService } from '../policy/policy.service';
import { InventoryService } from '../inventory/inventory.service';
import { GuideAvailabilityService } from '../guides/guide-availability.service';
import { PricingService } from './pricing.service';
import { IdempotencyService } from '../common/idempotency/idempotency.service';
import { BookingStateMachine } from './state-machine/booking-state-machine';
import { BookingStatus } from './state-machine/booking-status.enum';
import { RealtimeService } from '../realtime/realtime.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PaginationQueryDto, PaginatedResult } from '../common/dto/pagination-query.dto';
import { paginateCollection } from '../common/utils/pagination.util';
import { validateTripDates } from '../common/config/trip-date-policy';


@Injectable()
export class BookingsService {
  constructor(
    private readonly policyService: PolicyService,
    private readonly inventoryService: InventoryService,
    private readonly guideAvailabilityService: GuideAvailabilityService,
    private readonly pricingService: PricingService,
    private readonly idempotencyService: IdempotencyService,
    @Optional() private readonly realtimeService?: RealtimeService,
    @Optional() private readonly notificationsService?: NotificationsService,
  ) {}

  findAll(): Booking[];
  findAll(query: PaginationQueryDto): Booking[] | PaginatedResult<Booking>;
  findAll(query?: PaginationQueryDto): any {
    return paginateCollection(bookings, query, ['service', 'status', 'type', 'reservationRef']);
  }

  findOne(id: number): Booking {
    const b = bookings.find((b) => b.bookingId === id);
    if (!b) throw new NotFoundException(`Booking with ID ${id} not found`);
    return b;
  }

  findByTraveler(travelerId: number): Booking[];
  findByTraveler(travelerId: number, query: PaginationQueryDto): Booking[] | PaginatedResult<Booking>;
  findByTraveler(travelerId: number, query?: PaginationQueryDto): any {
    const list = bookings.filter((b) => b.travelerId === travelerId);
    return paginateCollection(list, query, ['service', 'status', 'type', 'reservationRef']);
  }

  findByAgency(agencyId: number): Booking[];
  findByAgency(agencyId: number, query: PaginationQueryDto): Booking[] | PaginatedResult<Booking>;
  findByAgency(agencyId: number, query?: PaginationQueryDto): any {
    const list = bookings.filter((b) => b.agencyId === agencyId);
    return paginateCollection(list, query, ['service', 'status', 'type', 'reservationRef']);
  }

  findByGuide(guideId: number): Booking[];
  findByGuide(guideId: number, query: PaginationQueryDto): Booking[] | PaginatedResult<Booking>;
  findByGuide(guideId: number, query?: PaginationQueryDto): any {
    const guideTripIds = new Set(trips.filter((t) => t.guideId === guideId).map((t) => t.tripId));
    const list = bookings.filter((b) => b.tripId !== undefined && guideTripIds.has(b.tripId));
    return paginateCollection(list, query, ['service', 'status', 'type', 'reservationRef']);
  }

  /**
   * Create a Booking (HOLD state) with:
   *  1. Idempotency-Key checking.
   *  2. Server-side authoritative pricing (client amounts ignored).
   *  3. Inventory capacity reservation (optimistic locking).
   *  4. Guide atomic date-overlap prevention.
   *  5. 15-minute hold expiration deadline.
   *  6. State Machine transition to HELD.
   */
  async create(dto: CreateBookingDto, idempotencyKey?: string): Promise<Booking> {
    // 1. Idempotency Check
    if (idempotencyKey && this.idempotencyService.has(idempotencyKey)) {
      const cached = this.idempotencyService.get(idempotencyKey);
      return cached!.body as Booking;
    }

    if (!!dto.travelerId === !!dto.agencyId) {
      throw new BadRequestException('Exactly one of travelerId or agencyId must be provided.');
    }

    // 2. Lead Time Validation (UTC)
    // Bookings belong to a real, still-open trip and inherit its departure date.
    let parentTrip: any;
    if (dto.tripId !== undefined && dto.tripId !== null) {
      parentTrip = trips.find((t) => t.tripId === dto.tripId);
      if (!parentTrip) throw new BadRequestException(`Trip #${dto.tripId} does not exist.`);
      if (['Cancelled', 'Completed'].includes(parentTrip.status)) {
        throw new BadRequestException(`Trip #${dto.tripId} is ${parentTrip.status.toLowerCase()}; new bookings cannot be added.`);
      }
      // A trip with a chosen guide is booked only after the guide accepts (owner rule, Nov 2026).
      if (parentTrip.guideId != null && parentTrip.guideStatus && parentTrip.guideStatus !== 'Accepted') {
        throw new BadRequestException(
          parentTrip.guideStatus === 'Declined'
            ? `The guide declined trip #${dto.tripId}. Choose another guide (or continue without one) before booking.`
            : `Trip #${dto.tripId} is waiting for the guide to accept (reply within 3 hours). Booking opens after the guide accepts.`,
        );
      }
    }
    const departureRaw =
      dto.departureAtUtc ||
      dto.departure_at_utc ||
      (parentTrip?.startDate ? new Date(`${String(parentTrip.startDate).slice(0, 10)}T00:00:00+05:30`).toISOString() : undefined);
    if (dto.amount !== undefined && dto.amount <= 0 && !dto.packageId && !dto.guideId && !(dto.items && dto.items.length)) {
      throw new BadRequestException('Booking amount must be greater than zero.');
    }
    const explicitDeparture = dto.departureAtUtc || dto.departure_at_utc;
    if (explicitDeparture) {
      this.policyService.validateBookingLeadTime(explicitDeparture);
    } else if (parentTrip?.startDate) {
      // Trip-derived departure: the rule is "trip starts tomorrow or later" (India date),
      // matching the date rule used when the trip is created.
      const todayIst = new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
      if (String(parentTrip.startDate).slice(0, 10) <= todayIst) {
        throw new BadRequestException('Bookings can only be made for trips that start tomorrow or later.');
      }
    }
    if (dto.startDate || dto.endDate || parentTrip?.startDate) {
      validateTripDates({
        startDate: dto.startDate || parentTrip?.startDate,
        endDate: dto.endDate || parentTrip?.endDate,
        enforceAdvanceAndHorizon: !explicitDeparture,
        enforcePackageDuration: false,
      });
    }

    // 3. Server-Side Authoritative Pricing Calculation
    let finalAmount = dto.amount;
    let finalTotalMinor = Math.round(dto.amount * 100);
    let insuranceRate = 0;
    let insuranceAmount = 0;
    let cancellationFee = 0;
    let cancellationProtectionSelected = Boolean(dto.cancellationProtectionSelected);
    let protectionRatePercent = this.policyService.getConfig().cancellationProtectionRatePercent ?? 5;
    let protectionFeeMinor = 0;
    let protectionEligibleMinor = 0;

    const hasStructuredItems = (dto.items && dto.items.length > 0) || dto.guideId || dto.packageId;
    const guideAcceptedForPricing = parentTrip?.guideId ? parentTrip.guideStatus === 'Accepted' : true;

    if (hasStructuredItems) {
      const priceCalc = this.pricingService.calculatePrice({
        items: dto.items,
        guideId: dto.guideId,
        guideAccepted: guideAcceptedForPricing,
        startDate: dto.startDate,
        endDate: dto.endDate,
        packageId: dto.packageId,
        transportMode: dto.transportMode,
        cancellationProtectionSelected: dto.cancellationProtectionSelected,
      });

      // Override client-supplied price completely with server-calculated price
      finalAmount = priceCalc.totalAmount;
      finalTotalMinor = priceCalc.totalMinor;
      insuranceAmount = priceCalc.insuranceMinor / 100;
      insuranceRate = priceCalc.insuranceMinor > 0 ? 0.07 : 0;
      protectionRatePercent = priceCalc.cancellationProtectionRatePercent;
      protectionFeeMinor = priceCalc.cancellationProtectionFeeMinor;
      protectionEligibleMinor = priceCalc.eligibleProtectionSubtotalMinor;
      cancellationFee = protectionFeeMinor / 100;
      cancellationProtectionSelected = protectionFeeMinor > 0;
    } else {
      const baseAmount = Math.max(0, Number(dto.amount || 0));
      const baseMinor = Math.round(baseAmount * 100);
      finalAmount = baseAmount;

      if (dto.transportMode) {
        insuranceRate = 0.07;
        insuranceAmount = Math.round(baseAmount * insuranceRate * 100) / 100;
        finalAmount += insuranceAmount;
      }

      if (dto.cancellationProtectionSelected && baseMinor > 0) {
        protectionEligibleMinor = baseMinor;
        protectionFeeMinor = Math.round(protectionEligibleMinor * (protectionRatePercent / 100));
        cancellationFee = protectionFeeMinor / 100;
        if (protectionFeeMinor > 0) {
          cancellationProtectionSelected = true;
          finalAmount += cancellationFee;
        }
      } else {
        cancellationProtectionSelected = false;
      }
      finalTotalMinor = Math.round(finalAmount * 100);
    }

    const maxId = bookings.length > 0 ? Math.max(...bookings.map((b) => b.bookingId)) : 0;
    const newBookingId = maxId + 1;

    // 4. Reserve Inventory (Row-Level Optimistic Locking / Capacity Reservation)
    let reservationRef: string | undefined;
    if (dto.items && dto.items.length > 0) {
      const dates = {
        startDate: dto.startDate || new Date().toISOString().split('T')[0],
        endDate: dto.endDate || new Date(Date.now() + 86400000).toISOString().split('T')[0],
      };

      for (const item of dto.items) {
        const holdResult = await this.inventoryService.holdInventory(
          item.inventoryRef,
          dates,
          item.quantity,
          15, // 15-minute hold
        );
        reservationRef = holdResult.reservationRef;
      }
    }

    // 5. Reserve Guide (Atomic Date Overlap Check)
    if (dto.guideId) {
      const sDate = dto.startDate || (departureRaw ? departureRaw.split('T')[0] : new Date().toISOString().split('T')[0]);
      const eDate = dto.endDate || sDate;

      this.guideAvailabilityService.blockDates(
        dto.guideId,
        sDate,
        eDate,
        newBookingId,
        'HELD',
      );
    }

    // 6. Snapshot Business Policy & Cancellation Protection
    const policySnapshot = this.policyService.createSnapshot(cancellationProtectionSelected, {
      feeMinor: protectionFeeMinor,
      eligibleSubtotalMinor: protectionEligibleMinor,
      ratePercent: protectionRatePercent,
    });

    // 7. State Machine Status & Hold Expiration
    const nowIso = new Date().toISOString();
    const holdExpiresAtUtc = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes

    const newBooking: Booking = {
      bookingId: newBookingId,
      bookingDate: dto.bookingDate || nowIso.split('T')[0],
      status: BookingStatus.HELD,
      tripId: dto.tripId,
      travelerId: dto.travelerId,
      agencyId: dto.agencyId,
      service: dto.service,
      type: dto.type as Booking['type'],
      amount: finalAmount,
      total_minor: finalTotalMinor,
      departureAtUtc: departureRaw,
      departure_at_utc: departureRaw,
      departureTimezone: dto.departureTimezone || dto.departure_timezone || 'UTC',
      departure_timezone: dto.departureTimezone || dto.departure_timezone || 'UTC',
      policySnapshot,
      policy_snapshot: policySnapshot,
      reservationRef,
      guideId: dto.guideId,
      holdExpiresAtUtc,
      heldAt: nowIso,
      ...(insuranceRate > 0 && {
        insuranceSelected: true,
        insuranceRate,
        insuranceAmount,
      }),
      ...(cancellationProtectionSelected && {
        cancellationProtectionSelected: true,
        cancellationFee,
        cancellationProtectionRatePercent: protectionRatePercent,
      }),
    };

    bookings.push(newBooking);

    // Save to Idempotency Cache if key provided
    if (idempotencyKey) {
      this.idempotencyService.save(idempotencyKey, 201, newBooking);
    }

    // Emit booking.status_changed event
    if (this.realtimeService) {
      this.realtimeService.emitToBooking(newBooking.bookingId, 'booking.status_changed', {
        bookingId: newBooking.bookingId,
        status: newBooking.status,
        booking: newBooking,
      });
      this.realtimeService.emitToUser(newBooking.travelerId, 'booking.status_changed', {
        bookingId: newBooking.bookingId,
        status: newBooking.status,
        booking: newBooking,
      }, 'traveler');
    }

    if (this.notificationsService) {
      const targetId = newBooking.travelerId || newBooking.agencyId;
      const targetRole = newBooking.agencyId ? 'agency' : 'traveler';
      if (targetId) {
        this.notificationsService.createNotification(
          targetId,
          'Booking Created (15m Hold)',
          `Booking #${newBooking.bookingId} created. You have 15 minutes to complete payment before hold expires.`,
          { role: targetRole, type: 'booking_held', metadata: { bookingId: newBooking.bookingId, tripId: newBooking.tripId } },
        ).catch(() => {});
      }
    }

    return newBooking;
  }

  cancellationPreview(id: number) {
    return this.policyService.previewCancellation(id);
  }

  cancel(id: number, reason: string, actorId?: number) {
    return this.policyService.cancelBooking(id, reason, actorId);
  }

  requestEmergencyOverride(id: number, dto: any) {
    return this.policyService.requestEmergencyOverride(id, dto);
  }

  approveEmergencyOverride(id: number, adminId: number, adminName?: string) {
    return this.policyService.approveEmergencyOverride(id, adminId, adminName);
  }

  /**
   * Update booking with State Machine transition validation.
   */
  update(id: number, dto: UpdateBookingDto, actor?: { role: string; userId: number }): Booking {
    const idx = bookings.findIndex((b) => b.bookingId === id);
    if (idx === -1) throw new NotFoundException(`Booking with ID ${id} not found`);

    const currentBooking = bookings[idx];

    // Travelers and agencies cannot rewrite a booking's price, owner, trip or status.
    // They may only switch cancellation protection while the booking is unpaid; the
    // server then recalculates the amount due. Cancellation goes through /cancel.
    if (actor && !['admin', 'superuser', 'support'].includes(actor.role)) {
      dto = this.restrictOwnerUpdate(currentBooking, dto);
    }

    // Enforce State Machine transition rules if status is changing
    let targetStatus = currentBooking.status;
    if (dto.status !== undefined && dto.status !== currentBooking.status) {
      targetStatus = BookingStateMachine.assertValidTransition(currentBooking.status, dto.status);
    }

    const updated: Booking = {
      ...currentBooking,
      ...(dto.bookingDate !== undefined && { bookingDate: dto.bookingDate }),
      status: targetStatus as Booking['status'],
      ...(dto.tripId !== undefined && { tripId: dto.tripId }),
      ...(dto.travelerId !== undefined && { travelerId: dto.travelerId }),
      ...(dto.agencyId !== undefined && { agencyId: dto.agencyId }),
      ...(dto.service !== undefined && { service: dto.service }),
      ...(dto.type !== undefined && { type: dto.type as Booking['type'] }),
      ...(dto.amount !== undefined && { amount: dto.amount, total_minor: Math.round(dto.amount * 100) }),
      ...(dto.cancellationProtectionSelected !== undefined && { cancellationProtectionSelected: dto.cancellationProtectionSelected }),
      ...(dto.cancellationFee !== undefined && { cancellationFee: dto.cancellationFee }),
      ...(dto.cancellationReason !== undefined && { cancellationReason: dto.cancellationReason }),
      ...(targetStatus === 'CANCELLED' || targetStatus === 'Cancelled' ? {
        cancellationReason: dto.cancellationReason || currentBooking.cancellationReason || 'Cancelled by user',
        cancelledAt: dto.cancelledAt || new Date().toISOString(),
      } : {}),
    };

    bookings[idx] = updated;

    if (this.realtimeService && targetStatus !== currentBooking.status) {
      this.realtimeService.emitToBooking(updated.bookingId, 'booking.status_changed', {
        bookingId: updated.bookingId,
        status: updated.status,
        booking: updated,
      });
      this.realtimeService.emitToUser(updated.travelerId, 'booking.status_changed', {
        bookingId: updated.bookingId,
        status: updated.status,
        booking: updated,
      }, 'traveler');
    }

    if (this.notificationsService && targetStatus !== currentBooking.status) {
      this.notificationsService.createNotification(
        updated.travelerId,
        `Booking #${updated.bookingId} Status Updated`,
        `Your booking status is now ${updated.status}.`,
        { role: 'traveler', type: 'booking_status', metadata: { bookingId: updated.bookingId, status: updated.status } },
      ).catch(() => {});
    }

    return updated;
  }

  private restrictOwnerUpdate(current: Booking, dto: UpdateBookingDto): UpdateBookingDto {
    const same = (a: any, b: any) =>
      a === undefined || a === b || (typeof a === 'string' && typeof b === 'string' && a.toUpperCase() === b.toUpperCase());
    const statusSame =
      dto.status === undefined ||
      BookingStateMachine.normalizeStatus(dto.status) === BookingStateMachine.normalizeStatus(current.status);
    if (!statusSame) {
      throw new BadRequestException(
        'Booking status changes automatically after payment. To cancel, use the Cancel booking option so the refund policy is applied.',
      );
    }
    const locked: (keyof UpdateBookingDto)[] = ['tripId', 'travelerId', 'agencyId', 'type', 'service', 'bookingDate'];
    const tampered = locked.filter((k) => !same((dto as any)[k], (current as any)[k]));
    if (tampered.length) {
      throw new BadRequestException(`These booking details cannot be changed: ${tampered.join(', ')}.`);
    }

    const result: UpdateBookingDto = {};
    const wantsProtection = dto.cancellationProtectionSelected;
    if (wantsProtection !== undefined && wantsProtection !== Boolean(current.cancellationProtectionSelected)) {
      if (String(current.status).toUpperCase() !== 'HELD') {
        throw new BadRequestException('Cancellation protection can only be changed before payment.');
      }
      const fee = Number(current.cancellationFee || dto.cancellationFee || 0);
      if (!wantsProtection && fee > 0) {
        result.cancellationProtectionSelected = false;
        result.amount = Math.max(0, Number(current.amount) - fee);
      } else if (wantsProtection && !current.cancellationProtectionSelected) {
        throw new BadRequestException('Cancellation protection must be chosen when the booking is created.');
      }
    }
    if (dto.amount !== undefined && result.amount === undefined && Math.round(dto.amount * 100) !== Math.round(Number(current.amount) * 100)) {
      throw new BadRequestException('The booking amount is set by GlobeSync and cannot be changed.');
    }
    return result;
  }

  remove(id: number): { message: string } {
    const idx = bookings.findIndex((b) => b.bookingId === id);
    if (idx === -1) throw new NotFoundException(`Booking with ID ${id} not found`);
    bookings.splice(idx, 1);
    return { message: `Booking with ID ${id} deleted successfully` };
  }
}
