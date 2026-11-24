import { Controller, Get, Post, Body, Param, Query, ParseIntPipe, Put, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RevenueService } from './revenue.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiRoleHeader } from '../common/decorators/api-role-header.decorator';
import { ApiUserHeaders } from '../common/decorators/api-user-headers.decorator';
import { Role } from '../common/enums/role.enum';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { UpdateRevenueConfigDto } from './dto/update-revenue-config.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@ApiTags('revenue')
@Controller('api')
@UseGuards(RolesGuard)
export class RevenueController {
  constructor(private readonly revenueService: RevenueService) {}

  // ================= ADMIN & SUPERUSER ROUTES =================

  @Get('admin/revenue/overview')
  @Roles(Role.ADMIN, Role.SUPERUSER)
  @ApiRoleHeader()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get revenue overview (Admin/Superuser only)' })
  @ApiResponse({ status: 200, description: 'Revenue summary returned' })
  @ApiResponse({ status: 403, description: 'Forbidden', type: ErrorResponseDto })
  getAdminOverview() {
    return this.revenueService.getRevenueSummary();
  }

  @Get('admin/revenue/analytics/settled')
  @Roles(Role.ADMIN, Role.SUPERUSER)
  @ApiRoleHeader()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Settled revenue analytics with date filters',
    description: 'Computes metrics ONLY from settled ledger transactions. Returns zeros when there is no data.',
  })
  @ApiResponse({ status: 200, description: 'Settled revenue analytics' })
  getSettledAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.revenueService.getSettledRevenueAnalytics(startDate, endDate);
  }

  @Get('admin/revenue/breakdown')
  @Roles(Role.ADMIN, Role.SUPERUSER)
  @ApiRoleHeader()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get revenue breakdown by category (Admin/Superuser only)' })
  @ApiResponse({ status: 200, description: 'Revenue breakdown returned' })
  @ApiResponse({ status: 403, description: 'Forbidden', type: ErrorResponseDto })
  getAdminBreakdown() {
    return this.revenueService.getBreakdown();
  }

  @Get('admin/revenue/transactions')
  @Roles(Role.ADMIN, Role.SUPERUSER)
  @ApiRoleHeader()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all revenue transactions with pagination, search, and sorting' })
  @ApiResponse({ status: 200, description: 'Transaction list returned' })
  @ApiResponse({ status: 403, description: 'Forbidden', type: ErrorResponseDto })
  getAllTransactions(@Query() query: PaginationQueryDto) {
    return this.revenueService.getAllTransactions(query);
  }

  @Get('admin/revenue/config')
  @Roles(Role.ADMIN, Role.SUPERUSER)
  @ApiRoleHeader()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get revenue configuration (Admin/Superuser only)' })
  @ApiResponse({ status: 200, description: 'Config returned' })
  @ApiResponse({ status: 403, description: 'Forbidden', type: ErrorResponseDto })
  getConfig() {
    return this.revenueService.getConfig();
  }

  @Put('admin/revenue/config/:key')
  @Roles(Role.SUPERUSER)
  @ApiRoleHeader()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a revenue config value (Superuser only)' })
  @ApiParam({ name: 'key', type: String, description: 'Config key to update' })
  @ApiResponse({ status: 200, description: 'Config updated' })
  @ApiResponse({ status: 400, description: 'Bad Request — invalid config value', type: ErrorResponseDto })
  @ApiResponse({ status: 403, description: 'Forbidden — Superuser only', type: ErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Not Found — config key not found', type: ErrorResponseDto })
  updateConfig(
    @Param('key') key: string,
    @Body() dto: UpdateRevenueConfigDto,
  ) {
    return this.revenueService.updateConfig(key, dto.value);
  }

  // ================= AGENCY ROUTES =================

  @Get('agencies/:id/revenue')
  @Roles(Role.AGENCY, Role.ADMIN, Role.SUPERUSER)
  @ApiUserHeaders()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get revenue for a specific agency with pagination',
    description:
      'AGENCY role: x-user-id must match :id. ADMIN/SUPERUSER may access any agency.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Agency ID' })
  @ApiResponse({ status: 200, description: 'Agency revenue returned' })
  @ApiResponse({ status: 403, description: 'Forbidden — wrong role or mismatched agency ID', type: ErrorResponseDto })
  getAgencyRevenue(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: PaginationQueryDto,
  ) {
    const txs = this.revenueService.getAgencyTransactions(id);

    const validStatuses = ['EARNED', 'SETTLED'];
    let totalSales = 0;
    let totalCommission = 0;

    const list = Array.isArray(txs) ? txs : (txs as any).data || [];
    list.forEach((t: any) => {
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
      agencyEarnings: totalSales - totalCommission,
    };
  }
}
