import { syncAuthAccount } from '../auth/identity.util';
import { hashLegacyPassword } from '../auth/identity.util';
import { Injectable, NotFoundException, ForbiddenException, Optional } from '@nestjs/common';
import { guides, Guide, trips } from '../data';
import { CreateGuideDto, UpdateGuideDto } from './dto';
import { PaginationQueryDto, PaginatedResult } from '../common/dto/pagination-query.dto';
import { paginateCollection } from '../common/utils/pagination.util';
import { NotificationsService } from '../notifications/notifications.service';
import { RealtimeService } from '../realtime/realtime.service';
import { GuideAvailabilityService } from './guide-availability.service';
import { systemAuditLogs, SystemAuditLog } from '../data/system-config.data';

@Injectable()
export class GuidesService {
  constructor(
    @Optional() private readonly notificationsService?: NotificationsService,
    @Optional() private readonly realtimeService?: RealtimeService,
    @Optional() private readonly guideAvailabilityService?: GuideAvailabilityService,
  ) {}

  findAvailableForDates(startDate?: string, endDate?: string, excludeTripId?: number) {
    return guides
      .filter((g) => {
        const acct = String(g.status || 'ACTIVE').toUpperCase();
        const ver = String(g.verificationStatus || 'VERIFIED').toUpperCase();
        return !['SUSPENDED', 'INACTIVE', 'DEACTIVATED'].includes(acct) && !['UNVERIFIED', 'REJECTED'].includes(ver);
      })
      .map(({ password, ...rest }) => {
        let conflictReason: string | null = null;
        if (startDate && endDate && this.guideAvailabilityService) {
          conflictReason = this.guideAvailabilityService.findConflictReason(
            rest.guideId,
            startDate,
            endDate,
            undefined,
            excludeTripId,
          );
        }
        return {
          ...rest,
          isAvailableForDates: conflictReason === null,
          conflictReason,
        };
      });
  }

  getGuideSchedule(guideId: number) {
    const guide = this.findOne(guideId);
    const guideTrips = trips.filter((t) => t.guideId === guideId);
    const blockedDates = this.guideAvailabilityService
      ? this.guideAvailabilityService.getGuideBlockedDates(guideId)
      : [];

    return {
      guideId: guide.guideId,
      name: guide.name,
      pendingRequests: guideTrips.filter(
        (t) =>
          t.status !== 'Cancelled' &&
          t.status !== 'Completed' &&
          t.guideStatus !== 'Accepted' &&
          t.guideStatus !== 'Declined' &&
          t.guideStatus !== 'Cancelled',
      ),
      upcomingTrips: guideTrips.filter(
        (t) => t.guideStatus === 'Accepted' && ['Pending', 'Confirmed', 'Planning'].includes(t.status),
      ),
      activeTrips: guideTrips.filter((t) => t.guideStatus === 'Accepted' && t.status === 'Active'),
      completedTrips: guideTrips.filter((t) => t.status === 'Completed' && t.guideStatus === 'Accepted'),
      cancelledTrips: guideTrips.filter((t) => t.status === 'Cancelled' || t.guideStatus === 'Cancelled'),
      blockedDates,
    };
  }

  blockManualDates(guideId: number, startDate: string, endDate: string) {
    this.findOne(guideId);
    if (!this.guideAvailabilityService) {
      throw new NotFoundException('Guide availability service unavailable.');
    }
    return this.guideAvailabilityService.blockDates(guideId, startDate, endDate, undefined, 'CONFIRMED');
  }
  findAll(): Omit<Guide, 'password'>[];
  findAll(query: PaginationQueryDto): Omit<Guide, 'password'>[] | PaginatedResult<Omit<Guide, 'password'>>;
  findAll(query?: PaginationQueryDto): any {
    const safeGuides = guides.map(({ password, ...rest }) => rest);
    return paginateCollection(safeGuides, query, ['name', 'email', 'contact']);
  }

  findOne(id: number): Omit<Guide, 'password'> {
    const guide = guides.find((g) => g.guideId === id);
    if (!guide) {
      throw new NotFoundException(`Guide with ID ${id} not found`);
    }
    const { password, ...rest } = guide;
    return rest;
  }

