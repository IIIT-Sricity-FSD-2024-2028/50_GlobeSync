import { Controller, Get, Post, Put, Delete, Param, Body, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { CreateBookingDto, UpdateBookingDto } from './dto';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiUserHeaders } from '../common/decorators/api-user-headers.decorator';
import { ApiRoleHeader } from '../common/decorators/api-role-header.decorator';
import { Role } from '../common/enums/role.enum';

@ApiTags('bookings')
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get()
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.SUPPORT, Role.GUIDE)
  @ApiRoleHeader()
  @ApiOperation({ summary: 'Get all bookings', description: 'Accessible by superuser, admin, support, and guide.' })
  @ApiResponse({ status: 200, description: 'List of all bookings' })
  findAll() { return this.bookingsService.findAll(); }

  @Get(':id')
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.TRAVELER, Role.SUPPORT)
  @ApiUserHeaders()
  @ApiOperation({ summary: 'Get booking by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Booking found' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  findOne(@Param('id', ParseIntPipe) id: number) { return this.bookingsService.findOne(id); }

  @Get('traveler/:travelerId')
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.TRAVELER, Role.SUPPORT, Role.GUIDE)
  @ApiUserHeaders()
  @ApiOperation({ summary: 'Get bookings by traveler ID' })
  @ApiParam({ name: 'travelerId', type: Number })
  @ApiResponse({ status: 200, description: 'Bookings for traveler' })
  findByTraveler(@Param('travelerId', ParseIntPipe) travelerId: number) {
    return this.bookingsService.findByTraveler(travelerId);
  }

  @Post()
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.TRAVELER)
  @ApiUserHeaders()
  @ApiOperation({ summary: 'Create a new booking' })
  @ApiResponse({ status: 201, description: 'Booking created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  create(@Body() dto: CreateBookingDto) { return this.bookingsService.create(dto); }

  @Put(':id')
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.TRAVELER)
  @ApiUserHeaders()
  @ApiOperation({ summary: 'Update a booking' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Booking updated' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBookingDto) {
    return this.bookingsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.SUPERUSER, Role.ADMIN)
  @ApiRoleHeader()
  @ApiOperation({ summary: 'Delete a booking' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Booking deleted' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  remove(@Param('id', ParseIntPipe) id: number) { return this.bookingsService.remove(id); }
}
