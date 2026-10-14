import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import {
  packages, Package,
  trips,
  bookings,
  itineraries,
  expenses,
  payments,
  packageBookings,
  commissionLedger,
} from '../data';
import { CreatePackageDto, UpdatePackageDto } from './dto';

@Injectable()
export class PackagesService {
  findAll(): Package[] {
    return packages;
  }

  findOne(id: number): Package {
    const pkg = packages.find((p) => p.packageId === id);
    if (!pkg) {
      throw new NotFoundException(`Package with ID ${id} not found`);
    }
    return pkg;
  }

  create(dto: CreatePackageDto): Package {
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
    };

    packages.push(newPackage);
    return newPackage;
  }

  update(id: number, dto: UpdatePackageDto): Package {
    const index = packages.findIndex((p) => p.packageId === id);
    if (index === -1) {
      throw new NotFoundException(`Package with ID ${id} not found`);
    }

    const existing = packages[index];
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
    return updated;
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
