import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { LogFileService } from '../services/log-file.service';

/**
 * LoggerMiddleware — NestJS router-level middleware for HTTP access logging.
 *
 * Captures every inbound request and, once the response is fully sent
 * (res 'finish' event), writes a structured log line to:
 *   - the terminal (console.log) for live visibility
 *   - LogFileService.appendAccessLog() for interval-based persistence to logs/access.log
 *
 * Log line format:
 *   [<ISO 8601 timestamp>] <METHOD> <url> <statusCode> <duration>ms role=<x-user-role|--> user=<x-user-id|-->
 *
 * next() is called immediately — logging is a non-blocking side effect.
 */
@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  constructor(private readonly logFileService: LogFileService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const timestamp = new Date().toISOString();
      const role = (req.headers['x-user-role'] as string) || '-';
      const userId = (req.headers['x-user-id'] as string) || '-';

      const line =
        `[${timestamp}] ${req.method} ${req.originalUrl} ` +
        `${res.statusCode} ${duration}ms ` +
        `role=${role} user=${userId}`;

      // Always log to terminal for immediate visibility during development.
      console.log(line);

      // Buffer for interval-based disk persistence (written every 10 s).
      this.logFileService.appendAccessLog(line);
    });

    // Call next immediately — do not block the request pipeline on logging.
    next();
  }
}
