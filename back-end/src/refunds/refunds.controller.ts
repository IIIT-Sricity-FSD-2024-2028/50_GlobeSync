import { Controller, Get, Post, Patch, Param, Body, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { RefundsService } from './refunds.service';
import { CreateRefundDto, UpdateRefundStatusDto } from './dto';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiUserHeaders } from '../common/decorators/api-user-headers.decorator';
import { ApiRoleHeader } from '../common/decorators/api-role-header.decorator';
import { Role } from '../common/enums/role.enum';

@ApiTags('refunds')
@Controller('refunds')
export class RefundsController {
  constructor(private readonly refundsService: RefundsService) {}

  @Get()
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.SUPPORT)
  @ApiRoleHeader()
  @ApiOperation({ summary: 'Get all refunds' })
  @ApiResponse({ status: 200, description: 'List of all refunds' })
  findAll() { return this.refundsService.findAll(); }

  @Get(':id')
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.TRAVELER, Role.SUPPORT)
  @ApiUserHeaders()
  @ApiOperation({ summary: 'Get refund by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Refund found' })
  @ApiResponse({ status: 404, description: 'Refund not found' })
  findOne(@Param('id', ParseIntPipe) id: number) { return this.refundsService.findOne(id); }

  @Post()
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.TRAVELER, Role.SUPPORT)
  @ApiUserHeaders()
  @ApiOperation({ summary: 'Create a refund request' })
  @ApiResponse({ status: 201, description: 'Refund created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  create(@Body() dto: CreateRefundDto) { return this.refundsService.create(dto); }

  @Patch(':id/status')
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.SUPPORT)
  @ApiRoleHeader()
  @ApiOperation({ summary: 'Update refund status' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Refund status updated' })
  @ApiResponse({ status: 404, description: 'Refund not found' })
  updateStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRefundStatusDto) {
    return this.refundsService.updateStatus(id, dto.refundStatus);
  }
}
