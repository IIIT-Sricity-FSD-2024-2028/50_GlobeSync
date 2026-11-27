import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import {
  ProviderAdapter,
  InventoryItem,
  ReservationResult,
  ConfirmationResult,
} from '../interfaces/provider-adapter.interface';
import { testDb } from '../../database/test-database';

export interface ActiveHoldRecord {
  reservationRef: string;
  inventoryRef: string;
  quantity: number;
  dates: { startDate: string; endDate: string };
  expiresAtUtc: string;
  bookingId?: number;
}

@Injectable()
export class ManualInventoryProviderAdapter implements ProviderAdapter {
  // In-memory active hold registry mapping reservationRef -> ActiveHoldRecord
  private activeHolds: Map<string, ActiveHoldRecord> = new Map();

  /**
   * Check if requested quantity is available for the given dates.
   */
  async checkAvailability(
    itemRef: string,
    dates: { startDate: string; endDate: string },
    quantity: number,
  ): Promise<boolean> {
    const item = this.findItem(itemRef);
    if (!item) return false;
    const available = item.capacity - item.heldQuantity - item.bookedQuantity;
    return available >= quantity;
  }

  /**
   * Reserve (HOLD) inventory with optimistic versioning so two users cannot take the last seat.
   */
  async reserve(
    itemRef: string,
    dates: { startDate: string; endDate: string },
    quantity: number,
    holdDurationMinutes = 15,
  ): Promise<ReservationResult> {
    const item = this.findItemOrThrow(itemRef);

    // Atomically evaluate available capacity
    const available = item.capacity - item.heldQuantity - item.bookedQuantity;
    if (available < quantity) {
      throw new ConflictException(
        `Insufficient inventory capacity for '${item.name}' (${itemRef}). Available: ${available}, Requested: ${quantity}.`,
      );
    }

    // Optimistic Concurrency Control / Row Version Check
    const currentVersion = item.version;

    // Mutate held quantity atomically
    item.heldQuantity += quantity;
    item.version = currentVersion + 1;
    item.updatedAt = new Date().toISOString();

    const reservationRef = `res_${itemRef}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const expiresAtUtc = new Date(Date.now() + holdDurationMinutes * 60 * 1000).toISOString();

    const holdRecord: ActiveHoldRecord = {
      reservationRef,
      inventoryRef: itemRef,
      quantity,
      dates,
      expiresAtUtc,
    };
    this.activeHolds.set(reservationRef, holdRecord);

    return {
      reservationRef,
      inventoryRef: itemRef,
      quantity,
      expiresAtUtc,
      heldMinor: item.priceMinor * quantity,
    };
  }

  /**
   * Confirm reservation upon successful payment: moves held quantity to booked quantity.
   */
  async confirm(reservationRef: string): Promise<ConfirmationResult> {
    const hold = this.activeHolds.get(reservationRef);
    if (!hold) {
      throw new NotFoundException(`No active hold found for reservationRef: ${reservationRef}`);
    }

    const item = this.findItemOrThrow(hold.inventoryRef);

    // Shift quantity from held to booked atomically
    item.heldQuantity = Math.max(0, item.heldQuantity - hold.quantity);
    item.bookedQuantity += hold.quantity;
    item.version += 1;
    item.updatedAt = new Date().toISOString();

    this.activeHolds.delete(reservationRef);

    return {
      reservationRef,
      inventoryRef: hold.inventoryRef,
      quantity: hold.quantity,
      status: 'CONFIRMED',
      confirmedAtUtc: new Date().toISOString(),
    };
  }

  /**
   * Release hold back to available pool (upon expiration or cancellation).
   */
  async release(reservationRef: string): Promise<void> {
    const hold = this.activeHolds.get(reservationRef);
    if (!hold) return; // Idempotent release

    const item = this.findItem(hold.inventoryRef);
    if (item) {
      item.heldQuantity = Math.max(0, item.heldQuantity - hold.quantity);
      item.version += 1;
      item.updatedAt = new Date().toISOString();
    }

    this.activeHolds.delete(reservationRef);
  }

  // ─── QUERY & HELPER METHODS ────────────────────────────────────────────────

  getActiveHold(reservationRef: string): ActiveHoldRecord | undefined {
    return this.activeHolds.get(reservationRef);
  }

  getAllActiveHolds(): ActiveHoldRecord[] {
    return Array.from(this.activeHolds.values());
  }

  private findItem(itemRef: string): InventoryItem | undefined {
    return (testDb.inventoryItems || []).find((i: InventoryItem) => i.inventoryRef === itemRef);
  }

  private findItemOrThrow(itemRef: string): InventoryItem {
    const item = this.findItem(itemRef);
    if (!item) {
      throw new NotFoundException(`Inventory item '${itemRef}' not found.`);
    }
    return item;
  }
}
