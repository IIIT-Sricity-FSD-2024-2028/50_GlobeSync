import { Controller, Get, Post, Body, Param, ParseIntPipe } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';

@Controller('api')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('subscriptions/plans')
  getPlans() {
    return this.subscriptionsService.getAllPlans();
  }

  @Get('agencies/:id/subscription')
  getAgencySubscription(@Param('id', ParseIntPipe) id: number) {
    return this.subscriptionsService.getAgencySubscription(id) || { status: 'NONE' };
  }

  @Post('subscriptions')
  subscribe(@Body() body: { agencyId: number, planId: number, paymentRef: string }) {
    return this.subscriptionsService.subscribe(body.agencyId, body.planId, body.paymentRef);
  }
}
