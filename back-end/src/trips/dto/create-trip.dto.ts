import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateTripDto {
  @ApiPropertyOptional({ example: 'Alps Family Holiday' })
  @IsOptional() @IsString()
  title?: string;

  @ApiPropertyOptional({ example: 'New Delhi, India', description: 'Starting / departure city (From)' })
  @IsOptional() @IsString()
  origin?: string;

  @ApiProperty({ example: 'Maldives', description: 'Trip destination (To)' })
  @IsNotEmpty() @IsString()
  destination: string;

  @ApiProperty({ example: '2026-08-01', description: 'Start date (YYYY-MM-DD)' })
  @IsNotEmpty() @IsString()
  startDate: string;

  @ApiProperty({ example: '2026-08-07', description: 'End date (YYYY-MM-DD)' })
  @IsNotEmpty() @IsString()
  endDate: string;

  @ApiProperty({ example: 150000, description: 'Trip budget' })
  @IsNotEmpty() @IsNumber() @Min(0)
  budget: number;

  @ApiPropertyOptional({ example: 1, description: 'Traveler ID' })
  @IsOptional() @IsNumber()
  travelerId?: number;

  @ApiPropertyOptional({ example: 1, description: 'Agency ID' })
  @IsOptional() @IsNumber()
  agencyId?: number;

  @ApiPropertyOptional({ example: 1, description: 'Guide ID (nullable)' })
  @IsOptional() @IsNumber()
  guideId?: number;

  @ApiPropertyOptional({ example: 1, description: 'Package ID (optional — omit for custom trips)' })
  @IsOptional() @IsNumber()
  packageId?: number;

  @ApiPropertyOptional({ example: 'Planning', enum: ['Planning', 'Pending', 'Confirmed', 'Completed', 'Cancelled'] })
  @IsOptional() @IsString()
  @IsIn(['Planning', 'Pending', 'Confirmed', 'Completed', 'Cancelled'])
  status?: string;

  @ApiPropertyOptional({ example: [3, 4] })
  @IsOptional() @IsArray()
  passengerIds?: number[];

  @ApiPropertyOptional()
  @IsOptional()
  transportDetails?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional() @IsArray()
  itineraryDays?: any[];

  @ApiPropertyOptional({ example: 'Family Leisure' })
  @IsOptional() @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 'Special dietary requests noted' })
  @IsOptional() @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional() @IsNumber()
  travelersCount?: number;
}
