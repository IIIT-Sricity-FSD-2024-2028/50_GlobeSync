import { Controller, Get, Post, Patch, Delete, Param, Body, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { SupportTicketsService } from './support-tickets.service';
import { CreateTicketDto, UpdateTicketStatusDto } from './dto';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiUserHeaders } from '../common/decorators/api-user-headers.decorator';
import { ApiRoleHeader } from '../common/decorators/api-role-header.decorator';
import { Role } from '../common/enums/role.enum';

@ApiTags('support-tickets')
@Controller('support-tickets')
export class SupportTicketsController {
  constructor(private readonly ticketsService: SupportTicketsService) {}

  @Get()
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.SUPPORT)
  @ApiRoleHeader()
  @ApiOperation({ summary: 'Get all support tickets' })
  @ApiResponse({ status: 200, description: 'List of all tickets' })
  findAll() { return this.ticketsService.findAll(); }

  @Get(':id')
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.TRAVELER, Role.SUPPORT)
  @ApiUserHeaders()
  @ApiOperation({ summary: 'Get support ticket by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Ticket found' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  findOne(@Param('id', ParseIntPipe) id: number) { return this.ticketsService.findOne(id); }

  @Get('traveler/:travelerId')
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.TRAVELER, Role.SUPPORT)
  @ApiUserHeaders()
  @ApiOperation({ summary: 'Get tickets by traveler ID' })
  @ApiParam({ name: 'travelerId', type: Number })
  @ApiResponse({ status: 200, description: 'Tickets for traveler' })
  findByTraveler(@Param('travelerId', ParseIntPipe) travelerId: number) {
    return this.ticketsService.findByTraveler(travelerId);
  }

  @Post()
  @Roles(Role.SUPERUSER, Role.TRAVELER, Role.SUPPORT)
  @ApiUserHeaders()
  @ApiOperation({ summary: 'Create a support ticket' })
  @ApiResponse({ status: 201, description: 'Ticket created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  create(@Body() dto: CreateTicketDto) { return this.ticketsService.create(dto); }

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
  remove(@Param('id', ParseIntPipe) id: number) { return this.ticketsService.remove(id); }
}
