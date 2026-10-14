import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { RevenueModule } from '../revenue/revenue.module';
import { SystemConfigModule } from '../system-config/system-config.module';

@Module({
  imports: [RevenueModule, SystemConfigModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService]
})
export class PaymentsModule {}
