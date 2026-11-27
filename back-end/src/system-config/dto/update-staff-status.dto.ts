import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class UpdateStaffStatusDto {
  @ApiProperty({ example: 'deactivated', enum: ['active', 'deactivated'] })
  @IsNotEmpty()
  @IsString()
  @IsIn(['active', 'deactivated'])
  status: 'active' | 'deactivated';
}
