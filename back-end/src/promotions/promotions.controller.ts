import { Controller, Get, Post, Body } from '@nestjs/common';
import { PromotionsService } from './promotions.service';

@Controller('api')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Get('promotions')
  getAllPromotions() {
    return this.promotionsService.getAllPromotions();
  }

  @Post('promotions')
  createPromotion(@Body() body: { agencyId: number, packageId: number, type: 'HOMEPAGE' | 'SEARCH_RESULT', price: number, paymentRef: string }) {
    return this.promotionsService.createPromotion(body.agencyId, body.packageId, body.type, body.price, body.paymentRef);
  }
}
