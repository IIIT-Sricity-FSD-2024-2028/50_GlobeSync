import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { CommonModule } from './common/common.module';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';
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
import { AdminsModule } from './admins/admins.module';
import { SupportUsersModule } from './support-users/support-users.module';
import { PassengersModule } from './passengers/passengers.module';
import { UploadsModule } from './uploads/uploads.module';
import { RevenueModule } from './revenue/revenue.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { PromotionsModule } from './promotions/promotions.module';
import { SystemConfigModule } from './system-config/system-config.module';
import { PolicyModule } from './policy/policy.module';
import { InventoryModule } from './inventory/inventory.module';
import { RepositoriesModule } from './repositories';
import { RealtimeModule } from './realtime/realtime.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ApprovalsModule } from './approvals/approvals.module';
import { GlobalAuthGuard } from './auth/guards/global-auth.guard';

@Module({
  imports: [
    // Rate limiting per client IP. Read from RATE_LIMIT_TTL / RATE_LIMIT_MAX at startup
    // (previously hard-coded to 120/min, which blocked normal use: one dashboard
    // page issues 8-12 API calls). Auth routes keep their stricter @Throttle limits.
    ThrottlerModule.forRootAsync({
      useFactory: () => [
        {
          ttl: parseInt(process.env.RATE_LIMIT_TTL || '60000', 10),
          limit: parseInt(process.env.RATE_LIMIT_MAX || '600', 10),
        },
      ],
    }),
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
    AdminsModule,
    SupportUsersModule,
    PassengersModule,
    UploadsModule,
    RevenueModule,
    SubscriptionsModule,
    PromotionsModule,
    SystemConfigModule,
    PolicyModule,
    InventoryModule,
    RepositoriesModule,
    RealtimeModule,
    NotificationsModule,
    ApprovalsModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Verifies the JWT and enforces @Roles + ownership on every protected route
    { provide: APP_GUARD, useClass: GlobalAuthGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // 1. Correlation ID assigned first
    consumer
      .apply(CorrelationIdMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });

    // 2. Structured access logging with correlation ID
    consumer
      .apply(LoggerMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
