import { AuthUserId, AuthRole } from '../common/decorators/current-user.decorator';
import {
  Controller,
  Get,
  Put,
  Patch,
  Post,
  Delete,
  Param,
  Body,
  Query,
  Headers,
  ParseIntPipe,
  UseGuards,
  Req,
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
  UpdatePolicyDto,
  UpdateStaffStatusDto,
} from './dto';
import { PolicyService } from '../policy/policy.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiUserHeaders } from '../common/decorators/api-user-headers.decorator';
import { Role } from '../common/enums/role.enum';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { admins } from '../data';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { AuditLogFilterDto } from '../admins/dto/audit-log-filter.dto';

@ApiTags('system-config')
@Controller()
@UseGuards(RolesGuard)
export class SystemConfigController {
  constructor(
    private readonly systemConfigService: SystemConfigService,
    private readonly policyService: PolicyService,
  ) {}

  // =========================================================================
  // Policy & Cancellation Configuration
  // =========================================================================

  @Get('system-config/policy')
  @Roles(
    Role.TRAVELER,
    Role.GUIDE,
    Role.AGENCY,
    Role.ADMIN,
    Role.SUPERUSER,
    Role.SUPPORT,
  )
  @ApiUserHeaders()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current centralized business policy configuration' })
  @ApiResponse({ status: 200, description: 'Policy configuration returned successfully' })
  getPolicy() {
    return this.policyService.getConfig();
  }

  @Put('system-config/policy')
  @Roles(Role.SUPERUSER)
  @ApiUserHeaders()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update centralized business policy configuration (Superuser only)' })
  @ApiResponse({ status: 200, description: 'Policy configuration updated successfully' })
  @ApiResponse({ status: 400, description: 'Validation error (percentages must be 0-100)', type: ErrorResponseDto })
  @ApiResponse({ status: 403, description: 'Forbidden — Superuser role required', type: ErrorResponseDto })
  updatePolicy(
    @Body() dto: UpdatePolicyDto,
    @AuthUserId() userId?: string,
  ) {
    return this.policyService.updateConfig(dto);
  }

  // =========================================================================
  // Platform Operational Rules
  // =========================================================================

  @Get('system-config/rules')
  @Roles(
    Role.TRAVELER,
    Role.GUIDE,
    Role.AGENCY,
    Role.ADMIN,
    Role.SUPERUSER,
    Role.SUPPORT,
  )
  @ApiUserHeaders()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get global platform operational rules and policy settings' })
  @ApiResponse({ status: 200, description: 'Rules returned successfully' })
  getRules() {
    return this.systemConfigService.getRules();
  }

  @Put('system-config/rules')
  @Roles(Role.SUPERUSER)
  @ApiUserHeaders()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update platform rules (Superuser only)' })
  @ApiResponse({ status: 200, description: 'Rules updated successfully' })
  @ApiResponse({ status: 400, description: 'Validation error', type: ErrorResponseDto })
  @ApiResponse({ status: 403, description: 'Forbidden — Superuser role required', type: ErrorResponseDto })
  updateRules(
    @Body() dto: UpdateRulesDto,
    @AuthUserId() userId?: string,
  ) {
    const author = this.resolveAuthorName(userId);
    return this.systemConfigService.updateRules(dto, author);
  }

  @Get('system-config/history')
  @Roles(Role.SUPERUSER, Role.ADMIN)
  @ApiUserHeaders()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get settings change history' })
  @ApiResponse({ status: 200, description: 'Change history returned successfully' })
  getHistory(@Query() query: PaginationQueryDto) {
    return this.systemConfigService.getSettingsChangeHistory(query);
  }

  // =========================================================================
  // Payment Gateways & Methods
  // =========================================================================

  @Get('system-config/payment-methods')
  @Roles(
    Role.TRAVELER,
    Role.GUIDE,
    Role.AGENCY,
    Role.ADMIN,
    Role.SUPERUSER,
    Role.SUPPORT,
  )
  @ApiUserHeaders()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all payment channels and gateway connectors' })
  @ApiResponse({ status: 200, description: 'Payment methods returned' })
  getPaymentMethods() {
    return this.systemConfigService.getPaymentMethods();
  }

