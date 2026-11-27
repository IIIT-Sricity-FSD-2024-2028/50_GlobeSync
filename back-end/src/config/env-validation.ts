/**
 * Environment Configuration Validation
 *
 * Validates process.env at startup and fails fast with a descriptive error
 * message if any required configuration is missing or malformed.
 */

export interface ValidatedConfig {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
  FRONTEND_URL: string;
  CORS_ORIGINS: string[];
  REQUEST_SIZE_LIMIT: string;
  STORAGE_DRIVER: 'disk' | 'minio' | 's3';
  MINIO_ENDPOINT: string;
  MINIO_PORT: number;
  MINIO_USE_SSL: boolean;
  MINIO_ACCESS_KEY: string;
  MINIO_SECRET_KEY: string;
  MINIO_BUCKET: string;
  SWAGGER_USER?: string;
  SWAGGER_PASSWORD?: string;
  RATE_LIMIT_TTL: number;
  RATE_LIMIT_MAX: number;
}

export function validateEnv(env: NodeJS.ProcessEnv = process.env): ValidatedConfig {
  const errors: string[] = [];

  // 1. NODE_ENV
  const nodeEnv = (env.NODE_ENV || 'development').trim().toLowerCase();
  if (!['development', 'production', 'test'].includes(nodeEnv)) {
    errors.push(`NODE_ENV must be one of: 'development', 'production', 'test'. Received: '${env.NODE_ENV}'`);
  }

  // 2. PORT
  const portStr = env.PORT || '3001';
  const port = parseInt(portStr, 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    errors.push(`PORT must be a valid integer between 1 and 65535. Received: '${env.PORT}'`);
  }

  // 3. JWT_ACCESS_SECRET / JWT_SECRET
  const jwtAccessSecret = env.JWT_ACCESS_SECRET || env.JWT_SECRET;
  if (!jwtAccessSecret) {
    errors.push('JWT_ACCESS_SECRET (or JWT_SECRET) is required for token signing.');
  } else if (jwtAccessSecret.length < 16) {
    errors.push('JWT_ACCESS_SECRET must be at least 16 characters long for cryptographically secure HMAC-SHA256.');
  }

  // 4. JWT_REFRESH_SECRET
  const jwtRefreshSecret = env.JWT_REFRESH_SECRET || (jwtAccessSecret ? `${jwtAccessSecret}-refresh` : undefined);
  if (!jwtRefreshSecret) {
    errors.push('JWT_REFRESH_SECRET is required for rotating refresh tokens.');
  } else if (jwtRefreshSecret.length < 16) {
    errors.push('JWT_REFRESH_SECRET must be at least 16 characters long.');
  }

  // 5. FRONTEND_URL & CORS_ORIGINS
  const frontendUrl = (env.FRONTEND_URL || 'http://localhost:5173').trim();
  const corsOriginsRaw = env.CORS_ORIGINS || env.ALLOWED_ORIGINS || frontendUrl;
  const corsOrigins = corsOriginsRaw
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  if (corsOrigins.length === 0) {
    errors.push('CORS_ORIGINS or FRONTEND_URL must specify at least one allowed origin.');
  }

  // 6. Request Size Limit
  const requestSizeLimit = env.REQUEST_SIZE_LIMIT || '10mb';

  // 7. Storage Driver (disk, minio, s3)
  const storageDriver = ((env.STORAGE_DRIVER || 'disk').trim().toLowerCase()) as 'disk' | 'minio' | 's3';
  if (!['disk', 'minio', 's3'].includes(storageDriver)) {
    errors.push(`STORAGE_DRIVER must be 'disk', 'minio', or 's3'. Received: '${env.STORAGE_DRIVER}'`);
  }

  // 8. MinIO / S3 credentials if storage driver is minio/s3
  const minioEndpoint = env.MINIO_ENDPOINT || 'localhost';
  const minioPort = parseInt(env.MINIO_PORT || '9000', 10);
  const minioUseSSL = env.MINIO_USE_SSL === 'true';
  const minioAccessKey = env.MINIO_ACCESS_KEY || 'minioadmin';
  const minioSecretKey = env.MINIO_SECRET_KEY || 'minioadmin';
  const minioBucket = env.MINIO_BUCKET || 'globesync-uploads';

  // Rate Limiting
  const rateLimitTtl = parseInt(env.RATE_LIMIT_TTL || '60000', 10);
  const rateLimitMax = parseInt(env.RATE_LIMIT_MAX || '600', 10);

  // Fail fast if validation errors exist
  if (errors.length > 0) {
    const errorBanner = [
      '================================================================================',
      ' ❌ [GlobeSync Config Validation] STARTUP FAILED — Invalid Environment Config',
      '================================================================================',
      ...errors.map((err) => `  • ${err}`),
      '================================================================================',
    ].join('\n');

    console.error(errorBanner);
    throw new Error(`Startup failed due to ${errors.length} configuration error(s):\n${errors.join('\n')}`);
  }

  return {
    NODE_ENV: nodeEnv as 'development' | 'production' | 'test',
    PORT: port,
    JWT_ACCESS_SECRET: jwtAccessSecret!,
    JWT_REFRESH_SECRET: jwtRefreshSecret!,
    FRONTEND_URL: frontendUrl,
    CORS_ORIGINS: corsOrigins,
    REQUEST_SIZE_LIMIT: requestSizeLimit,
    STORAGE_DRIVER: storageDriver,
    MINIO_ENDPOINT: minioEndpoint,
    MINIO_PORT: minioPort,
    MINIO_USE_SSL: minioUseSSL,
    MINIO_ACCESS_KEY: minioAccessKey,
    MINIO_SECRET_KEY: minioSecretKey,
    MINIO_BUCKET: minioBucket,
    SWAGGER_USER: env.SWAGGER_USER || 'admin',
    SWAGGER_PASSWORD: env.SWAGGER_PASSWORD || 'globesync-admin',
    RATE_LIMIT_TTL: rateLimitTtl,
    RATE_LIMIT_MAX: rateLimitMax,
  };
}
