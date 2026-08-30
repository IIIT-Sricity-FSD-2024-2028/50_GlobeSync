import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';

/**
 * UploadsModule — provides the POST /uploads/attachment endpoint.
 *
 * Relies on multer (already bundled inside @nestjs/platform-express)
 * via FileInterceptor. No additional runtime npm package is needed.
 */
@Module({
  controllers: [UploadsController],
})
export class UploadsModule {}
