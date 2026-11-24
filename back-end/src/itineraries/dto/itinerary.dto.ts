import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateItineraryDto {
  @ApiProperty({ example: 1 }) @IsNotEmpty() @IsInt() tripId: number;
  @ApiProperty({ example: 'Paris' }) @IsNotEmpty() @IsString() city: string;
  @ApiProperty({ example: 1 }) @IsNotEmpty() @IsInt() @Min(1) dayNumber: number;
  @ApiProperty({ example: 'Visit Eiffel Tower' }) @IsNotEmpty() @IsString() activity: string;
  @ApiPropertyOptional({ example: 'Pending', enum: ['Pending', 'Confirmed', 'Completed'] })
  @IsOptional() @IsString() @IsIn(['Pending', 'Confirmed', 'Completed']) activityStatus?: string;
  @ApiProperty({ example: '10:00' }) @IsNotEmpty() @IsString() time: string;

  @ApiPropertyOptional({ example: 'guide', enum: ['guide', 'agency'] })
  @IsOptional() @IsString() @IsIn(['guide', 'agency']) suggestedBy?: 'guide' | 'agency';

  @ApiPropertyOptional({ example: 'Suggested', enum: ['Approved', 'Suggested', 'Rejected'] })
  @IsOptional() @IsString() @IsIn(['Approved', 'Suggested', 'Rejected']) suggestionStatus?: 'Approved' | 'Suggested' | 'Rejected';

  @ApiPropertyOptional({ example: 'Recommended visit' })
  @IsOptional() @IsString() notes?: string;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional() @IsNumber() estimatedCost?: number;
}

export class UpdateItineraryDto {
  @ApiPropertyOptional({ example: 1 }) @IsOptional() @IsInt() tripId?: number;
  @ApiPropertyOptional({ example: 'Paris' }) @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional({ example: 1 }) @IsOptional() @IsInt() @Min(1) dayNumber?: number;
  @ApiPropertyOptional({ example: 'Visit Eiffel Tower' }) @IsOptional() @IsString() activity?: string;
  @ApiPropertyOptional({ example: 'Confirmed', enum: ['Pending', 'Confirmed', 'Completed'] })
  @IsOptional() @IsString() @IsIn(['Pending', 'Confirmed', 'Completed']) activityStatus?: string;
  @ApiPropertyOptional({ example: '10:00' }) @IsOptional() @IsString() time?: string;

  @ApiPropertyOptional({ example: 'agency', enum: ['guide', 'agency'] })
  @IsOptional() @IsString() @IsIn(['guide', 'agency']) suggestedBy?: 'guide' | 'agency';

  @ApiPropertyOptional({ example: 'Approved', enum: ['Approved', 'Suggested', 'Rejected'] })
  @IsOptional() @IsString() @IsIn(['Approved', 'Suggested', 'Rejected']) suggestionStatus?: 'Approved' | 'Suggested' | 'Rejected';

  @ApiPropertyOptional({ example: 'Approved activity' })
  @IsOptional() @IsString() notes?: string;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional() @IsNumber() estimatedCost?: number;
}
