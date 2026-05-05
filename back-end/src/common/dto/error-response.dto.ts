import { ApiProperty } from '@nestjs/swagger';

/**
 * Standard error response DTO for Swagger documentation.
 */
export class ErrorResponseDto {
  @ApiProperty({ example: 404 })
  statusCode: number;

  @ApiProperty({ example: 'Not Found' })
  error: string;

  @ApiProperty({ example: 'Resource with the given ID was not found' })
  message: string | string[];

  @ApiProperty({ example: '2026-05-05T12:00:00.000Z' })
  timestamp: string;

  @ApiProperty({ example: '/travelers/abc-123' })
  path: string;
}
