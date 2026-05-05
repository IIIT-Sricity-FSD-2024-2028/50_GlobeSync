import { Injectable, NotFoundException } from '@nestjs/common';
import { packages, Package } from '../data';
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

  remove(id: number): { message: string } {
    const index = packages.findIndex((p) => p.packageId === id);
    if (index === -1) {
      throw new NotFoundException(`Package with ID ${id} not found`);
    }
    packages.splice(index, 1);
    return { message: `Package with ID ${id} deleted successfully` };
  }
}
