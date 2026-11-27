export interface ApprovalRequest {
  id: number;
  type: 'AGENCY_CHANGE' | 'AGENCY_STATUS_COMMISSION' | 'GUIDE_CHANGE' | 'GUIDE_DEACTIVATION';
  requesterId: number;
  requesterName: string;
  requesterRole: string;
  entityType: 'agency' | 'guide';
  entityId: number;
  currentValues: Record<string, any>;
  proposedValues: Record<string, any>;
  reason: string;
  effectiveDate?: string;
  impactAnalysis?: Record<string, any>;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'WITHDRAWN';
  reviewerId?: number;
  reviewerName?: string;
  reviewComment?: string;
  reviewedAt?: string;
  createdAt: string;
  executedAt?: string;
}

export const approvalRequests: ApprovalRequest[] = [];

