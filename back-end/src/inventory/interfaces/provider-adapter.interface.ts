export type InventoryType = 'HOTEL_ROOM' | 'TOUR_SEAT' | 'TRANSIT_SEAT' | 'PACKAGE_SLOT';

export interface InventoryItem {
  id: number;
  inventoryRef: string;
  type: InventoryType;
  name: string;
  capacity: number;
  heldQuantity: number;
  bookedQuantity: number;
  priceMinor: number;
  currency: string;
  version: number; // for optimistic concurrency control
  createdAt: string;
  updatedAt: string;
}

export interface ReservationResult {
  reservationRef: string;
  inventoryRef: string;
  quantity: number;
  expiresAtUtc: string;
  heldMinor: number;
}

export interface ConfirmationResult {
  reservationRef: string;
  inventoryRef: string;
  quantity: number;
  status: 'CONFIRMED';
  confirmedAtUtc: string;
}

export interface ProviderAdapter {
  checkAvailability(
    itemRef: string,
    dates: { startDate: string; endDate: string },
    quantity: number,
  ): Promise<boolean>;

  reserve(
    itemRef: string,
    dates: { startDate: string; endDate: string },
    quantity: number,
    holdDurationMinutes: number,
  ): Promise<ReservationResult>;

  confirm(reservationRef: string): Promise<ConfirmationResult>;

  release(reservationRef: string): Promise<void>;
}
