import { Module } from '@nestjs/common';
import { TripsController } from './trips.controller';
import { TripsService } from './trips.service';
import { GuidesModule } from '../guides/guides.module';
import { PolicyModule } from '../policy/policy.module';

@Module({
  imports: [GuidesModule, PolicyModule],
  controllers: [TripsController],
  providers: [TripsService],
  exports: [TripsService],
})
export class TripsModule {}
