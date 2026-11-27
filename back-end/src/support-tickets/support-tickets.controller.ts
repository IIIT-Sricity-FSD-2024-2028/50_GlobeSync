import { AuthUserId, AuthRole } from '../common/decorators/current-user.decorator';
import { Controller, Get, Post, Patch, Delete, Param, Body, Query, ParseIntPipe, Headers, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { SupportTicketsService } from './support-tickets.service';
import {
  CreateTicketDto,
  UpdateTicketStatusDto,
  CreateTicketReplyDto,
  AssignTicketDto,
  CreateInternalNoteDto,
  AdjudicateRefundDto,
} from './dto';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiUserHeaders } from '../common/decorators/api-user-headers.decorator';
import { ApiRoleHeader } from '../common/decorators/api-role-header.decorator';
import { Role } from '../common/enums/role.enum';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@ApiTags('support-tickets')
@Controller('support-tickets')
export class SupportTicketsController {
  constructor(private readonly ticketsService: SupportTicketsService) {}

  @Get()
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.SUPPORT)
  @ApiRoleHeader()
  @ApiOperation({ summary: 'Get all support tickets (queue with live SLA timers)' })
  @ApiResponse({ status: 200, description: 'List of all tickets with SLA status' })
  findAll(
    @Query() query: PaginationQueryDto,
    @Req() req: any,
    @AuthRole() roleHeader?: string,
  ) {
    const role = req.user?.role || roleHeader || 'support';
    return this.ticketsService.findAll(role, query);
  }

  @Get(':id')
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.TRAVELER, Role.AGENCY, Role.SUPPORT)
  @ApiUserHeaders()
  @ApiOperation({ summary: 'Get support ticket by ID (internal notes stripped for travelers/agencies)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Ticket found' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
    @AuthRole() roleHeader?: string,
  ) {
    const role = req.user?.role || roleHeader;
    return this.ticketsService.findOne(id, role);
  }

  @Get('traveler/:travelerId')
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.TRAVELER, Role.SUPPORT)
  @ApiUserHeaders()
  @ApiOperation({ summary: 'Get tickets by traveler ID with pagination' })
  @ApiParam({ name: 'travelerId', type: Number })
  @ApiResponse({ status: 200, description: 'Tickets for traveler' })
  findByTraveler(
    @Param('travelerId', ParseIntPipe) travelerId: number,
    @Query() query: PaginationQueryDto,
  ) {
    return this.ticketsService.findByTraveler(travelerId, query);
  }

  @Get('agency/:agencyId')
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.AGENCY, Role.SUPPORT)
  @ApiUserHeaders()
  @ApiOperation({ summary: 'Get tickets by agency ID with pagination' })
  @ApiParam({ name: 'agencyId', type: Number })
  @ApiResponse({ status: 200, description: 'Tickets for agency' })
  findByAgency(
    @Param('agencyId', ParseIntPipe) agencyId: number,
    @Query() query: PaginationQueryDto,
  ) {
    return this.ticketsService.findByAgency(agencyId, query);
  }

  @Get('guide/:guideId')
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.GUIDE, Role.SUPPORT)
  @ApiUserHeaders()
  @ApiOperation({ summary: 'Get tickets by guide ID with pagination' })
  @ApiParam({ name: 'guideId', type: Number })
  @ApiResponse({ status: 200, description: 'Tickets for guide' })
  findByGuide(
    @Param('guideId', ParseIntPipe) guideId: number,
    @Query() query: PaginationQueryDto,
  ) {
    return this.ticketsService.findByGuide(guideId, query);
  }

  @Post()
  @Roles(Role.SUPERUSER, Role.TRAVELER, Role.AGENCY, Role.GUIDE, Role.SUPPORT)
  @ApiUserHeaders()
  @ApiOperation({ summary: 'Create a support ticket' })
  @ApiResponse({ status: 201, description: 'Ticket created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  create(@Body() dto: CreateTicketDto) {
    return this.ticketsService.create(dto);
  }

  @Patch(':id/assign')
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.SUPPORT)
  @ApiRoleHeader()
  @ApiOperation({ summary: 'Assign ticket to a support specialist' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Ticket assigned successfully' })
  assign(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignTicketDto,
    @Req() req: any,
  ) {
    const author = req.user?.name || 'Support Agent';
    return this.ticketsService.assignTicket(id, dto, author);
  }

  @Post(':id/notes')
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.SUPPORT)
  @ApiRoleHeader()
  @ApiOperation({ summary: 'Add internal note (hidden from traveler/agency)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 201, description: 'Internal note saved' })
  addInternalNote(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateInternalNoteDto,
    @Req() req: any,
    @AuthUserId() idHeader?: string,
  ) {
    const authorId = Number(req.user?.id || idHeader || 1);
    const authorName = req.user?.name || 'Support Specialist';
    return this.ticketsService.addInternalNote(id, authorId, authorName, dto.note);
  }

  @Post(':id/adjudicate-refund')
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.SUPPORT)
  @ApiRoleHeader()
  @ApiOperation({
    summary: 'Refund adjudication via PolicyService only',
    description: 'Invokes PolicyService cancellation or emergency override without manual edits.',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Refund adjudicated via policy engine' })
  adjudicateRefund(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AdjudicateRefundDto,
    @Req() req: any,
    @AuthUserId() idHeader?: string,
  ) {
    const agentId = Number(req.user?.id || idHeader || 1);
    const agentName = req.user?.name || 'Support Specialist';
    return this.ticketsService.adjudicateRefund(id, dto, agentId, agentName);
  }

  @Post(':id/reply')
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.TRAVELER, Role.AGENCY, Role.SUPPORT)
  @ApiUserHeaders()
  @ApiOperation({ summary: 'Reply to support ticket thread' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 201, description: 'Reply posted' })
  addReply(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateTicketReplyDto,
    @Req() req: any,
    @AuthRole() roleHeader?: string,
    @AuthUserId() idHeader?: string,
  ) {
    const role = req.user?.role || roleHeader || 'agency';
    const userId = Number(req.user?.id || idHeader || 1);
    return this.ticketsService.addReply(id, role, userId, dto);
  }

  @Patch(':id/status')
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.SUPPORT)
  @ApiRoleHeader()
  @ApiOperation({ summary: 'Update ticket status' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Ticket status updated' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  updateStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTicketStatusDto) {
    return this.ticketsService.updateStatus(id, dto.status);
  }

  @Delete(':id')
  @Roles(Role.SUPERUSER, Role.ADMIN)
  @ApiRoleHeader()
  @ApiOperation({ summary: 'Delete a support ticket' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Ticket deleted' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.ticketsService.remove(id);
  }
}
