import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Response } from 'express';
import { LogFileService } from '../services/log-file.service';
import { PinoLoggerService } from '../logger/pino-logger.service';
import { CorrelatedRequest } from '../middleware/correlation-id.middleware';

/**
 * GlobalExceptionFilter
 *
 * Provides consistent error response shape across all routes:
 *   {
 *     statusCode: number,
 *     error: string,
 *     message: string | string[],
 *     path: string,
 *     method: string,
 *     timestamp: string,
 *     correlationId: string
 *   }
 */
@Injectable()
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly logFileService: LogFileService,
    private readonly pinoLogger: PinoLoggerService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<CorrelatedRequest>();

    const correlationId =
      request.correlationId ||
      (request.headers['x-correlation-id'] as string) ||
      'unknown';

    // Ensure correlation ID is attached to outgoing response header
    response.setHeader('x-correlation-id', correlationId);

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        const statusText = HttpStatus[status];
        error = statusText
          ? statusText
              .split('_')
              .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
              .join(' ')
          : exception.message;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const res = exceptionResponse as Record<string, any>;
        message = res.message || exception.message;
        error = res.error || 'Error';
      }
    } else if (exception instanceof Error) {
      error = exception.name || 'Error';
      message = process.env.NODE_ENV === 'production'
        ? 'An unexpected internal server error occurred.'
        : exception.message;
    }

    const timestamp = new Date().toISOString();
    const msgStr = Array.isArray(message) ? message.join('; ') : message;

    // Structured logging via Pino
    this.pinoLogger.error(
      `HTTP Error ${status} on ${request.method} ${request.url}: ${msgStr}`,
      exception instanceof Error ? exception.stack : undefined,
      'GlobalExceptionFilter',
      {
        correlationId,
        statusCode: status,
        path: request.url,
        method: request.method,
      },
    );

    // Buffer for disk persistence (legacy log file)
    const logLine = `[${timestamp}] [corr:${correlationId}] ${request.method} ${request.url} ${status} - ${msgStr}`;
    this.logFileService.appendErrorLog(logLine);

    // Consistent response shape
    response.status(status).json({
      statusCode: status,
      error,
      message,
      timestamp,
      path: request.url,
      method: request.method,
      correlationId,
    });
  }
}
