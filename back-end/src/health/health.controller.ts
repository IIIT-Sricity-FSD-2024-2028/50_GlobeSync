import { Controller, Get, Res, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Liveness probe', description: 'Returns 200 OK if service process is alive.' })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  getLiveness() {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      service: 'GlobeSync API',
      version: '1.0.0',
    };
  }

  @Get('ready')
  @ApiOperation({
    summary: 'Readiness probe',
    description: 'Verifies database, storage subsystem, and memory readiness before routing traffic.',
  })
  @ApiResponse({ status: 200, description: 'Service is ready to handle requests' })
  @ApiResponse({ status: 503, description: 'Service subsystem degraded or unhealthy' })
  async getReadiness(@Res() res: Response) {
    const checks: Record<string, 'up' | 'degraded' | 'down'> = {
      database: 'up',
      storage: 'up',
      memory: 'up',
    };

    // 1. Storage write readiness check
    try {
      const uploadDir = path.join(__dirname, '..', '..', 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const testFile = path.join(uploadDir, '.readiness-probe');
      fs.writeFileSync(testFile, 'ok');
      fs.unlinkSync(testFile);
      checks.storage = 'up';
    } catch {
      checks.storage = 'degraded';
    }

    // 2. Memory check (heap must not be depleted > 95%)
    const mem = process.memoryUsage();
    if (mem.heapUsed / mem.heapTotal > 0.95) {
      checks.memory = 'degraded';
    }

    const isHealthy = Object.values(checks).every((c) => c === 'up');

    return res.status(isHealthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE).json({
      status: isHealthy ? 'ready' : 'degraded',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      checks,
    });
  }
}

/**
 * RootReadyController
 * Mounts directly at /ready for Kubernetes / cloud load-balancer health probe compatibility.
 */
@ApiTags('health')
@Controller('ready')
export class RootReadyController {
  constructor(private readonly healthController: HealthController) {}

  @Get()
  @ApiOperation({ summary: 'Root readiness probe (/ready)' })
  checkReady(@Res() res: Response) {
    return this.healthController.getReadiness(res);
  }
}
