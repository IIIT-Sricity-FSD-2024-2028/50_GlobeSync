import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateTripDto {
  @ApiProperty({ example: 'Maldives', description: 'Trip destination' })
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

  @ApiProperty({ example: 1, description: 'Traveler ID' })
  @IsNotEmpty() @IsNumber()
  travelerId: number;

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
}
