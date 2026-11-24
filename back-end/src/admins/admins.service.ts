import { Injectable, NotFoundException } from '@nestjs/common';
import { admins, Admin, guides, Guide } from '../data';
import { systemAuditLogs, SystemAuditLog } from '../data/system-config.data';
import { UpdateAdminDto, VerifyGuideDto, AuditLogFilterDto } from './dto';
import { PaginatedResult } from '../common/dto/pagination-query.dto';
import { paginateCollection } from '../common/utils/pagination.util';

/** Public safe shape — password is always stripped before returning. */
export type AdminProfile = Omit<Admin, 'password'>;

@Injectable()
export class AdminsService {
  /**
   * Strip password from an Admin record before returning it to callers.
   */
  private sanitize(admin: Admin): AdminProfile {
    const { password: _omitted, ...safe } = admin;
    return safe;
  }

  findOne(id: number): AdminProfile {
    const admin = admins.find((a) => a.adminId === id);
    if (!admin) {
      throw new NotFoundException(`Admin with ID ${id} not found`);
    }
    return this.sanitize(admin);
  }

  update(id: number, dto: UpdateAdminDto): AdminProfile {
    const index = admins.findIndex((a) => a.adminId === id);
    if (index === -1) {
      throw new NotFoundException(`Admin with ID ${id} not found`);
    }

    const existing = admins[index];
    const updated: Admin = {
      ...existing,
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.email !== undefined && { email: dto.email }),
    };

    admins[index] = updated;
    return this.sanitize(updated);
  }

  /**
   * Set guide rate and verify credentials with uploaded proof.
   * Creates an append-only audit log entry.
   */
  verifyGuide(
    guideId: number,
    dto: VerifyGuideDto,
    adminId: number,
    adminName = 'Administrator',
  ): Omit<Guide, 'password'> {
    const index = guides.findIndex((g) => g.guideId === guideId);
    if (index === -1) {
      throw new NotFoundException(`Guide with ID ${guideId} not found`);
    }

    const current = guides[index];
    const rateInRupees = Math.round(dto.adminSetRateMinor / 100);

    const updated: Guide = {
      ...current,
      adminSetRateMinor: dto.adminSetRateMinor,
      pricePerTrip: rateInRupees,
      verifiedExperienceYears: dto.verifiedExperienceYears,
      experience: dto.verifiedExperienceYears,
      proofUrl: dto.proofUrl,
      verificationNotes: dto.verificationNotes,
      verificationStatus: 'VERIFIED',
      verifiedBy: adminId,
      verifiedAt: new Date().toISOString(),
    };
    guides[index] = updated;

    // Record in system audit logs
    const maxAuditId = systemAuditLogs.length > 0 ? Math.max(...systemAuditLogs.map((l) => l.id)) : 0;
    const auditEntry: SystemAuditLog = {
      id: maxAuditId + 1,
      text: `Verified credentials for Guide #${guideId} (${updated.name}) — Rate: ₹${rateInRupees.toLocaleString('en-IN')}, Experience: ${dto.verifiedExperienceYears} yrs, Proof: ${dto.proofUrl}`,
      author: adminName,
      time: 'Just now',
      color: '#10b981',
      category: 'users',
      timestamp: new Date().toISOString(),
    };
    systemAuditLogs.unshift(auditEntry);

    const { password: _, ...safeGuide } = updated;
    return safeGuide;
  }

  /**
   * View audit logs with filters (category, author, date range, search) and pagination/sorting.
   */
  getAuditLogs(): SystemAuditLog[];
  getAuditLogs(query: AuditLogFilterDto): SystemAuditLog[] | PaginatedResult<SystemAuditLog>;
  getAuditLogs(query?: AuditLogFilterDto): any {
    let logs = [...systemAuditLogs];

    if (query?.category && query.category.trim()) {
      const cat = query.category.trim().toLowerCase();
      logs = logs.filter((l) => l.category?.toLowerCase() === cat);
    }

    if (query?.author && query.author.trim()) {
      const auth = query.author.trim().toLowerCase();
      logs = logs.filter((l) => l.author?.toLowerCase().includes(auth));
    }

    if (query?.startDate) {
      const start = new Date(query.startDate).getTime();
      logs = logs.filter((l) => {
        const time = new Date(l.timestamp || 0).getTime();
        return time >= start;
      });
    }

    if (query?.endDate) {
      const end = new Date(query.endDate).getTime();
      logs = logs.filter((l) => {
        const time = new Date(l.timestamp || 0).getTime();
        return time <= end;
      });
    }

    return paginateCollection(logs, query, ['text', 'author', 'category']);
  }
}
