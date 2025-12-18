export interface MachineDocument {
  name: string;
  file_path: string;
  document_type?: string;
  uploaded_at: Date;
}

import { SO } from './so.model';

export interface Machine {
  _id: string;
  so_id: string; // Reference to SO
  so?: SO; // Populated SO data (optional, for display)
  created_by: {
    _id: string;
    username: string;
    email: string;
  };
  is_approved: boolean;
  images: string[];
  documents: MachineDocument[];
  location: string;
  dispatch_date?: string | Date;
  machine_sequence?: string;
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
  so_id: string; // Required: Reference to SO
  location?: string; // Optional
  dispatch_date?: string | Date;
  images?: string[];
  documents?: MachineDocument[];
  metadata?: Record<string, unknown>;
}

export interface UpdateMachineRequest {
  so_id?: string; // Optional: Update SO reference if needed
  location?: string;
  dispatch_date?: string | Date;
  machine_sequence?: string; // Can be updated but usually auto-generated
  images?: string[];
  documents?: MachineDocument[];
  metadata?: Record<string, unknown>;
  removedDocuments?: Array<{
    _id?: string;
    name?: string;
    file_path?: string;
    document_type?: string;
  }>;
  removedImages?: string[];
}

export interface MachineFilters {
  so_id?: string; // Filter by SO ID
  category_id?: string; // Filter by SO's category_id
  is_approved?: boolean;
  created_by?: string;
  search?: string; // Search in SO name, SO party_name, location, machine_sequence
  has_sequence?: boolean;
  metadata_key?: string;
  metadata_value?: string;
  dispatch_date_from?: string;
  dispatch_date_to?: string;
  // Specific field filters for suggestion-based search
  party_name?: string; // Filter by SO's party_name
  machine_sequence?: string;
  location?: string;
  sortBy?:
    | 'createdAt'
    | 'name' // Sort by SO name
    | 'category' // Sort by SO category
    | 'dispatch_date'
    | 'party_name' // Sort by SO party_name
    | 'machine_sequence'
    | 'location'
    | 'created_by';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface MachineApprovalRequest {
  is_approved: boolean;
}
