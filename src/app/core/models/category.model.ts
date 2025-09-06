export interface Category {
  _id: string;
  name: string;
  description: string;
  createdBy: {
    _id: string;
    username: string;
    email: string;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryRequest {
  name: string;
  description: string;
}

export interface UpdateCategoryRequest {
  name?: string;
  description?: string;
}

export interface CategoryFilters {
  search?: string;
  page?: number;
  limit?: number;
}
