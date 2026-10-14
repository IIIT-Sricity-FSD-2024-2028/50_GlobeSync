import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  platformRules,
  PlatformRules,
  paymentMethods,
  PaymentMethodConfig,
  systemIntegrations,
  SystemIntegration,
  systemAuditLogs,
  SystemAuditLog,
  admins,
  Admin,
  supportUsers,
  SupportUser,
} from '../data';
import {
  UpdateRulesDto,
  UpdatePaymentMethodDto,
  UpdateIntegrationDto,
  CreateSystemAdminDto,
  CreateSystemSupportDto,
} from './dto';

@Injectable()
export class SystemConfigService {
  /**
   * Return platform-wide operational rules and thresholds.
   */
  getRules(): PlatformRules {
    return { ...platformRules };
  }

  /**
   * Update platform rules with validation and audit logging.
   */
  updateRules(dto: UpdateRulesDto, authorName = 'Super User'): PlatformRules {
    if (dto.autoConfirm !== undefined) platformRules.autoConfirm = dto.autoConfirm;
    if (dto.allowCancel !== undefined) platformRules.allowCancel = dto.allowCancel;
    if (dto.bookingLimit !== undefined) platformRules.bookingLimit = dto.bookingLimit;
    if (dto.cancelCutoffHours !== undefined) platformRules.cancelCutoffHours = dto.cancelCutoffHours;
    if (dto.refundDeductionPct !== undefined) platformRules.refundDeductionPct = dto.refundDeductionPct;
    if (dto.stripeGateway !== undefined) platformRules.stripeGateway = dto.stripeGateway;
    if (dto.paypalGateway !== undefined) platformRules.paypalGateway = dto.paypalGateway;
    if (dto.razorpayGateway !== undefined) platformRules.razorpayGateway = dto.razorpayGateway;
    if (dto.emailNotifications !== undefined) platformRules.emailNotifications = dto.emailNotifications;
    if (dto.smsAlerts !== undefined) platformRules.smsAlerts = dto.smsAlerts;

    const logText = `Rules configuration updated — Limit set to ₹${platformRules.bookingLimit.toLocaleString('en-IN')}, cutoff ${platformRules.cancelCutoffHours}h, refund fee ${platformRules.refundDeductionPct}%`;
    this.addAuditLog(logText, authorName, '#10b981', 'rules');

    return { ...platformRules };
  }

  /**
   * Return all payment instruments and gateway connectors.
   */
  getPaymentMethods(): PaymentMethodConfig[] {
    return [...paymentMethods];
  }

  /**
   * Update payment method configuration or toggle availability.
   * Enforces that at least one platform native channel remains active.
   */
  updatePaymentMethod(
    id: string,
    dto: UpdatePaymentMethodDto,
    authorName = 'Super User',
  ): PaymentMethodConfig {
    const idx = paymentMethods.findIndex((m) => m.id === id);
    if (idx === -1) {
      throw new NotFoundException(`Payment method with ID '${id}' not found`);
    }

    const current = paymentMethods[idx];

    // Enforce at least one active platform native method
    if (current.type === 'platform' && dto.status === 'Inactive' && current.status === 'Active') {
      const activePlatformCount = paymentMethods.filter(
        (m) => m.type === 'platform' && m.id !== id && m.status === 'Active',
      ).length;

      if (activePlatformCount === 0) {
        throw new BadRequestException(
          'Action blocked: Disabling this method leaves no active payment channel. Enable another method first.',
        );
      }
    }

    const updated: PaymentMethodConfig = {
      ...current,
      ...(dto.displayName !== undefined && { displayName: dto.displayName.trim() }),
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.maskedKey !== undefined && { maskedKey: dto.maskedKey ? dto.maskedKey.trim() : null }),
    };

    paymentMethods[idx] = updated;

    const statusNote = dto.status ? ` (Status: ${dto.status})` : '';
    const logText = `${updated.displayName} configuration updated${statusNote}`;
    this.addAuditLog(logText, authorName, '#6366f1', 'payment');

