import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { TravelersModule } from './travelers/travelers.module';
import { GuidesModule } from './guides/guides.module';
import { PackagesModule } from './packages/packages.module';
import { TripsModule } from './trips/trips.module';
import { BookingsModule } from './bookings/bookings.module';
import { ItinerariesModule } from './itineraries/itineraries.module';
import { ExpensesModule } from './expenses/expenses.module';
import { PaymentsModule } from './payments/payments.module';
import { RefundsModule } from './refunds/refunds.module';
import { ReviewsModule } from './reviews/reviews.module';
import { SupportTicketsModule } from './support-tickets/support-tickets.module';
import { MessagesModule } from './messages/messages.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    HealthModule,
    AuthModule,
    TravelersModule,
    GuidesModule,
    PackagesModule,
    TripsModule,
    BookingsModule,
    ItinerariesModule,
    ExpensesModule,
    PaymentsModule,
    RefundsModule,
    ReviewsModule,
    SupportTicketsModule,
    MessagesModule,
    DashboardModule,
  ],
})
export class AppModule {}



