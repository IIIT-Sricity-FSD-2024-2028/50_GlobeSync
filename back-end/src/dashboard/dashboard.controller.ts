import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiUserHeaders } from '../common/decorators/api-user-headers.decorator';
import { ApiRoleHeader } from '../common/decorators/api-role-header.decorator';
import { Role } from '../common/enums/role.enum';

@ApiTags('dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('admin')
  @Roles(Role.SUPERUSER, Role.ADMIN)
  @ApiRoleHeader()
  @ApiOperation({ summary: 'Admin dashboard', description: 'High-level business metrics: trips, bookings, revenue, etc.' })
  @ApiResponse({ status: 200, description: 'Admin dashboard data' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  getAdminDashboard() {
    return this.dashboardService.getAdminDashboard();
  }

  @Get('superuser')
  @Roles(Role.SUPERUSER)
  @ApiRoleHeader()
  @ApiOperation({ summary: 'Superuser dashboard', description: 'System-wide overview: users by role, entity counts, totals.' })
  @ApiResponse({ status: 200, description: 'Superuser dashboard data' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  getSuperuserDashboard() {
    return this.dashboardService.getSuperuserDashboard();
  }

  @Get('traveler/:travelerId')
  @Roles(Role.SUPERUSER, Role.TRAVELER)
  @ApiUserHeaders()
  @ApiOperation({ summary: 'Traveler dashboard', description: 'Personal metrics: my trips, bookings, expenses, tickets, upcoming trips.' })
  @ApiParam({ name: 'travelerId', type: Number })
  @ApiResponse({ status: 200, description: 'Traveler dashboard data' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  getTravelerDashboard(@Param('travelerId', ParseIntPipe) travelerId: number) {
    return this.dashboardService.getTravelerDashboard(travelerId);
  }

  @Get('guide/:guideId')
  @Roles(Role.SUPERUSER, Role.GUIDE)
  @ApiUserHeaders()
  @ApiOperation({ summary: 'Guide dashboard', description: 'Assignment metrics: assigned trips, completed, pending, messages.' })
  @ApiParam({ name: 'guideId', type: Number })
  @ApiResponse({ status: 200, description: 'Guide dashboard data' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  getGuideDashboard(@Param('guideId', ParseIntPipe) guideId: number) {
    return this.dashboardService.getGuideDashboard(guideId);
  }

  @Get('support')
  @Roles(Role.SUPERUSER, Role.SUPPORT)
  @ApiRoleHeader()
  @ApiOperation({ summary: 'Support dashboard', description: 'Ticket & refund metrics: total, open, resolved, refunds.' })
  @ApiResponse({ status: 200, description: 'Support dashboard data' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  getSupportDashboard() {
    return this.dashboardService.getSupportDashboard();
  }
}
