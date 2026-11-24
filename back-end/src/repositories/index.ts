import { Module, Global } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { UserRepository } from './user.repository';
import { AgencyRepository } from './agency.repository';
import { TripRepository } from './trip.repository';
import { PackageRepository } from './package.repository';
import { BookingRepository } from './booking.repository';
import { PaymentRepository, RefundRepository } from './payment.repository';
import { RevenueRepository, ReviewRepository, SystemConfigRepository } from './revenue.repository';

export * from './user.repository';
export * from './agency.repository';
export * from './trip.repository';
export * from './package.repository';
export * from './booking.repository';
export * from './payment.repository';
export * from './revenue.repository';

@Global()
@Module({
  providers: [
    PrismaService,
    UserRepository,
    AgencyRepository,
    TripRepository,
    PackageRepository,
    BookingRepository,
    PaymentRepository,
    RefundRepository,
    RevenueRepository,
    ReviewRepository,
    SystemConfigRepository,
  ],
  exports: [
    PrismaService,
    UserRepository,
    AgencyRepository,
    TripRepository,
    PackageRepository,
    BookingRepository,
    PaymentRepository,
    RefundRepository,
    RevenueRepository,
    ReviewRepository,
    SystemConfigRepository,
  ],
})
export class RepositoriesModule {}
