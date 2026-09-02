import { Module } from '@nestjs/common';
import { RefundsController } from './refunds.controller';
import { RefundsService } from './refunds.service';
import { PaymentsModule } from '../payments/payments.module';
import { RevenueModule } from '../revenue/revenue.module';

@Module({ 
  imports: [PaymentsModule, RevenueModule],
  controllers: [RefundsController], 
  providers: [RefundsService], 
  exports: [RefundsService] 
})
export class RefundsModule {}
