import { Module, Global } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { EmailService } from './email.service';
import { PrismaService } from '../database/prisma.service';

@Global()
@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, EmailService, PrismaService],
  exports: [NotificationsService, EmailService],
})
export class NotificationsModule {}
