import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';
import { CreateAgencyDto } from './create-agency.dto';

export class CreateDirectAgencyDto extends CreateAgencyDto {
  @ApiPropertyOptional({ example: 'approved', enum: ['pending', 'approved', 'rejected'] })
  @IsOptional()
  @IsString()
  @IsIn(['pending', 'approved', 'rejected'])
  status?: string;

  @ApiPropertyOptional({ example: 1.5 })
  @IsOptional()
  @IsNumber()
  @Min(1.0)
  @Max(1.5)
  commissionRate?: number;
}
