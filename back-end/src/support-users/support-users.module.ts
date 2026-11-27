import { Module } from '@nestjs/common';
import { SupportUsersController } from './support-users.controller';
import { SupportUsersService } from './support-users.service';

@Module({
  controllers: [SupportUsersController],
  providers: [SupportUsersService],
  exports: [SupportUsersService],
})
export class SupportUsersModule {}
