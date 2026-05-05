import { Controller, Post, Body } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { TravelerLoginDto, StaffLoginDto, LoginResponseDto } from './dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('traveler-login')
  @ApiOperation({
    summary: 'Traveler login',
    description: 'Authenticate a traveler using email and password from in-memory data.',
  })
  @ApiBody({ type: TravelerLoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: LoginResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid email or password',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error — email or password missing/invalid',
  })
  travelerLogin(@Body() dto: TravelerLoginDto) {
    return this.authService.travelerLogin(dto.email, dto.password);
  }

  @Post('staff-login')
  @ApiOperation({
    summary: 'Staff login',
    description: 'Authenticate admin, superuser, guide, or support staff using email and password.',
  })
  @ApiBody({ type: StaffLoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: LoginResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid email or password',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error — email or password missing/invalid',
  })
  staffLogin(@Body() dto: StaffLoginDto) {
    return this.authService.staffLogin(dto.email, dto.password);
  }
}
