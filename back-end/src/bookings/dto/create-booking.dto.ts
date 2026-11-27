import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Min, IsBoolean } from 'class-validator';

export class CreateBookingDto {
  @ApiPropertyOptional({ example: '2026-08-01' }) @IsOptional() @IsString() bookingDate?: string;
  @ApiProperty({ example: 1 }) @IsNotEmpty() @IsNumber() tripId: number;
  @ApiPropertyOptional({ example: 1 }) @IsOptional() @IsNumber() travelerId?: number;
  @ApiPropertyOptional({ example: 1 }) @IsOptional() @IsNumber() agencyId?: number;
  @ApiProperty({ example: 'Emirates EK-101' }) @IsNotEmpty() @IsString() service: string;
  @ApiProperty({ example: 'Flight', enum: ['Flight', 'Hotel', 'Transport', 'Activity', 'Package'] })
  @IsNotEmpty() @IsString() @IsIn(['Flight', 'Hotel', 'Transport', 'Activity', 'Package']) type: string;
  @ApiProperty({ example: 52000 }) @IsNotEmpty() @IsNumber() @Min(0) amount: number;
  @ApiPropertyOptional({ example: 'Pending', enum: ['DRAFT', 'HELD', 'PAID', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'EXPIRED', 'REFUNDED', 'Pending', 'Confirmed', 'Cancelled'] })
  @IsOptional() @IsString() @IsIn(['DRAFT', 'HELD', 'PAID', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'EXPIRED', 'REFUNDED', 'Pending', 'Confirmed', 'Cancelled']) status?: string;

  @ApiPropertyOptional({ example: true }) @IsOptional() @IsBoolean() insuranceSelected?: boolean;
  @ApiPropertyOptional({ example: 'Flight' }) @IsOptional() @IsString() transportMode?: string;
  @ApiPropertyOptional({ example: true }) @IsOptional() @IsBoolean() cancellationProtectionSelected?: boolean;
  @ApiPropertyOptional({ example: 100 }) @IsOptional() @IsNumber() cancellationFee?: number;
  @ApiPropertyOptional({ example: 7 }) @IsOptional() @IsNumber() insuranceRate?: number;
  @ApiPropertyOptional({ example: 150 }) @IsOptional() @IsNumber() insuranceAmount?: number;

  @ApiPropertyOptional({ example: '2026-08-10T10:00:00.000Z' }) @IsOptional() @IsString() departureAtUtc?: string;
  @ApiPropertyOptional({ example: '2026-08-10T10:00:00.000Z' }) @IsOptional() @IsString() departure_at_utc?: string;
  @ApiPropertyOptional({ example: 'UTC' }) @IsOptional() @IsString() departureTimezone?: string;
  @ApiPropertyOptional({ example: 'UTC' }) @IsOptional() @IsString() departure_timezone?: string;

  @ApiPropertyOptional({ description: 'Inventory items to reserve' })
  @IsOptional()
  items?: Array<{ inventoryRef: string; quantity: number }>;

  @ApiPropertyOptional({ example: 4 }) @IsOptional() @IsNumber() guideId?: number;
  @ApiPropertyOptional({ example: 1 }) @IsOptional() @IsNumber() packageId?: number;
  @ApiPropertyOptional({ example: '2026-12-01' }) @IsOptional() @IsString() startDate?: string;
  @ApiPropertyOptional({ example: '2026-12-05' }) @IsOptional() @IsString() endDate?: string;
}
