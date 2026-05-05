import { Controller, Get, Post, Put, Delete, Param, Body, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto, UpdateExpenseDto } from './dto';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiUserHeaders } from '../common/decorators/api-user-headers.decorator';
import { ApiRoleHeader } from '../common/decorators/api-role-header.decorator';
import { Role } from '../common/enums/role.enum';

@ApiTags('expenses')
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Get('trip/:tripId')
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.TRAVELER, Role.GUIDE)
  @ApiUserHeaders()
  @ApiOperation({ summary: 'Get expenses by trip ID', description: 'Returns all expenses for a trip.' })
  @ApiParam({ name: 'tripId', type: Number })
  @ApiResponse({ status: 200, description: 'Expenses for trip' })
  findByTrip(@Param('tripId', ParseIntPipe) tripId: number) {
    return this.expensesService.findByTrip(tripId);
  }

  @Post()
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.TRAVELER)
  @ApiUserHeaders()
  @ApiOperation({ summary: 'Create an expense' })
  @ApiResponse({ status: 201, description: 'Expense created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  create(@Body() dto: CreateExpenseDto) { return this.expensesService.create(dto); }

  @Put(':id')
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.TRAVELER)
  @ApiUserHeaders()
  @ApiOperation({ summary: 'Update an expense' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Expense updated' })
  @ApiResponse({ status: 404, description: 'Expense not found' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateExpenseDto) {
    return this.expensesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.SUPERUSER, Role.ADMIN)
  @ApiRoleHeader()
  @ApiOperation({ summary: 'Delete an expense' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Expense deleted' })
  @ApiResponse({ status: 404, description: 'Expense not found' })
  remove(@Param('id', ParseIntPipe) id: number) { return this.expensesService.remove(id); }
}
