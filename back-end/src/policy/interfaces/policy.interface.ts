export interface PolicyConfig {
  cancellationPenaltyPercent: number; // default 35 (so refund = 100 - 35 = 65%)
  leadTimeHours: number;              // default 24 hours
  tier1CutoffHours: number;           // default 72 hours
  tier2CutoffHours: number;           // default 12 hours
  emergencyOverrideThresholdMinor: number; // default 500000 (₹5,000.00)
  cancellationProtectionTier1RefundPercent: number; // default 90%
  cancellationProtectionTier2RefundPercent: number; // default 50%
}

export interface PolicySnapshot {
  cancellationPenaltyPercent: number;
  defaultRefundPercent: number;
  hasCancellationProtection: boolean;
  protectedFirstTierRefundPercent: number;
  protectedSecondTierRefundPercent: number;
  leadTimeHoursRequired: number;
  tier1CutoffHours: number;
  tier2CutoffHours: number;
  snapshottedAtUtc: string;
}

export type CancellationTier =
  | 'TIER_1_STANDARD'
  | 'TIER_2_LATE'
  | 'TIER_3_BLOCKED'
  | 'TIER_DEPARTED';

export interface CancellationPreview {
  bookingId: number;
  departureAtUtc: string;
  departureTimezone: string;
  hoursUntilDeparture: number;
  tier: CancellationTier;
  tierDescription: string;
  isAllowed: boolean;
  totalMinor: number;
  totalAmount: number;
  refundPercentage: number;
  refundAmountMinor: number;
  refundAmount: number;
  penaltyPercentage: number;
  penaltyAmountMinor: number;
  hasCancellationProtection: boolean;
  protectionBenefitNote: string | null;
  requiresSupportAssistance: boolean;
}

export interface CancellationResult {
  bookingId: number;
  status: string;
  refundId: number;
  refundAmountMinor: number;
  refundAmount: number;
  refundPercentage: number;
  ledgerEntryId: number;
  cancelledAt: string;
  message: string;
}

export interface EmergencyOverrideDto {
  reason: string;
  supportAgentId?: number;
  supportAgentName?: string;
  notes?: string;
}

export interface EmergencyOverrideResult {
  bookingId: number;
  status: string;
  requiresAdminApproval: boolean;
  auditLogId?: number;
  refundId?: number;
  refundAmountMinor: number;
  refundAmount: number;
  reason: string;
  message: string;
}
