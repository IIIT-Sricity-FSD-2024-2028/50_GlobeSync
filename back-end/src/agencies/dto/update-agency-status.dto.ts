import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, Min, Max } from 'class-validator';

export class UpdateAgencyStatusDto {
  @ApiProperty({ example: 'approved', enum: ['pending', 'approved', 'rejected'] })
  @IsIn(['pending', 'approved', 'rejected'])
  status: 'pending' | 'approved' | 'rejected';

  @ApiPropertyOptional({ example: 1.5, description: 'Commission rate percentage (1.0 to 1.5), typically required when approving' })
  @IsOptional()
  @IsNumber()
  @Min(1.0)
  @Max(1.5)
  commissionRate?: number;
}
