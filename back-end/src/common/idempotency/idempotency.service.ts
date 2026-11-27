import { Injectable } from '@nestjs/common';

export interface CachedIdempotencyResponse {
  key: string;
  statusCode: number;
  body: any;
  createdAt: string;
}

@Injectable()
export class IdempotencyService {
  private cache: Map<string, CachedIdempotencyResponse> = new Map();

  has(key: string): boolean {
    return this.cache.has(key);
  }

  get(key: string): CachedIdempotencyResponse | undefined {
    return this.cache.get(key);
  }

  save(key: string, statusCode: number, body: any): void {
    this.cache.set(key, {
      key,
      statusCode,
      body,
      createdAt: new Date().toISOString(),
    });
  }

  clear(): void {
    this.cache.clear();
  }
}
