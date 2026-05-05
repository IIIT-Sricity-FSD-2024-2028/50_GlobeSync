import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateRefundDto {
  @ApiProperty({ example: 2 }) @IsNotEmpty() @IsNumber() paymentId: number;
  @ApiProperty({ example: '2026-08-01' }) @IsNotEmpty() @IsString() refundDate: string;
  @ApiPropertyOptional({ example: '14:30:00' }) @IsOptional() @IsString() refundTime?: string;
  @ApiPropertyOptional({ example: 'Processing', enum: ['Processing', 'Completed', 'Rejected'] })
  @IsOptional() @IsString() @IsIn(['Processing', 'Completed', 'Rejected']) refundStatus?: string;
}

export class UpdateRefundStatusDto {
  @ApiProperty({ example: 'Completed', enum: ['Processing', 'Completed', 'Rejected'] })
  @IsNotEmpty() @IsString() @IsIn(['Processing', 'Completed', 'Rejected']) refundStatus: string;
}
