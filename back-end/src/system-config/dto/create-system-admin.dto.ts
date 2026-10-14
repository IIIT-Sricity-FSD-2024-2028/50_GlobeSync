import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateSystemAdminDto {
  @ApiProperty({ example: 'Neha Verma' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: 'neha.admin@ticp.com' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'adminSecret123' })
  @IsNotEmpty()
  @IsString()
  @MinLength(4)
  password: string;

  @ApiProperty({ example: 'admin', enum: ['admin', 'superuser'] })
  @IsNotEmpty()
  @IsString()
  @IsIn(['admin', 'superuser'])
  role: 'admin' | 'superuser';
}
