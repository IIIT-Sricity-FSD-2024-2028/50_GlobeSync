import { Controller, Get, Post, Body, Param, ParseIntPipe, Put } from '@nestjs/common';
import { RevenueService } from './revenue.service';

@Controller('api')
export class RevenueController {
  constructor(private readonly revenueService: RevenueService) {}

  // ================= ADMIN ROUTES =================

  @Get('admin/revenue/overview')
  getAdminOverview() {
    return this.revenueService.getRevenueSummary();
  }

  @Get('admin/revenue/breakdown')
  getAdminBreakdown() {
    return this.revenueService.getBreakdown();
  }

  @Get('admin/revenue/transactions')
  getAllTransactions() {
    return this.revenueService.getAllTransactions();
  }

  @Get('admin/revenue/config')
  getConfig() {
    return this.revenueService.getConfig();
  }

  @Put('admin/revenue/config/:key')
  updateConfig(
    @Param('key') key: string,
    @Body('value') value: number
  ) {
    return this.revenueService.updateConfig(key, value);
  }

  // ================= AGENCY ROUTES =================

  @Get('agencies/:id/revenue')
  getAgencyRevenue(@Param('id', ParseIntPipe) id: number) {
    const txs = this.revenueService.getAgencyTransactions(id);
    
    const validStatuses = ['EARNED', 'SETTLED'];
    let totalSales = 0;
    let totalCommission = 0;
    
    txs.forEach(t => {
      if (t.revenue_type === 'AGENCY_COMMISSION') {
        totalSales += t.gross_amount;
        if (validStatuses.includes(t.status)) {
           totalCommission += t.revenue_amount;
        }
      }
    });

    return {
      transactions: txs,
      totalSales,
      totalCommissionToGlobeSync: totalCommission,
      agencyEarnings: totalSales - totalCommission
    };
  }
}
