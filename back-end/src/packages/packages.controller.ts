import { AuthUserId, AuthRole } from '../common/decorators/current-user.decorator';
import { Controller, Get, Post, Put, Delete, Param, Body, Query, ParseIntPipe, Req, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { PackagesService } from './packages.service';
import { CreatePackageDto, UpdatePackageDto } from './dto';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiRoleHeader } from '../common/decorators/api-role-header.decorator';
import { ApiUserHeaders } from '../common/decorators/api-user-headers.decorator';
import { Role } from '../common/enums/role.enum';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@ApiTags('packages')
@Controller('packages')
export class PackagesController {
  constructor(private readonly packagesService: PackagesService) {}

  @Get()
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.TRAVELER, Role.GUIDE, Role.AGENCY)
  @ApiRoleHeader()
  @ApiOperation({ summary: 'Get all packages with pagination, search, and sorting' })
  @ApiResponse({ status: 200, description: 'List of packages returned successfully' })
  findAll(@Query() query: PaginationQueryDto) {
    return this.packagesService.findAll(query);
  }

  @Get('agency/:agencyId')
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.TRAVELER, Role.GUIDE, Role.AGENCY)
  @ApiRoleHeader()
  @ApiOperation({ summary: 'Get packages by agency ID' })
  @ApiParam({ name: 'agencyId', type: Number })
  @ApiResponse({ status: 200, description: 'List of packages for agency' })
  findByAgency(
    @Param('agencyId', ParseIntPipe) agencyId: number,
    @Query() query: PaginationQueryDto,
  ) {
    return this.packagesService.findByAgency(agencyId, query);
  }

  @Get(':id')
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.TRAVELER, Role.GUIDE, Role.AGENCY)
  @ApiRoleHeader()
  @ApiOperation({ summary: 'Get package by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Package ID' })
  @ApiResponse({ status: 200, description: 'Package found' })
  @ApiResponse({ status: 404, description: 'Package not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.packagesService.findOne(id);
  }

  @Post()
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.AGENCY)
  @ApiUserHeaders()
  @ApiOperation({
    summary: 'Create a travel package',
    description: 'Creates a package. Only APPROVED agencies can publish packages (enforces subscription tier limits).',
  })
  @ApiResponse({ status: 201, description: 'Package created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 403, description: 'Forbidden — not approved or subscription limit exceeded' })
  create(
    @Body() dto: CreatePackageDto,
    @Req() req: any,
    @AuthRole() roleHeader?: string,
    @AuthUserId() idHeader?: string,
  ) {
    const role = req.user?.role || roleHeader;
    const id = Number(req.user?.id || idHeader);
    return this.packagesService.create(dto, role, id);
  }

  @Put(':id')
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.AGENCY)
  @ApiUserHeaders()
  @ApiOperation({ summary: 'Update a package' })
  @ApiParam({ name: 'id', type: Number, description: 'Package ID' })
  @ApiResponse({ status: 200, description: 'Package updated successfully' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePackageDto) {
    return this.packagesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.SUPERUSER, Role.ADMIN)
  @ApiRoleHeader()
  @ApiOperation({ summary: 'Delete a package' })
  @ApiParam({ name: 'id', type: Number, description: 'Package ID' })
  @ApiResponse({ status: 200, description: 'Package deleted successfully' })
  @ApiResponse({ status: 404, description: 'Package not found' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.packagesService.remove(id);
  }
}
