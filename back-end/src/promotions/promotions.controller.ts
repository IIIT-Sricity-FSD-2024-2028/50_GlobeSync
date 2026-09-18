import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PromotionsService } from './promotions.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiRoleHeader } from '../common/decorators/api-role-header.decorator';
import { ApiUserHeaders } from '../common/decorators/api-user-headers.decorator';
import { Role } from '../common/enums/role.enum';
import { ErrorResponseDto } from '../common/dto/error-response.dto';

@ApiTags('promotions')
@Controller('api')
@UseGuards(RolesGuard)
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Get('promotions')
  @Roles(Role.TRAVELER, Role.GUIDE, Role.AGENCY, Role.ADMIN, Role.SUPERUSER, Role.SUPPORT)
  @ApiRoleHeader()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all active promotions/featured listings (all authenticated roles)' })
  @ApiResponse({ status: 200, description: 'List of promotions returned' })
  @ApiResponse({ status: 403, description: 'Forbidden — unauthenticated or unknown role', type: ErrorResponseDto })
  getAllPromotions() {
    return this.promotionsService.getAllPromotions();
  }

  @Post('promotions')
  @Roles(Role.AGENCY, Role.ADMIN, Role.SUPERUSER)
  @ApiUserHeaders()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a promotion / featured listing',
    description:
      'AGENCY role: x-user-id must match body.agencyId. ADMIN/SUPERUSER may create for any agency.',
  })
  @ApiResponse({ status: 201, description: 'Promotion created' })
  @ApiResponse({ status: 403, description: 'Forbidden — wrong role or mismatched agency ID', type: ErrorResponseDto })
  createPromotion(
    @Body() body: {
      agencyId: number;
      packageId: number;
      type: 'HOMEPAGE' | 'SEARCH_RESULT';
      price: number;
      paymentRef: string;
    },
  ) {
    return this.promotionsService.createPromotion(
      body.agencyId,
      body.packageId,
      body.type,
      body.price,
      body.paymentRef,
    );
  }
}

