import { Controller, Get, Post, Put, Delete, Param, Body, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { TravelersService } from './travelers.service';
import { CreateTravelerDto, UpdateTravelerDto } from './dto';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiRoleHeader } from '../common/decorators/api-role-header.decorator';
import { Role } from '../common/enums/role.enum';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ForbiddenException } from '@nestjs/common';
import { trips } from '../data';

/** Travelers a guide may see: only people on trips assigned to that guide. */
const guideTravelerIds = (guideId: number) =>
  new Set(trips.filter((t) => t.guideId === guideId && t.travelerId).map((t) => t.travelerId as number));

@ApiTags('travelers')
@Controller('travelers')
export class TravelersController {
  constructor(private readonly travelersService: TravelersService) {}

  @Get()
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.SUPPORT, Role.GUIDE)
  @ApiRoleHeader()
  @ApiOperation({ summary: 'Get all travelers with pagination, search, and sorting' })
  @ApiResponse({ status: 200, description: 'List of travelers returned successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient role' })
  findAll(@Query() query: PaginationQueryDto, @CurrentUser() user?: any) {
    const result = this.travelersService.findAll(query);
    if (user?.role === Role.GUIDE) {
      const allowed = guideTravelerIds(Number(user.userId));
      if (Array.isArray(result)) return result.filter((t: any) => allowed.has(t.travelerId));
      return { ...result, data: result.data.filter((t: any) => allowed.has(t.travelerId)) };
    }
    return result;
  }

  @Get(':id')
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.SUPPORT, Role.GUIDE, Role.TRAVELER)
  @ApiRoleHeader()
  @ApiOperation({ summary: 'Get traveler by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Traveler ID' })
  @ApiResponse({ status: 200, description: 'Traveler found' })
  @ApiResponse({ status: 404, description: 'Traveler not found' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient role' })
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user?: any) {
    if (user?.role === Role.GUIDE && !guideTravelerIds(Number(user.userId)).has(id)) {
      throw new ForbiddenException('Guides can only view travelers on their own trips.');
    }
    return this.travelersService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new traveler' })
  @ApiResponse({ status: 201, description: 'Traveler created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient role' })
  create(@Body() dto: CreateTravelerDto) {
    return this.travelersService.create(dto);
  }

  @Put(':id')
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.TRAVELER)
  @ApiRoleHeader()
  @ApiOperation({ summary: 'Update a traveler' })
  @ApiParam({ name: 'id', type: Number, description: 'Traveler ID' })
  @ApiResponse({ status: 200, description: 'Traveler updated successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Traveler not found' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient role' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTravelerDto) {
    return this.travelersService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.SUPERUSER, Role.ADMIN)
  @ApiRoleHeader()
  @ApiOperation({ summary: 'Delete a traveler' })
  @ApiParam({ name: 'id', type: Number, description: 'Traveler ID' })
  @ApiResponse({ status: 200, description: 'Traveler deleted successfully' })
  @ApiResponse({ status: 404, description: 'Traveler not found' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient role' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.travelersService.remove(id);
  }
}
