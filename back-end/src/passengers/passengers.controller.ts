import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PassengersService } from './passengers.service';
import { CreatePassengerDto, UpdatePassengerDto } from './dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { ApiUserHeaders } from '../common/decorators/api-user-headers.decorator';

@ApiTags('passengers')
@Controller('passengers')
@UseGuards(RolesGuard)
@ApiBearerAuth()
@ApiUserHeaders()
export class PassengersController {
  constructor(private readonly passengersService: PassengersService) {}

  @Post()
  @Roles(Role.TRAVELER, Role.AGENCY, Role.ADMIN, Role.SUPERUSER)
  @ApiOperation({ summary: 'Create a passenger' })
  @ApiResponse({ status: 201, description: 'Passenger created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error (must have exactly one owner)', type: ErrorResponseDto })
  @ApiResponse({ status: 403, description: 'Forbidden', type: ErrorResponseDto })
  create(@Body() createPassengerDto: CreatePassengerDto) {
    return this.passengersService.create(createPassengerDto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.SUPERUSER)
  @ApiOperation({ summary: 'Get all passengers (Admin/Superuser only)' })
  @ApiResponse({ status: 200, description: 'Return all passengers' })
  @ApiResponse({ status: 403, description: 'Forbidden', type: ErrorResponseDto })
  findAll() {
    return this.passengersService.findAll();
  }

  @Get(':id')
  @Roles(Role.TRAVELER, Role.AGENCY, Role.ADMIN, Role.SUPERUSER)
  @ApiOperation({ summary: 'Get a passenger by ID (ownership checked via Guard)' })
  @ApiResponse({ status: 200, description: 'Return the passenger' })
  @ApiResponse({ status: 403, description: 'Forbidden (not owner)', type: ErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Not Found', type: ErrorResponseDto })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.passengersService.findOne(id);
  }

  @Get('traveler/:travelerId')
  @Roles(Role.TRAVELER, Role.ADMIN, Role.SUPERUSER)
  @ApiOperation({ summary: 'Get passengers by traveler ID (ownership checked via Guard)' })
  @ApiResponse({ status: 200, description: 'Return traveler passengers' })
  @ApiResponse({ status: 403, description: 'Forbidden (not owner)', type: ErrorResponseDto })
  findByTraveler(@Param('travelerId', ParseIntPipe) travelerId: number) {
    return this.passengersService.findByTraveler(travelerId);
  }

  @Get('agency/:agencyId')
  @Roles(Role.AGENCY, Role.ADMIN, Role.SUPERUSER)
  @ApiOperation({ summary: 'Get passengers by agency ID (ownership checked via Guard)' })
  @ApiResponse({ status: 200, description: 'Return agency passengers' })
  @ApiResponse({ status: 403, description: 'Forbidden (not owner)', type: ErrorResponseDto })
  findByAgency(@Param('agencyId', ParseIntPipe) agencyId: number) {
    return this.passengersService.findByAgency(agencyId);
  }

  @Patch(':id')
  @Roles(Role.TRAVELER, Role.AGENCY, Role.ADMIN, Role.SUPERUSER)
  @ApiOperation({ summary: 'Update a passenger (ownership checked via Guard)' })
  @ApiResponse({ status: 200, description: 'Passenger updated' })
  @ApiResponse({ status: 403, description: 'Forbidden (not owner)', type: ErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Not Found', type: ErrorResponseDto })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePassengerDto: UpdatePassengerDto,
  ) {
    return this.passengersService.update(id, updatePassengerDto);
  }

  @Delete(':id')
  @Roles(Role.TRAVELER, Role.AGENCY, Role.ADMIN, Role.SUPERUSER)
  @ApiOperation({ summary: 'Delete a passenger (ownership checked via Guard)' })
  @ApiResponse({ status: 200, description: 'Passenger deleted' })
  @ApiResponse({ status: 403, description: 'Forbidden (not owner)', type: ErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Not Found', type: ErrorResponseDto })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.passengersService.remove(id);
  }
}
