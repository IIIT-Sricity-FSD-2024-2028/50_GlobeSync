import { Controller, Get, Post, Put, Delete, Param, Body, Query, ParseIntPipe, Headers, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { GuidesService } from './guides.service';
import { CreateGuideDto, UpdateGuideDto } from './dto';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiRoleHeader } from '../common/decorators/api-role-header.decorator';
import { Role } from '../common/enums/role.enum';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@ApiTags('guides')
@Controller('guides')
export class GuidesController {
  constructor(private readonly guidesService: GuidesService) {}

  @Get()
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.TRAVELER, Role.GUIDE, Role.AGENCY, Role.SUPPORT)
  @ApiRoleHeader()
  @ApiOperation({ summary: 'Get all guides with pagination, search, and sorting' })
  @ApiResponse({ status: 200, description: 'List of guides returned successfully' })
  findAll(@Query() query: PaginationQueryDto) {
    return this.guidesService.findAll(query);
  }

  @Get('available')
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.TRAVELER, Role.GUIDE, Role.AGENCY, Role.SUPPORT)
  @ApiRoleHeader()
  @ApiOperation({ summary: 'Get active verified guides annotated with date-based availability' })
  findAvailable(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('excludeTripId') excludeTripId?: string,
  ) {
    const parsedExclude = excludeTripId ? Number(excludeTripId) : undefined;
    return this.guidesService.findAvailableForDates(
      startDate,
      endDate,
      parsedExclude && !isNaN(parsedExclude) ? parsedExclude : undefined,
    );
  }

  @Get(':id/schedule')
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.GUIDE)
  @ApiRoleHeader()
  @ApiOperation({ summary: 'Get guide schedule categorized by pending, upcoming, active, completed, cancelled' })
  getSchedule(@Param('id', ParseIntPipe) id: number) {
    return this.guidesService.getGuideSchedule(id);
  }

  @Post(':id/blocked-dates')
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.GUIDE)
  @ApiRoleHeader()
  @ApiOperation({ summary: 'Manually block a date range on a guide calendar' })
  blockManualDates(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { startDate: string; endDate: string },
  ) {
    return this.guidesService.blockManualDates(id, body.startDate, body.endDate);
  }

  @Get(':id')
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.TRAVELER, Role.GUIDE, Role.AGENCY, Role.SUPPORT)
  @ApiRoleHeader()
  @ApiOperation({ summary: 'Get guide by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Guide ID' })
  @ApiResponse({ status: 200, description: 'Guide found' })
  @ApiResponse({ status: 404, description: 'Guide not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.guidesService.findOne(id);
  }

  @Post()
  @Roles(Role.SUPERUSER, Role.ADMIN)
  @ApiRoleHeader()
  @ApiOperation({ summary: 'Create a new guide' })
  @ApiResponse({ status: 201, description: 'Guide created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  create(@Body() dto: CreateGuideDto) {
    return this.guidesService.create(dto);
  }

  @Put(':id')
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.GUIDE)
  @ApiRoleHeader()
  @ApiOperation({ summary: 'Update a guide (rate and experience are read-only for guides)' })
  @ApiParam({ name: 'id', type: Number, description: 'Guide ID' })
  @ApiResponse({ status: 200, description: 'Guide updated successfully' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateGuideDto,
    @Req() req: any,
    @Headers('x-user-role') roleHeader?: string,
  ) {
    const callerRole = (req.user?.role || roleHeader || '').toLowerCase();
    if (callerRole === Role.GUIDE || callerRole === 'guide') {
      delete dto.pricePerTrip;
      delete (dto as any).rate;
      delete (dto as any).adminSetRateMinor;
      delete dto.rating;
      delete dto.experience;
      delete (dto as any).verifiedExperienceYears;
      delete dto.adminId;
    }
    return this.guidesService.update(id, dto, callerRole);
  }

  @Delete(':id')
  @Roles(Role.SUPERUSER)
  @ApiRoleHeader()
  @ApiOperation({ summary: 'Delete a guide (Superuser only)' })
  @ApiParam({ name: 'id', type: Number, description: 'Guide ID' })
  @ApiResponse({ status: 200, description: 'Guide deleted successfully' })
  @ApiResponse({ status: 404, description: 'Guide not found' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.guidesService.remove(id);
  }
}
