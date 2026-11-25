import { syncAuthAccount, hashLegacyPassword } from '../auth/identity.util';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Optional,
} from '@nestjs/common';
import { agencies, Agency } from '../data';
import { testDb } from '../database/test-database';
import { CreateAgencyDto, UpdateAgencyDto, UpdateAgencyStatusDto, CreateDirectAgencyDto, AgencyResponseDto, AgencyLookupDto } from './dto';
import { RealtimeService } from '../realtime/realtime.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PaginationQueryDto, PaginatedResult } from '../common/dto/pagination-query.dto';
import { paginateCollection } from '../common/utils/pagination.util';
import { systemAuditLogs, SystemAuditLog } from '../data/system-config.data';

@Injectable()
export class AgenciesService {
  constructor(
    @Optional() private readonly realtimeService?: RealtimeService,
    @Optional() private readonly notificationsService?: NotificationsService,
  ) {}

  private sanitize(agency: Agency): AgencyResponseDto {
    const { password: _, ...safe } = agency;
    return safe;
  }

  findAll(): AgencyResponseDto[];
  findAll(query: PaginationQueryDto): AgencyResponseDto[] | PaginatedResult<AgencyResponseDto>;
  findAll(query?: PaginationQueryDto): any {
    const safeAgencies = agencies.map((a) => this.sanitize(a));
    return paginateCollection(safeAgencies, query, ['businessName', 'contactEmail', 'contactPerson', 'licenseGstin']);
  }

  findAllLookup(): AgencyLookupDto[] {
    return agencies.map((a) => ({
      agencyId: a.agencyId,
      businessName: a.businessName,
      status: a.status,
    }));
  }

  findOne(id: number): AgencyResponseDto {
    const agency = agencies.find((a) => a.agencyId === id);
    if (!agency) {
      throw new NotFoundException(`Agency with ID ${id} not found`);
    }
    return this.sanitize(agency);
  }

  create(dto: CreateAgencyDto): AgencyResponseDto {
    if (agencies.some(a => a.contactEmail.toLowerCase() === dto.contactEmail.toLowerCase())) {
      throw new BadRequestException('Email already registered');
    }

    const maxId = agencies.length > 0 ? Math.max(...agencies.map((a) => a.agencyId)) : 0;
    const newAgency: Agency = {
      agencyId: maxId + 1,
      businessName: dto.businessName,
      contactPerson: dto.contactPerson,
      contactEmail: dto.contactEmail,
      contactPhone: dto.contactPhone,
      licenseGstin: dto.licenseGstin,
      officeAddress: dto.officeAddress,
      payoutBankUpi: dto.payoutBankUpi,
      password: hashLegacyPassword(dto.password) || dto.password,
      status: 'pending',
      role: 'agency',
      createdAt: new Date().toISOString(),
    };

    agencies.push(newAgency);
    this.syncAgencyToTestDb(newAgency);
    if (this.notificationsService) {
      this.notificationsService.createNotification(
        1,
        `New Agency Application: ${newAgency.businessName}`,
        `Agency #${newAgency.agencyId} (${newAgency.businessName}) submitted registration and is Pending Verification.`,
        { role: 'admin', type: 'agency_application', metadata: { agencyId: newAgency.agencyId } },
      ).catch(() => {});
    }
    return this.sanitize(newAgency);
  }

  createDirect(dto: CreateDirectAgencyDto): AgencyResponseDto {
    if (agencies.some(a => a.contactEmail.toLowerCase() === dto.contactEmail.toLowerCase())) {
      throw new BadRequestException('Email already registered');
    }

    const maxId = agencies.length > 0 ? Math.max(...agencies.map((a) => a.agencyId)) : 0;
    const newAgency: Agency = {
      agencyId: maxId + 1,
      businessName: dto.businessName,
      contactPerson: dto.contactPerson,
      contactEmail: dto.contactEmail,
      contactPhone: dto.contactPhone,
      licenseGstin: dto.licenseGstin,
      officeAddress: dto.officeAddress,
      payoutBankUpi: dto.payoutBankUpi,
      password: hashLegacyPassword(dto.password) || dto.password,
      status: (dto.status as 'pending' | 'approved' | 'rejected') || 'pending',
      commissionRate: dto.commissionRate,
      role: 'agency',
      createdAt: new Date().toISOString(),
    };

    agencies.push(newAgency);
    this.syncAgencyToTestDb(newAgency);
    return this.sanitize(newAgency);
  }

