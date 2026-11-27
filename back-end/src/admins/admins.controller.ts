import { AuthUserId, AuthRole } from '../common/decorators/current-user.decorator';
import {
  Controller,
  Get,
  Put,
  Patch,
  Param,
  Body,
  Query,
  Req,
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
import { AdminsService } from './admins.service';
import { UpdateAdminDto, VerifyGuideDto, AuditLogFilterDto } from './dto';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiUserHeaders } from '../common/decorators/api-user-headers.decorator';
import { ApiRoleHeader } from '../common/decorators/api-role-header.decorator';
import { Role } from '../common/enums/role.enum';
import { RolesGuard } from '../common/guards/roles.guard';
import { ErrorResponseDto } from '../common/dto/error-response.dto';

@ApiTags('admins')
@Controller('admins')
@UseGuards(RolesGuard)
export class AdminsController {
  constructor(private readonly adminsService: AdminsService) {}

  @Get('audit-logs')
  @Roles(Role.ADMIN, Role.SUPERUSER)
  @ApiRoleHeader()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'View system audit logs with filters',
    description: 'Returns audit trail records filtered by category, author, date range, or search keyword.',
  })
  @ApiResponse({ status: 200, description: 'Audit logs returned successfully' })
  getAuditLogs(@Query() query: AuditLogFilterDto) {
    return this.adminsService.getAuditLogs(query);
  }

  @Patch('guides/:id/verify')
  @Roles(Role.ADMIN, Role.SUPERUSER)
  @ApiRoleHeader()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Set guide rate and verify credentials with uploaded proof',
    description: 'Allows Admin/Superuser to set a verified guide rate, years of experience, and inspect proof documents.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Guide ID' })
  @ApiResponse({ status: 200, description: 'Guide credentials verified and rate updated' })
  @ApiResponse({ status: 404, description: 'Guide not found' })
  verifyGuide(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: VerifyGuideDto,
    @Req() req: any,
    @AuthUserId() idHeader?: string,
  ) {
    const adminId = Number(req.user?.id || idHeader || 1);
    const adminName = req.user?.name || 'Administrator';
    return this.adminsService.verifyGuide(id, dto, adminId, adminName);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.SUPERUSER)
  @ApiUserHeaders()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get admin/superuser profile',
    description:
      'Returns the profile for the requesting admin or superuser. ' +
      'x-user-id must equal :id (self-scoped). Password is never returned.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Admin ID (must match x-user-id)' })
  @ApiResponse({ status: 200, description: 'Profile returned successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden — wrong role or mismatched ID', type: ErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Admin not found', type: ErrorResponseDto })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.adminsService.findOne(id);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.SUPERUSER)
  @ApiUserHeaders()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update admin/superuser profile',
    description:
      'Updates name and/or email for the requesting admin or superuser. ' +
      'x-user-id must equal :id (self-scoped). Role and password cannot be changed here.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Admin ID (must match x-user-id)' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 400, description: 'Validation error', type: ErrorResponseDto })
  @ApiResponse({ status: 403, description: 'Forbidden — wrong role or mismatched ID', type: ErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Admin not found', type: ErrorResponseDto })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAdminDto,
  ) {
    return this.adminsService.update(id, dto);
  }
}
