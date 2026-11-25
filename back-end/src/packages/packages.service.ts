import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Optional,
} from '@nestjs/common';
import { NotificationsService } from '../notifications/notifications.service';
import {
  packages, Package,
  trips,
  bookings,
  itineraries,
  expenses,
  payments,
  packageBookings,
  commissionLedger,
  agencies,
  agencySubscriptions,
  subscriptionPlans,
} from '../data';
import { CreatePackageDto, UpdatePackageDto } from './dto';
import { PaginationQueryDto, PaginatedResult } from '../common/dto/pagination-query.dto';
import { paginateCollection } from '../common/utils/pagination.util';

@Injectable()
export class PackagesService {
  constructor(
    @Optional() private readonly notificationsService?: NotificationsService,
  ) {}
  findAll(): Package[];
  findAll(query: PaginationQueryDto): Package[] | PaginatedResult<Package>;
  findAll(query?: PaginationQueryDto): any {
    return paginateCollection(packages, query, ['name', 'destinations', 'description']);
  }

  findByAgency(agencyId: number): Package[];
  findByAgency(agencyId: number, query: PaginationQueryDto): Package[] | PaginatedResult<Package>;
  findByAgency(agencyId: number, query?: PaginationQueryDto): any {
    const list = packages.filter((p) => p.agencyId === agencyId);
    return paginateCollection(list, query, ['name', 'destinations', 'description']);
  }

  findOne(id: number): Package {
    const pkg = packages.find((p) => p.packageId === id);
    if (!pkg) {
      throw new NotFoundException(`Package with ID ${id} not found`);
    }
    return pkg;
  }

  /**
   * Create a package.
   * Enforces:
   * 1. Only APPROVED agencies can publish packages.
   * 2. Subscription tier limits (booking allowance, package allowance, featured slots).
   */
  create(dto: CreatePackageDto, creatorRole?: string, creatorId?: number): Package {
    const agencyId = dto.agencyId ?? (creatorRole?.toLowerCase() === 'agency' ? creatorId : undefined);

    if (agencyId) {
      const agency = agencies.find((a) => a.agencyId === agencyId);
      if (!agency) {
        throw new NotFoundException(`Agency with ID ${agencyId} not found`);
      }

      // 1. Approval check
      const isApproved =
        agency.status === 'approved' ||
        (agency as any).approvalStatus === 'APPROVED' ||
        (agency as any).approval_status === 'APPROVED';

      if (!isApproved) {
        throw new ForbiddenException('Only APPROVED agencies can publish packages.');
      }

      // 2. Subscription tier limits check
      const sub = agencySubscriptions.find(
        (s) => s.agency_id === agencyId && s.status !== 'CANCELLED',
      );
      const plan = sub
        ? subscriptionPlans.find((p) => p.plan_id === sub.plan_id)
        : subscriptionPlans[0]; // Default Basic plan

      const existingAgencyPackages = packages.filter((p) => p.agencyId === agencyId);

      // Package limit check
      const maxPackages = plan?.maxPackages ?? 10;
      if (existingAgencyPackages.length >= maxPackages) {
        throw new ForbiddenException(
          `Subscription limit reached: Current tier (${plan?.name || 'BASIC'}) allows up to ${maxPackages} packages. Please upgrade your subscription.`,
        );
      }

      // Featured slot limit check
      if (dto.isFeatured) {
        const featuredCount = existingAgencyPackages.filter((p) => p.isFeatured).length;
        const maxFeatured = plan?.maxFeaturedSlots ?? 2;
        if (featuredCount >= maxFeatured) {
          throw new ForbiddenException(
            `Featured slots limit reached: Current tier (${plan?.name || 'BASIC'}) allows up to ${maxFeatured} featured packages.`,
          );
        }
      }
    }

    const maxId = packages.length > 0
      ? Math.max(...packages.map((p) => p.packageId))
      : 0;

    const newPackage: Package = {
      packageId: maxId + 1,
      name: dto.name,
      destinations: dto.destinations,
      budget: dto.budget,
      duration: dto.duration,
      description: dto.description || '',
      highlights: dto.highlights || '',
      image: dto.image || '',
      agencyId,
      isFeatured: dto.isFeatured ?? false,
      status: dto.status || 'published',
    };

    packages.push(newPackage);

    if (creatorRole?.toLowerCase() === 'admin' && this.notificationsService) {
      this.notificationsService.createNotification(
        1,
        'Package Created by Admin',
        `Admin #${creatorId || 1} created package #${newPackage.packageId} '${newPackage.name}' (Budget: ₹${newPackage.budget}, Duration: ${newPackage.duration} days).`,
        { role: 'superuser', type: 'package_created', metadata: { packageId: newPackage.packageId, budget: newPackage.budget } },
      ).catch(() => {});
    }

    return newPackage;
  }