  private syncAgencyToTestDb(agency: Agency): void {
    const emailLower = agency.contactEmail.toLowerCase();
    let authUser = testDb.users.find(
      (u) => u.email.toLowerCase() === emailLower && u.role === 'AGENCY',
    );
    if (!authUser) {
      const nextUid = testDb.users.reduce((m, u) => Math.max(m, u.id || 0), 0) + 1;
      authUser = {
        id: nextUid,
        email: agency.contactEmail,
        password_hash: agency.password || '',
        role: 'AGENCY',
        name: agency.businessName,
        phone: agency.contactPhone,
        status: agency.status === 'suspended' ? ('SUSPENDED' as any) : ('ACTIVE' as any),
        created_at: new Date(),
        updated_at: new Date(),
      };
      testDb.users.push(authUser);
    } else {
      authUser.status = agency.status === 'suspended' ? ('SUSPENDED' as any) : ('ACTIVE' as any);
      if (agency.password) authUser.password_hash = agency.password;
      authUser.name = agency.businessName;
    }

    const mappedStatus = (
      agency.status === 'approved' ? 'APPROVED' : agency.status === 'rejected' ? 'REJECTED' : 'PENDING'
    ) as any;
    let profile = testDb.agencyProfiles.find((p) => p.user_id === authUser!.id);
    if (!profile) {
      const nextPid = testDb.agencyProfiles.reduce((m, p) => Math.max(m, p.id || 0), 0) + 1;
      profile = {
        id: nextPid,
        user_id: authUser.id,
        business_name: agency.businessName,
        tax_id: agency.licenseGstin || 'PENDING-KYC',
        approval_status: mappedStatus,
        ...(agency.status === 'approved' && { approved_at: new Date() }),
      };
      testDb.agencyProfiles.push(profile);
    } else {
      profile.business_name = agency.businessName;
      profile.approval_status = mappedStatus;
      if (agency.status === 'approved') profile.approved_at = new Date();
    }
  }

  update(id: number, dto: UpdateAgencyDto): AgencyResponseDto {
    const idx = agencies.findIndex((a) => a.agencyId === id);
    if (idx === -1) {
      throw new NotFoundException(`Agency with ID ${id} not found`);
    }

    if (dto.contactEmail && dto.contactEmail.toLowerCase() !== agencies[idx].contactEmail.toLowerCase()) {
      if (agencies.some(a => a.contactEmail.toLowerCase() === dto.contactEmail.toLowerCase())) {
        throw new BadRequestException('Email already registered');
      }
    }

    const updated: Agency = {
      ...agencies[idx],
      ...(dto.businessName !== undefined && { businessName: dto.businessName }),
      ...(dto.contactPerson !== undefined && { contactPerson: dto.contactPerson }),
      ...(dto.contactEmail !== undefined && { contactEmail: dto.contactEmail }),
      ...(dto.contactPhone !== undefined && { contactPhone: dto.contactPhone }),
      ...(dto.licenseGstin !== undefined && { licenseGstin: dto.licenseGstin }),
      ...(dto.officeAddress !== undefined && { officeAddress: dto.officeAddress }),
      ...(dto.payoutBankUpi !== undefined && { payoutBankUpi: dto.payoutBankUpi }),
      ...(dto.password !== undefined && { password: dto.password }),
    };
    syncAuthAccount(agencies[idx].contactEmail, { email: dto.contactEmail, password: dto.password });
    agencies[idx] = updated;
    return this.sanitize(updated);
  }

