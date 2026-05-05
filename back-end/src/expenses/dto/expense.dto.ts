import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateExpenseDto {
  @ApiProperty({ example: 15000 }) @IsNotEmpty() @IsNumber() @Min(0) amount: number;
  @ApiProperty({ example: 'Hotel', enum: ['Hotel', 'Flight', 'Transport', 'Food', 'Activity', 'Shopping'] })
  @IsNotEmpty() @IsString() @IsIn(['Hotel', 'Flight', 'Transport', 'Food', 'Activity', 'Shopping']) type: string;
  @ApiProperty({ example: 1 }) @IsNotEmpty() @IsInt() tripId: number;
  @ApiProperty({ example: 'Airport lounge access' }) @IsNotEmpty() @IsString() description: string;
}

export class UpdateExpenseDto {
  @ApiPropertyOptional({ example: 15000 }) @IsOptional() @IsNumber() @Min(0) amount?: number;
  @ApiPropertyOptional({ example: 'Food', enum: ['Hotel', 'Flight', 'Transport', 'Food', 'Activity', 'Shopping'] })
  @IsOptional() @IsString() @IsIn(['Hotel', 'Flight', 'Transport', 'Food', 'Activity', 'Shopping']) type?: string;
  @ApiPropertyOptional({ example: 1 }) @IsOptional() @IsInt() tripId?: number;
  @ApiPropertyOptional({ example: 'Updated description' }) @IsOptional() @IsString() description?: string;
}
