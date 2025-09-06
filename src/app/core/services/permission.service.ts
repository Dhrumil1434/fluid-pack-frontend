import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApiService } from './base-api.service';
import { 
  PermissionConfig, 
  CreatePermissionConfigRequest, 
  UpdatePermissionConfigRequest, 
  PermissionFilters,
  CheckPermissionRequest
} from '../models/permission.model';
import { ApiResponse } from '../models/api-response.model';

@Injectable({
  providedIn: 'root',
})
export class PermissionService {
  constructor(private baseApiService: BaseApiService) {}

  /**
   * Get all permission configurations with pagination
   */
  getAllPermissionConfigs(filters?: PermissionFilters): Observable<ApiResponse<{ configs: PermissionConfig[]; pagination: any }>> {
    return this.baseApiService.get<{ configs: PermissionConfig[]; pagination: any }>(
      '/permission',
      filters
    );
  }

  /**
   * Get permission configurations by action
   */
  getPermissionConfigsByAction(action: string, filters?: PermissionFilters): Observable<ApiResponse<{ configs: PermissionConfig[]; pagination: any }>> {
    return this.baseApiService.get<{ configs: PermissionConfig[]; pagination: any }>(
      `/permission/action/${action}`,
      filters
    );
  }

  /**
   * Get current user's permissions
   */
  getMyPermissions(filters?: any): Observable<ApiResponse<any>> {
    return this.baseApiService.get<any>('/permission/my-permissions', filters);
  }

  /**
   * Check permission for specific action and resource
   */
  checkPermission(permissionData: CheckPermissionRequest): Observable<ApiResponse<any>> {
    return this.baseApiService.post<any>('/permission/check', permissionData);
  }

  /**
   * Check resource permission via GET
   */
  checkResourcePermission(action: string, filters?: any): Observable<ApiResponse<any>> {
    return this.baseApiService.get<any>(`/permission/check/${action}`, filters);
  }

  /**
   * Validate category IDs
   */
  validateCategoryIds(categoryIds: string[]): Observable<ApiResponse<{ valid: boolean; invalidIds: string[] }>> {
    return this.baseApiService.post<{ valid: boolean; invalidIds: string[] }>('/permission/validate-categories', { categoryIds });
  }

  /**
   * Get permission configuration by ID
   */
  getPermissionConfigById(id: string): Observable<ApiResponse<PermissionConfig>> {
    return this.baseApiService.get<PermissionConfig>(`/permission/${id}`);
  }

  /**
   * Create permission configuration
   */
  createPermissionConfig(configData: CreatePermissionConfigRequest): Observable<ApiResponse<PermissionConfig>> {
    return this.baseApiService.post<PermissionConfig>('/permission', configData);
  }

  /**
   * Update permission configuration
   */
  updatePermissionConfig(id: string, configData: UpdatePermissionConfigRequest): Observable<ApiResponse<PermissionConfig>> {
    return this.baseApiService.put<PermissionConfig>(`/permission/${id}`, configData);
  }

  /**
   * Toggle permission configuration active status
   */
  togglePermissionConfig(id: string): Observable<ApiResponse<PermissionConfig>> {
    return this.baseApiService.patch<PermissionConfig>(`/permission/${id}/toggle`, {});
  }

  /**
   * Delete permission configuration
   */
  deletePermissionConfig(id: string): Observable<ApiResponse<null>> {
    return this.baseApiService.delete<null>(`/permission/${id}`);
  }

  /**
   * Clear permission cache
   */
  clearPermissionCache(): Observable<ApiResponse<null>> {
    return this.baseApiService.post<null>('/permission/clear-cache', {});
  }
}
