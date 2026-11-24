import { Controller, Get, Post, Put, Delete, Param, Body, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto, UpdateExpenseDto } from './dto';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiUserHeaders } from '../common/decorators/api-user-headers.decorator';
import { ApiRoleHeader } from '../common/decorators/api-role-header.decorator';
import { Role } from '../common/enums/role.enum';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@ApiTags('expenses')
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Get('trip/:tripId')
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.TRAVELER, Role.GUIDE, Role.AGENCY)
  @ApiUserHeaders()
  @ApiOperation({ summary: 'Get expenses by trip ID with pagination', description: 'Returns all expenses for a trip.' })
  @ApiParam({ name: 'tripId', type: Number })
  @ApiResponse({ status: 200, description: 'Expenses for trip' })
  findByTrip(
    @Param('tripId', ParseIntPipe) tripId: number,
    @Query() query: PaginationQueryDto,
  ) {
    return this.expensesService.findByTrip(tripId, query);
  }

  @Get('trip/:tripId/budget-gauge')
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.TRAVELER, Role.AGENCY)
  @ApiUserHeaders()
  @ApiOperation({
    summary: 'Get real-time budget gauge for a trip',
    description: 'Computes real expenses (manual + confirmed bookings) vs real trip budget.',
  })
  @ApiParam({ name: 'tripId', type: Number })
  @ApiResponse({ status: 200, description: 'Budget gauge returned successfully' })
  getBudgetGauge(@Param('tripId', ParseIntPipe) tripId: number) {
    return this.expensesService.getBudgetGauge(tripId);
  }

  @Post()
  @Roles(Role.SUPERUSER, Role.TRAVELER, Role.AGENCY)
  @ApiUserHeaders()
  @ApiOperation({ summary: 'Create an expense (can be tied to a booking)' })
  @ApiResponse({ status: 201, description: 'Expense created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  create(@Body() dto: CreateExpenseDto) {
    return this.expensesService.create(dto);
  }

  @Put(':id')
  @Roles(Role.SUPERUSER, Role.TRAVELER, Role.AGENCY)
  @ApiUserHeaders()
  @ApiOperation({ summary: 'Update an expense' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Expense updated' })
  @ApiResponse({ status: 404, description: 'Expense not found' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateExpenseDto) {
    return this.expensesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.SUPERUSER)
  @ApiRoleHeader()
  @ApiOperation({ summary: 'Delete an expense' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Expense deleted' })
  @ApiResponse({ status: 404, description: 'Expense not found' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.expensesService.remove(id);
  }
}
