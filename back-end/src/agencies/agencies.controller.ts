import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Patch,
  Param,
  UseGuards,
  ParseIntPipe,
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

  @Get()
  @Roles(Role.ADMIN, Role.SUPERUSER)
  @ApiRoleHeader()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all agencies (Admin/Superuser only)' })
  @ApiResponse({ status: 200, description: 'Return all agencies' })
  @ApiResponse({ status: 403, description: 'Forbidden', type: ErrorResponseDto })
  findAll() {
    return this.agenciesService.findAll();
  }

  @Get(':id')
  @Roles(Role.AGENCY, Role.ADMIN, Role.SUPERUSER)
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
  @ApiOperation({ summary: 'Update agency status & commission (Admin/Superuser only)' })
  @ApiResponse({ status: 200, description: 'Status updated' })
  @ApiResponse({ status: 403, description: 'Forbidden', type: ErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Not Found', type: ErrorResponseDto })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAgencyStatusDto: UpdateAgencyStatusDto,
  ) {
    return this.agenciesService.updateStatus(id, updateAgencyStatusDto);
  }

  @Patch(':id')
  @Roles(Role.AGENCY, Role.ADMIN, Role.SUPERUSER)
  @ApiUserHeaders()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update agency profile (Agency only ownership checked, or Admin/Superuser)' })
  @ApiResponse({ status: 200, description: 'Agency updated' })
  @ApiResponse({ status: 403, description: 'Forbidden', type: ErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Not Found', type: ErrorResponseDto })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAgencyDto: UpdateAgencyDto,
  ) {
    return this.agenciesService.update(id, updateAgencyDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.SUPERUSER)
  @ApiRoleHeader()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an agency (Admin/Superuser only)' })
  @ApiResponse({ status: 200, description: 'Agency deleted' })
  @ApiResponse({ status: 404, description: 'Not Found', type: ErrorResponseDto })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.agenciesService.remove(id);
  }
}
