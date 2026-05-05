import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({ example: '2026-08-01' }) @IsNotEmpty() @IsString() bookingDate: string;
  @ApiProperty({ example: 1 }) @IsNotEmpty() @IsNumber() tripId: number;
  @ApiProperty({ example: 1 }) @IsNotEmpty() @IsNumber() travelerId: number;
  @ApiProperty({ example: 'Emirates EK-101' }) @IsNotEmpty() @IsString() service: string;
  @ApiProperty({ example: 'Flight', enum: ['Flight', 'Hotel', 'Transport', 'Activity'] })
  @IsNotEmpty() @IsString() @IsIn(['Flight', 'Hotel', 'Transport', 'Activity']) type: string;
  @ApiProperty({ example: 52000 }) @IsNotEmpty() @IsNumber() @Min(0) amount: number;
  @ApiPropertyOptional({ example: 'Pending', enum: ['Pending', 'Confirmed', 'Cancelled'] })
  @IsOptional() @IsString() @IsIn(['Pending', 'Confirmed', 'Cancelled']) status?: string;
}
