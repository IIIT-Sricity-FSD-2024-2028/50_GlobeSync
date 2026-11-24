import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { GatewayPaymentService } from './gateway-payment.service';
import { RevenueModule } from '../revenue/revenue.module';
import { SystemConfigModule } from '../system-config/system-config.module';
import { InventoryModule } from '../inventory/inventory.module';
import { GuidesModule } from '../guides/guides.module';
import { IdempotencyService } from '../common/idempotency/idempotency.service';

@Module({
  imports: [RevenueModule, SystemConfigModule, InventoryModule, GuidesModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, GatewayPaymentService, IdempotencyService],
  exports: [PaymentsService, GatewayPaymentService],
})
export class PaymentsModule {}
