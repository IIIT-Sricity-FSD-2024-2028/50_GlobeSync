import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateItineraryDto {
  @ApiProperty({ example: 1 }) @IsNotEmpty() @IsInt() tripId: number;
  @ApiProperty({ example: 'Paris' }) @IsNotEmpty() @IsString() city: string;
  @ApiProperty({ example: 1 }) @IsNotEmpty() @IsInt() @Min(1) dayNumber: number;
  @ApiProperty({ example: 'Visit Eiffel Tower' }) @IsNotEmpty() @IsString() activity: string;
  @ApiPropertyOptional({ example: 'Pending', enum: ['Pending', 'Confirmed', 'Completed'] })
  @IsOptional() @IsString() @IsIn(['Pending', 'Confirmed', 'Completed']) activityStatus?: string;
  @ApiProperty({ example: '10:00' }) @IsNotEmpty() @IsString() time: string;
}

export class UpdateItineraryDto {
  @ApiPropertyOptional({ example: 1 }) @IsOptional() @IsInt() tripId?: number;
  @ApiPropertyOptional({ example: 'Paris' }) @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional({ example: 1 }) @IsOptional() @IsInt() @Min(1) dayNumber?: number;
  @ApiPropertyOptional({ example: 'Visit Eiffel Tower' }) @IsOptional() @IsString() activity?: string;
  @ApiPropertyOptional({ example: 'Confirmed', enum: ['Pending', 'Confirmed', 'Completed'] })
  @IsOptional() @IsString() @IsIn(['Pending', 'Confirmed', 'Completed']) activityStatus?: string;
  @ApiPropertyOptional({ example: '10:00' }) @IsOptional() @IsString() time?: string;
}
