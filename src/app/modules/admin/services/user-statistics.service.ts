import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { BaseApiService } from '../../../core/services/base-api.service';
import { API_ENDPOINTS } from '../../../core/constants/api.constants';
import {
  UserStatistics,
  ApiResponse,
  UserStatsQueryParams,
} from '../interfaces/dashboard.interfaces';
import { UserPreview } from '../components/shared/user-management-preview/user-management-preview.component';

@Injectable({
  providedIn: 'root',
})
export class UserStatisticsService {
  constructor(private baseApiService: BaseApiService) {}

  /**
   * Get comprehensive user statistics
   */
  getUserStatistics(params?: UserStatsQueryParams): Observable<UserStatistics> {
    const queryParams = this.buildQueryParams(params);

    return this.baseApiService
      .get<UserStatistics>(`${API_ENDPOINTS.USERS}/statistics${queryParams}`)
      .pipe(
        map((response: ApiResponse<UserStatistics>): UserStatistics => {
          if (!response.success) {
            throw new Error(
              response.message || 'Failed to fetch user statistics'
            );
          }
          return response.data;
        }),
        catchError(error => {
          console.error('Error fetching user statistics:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get user statistics summary for dashboard cards
   */
  getUserStatisticsSummary(params?: UserStatsQueryParams): Observable<{
    totalUsers: number;
    activeUsers: number;
    pendingUsers: number;
    adminUsers: number;
  }> {
    return this.getUserStatistics(params).pipe(
      map(stats => ({
        totalUsers: stats.totalUsers,
        activeUsers: stats.activeUsers,
        pendingUsers: stats.pendingUsers,
        adminUsers: stats.adminUsers,
      }))
    );
  }

  /**
   * Get users by role statistics
   */
  getUsersByRole(params?: UserStatsQueryParams): Observable<
    {
      roleId: string;
      roleName: string;
      userCount: number;
      percentage: number;
    }[]
  > {
    return this.getUserStatistics(params).pipe(map(stats => stats.usersByRole));
  }

  /**
   * Get users by department statistics
   */
  getUsersByDepartment(params?: UserStatsQueryParams): Observable<
    {
      departmentId: string;
      departmentName: string;
      userCount: number;
      percentage: number;
    }[]
  > {
    return this.getUserStatistics(params).pipe(
      map(stats => stats.usersByDepartment)
    );
  }

  /**
   * Get recent users for preview
   */
  getRecentUsers(
    limit: number = 5,
    params?: UserStatsQueryParams
  ): Observable<UserPreview[]> {
    const queryParams = this.buildQueryParams({
      ...params,
      limit,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });

    return this.baseApiService
      .get<any>(`${API_ENDPOINTS.USERS}${queryParams}`)
      .pipe(
        map((response: ApiResponse<any>): UserPreview[] => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to fetch recent users');
          }
          // Transform backend user data to frontend UserPreview format
          return response.data.users.map((user: any) => ({
            id: user._id,
            name: user.username,
            email: user.email,
            role: user.role?.name || 'Unknown',
            department: user.department?.name || 'Unknown',
            status: user.isApproved ? 'active' : 'pending',
            lastLogin: new Date(user.updatedAt || user.createdAt),
            avatar: undefined,
          }));
        }),
        catchError(error => {
          console.error('Error fetching recent users:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get pending user approvals
   */
  getPendingUserApprovals(params?: UserStatsQueryParams): Observable<{
    total: number;
    high: number;
    medium: number;
    low: number;
  }> {
    const queryParams = this.buildQueryParams({
      ...params,
      isApproved: false,
      status: 'pending',
    });

    return this.baseApiService
      .get<{
        total: number;
        high: number;
        medium: number;
        low: number;
      }>(`${API_ENDPOINTS.USERS}/pending-approvals${queryParams}`)
      .pipe(
        map(
          (
            response: ApiResponse<{
              total: number;
              high: number;
              medium: number;
              low: number;
            }>
          ): {
            total: number;
            high: number;
            medium: number;
            low: number;
          } => {
            if (!response.success) {
              throw new Error(
                response.message || 'Failed to fetch pending user approvals'
              );
            }
            return response.data;
          }
        ),
        catchError(error => {
          console.error('Error fetching pending user approvals:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get user activity metrics
   */
  getUserActivityMetrics(params?: UserStatsQueryParams): Observable<{
    recentRegistrations: number;
    lastLoginActivity: number;
    activeUsersToday: number;
    inactiveUsersCount: number;
  }> {
    return this.getUserStatistics(params).pipe(
      map(stats => ({
        recentRegistrations: stats.recentRegistrations,
        lastLoginActivity: stats.lastLoginActivity,
        activeUsersToday: stats.activeUsers,
        inactiveUsersCount: stats.inactiveUsers,
      }))
    );
  }

  /**
   * Build query parameters string
   */
  private buildQueryParams(params?: UserStatsQueryParams): string {
    if (!params) return '';

    const queryParams = new URLSearchParams();

    if (params.timeRange) queryParams.set('timeRange', params.timeRange);
    if (params.departmentId)
      queryParams.set('departmentId', params.departmentId);
    if (params.roleId) queryParams.set('roleId', params.roleId);
    if (params.status) queryParams.set('status', params.status);
    if (params.includeInactive !== undefined)
      queryParams.set('includeInactive', params.includeInactive.toString());
    if (params.limit) queryParams.set('limit', params.limit.toString());
    if (params.page) queryParams.set('page', params.page.toString());
    if (params.sortBy) queryParams.set('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.set('sortOrder', params.sortOrder);

    const queryString = queryParams.toString();
    return queryString ? `?${queryString}` : '';
  }
}
