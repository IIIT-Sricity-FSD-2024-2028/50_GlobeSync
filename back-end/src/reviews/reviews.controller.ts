import { Controller, Get, Post, Delete, Param, Body, Query, ParseIntPipe, Req, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto, GuideResponseDto } from './dto';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiUserHeaders } from '../common/decorators/api-user-headers.decorator';
import { ApiRoleHeader } from '../common/decorators/api-role-header.decorator';
import { Role } from '../common/enums/role.enum';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.TRAVELER, Role.GUIDE)
  @ApiRoleHeader()
  @ApiOperation({ summary: 'Get all reviews with pagination, search, and sorting' })
  @ApiResponse({ status: 200, description: 'List of reviews' })
  findAll(@Query() query: PaginationQueryDto) {
    return this.reviewsService.findAll(query);
  }

  @Get('guide/:guideId/stats')
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.TRAVELER, Role.GUIDE, Role.AGENCY)
  @ApiRoleHeader()
  @ApiOperation({ summary: 'Get aggregated review statistics for a guide (100% computed, never faked)' })
  @ApiParam({ name: 'guideId', type: Number })
  @ApiResponse({ status: 200, description: 'Aggregated review metrics (count, avg, star breakdown, recommend %)' })
  getGuideStats(@Param('guideId', ParseIntPipe) guideId: number) {
    return this.reviewsService.getGuideStats(guideId);
  }

  @Get(':id')
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.TRAVELER, Role.GUIDE)
  @ApiRoleHeader()
  @ApiOperation({ summary: 'Get review by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Review found' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.reviewsService.findOne(id);
  }

  @Get('trip/:tripId')
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.TRAVELER, Role.GUIDE)
  @ApiRoleHeader()
  @ApiOperation({ summary: 'Get reviews by trip ID with pagination' })
  @ApiParam({ name: 'tripId', type: Number })
  @ApiResponse({ status: 200, description: 'Reviews for trip' })
  findByTrip(
    @Param('tripId', ParseIntPipe) tripId: number,
    @Query() query: PaginationQueryDto,
  ) {
    return this.reviewsService.findByTrip(tripId, query);
  }

  @Get('guide/:guideId')
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.TRAVELER, Role.GUIDE)
  @ApiRoleHeader()
  @ApiOperation({ summary: 'Get reviews by guide ID with pagination' })
  @ApiParam({ name: 'guideId', type: Number })
  @ApiResponse({ status: 200, description: 'Reviews for guide' })
  findByGuide(
    @Param('guideId', ParseIntPipe) guideId: number,
    @Query() query: PaginationQueryDto,
  ) {
    return this.reviewsService.findByGuide(guideId, query);
  }

  @Post()
  @Roles(Role.SUPERUSER, Role.TRAVELER)
  @ApiUserHeaders()
  @ApiOperation({ summary: 'Create a review (Allowed ONLY after COMPLETED booking, once per booking)' })
  @ApiResponse({ status: 201, description: 'Review created' })
  @ApiResponse({ status: 400, description: 'Validation error or booking not COMPLETED' })
  @ApiResponse({ status: 409, description: 'Duplicate review for booking' })
  create(@Body() dto: CreateReviewDto) {
    return this.reviewsService.create(dto);
  }

  @Post(':id/response')
  @Roles(Role.GUIDE)
  @ApiUserHeaders()
  @ApiOperation({ summary: 'Submit a guide response to a review' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Response recorded' })
  respond(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: GuideResponseDto,
    @Req() req: any,
  ) {
    const guideId = Number(req.user?.id || req.headers?.['x-user-id']);
    if (!guideId) throw new ForbiddenException('Guide ID required');
    return this.reviewsService.respondToReview(id, guideId, dto.response);
  }

  @Delete(':id')
  @Roles(Role.SUPERUSER, Role.ADMIN)
  @ApiRoleHeader()
  @ApiOperation({ summary: 'Delete a review' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Review deleted' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.reviewsService.remove(id);
  }
}
