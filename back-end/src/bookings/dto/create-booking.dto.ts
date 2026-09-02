import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Min, IsBoolean } from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({ example: '2026-08-01' }) @IsNotEmpty() @IsString() bookingDate: string;
  @ApiProperty({ example: 1 }) @IsNotEmpty() @IsNumber() tripId: number;
  @ApiPropertyOptional({ example: 1 }) @IsOptional() @IsNumber() travelerId?: number;
  @ApiPropertyOptional({ example: 1 }) @IsOptional() @IsNumber() agencyId?: number;
  @ApiProperty({ example: 'Emirates EK-101' }) @IsNotEmpty() @IsString() service: string;
  @ApiProperty({ example: 'Flight', enum: ['Flight', 'Hotel', 'Transport', 'Activity'] })
  @IsNotEmpty() @IsString() @IsIn(['Flight', 'Hotel', 'Transport', 'Activity']) type: string;
  @ApiProperty({ example: 52000 }) @IsNotEmpty() @IsNumber() @Min(0) amount: number;
  @ApiPropertyOptional({ example: 'Pending', enum: ['Pending', 'Confirmed', 'Cancelled'] })
  @IsOptional() @IsString() @IsIn(['Pending', 'Confirmed', 'Cancelled']) status?: string;

  @ApiPropertyOptional({ example: true }) @IsOptional() @IsBoolean() insuranceSelected?: boolean;
  @ApiPropertyOptional({ example: 'Flight' }) @IsOptional() @IsString() transportMode?: string;
  @ApiPropertyOptional({ example: true }) @IsOptional() @IsBoolean() cancellationProtectionSelected?: boolean;
  @ApiPropertyOptional({ example: 100 }) @IsOptional() @IsNumber() cancellationFee?: number;
  @ApiPropertyOptional({ example: 7 }) @IsOptional() @IsNumber() insuranceRate?: number;
  @ApiPropertyOptional({ example: 150 }) @IsOptional() @IsNumber() insuranceAmount?: number;
}
