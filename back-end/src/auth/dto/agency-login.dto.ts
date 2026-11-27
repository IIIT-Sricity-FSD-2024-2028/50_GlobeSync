import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class AgencyLoginDto {
  @ApiProperty({ example: 'contact@elitetravel.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password' })
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}
