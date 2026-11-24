import { Module } from '@nestjs/common';
import { GuidesController } from './guides.controller';
import { GuidesService } from './guides.service';
import { GuideAvailabilityService } from './guide-availability.service';

@Module({
  controllers: [GuidesController],
  providers: [GuidesService, GuideAvailabilityService],
  exports: [GuidesService, GuideAvailabilityService],
})
export class GuidesModule {}
