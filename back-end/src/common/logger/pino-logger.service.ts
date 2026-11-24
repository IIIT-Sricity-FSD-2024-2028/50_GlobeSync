import { Injectable, LoggerService } from '@nestjs/common';
import pino, { Logger } from 'pino';

/**
 * PinoLoggerService
 *
 * Implements standard NestJS LoggerService backed by high-performance Pino.
 * Generates structured JSON log streams for modern observability platforms
 * (Datadog, CloudWatch, Loki, Elasticsearch).
 */
@Injectable()
export class PinoLoggerService implements LoggerService {
  private readonly pino: Logger;

  constructor() {
    this.pino = pino({
      level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
      timestamp: pino.stdTimeFunctions.isoTime,
      formatters: {
        level: (label) => ({ level: label }),
      },
      base: {
        service: 'globesync-backend',
        env: process.env.NODE_ENV || 'development',
      },
    });
  }

  log(message: any, context?: string, meta?: Record<string, any>) {
    this.pino.info({ context, ...meta }, typeof message === 'string' ? message : JSON.stringify(message));
  }

  error(message: any, trace?: string, context?: string, meta?: Record<string, any>) {
    this.pino.error({ context, trace, ...meta }, typeof message === 'string' ? message : JSON.stringify(message));
  }

  warn(message: any, context?: string, meta?: Record<string, any>) {
    this.pino.warn({ context, ...meta }, typeof message === 'string' ? message : JSON.stringify(message));
  }

  debug?(message: any, context?: string, meta?: Record<string, any>) {
    this.pino.debug({ context, ...meta }, typeof message === 'string' ? message : JSON.stringify(message));
  }

  verbose?(message: any, context?: string, meta?: Record<string, any>) {
    this.pino.trace({ context, ...meta }, typeof message === 'string' ? message : JSON.stringify(message));
  }

  /**
   * Log an incoming HTTP request/response event with correlation ID and latency.
   */
  logHttpRequest(data: {
    method: string;
    url: string;
    statusCode: number;
    durationMs: number;
    correlationId?: string;
    ip?: string;
    role?: string;
    userId?: string;
  }) {
    const level = data.statusCode >= 500 ? 'error' : data.statusCode >= 400 ? 'warn' : 'info';
    this.pino[level]({
      type: 'http_request',
      ...data,
    }, `${data.method} ${data.url} ${data.statusCode} in ${data.durationMs}ms`);
  }
}
