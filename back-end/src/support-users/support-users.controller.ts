import {
  Controller,
  Get,
  Put,
  Param,
  Body,
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
import { SupportUsersService } from './support-users.service';
import { UpdateSupportUserDto } from './dto';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiUserHeaders } from '../common/decorators/api-user-headers.decorator';
import { Role } from '../common/enums/role.enum';
import { RolesGuard } from '../common/guards/roles.guard';
import { ErrorResponseDto } from '../common/dto/error-response.dto';

/**
 * Profile endpoints for support-user (customer-care) accounts.
 *
 * GET /support-users/:id  — Role.SUPPORT may read own record (x-user-id == :id).
 *                           Role.ADMIN and Role.SUPERUSER may read any record.
 * PUT /support-users/:id  — Role.SUPPORT may update own record (x-user-id == :id).
 *                           Role.ADMIN and Role.SUPERUSER may update any record.
 *
 * Ownership enforcement for SUPPORT is handled inside RolesGuard
 * (SupportUsersController case in the switch).
 * No GET-all, POST, or DELETE endpoints are exposed.
 */
@ApiTags('support-users')
@Controller('support-users')
@UseGuards(RolesGuard)
export class SupportUsersController {
  constructor(private readonly supportUsersService: SupportUsersService) {}

  @Get(':id')
  @Roles(Role.SUPPORT, Role.ADMIN, Role.SUPERUSER)
  @ApiUserHeaders()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get support-user profile',
    description:
      'Returns the profile for a support user. ' +
      'SUPPORT role: x-user-id must equal :id (self-scoped). ' +
      'ADMIN and SUPERUSER may access any record. ' +
      'The careId is used as the record identifier. Password is never returned.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'careId — support user identifier' })
  @ApiResponse({ status: 200, description: 'Profile returned successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden — wrong role or mismatched careId', type: ErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Support user not found', type: ErrorResponseDto })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.supportUsersService.findOne(id);
  }

  @Put(':id')
  @Roles(Role.SUPPORT, Role.ADMIN, Role.SUPERUSER)
  @ApiUserHeaders()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update support-user profile',
    description:
      'Updates name, contact, and/or email for a support user. ' +
      'SUPPORT role: x-user-id must equal :id (self-scoped). ' +
      'ADMIN and SUPERUSER may update any record. ' +
      'Role and password cannot be changed through this endpoint.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'careId — support user identifier' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 400, description: 'Validation error', type: ErrorResponseDto })
  @ApiResponse({ status: 403, description: 'Forbidden — wrong role or mismatched careId', type: ErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Support user not found', type: ErrorResponseDto })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSupportUserDto,
  ) {
    return this.supportUsersService.update(id, dto);
  }
}
