export enum ApprovalType {
  MACHINE_CREATION = 'MACHINE_CREATION',
  MACHINE_EDIT = 'MACHINE_EDIT',
  MACHINE_DELETION = 'MACHINE_DELETION',
}

export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export interface MachineApproval {
  _id: string;
  machineId: {
    _id: string;
    name: string;
  };
  requestedBy: {
    _id: string;
    username: string;
    email: string;
  };
  approvalType: ApprovalType;
  status: ApprovalStatus;
  originalData?: Record<string, unknown>;
  proposedChanges: Record<string, unknown>;
  approvedBy?: {
    _id: string;
    username: string;
    email: string;
  };
  rejectedBy?: {
    _id: string;
    username: string;
    email: string;
  };
  approvalDate?: string;
  rejectionReason?: string;
  requestNotes?: string;
  approverNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateApprovalRequest {
  machineId: string;
  approvalType: ApprovalType;
  proposedChanges: Record<string, unknown>;
  requestNotes?: string;
}

export interface ProcessApprovalRequest {
  status: ApprovalStatus.APPROVED | ApprovalStatus.REJECTED;
  approverNotes?: string;
  rejectionReason?: string;
}

export interface ApprovalFilters {
  status?: ApprovalStatus;
  approvalType?: ApprovalType;
  requestedBy?: string;
  page?: number;
  limit?: number;
}
