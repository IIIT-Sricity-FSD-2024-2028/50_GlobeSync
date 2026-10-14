import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateIntegrationDto {
  @ApiPropertyOptional({ example: 'Active', enum: ['Active', 'Inactive'] })
  @IsOptional()
  @IsString()
  @IsIn(['Active', 'Inactive'])
  status?: 'Active' | 'Inactive';

  @ApiPropertyOptional({ example: 'Production' })
  @IsOptional()
  @IsString()
  env?: string;

  @ApiPropertyOptional({ example: 'Updated integration description' })
  @IsOptional()
  @IsString()
  desc?: string;
}
