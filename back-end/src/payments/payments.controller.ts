import { Controller, Get, Post, Param, Body, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiUserHeaders } from '../common/decorators/api-user-headers.decorator';
import { ApiRoleHeader } from '../common/decorators/api-role-header.decorator';
import { Role } from '../common/enums/role.enum';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.SUPPORT)
  @ApiRoleHeader()
  @ApiOperation({ summary: 'Get all payments' })
  @ApiResponse({ status: 200, description: 'List of all payments' })
  findAll() { return this.paymentsService.findAll(); }

  @Get(':id')
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.TRAVELER, Role.SUPPORT)
  @ApiUserHeaders()
  @ApiOperation({ summary: 'Get payment by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Payment found' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  findOne(@Param('id', ParseIntPipe) id: number) { return this.paymentsService.findOne(id); }

  @Get('booking/:bookingId')
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.TRAVELER, Role.SUPPORT)
  @ApiUserHeaders()
  @ApiOperation({ summary: 'Get payments by booking ID' })
  @ApiParam({ name: 'bookingId', type: Number })
  @ApiResponse({ status: 200, description: 'Payments for booking' })
  findByBooking(@Param('bookingId', ParseIntPipe) bookingId: number) {
    return this.paymentsService.findByBooking(bookingId);
  }

  @Post()
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.TRAVELER)
  @ApiUserHeaders()
  @ApiOperation({ summary: 'Create a payment' })
  @ApiResponse({ status: 201, description: 'Payment created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  create(@Body() dto: CreatePaymentDto) { return this.paymentsService.create(dto); }
}
