import { Module } from '@nestjs/common';
import { AgenciesService } from './agencies.service';
import { AgenciesController } from './agencies.controller';
import { AgencyApiController } from './agency-api.controller';
import { PassengersModule } from '../passengers/passengers.module';
import { TripsModule } from '../trips/trips.module';
import { SupportTicketsModule } from '../support-tickets/support-tickets.module';

@Module({
  imports: [PassengersModule, TripsModule, SupportTicketsModule],
  controllers: [AgenciesController, AgencyApiController],
  providers: [AgenciesService],
  exports: [AgenciesService],
})
export class AgenciesModule {}
