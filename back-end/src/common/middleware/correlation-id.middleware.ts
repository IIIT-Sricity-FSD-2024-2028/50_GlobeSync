import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

export interface CorrelatedRequest extends Request {
  correlationId?: string;
}

/**
 * CorrelationIdMiddleware
 *
 * Ensures every incoming HTTP request carries a unique Correlation ID.
 * If incoming request provides 'x-correlation-id' or 'x-request-id', it is preserved;
 * otherwise, a new cryptographically random UUIDv4 is generated.
 * The correlation ID is reflected back in response headers.
 */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: CorrelatedRequest, res: Response, next: NextFunction): void {
    const correlationId =
      (req.headers['x-correlation-id'] as string) ||
      (req.headers['x-request-id'] as string) ||
      randomUUID();

    req.correlationId = correlationId;
    res.setHeader('x-correlation-id', correlationId);

    next();
  }
}
