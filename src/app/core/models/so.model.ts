export interface SODocument {
  name: string;
  file_path: string;
  document_type?: string;
  uploaded_at: string | Date;
}

export interface SOItem {
  no: number;
  item_code: string;
  item_details: string;
  uom: string;
  quantity: number;
  delivery_schedule?: string | Date;
  total?: number;
}

export interface SO {
  _id: string;
  name?: string;
  customer: string;
  location: string;
  po_number: string;
  po_date: string | Date;
  so_number: string;
  so_date: string | Date;
  items: SOItem[];
  category_id: {
    _id: string;
    name: string;
    description?: string;
  };
  subcategory_id: {
    _id: string;
    name: string;
    description?: string;
  } | null;
  party_name: string;
  mobile_number: string;
  documents: SODocument[];
  description: string;
  is_active: boolean;
  created_by: {
    _id: string;
    username: string;
    email: string;
  };
  updatedBy: {
    _id: string;
    username: string;
    email: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSORequest {
  name?: string;
  customer: string;
  location: string;
  po_number: string;
  po_date: string | Date;
  so_number: string;
  so_date: string | Date;
  items: SOItem[];
  category_id: string;
  subcategory_id?: string | null;
  party_name: string;
  mobile_number: string;
  description?: string | null;
  documents?: File[];
}

export interface UpdateSORequest {
  name?: string;
  customer?: string;
  location?: string;
  po_number?: string;
  po_date?: string | Date;
  so_number?: string;
  so_date?: string | Date;
  items?: SOItem[];
  category_id?: string;
  subcategory_id?: string | null;
  party_name?: string;
  mobile_number?: string;
  description?: string | null;
  documents?: File[];
}

export interface SOFilters {
  name?: string;
  category_id?: string;
  party_name?: string;
  is_active?: boolean;
  search?: string;
  sortBy?: 'name' | 'category' | 'party_name' | 'createdAt' | 'is_active';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}
