import { Passenger } from './passengers.data';

export interface Trip {
  tripId: number;
  title?: string;
  origin?: string;
  destination: string;
  startDate: string;
  endDate: string;
  budget: number;
  targetBudget?: number;
  travelerId?: number;
  agencyId?: number;
  guideId: number | null;
  packageId?: number;
  status: 'Planning' | 'Pending' | 'Confirmed' | 'Active' | 'Completed' | 'Cancelled';
  guideStatus?: 'Pending' | 'Accepted' | 'Declined';
  guideDecisionReason?: string;
  /** When the guide request was sent, and the time by which the guide must reply (3 hours later). */
  guideRequestedAt?: string;
  guideResponseDueAt?: string;
  /** The traveler's unfinished plan (transport, hotel, guide choices) so booking can be resumed later. */
  draftPlan?: Record<string, any>;
  passengerIds?: number[];
  passengers?: Passenger[];
  transportDetails?: Record<string, any>;
  itineraryDays?: any[];
  category?: string;
  notes?: string;
  travelersCount?: number;
  cancellationReason?: string;
  cancelledAt?: string;
  refundPercentage?: number;
  refundAmount?: number;
}

export const trips: Trip[] = [];
