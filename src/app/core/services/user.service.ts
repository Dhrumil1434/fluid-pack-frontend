import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { HttpParams } from '@angular/common/http';
import { BaseApiService } from './base-api.service';
import {
  User,
  UserFilters,
  UserListResponse,
  UserStatistics,
  UserApprovalRequest,
  BulkUserApprovalRequest,
  UserDetails,
  UserUpdateRequest,
  UserCreateRequest,
} from '../models/user.model';
import { API_ENDPOINTS } from '../constants/api.constants';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  constructor(private baseApiService: BaseApiService) {}

  /**
   * Get all users with pagination and filters
   */
  getUsers(filters: UserFilters = {}): Observable<UserListResponse> {
    // Build query parameters - only include what backend supports
    let params = new HttpParams()
      .set('page', (filters.page || 1).toString())
      .set('limit', (filters.limit || 10).toString())
      .set('sortBy', filters.sortBy || 'createdAt')
      .set('sortOrder', filters.sortOrder || 'desc');

    // Note: Backend doesn't support search, role, department, or isApproved filters yet
    // These will be implemented in backend later

    return this.baseApiService
      .get<{
        users: User[];
        total: number;
        pages: number;
        currentPage: number;
        limit: number;
      }>(API_ENDPOINTS.USERS, params)
      .pipe(
        map(response => ({
          users: response.data.users || [],
          total: response.data.total || 0,
          pages: response.data.pages || 0,
          currentPage: response.data.currentPage || 1,
          limit: response.data.limit || 10,
        }))
      );
  }

  /**
   * Get user statistics
   */
  getUserStatistics(): Observable<UserStatistics> {
    return this.baseApiService
      .get<UserStatistics>(API_ENDPOINTS.USER_STATISTICS)
      .pipe(map(response => response.data));
  }

  /**
   * Get user by ID
   */
  getUserById(id: string): Observable<UserDetails> {
    return this.baseApiService
      .get<UserDetails>(`${API_ENDPOINTS.USERS}/${id}`)
      .pipe(map(response => response.data));
  }

  /**
   * Approve or reject a user
   */
  approveUser(request: UserApprovalRequest): Observable<User> {
    return this.baseApiService
      .patch<User>(`${API_ENDPOINTS.USERS}/${request.userId}/approve`, {
        approved: request.approved,
        notes: request.notes,
      })
      .pipe(map(response => response.data));
  }

  /**
   * Bulk approve or reject users
   */
  bulkApproveUsers(
    request: BulkUserApprovalRequest
  ): Observable<{ success: number; failed: number }> {
    return this.baseApiService
      .post<{
        success: number;
        failed: number;
      }>(`${API_ENDPOINTS.USERS}/bulk-approve`, request)
      .pipe(map(response => response.data));
  }

  /**
   * Update user
   */
  updateUser(id: string, userData: UserUpdateRequest): Observable<User> {
    return this.baseApiService
      .put<User>(`${API_ENDPOINTS.USERS}/${id}`, userData)
      .pipe(map(response => response.data));
  }

  /**
   * Create new user
   */
  createUser(userData: UserCreateRequest): Observable<User> {
    return this.baseApiService
      .post<User>(API_ENDPOINTS.USERS, userData)
      .pipe(map(response => response.data));
  }

  /**
   * Delete user (soft delete)
   */
  deleteUser(id: string): Observable<{ message: string }> {
    return this.baseApiService
      .delete<{ message: string }>(`${API_ENDPOINTS.USERS}/${id}`)
      .pipe(map(response => response.data));
  }

  /**
   * Export users data
   */
  exportUsers(): Observable<Blob> {
    // For now, return a placeholder - implement actual export later
    return new Observable(observer => {
      observer.next(
        new Blob(['Export functionality coming soon'], { type: 'text/plain' })
      );
      observer.complete();
    });
  }

  /**
   * Get roles for filter dropdown
   */
  getRoles(): Observable<Array<{ _id: string; name: string }>> {
    return this.baseApiService
      .get<Array<{ _id: string; name: string }>>(API_ENDPOINTS.ROLES)
      .pipe(map(response => response.data as any));
  }

  /**
   * Get departments for filter dropdown
   */
  getDepartments(): Observable<Array<{ _id: string; name: string }>> {
    return this.baseApiService
      .get<Array<{ _id: string; name: string }>>(API_ENDPOINTS.DEPARTMENTS)
      .pipe(map(response => response.data as any));
  }
}
