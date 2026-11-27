import { Module } from '@nestjs/common';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { PolicyModule } from '../policy/policy.module';
import { InventoryModule } from '../inventory/inventory.module';
import { GuidesModule } from '../guides/guides.module';
import { PricingService } from './pricing.service';
import { IdempotencyService } from '../common/idempotency/idempotency.service';
import { HoldExpiryService } from './hold-expiry.service';

@Module({
  imports: [PolicyModule, InventoryModule, GuidesModule],
  controllers: [BookingsController],
  providers: [
    BookingsService,
    PricingService,
    IdempotencyService,
    HoldExpiryService,
  ],
  exports: [
    BookingsService,
    PricingService,
    IdempotencyService,
    HoldExpiryService,
  ],
})
export class BookingsModule {}
