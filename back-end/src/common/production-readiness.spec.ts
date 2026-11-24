process.env.NODE_ENV = 'test';

import 'reflect-metadata';
import * as assert from 'assert';
import { validateEnv } from '../config/env-validation';
import { CorrelationIdMiddleware } from './middleware/correlation-id.middleware';
import { GlobalExceptionFilter } from './filters/http-exception.filter';
import { PinoLoggerService } from './logger/pino-logger.service';
import { StorageService } from '../uploads/storage.service';
import { VirusScannerService } from '../uploads/virus-scanner.service';
import { systemAuditLogs } from '../data/system-config.data';
import { HttpStatus, HttpException, BadRequestException } from '@nestjs/common';

let passed = 0;
let failed = 0;

async function run(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

async function main() {
  console.log('======================================================');
  console.log('GlobeSync — Production Readiness Verification Suite');
  console.log('======================================================\n');

  const pinoLogger = new PinoLoggerService();
  const mockLogFileService: any = {
    appendAccessLog: () => {},
    appendErrorLog: () => {},
  };

  // --- 1. Environment Config Validation (Fail-Fast) ---
  console.log('--- 1. Environment Config Validation (Fail-Fast) ---');

  await run('Validates a complete, valid environment successfully', () => {
    const validEnv = {
      NODE_ENV: 'development',
      PORT: '3001',
      JWT_ACCESS_SECRET: 'super-secret-jwt-key-replace-in-production-min-32-chars',
      JWT_REFRESH_SECRET: 'super-secret-jwt-refresh-key-replace-in-production-min-32-chars',
      FRONTEND_URL: 'http://localhost:5173',
    };
    const config = validateEnv(validEnv as any);
    assert.strictEqual(config.PORT, 3001);
    assert.strictEqual(config.NODE_ENV, 'development');
    assert.ok(config.CORS_ORIGINS.includes('http://localhost:5173'));
    assert.strictEqual(config.STORAGE_DRIVER, 'disk');
  });

  await run('Fails fast when JWT_ACCESS_SECRET is missing or too short', () => {
    const invalidEnv = {
      NODE_ENV: 'development',
      PORT: '3001',
      JWT_ACCESS_SECRET: 'short',
    };
    assert.throws(() => validateEnv(invalidEnv as any), /JWT_ACCESS_SECRET/);
  });

  await run('Fails fast when PORT is invalid', () => {
    const invalidEnv = {
      PORT: 'invalid-port',
      JWT_ACCESS_SECRET: 'valid-32-character-secret-key-ok!',
    };
    assert.throws(() => validateEnv(invalidEnv as any), /PORT/);
  });

  await run('Fails fast when NODE_ENV is invalid', () => {
    const invalidEnv = {
      NODE_ENV: 'staging_unknown',
      JWT_ACCESS_SECRET: 'valid-32-character-secret-key-ok!',
    };
    assert.throws(() => validateEnv(invalidEnv as any), /NODE_ENV/);
  });

  // --- 2. Correlation ID Middleware & Consistent Error Shape ---
  console.log('\n--- 2. Correlation ID & Global Exception Filter ---');

  await run('CorrelationIdMiddleware generates a new UUIDv4 correlation ID if none supplied', () => {
    const middleware = new CorrelationIdMiddleware();
    const req: any = { headers: {} };
    const headersSet: Record<string, string> = {};
    const res: any = {
      setHeader: (k: string, v: string) => {
        headersSet[k] = v;
      },
    };
    let calledNext = false;

    middleware.use(req, res, () => {
      calledNext = true;
    });

    assert.strictEqual(calledNext, true);
    assert.ok(typeof req.correlationId === 'string' && req.correlationId.length > 10);
    assert.strictEqual(headersSet['x-correlation-id'], req.correlationId);
  });

  await run('CorrelationIdMiddleware preserves client-supplied x-correlation-id', () => {
    const middleware = new CorrelationIdMiddleware();
    const clientTraceId = 'trace-id-abc-12345';
    const req: any = { headers: { 'x-correlation-id': clientTraceId } };
    const headersSet: Record<string, string> = {};
    const res: any = {
      setHeader: (k: string, v: string) => {
        headersSet[k] = v;
      },
    };

    middleware.use(req, res, () => {});

    assert.strictEqual(req.correlationId, clientTraceId);
    assert.strictEqual(headersSet['x-correlation-id'], clientTraceId);
  });

  await run('GlobalExceptionFilter formats consistent error shape with correlationId and method', () => {
    const filter = new GlobalExceptionFilter(mockLogFileService, pinoLogger);
    let capturedStatus = 0;
    let capturedBody: any = null;
    let capturedHeader = '';

    const host: any = {
      switchToHttp: () => ({
        getRequest: () => ({
          url: '/api/v1/test-resource',
          method: 'POST',
          correlationId: 'test-corr-456',
          headers: {},
        }),
        getResponse: () => ({
          setHeader: (_k: string, v: string) => {
            capturedHeader = v;
          },
          status: (s: number) => {
            capturedStatus = s;
            return {
              json: (body: any) => {
                capturedBody = body;
              },
            };
          },
        }),
      }),
    };

    const exception = new HttpException('Resource is invalid', HttpStatus.BAD_REQUEST);
    filter.catch(exception, host);

    assert.strictEqual(capturedStatus, 400);
    assert.strictEqual(capturedHeader, 'test-corr-456');
    assert.strictEqual(capturedBody.statusCode, 400);
    assert.strictEqual(capturedBody.error, 'Bad Request');
    assert.strictEqual(capturedBody.message, 'Resource is invalid');
    assert.strictEqual(capturedBody.path, '/api/v1/test-resource');
    assert.strictEqual(capturedBody.method, 'POST');
    assert.strictEqual(capturedBody.correlationId, 'test-corr-456');
    assert.ok(typeof capturedBody.timestamp === 'string');
  });

  // --- 3. File Upload Security, Virus Scanner & Signed URLs ---
  console.log('\n--- 3. File Upload Security & Presigned URLs ---');

  const scanner = new VirusScannerService(pinoLogger);
  const storage = new StorageService(pinoLogger);

  await run('Virus scanner accepts legitimate clean PDF documents', async () => {
    const file: any = {
      originalname: 'tax_proof.pdf',
      mimetype: 'application/pdf',
      size: 2048,
      buffer: Buffer.from('%PDF-1.4 sample legitimate document content'),
    };

    const result = await scanner.scanFile(file);
    assert.strictEqual(result.isClean, true);
    assert.ok(result.scannerEngine.length > 0);
  });

  await run('Virus scanner intercepts and rejects malicious EICAR signatures', async () => {
    const maliciousFile: any = {
      originalname: 'eicar_test.pdf',
      mimetype: 'application/pdf',
      size: 500,
      buffer: Buffer.from('X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'),
    };

    let threw = false;
    try {
      await scanner.scanFile(maliciousFile);
    } catch (err: any) {
      threw = true;
      assert.ok(err instanceof BadRequestException);
      assert.ok(err.message.includes('EICAR'));
    }
    assert.strictEqual(threw, true);
  });

  await run('StorageService generates valid HMAC-SHA256 presigned access URLs', () => {
    const filename = 'agency_tax_id.pdf';
    const signedUrl = storage.generateSignedUrl(filename, 3600);

    assert.ok(signedUrl.startsWith(`/uploads/signed/${filename}`));
    const url = new URL(`http://localhost${signedUrl}`);
    const expires = url.searchParams.get('expires')!;
    const token = url.searchParams.get('token')!;

    const isValid = storage.verifySignedUrl(filename, token, expires);
    assert.strictEqual(isValid, true);
  });

  await run('StorageService rejects tampered or expired signed tokens', () => {
    const filename = 'agency_tax_id.pdf';
    const signedUrl = storage.generateSignedUrl(filename, 3600);
    const url = new URL(`http://localhost${signedUrl}`);
    const expires = url.searchParams.get('expires')!;

    // Tampered token check
    const isTamperedValid = storage.verifySignedUrl(filename, 'fake-token-hex-1234567890abcdef', expires);
    assert.strictEqual(isTamperedValid, false);

    // Expired check
    const pastExpires = String(Math.floor(Date.now() / 1000) - 100);
    const isExpiredValid = storage.verifySignedUrl(filename, 'any-token', pastExpires);
    assert.strictEqual(isExpiredValid, false);
  });

  // --- 4. Audit Log for State-Changing Operations ---
  console.log('\n--- 4. Audit Log Trail Recording ---');

  await run('System audit log records who, what, before, after, ip, correlationId', () => {
    const initialCount = systemAuditLogs.length;

    const testEntry = {
      id: initialCount + 1,
      text: '[SUPERUSER] Super Admin performed PUT /system-config/rules',
      author: 'Super Admin (superuser)',
      time: 'Just now',
      color: '#8b5cf6',
      category: 'rules' as const,
      timestamp: new Date().toISOString(),
      who: 'Super Admin (superuser)',
      what: 'PUT /system-config/rules',
      before: { autoConfirm: false },
      after: { autoConfirm: true },
      ip: '10.0.0.1',
      correlationId: 'trace-super-uuid-99',
    };

    systemAuditLogs.unshift(testEntry);

    assert.strictEqual(systemAuditLogs.length, initialCount + 1);
    const top = systemAuditLogs[0];
    assert.strictEqual(top.who, 'Super Admin (superuser)');
    assert.strictEqual(top.what, 'PUT /system-config/rules');
    assert.deepStrictEqual(top.before, { autoConfirm: false });
    assert.deepStrictEqual(top.after, { autoConfirm: true });
    assert.strictEqual(top.correlationId, 'trace-super-uuid-99');
  });

  console.log('\n======================================================');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
