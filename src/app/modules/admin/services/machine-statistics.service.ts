import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { BaseApiService } from '../../../core/services/base-api.service';
import { API_ENDPOINTS } from '../../../core/constants/api.constants';
import {
  MachineStatistics,
  ApiResponse,
  MachinePreview,
  MachineStatsQueryParams,
} from '../interfaces/dashboard.interfaces';

@Injectable({
  providedIn: 'root',
})
export class MachineStatisticsService {
  constructor(private baseApiService: BaseApiService) {}

  /**
   * Get comprehensive machine statistics
   */
  getMachineStatistics(
    params?: MachineStatsQueryParams
  ): Observable<MachineStatistics> {
    const queryParams = this.buildQueryParams(params);

    return this.baseApiService
      .get<MachineStatistics>(
        `${API_ENDPOINTS.MACHINES}/statistics${queryParams}`
      )
      .pipe(
        map((response: ApiResponse<MachineStatistics>): MachineStatistics => {
          if (!response.success) {
            throw new Error(
              response.message || 'Failed to fetch machine statistics'
            );
          }
          return response.data;
        }),
        catchError(error => {
          console.error('Error fetching machine statistics:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get machine statistics summary for dashboard cards
   */
  getMachineStatisticsSummary(params?: MachineStatsQueryParams): Observable<{
    totalMachines: number;
    activeMachines: number;
    pendingMachines: number;
    approvedMachines: number;
  }> {
    return this.getMachineStatistics(params).pipe(
      map(stats => ({
        totalMachines: stats.totalMachines,
        activeMachines: stats.activeMachines,
        pendingMachines: stats.pendingMachines,
        approvedMachines: stats.approvedMachines,
      }))
    );
  }

  /**
   * Get machines by category statistics
   */
  getMachinesByCategory(params?: MachineStatsQueryParams): Observable<
    {
      categoryId: string;
      categoryName: string;
      machineCount: number;
      percentage: number;
    }[]
  > {
    return this.getMachineStatistics(params).pipe(
      map(stats => stats.machinesByCategory)
    );
  }

  /**
   * Get recent machines for preview
   */
  getRecentMachines(
    limit: number = 5,
    params?: MachineStatsQueryParams
  ): Observable<MachinePreview[]> {
    const queryParams = this.buildQueryParams({
      ...params,
      limit,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });

    return this.baseApiService
      .get<any>(`${API_ENDPOINTS.MACHINES}${queryParams}`)
      .pipe(
        map((response: ApiResponse<any>): MachinePreview[] => {
          if (!response.success) {
            throw new Error(
              response.message || 'Failed to fetch recent machines'
            );
          }
          // Transform backend machine data to frontend MachinePreview format
          return response.data.machines.map((machine: any) => ({
            id: machine._id,
            name: machine.name,
            category: machine.category_id?.name || 'Unknown',
            categoryId: machine.category_id?._id || machine.category_id,
            status: machine.is_approved ? 'active' : 'pending',
            createdBy: machine.created_by?.username || 'Unknown',
            createdById: machine.created_by?._id || machine.created_by,
            createdAt: new Date(machine.createdAt),
            lastUpdated: new Date(machine.updatedAt),
            image: machine.images?.[0],
            isApproved: machine.is_approved,
          }));
        }),
        catchError(error => {
          console.error('Error fetching recent machines:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get approved machines
   */
  getApprovedMachines(
    params?: MachineStatsQueryParams
  ): Observable<MachinePreview[]> {
    const queryParams = this.buildQueryParams({
      ...params,
      isApproved: true,
      status: 'active',
    });

    return this.baseApiService
      .get<{
        machines: MachinePreview[];
        total: number;
        pages: number;
      }>(`${API_ENDPOINTS.MACHINE_APPROVED}${queryParams}`)
      .pipe(
        map(
          (
            response: ApiResponse<{
              machines: any[];
              total: number;
              pages: number;
            }>
          ): MachinePreview[] => {
            if (!response.success) {
              throw new Error(
                response.message || 'Failed to fetch approved machines'
              );
            }
            // Transform backend machine data to frontend MachinePreview format
            return response.data.machines.map((machine: any) => ({
              id: machine._id,
              name: machine.name,
              category: machine.category_id?.name || 'Unknown',
              categoryId: machine.category_id?._id || machine.category_id,
              status: machine.is_approved ? 'active' : 'pending',
              createdBy: machine.created_by?.username || 'Unknown',
              createdById: machine.created_by?._id || machine.created_by,
              createdAt: new Date(machine.createdAt),
              lastUpdated: new Date(machine.updatedAt),
              image: machine.images?.[0],
              isApproved: machine.is_approved,
            }));
          }
        ),
        catchError(error => {
          console.error('Error fetching approved machines:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get pending machine approvals
   */
  getPendingMachineApprovals(params?: MachineStatsQueryParams): Observable<{
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
      }>(`${API_ENDPOINTS.MACHINES}/pending-approvals${queryParams}`)
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
                response.message || 'Failed to fetch pending machine approvals'
              );
            }
            return response.data;
          }
        ),
        catchError(error => {
          console.error('Error fetching pending machine approvals:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get machine maintenance status
   */
  getMachineMaintenanceStatus(params?: MachineStatsQueryParams): Observable<{
    maintenanceRequired: number;
    maintenanceOverdue: number;
    maintenanceCompleted: number;
    averageMaintenanceTime: number;
  }> {
    return this.getMachineStatistics(params).pipe(
      map(stats => ({
        maintenanceRequired: stats.maintenanceRequired,
        maintenanceOverdue: 0, // This would come from a maintenance API
        maintenanceCompleted: stats.totalMachines - stats.maintenanceRequired,
        averageMaintenanceTime: 0, // This would come from a maintenance API
      }))
    );
  }

  /**
   * Get machine health metrics
   */
  getMachineHealthMetrics(params?: MachineStatsQueryParams): Observable<{
    healthScore: number;
    uptime: number;
    efficiency: number;
    criticalIssues: number;
  }> {
    return this.getMachineStatistics(params).pipe(
      map(stats => {
        const totalMachines = stats.totalMachines;
        const activeMachines = stats.activeMachines;
        const maintenanceRequired = stats.maintenanceRequired;

        return {
          healthScore:
            totalMachines > 0
              ? Math.round((activeMachines / totalMachines) * 100)
              : 0,
          uptime:
            totalMachines > 0
              ? Math.round((activeMachines / totalMachines) * 100)
              : 0,
          efficiency:
            totalMachines > 0
              ? Math.round(
                  ((totalMachines - maintenanceRequired) / totalMachines) * 100
                )
              : 0,
          criticalIssues: maintenanceRequired,
        };
      })
    );
  }

  /**
   * Build query parameters string
   */
  private buildQueryParams(params?: MachineStatsQueryParams): string {
    if (!params) return '';

    const queryParams = new URLSearchParams();

    if (params.timeRange) queryParams.set('timeRange', params.timeRange);
    if (params.departmentId)
      queryParams.set('departmentId', params.departmentId);
    if (params.categoryId) queryParams.set('categoryId', params.categoryId);
    if (params.status) queryParams.set('status', params.status);
    if (params.isApproved !== undefined)
      queryParams.set('isApproved', params.isApproved.toString());
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
