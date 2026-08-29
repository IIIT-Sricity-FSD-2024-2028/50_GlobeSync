import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional } from 'class-validator';

export class UpdateAgencyStatusDto {
  @ApiProperty({ example: 'approved', enum: ['pending', 'approved', 'rejected'] })
  @IsIn(['pending', 'approved', 'rejected'])
  status: 'pending' | 'approved' | 'rejected';

  @ApiPropertyOptional({ example: 15, description: 'Commission rate percentage, typically required when approving' })
  @IsOptional()
  @IsNumber()
  commissionRate?: number;
}
