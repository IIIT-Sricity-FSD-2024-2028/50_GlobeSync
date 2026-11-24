import { Injectable, NestMiddleware } from '@nestjs/common';
import { Response, NextFunction } from 'express';
import { LogFileService } from '../services/log-file.service';
import { PinoLoggerService } from '../logger/pino-logger.service';
import { CorrelatedRequest } from './correlation-id.middleware';

/**
 * LoggerMiddleware — NestJS router-level middleware for structured HTTP access logging.
 *
 * Emits:
 *   - Structured JSON via PinoLoggerService
 *   - File log entry via LogFileService.appendAccessLog()
 *   - Correlation ID tracking
 */
@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  constructor(
    private readonly logFileService: LogFileService,
    private readonly pinoLogger: PinoLoggerService,
  ) {}

  use(req: CorrelatedRequest, res: Response, next: NextFunction): void {
    const startTime = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const timestamp = new Date().toISOString();
      const role = (req.headers['x-user-role'] as string) || (req as any).user?.role || '-';
      const userId = (req.headers['x-user-id'] as string) || (req as any).user?.id || '-';
      const correlationId = req.correlationId || (req.headers['x-correlation-id'] as string) || '-';

      // 1. Structured Pino log
      this.pinoLogger.logHttpRequest({
        method: req.method,
        url: req.originalUrl || req.url,
        statusCode: res.statusCode,
        durationMs: duration,
        correlationId,
        ip: req.ip || req.socket.remoteAddress,
        role,
        userId: String(userId),
      });

      // 2. Buffer for interval-based disk persistence (legacy log format compatibility)
      const line =
        `[${timestamp}] [corr:${correlationId}] ${req.method} ${req.originalUrl || req.url} ` +
        `${res.statusCode} ${duration}ms role=${role} user=${userId}`;
      this.logFileService.appendAccessLog(line);
    });

    next();
  }
}
