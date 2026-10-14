import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Param,
  Body,
  Headers,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SystemConfigService } from './system-config.service';
import {
  UpdateRulesDto,
  UpdatePaymentMethodDto,
  UpdateIntegrationDto,
  CreateSystemAdminDto,
  CreateSystemSupportDto,
} from './dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiUserHeaders } from '../common/decorators/api-user-headers.decorator';
import { Role } from '../common/enums/role.enum';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { admins } from '../data';

@ApiTags('system-config')
@Controller()
@UseGuards(RolesGuard)
export class SystemConfigController {
  constructor(private readonly systemConfigService: SystemConfigService) {}

  // =========================================================================
  // Platform Operational Rules
  // =========================================================================

  @Get('system-config/rules')
  @ApiOperation({ summary: 'Get global platform operational rules and policy settings' })
  @ApiResponse({ status: 200, description: 'Rules returned successfully' })
  getRules() {
    return this.systemConfigService.getRules();
  }

  @Put('system-config/rules')
  @Roles(Role.SUPERUSER)
  @ApiUserHeaders()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update platform operational rules (Superuser only)' })
  @ApiResponse({ status: 200, description: 'Rules updated successfully' })
  @ApiResponse({ status: 400, description: 'Validation error', type: ErrorResponseDto })
  @ApiResponse({ status: 403, description: 'Forbidden — Superuser role required', type: ErrorResponseDto })
  updateRules(
    @Body() dto: UpdateRulesDto,
    @Headers('x-user-id') userId?: string,
  ) {
    const author = this.resolveAuthorName(userId);
    return this.systemConfigService.updateRules(dto, author);
  }

  // =========================================================================
  // Payment Methods & Gateway Configuration
  // =========================================================================

  @Get('system-config/payment-methods')
  @ApiOperation({ summary: 'Get configured checkout payment methods and gateway statuses' })
  @ApiResponse({ status: 200, description: 'Payment methods returned successfully' })
  getPaymentMethods() {
    return this.systemConfigService.getPaymentMethods();
  }

