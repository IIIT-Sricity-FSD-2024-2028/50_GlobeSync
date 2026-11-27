import { Controller, Get, Post, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiRoleHeader } from '../common/decorators/api-role-header.decorator';
import { ApiUserHeaders } from '../common/decorators/api-user-headers.decorator';
import { Role } from '../common/enums/role.enum';
import { ErrorResponseDto } from '../common/dto/error-response.dto';

@ApiTags('subscriptions')
@Controller('api')
@UseGuards(RolesGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('subscriptions/plans')
  @Roles(Role.TRAVELER, Role.GUIDE, Role.AGENCY, Role.ADMIN, Role.SUPERUSER, Role.SUPPORT)
  @ApiRoleHeader()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all available subscription plans (all authenticated roles)' })
  @ApiResponse({ status: 200, description: 'List of subscription plans returned' })
  @ApiResponse({ status: 403, description: 'Forbidden — unauthenticated or unknown role', type: ErrorResponseDto })
  getPlans() {
    return this.subscriptionsService.getAllPlans();
  }

  @Get('agencies/:id/subscription')
  @Roles(Role.AGENCY, Role.ADMIN, Role.SUPERUSER)
  @ApiUserHeaders()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get active subscription for a specific agency',
    description:
      'AGENCY role: x-user-id must match :id. ADMIN/SUPERUSER may access any agency.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Agency ID' })
  @ApiResponse({ status: 200, description: 'Active subscription returned (or { status: "NONE" })' })
  @ApiResponse({ status: 403, description: 'Forbidden — wrong role or mismatched agency ID', type: ErrorResponseDto })
  getAgencySubscription(@Param('id', ParseIntPipe) id: number) {
    return this.subscriptionsService.getAgencySubscription(id) || { status: 'NONE' };
  }

  @Post('subscriptions')
  @Roles(Role.AGENCY, Role.ADMIN, Role.SUPERUSER)
  @ApiUserHeaders()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Subscribe an agency to a plan',
    description:
      'AGENCY role: x-user-id must match body.agencyId. ADMIN/SUPERUSER may subscribe any agency.',
  })
  @ApiResponse({ status: 201, description: 'Subscription created' })
  @ApiResponse({ status: 403, description: 'Forbidden — wrong role or mismatched agency ID', type: ErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Plan not found', type: ErrorResponseDto })
  subscribe(@Body() body: { agencyId: number; planId: number; paymentRef: string }) {
    return this.subscriptionsService.subscribe(body.agencyId, body.planId, body.paymentRef);
  }
}

