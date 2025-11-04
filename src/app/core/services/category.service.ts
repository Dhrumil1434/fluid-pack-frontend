import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApiService } from './base-api.service';
import {
  Category,
  CategoryTreeNode,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  CategoryFilters,
  SequenceConfig,
  CreateSequenceConfigRequest,
  UpdateSequenceConfigRequest,
  SequenceGenerationRequest,
  SequenceResetRequest,
} from '../models/category.model';
import { ApiResponse } from '../models/api-response.model';

@Injectable({
  providedIn: 'root',
})
export class CategoryService {
  constructor(private baseApiService: BaseApiService) {}

  // ==================== CATEGORY MANAGEMENT ====================

  /**
   * Get all categories with pagination and filters
   */
  getAllCategories(
    filters?: CategoryFilters
  ): Observable<ApiResponse<Category[]>> {
    return this.baseApiService.get<Category[]>('/categories', filters);
  }

  /**
   * Get category by ID
   */
  getCategoryById(id: string): Observable<ApiResponse<Category>> {
    return this.baseApiService.get<Category>(`/categories/${id}`);
  }

  /**
   * Get category tree structure
   */
  getCategoryTree(): Observable<ApiResponse<CategoryTreeNode[]>> {
    return this.baseApiService.get<CategoryTreeNode[]>('/categories/tree');
  }

  /**
   * Get category hierarchy path
   */
  getCategoryPath(id: string): Observable<ApiResponse<{ path: string[] }>> {
    return this.baseApiService.get<{ path: string[] }>(
      `/categories/${id}/path`
    );
  }

  /**
   * Create a new category
   */
  createCategory(
    categoryData: CreateCategoryRequest
  ): Observable<ApiResponse<Category>> {
    return this.baseApiService.post<Category>('/categories', categoryData);
  }

  /**
   * Update category
   */
  updateCategory(
    id: string,
    categoryData: UpdateCategoryRequest
  ): Observable<ApiResponse<Category>> {
    return this.baseApiService.put<Category>(`/categories/${id}`, categoryData);
  }

  /**
   * Delete category (soft delete)
   */
  deleteCategory(id: string): Observable<ApiResponse<null>> {
    return this.baseApiService.delete<null>(`/categories/${id}`);
  }

  // ==================== SEQUENCE MANAGEMENT ====================

  /**
   * Get all sequence configurations
   */
  getAllSequenceConfigs(): Observable<ApiResponse<SequenceConfig[]>> {
    return this.baseApiService.get<SequenceConfig[]>(
      '/categories/sequence-configs'
    );
  }

  /**
   * Get sequence configuration by ID
   */
  getSequenceConfigById(id: string): Observable<ApiResponse<SequenceConfig>> {
    return this.baseApiService.get<SequenceConfig>(
      `/categories/sequence-configs/${id}`
    );
  }

  /**
   * Get sequence configuration by category/subcategory
   */
  getSequenceConfigByCategory(
    categoryId: string,
    subcategoryId?: string
  ): Observable<ApiResponse<SequenceConfig>> {
    const params: any = { categoryId };
    if (subcategoryId) {
      params.subcategoryId = subcategoryId;
    }
    return this.baseApiService.get<SequenceConfig>(
      '/categories/sequence-configs/config',
      params
    );
  }

  /**
   * Create sequence configuration
   */
  createSequenceConfig(
    configData: CreateSequenceConfigRequest
  ): Observable<ApiResponse<SequenceConfig>> {
    return this.baseApiService.post<SequenceConfig>(
      '/categories/sequence-configs',
      configData
    );
  }

  /**
   * Update sequence configuration
   */
  updateSequenceConfig(
    id: string,
    configData: UpdateSequenceConfigRequest
  ): Observable<ApiResponse<SequenceConfig>> {
    return this.baseApiService.put<SequenceConfig>(
      `/categories/sequence-configs/${id}`,
      configData
    );
  }

  /**
   * Delete sequence configuration
   */
  deleteSequenceConfig(id: string): Observable<ApiResponse<null>> {
    return this.baseApiService.delete<null>(
      `/categories/sequence-configs/${id}`
    );
  }

  /**
   * Generate next sequence number
   */
  generateSequence(
    request: SequenceGenerationRequest
  ): Observable<ApiResponse<{ sequence: string }>> {
    return this.baseApiService.post<{ sequence: string }>(
      '/categories/sequence-configs/generate',
      request
    );
  }

  /**
   * Reset sequence number
   */
  resetSequence(
    id: string,
    request: SequenceResetRequest
  ): Observable<ApiResponse<SequenceConfig>> {
    return this.baseApiService.post<SequenceConfig>(
      `/categories/sequence-configs/${id}/reset`,
      request
    );
  }
}
