import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class UpdateTripStatusDto {
  @ApiProperty({ example: 'Confirmed', enum: ['Planning', 'Pending', 'Confirmed', 'Active', 'Completed', 'Cancelled'] })
  @IsNotEmpty() @IsString()
  @IsIn(['Planning', 'Pending', 'Confirmed', 'Active', 'Completed', 'Cancelled'])
  status: string;
}
