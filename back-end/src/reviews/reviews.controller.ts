import { Controller, Get, Post, Delete, Param, Body, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiUserHeaders } from '../common/decorators/api-user-headers.decorator';
import { ApiRoleHeader } from '../common/decorators/api-role-header.decorator';
import { Role } from '../common/enums/role.enum';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.TRAVELER, Role.GUIDE)
  @ApiRoleHeader()
  @ApiOperation({ summary: 'Get all reviews' })
  @ApiResponse({ status: 200, description: 'List of all reviews' })
  findAll() { return this.reviewsService.findAll(); }

  @Get(':id')
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.TRAVELER, Role.GUIDE)
  @ApiRoleHeader()
  @ApiOperation({ summary: 'Get review by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Review found' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  findOne(@Param('id', ParseIntPipe) id: number) { return this.reviewsService.findOne(id); }

  @Get('trip/:tripId')
  @Roles(Role.SUPERUSER, Role.ADMIN, Role.TRAVELER, Role.GUIDE)
  @ApiRoleHeader()
  @ApiOperation({ summary: 'Get reviews by trip ID' })
  @ApiParam({ name: 'tripId', type: Number })
  @ApiResponse({ status: 200, description: 'Reviews for trip' })
  findByTrip(@Param('tripId', ParseIntPipe) tripId: number) {
    return this.reviewsService.findByTrip(tripId);
  }

  @Post()
  @Roles(Role.SUPERUSER, Role.TRAVELER)
  @ApiUserHeaders()
  @ApiOperation({ summary: 'Create a review' })
  @ApiResponse({ status: 201, description: 'Review created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  create(@Body() dto: CreateReviewDto) { return this.reviewsService.create(dto); }

  @Delete(':id')
  @Roles(Role.SUPERUSER, Role.ADMIN)
  @ApiRoleHeader()
  @ApiOperation({ summary: 'Delete a review' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Review deleted' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  remove(@Param('id', ParseIntPipe) id: number) { return this.reviewsService.remove(id); }
}