  create(dto: CreateGuideDto): Omit<Guide, 'password'> {
    const maxId = guides.length > 0
      ? Math.max(...guides.map((g) => g.guideId))
      : 0;

    const newGuide: Guide = {
      guideId: maxId + 1,
      name: dto.name,
      email: dto.email,
      password: hashLegacyPassword(dto.password),
      languages: dto.languages || [],
      experience: dto.experience || 0,
      rating: dto.rating || 0,
      pricePerTrip: dto.pricePerTrip || 0,
      contact: dto.contact || '',
      adminId: dto.adminId || 1,
      role: 'guide',
      verificationStatus: 'UNVERIFIED',
      status: 'ACTIVE',
    };

    guides.push(newGuide);

    // Category B Notification to Super Admin
    if (this.notificationsService) {
      this.notificationsService.createNotification(
        1,
        `New Guide Registered: ${newGuide.name}`,
        `A new tour guide (#${newGuide.guideId} ${newGuide.name}) was registered by an administrator with UNVERIFIED status.`,
        { role: 'superuser', type: 'guide_registration', metadata: { guideId: newGuide.guideId } },
      ).catch(() => {});
    }

    const { password, ...rest } = newGuide;
    return rest;
  }

  /**
   * Update guide profile.
   * If caller is a GUIDE, rate and experience are strictly READ-ONLY (enforced on API).
   */
  update(
    id: number,
    dto: UpdateGuideDto,
    callerRole?: string,
  ): Omit<Guide, 'password'> {
    const index = guides.findIndex((g) => g.guideId === id);
    if (index === -1) {
      throw new NotFoundException(`Guide with ID ${id} not found`);
    }

    const isGuideCaller = callerRole?.toLowerCase() === 'guide';

    const existing = guides[index];
    const updated: Guide = {
      ...existing,
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.email !== undefined && { email: dto.email }),
      ...(dto.password !== undefined && { password: hashLegacyPassword(dto.password) }),
      ...(dto.languages !== undefined && { languages: dto.languages }),
      // Rate, rating, and experience are immutable by Guides
      ...(!isGuideCaller && dto.experience !== undefined && { experience: dto.experience }),
      ...(!isGuideCaller && dto.rating !== undefined && { rating: dto.rating }),
      ...(!isGuideCaller && dto.pricePerTrip !== undefined && { pricePerTrip: dto.pricePerTrip }),
      ...(!isGuideCaller && (dto as any).rate !== undefined && { pricePerTrip: (dto as any).rate }),
      ...(!isGuideCaller && (dto as any).adminSetRateMinor !== undefined && { pricePerTrip: Math.round((dto as any).adminSetRateMinor / 100), adminSetRateMinor: (dto as any).adminSetRateMinor }),
      ...(!isGuideCaller && (dto as any).verifiedExperienceYears !== undefined && { experience: (dto as any).verifiedExperienceYears, verifiedExperienceYears: (dto as any).verifiedExperienceYears }),
      ...(!isGuideCaller && (dto as any).verificationStatus !== undefined && { verificationStatus: (dto as any).verificationStatus }),
      ...(!isGuideCaller && (dto as any).proofUrl !== undefined && { proofUrl: (dto as any).proofUrl }),
      ...(!isGuideCaller && (dto as any).status !== undefined && { status: (dto as any).status }),
      ...(dto.contact !== undefined && { contact: dto.contact }),
      ...(!isGuideCaller && dto.adminId !== undefined && { adminId: dto.adminId }),
      ...(dto.bio !== undefined && { bio: dto.bio }),
      ...(dto.specialties !== undefined && { specialties: dto.specialties }),
      ...(dto.availability !== undefined && { availability: dto.availability }),
    };

    syncAuthAccount(existing.email, { email: dto.email, password: dto.password });
    guides[index] = updated;

    // Audit log if admin updated guide
    if (!isGuideCaller) {
      const maxAuditId = systemAuditLogs.length > 0 ? Math.max(...systemAuditLogs.map((l) => l.id)) : 0;
      systemAuditLogs.unshift({
        id: maxAuditId + 1,
        text: `Guide #${id} (${updated.name}) profile updated by Administrator`,
        author: 'Admin',
        time: 'Just now',
        color: '#3b82f6',
        category: 'users',
        timestamp: new Date().toISOString(),
      });
    }

    const { password, ...rest } = updated;
    return rest;
  }

  remove(id: number): { message: string } {
    const index = guides.findIndex((g) => g.guideId === id);
    if (index === -1) {
      throw new NotFoundException(`Guide with ID ${id} not found`);
    }
    guides.splice(index, 1);
    return { message: `Guide with ID ${id} deleted successfully` };
  }
}
