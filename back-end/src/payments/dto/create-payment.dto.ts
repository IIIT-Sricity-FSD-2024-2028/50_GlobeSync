import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreatePaymentDto {
  @ApiProperty({ example: 52000 }) @IsNotEmpty() @IsNumber() @Min(0) amount: number;
  @ApiProperty({ example: '2026-08-01' }) @IsNotEmpty() @IsString() paymentDate: string;
  @ApiProperty({ example: 'Card', enum: ['Card', 'UPI', 'Cash'] })
  @IsNotEmpty() @IsString() @IsIn(['Card', 'UPI', 'Cash']) method: string;
  @ApiPropertyOptional({ example: 'Paid', enum: ['Paid', 'Pending'] })
  @IsOptional() @IsString() @IsIn(['Paid', 'Pending']) status?: string;
  @ApiProperty({ example: 1 }) @IsNotEmpty() @IsNumber() bookingId: number;
}
