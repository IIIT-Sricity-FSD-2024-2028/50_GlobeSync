import { Controller, Get, Post, Put, Patch, Delete, Param, Body, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { TripsService } from './trips.service';
import { CreateTripDto, UpdateTripDto, UpdateTripStatusDto, RequestGuideReassignmentDto, TravelerConsentDto, GuideConsentDto } from './dto';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiUserHeaders } from '../common/decorators/api-user-headers.decorator';
import { ApiRoleHeader } from '../common/decorators/api-role-header.decorator';
import { Role } from '../common/enums/role.enum';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TripActor } from './trip-permissions';

const toActor = (user: any): TripActor | undefined =>
  user ? { role: String(user.role), userId: Number(user.userId) } : undefined;

@ApiTags('trips')
@Controller('trips')
export class TripsController {
  constructor(private readonly tripsService: TripsService) { }

  @Get()
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.SUPPORT)
  @ApiRoleHeader()
  @ApiOperation({ summary: 'Get all trips with pagination, search, and sorting' })
  @ApiResponse({ status: 200, description: 'List of all trips' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  findAll(@Query() query: PaginationQueryDto) {
    return this.tripsService.findAll(query);
  }

  @Get(':id')
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.TRAVELER, Role.GUIDE, Role.AGENCY, Role.SUPPORT)
  @ApiUserHeaders()
  @ApiOperation({ summary: 'Get trip by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Trip found' })
  @ApiResponse({ status: 404, description: 'Trip not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tripsService.findOne(id);
  }

  @Get('traveler/:travelerId')
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.TRAVELER, Role.SUPPORT)
  @ApiUserHeaders()
  @ApiOperation({ summary: 'Get trips by traveler ID with pagination' })
  @ApiParam({ name: 'travelerId', type: Number })
  @ApiResponse({ status: 200, description: 'Trips for traveler' })
  findByTraveler(
    @Param('travelerId', ParseIntPipe) travelerId: number,
    @Query() query: PaginationQueryDto,
  ) {
    return this.tripsService.findByTraveler(travelerId, query);
  }

  @Get('guide/:guideId')
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.GUIDE)
  @ApiUserHeaders()
  @ApiOperation({ summary: 'Get trips by guide ID with pagination' })
  @ApiParam({ name: 'guideId', type: Number })
  @ApiResponse({ status: 200, description: 'Trips for guide' })
  findByGuide(
    @Param('guideId', ParseIntPipe) guideId: number,
    @Query() query: PaginationQueryDto,
  ) {
    return this.tripsService.findByGuide(guideId, query);
  }

  @Get('agency/:agencyId')
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.AGENCY)
  @ApiUserHeaders()
  @ApiOperation({ summary: 'Get trips by agency ID with pagination' })
  @ApiParam({ name: 'agencyId', type: Number })
  @ApiResponse({ status: 200, description: 'Trips for agency' })
  findByAgency(
    @Param('agencyId', ParseIntPipe) agencyId: number,
    @Query() query: PaginationQueryDto,
  ) {
    return this.tripsService.findByAgency(agencyId, query);
  }

  @Post()
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.TRAVELER, Role.AGENCY)
  @ApiUserHeaders()
  @ApiOperation({ summary: 'Create a new trip' })
  @ApiResponse({ status: 201, description: 'Trip created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  create(@Body() dto: CreateTripDto, @CurrentUser() user: any) {
    return this.tripsService.create(dto, toActor(user));
  }

  @Put(':id')
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.TRAVELER, Role.AGENCY, Role.GUIDE)
  @ApiUserHeaders()
  @ApiOperation({ summary: 'Update a trip (checks guide availability on accept)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Trip updated' })
  @ApiResponse({ status: 404, description: 'Trip not found' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTripDto, @CurrentUser() user: any) {
    return this.tripsService.update(id, dto, toActor(user));
  }

  @Patch(':id')
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.TRAVELER, Role.AGENCY, Role.GUIDE)
  @ApiUserHeaders()
  @ApiOperation({ summary: 'Partial update a trip' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Trip updated' })
  @ApiResponse({ status: 404, description: 'Trip not found' })
  patch(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTripDto, @CurrentUser() user: any) {
    return this.tripsService.update(id, dto, toActor(user));
  }

  @Patch(':id/status')
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.GUIDE, Role.TRAVELER, Role.AGENCY)
  @ApiUserHeaders()
  @ApiOperation({ summary: 'Update trip status' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Trip status updated' })
  @ApiResponse({ status: 404, description: 'Trip not found' })
  updateStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTripStatusDto, @CurrentUser() user: any) {
    return this.tripsService.updateStatus(id, dto.status, dto.cancellationReason, toActor(user));
  }

  @Delete(':id')
  @Roles(Role.SUPERUSER)
  @ApiRoleHeader()
  @ApiOperation({ summary: 'Delete a trip (Superuser only)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Trip deleted' })
  @ApiResponse({ status: 404, description: 'Trip not found' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.tripsService.remove(id);
  }

  @Post(':id/request-reassignment')
  @Roles(Role.ADMIN, Role.SUPERUSER)
  @ApiUserHeaders()
  @ApiOperation({ summary: 'Admin request for guide reassignment with mandatory reason' })
  @ApiParam({ name: 'id', type: Number })
  requestReassignment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RequestGuideReassignmentDto,
    @CurrentUser() user: any,
  ) {
    return this.tripsService.requestGuideReassignment(id, dto.replacementGuideId, dto.reason, user);
  }

  @Get(':id/reassignments')
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.TRAVELER, Role.GUIDE)
  @ApiUserHeaders()
  @ApiOperation({ summary: 'Get guide reassignment requests and history for a trip' })
  @ApiParam({ name: 'id', type: Number })
  getReassignments(@Param('id', ParseIntPipe) id: number) {
    return this.tripsService.getTripReassignments(id);
  }

  @Post('reassignments/:requestId/traveler-consent')
  @Roles(Role.TRAVELER, Role.SUPERUSER)
  @ApiUserHeaders()
  @ApiOperation({ summary: 'Traveler responds to guide reassignment request (ACCEPT or REJECT)' })
  @ApiParam({ name: 'requestId', type: Number })
  travelerConsent(
    @Param('requestId', ParseIntPipe) requestId: number,
    @Body() dto: TravelerConsentDto,
    @CurrentUser() user: any,
  ) {
    const travelerId = Number(user?.userId || user?.id || 1);
    return this.tripsService.respondTravelerConsent(requestId, dto.decision, dto.reason, travelerId);
  }

  @Post('reassignments/:requestId/guide-response')
  @Roles(Role.GUIDE, Role.SUPERUSER)
  @ApiUserHeaders()
  @ApiOperation({ summary: 'Replacement guide responds to proposed assignment (ACCEPT or DECLINE)' })
  @ApiParam({ name: 'requestId', type: Number })
  guideResponse(
    @Param('requestId', ParseIntPipe) requestId: number,
    @Body() dto: GuideConsentDto,
    @CurrentUser() user: any,
  ) {
    const guideId = Number(user?.userId || user?.id || 1);
    return this.tripsService.respondGuideAssignment(requestId, dto.decision, dto.reason, guideId);
  }

  @Get('reassignments/my')
  @Roles(Role.TRAVELER, Role.GUIDE, Role.ADMIN, Role.SUPERUSER)
  @ApiUserHeaders()
  @ApiOperation({ summary: 'Get current user pending guide reassignment requests' })
  getMyReassignments(@CurrentUser() user: any) {
    const userId = Number(user?.userId || user?.id || 1);
    const role = String(user?.role || '').toLowerCase();
    return this.tripsService.getMyReassignments(userId, role);
  }
}