    return updated;
  }

  /**
   * Check if a given payment method key ('Card', 'UPI', 'Cash', etc.) is currently active.
   */
  isPaymentMethodActive(methodKey: string): boolean {
    const found = paymentMethods.find(
      (m) => m.methodKey.toLowerCase() === methodKey.toLowerCase(),
    );
    return found ? found.status === 'Active' : false;
  }

  /**
   * Return third-party integration connectors and health states.
   */
  getIntegrations(): SystemIntegration[] {
    return [...systemIntegrations];
  }

  /**
   * Update integration connector status or environment.
   */
  updateIntegration(
    id: number,
    dto: UpdateIntegrationDto,
    authorName = 'Super User',
  ): SystemIntegration {
    const idx = systemIntegrations.findIndex((a) => a.id === id);
    if (idx === -1) {
      throw new NotFoundException(`Integration service with ID ${id} not found`);
    }

    const current = systemIntegrations[idx];
    const updated: SystemIntegration = {
      ...current,
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.env !== undefined && { env: dto.env.trim() }),
      ...(dto.desc !== undefined && { desc: dto.desc.trim() }),
    };

    systemIntegrations[idx] = updated;

    const logText = `${updated.name} integration status switched to ${updated.status}`;
    this.addAuditLog(logText, authorName, '#f59e0b', 'integration');

    return updated;
  }

  /**
   * Return all system audit trail records.
   */
  getAuditLogs(): SystemAuditLog[] {
    return [...systemAuditLogs].sort((a, b) => b.id - a.id);
  }

  /**
   * Internal helper to record an in-memory audit log entry.
   */
  private addAuditLog(
    text: string,
    author: string,
    color = '#6366f1',
    category: SystemAuditLog['category'] = 'rules',
  ): SystemAuditLog {
    const maxId = systemAuditLogs.length > 0 ? Math.max(...systemAuditLogs.map((l) => l.id)) : 0;
    const entry: SystemAuditLog = {
      id: maxId + 1,
      text,
      author,
      time: 'Just now',
      color,
      category,
      timestamp: new Date().toISOString(),
    };
    systemAuditLogs.unshift(entry);
    return entry;
  }

  // =========================================================================
  // Superuser Administration & Role Management
  // =========================================================================

  /**
   * Return all administrators without exposing password hashes.
   */
  getAdmins(): Omit<Admin, 'password'>[] {
    return admins.map(({ password: _, ...a }) => a);
  }

  /**
   * Provision a new administrator or superuser account.
   */
  createAdmin(
    dto: CreateSystemAdminDto,
    authorName = 'Super User',
  ): Omit<Admin, 'password'> {
    const emailNorm = dto.email.trim().toLowerCase();
    const exists = admins.some((a) => a.email.toLowerCase() === emailNorm);
    if (exists) {
      throw new BadRequestException(
        `An administrator with email '${dto.email}' already exists.`,
      );
    }

    const maxId = admins.length > 0 ? Math.max(...admins.map((a) => a.adminId)) : 0;
    const newAdmin: Admin = {
      adminId: maxId + 1,
      name: dto.name.trim(),
      email: emailNorm,
      password: dto.password,
      role: dto.role,
    };
    admins.push(newAdmin);

    this.addAuditLog(
      `Administrator account created for ${newAdmin.name} (${newAdmin.role})`,
      authorName,
      '#10b981',
      'users',
    );

    const { password: _, ...safeAdmin } = newAdmin;
    return safeAdmin;
  }

  /**
   * Remove an administrator account. Prevents self-deletion and last superuser deletion.
   */
  deleteAdmin(
    id: number,
    requesterId: number,
    authorName = 'Super User',
  ): { message: string } {
    const idx = admins.findIndex((a) => a.adminId === id);
    if (idx === -1) {
      throw new NotFoundException(`Administrator with ID ${id} not found`);
    }

    const target = admins[idx];

    // Prevent deleting self
    if (target.adminId === requesterId) {
      throw new BadRequestException(
        'Action blocked: Cannot delete your own active administrator account.',
      );
    }

    // Prevent deleting the last remaining superuser
    if (target.role === 'superuser') {
      const remainingSuperusers = admins.filter(
        (a) => a.role === 'superuser' && a.adminId !== id,
      );
      if (remainingSuperusers.length === 0) {
        throw new BadRequestException(
          'Action blocked: Cannot delete the only remaining superuser account.',
        );
      }
    }

    admins.splice(idx, 1);

    this.addAuditLog(
      `Administrator account '${target.name}' (${target.role}) removed`,
      authorName,
      '#ef4444',
      'users',
    );

    return { message: `Administrator '${target.name}' deleted successfully` };
  }

  /**
   * Return all support staff accounts without exposing passwords.
   */
  getSupportUsers(): Omit<SupportUser, 'password'>[] {
    return supportUsers.map(({ password: _, ...s }) => s);
  }

  /**
   * Provision a new customer support user account.
   */
  createSupportUser(
    dto: CreateSystemSupportDto,
    authorName = 'Super User',
  ): Omit<SupportUser, 'password'> {
    const emailNorm = dto.email.trim().toLowerCase();
    const exists = supportUsers.some((s) => s.email.toLowerCase() === emailNorm);
    if (exists) {
      throw new BadRequestException(
        `A support user with email '${dto.email}' already exists.`,
      );
    }

    const maxId = supportUsers.length > 0 ? Math.max(...supportUsers.map((s) => s.careId)) : 0;
    const newSupport: SupportUser = {
      careId: maxId + 1,
      name: dto.name.trim(),
      contact: dto.contact.trim(),
      email: emailNorm,
      password: dto.password,
      role: 'support',
    };
    supportUsers.push(newSupport);

    this.addAuditLog(
      `Customer support staff account created for ${newSupport.name}`,
      authorName,
      '#10b981',
      'users',
    );

    const { password: _, ...safeSupport } = newSupport;
    return safeSupport;
  }

  /**
   * Remove a customer support user account.
   */
  deleteSupportUser(id: number, authorName = 'Super User'): { message: string } {
    const idx = supportUsers.findIndex((s) => s.careId === id);
    if (idx === -1) {
      throw new NotFoundException(`Support user with ID ${id} not found`);
    }

    const target = supportUsers[idx];
    supportUsers.splice(idx, 1);

    this.addAuditLog(
      `Customer support account '${target.name}' removed`,
      authorName,
      '#ef4444',
      'users',
    );

    return { message: `Support user '${target.name}' deleted successfully` };
  }
}
