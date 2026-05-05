import { Controller, Get, Post, Put, Patch, Delete, Param, Body, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { TripsService } from './trips.service';
import { CreateTripDto, UpdateTripDto, UpdateTripStatusDto } from './dto';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiUserHeaders } from '../common/decorators/api-user-headers.decorator';
import { ApiRoleHeader } from '../common/decorators/api-role-header.decorator';
import { Role } from '../common/enums/role.enum';

@ApiTags('trips')
@Controller('trips')
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @Get()
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.SUPPORT)
  @ApiRoleHeader()
  @ApiOperation({ summary: 'Get all trips', description: 'Returns all trips. Accessible by superuser, admin, and support.' })
  @ApiResponse({ status: 200, description: 'List of all trips' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  findAll() { return this.tripsService.findAll(); }

  @Get(':id')
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.TRAVELER, Role.GUIDE, Role.SUPPORT)
  @ApiUserHeaders()
  @ApiOperation({ summary: 'Get trip by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Trip found' })
  @ApiResponse({ status: 404, description: 'Trip not found' })
  findOne(@Param('id', ParseIntPipe) id: number) { return this.tripsService.findOne(id); }

  @Get('traveler/:travelerId')
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.TRAVELER, Role.SUPPORT)
  @ApiUserHeaders()
  @ApiOperation({ summary: 'Get trips by traveler ID', description: 'Returns all trips for a traveler.' })
  @ApiParam({ name: 'travelerId', type: Number })
  @ApiResponse({ status: 200, description: 'Trips for traveler' })
  findByTraveler(@Param('travelerId', ParseIntPipe) travelerId: number) {
    return this.tripsService.findByTraveler(travelerId);
  }

  @Get('guide/:guideId')
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.GUIDE)
  @ApiUserHeaders()
  @ApiOperation({ summary: 'Get trips by guide ID', description: 'Returns all trips assigned to a guide.' })
  @ApiParam({ name: 'guideId', type: Number })
  @ApiResponse({ status: 200, description: 'Trips for guide' })
  findByGuide(@Param('guideId', ParseIntPipe) guideId: number) {
    return this.tripsService.findByGuide(guideId);
  }

  @Post()
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.TRAVELER)
  @ApiUserHeaders()
  @ApiOperation({ summary: 'Create a new trip' })
  @ApiResponse({ status: 201, description: 'Trip created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  create(@Body() dto: CreateTripDto) { return this.tripsService.create(dto); }

  @Put(':id')
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.TRAVELER)
  @ApiUserHeaders()
  @ApiOperation({ summary: 'Update a trip' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Trip updated' })
  @ApiResponse({ status: 404, description: 'Trip not found' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTripDto) {
    return this.tripsService.update(id, dto);
  }

  @Patch(':id/status')
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.GUIDE)
  @ApiUserHeaders()
  @ApiOperation({ summary: 'Update trip status', description: 'Updates only the status of a trip. Guides can update status of assigned trips.' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Trip status updated' })
  @ApiResponse({ status: 404, description: 'Trip not found' })
  updateStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTripStatusDto) {
    return this.tripsService.updateStatus(id, dto.status);
  }

  @Delete(':id')
  @Roles(Role.SUPERUSER, Role.ADMIN)
  @ApiRoleHeader()
  @ApiOperation({ summary: 'Delete a trip' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Trip deleted' })
  @ApiResponse({ status: 404, description: 'Trip not found' })
  remove(@Param('id', ParseIntPipe) id: number) { return this.tripsService.remove(id); }
}
