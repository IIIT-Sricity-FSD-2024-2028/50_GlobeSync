import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({ example: 1 }) @IsNotEmpty() @IsInt() tripId: number;
  @ApiProperty({ example: 1 }) @IsNotEmpty() @IsInt() travelerId: number;
  @ApiProperty({ example: 1 }) @IsNotEmpty() @IsInt() guideId: number;
  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @IsNotEmpty() @IsNumber() @Min(1) @Max(5) tripRating: number;
  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @IsNotEmpty() @IsNumber() @Min(1) @Max(5) guideRating: number;
  @ApiProperty({ example: 'Amazing trip!' }) @IsNotEmpty() @IsString() comment: string;
  @ApiPropertyOptional({ example: '2026-08-01' }) @IsOptional() @IsString() createdAt?: string;
}
