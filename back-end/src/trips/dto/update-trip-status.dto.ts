import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateTripStatusDto {
  @ApiProperty({ example: 'Confirmed', enum: ['Planning', 'Pending', 'Confirmed', 'Active', 'Completed', 'Cancelled'] })
  @IsNotEmpty() @IsString()
  @IsIn(['Planning', 'Pending', 'Confirmed', 'Active', 'Completed', 'Cancelled'])
  status: string;

  @ApiPropertyOptional({ example: 'Change of travel plans', description: 'Mandatory or explanatory reason when status is Cancelled' })
  @IsOptional() @IsString()
  cancellationReason?: string;

  @ApiPropertyOptional({ example: 65, description: 'Eligible refund percentage (100% if >= 3 days before start, 65% if within 3 days)' })
  @IsOptional() @IsNumber()
  refundPercentage?: number;

  @ApiPropertyOptional({ example: 120250, description: 'Calculated refund amount in INR' })
  @IsOptional() @IsNumber()
  refundAmount?: number;
}
