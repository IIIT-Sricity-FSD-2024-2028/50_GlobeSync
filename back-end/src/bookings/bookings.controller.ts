import { Controller, Get, Post, Put, Delete, Param, Body, Query, Headers, ParseIntPipe, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { CreateBookingDto, UpdateBookingDto } from './dto';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiUserHeaders } from '../common/decorators/api-user-headers.decorator';
import { ApiRoleHeader } from '../common/decorators/api-role-header.decorator';
import { Role } from '../common/enums/role.enum';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@ApiTags('bookings')
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get()
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.SUPPORT)
  @ApiRoleHeader()
  @ApiOperation({ summary: 'Get all bookings with pagination, search, and sorting', description: 'Accessible by superuser, admin, support, and guide.' })
  @ApiResponse({ status: 200, description: 'List of all bookings' })
  findAll(@Query() query: PaginationQueryDto) { return this.bookingsService.findAll(query); }

  @Get(':id')
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.TRAVELER, Role.SUPPORT, Role.AGENCY)
  @ApiUserHeaders()
  @ApiOperation({ summary: 'Get booking by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Booking found' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  findOne(@Param('id', ParseIntPipe) id: number) { return this.bookingsService.findOne(id); }

  @Get('traveler/:travelerId')
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.TRAVELER, Role.SUPPORT, Role.GUIDE)
  @ApiUserHeaders()
  @ApiOperation({ summary: 'Get bookings by traveler ID with pagination' })
  @ApiParam({ name: 'travelerId', type: Number })
  @ApiResponse({ status: 200, description: 'Bookings for traveler' })
  findByTraveler(
    @Param('travelerId', ParseIntPipe) travelerId: number,
    @Query() query: PaginationQueryDto,
  ) {
    return this.bookingsService.findByTraveler(travelerId, query);
  }

  @Get('agency/:agencyId')
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.AGENCY)
  @ApiUserHeaders()
  @ApiOperation({ summary: 'Get bookings by agency ID with pagination' })
  @ApiParam({ name: 'agencyId', type: Number })
  @ApiResponse({ status: 200, description: 'Bookings for agency' })
  findByAgency(
    @Param('agencyId', ParseIntPipe) agencyId: number,
    @Query() query: PaginationQueryDto,
  ) {
    return this.bookingsService.findByAgency(agencyId, query);
  }

  @Get('guide/:guideId')
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.GUIDE)
  @ApiUserHeaders()
  @ApiOperation({ summary: 'Get bookings for guide assigned trips with pagination' })
  @ApiParam({ name: 'guideId', type: Number })
  @ApiResponse({ status: 200, description: 'Bookings for guide trips' })
  findByGuide(
    @Param('guideId', ParseIntPipe) guideId: number,
    @Query() query: PaginationQueryDto,
  ) {
    return this.bookingsService.findByGuide(guideId, query);
  }

  @Post()
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.TRAVELER, Role.AGENCY)
  @ApiUserHeaders()
  @ApiOperation({ summary: 'Create a new booking (HOLD state with 15-min expiration and concurrency protection)' })
  @ApiResponse({ status: 201, description: 'Booking created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 409, description: 'Conflict — Insufficient inventory or guide overlapping booking' })
  create(
    @Body() dto: CreateBookingDto,
    @Headers('idempotency-key') idempotencyKey?: string,
    @Headers('x-idempotency-key') xIdempotencyKey?: string,
  ) {
    return this.bookingsService.create(dto, idempotencyKey || xIdempotencyKey);
  }

  @Put(':id')
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.TRAVELER, Role.AGENCY)
  @ApiUserHeaders()
  @ApiOperation({ summary: 'Update a booking' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Booking updated' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBookingDto, @Req() req?: any) {
    const user = req?.user;
    return this.bookingsService.update(id, dto, user ? { role: String(user.role), userId: Number(user.userId) } : undefined);
  }

  @Delete(':id')
  @Roles(Role.SUPERUSER, Role.ADMIN)
  @ApiRoleHeader()
  @ApiOperation({ summary: 'Delete a booking' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Booking deleted' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  remove(@Param('id', ParseIntPipe) id: number) { return this.bookingsService.remove(id); }

  @Get(':id/cancellation-preview')
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.TRAVELER, Role.SUPPORT, Role.AGENCY)
  @ApiUserHeaders()
  @ApiOperation({ summary: 'Preview exact cancellation refund tier and amount before confirming' })
  @ApiParam({ name: 'id', type: Number })
  cancellationPreview(@Param('id', ParseIntPipe) id: number) {
    return this.bookingsService.cancellationPreview(id);
  }

  @Post(':id/cancel')
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.TRAVELER, Role.AGENCY)
  @ApiUserHeaders()
  @ApiOperation({ summary: 'Cancel a booking under policy rules (idempotent, server-side refund)' })
  @ApiParam({ name: 'id', type: Number })
  cancel(
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason?: string,
    @Req() req?: any,
  ) {
    const actorId = req?.user?.userId;
    return this.bookingsService.cancel(id, reason || 'Cancelled by traveler', actorId ? Number(actorId) : undefined);
  }

  @Post(':id/emergency-override')
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.SUPPORT)
  @ApiUserHeaders()
  @ApiOperation({ summary: 'Request emergency cancellation override for < 12h departure' })
  @ApiParam({ name: 'id', type: Number })
  emergencyOverride(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { reason: string; notes?: string },
    @Req() req?: any,
  ) {
    const actorId = req?.user?.userId;
    return this.bookingsService.requestEmergencyOverride(id, {
      reason: dto.reason,
      notes: dto.notes,
      supportAgentId: actorId ? Number(actorId) : 6,
      supportAgentName: req?.user?.email || 'Support Agent',
    });
  }

  @Post(':id/approve-override')
  @Roles(Role.SUPERUSER, Role.ADMIN)
  @ApiUserHeaders()
  @ApiOperation({ summary: 'Admin approval for high-value emergency override' })
  @ApiParam({ name: 'id', type: Number })
  approveOverride(
    @Param('id', ParseIntPipe) id: number,
    @Req() req?: any,
  ) {
    const adminId = req?.user?.userId;
    return this.bookingsService.approveEmergencyOverride(id, adminId ? Number(adminId) : 2, req?.user?.name || 'Manoj Gupta (Admin)');
  }
}
