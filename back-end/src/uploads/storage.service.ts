import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { PinoLoggerService } from '../common/logger/pino-logger.service';

export interface UploadResult {
  message: string;
  filename: string;
  path: string;
  signedUrl: string;
  size: number;
  mimeType: string;
  storageDriver: 'disk' | 'minio' | 's3';
}

@Injectable()
export class StorageService {
  private readonly storageDriver: 'disk' | 'minio' | 's3';
  private readonly uploadDir: string;
  private readonly signingSecret: string;
  private readonly minioConfig: {
    endpoint: string;
    port: number;
    useSSL: boolean;
    bucket: string;
  };

  constructor(private readonly logger: PinoLoggerService) {
    this.storageDriver = (process.env.STORAGE_DRIVER || 'disk') as 'disk' | 'minio' | 's3';
    this.uploadDir = path.join(__dirname, '..', '..', 'uploads');
    this.signingSecret = process.env.JWT_ACCESS_SECRET || 'globesync-secure-signing-secret-32chars';

    this.minioConfig = {
      endpoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: parseInt(process.env.MINIO_PORT || '9000', 10),
      useSSL: process.env.MINIO_USE_SSL === 'true',
      bucket: process.env.MINIO_BUCKET || 'globesync-uploads',
    };

    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Save file to storage driver (disk or MinIO/S3).
   */
  async saveFile(file: Express.Multer.File): Promise<UploadResult> {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;

    if (this.storageDriver === 'minio' || this.storageDriver === 's3') {
      try {
        // In MinIO/S3 mode, upload buffer to bucket
        await this.uploadToMinio(uniqueName, file.buffer || fs.readFileSync(file.path), file.mimetype);
      } catch (err: any) {
        this.logger.warn(`MinIO upload unavailable (${err.message}). Storing locally as fallback.`, 'StorageService');
        await this.saveToDisk(uniqueName, file);
      }
    } else {
      await this.saveToDisk(uniqueName, file);
    }

    const signedUrl = this.generateSignedUrl(uniqueName, 3600); // 1 hour valid presigned URL

    return {
      message: 'File uploaded successfully',
      filename: uniqueName,
      path: `/uploads/${uniqueName}`,
      signedUrl,
      size: file.size,
      mimeType: file.mimetype,
      storageDriver: this.storageDriver,
    };
  }

  private async saveToDisk(filename: string, file: Express.Multer.File): Promise<string> {
    const destPath = path.join(this.uploadDir, filename);
    if (file.buffer) {
      fs.writeFileSync(destPath, file.buffer);
    } else if (file.path && fs.existsSync(file.path)) {
      if (file.path !== destPath) {
        fs.copyFileSync(file.path, destPath);
      }
    }
    return destPath;
  }

  private async uploadToMinio(filename: string, buffer: Buffer, mimeType: string): Promise<void> {
    // Uses HTTP PUT to MinIO/S3 compatible endpoint
    const protocol = this.minioConfig.useSSL ? 'https' : 'http';
    const url = `${protocol}://${this.minioConfig.endpoint}:${this.minioConfig.port}/${this.minioConfig.bucket}/${filename}`;

    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': mimeType,
      },
      body: buffer as any,
    });

    if (!res.ok) {
      throw new Error(`MinIO returned HTTP ${res.status}: ${res.statusText}`);
    }
  }

  /**
   * Generates a time-limited HMAC-SHA256 signed URL for authorized document access.
   */
  generateSignedUrl(filename: string, expiresInSeconds = 3600): string {
    const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const payload = `${filename}:${expiresAt}`;
    const signature = crypto
      .createHmac('sha256', this.signingSecret)
      .update(payload)
      .digest('hex');

    return `/uploads/signed/${filename}?expires=${expiresAt}&token=${signature}`;
  }

  /**
   * Cryptographically verifies a signed URL token and expiration.
   */
  verifySignedUrl(filename: string, token: string, expiresStr: string): boolean {
    const expires = parseInt(expiresStr, 10);
    if (isNaN(expires)) return false;

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (now > expires) {
      return false; // Expired
    }

    const payload = `${filename}:${expires}`;
    const expectedSignature = crypto
      .createHmac('sha256', this.signingSecret)
      .update(payload)
      .digest('hex');

    const tokenBuf = Buffer.from(token);
    const expectedBuf = Buffer.from(expectedSignature);
    if (tokenBuf.length !== expectedBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(tokenBuf, expectedBuf);
  }

  /**
   * Resolves local file path or stream for download.
   */
  getFilePath(filename: string): string {
    const safeName = path.basename(filename);
    const fullPath = path.join(this.uploadDir, safeName);
    if (!fs.existsSync(fullPath)) {
      throw new NotFoundException(`File ${filename} not found in storage.`);
    }
    return fullPath;
  }
}