  @Put('system-config/payment-methods/:id')
  @Roles(Role.SUPERUSER)
  @ApiUserHeaders()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update payment method status or configuration (Superuser only)' })
  @ApiParam({ name: 'id', type: String, description: 'Payment method ID (e.g. pm-card, pm-upi)' })
  @ApiResponse({ status: 200, description: 'Payment method updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request — validation or last method protection', type: ErrorResponseDto })
  @ApiResponse({ status: 403, description: 'Forbidden — Superuser role required', type: ErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Payment method not found', type: ErrorResponseDto })
  updatePaymentMethod(
    @Param('id') id: string,
    @Body() dto: UpdatePaymentMethodDto,
    @Headers('x-user-id') userId?: string,
  ) {
    const author = this.resolveAuthorName(userId);
    return this.systemConfigService.updatePaymentMethod(id, dto, author);
  }

  // =========================================================================
  // Third-Party Integrations & Connectors
  // =========================================================================

  @Get('system-config/integrations')
  @Roles(Role.SUPERUSER, Role.ADMIN)
  @ApiUserHeaders()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get third-party integration connectors and health states (Admin/Superuser)' })
  @ApiResponse({ status: 200, description: 'Integrations list returned successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden', type: ErrorResponseDto })
  getIntegrations() {
    return this.systemConfigService.getIntegrations();
  }

  @Put('system-config/integrations/:id')
  @Roles(Role.SUPERUSER)
  @ApiUserHeaders()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update integration connector status (Superuser only)' })
  @ApiParam({ name: 'id', type: Number, description: 'Integration service numeric ID' })
  @ApiResponse({ status: 200, description: 'Integration updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden — Superuser role required', type: ErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Integration not found', type: ErrorResponseDto })
  updateIntegration(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateIntegrationDto,
    @Headers('x-user-id') userId?: string,
  ) {
    const author = this.resolveAuthorName(userId);
    return this.systemConfigService.updateIntegration(id, dto, author);
  }

  // =========================================================================
  // System Audit Trail
  // =========================================================================

  @Get('system-config/audit-logs')
  @Roles(Role.SUPERUSER, Role.ADMIN)
  @ApiUserHeaders()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get system policy and configuration change audit trail (Admin/Superuser)' })
  @ApiResponse({ status: 200, description: 'Audit trail returned successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden', type: ErrorResponseDto })
  getAuditLogs() {
    return this.systemConfigService.getAuditLogs();
  }

  // =========================================================================
  // Authorized Superuser Staff Administration (Full System Control)
  // =========================================================================

  @Get('super/admins')
  @Roles(Role.SUPERUSER)
  @ApiUserHeaders()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all platform administrators (Superuser only)' })
  @ApiResponse({ status: 200, description: 'Administrators list returned (passwords excluded)' })
  @ApiResponse({ status: 403, description: 'Forbidden — Superuser role required', type: ErrorResponseDto })
  getAdmins() {
    return this.systemConfigService.getAdmins();
  }

  @Post('super/admins')
  @Roles(Role.SUPERUSER)
  @ApiUserHeaders()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Provision a new administrator or superuser (Superuser only)' })
  @ApiResponse({ status: 201, description: 'Administrator created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error or duplicate email', type: ErrorResponseDto })
  @ApiResponse({ status: 403, description: 'Forbidden — Superuser role required', type: ErrorResponseDto })
  createAdmin(
    @Body() dto: CreateSystemAdminDto,
    @Headers('x-user-id') userId?: string,
  ) {
    const author = this.resolveAuthorName(userId);
    return this.systemConfigService.createAdmin(dto, author);
  }

  @Delete('super/admins/:id')
  @Roles(Role.SUPERUSER)
  @ApiUserHeaders()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove an administrator account (Superuser only)' })
  @ApiParam({ name: 'id', type: Number, description: 'Admin ID to remove' })
  @ApiResponse({ status: 200, description: 'Administrator removed successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete self or last superuser', type: ErrorResponseDto })
  @ApiResponse({ status: 403, description: 'Forbidden — Superuser role required', type: ErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Administrator not found', type: ErrorResponseDto })
  deleteAdmin(
    @Param('id', ParseIntPipe) id: number,
    @Headers('x-user-id') userId?: string,
  ) {
    const requesterId = userId ? Number.parseInt(userId, 10) : -1;
    const author = this.resolveAuthorName(userId);
    return this.systemConfigService.deleteAdmin(id, requesterId, author);
  }

  @Get('super/support-users')
  @Roles(Role.SUPERUSER, Role.ADMIN)
  @ApiUserHeaders()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List customer care support accounts (Admin/Superuser)' })
  @ApiResponse({ status: 200, description: 'Support users list returned (passwords excluded)' })
  @ApiResponse({ status: 403, description: 'Forbidden', type: ErrorResponseDto })
  getSupportUsers() {
    return this.systemConfigService.getSupportUsers();
  }

  @Post('super/support-users')
  @Roles(Role.SUPERUSER, Role.ADMIN)
  @ApiUserHeaders()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Provision a new customer support user account (Admin/Superuser)' })
  @ApiResponse({ status: 201, description: 'Support user created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error or duplicate email', type: ErrorResponseDto })
  @ApiResponse({ status: 403, description: 'Forbidden', type: ErrorResponseDto })
  createSupportUser(
    @Body() dto: CreateSystemSupportDto,
    @Headers('x-user-id') userId?: string,
  ) {
    const author = this.resolveAuthorName(userId);
    return this.systemConfigService.createSupportUser(dto, author);
  }

  @Delete('super/support-users/:id')
  @Roles(Role.SUPERUSER)
  @ApiUserHeaders()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a customer support user account (Superuser only)' })
  @ApiParam({ name: 'id', type: Number, description: 'Support careId to remove' })
  @ApiResponse({ status: 200, description: 'Support user removed successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden — Superuser role required', type: ErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Support user not found', type: ErrorResponseDto })
  deleteSupportUser(
    @Param('id', ParseIntPipe) id: number,
    @Headers('x-user-id') userId?: string,
  ) {
    const author = this.resolveAuthorName(userId);
    return this.systemConfigService.deleteSupportUser(id, author);
  }

  private resolveAuthorName(rawUserId?: string): string {
    if (!rawUserId) return 'Super User';
    const id = Number.parseInt(rawUserId, 10);
    const foundAdmin = admins.find((a) => a.adminId === id);
    return foundAdmin ? foundAdmin.name : 'Super User';
  }
}
