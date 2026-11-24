import './config/load-env'; // must stay first: loads .env before any module reads process.env
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import * as express from 'express';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { validateEnv } from './config/env-validation';
import { PinoLoggerService } from './common/logger/pino-logger.service';
import * as fs from 'fs';
import * as path from 'path';
import { join } from 'path';

async function bootstrap() {
  // 1. Fail-fast environment validation at startup
  const envConfig = validateEnv();

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  // 2. Structured logging via Pino
  const pinoLogger = app.get(PinoLoggerService);
  app.useLogger(pinoLogger);

  // 3. Apply standard HTTP security headers (Helmet)
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
          connectSrc: ["'self'", 'ws:', 'wss:', 'http:', 'https:'],
        },
      },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // 4. Request payload size limits
  app.use(express.json({ limit: envConfig.REQUEST_SIZE_LIMIT }));
  app.use(express.urlencoded({ limit: envConfig.REQUEST_SIZE_LIMIT, extended: true }));

  // 5. Parse cookies (needed for httpOnly JWT cookie support)
  app.use(cookieParser());

  // 6. CORS allow-list from env
  const allowedOrigins = new Set([
    ...envConfig.CORS_ORIGINS,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ]);

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, server-to-server) or in allow-list
      // Outside production, any localhost port is allowed (Vite moves to 5174, 5175...
      // when 5173 is busy; before this, login failed with a CORS error on those ports).
      const isLocalDevOrigin =
        process.env.NODE_ENV !== 'production' &&
        !!origin &&
        /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
      if (!origin || allowedOrigins.has(origin) || isLocalDevOrigin) {
        callback(null, true);
      } else {
        pinoLogger.warn(`CORS blocked request from origin: ${origin}`, 'CORS');
        callback(new Error(`Origin '${origin}' is not permitted by CORS policy.`));
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization, x-correlation-id, Idempotency-Key, x-idempotency-key, x-user-id, x-user-role, x-role',
    exposedHeaders: 'x-correlation-id',
    credentials: true,
  });

  // 7. Global validation pipe with whitelist + forbidNonWhitelisted
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // 8. Serve uploaded files as static assets at /uploads/<filename>
  app.useStaticAssets(join(__dirname, '..', 'uploads'), { prefix: '/uploads/' });

  // 9. Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('GlobeSync API')
    .setDescription('GlobeSync Travel Platform Backend API')
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('health', 'Health & readiness check endpoints')
    .addTag('auth', 'Authentication endpoints')
    .addTag('travelers', 'Traveler management')
    .addTag('guides', 'Guide management')
    .addTag('packages', 'Travel package management')
    .addTag('trips', 'Trip management')
    .addTag('bookings', 'Booking management')
    .addTag('itineraries', 'Itinerary management')
    .addTag('expenses', 'Expense management')
    .addTag('payments', 'Payment management')
    .addTag('refunds', 'Refund management')
    .addTag('reviews', 'Review management')
    .addTag('support-tickets', 'Support ticket management')
    .addTag('messages', 'Messaging')
    .addTag('dashboard', 'Dashboard & reports')
    .addTag('agencies', 'Travel agency partner management')
    .addTag('admins', 'Platform administrator management')
    .addTag('support-users', 'Customer care support personnel management')
    .addTag('passengers', 'Passenger master records and co-traveler management')
    .addTag('uploads', 'File attachment uploads and storage')
    .addTag('revenue', 'Agency revenue reporting and platform fee reconciliation')
    .addTag('subscriptions', 'Agency subscription tiers and billing plans')
    .addTag('promotions', 'Promotional discounts and campaign management')
    .addTag('system-config', 'Platform operational rules, payment methods, integrations, and audit trail')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Save Swagger JSON to docs/
  const docsDir = path.join(__dirname, '..', 'docs');
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }
  fs.writeFileSync(
    path.join(docsDir, 'swagger.json'),
    JSON.stringify(document, null, 2),
  );

  // 10. Swagger secured in non-development environments
  if (envConfig.NODE_ENV === 'production' || process.env.PROTECT_SWAGGER === 'true') {
    app.use(['/api', '/api-json'], (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const authHeader = req.headers['authorization'];
      if (!authHeader) {
        res.setHeader('WWW-Authenticate', 'Basic realm="GlobeSync API Docs"');
        return res.status(401).send('Authentication required for API documentation in non-development environments.');
      }

      // 1. Basic Auth check
      if (authHeader.startsWith('Basic ')) {
        const credentials = Buffer.from(authHeader.split(' ')[1], 'base64').toString('ascii');
        const [username, password] = credentials.split(':');
        if (username === envConfig.SWAGGER_USER && password === envConfig.SWAGGER_PASSWORD) {
          return next();
        }
      }

      // 2. Bearer Token check (Admin / Superuser)
      if (authHeader.startsWith('Bearer ')) {
        const role = (req as any).user?.role || req.headers['x-user-role'];
        if (role === 'admin' || role === 'superuser') {
          return next();
        }
      }

      res.setHeader('WWW-Authenticate', 'Basic realm="GlobeSync API Docs"');
      return res.status(401).send('Invalid credentials for Swagger access.');
    });
  }

  // Mount Swagger UI at /api
  SwaggerModule.setup('api', app, document);

  await app.listen(envConfig.PORT);
  pinoLogger.log(`GlobeSync API running on: http://localhost:${envConfig.PORT} [env=${envConfig.NODE_ENV}]`, 'Bootstrap');
  pinoLogger.log(`Swagger UI available at: http://localhost:${envConfig.PORT}/api`, 'Bootstrap');
}
bootstrap();
