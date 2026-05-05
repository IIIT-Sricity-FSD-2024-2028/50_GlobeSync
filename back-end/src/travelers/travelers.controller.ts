import { Controller, Get, Post, Put, Delete, Param, Body, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { TravelersService } from './travelers.service';
import { CreateTravelerDto, UpdateTravelerDto } from './dto';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiRoleHeader } from '../common/decorators/api-role-header.decorator';
import { Role } from '../common/enums/role.enum';

@ApiTags('travelers')
@Controller('travelers')
export class TravelersController {
  constructor(private readonly travelersService: TravelersService) {}

  @Get()
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.SUPPORT, Role.GUIDE)
  @ApiRoleHeader()
  @ApiOperation({ summary: 'Get all travelers', description: 'Returns list of all travelers. Accessible by superuser, admin, support, and guide.' })
  @ApiResponse({ status: 200, description: 'List of travelers returned successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient role' })
  findAll() {
    return this.travelersService.findAll();
  }

  @Get(':id')
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.SUPPORT, Role.GUIDE, Role.TRAVELER)
  @ApiRoleHeader()
  @ApiOperation({ summary: 'Get traveler by ID', description: 'Returns a single traveler. Accessible by superuser, admin, support, and guide.' })
  @ApiParam({ name: 'id', type: Number, description: 'Traveler ID' })
  @ApiResponse({ status: 200, description: 'Traveler found' })
  @ApiResponse({ status: 404, description: 'Traveler not found' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient role' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.travelersService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new traveler', description: 'Creates a traveler account. Publicly accessible.' })
  @ApiResponse({ status: 201, description: 'Traveler created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient role' })
  create(@Body() dto: CreateTravelerDto) {
    return this.travelersService.create(dto);
  }

  @Put(':id')
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.TRAVELER)
  @ApiRoleHeader()
  @ApiOperation({ summary: 'Update a traveler', description: 'Updates traveler details. Accessible by superuser and admin.' })
  @ApiParam({ name: 'id', type: Number, description: 'Traveler ID' })
  @ApiResponse({ status: 200, description: 'Traveler updated successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Traveler not found' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient role' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTravelerDto) {
    return this.travelersService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.TRAVELER)
  @ApiRoleHeader()
  @ApiOperation({ summary: 'Delete a traveler', description: 'Removes a traveler. Accessible by superuser and admin.' })
  @ApiParam({ name: 'id', type: Number, description: 'Traveler ID' })
  @ApiResponse({ status: 200, description: 'Traveler deleted successfully' })
  @ApiResponse({ status: 404, description: 'Traveler not found' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient role' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.travelersService.remove(id);
  }
}