  /**
   * Update agency status (approve/reject/suspend).
   * Records decision reason and writes an append-only audit log entry.
   * Dispatches Super Admin notification (Category B Governance).
   */
  updateStatus(id: number, dto: UpdateAgencyStatusDto, adminAuthor = 'Admin'): AgencyResponseDto {
    const idx = agencies.findIndex((a) => a.agencyId === id);
    if (idx === -1) {
      throw new NotFoundException(`Agency with ID ${id} not found`);
    }

    const existing = agencies[idx];
    if (
      existing.status === 'approved' &&
      dto.status === 'approved' &&
      (dto.commissionRate === undefined || dto.commissionRate === existing.commissionRate)
    ) {
      throw new ConflictException(`Agency #${id} (${existing.businessName}) is already approved.`);
    }

    if (existing.status === 'pending' && dto.status === 'suspended') {
      throw new BadRequestException('Pending verification applications cannot be suspended; approve or reject the application instead.');
    }

    if ((dto.status === 'rejected' || dto.status === 'suspended') && !dto.reason?.trim()) {
      throw new BadRequestException(`A mandatory decision reason is required when marking an agency as ${dto.status}.`);
    }

    if (dto.status === 'approved') {
      if (!existing.businessName?.trim() || !existing.contactEmail?.trim()) {
        throw new BadRequestException('Agency application is missing mandatory business name or contact email.');
      }
    }

    const decisionReason = dto.reason?.trim() || `Administrative decision: status set to ${dto.status}`;
    const effectiveRate =
      dto.commissionRate !== undefined
        ? dto.commissionRate
        : dto.status === 'approved' && existing.commissionRate == null
          ? 1.5
          : existing.commissionRate;

    const updated: Agency = {
      ...existing,
      status: dto.status,
      ...(effectiveRate !== undefined && { commissionRate: effectiveRate }),
      statusReason: decisionReason,
      ...(dto.status === 'approved' && { approvedAt: new Date().toISOString() }),
      ...(dto.status === 'suspended' && { suspendedAt: new Date().toISOString(), suspensionReason: decisionReason }),
    };
    agencies[idx] = updated;
    this.syncAgencyToTestDb(updated);

    // Append to system audit trail
    const maxAuditId = systemAuditLogs.length > 0 ? Math.max(...systemAuditLogs.map((l) => l.id)) : 0;
    const auditEntry: SystemAuditLog = {
      id: maxAuditId + 1,
      text: `Agency #${id} (${updated.businessName}) status updated to ${dto.status}. Reason: ${decisionReason}`,
      author: adminAuthor,
      time: 'Just now',
      color: dto.status === 'approved' ? '#10b981' : dto.status === 'suspended' ? '#f59e0b' : '#ef4444',
      category: 'users',
      timestamp: new Date().toISOString(),
    };
    systemAuditLogs.unshift(auditEntry);

    // Super Admin notification (Category B Governance)
    if (this.notificationsService) {
      this.notificationsService.createNotification(
        1, // Super Admin
        `Agency Status Changed: ${updated.businessName}`,
        `Admin ${adminAuthor} updated status of Agency #${id} (${updated.businessName}) to "${dto.status}". Reason: "${decisionReason}".`,
        { role: 'superuser', type: 'agency_governance', metadata: { agencyId: id, status: dto.status } },
      ).catch(() => {});
    }

    // Realtime events & Notifications for agency actor
    if (this.realtimeService) {
      if (dto.status === 'approved') {
        this.realtimeService.emitToUser(id, 'agency.approved', { agencyId: id, status: 'approved' }, 'agency');
        this.realtimeService.emitToRole('agency', 'agency.approved', { agencyId: id, status: 'approved' });
      } else if (dto.status === 'rejected') {
        this.realtimeService.emitToUser(id, 'agency.rejected', { agencyId: id, status: 'rejected' }, 'agency');
      } else if (dto.status === 'suspended') {
        this.realtimeService.emitToUser(id, 'agency.suspended', { agencyId: id, status: 'suspended' }, 'agency');
      }
    }

    if (this.notificationsService) {
      if (dto.status === 'approved') {
        this.notificationsService.createNotification(
          id,
          'Agency Account Approved',
          `Congratulations! Your agency partner account has been approved. Reason: ${decisionReason}`,
          { role: 'agency', type: 'agency_status', metadata: { agencyId: id, status: 'approved' } },
        ).catch(() => {});
      } else if (dto.status === 'rejected') {
        this.notificationsService.createNotification(
          id,
          'Agency Account Rejected',
          `Your agency application was reviewed and declined. Reason: ${decisionReason}`,
          { role: 'agency', type: 'agency_status', metadata: { agencyId: id, status: 'rejected' } },
        ).catch(() => {});
      } else if (dto.status === 'suspended') {
        this.notificationsService.createNotification(
          id,
          'Agency Account Suspended',
          `Your agency account has been temporarily suspended by administration. Reason: ${decisionReason}`,
          { role: 'agency', type: 'agency_status', metadata: { agencyId: id, status: 'suspended' } },
        ).catch(() => {});
      }
    }

    return this.sanitize(updated);
  }

  remove(id: number): { message: string } {
    const idx = agencies.findIndex((a) => a.agencyId === id);
    if (idx === -1) {
      throw new NotFoundException(`Agency with ID ${id} not found`);
    }
    agencies.splice(idx, 1);
    return { message: `Agency with ID ${id} deleted successfully` };
  }
}
