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
import { AdminsService } from './admins.service';
import { UpdateAdminDto } from './dto';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiUserHeaders } from '../common/decorators/api-user-headers.decorator';
import { Role } from '../common/enums/role.enum';
import { RolesGuard } from '../common/guards/roles.guard';
import { ErrorResponseDto } from '../common/dto/error-response.dto';

/**
 * Profile endpoints for admin and superuser accounts.
 *
 * Both GET and PUT are self-scoped: the caller's x-user-id must match
 * the :id parameter. This is enforced inside RolesGuard (AdminsController case).
 * No GET-all, POST, or DELETE endpoints are exposed.
 */
@ApiTags('admins')
@Controller('admins')
@UseGuards(RolesGuard)
export class AdminsController {
  constructor(private readonly adminsService: AdminsService) {}

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
