import { IsInt, IsNotEmpty, IsString, MinLength, IsIn, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RequestGuideReassignmentDto {
  @ApiProperty({ description: 'ID of the proposed replacement guide', example: 5 })
  @IsInt()
  @IsNotEmpty()
  replacementGuideId: number;

  @ApiProperty({ description: 'Justification for requesting guide replacement', example: 'Guide reported health emergency' })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  reason: string;
}

export class TravelerConsentDto {
  @ApiProperty({ description: 'Traveler decision', enum: ['ACCEPT', 'REJECT'] })
  @IsIn(['ACCEPT', 'REJECT'])
  decision: 'ACCEPT' | 'REJECT';

  @ApiPropertyOptional({ description: 'Optional feedback or reason' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class GuideConsentDto {
  @ApiProperty({ description: 'Guide acceptance decision', enum: ['ACCEPT', 'DECLINE'] })
  @IsIn(['ACCEPT', 'DECLINE'])
  decision: 'ACCEPT' | 'DECLINE';

  @ApiPropertyOptional({ description: 'Optional note or reason' })
  @IsOptional()
  @IsString()
  reason?: string;
}

