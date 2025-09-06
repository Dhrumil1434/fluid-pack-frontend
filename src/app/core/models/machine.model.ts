export interface Machine {
  _id: string;
  name: string;
  category_id: {
    _id: string;
    name: string;
    description: string;
  };
  created_by: {
    _id: string;
    username: string;
    email: string;
  };
  is_approved: boolean;
  images: string[];
  updatedBy?: {
    _id: string;
    username: string;
    email: string;
  };
  deletedAt?: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMachineRequest {
  name: string;
  category_id: string;
  images?: string[];
  metadata?: Record<string, unknown>;
}

export interface UpdateMachineRequest {
  name?: string;
  category_id?: string;
  images?: string[];
  metadata?: Record<string, unknown>;
}

export interface MachineFilters {
  category_id?: string;
  is_approved?: boolean;
  created_by?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface MachineApprovalRequest {
  is_approved: boolean;
}
