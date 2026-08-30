import { Global, Module } from '@nestjs/common';
import { LogFileService } from './services/log-file.service';

/**
 * CommonModule — globally available infrastructure services.
 *
 * Decorated with @Global() so that LogFileService is injectable
 * everywhere (LoggerMiddleware, GlobalExceptionFilter, etc.) without
 * each consuming module needing to explicitly import CommonModule.
 */
@Global()
@Module({
  providers: [LogFileService],
  exports: [LogFileService],
})
export class CommonModule {}
