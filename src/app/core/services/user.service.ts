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
    let params = new HttpParams()
      .set('page', (filters.page || 1).toString())
      .set('limit', (filters.limit || 10).toString())
      .set('sortBy', filters.sortBy || 'createdAt')
      .set('sortOrder', filters.sortOrder || 'desc');

    // Optional filters
    if (filters.search) params = params.set('search', filters.search);
    if (filters.role) params = params.set('role', filters.role);
    if (filters.department)
      params = params.set('department', filters.department);
    // Map status to backend's expected param (isApproved)
    if (filters.status) {
      const approved = String(filters.status === 'approved');
      params = params.set('isApproved', approved);
    }
    if ((filters as any).dateFrom) {
      const df = (filters as any).dateFrom as Date | string;
      const val = typeof df === 'string' ? df : df.toISOString();
      params = params.set('dateFrom', val);
    }
    if ((filters as any).dateTo) {
      const dt = (filters as any).dateTo as Date | string;
      const val = typeof dt === 'string' ? dt : dt.toISOString();
      params = params.set('dateTo', val);
    }

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
  approveUser(
    request: UserApprovalRequest
  ): Observable<{ data: User; message: string }> {
    return this.baseApiService
      .patch<User>(`${API_ENDPOINTS.USERS}/${request.userId}/approve`, {
        approved: request.approved,
        notes: request.notes,
      })
      .pipe(
        map(response => ({
          data: response.data as unknown as User,
          message: (response as any).message || 'Updated',
        }))
      );
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
  updateUser(
    id: string,
    userData: UserUpdateRequest
  ): Observable<{ data: User; message: string }> {
    return this.baseApiService
      .put<User>(`${API_ENDPOINTS.USERS}/${id}`, userData)
      .pipe(
        map(response => ({
          data: response.data as unknown as User,
          message: (response as any).message || 'Updated',
        }))
      );
  }

  /**
   * Create new user
   */
  createUser(
    userData: UserCreateRequest
  ): Observable<{ data: User; message: string }> {
    return this.baseApiService.post<User>(API_ENDPOINTS.USERS, userData).pipe(
      map(response => ({
        data: response.data as unknown as User,
        message: (response as any).message || 'Created',
      }))
    );
  }

  /**
   * Delete user (soft delete)
   */
  deleteUser(id: string): Observable<{ message: string }> {
    return this.baseApiService
      .delete<{ message: string }>(`${API_ENDPOINTS.USERS}/${id}`)
      .pipe(
        map(response => ({ message: (response as any).message || 'Deleted' }))
      );
  }

  /**
   * Export users data
   */
  exportUsers(): Observable<Blob> {
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
