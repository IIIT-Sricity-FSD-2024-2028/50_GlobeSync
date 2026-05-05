import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { RolesGuard } from './common/guards/roles.guard';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for frontend
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization, x-user-role, x-user-id',
  });

  // Enable global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Enable global RBAC guard
  const reflector = app.get(Reflector);
  app.useGlobalGuards(new RolesGuard(reflector));

  // Enable global exception filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('GlobeSync API')
    .setDescription('GlobeSync Travel Platform Backend API')
    .setVersion('1.0.0')
    .addTag('health', 'Health check endpoints')
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
  console.log('Swagger JSON written to docs/swagger.json');

  // Serve Swagger UI at /api
  SwaggerModule.setup('api', app, document);

  await app.listen(3000);
  console.log('Application is running on: http://localhost:3000');
  console.log('Swagger UI available at: http://localhost:3000/api');
}
bootstrap();
