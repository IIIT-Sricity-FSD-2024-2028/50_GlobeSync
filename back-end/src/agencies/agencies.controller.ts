import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AgenciesService } from './agencies.service';
import { CreateAgencyDto, UpdateAgencyDto, UpdateAgencyStatusDto, CreateDirectAgencyDto } from './dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { ApiUserHeaders } from '../common/decorators/api-user-headers.decorator';
import { ApiRoleHeader } from '../common/decorators/api-role-header.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@ApiTags('agencies')
@Controller('agencies')
@UseGuards(RolesGuard)
export class AgenciesController {
  constructor(private readonly agenciesService: AgenciesService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new agency (public)' })
  @ApiResponse({ status: 201, description: 'Agency registered successfully (pending status)' })
  @ApiResponse({ status: 400, description: 'Validation error / Email in use', type: ErrorResponseDto })
  create(@Body() createAgencyDto: CreateAgencyDto) {
    return this.agenciesService.create(createAgencyDto);
  }

  @Post()
  @Roles(Role.ADMIN, Role.SUPERUSER)
  @ApiRoleHeader()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new agency directly (Admin/Superuser only)' })
  @ApiResponse({ status: 201, description: 'Agency created' })
  @ApiResponse({ status: 400, description: 'Validation error', type: ErrorResponseDto })
  createDirect(@Body() createDirectAgencyDto: CreateDirectAgencyDto) {
    return this.agenciesService.createDirect(createDirectAgencyDto);
  }

  @Get('lookup')
  @Roles(Role.TRAVELER, Role.GUIDE, Role.ADMIN, Role.SUPERUSER, Role.SUPPORT)
  @ApiRoleHeader()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get lightweight list of agencies for lookup' })
  @ApiResponse({ status: 200, description: 'Return agency ID and name pairs' })
  findAllLookup() {
    return this.agenciesService.findAllLookup();
  }

  @Get()
  @Roles(Role.ADMIN, Role.SUPERUSER, Role.SUPPORT)
  @ApiRoleHeader()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all agencies with pagination, search, and sorting' })
  @ApiResponse({ status: 200, description: 'Return all agencies' })
  @ApiResponse({ status: 403, description: 'Forbidden', type: ErrorResponseDto })
  findAll(@Query() query: PaginationQueryDto) {
    return this.agenciesService.findAll(query);
  }

  @Get(':id')
  @Roles(Role.AGENCY, Role.ADMIN, Role.SUPERUSER, Role.SUPPORT)
  @ApiUserHeaders()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a specific agency by ID' })
  @ApiResponse({ status: 200, description: 'Return the agency' })
  @ApiResponse({ status: 403, description: 'Forbidden (not owner)', type: ErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Not Found', type: ErrorResponseDto })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.agenciesService.findOne(id);
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN, Role.SUPERUSER)
  @ApiRoleHeader()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update agency status with required reason (Admin/Superuser only)' })
  @ApiResponse({ status: 200, description: 'Status updated' })
  @ApiResponse({ status: 403, description: 'Forbidden', type: ErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Not Found', type: ErrorResponseDto })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAgencyStatusDto: UpdateAgencyStatusDto,
    @Req() req: any,
  ) {
    const author = req.user?.name || req.user?.email || 'Admin';
    return this.agenciesService.updateStatus(id, updateAgencyStatusDto, author);
  }

  @Patch(':id')
  @Roles(Role.AGENCY, Role.ADMIN, Role.SUPERUSER)
  @ApiUserHeaders()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an agency profile' })
  @ApiResponse({ status: 200, description: 'Agency updated successfully' })
  @ApiResponse({ status: 400, description: 'Validation error / Email in use', type: ErrorResponseDto })
  @ApiResponse({ status: 403, description: 'Forbidden (not owner)', type: ErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Not Found', type: ErrorResponseDto })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAgencyDto: UpdateAgencyDto,
  ) {
    return this.agenciesService.update(id, updateAgencyDto);
  }

  @Delete(':id')
  @Roles(Role.SUPERUSER)
  @ApiRoleHeader()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an agency (Superuser only)' })
  @ApiResponse({ status: 200, description: 'Agency deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden (Superuser only)', type: ErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Not Found', type: ErrorResponseDto })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.agenciesService.remove(id);
  }
}
