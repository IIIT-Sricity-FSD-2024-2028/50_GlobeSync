import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Optional,
} from '@nestjs/common';
import {
  agencies,
  Agency,
  guides,
  Guide,
  approvalRequests,
  ApprovalRequest,
  systemAuditLogs,
  trips,
  bookings,
} from '../data';
import { NotificationsService } from '../notifications/notifications.service';
import { RealtimeService } from '../realtime/realtime.service';

export interface CreateApprovalRequestInput {
  type: 'AGENCY_CHANGE' | 'AGENCY_STATUS_COMMISSION' | 'GUIDE_CHANGE' | 'GUIDE_DEACTIVATION';
  requesterId: number;
  requesterName: string;
  requesterRole: string;
  entityType: 'agency' | 'guide';
  entityId: number;
  proposedValues: Record<string, any>;
  reason: string;
  effectiveDate?: string;
}

export interface ReviewDecisionInput {
  decision: 'APPROVE' | 'REJECT';
  reviewer: { userId: number; name?: string; role: string };
  reason?: string;
}

@Injectable()
export class ApprovalsService {
  constructor(
    @Optional() private readonly notificationsService?: NotificationsService,
    @Optional() private readonly realtimeService?: RealtimeService,
  ) {}

  findAll(statusFilter?: string): ApprovalRequest[] {
    if (statusFilter) {
      return approvalRequests.filter((r) => r.status.toUpperCase() === statusFilter.toUpperCase());
    }
    return [...approvalRequests].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  findOne(id: number): ApprovalRequest {
    const req = approvalRequests.find((r) => r.id === id);
    if (!req) throw new NotFoundException(`Approval request #${id} not found.`);
    return req;
  }

  createRequest(input: CreateApprovalRequestInput): ApprovalRequest {
    if (!input.reason || input.reason.trim().length < 5) {
      throw new BadRequestException('A mandatory justification of at least 5 characters is required.');
    }

    let currentValues: Record<string, any> = {};
    let impactAnalysis: Record<string, any> = {};

    if (input.entityType === 'agency') {
      const agency = agencies.find((a) => a.agencyId === input.entityId);
      if (!agency) throw new NotFoundException(`Agency #${input.entityId} not found.`);
      currentValues = { ...agency };
    } else if (input.entityType === 'guide') {
      const guide = guides.find((g) => g.guideId === input.entityId);
      if (!guide) throw new NotFoundException(`Guide #${input.entityId} not found.`);
      currentValues = { ...guide };

      if (input.type === 'GUIDE_DEACTIVATION') {
        const activeTrips = trips.filter(
          (t) => t.guideId === input.entityId && ['Planning', 'Pending', 'Confirmed', 'Active'].includes(t.status),
        );
        const activeBookings = bookings.filter(
          (b) => b.guideId === input.entityId && ['HELD', 'PAID', 'CONFIRMED'].includes(String(b.status).toUpperCase()),
        );
        impactAnalysis = {
          activeTripsCount: activeTrips.length,
          activeTripIds: activeTrips.map((t) => t.tripId),
          activeBookingsCount: activeBookings.length,
          activeBookingIds: activeBookings.map((b) => b.bookingId),
          hasPendingObligations: activeTrips.length > 0 || activeBookings.length > 0,
        };
      }
    }

    const pendingDuplicate = approvalRequests.find(
      (r) =>
        r.entityType === input.entityType &&
        r.entityId === input.entityId &&
        r.type === input.type &&
        r.status === 'PENDING',
    );
    if (pendingDuplicate) {
      throw new ConflictException(`An active pending approval request (#${pendingDuplicate.id}) already exists for this ${input.entityType}.`);
    }

    const newRequest: ApprovalRequest = {
      id: approvalRequests.length + 1,
      type: input.type,
      requesterId: input.requesterId,
      requesterName: input.requesterName,
      requesterRole: input.requesterRole,
      entityType: input.entityType,
      entityId: input.entityId,
      currentValues,
      proposedValues: input.proposedValues,
      reason: input.reason,
      effectiveDate: input.effectiveDate,
      impactAnalysis: Object.keys(impactAnalysis).length ? impactAnalysis : undefined,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };

    approvalRequests.push(newRequest);

    // Notify Super Admin
    if (this.notificationsService) {
      this.notificationsService.createNotification(
        1, // Superuser account
        `Approval Request Submitted: ${input.type}`,
        `Admin ${input.requesterName} submitted a ${input.type} request for ${input.entityType} #${input.entityId}. Reason: "${input.reason}".`,
        { role: 'superuser', type: 'approval_request', metadata: { requestId: newRequest.id } },
      ).catch(() => {});
    }

    return newRequest;
  }

  processDecision(id: number, input: ReviewDecisionInput): ApprovalRequest {
    const req = this.findOne(id);
    if (req.status !== 'PENDING') {
      throw new BadRequestException(`Approval request #${id} is already in '${req.status}' state and cannot be reviewed again.`);
    }

    if (input.reviewer.role !== 'superuser' && input.reviewer.role !== 'superadmin') {
      throw new ForbiddenException('Only Super Admin can approve or reject administrative governance requests.');
    }

    if (req.requesterId === input.reviewer.userId && input.reviewer.role !== 'superuser') {
      throw new ForbiddenException('Self-approval is strictly prohibited. Independent authorization is required.');
    }

    const decisionTimestamp = new Date().toISOString();
    req.reviewerId = input.reviewer.userId;
    req.reviewerName = input.reviewer.name || 'Super Admin';
    req.reviewComment = input.reason || (input.decision === 'APPROVE' ? 'Approved by Super Admin' : 'Rejected by Super Admin');
    req.reviewedAt = decisionTimestamp;

    if (input.decision === 'REJECT') {
      req.status = 'REJECTED';
      // Notify Admin
      if (this.notificationsService) {
        this.notificationsService.createNotification(
          req.requesterId,
          `Approval Request #${req.id} Rejected`,
          `Super Admin rejected your ${req.type} request for ${req.entityType} #${req.entityId}. Reason: "${req.reviewComment}".`,
          { role: 'admin', type: 'approval_decision', metadata: { requestId: req.id, status: 'REJECTED' } },
        ).catch(() => {});
      }
      return req;
    }

    // Execution path for APPROVE
    req.status = 'APPROVED';
    req.executedAt = decisionTimestamp;

    if (req.entityType === 'agency') {
      const agency = agencies.find((a) => a.agencyId === req.entityId);
      if (!agency) throw new NotFoundException(`Agency #${req.entityId} not found.`);

      if (req.type === 'AGENCY_STATUS_COMMISSION') {
        const rawStatus = req.proposedValues.status;
        if (rawStatus !== undefined) {
          const s = String(rawStatus).toLowerCase();
          if (s === 'approved' || s === 'pending' || s === 'rejected' || s === 'suspended') {
            agency.status = s;
          } else {
            throw new BadRequestException(`Invalid agency status value: '${rawStatus}'.`);
          }
        }
        if (req.proposedValues.commissionRate !== undefined) {
          agency.commissionRate = Number(req.proposedValues.commissionRate);
        }
        if (req.proposedValues.statusReason !== undefined) {
          agency.statusReason = String(req.proposedValues.statusReason);
        }
        agency.approvedAt = decisionTimestamp;
        agency.approvedBy = input.reviewer.userId;
      } else if (req.type === 'AGENCY_CHANGE') {
        // Apply strictly proposed values
        const allowedAgencyKeys: (keyof Agency)[] = [
          'businessName', 'contactPerson', 'contactEmail', 'contactPhone',
          'licenseGstin', 'officeAddress', 'payoutBankUpi',
        ];
        for (const k of allowedAgencyKeys) {
          if (req.proposedValues[k] !== undefined) {
            (agency as any)[k] = req.proposedValues[k];
          }
        }
        agency.approvedAt = decisionTimestamp;
        agency.approvedBy = input.reviewer.userId;
      }

      // Notify affected agency
      if (this.notificationsService) {
        this.notificationsService.createNotification(
          agency.agencyId,
          'Agency Details Updated by Platform Governance',
          `Your agency configuration was updated following authorized administrative review.`,
          { role: 'agency', type: 'agency_updated', metadata: { agencyId: agency.agencyId } },
        ).catch(() => {});
      }
    } else if (req.entityType === 'guide') {
      const guide = guides.find((g) => g.guideId === req.entityId);
      if (!guide) throw new NotFoundException(`Guide #${req.entityId} not found.`);

      if (req.type === 'GUIDE_DEACTIVATION') {
        guide.status = 'DEACTIVATED';
        guide.deactivatedAt = decisionTimestamp;
        guide.deactivationReason = req.reason;
      } else if (req.type === 'GUIDE_CHANGE') {
        const allowedGuideKeys: (keyof Guide)[] = [
          'name', 'email', 'contact', 'bio', 'languages', 'specialties',
          'pricePerTrip', 'experience', 'adminSetRateMinor', 'verifiedExperienceYears',
        ];
        for (const k of allowedGuideKeys) {
          if (req.proposedValues[k] !== undefined) {
            (guide as any)[k] = req.proposedValues[k];
          }
        }
      }

      // Notify affected guide
      if (this.notificationsService) {
        this.notificationsService.createNotification(
          guide.guideId,
          'Guide Profile Updated by Platform Governance',
          `Your guide profile was updated following authorized administrative review.`,
          { role: 'guide', type: 'guide_updated', metadata: { guideId: guide.guideId } },
        ).catch(() => {});
      }
    }

    // Record audit log
    systemAuditLogs.push({
      id: systemAuditLogs.length + 1,
      text: `Approved ${req.type} for ${req.entityType} #${req.entityId}`,
      author: input.reviewer.name || 'Super Admin',
      time: 'Just now',
      category: 'users',
      who: input.reviewer.name || 'Super Admin',
      what: `APPROVE_${req.type}`,
      before: req.currentValues,
      after: req.proposedValues,
      timestamp: decisionTimestamp,
    });

    // Notify requesting Admin
    if (this.notificationsService) {
      this.notificationsService.createNotification(
        req.requesterId,
        `Approval Request #${req.id} Approved`,
        `Super Admin approved your ${req.type} request for ${req.entityType} #${req.entityId}. Changes have been applied.`,
        { role: 'admin', type: 'approval_decision', metadata: { requestId: req.id, status: 'APPROVED' } },
      ).catch(() => {});
    }

    return req;
  }
}
