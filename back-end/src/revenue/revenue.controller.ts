import { Controller, Get, Post, Body, Param, ParseIntPipe, Put, UseGuards } from '@nestjs/common';
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

@ApiTags('revenue')
@Controller('api')
@UseGuards(RolesGuard)
export class RevenueController {
  constructor(private readonly revenueService: RevenueService) {}

  // ================= ADMIN ROUTES =================

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
  @ApiOperation({ summary: 'Get all revenue transactions (Admin/Superuser only)' })
  @ApiResponse({ status: 200, description: 'Transaction list returned' })
  @ApiResponse({ status: 403, description: 'Forbidden', type: ErrorResponseDto })
  getAllTransactions() {
    return this.revenueService.getAllTransactions();
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
  @ApiResponse({ status: 403, description: 'Forbidden — Superuser only', type: ErrorResponseDto })
  updateConfig(
    @Param('key') key: string,
    @Body('value') value: number,
  ) {
    return this.revenueService.updateConfig(key, value);
  }

  // ================= AGENCY ROUTES =================

  @Get('agencies/:id/revenue')
  @Roles(Role.AGENCY, Role.ADMIN, Role.SUPERUSER)
  @ApiUserHeaders()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get revenue for a specific agency',
    description:
      'AGENCY role: x-user-id must match :id. ADMIN/SUPERUSER may access any agency.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Agency ID' })
  @ApiResponse({ status: 200, description: 'Agency revenue returned' })
  @ApiResponse({ status: 403, description: 'Forbidden — wrong role or mismatched agency ID', type: ErrorResponseDto })
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
      agencyEarnings: totalSales - totalCommission,
    };
  }
}

