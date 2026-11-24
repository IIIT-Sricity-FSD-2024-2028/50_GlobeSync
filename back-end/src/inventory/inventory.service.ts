import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InventoryItem, InventoryType } from './interfaces/provider-adapter.interface';
import { ManualInventoryProviderAdapter } from './adapters/manual-inventory-provider.adapter';
import { testDb } from '../database/test-database';

export const SEED_INVENTORY: InventoryItem[] = [
  {
    id: 1,
    inventoryRef: 'INV-HOTEL-DELUXE-GOA',
    type: 'HOTEL_ROOM',
    name: 'Deluxe Sea View Room - Grand Resort Goa',
    capacity: 5,
    heldQuantity: 0,
    bookedQuantity: 0,
    priceMinor: 450000, // ₹4,500.00 / night
    currency: 'INR',
    version: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 2,
    inventoryRef: 'INV-HOTEL-SINGLE-SEAT-MANALI',
    type: 'HOTEL_ROOM',
    name: 'Mountain Boutique Suite (Last Available Room)',
    capacity: 1, // Only 1 seat/room for concurrency collision testing!
    heldQuantity: 0,
    bookedQuantity: 0,
    priceMinor: 350000, // ₹3,500.00 / night
    currency: 'INR',
    version: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 3,
    inventoryRef: 'INV-TOUR-HERITAGE-JAIPUR',
    type: 'TOUR_SEAT',
    name: 'Jaipur Forts & Palaces Guided Walking Tour',
    capacity: 12,
    heldQuantity: 0,
    bookedQuantity: 0,
    priceMinor: 120000, // ₹1,200.00 / person
    currency: 'INR',
    version: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 4,
    inventoryRef: 'INV-TRANSIT-BUS-MUM-PUN',
    type: 'TRANSIT_SEAT',
    name: 'Luxury Volvo Sleeper Bus Mumbai - Pune',
    capacity: 30,
    heldQuantity: 0,
    bookedQuantity: 0,
    priceMinor: 85000, // ₹850.00 / seat
    currency: 'INR',
    version: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 5,
    inventoryRef: 'INV-PKG-KERALA-BACKWATERS',
    type: 'PACKAGE_SLOT',
    name: '4-Day Kerala Backwaters & Alleppey Houseboat Package',
    capacity: 8,
    heldQuantity: 0,
    bookedQuantity: 0,
    priceMinor: 1800000, // ₹18,000.00 / package
    currency: 'INR',
    version: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

@Injectable()
export class InventoryService {
  constructor(public readonly manualAdapter: ManualInventoryProviderAdapter) {
    this.ensureSeeded();
  }

  ensureSeeded(): void {
    if (!testDb.inventoryItems || testDb.inventoryItems.length === 0) {
      testDb.inventoryItems = SEED_INVENTORY.map((item) => ({ ...item }));
    }
  }

  resetSeed(): void {
    testDb.inventoryItems = SEED_INVENTORY.map((item) => ({ ...item }));
  }

  findAll(): InventoryItem[] {
    this.ensureSeeded();
    return testDb.inventoryItems;
  }

  findByRef(inventoryRef: string): InventoryItem | undefined {
    this.ensureSeeded();
    return testDb.inventoryItems.find((i: InventoryItem) => i.inventoryRef === inventoryRef);
  }

  findByRefOrThrow(inventoryRef: string): InventoryItem {
    const item = this.findByRef(inventoryRef);
    if (!item) {
      throw new NotFoundException(`Inventory item '${inventoryRef}' not found.`);
    }
    return item;
  }

  async checkAvailability(
    inventoryRef: string,
    dates: { startDate: string; endDate: string },
    quantity: number,
  ): Promise<boolean> {
    return this.manualAdapter.checkAvailability(inventoryRef, dates, quantity);
  }

  async holdInventory(
    inventoryRef: string,
    dates: { startDate: string; endDate: string },
    quantity: number,
    holdDurationMinutes = 15,
  ) {
    return this.manualAdapter.reserve(inventoryRef, dates, quantity, holdDurationMinutes);
  }

  async confirmHold(reservationRef: string) {
    return this.manualAdapter.confirm(reservationRef);
  }

  async releaseHold(reservationRef: string) {
    return this.manualAdapter.release(reservationRef);
  }
}
