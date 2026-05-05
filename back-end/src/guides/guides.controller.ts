import { Controller, Get, Post, Put, Delete, Param, Body, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { GuidesService } from './guides.service';
import { CreateGuideDto, UpdateGuideDto } from './dto';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiRoleHeader } from '../common/decorators/api-role-header.decorator';
import { Role } from '../common/enums/role.enum';

@ApiTags('guides')
@Controller('guides')
export class GuidesController {
  constructor(private readonly guidesService: GuidesService) {}

  @Get()
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.TRAVELER, Role.GUIDE)
  @ApiRoleHeader()
  @ApiOperation({ summary: 'Get all guides', description: 'Returns list of all guides. Accessible by superuser, admin, traveler, and guide.' })
  @ApiResponse({ status: 200, description: 'List of guides returned successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient role' })
  findAll() {
    return this.guidesService.findAll();
  }

  @Get(':id')
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.TRAVELER, Role.GUIDE)
  @ApiRoleHeader()
  @ApiOperation({ summary: 'Get guide by ID', description: 'Returns a single guide. Accessible by superuser, admin, traveler, and guide.' })
  @ApiParam({ name: 'id', type: Number, description: 'Guide ID' })
  @ApiResponse({ status: 200, description: 'Guide found' })
  @ApiResponse({ status: 404, description: 'Guide not found' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient role' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.guidesService.findOne(id);
  }

  @Post()
  @Roles(Role.SUPERUSER, Role.ADMIN)
  @ApiRoleHeader()
  @ApiOperation({ summary: 'Create a new guide', description: 'Creates a guide account. Accessible by superuser and admin.' })
  @ApiResponse({ status: 201, description: 'Guide created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient role' })
  create(@Body() dto: CreateGuideDto) {
    return this.guidesService.create(dto);
  }

  @Put(':id')
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.GUIDE)
  @ApiRoleHeader()
  @ApiOperation({ summary: 'Update a guide', description: 'Updates guide details. Accessible by superuser, admin, and the guide themselves.' })
  @ApiParam({ name: 'id', type: Number, description: 'Guide ID' })
  @ApiResponse({ status: 200, description: 'Guide updated successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Guide not found' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient role' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateGuideDto) {
    return this.guidesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.SUPERUSER, Role.ADMIN)
  @ApiRoleHeader()
  @ApiOperation({ summary: 'Delete a guide', description: 'Removes a guide. Accessible by superuser and admin.' })
  @ApiParam({ name: 'id', type: Number, description: 'Guide ID' })
  @ApiResponse({ status: 200, description: 'Guide deleted successfully' })
  @ApiResponse({ status: 404, description: 'Guide not found' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient role' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.guidesService.remove(id);
  }
}
