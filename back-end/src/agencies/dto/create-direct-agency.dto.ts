import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { CreateAgencyDto } from './create-agency.dto';

export class CreateDirectAgencyDto extends CreateAgencyDto {
  @ApiPropertyOptional({ example: 'approved', enum: ['pending', 'approved', 'rejected'] })
  @IsOptional()
  @IsString()
  @IsIn(['pending', 'approved', 'rejected'])
  status?: string;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  commissionRate?: number;
}
