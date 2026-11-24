import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { passengers, Passenger } from '../data';
import { CreatePassengerDto, UpdatePassengerDto } from './dto';

@Injectable()
export class PassengersService {
  findAll(): Passenger[] {
    return passengers;
  }

  findOne(id: number): Passenger {
    const passenger = passengers.find((p) => p.passId === id);
    if (!passenger) {
      throw new NotFoundException(`Passenger with ID ${id} not found`);
    }
    return passenger;
  }

  findByTraveler(travelerId: number): Passenger[] {
    return passengers.filter((p) => p.travelerId === travelerId);
  }

  findByAgency(agencyId: number): Passenger[] {
    return passengers.filter((p) => p.agencyId === agencyId);
  }

  create(dto: CreatePassengerDto): Passenger {
    if (!!dto.travelerId === !!dto.agencyId) {
      throw new BadRequestException('Exactly one of travelerId or agencyId must be provided.');
    }

    this.validatePassengerData(dto);

    const category =
      dto.passengerCategory ||
      (dto.age < 2 ? 'Infant' : dto.age < 12 ? 'Child' : 'Adult');

    const maxId = passengers.length > 0 ? Math.max(...passengers.map((p) => p.passId)) : 0;
    const newPassenger: Passenger = {
      passId: maxId + 1,
      name: dto.name,
      age: dto.age,
      gender: dto.gender,
      travelerId: dto.travelerId,
      agencyId: dto.agencyId,
      email: dto.email,
      phone: dto.phone,
      dob: dto.dob,
      idType: dto.idType,
      idNumber: dto.idNumber,
      passengerCategory: category,
      specialNotes: dto.specialNotes,
    };
    passengers.push(newPassenger);
    return newPassenger;
  }

  update(id: number, dto: UpdatePassengerDto): Passenger {
    const idx = passengers.findIndex((p) => p.passId === id);
    if (idx === -1) {
      throw new NotFoundException(`Passenger with ID ${id} not found`);
    }

    if (dto.travelerId !== undefined || dto.agencyId !== undefined) {
      const tId = dto.travelerId !== undefined ? dto.travelerId : passengers[idx].travelerId;
      const aId = dto.agencyId !== undefined ? dto.agencyId : passengers[idx].agencyId;
      if (!!tId === !!aId) {
        throw new BadRequestException('Exactly one of travelerId or agencyId must be present.');
      }
    }

    this.validatePassengerData(dto, passengers[idx]);

    const effectiveAge = dto.age !== undefined ? dto.age : passengers[idx].age;
    const effectiveCategory =
      dto.passengerCategory !== undefined
        ? dto.passengerCategory
        : passengers[idx].passengerCategory ||
          (effectiveAge < 2 ? 'Infant' : effectiveAge < 12 ? 'Child' : 'Adult');

    const updated: Passenger = {
      ...passengers[idx],
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.age !== undefined && { age: dto.age }),
      ...(dto.gender !== undefined && { gender: dto.gender }),
      ...(dto.travelerId !== undefined && { travelerId: dto.travelerId }),
      ...(dto.agencyId !== undefined && { agencyId: dto.agencyId }),
      ...(dto.email !== undefined && { email: dto.email }),
      ...(dto.phone !== undefined && { phone: dto.phone }),
      ...(dto.dob !== undefined && { dob: dto.dob }),
      ...(dto.idType !== undefined && { idType: dto.idType }),
      ...(dto.idNumber !== undefined && { idNumber: dto.idNumber }),
      ...(dto.specialNotes !== undefined && { specialNotes: dto.specialNotes }),
      passengerCategory: effectiveCategory,
    };
    passengers[idx] = updated;
    return updated;
  }

  private validatePassengerData(dto: Partial<CreatePassengerDto>, current?: Passenger) {
    const idType = dto.idType !== undefined ? dto.idType : current?.idType;
    const idNumber = dto.idNumber !== undefined ? dto.idNumber : current?.idNumber;
    const age = dto.age !== undefined ? dto.age : current?.age;
    const category = dto.passengerCategory !== undefined ? dto.passengerCategory : current?.passengerCategory;
    const phone = dto.phone !== undefined ? dto.phone : current?.phone;
    const email = dto.email !== undefined ? dto.email : current?.email;

    // 1. ID Type and ID Number validation
    if (idType) {
      const allowedIdTypes = ['Passport', 'Aadhaar', 'Driving License', 'PAN Card', 'Voter ID'];
      if (!allowedIdTypes.includes(idType)) {
        throw new BadRequestException(`Invalid ID type: ${idType}. Supported types: ${allowedIdTypes.join(', ')}`);
      }
    }

    if (idNumber && idType) {
      const trimmedId = idNumber.trim();
      if (idType === 'Passport' && !/^[A-Z0-9]{6,12}$/i.test(trimmedId)) {
        throw new BadRequestException('Invalid Passport format. Must be 6-12 alphanumeric characters.');
      }
      if (idType === 'Aadhaar' && !/^\d{12}$/.test(trimmedId.replace(/\s+/g, ''))) {
        throw new BadRequestException('Invalid Aadhaar format. Must be exactly 12 numeric digits.');
      }
      if (idType === 'Driving License' && !/^[A-Z]{2}[-\s]?\d{2}[-\s]?\d{4}[-\s]?\d{7}$/i.test(trimmedId)) {
        throw new BadRequestException('Invalid Driving License format (e.g. DL-1420110012345).');
      }
      if (idType === 'PAN Card' && !/^[A-Z]{5}\d{4}[A-Z]$/i.test(trimmedId)) {
        throw new BadRequestException('Invalid PAN Card format (e.g. ABCDE1234F).');
      }
      if (idType === 'Voter ID' && !/^[A-Z]{3}\d{7}$/i.test(trimmedId)) {
        throw new BadRequestException('Invalid Voter ID format (e.g. ABC1234567).');
      }
    }

    // 2. Age & Category validation
    if (age !== undefined) {
      if (age < 0 || age > 120) {
        throw new BadRequestException('Age must be between 0 and 120.');
      }
      if (category) {
        if (category === 'Adult' && (age < 12 || age > 120)) {
          throw new BadRequestException(`Age ${age} is not valid for category Adult (12-120 years).`);
        }
        if (category === 'Child' && (age < 2 || age > 11)) {
          throw new BadRequestException(`Age ${age} is not valid for category Child (2-11 years).`);
        }
        if (category === 'Infant' && (age < 0 || age >= 2)) {
          throw new BadRequestException(`Age ${age} is not valid for category Infant (0 to <2 years).`);
        }
      }
    }

    // 3. Phone validation
    if (phone && phone.trim()) {
      const cleanPhone = phone.trim().replace(/[\s-]/g, '');
      if (!/^\+?\d{10,15}$/.test(cleanPhone)) {
        throw new BadRequestException('Invalid phone format. Must be 10-15 digits with optional + prefix.');
      }
    }

    // 4. Email validation
    if (email && email.trim()) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        throw new BadRequestException('Invalid email address format.');
      }
    }
  }

  remove(id: number): { message: string } {
    const idx = passengers.findIndex((p) => p.passId === id);
    if (idx === -1) throw new NotFoundException(`Passenger with ID ${id} not found`);
    passengers.splice(idx, 1);
    return { message: `Passenger with ID ${id} deleted successfully` };
  }
}
