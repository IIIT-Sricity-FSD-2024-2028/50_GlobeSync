import { Controller, Get, Post, Put, Delete, Param, Body, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { PackagesService } from './packages.service';
import { CreatePackageDto, UpdatePackageDto } from './dto';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiRoleHeader } from '../common/decorators/api-role-header.decorator';
import { Role } from '../common/enums/role.enum';

@ApiTags('packages')
@Controller('packages')
export class PackagesController {
  constructor(private readonly packagesService: PackagesService) {}

  @Get()
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.TRAVELER, Role.GUIDE)
  @ApiRoleHeader()
  @ApiOperation({ summary: 'Get all packages', description: 'Returns list of all travel packages. Accessible by superuser, admin, traveler, and guide.' })
  @ApiResponse({ status: 200, description: 'List of packages returned successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient role' })
  findAll() {
    return this.packagesService.findAll();
  }

  @Get(':id')
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.TRAVELER, Role.GUIDE)
  @ApiRoleHeader()
  @ApiOperation({ summary: 'Get package by ID', description: 'Returns a single package. Accessible by superuser, admin, traveler, and guide.' })
  @ApiParam({ name: 'id', type: Number, description: 'Package ID' })
  @ApiResponse({ status: 200, description: 'Package found' })
  @ApiResponse({ status: 404, description: 'Package not found' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient role' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.packagesService.findOne(id);
  }

  @Post()
  @Roles(Role.SUPERUSER, Role.ADMIN)
  @ApiRoleHeader()
  @ApiOperation({ summary: 'Create a new package', description: 'Creates a travel package. Accessible by superuser and admin.' })
  @ApiResponse({ status: 201, description: 'Package created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient role' })
  create(@Body() dto: CreatePackageDto) {
    return this.packagesService.create(dto);
  }

  @Put(':id')
  @Roles(Role.SUPERUSER, Role.ADMIN)
  @ApiRoleHeader()
  @ApiOperation({ summary: 'Update a package', description: 'Updates package details. Accessible by superuser and admin.' })
  @ApiParam({ name: 'id', type: Number, description: 'Package ID' })
  @ApiResponse({ status: 200, description: 'Package updated successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Package not found' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient role' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePackageDto) {
    return this.packagesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.SUPERUSER, Role.ADMIN)
  @ApiRoleHeader()
  @ApiOperation({ summary: 'Delete a package', description: 'Removes a travel package. Accessible by superuser and admin.' })
  @ApiParam({ name: 'id', type: Number, description: 'Package ID' })
  @ApiResponse({ status: 200, description: 'Package deleted successfully' })
  @ApiResponse({ status: 404, description: 'Package not found' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient role' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.packagesService.remove(id);
  }
}
