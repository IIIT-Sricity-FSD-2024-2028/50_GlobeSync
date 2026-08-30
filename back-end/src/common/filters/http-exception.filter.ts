import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { LogFileService } from '../services/log-file.service';

/**
 * Global exception filter providing consistent error response format.
 *
 * Error handling patterns:
 * - invalid ID → 404 Not Found
 * - invalid body → 400 Bad Request (from ValidationPipe)
 * - unauthorized role → 403 Forbidden (from RolesGuard)
 *
 * Registered as an APP_FILTER DI provider in AppModule so that
 * LogFileService can be constructor-injected (DI works here, unlike
 * the old manual `new GlobalExceptionFilter()` in main.ts).
 *
 * The client-facing JSON response shape is UNCHANGED:
 *   { statusCode, error, message, timestamp, path }
 */
@Injectable()
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logFileService: LogFileService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        error = exception.message;
      } else if (typeof exceptionResponse === 'object') {
        const res = exceptionResponse as Record<string, any>;
        message = res.message || exception.message;
        error = res.error || 'Error';
      }
    }

    // --- Error persistence (additive only — does not affect response shape) ---
    const timestamp = new Date().toISOString();
    const msgStr = Array.isArray(message) ? message.join('; ') : message;
    const logLine =
      `[${timestamp}] ${request.method} ${request.url} ${status} - ${msgStr}`;

    console.error(logLine);
    this.logFileService.appendErrorLog(logLine);
    // -------------------------------------------------------------------------

    // Response body is byte-for-byte identical to the original implementation.
    response.status(status).json({
      statusCode: status,
      error,
      message,
      timestamp,
      path: request.url,
    });
  }
}