  update(id: number, dto: UpdatePackageDto, actor?: { role: string; userId: number; name?: string }): Package {
    const index = packages.findIndex((p) => p.packageId === id);
    if (index === -1) {
      throw new NotFoundException(`Package with ID ${id} not found`);
    }

    const existing = packages[index];
    const previousValues = { ...existing };
    const updated: Package = {
      ...existing,
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.destinations !== undefined && { destinations: dto.destinations }),
      ...(dto.budget !== undefined && { budget: dto.budget }),
      ...(dto.duration !== undefined && { duration: dto.duration }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.highlights !== undefined && { highlights: dto.highlights }),
      ...(dto.image !== undefined && { image: dto.image }),
    };

    packages[index] = updated;

    if (actor?.role?.toLowerCase() === 'admin' && this.notificationsService) {
      this.notificationsService.createNotification(
        1,
        `Package #${id} Modified by Admin`,
        `Admin ${actor.name || 'Admin'} modified package '${updated.name}'.`,
        { role: 'superuser', type: 'package_updated', metadata: { packageId: id, previousValues, updatedValues: dto } },
      ).catch(() => {});
    }

    return updated;
  }

  archive(id: number, reason: string, actor?: { role: string; userId: number; name?: string }): Package {
    const index = packages.findIndex((p) => p.packageId === id);
    if (index === -1) {
      throw new NotFoundException(`Package with ID ${id} not found`);
    }

    const pkg = packages[index];
    pkg.status = 'archived';
    pkg.archivedAt = new Date().toISOString();
    pkg.archivedReason = reason || 'Archived by administrator';
    pkg.archivedBy = actor?.userId || 1;

    if (this.notificationsService) {
      this.notificationsService.createNotification(
        1,
        `Package #${id} Archived by Admin`,
        `Admin ${actor?.name || 'Admin'} archived package '${pkg.name}'. Reason: "${reason}". New bookings are now prevented while historical records remain intact.`,
        { role: 'superuser', type: 'package_archived', metadata: { packageId: id, reason } },
      ).catch(() => {});
    }

    return pkg;
  }

  /**
   * Checks all dependent collections for references to the given packageId.
   * Returns a list of human-readable dependency descriptions, or empty if none.
   */
  private findPackageDependents(packageId: number): string[] {
    const dependents: string[] = [];

    // Trips referencing this package
    const dependentTrips = trips.filter((t) => t.packageId === packageId);
    if (dependentTrips.length > 0) {
      dependents.push(
        `${dependentTrips.length} trip(s): IDs [${dependentTrips.map((t) => t.tripId).join(', ')}]`,
      );
    }

    // Package bookings referencing this package
    const dependentPkgBookings = packageBookings.filter((pb) => pb.packageId === packageId);
    if (dependentPkgBookings.length > 0) {
      dependents.push(
        `${dependentPkgBookings.length} package booking(s): IDs [${dependentPkgBookings.map((pb) => pb.packageBookingId).join(', ')}]`,
      );
    }

    // Bookings tied to trips that reference this package
    const tripIds = dependentTrips.map((t) => t.tripId);
    if (tripIds.length > 0) {
      const dependentBookings = bookings.filter((b) => tripIds.includes(b.tripId));
      if (dependentBookings.length > 0) {
        dependents.push(
          `${dependentBookings.length} booking(s) via trips`,
        );
      }

      const dependentItineraries = itineraries.filter((i) => tripIds.includes(i.tripId));
      if (dependentItineraries.length > 0) {
        dependents.push(
          `${dependentItineraries.length} itinerary item(s) via trips`,
        );
      }

      const dependentExpenses = expenses.filter((e) => tripIds.includes(e.tripId));
      if (dependentExpenses.length > 0) {
        dependents.push(
          `${dependentExpenses.length} expense(s) via trips`,
        );
      }

      const dependentPayments = payments.filter((p) => p.tripId && tripIds.includes(p.tripId));
      if (dependentPayments.length > 0) {
        dependents.push(
          `${dependentPayments.length} payment(s) via trips`,
        );
      }

      const dependentCommissions = commissionLedger.filter((c) => tripIds.includes(c.tripId));
      if (dependentCommissions.length > 0) {
        dependents.push(
          `${dependentCommissions.length} commission ledger entry/entries via trips`,
        );
      }
    }

    return dependents;
  }

  remove(id: number): { message: string } {
    const index = packages.findIndex((p) => p.packageId === id);
    if (index === -1) {
      throw new NotFoundException(`Package with ID ${id} not found`);
    }

    const dependents = this.findPackageDependents(id);
    if (dependents.length > 0) {
      throw new ConflictException(
        `Cannot delete package ${id}: referenced by ${dependents.join('; ')}. Remove or reassign dependent records first.`,
      );
    }

    packages.splice(index, 1);
    return { message: `Package with ID ${id} deleted successfully` };
  }
}
