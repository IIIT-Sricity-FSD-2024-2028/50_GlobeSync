import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { VirusScannerService } from './virus-scanner.service';
import { StorageService } from './storage.service';

@Module({
  controllers: [UploadsController],
  providers: [VirusScannerService, StorageService],
  exports: [VirusScannerService, StorageService],
})
export class UploadsModule {}
