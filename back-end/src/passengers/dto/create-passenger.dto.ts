import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreatePassengerDto {
  @ApiProperty({ example: 'Jane Doe' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: 30 })
  @IsNotEmpty()
  @IsNumber()
  age: number;

  @ApiProperty({ example: 'Female' })
  @IsNotEmpty()
  @IsString()
  gender: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  travelerId?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  agencyId?: number;
}
