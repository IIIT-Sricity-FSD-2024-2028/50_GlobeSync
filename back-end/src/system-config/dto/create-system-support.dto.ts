import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateSystemSupportDto {
  @ApiProperty({ example: 'Ravi Kumar' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: '9876543210' })
  @IsNotEmpty()
  @IsString()
  contact: string;

  @ApiProperty({ example: 'ravi.support@gmail.com' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'supportSecret123' })
  @IsNotEmpty()
  @IsString()
  @MinLength(4)
  password: string;
}
