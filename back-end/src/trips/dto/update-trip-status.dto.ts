import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class UpdateTripStatusDto {
  @ApiProperty({ example: 'Confirmed', enum: ['Planning', 'Pending', 'Confirmed', 'Completed', 'Cancelled'] })
  @IsNotEmpty() @IsString()
  @IsIn(['Planning', 'Pending', 'Confirmed', 'Completed', 'Cancelled'])
  status: string;
}
