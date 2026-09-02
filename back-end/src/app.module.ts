import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { CommonModule } from './common/common.module';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
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
import { AgenciesModule } from './agencies/agencies.module';
import { PassengersModule } from './passengers/passengers.module';
import { UploadsModule } from './uploads/uploads.module';
import { RevenueModule } from './revenue/revenue.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { PromotionsModule } from './promotions/promotions.module';

@Module({
  imports: [
    CommonModule,
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
    AgenciesModule,
    PassengersModule,
    UploadsModule,
    RevenueModule,
    SubscriptionsModule,
    PromotionsModule,
  ],
  providers: [
    // APP_FILTER registers GlobalExceptionFilter as a DI-managed global exception filter.
    // This replaces the manual `app.useGlobalFilters(new GlobalExceptionFilter())` in main.ts
    // and enables constructor injection (e.g. LogFileService) which the manual approach cannot do.
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  ],
})
export class AppModule implements NestModule {
  /**
   * configure() is the NestJS "router-level middleware" mechanism.
   *
   * How it differs from the other NestJS global-scope mechanisms:
   *
   *   app.use()                  — Raw Express global middleware; runs before NestJS
   *                                routing even knows about the request. Has no access
   *                                to NestJS DI (no @Injectable, no constructor injection).
   *
   *   app.useGlobalGuards()      — NestJS-level, runs AFTER middleware, BEFORE route
   *   app.useGlobalPipes()         handlers. Operates on the resolved route context
   *   app.useGlobalFilters()       (knows about @Roles decorators, DTOs, etc.).
   *                                These also bypass DI unless you use the APP_GUARD /
   *                                APP_PIPE / APP_FILTER token approach.
   *
   *   MiddlewareConsumer (here)  — Applied at the Express router level, but wired through
   *                                NestJS's module system, so @Injectable middleware classes
   *                                get full DI support (constructor injection works).
   *                                Can be scoped to specific routes, HTTP methods, or
   *                                entire route groups via .forRoutes().
   */
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(LoggerMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}



