import { Module } from '@nestjs/common';
import { HealthController, RootReadyController } from './health.controller';

@Module({
  controllers: [HealthController, RootReadyController],
  providers: [HealthController],
  exports: [HealthController],
})
export class HealthModule {}
