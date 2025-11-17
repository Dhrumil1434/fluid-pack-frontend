export interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  parent_id?: string;
  level: number; // 0 = main category, 1 = subcategory, 2 = sub-subcategory
  is_active: boolean;
  sort_order: number;
  image_url?: string;
  seo_title?: string;
  seo_description?: string;
  created_by: {
    _id: string;
    username: string;
    email: string;
  };
  updated_by?: {
    _id: string;
    username: string;
    email: string;
  };
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  children?: Category[]; // For tree structure
}

export interface CategoryTreeNode {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  level: number;
  sortOrder: number;
  isActive: boolean;
  imageUrl?: string;
  seoTitle?: string;
  seoDescription?: string;
  parentId?: string;
  children?: CategoryTreeNode[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryRequest {
  name: string;
  slug?: string;
  description?: string;
  parentId?: string;
  sortOrder?: number;
  imageUrl?: string;
  seoTitle?: string;
  seoDescription?: string;
}

export interface UpdateCategoryRequest {
  name?: string;
  slug?: string;
  description?: string;
  parentId?: string;
  sortOrder?: number;
  imageUrl?: string;
  seoTitle?: string;
  seoDescription?: string;
  isActive?: boolean;
}

export interface CategoryFilters {
  search?: string;
  page?: number;
  limit?: number;
  includeInactive?: boolean;
  level?: number;
  parentId?: string;
}

// Sequence Management Models
export interface SequenceConfig {
  _id: string;
  category_id: string | { _id: string; name: string; slug?: string };
  subcategory_id?: string | { _id: string; name: string; slug?: string } | null;
  sequence_prefix: string;
  current_sequence: number;
  starting_number: number;
  format: string;
  is_active: boolean;
  created_by: {
    _id: string;
    username: string;
    email: string;
  };
  updated_by?: {
    _id: string;
    username: string;
    email: string;
  };
  created_at: string;
  updated_at: string;
}

export interface CreateSequenceConfigRequest {
  categoryId: string;
  subcategoryId?: string;
  sequencePrefix: string;
  startingNumber: number;
  format: string;
}

export interface UpdateSequenceConfigRequest {
  sequencePrefix?: string;
  updateMachineSequences?: boolean;
  startingNumber?: number;
  format?: string;
  isActive?: boolean;
}

export interface SequenceGenerationRequest {
  categoryId: string;
  subcategoryId?: string;
}

export interface SequenceResetRequest {
  newStartingNumber: number;
}
