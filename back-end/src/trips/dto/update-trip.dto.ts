import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsIn, IsNumber, IsOptional, IsString, Min, IsObject } from 'class-validator';

export class UpdateTripDto {
  @ApiPropertyOptional({ example: 'Alps Family Holiday' }) @IsOptional() @IsString() title?: string;
  @ApiPropertyOptional({ example: 'New Delhi, India', description: 'Starting / departure city (From)' }) @IsOptional() @IsString() origin?: string;
  @ApiPropertyOptional({ example: 'Maldives' }) @IsOptional() @IsString() destination?: string;
  @ApiPropertyOptional({ example: '2026-08-01' }) @IsOptional() @IsString() startDate?: string;
  @ApiPropertyOptional({ example: '2026-08-07' }) @IsOptional() @IsString() endDate?: string;
  @ApiPropertyOptional({ example: 150000 }) @IsOptional() @IsNumber() @Min(0) budget?: number;
  @ApiPropertyOptional({ example: 1 }) @IsOptional() @IsNumber() travelerId?: number;
  @ApiPropertyOptional({ example: 1 }) @IsOptional() @IsNumber() agencyId?: number;
  @ApiPropertyOptional({ example: 1 }) @IsOptional() @IsNumber() guideId?: number;
  @ApiPropertyOptional({ example: 1 }) @IsOptional() @IsNumber() packageId?: number;
  @ApiPropertyOptional({ example: 'Confirmed', enum: ['Planning', 'Pending', 'Confirmed', 'Active', 'Completed', 'Cancelled'] })
  @IsOptional() @IsString() @IsIn(['Planning', 'Pending', 'Confirmed', 'Active', 'Completed', 'Cancelled']) status?: string;
  @ApiPropertyOptional({ example: 'Accepted', enum: ['Pending', 'Accepted', 'Declined'] })
  @IsOptional() @IsString() @IsIn(['Pending', 'Accepted', 'Declined']) guideStatus?: string;
  @ApiPropertyOptional({ example: 'Schedule conflict or verified availability' })
  @IsOptional()
  @IsString()
  guideDecisionReason?: string;
  @ApiPropertyOptional({ example: 'Schedule conflict' })
  @IsOptional()
  @IsString()
  reason?: string;
  @ApiPropertyOptional({ example: [3, 4] }) @IsOptional() @IsArray() passengerIds?: number[];
  @ApiPropertyOptional() @IsOptional() transportDetails?: Record<string, any>;
  @ApiPropertyOptional() @IsOptional() @IsArray() itineraryDays?: any[];
  @ApiPropertyOptional({ example: 'Family Leisure' }) @IsOptional() @IsString() category?: string;
  @ApiPropertyOptional({ example: 'Special dietary requests noted' }) @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional({ example: 2 }) @IsOptional() @IsNumber() travelersCount?: number;
  @ApiPropertyOptional({ example: 'Medical emergency' }) @IsOptional() @IsString() cancellationReason?: string;
  @ApiPropertyOptional({ example: '2026-11-13T10:00:00Z' }) @IsOptional() @IsString() cancelledAt?: string;
  @ApiPropertyOptional({ example: 65 }) @IsOptional() @IsNumber() refundPercentage?: number;
  @ApiPropertyOptional({ example: 120250 }) @IsOptional() @IsNumber() refundAmount?: number;

  @ApiPropertyOptional({ description: 'Unfinished trip plan saved as a draft so the traveler can resume booking' })
  @IsOptional() @IsObject()
  draftPlan?: Record<string, any>;
}
