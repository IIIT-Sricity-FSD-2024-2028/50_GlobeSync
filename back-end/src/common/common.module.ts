import { Global, Module } from '@nestjs/common';
import { LogFileService } from './services/log-file.service';
import { PinoLoggerService } from './logger/pino-logger.service';

/**
 * CommonModule — globally available infrastructure services.
 *
 * Decorated with @Global() so that LogFileService and PinoLoggerService
 * are injectable everywhere without needing module re-imports.
 */
@Global()
@Module({
  providers: [LogFileService, PinoLoggerService],
  exports: [LogFileService, PinoLoggerService],
})
export class CommonModule {}