  @Put('system-config/payment-methods/:id')
  @Roles(Role.SUPERUSER)
  @ApiUserHeaders()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update or toggle payment gateway config (Superuser only)' })
  @ApiParam({ name: 'id', type: String, description: 'Payment method ID' })
  @ApiResponse({ status: 200, description: 'Payment method updated' })
  @ApiResponse({ status: 400, description: 'Blocked — cannot disable all native channels', type: ErrorResponseDto })
  @ApiResponse({ status: 403, description: 'Forbidden — Superuser role required', type: ErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Payment method not found', type: ErrorResponseDto })
  updatePaymentMethod(
    @Param('id') id: string,
    @Body() dto: UpdatePaymentMethodDto,
    @AuthUserId() userId?: string,
  ) {
    const author = this.resolveAuthorName(userId);
    return this.systemConfigService.updatePaymentMethod(id, dto, author);
  }

  // =========================================================================
  // Third-Party Integrations
  // =========================================================================

  @Get('system-config/integrations')
  @Roles(Role.SUPERUSER, Role.ADMIN)
  @ApiUserHeaders()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List third-party integrations and service connectors' })
  @ApiResponse({ status: 200, description: 'Integrations list returned' })
  @ApiResponse({ status: 403, description: 'Forbidden', type: ErrorResponseDto })
  getIntegrations() {
    return this.systemConfigService.getIntegrations();
  }

  @Put('system-config/integrations/:id')
  @Roles(Role.SUPERUSER)
  @ApiUserHeaders()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update integration status or credentials (Superuser only)' })
  @ApiParam({ name: 'id', type: Number, description: 'Integration connector ID' })
  @ApiResponse({ status: 200, description: 'Integration updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden — Superuser role required', type: ErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Integration not found', type: ErrorResponseDto })
  updateIntegration(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateIntegrationDto,
    @AuthUserId() userId?: string,
  ) {
    const author = this.resolveAuthorName(userId);
    return this.systemConfigService.updateIntegration(id, dto, author);
  }

  // =========================================================================
  // System Audit Logs
  // =========================================================================

  @Get('system-config/audit-logs')
  @Roles(Role.SUPERUSER, Role.ADMIN)
  @ApiUserHeaders()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get system policy and configuration change audit trail with filters' })
  @ApiResponse({ status: 200, description: 'Audit trail returned successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden', type: ErrorResponseDto })
  getAuditLogs(@Query() query: AuditLogFilterDto) {
    return this.systemConfigService.getAuditLogs(query);
  }

  // =========================================================================
  // Authorized Superuser Staff Administration (Create / Deactivate Staff)
  // =========================================================================

  @Get('super/admins')
  @Roles(Role.SUPERUSER)
  @ApiUserHeaders()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all platform administrators (Superuser only)' })
  @ApiResponse({ status: 200, description: 'Administrators list returned' })
  @ApiResponse({ status: 403, description: 'Forbidden — Superuser role required', type: ErrorResponseDto })
  getAdmins(@Query() query: PaginationQueryDto) {
    return this.systemConfigService.getAdmins(query);
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
    @AuthUserId() userId?: string,
  ) {
    const author = this.resolveAuthorName(userId);
    return this.systemConfigService.createAdmin(dto, author);
  }

  @Patch('super/admins/:id/status')
  @Roles(Role.SUPERUSER)
  @ApiUserHeaders()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Activate or deactivate an administrator staff account (Superuser only)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Administrator status updated' })
  updateAdminStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStaffStatusDto,
    @Req() req: any,
    @AuthUserId() userId?: string,
  ) {
    const requesterId = Number(req.user?.id || userId || 1);
    const author = this.resolveAuthorName(userId);
    return this.systemConfigService.updateAdminStatus(id, dto.status, requesterId, author);
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
    @AuthUserId() userId?: string,
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
  @ApiResponse({ status: 200, description: 'Support users list returned' })
  @ApiResponse({ status: 403, description: 'Forbidden', type: ErrorResponseDto })
  getSupportUsers(@Query() query: PaginationQueryDto) {
    return this.systemConfigService.getSupportUsers(query);
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
    @AuthUserId() userId?: string,
  ) {
    const author = this.resolveAuthorName(userId);
    return this.systemConfigService.createSupportUser(dto, author);
  }

  @Patch('super/support-users/:id/status')
  @Roles(Role.SUPERUSER, Role.ADMIN)
  @ApiUserHeaders()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Activate or deactivate a customer care staff account' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Support user status updated' })
  updateSupportUserStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStaffStatusDto,
    @AuthUserId() userId?: string,
  ) {
    const author = this.resolveAuthorName(userId);
    return this.systemConfigService.updateSupportUserStatus(id, dto.status, author);
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
    @AuthUserId() userId?: string,
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
