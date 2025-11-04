export interface MachineDocument {
  name: string;
  file_path: string;
  document_type?: string;
  uploaded_at: Date;
}

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
  documents: MachineDocument[];
  party_name?: string;
  location?: string;
  mobile_number?: string;
  machine_sequence?: string;
  subcategory_id?: string;
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
  party_name?: string;
  location?: string;
  mobile_number?: string;
  machine_sequence?: string;
  subcategory_id?: string;
  images?: string[];
  documents?: MachineDocument[];
  metadata?: Record<string, unknown>;
}

export interface UpdateMachineRequest {
  name?: string;
  category_id?: string;
  party_name?: string;
  location?: string;
  mobile_number?: string;
  machine_sequence?: string;
  subcategory_id?: string;
  images?: string[];
  documents?: MachineDocument[];
  metadata?: Record<string, unknown>;
}

export interface MachineFilters {
  category_id?: string;
  is_approved?: boolean;
  created_by?: string;
  search?: string;
  has_sequence?: boolean;
  page?: number;
  limit?: number;
}

export interface MachineApprovalRequest {
  is_approved: boolean;
}
