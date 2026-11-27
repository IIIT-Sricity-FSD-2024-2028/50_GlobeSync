import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Controller, Get, Post, Param, Body, Headers, ParseIntPipe } from '@nestjs/common';
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
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.TRAVELER, Role.SUPPORT, Role.AGENCY)
  @ApiUserHeaders()
  @ApiOperation({ summary: 'Get payment by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Payment found' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  findOne(@Param('id', ParseIntPipe) id: number) { return this.paymentsService.findOne(id); }

  @Get('booking/:bookingId')
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.TRAVELER, Role.SUPPORT, Role.AGENCY)
  @ApiUserHeaders()
  @ApiOperation({ summary: 'Get payments by booking ID' })
  @ApiParam({ name: 'bookingId', type: Number })
  @ApiResponse({ status: 200, description: 'Payments for booking' })
  findByBooking(@Param('bookingId', ParseIntPipe) bookingId: number) {
    return this.paymentsService.findByBooking(bookingId);
  }

  @Get('agency/:agencyId')
  @Roles(Role.AGENCY, Role.ADMIN, Role.SUPERUSER)
  @ApiUserHeaders()
  @ApiOperation({ summary: 'Get payments by agency ID' })
  @ApiParam({ name: 'agencyId', type: Number })
  @ApiResponse({ status: 200, description: 'Payments for agency' })
  findByAgency(@Param('agencyId', ParseIntPipe) agencyId: number) {
    return this.paymentsService.findByAgency(agencyId);
  }

  @Post()
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.TRAVELER, Role.AGENCY)
  @ApiUserHeaders()
  @ApiOperation({ summary: 'Create a payment' })
  @ApiResponse({ status: 201, description: 'Payment created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  create(
    @Body() dto: CreatePaymentDto,
    @Headers('idempotency-key') idempotencyKey?: string,
    @Headers('x-idempotency-key') xIdempotencyKey?: string,
    @CurrentUser() user?: any,
  ) {
    return this.paymentsService.create(
      dto,
      idempotencyKey || xIdempotencyKey,
      user ? { role: String(user.role), userId: Number(user.userId) } : undefined,
    );
  }

  @Post('intent')
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.TRAVELER, Role.AGENCY)
  @ApiUserHeaders()
  @ApiOperation({ summary: 'Create gateway payment intent in test mode' })
  @ApiResponse({ status: 201, description: 'Payment intent created' })
  createPaymentIntent(
    @Body() body: { bookingId: number; travelerId: number; amountMinor: number; currency?: string },
    @Headers('idempotency-key') idempotencyKey?: string,
    @Headers('x-idempotency-key') xIdempotencyKey?: string,
  ) {
    return this.paymentsService.createPaymentIntent({
      bookingId: body.bookingId,
      travelerId: body.travelerId,
      amountMinor: body.amountMinor,
      currency: body.currency,
      idempotencyKey: idempotencyKey || xIdempotencyKey,
    });
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Receive payment gateway webhooks (signature verified)' })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  @ApiResponse({ status: 401, description: 'Invalid signature' })
  async handleWebhook(
    @Body() body: any,
    @Headers('x-razorpay-signature') razorpaySig?: string,
    @Headers('stripe-signature') stripeSig?: string,
  ) {
    const signature = razorpaySig || stripeSig || '';
    const rawBody = typeof body === 'string' ? body : JSON.stringify(body);
    return this.paymentsService.processWebhook(body, signature, rawBody);
  }
}
