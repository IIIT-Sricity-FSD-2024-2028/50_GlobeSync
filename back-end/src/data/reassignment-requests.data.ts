export interface GuideReassignmentRequest {
  id: number;
  tripId: number;
  tripDestination?: string;
  tripStartDate?: string;
  tripEndDate?: string;
  requesterId: number;
  requesterName: string;
  currentGuideId?: number | null;
  currentGuideName?: string;
  currentGuideDailyRate?: number;
  proposedGuideId: number;
  proposedGuideName: string;
  proposedGuideExperienceYears?: number;
  proposedGuideRating?: number;
  proposedGuideDailyRate?: number;
  priceDifference?: number;
  reason: string;
  travelerId: number;
  status:
    | 'PENDING_CONSENT'
    | 'TRAVELER_ACCEPTED'
    | 'TRAVELER_REJECTED'
    | 'GUIDE_ACCEPTED'
    | 'GUIDE_REJECTED'
    | 'COMPLETED'
    | 'CANCELLED'
    | 'EXPIRED';
  travelerConsent: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  travelerConsentReason?: string;
  travelerRespondedAt?: string;
  guideConsent: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  guideConsentReason?: string;
  guideRespondedAt?: string;
  createdAt: string;
  expiresAt?: string;
  completedAt?: string;
  executionNotes?: string;
}

export const guideReassignmentRequests: GuideReassignmentRequest[] = [];

