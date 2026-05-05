import { Controller, Get, Post, Put, Delete, Param, Body, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ItinerariesService } from './itineraries.service';
import { CreateItineraryDto, UpdateItineraryDto } from './dto';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiUserHeaders } from '../common/decorators/api-user-headers.decorator';
import { ApiRoleHeader } from '../common/decorators/api-role-header.decorator';
import { Role } from '../common/enums/role.enum';

@ApiTags('itineraries')
@Controller('itineraries')
export class ItinerariesController {
  constructor(private readonly itinerariesService: ItinerariesService) {}

  @Get('trip/:tripId')
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.TRAVELER, Role.GUIDE)
  @ApiUserHeaders()
  @ApiOperation({ summary: 'Get itinerary by trip ID', description: 'Returns all itinerary items for a trip.' })
  @ApiParam({ name: 'tripId', type: Number })
  @ApiResponse({ status: 200, description: 'Itinerary items for trip' })
  findByTrip(@Param('tripId', ParseIntPipe) tripId: number) {
    return this.itinerariesService.findByTrip(tripId);
  }

  @Post()
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.TRAVELER, Role.GUIDE)
  @ApiUserHeaders()
  @ApiOperation({ summary: 'Create itinerary item' })
  @ApiResponse({ status: 201, description: 'Itinerary created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  create(@Body() dto: CreateItineraryDto) { return this.itinerariesService.create(dto); }

  @Put(':id')
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.TRAVELER, Role.GUIDE)
  @ApiUserHeaders()
  @ApiOperation({ summary: 'Update itinerary item' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Itinerary updated' })
  @ApiResponse({ status: 404, description: 'Itinerary not found' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateItineraryDto) {
    return this.itinerariesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.SUPERUSER, Role.ADMIN)
  @ApiRoleHeader()
  @ApiOperation({ summary: 'Delete itinerary item' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Itinerary deleted' })
  @ApiResponse({ status: 404, description: 'Itinerary not found' })
  remove(@Param('id', ParseIntPipe) id: number) { return this.itinerariesService.remove(id); }
}
