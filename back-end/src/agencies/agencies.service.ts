import { syncAuthAccount } from '../auth/identity.util';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Optional,
} from '@nestjs/common';
import { agencies, Agency } from '../data';
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
      password: dto.password,
      status: 'pending',
      role: 'agency',
      createdAt: new Date().toISOString(),
    };

    agencies.push(newAgency);
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
      password: dto.password,
      status: (dto.status as 'pending' | 'approved' | 'rejected') || 'pending',
      commissionRate: dto.commissionRate,
      role: 'agency',
      createdAt: new Date().toISOString(),
    };

    agencies.push(newAgency);
    return this.sanitize(newAgency);
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
   * Update agency status (approve/reject).
   * Records decision reason and writes an append-only audit log entry.
   */
  updateStatus(id: number, dto: UpdateAgencyStatusDto, adminAuthor = 'Admin'): AgencyResponseDto {
    const idx = agencies.findIndex((a) => a.agencyId === id);
    if (idx === -1) {
      throw new NotFoundException(`Agency with ID ${id} not found`);
    }

    const decisionReason = dto.reason?.trim() || `Administrative decision: status set to ${dto.status}`;

    const updated: Agency = {
      ...agencies[idx],
      status: dto.status,
      ...(dto.commissionRate !== undefined && { commissionRate: dto.commissionRate }),
      statusReason: decisionReason,
    };
    agencies[idx] = updated;

    // Append to system audit trail
    const maxAuditId = systemAuditLogs.length > 0 ? Math.max(...systemAuditLogs.map((l) => l.id)) : 0;
    const auditEntry: SystemAuditLog = {
      id: maxAuditId + 1,
      text: `Agency #${id} (${updated.businessName}) status updated to ${dto.status}. Reason: ${decisionReason}`,
      author: adminAuthor,
      time: 'Just now',
      color: dto.status === 'approved' ? '#10b981' : '#ef4444',
      category: 'users',
      timestamp: new Date().toISOString(),
    };
    systemAuditLogs.unshift(auditEntry);

    // Realtime events & Notifications
    if (this.realtimeService) {
      if (dto.status === 'approved') {
        this.realtimeService.emitToUser(id, 'agency.approved', { agencyId: id, status: 'approved' }, 'agency');
        this.realtimeService.emitToRole('agency', 'agency.approved', { agencyId: id, status: 'approved' });
      } else if (dto.status === 'rejected') {
        this.realtimeService.emitToUser(id, 'agency.rejected', { agencyId: id, status: 'rejected' }, 'agency');
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
