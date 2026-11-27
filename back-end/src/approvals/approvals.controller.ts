import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  ParseIntPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ApprovalsService } from './approvals.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('approvals')
@Controller('approvals')
@UseGuards(RolesGuard)
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  @Get()
  @Roles(Role.SUPERUSER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List approval requests (filterable by status: PENDING, APPROVED, REJECTED)' })
  findAll(@Query('status') status?: string) {
    return this.approvalsService.findAll(status);
  }

  @Get(':id')
  @Roles(Role.SUPERUSER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get approval request by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.approvalsService.findOne(id);
  }

  @Post(':id/approve')
  @Roles(Role.SUPERUSER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve an administrative change request (Superuser only)' })
  approve(
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason: string,
    @CurrentUser() user: any,
  ) {
    return this.approvalsService.processDecision(id, {
      decision: 'APPROVE',
      reviewer: {
        userId: Number(user?.userId || user?.id || 1),
        name: user?.name || user?.email || 'Super Admin',
        role: String(user?.role || 'superuser').toLowerCase(),
      },
      reason,
    });
  }

  @Post(':id/reject')
  @Roles(Role.SUPERUSER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject an administrative change request (Superuser only)' })
  reject(
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason: string,
    @CurrentUser() user: any,
  ) {
    return this.approvalsService.processDecision(id, {
      decision: 'REJECT',
      reviewer: {
        userId: Number(user?.userId || user?.id || 1),
        name: user?.name || user?.email || 'Super Admin',
        role: String(user?.role || 'superuser').toLowerCase(),
      },
      reason,
    });
  }
}
