import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { systemAuditLogs, SystemAuditLog } from '../../data/system-config.data';
import { PinoLoggerService } from '../logger/pino-logger.service';
import { CorrelatedRequest } from '../middleware/correlation-id.middleware';

/**
 * AuditLogInterceptor
 *
 * Immutably records audit logs for every state-changing action (POST, PUT, PATCH, DELETE)
 * executed by ADMIN, SUPERUSER, or SUPPORT personnel.
 * Records:
 * - who (user ID, name, email, role, IP)
 * - what (HTTP method, endpoint, action context)
 * - before (incoming mutation payload / prior state)
 * - after (resulting response state / mutation result)
 * - correlationId & UTC timestamp
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private readonly logger: PinoLoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest<CorrelatedRequest>();
    const method = req.method.toUpperCase();

    // Only audit state-changing operations
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle();
    }

    const user = (req as any).user;
    const role = (user?.role || req.headers['x-user-role'] || '').toString().toLowerCase();

    // Check if actor is an administrative / care specialist role
    const isStaffRole = ['admin', 'superuser', 'support'].includes(role);
    const isStaffRoute =
      req.url.startsWith('/admins') ||
      req.url.startsWith('/super') ||
      req.url.startsWith('/support-tickets') ||
      req.url.startsWith('/system-config');

    if (!isStaffRole && !isStaffRoute) {
      return next.handle();
    }

    const who = user?.name || user?.email || (user?.id ? `User #${user.id}` : 'Staff Member');
    const authorRole = role || 'staff';
    const what = `${method} ${req.originalUrl || req.url}`;
    const beforeState = req.body ? { ...req.body } : null;

    // Redact sensitive credentials if present in body
    if (beforeState && typeof beforeState === 'object') {
      if (beforeState.password) beforeState.password = '[REDACTED]';
      if (beforeState.secret) beforeState.secret = '[REDACTED]';
    }

    return next.handle().pipe(
      tap((afterState) => {
        try {
          const maxId =
            systemAuditLogs.length > 0 ? Math.max(...systemAuditLogs.map((l) => l.id)) : 0;

          // Determine category from URL
          let category: SystemAuditLog['category'] = 'users';
          if (req.url.includes('rules') || req.url.includes('config')) category = 'rules';
          else if (req.url.includes('payment') || req.url.includes('revenue')) category = 'payment';
          else if (req.url.includes('integration')) category = 'integration';

          const safeAfter =
            afterState && typeof afterState === 'object'
              ? { ...afterState }
              : afterState;
          if (safeAfter && typeof safeAfter === 'object' && safeAfter.password) {
            safeAfter.password = '[REDACTED]';
          }

          const auditEntry: SystemAuditLog = {
            id: maxId + 1,
            text: `[${authorRole.toUpperCase()}] ${who} performed ${what}`,
            author: `${who} (${authorRole})`,
            time: 'Just now',
            color: authorRole === 'superuser' ? '#8b5cf6' : authorRole === 'admin' ? '#3b82f6' : '#10b981',
            category,
            timestamp: new Date().toISOString(),
            who: `${who} (${authorRole})`,
            what,
            before: beforeState,
            after: safeAfter,
            ip: req.ip || req.socket.remoteAddress || '127.0.0.1',
            correlationId: req.correlationId || 'unknown',
          };

          // Append-only audit store
          systemAuditLogs.unshift(auditEntry);

          // Structured Pino logging of audit log event
          this.logger.log(
            `AUDIT LOG: [${authorRole.toUpperCase()}] ${who} executed ${what}`,
            'AuditLogInterceptor',
            {
              type: 'audit_log',
              who: auditEntry.who,
              what: auditEntry.what,
              category,
              ip: auditEntry.ip,
              correlationId: auditEntry.correlationId,
              timestamp: auditEntry.timestamp,
            },
          );
        } catch (err: any) {
          console.error('[AuditLogInterceptor] Error recording audit trail:', err);
        }
      }),
    );
  }
}
