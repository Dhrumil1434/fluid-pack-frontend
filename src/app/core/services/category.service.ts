import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApiService } from './base-api.service';
import { 
  Category, 
  CreateCategoryRequest, 
  UpdateCategoryRequest, 
  CategoryFilters 
} from '../models/category.model';
import { ApiResponse } from '../models/api-response.model';

@Injectable({
  providedIn: 'root',
})
export class CategoryService {
  constructor(private baseApiService: BaseApiService) {}

  /**
   * Get all categories with pagination and filters
   */
  getAllCategories(filters?: CategoryFilters): Observable<ApiResponse<{ categories: Category[]; pagination: any }>> {
    return this.baseApiService.get<{ categories: Category[]; pagination: any }>(
      '/admin/category',
      filters
    );
  }

  /**
   * Get active categories (for dropdowns)
   */
  getActiveCategories(): Observable<ApiResponse<Category[]>> {
    return this.baseApiService.get<Category[]>('/admin/category/active');
  }

  /**
   * Get category by ID
   */
  getCategoryById(id: string): Observable<ApiResponse<Category>> {
    return this.baseApiService.get<Category>(`/admin/category/${id}`);
  }

  /**
   * Create a new category
   */
  createCategory(categoryData: CreateCategoryRequest): Observable<ApiResponse<Category>> {
    return this.baseApiService.post<Category>('/admin/category', categoryData);
  }

  /**
   * Update category
   */
  updateCategory(id: string, categoryData: UpdateCategoryRequest): Observable<ApiResponse<Category>> {
    return this.baseApiService.put<Category>(`/admin/category/${id}`, categoryData);
  }

  /**
   * Delete category (soft delete)
   */
  deleteCategory(id: string): Observable<ApiResponse<null>> {
    return this.baseApiService.delete<null>(`/admin/category/${id}`);
  }

  /**
   * Check if category exists
   */
  checkCategoryExists(id: string): Observable<ApiResponse<{ exists: boolean }>> {
    return this.baseApiService.get<{ exists: boolean }>(`/admin/category/exists/${id}`);
  }
}
