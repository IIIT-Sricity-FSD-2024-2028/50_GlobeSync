import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateTripDto {
  @ApiPropertyOptional({ example: 'Maldives' }) @IsOptional() @IsString() destination?: string;
  @ApiPropertyOptional({ example: '2026-08-01' }) @IsOptional() @IsString() startDate?: string;
  @ApiPropertyOptional({ example: '2026-08-07' }) @IsOptional() @IsString() endDate?: string;
  @ApiPropertyOptional({ example: 150000 }) @IsOptional() @IsNumber() @Min(0) budget?: number;
  @ApiPropertyOptional({ example: 1 }) @IsOptional() @IsNumber() travelerId?: number;
  @ApiPropertyOptional({ example: 1 }) @IsOptional() @IsNumber() guideId?: number;
  @ApiPropertyOptional({ example: 1 }) @IsOptional() @IsNumber() packageId?: number;
  @ApiPropertyOptional({ example: 'Confirmed', enum: ['Planning', 'Pending', 'Confirmed', 'Completed', 'Cancelled'] })
  @IsOptional() @IsString() @IsIn(['Planning', 'Pending', 'Confirmed', 'Completed', 'Cancelled']) status?: string;
}
