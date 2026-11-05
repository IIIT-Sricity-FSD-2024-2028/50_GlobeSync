import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  Headers,
  ParseIntPipe,
  UseGuards,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { ApiUserHeaders } from '../common/decorators/api-user-headers.decorator';
import { AgenciesService } from './agencies.service';
import { UpdateAgencyDto } from './dto';
import { PassengersService } from '../passengers/passengers.service';
import { TripsService } from '../trips/trips.service';
import { UpdateTripDto } from '../trips/dto';
import { SupportTicketsService } from '../support-tickets/support-tickets.service';
import { CreateTicketReplyDto } from '../support-tickets/dto';
import { commissionLedger, trips, bookings, agencies } from '../data';

@ApiTags('agency-api')
@Controller('api/agency')
@UseGuards(RolesGuard)
@ApiBearerAuth()
@ApiUserHeaders()
export class AgencyApiController {
  constructor(
    private readonly agenciesService: AgenciesService,
    private readonly passengersService: PassengersService,
    private readonly tripsService: TripsService,
    private readonly ticketsService: SupportTicketsService,
  ) {}

  private getAgencyId(userIdHeader: string): number {
    const id = parseInt(userIdHeader, 10);
    if (isNaN(id) || id <= 0) {
      throw new ForbiddenException('Invalid or missing agency identification in x-user-id header');
    }
    return id;
  }

  // 1. GET /api/agency/passengers
  @Get('passengers')
  @Roles(Role.AGENCY, Role.ADMIN, Role.SUPERUSER)
  @ApiOperation({ summary: 'Get saved passenger roster for the authenticated agency' })
  @ApiResponse({ status: 200, description: 'Return agency passengers roster' })
  getPassengers(@Headers('x-user-id') userId: string) {
    const agencyId = this.getAgencyId(userId);
    return this.passengersService.findByAgency(agencyId);
  }

  // 2. GET /api/agency/commissions
  @Get('commissions')
  @Roles(Role.AGENCY, Role.ADMIN, Role.SUPERUSER)
  @ApiOperation({ summary: 'Get live commission entries joined with Trip and Booking details' })
  @ApiResponse({ status: 200, description: 'Return commission ledger statement' })
  getCommissions(@Headers('x-user-id') userId: string) {
    const agencyId = this.getAgencyId(userId);
    const agency = agencies.find((a) => a.agencyId === agencyId);
    const baseRate = agency?.commissionRate ?? 1.5;

    // Filter commissionLedger entries for this agency
    const entries = commissionLedger.filter((c) => c.agencyId === agencyId);

    // Join with trip and booking details
    return entries.map((entry) => {
      const trip = trips.find((t) => t.tripId === entry.tripId);
      const booking = bookings.find((b) => b.tripId === entry.tripId || (entry.bookingId && b.bookingId === entry.bookingId));

      const statusUpper = (entry.status || 'pending').toUpperCase();
      const normalizedStatus =
        statusUpper === 'SETTLED' || statusUpper === 'EARNED'
          ? 'EARNED'
          : statusUpper === 'CANCELLED' || statusUpper === 'VOID'
          ? 'CANCELLED'
          : 'PENDING';

      return {
        commissionId: entry.commissionId,
        agencyId: entry.agencyId,
        tripId: entry.tripId,
        bookingId: entry.bookingId || booking?.bookingId,
        tripTitle: trip?.title || (trip ? `Trip to ${trip.destination}` : `Trip #${entry.tripId}`),
        destination: trip?.destination || 'Custom Destination',
        grossAmount: entry.grossAmount,
        commissionAmount: entry.commissionAmount,
        commissionRate: entry.rate ?? baseRate,
        status: normalizedStatus,
        tripStatus: trip?.status || 'Planning',
        createdAt: entry.createdAt,
      };
    });
  }

  // 3. GET /api/agency/profile
  @Get('profile')
  @Roles(Role.AGENCY, Role.ADMIN, Role.SUPERUSER)
  @ApiOperation({ summary: 'Get profile of authenticated agency' })
  @ApiResponse({ status: 200, description: 'Return agency profile' })
  getProfile(@Headers('x-user-id') userId: string) {
    const agencyId = this.getAgencyId(userId);
    return this.agenciesService.findOne(agencyId);
  }

  // 4. PATCH /api/agency/profile
  @Patch('profile')
  @Roles(Role.AGENCY, Role.ADMIN, Role.SUPERUSER)
  @ApiOperation({ summary: 'Update profile of authenticated agency' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  updateProfile(
    @Headers('x-user-id') userId: string,
    @Body() dto: UpdateAgencyDto,
  ) {
    const agencyId = this.getAgencyId(userId);
    return this.agenciesService.update(agencyId, dto);
  }

  // 5. PATCH /api/agency/trips/:id
  @Patch('trips/:id')
  @Roles(Role.AGENCY, Role.ADMIN, Role.SUPERUSER)
  @ApiOperation({ summary: 'Update agency client trip and recalculate commission' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Trip updated' })
  updateTrip(
    @Param('id', ParseIntPipe) id: number,
    @Headers('x-user-id') userId: string,
    @Headers('x-user-role') role: string,
    @Body() dto: UpdateTripDto,
  ) {
    const agencyId = this.getAgencyId(userId);
    const trip = this.tripsService.findOne(id);

    // Guard: Agency can only modify their own trips
    if (role === Role.AGENCY && trip.agencyId !== agencyId) {
      throw new ForbiddenException('Access denied. You can only update your own client trips.');
    }

    return this.tripsService.update(id, dto);
  }

  // 6. GET /api/agency/support/:id
  @Get('support/:id')
  @Roles(Role.AGENCY, Role.ADMIN, Role.SUPERUSER)
  @ApiOperation({ summary: 'Get ticket details and conversation thread' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Ticket found' })
  getTicketThread(
    @Param('id', ParseIntPipe) id: number,
    @Headers('x-user-id') userId: string,
    @Headers('x-user-role') role: string,
  ) {
    const agencyId = this.getAgencyId(userId);
    const ticket = this.ticketsService.findOne(id);

    if (role === Role.AGENCY && ticket.agencyId !== agencyId) {
      throw new ForbiddenException('Access denied. You can only view your own support tickets.');
    }

    return ticket;
  }

  // 7. POST /api/agency/support/:id/reply
  @Post('support/:id/reply')
  @Roles(Role.AGENCY, Role.ADMIN, Role.SUPERUSER)
  @ApiOperation({ summary: 'Post a reply to support ticket thread' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 201, description: 'Reply posted' })
  replyTicket(
    @Param('id', ParseIntPipe) id: number,
    @Headers('x-user-id') userId: string,
    @Headers('x-user-role') role: string,
    @Body() dto: CreateTicketReplyDto,
  ) {
    const agencyId = this.getAgencyId(userId);
    const ticket = this.ticketsService.findOne(id);

    if (role === Role.AGENCY && ticket.agencyId !== agencyId) {
      throw new ForbiddenException('Access denied. You can only reply to your own support tickets.');
    }

    const agency = agencies.find((a) => a.agencyId === agencyId);
    this.ticketsService.addReply(
      id,
      role || 'agency',
      agencyId,
      {
        ...dto,
        senderName: dto.senderName || agency?.businessName || 'Agency Partner',
      },
    );
    return this.ticketsService.findOne(id);
  }
}

