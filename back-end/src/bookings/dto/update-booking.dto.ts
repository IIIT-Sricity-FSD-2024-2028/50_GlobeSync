import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateBookingDto {
  @ApiPropertyOptional({ example: '2026-08-01' }) @IsOptional() @IsString() bookingDate?: string;
  @ApiPropertyOptional({ example: 1 }) @IsOptional() @IsNumber() tripId?: number;
  @ApiPropertyOptional({ example: 1 }) @IsOptional() @IsNumber() travelerId?: number;
  @ApiPropertyOptional({ example: 'Emirates EK-101' }) @IsOptional() @IsString() service?: string;
  @ApiPropertyOptional({ example: 'Flight', enum: ['Flight', 'Hotel', 'Transport', 'Activity'] })
  @IsOptional() @IsString() @IsIn(['Flight', 'Hotel', 'Transport', 'Activity']) type?: string;
  @ApiPropertyOptional({ example: 52000 }) @IsOptional() @IsNumber() @Min(0) amount?: number;
  @ApiPropertyOptional({ example: 'Confirmed', enum: ['Pending', 'Confirmed', 'Cancelled'] })
  @IsOptional() @IsString() @IsIn(['Pending', 'Confirmed', 'Cancelled']) status?: string;
}
