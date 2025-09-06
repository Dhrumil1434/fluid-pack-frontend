import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { API_ENDPOINTS } from '../../../core/constants/api.constants';
import { BaseApiService } from '../../../core/services/base-api.service';
import {
  ApiResponse,
  ApprovalStatistics,
  ApprovalStatsQueryParams,
  PendingApproval,
} from '../interfaces/dashboard.interfaces';

@Injectable({
  providedIn: 'root',
})
export class ApprovalStatisticsService {
  constructor(private baseApiService: BaseApiService) {}

  /**
   * Get comprehensive approval statistics
   */
  getApprovalStatistics(
    params?: ApprovalStatsQueryParams
  ): Observable<ApprovalStatistics> {
    const queryParams = this.buildQueryParams(params);

    return this.baseApiService
      .get<ApprovalStatistics>(
        `${API_ENDPOINTS.MACHINE_APPROVALS}/statistics${queryParams}`
      )
      .pipe(
        map((response: ApiResponse<ApprovalStatistics>): ApprovalStatistics => {
          if (!response.success) {
            throw new Error(
              response.message || 'Failed to fetch approval statistics'
            );
          }
          return response.data;
        }),
        catchError(error => {
          console.error('Error fetching approval statistics:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get approval statistics summary for dashboard cards
   */
  getApprovalStatisticsSummary(params?: ApprovalStatsQueryParams): Observable<{
    totalPending: number;
    highPriority: number;
    mediumPriority: number;
    lowPriority: number;
  }> {
    return this.getApprovalStatistics(params).pipe(
      map(stats => ({
        totalPending: stats.totalPending,
        highPriority: stats.highPriority,
        mediumPriority: stats.mediumPriority,
        lowPriority: stats.lowPriority,
      }))
    );
  }

  /**
   * Get pending approvals for dashboard widget
   */
  getPendingApprovals(
    limit: number = 10,
    params?: ApprovalStatsQueryParams
  ): Observable<PendingApproval[]> {
    const queryParams = this.buildQueryParams({
      ...params,
      status: 'pending',
      limit,
      sortBy: 'requestedAt',
      sortOrder: 'desc',
    });

    return this.baseApiService
      .get<{
        approvals: PendingApproval[];
        total: number;
        pages: number;
      }>(`${API_ENDPOINTS.PENDING_APPROVALS}${queryParams}`)
      .pipe(
        map(
          (
            response: ApiResponse<{
              approvals: PendingApproval[];
              total: number;
              pages: number;
            }>
          ): PendingApproval[] => {
            if (!response.success) {
              throw new Error(
                response.message || 'Failed to fetch pending approvals'
              );
            }
            console.log(response);
            // Transform backend approval data to frontend PendingApproval format
            return response.data.approvals.map((approval: any) => ({
              id: approval._id,
              type: this.mapApprovalType(approval.approvalType),
              title: this.generateApprovalTitle(approval),
              description: approval.requestNotes || 'No description provided',
              requestedBy: approval.requestedBy?.username || 'Unknown',
              requestedById: approval.requestedBy?._id || approval.requestedBy,
              requestedAt: new Date(approval.createdAt),
              priority: this.determinePriority(approval),
              status: this.mapApprovalStatus(approval.status),
              metadata: {
                machineId: approval.machineId?._id || approval.machineId,
                machineName: approval.machineId?.name || 'Unknown Machine',
                proposedChanges: approval.proposedChanges,
              },
              dueDate: this.calculateDueDate(approval.createdAt),
            }));
          }
        ),
        catchError(error => {
          console.error('Error fetching pending approvals:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get approvals by type statistics
   */
  getApprovalsByType(params?: ApprovalStatsQueryParams): Observable<
    {
      type:
        | 'machine_creation'
        | 'machine_update'
        | 'machine_deletion'
        | 'user_approval';
      count: number;
      percentage: number;
    }[]
  > {
    return this.getApprovalStatistics(params).pipe(
      map(stats => stats.approvalsByType)
    );
  }

  /**
   * Get approval processing metrics
   */
  getApprovalProcessingMetrics(params?: ApprovalStatsQueryParams): Observable<{
    averageProcessingTime: number;
    overdueApprovals: number;
    processingEfficiency: number;
    approvalRate: number;
  }> {
    return this.getApprovalStatistics(params).pipe(
      map(stats => ({
        averageProcessingTime: stats.averageProcessingTime,
        overdueApprovals: stats.overdueApprovals,
        processingEfficiency:
          stats.overdueApprovals > 0
            ? Math.max(
                0,
                100 - (stats.overdueApprovals / stats.totalPending) * 100
              )
            : 100,
        approvalRate:
          stats.totalPending > 0
            ? ((stats.totalPending - stats.overdueApprovals) /
                stats.totalPending) *
              100
            : 100,
      }))
    );
  }

  /**
   * Get high priority approvals
   */
  getHighPriorityApprovals(
    params?: ApprovalStatsQueryParams
  ): Observable<PendingApproval[]> {
    const queryParams = this.buildQueryParams({
      ...params,
      priority: 'high',
      status: 'pending',
      sortBy: 'requestedAt',
      sortOrder: 'asc',
    });

    return this.baseApiService
      .get<{
        approvals: PendingApproval[];
        total: number;
        pages: number;
      }>(`${API_ENDPOINTS.MACHINE_APPROVALS}${queryParams}`)
      .pipe(
        map(
          (
            response: ApiResponse<{
              approvals: PendingApproval[];
              total: number;
              pages: number;
            }>
          ): PendingApproval[] => {
            if (!response.success) {
              throw new Error(
                response.message || 'Failed to fetch high priority approvals'
              );
            }
            // Transform backend approval data to frontend PendingApproval format
            return response.data.approvals.map((approval: any) => ({
              id: approval._id,
              type: this.mapApprovalType(approval.approvalType),
              title: this.generateApprovalTitle(approval),
              description: approval.requestNotes || 'No description provided',
              requestedBy: approval.requestedBy?.username || 'Unknown',
              requestedById: approval.requestedBy?._id || approval.requestedBy,
              requestedAt: new Date(approval.createdAt),
              priority: this.determinePriority(approval),
              status: this.mapApprovalStatus(approval.status),
              metadata: {
                machineId: approval.machineId?._id || approval.machineId,
                machineName: approval.machineId?.name || 'Unknown Machine',
                proposedChanges: approval.proposedChanges,
              },
              dueDate: this.calculateDueDate(approval.createdAt),
            }));
          }
        ),
        catchError(error => {
          console.error('Error fetching high priority approvals:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get overdue approvals
   */
  getOverdueApprovals(
    params?: ApprovalStatsQueryParams
  ): Observable<PendingApproval[]> {
    const queryParams = this.buildQueryParams({
      ...params,
      status: 'pending',
      overdue: true,
      sortBy: 'requestedAt',
      sortOrder: 'asc',
    });

    return this.baseApiService
      .get<{
        approvals: PendingApproval[];
        total: number;
        pages: number;
      }>(`${API_ENDPOINTS.MACHINE_APPROVALS}/overdue${queryParams}`)
      .pipe(
        map(
          (
            response: ApiResponse<{
              approvals: PendingApproval[];
              total: number;
              pages: number;
            }>
          ): PendingApproval[] => {
            if (!response.success) {
              throw new Error(
                response.message || 'Failed to fetch overdue approvals'
              );
            }
            // Transform backend approval data to frontend PendingApproval format
            return response.data.approvals.map((approval: any) => ({
              id: approval._id,
              type: this.mapApprovalType(approval.approvalType),
              title: this.generateApprovalTitle(approval),
              description: approval.requestNotes || 'No description provided',
              requestedBy: approval.requestedBy?.username || 'Unknown',
              requestedById: approval.requestedBy?._id || approval.requestedBy,
              requestedAt: new Date(approval.createdAt),
              priority: this.determinePriority(approval),
              status: this.mapApprovalStatus(approval.status),
              metadata: {
                machineId: approval.machineId?._id || approval.machineId,
                machineName: approval.machineId?.name || 'Unknown Machine',
                proposedChanges: approval.proposedChanges,
              },
              dueDate: this.calculateDueDate(approval.createdAt),
            }));
          }
        ),
        catchError(error => {
          console.error('Error fetching overdue approvals:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get approval trends over time
   */
  getApprovalTrends(params?: ApprovalStatsQueryParams): Observable<
    {
      period: string;
      totalApprovals: number;
      approvedCount: number;
      rejectedCount: number;
      pendingCount: number;
    }[]
  > {
    const queryParams = this.buildQueryParams({
      ...params,
      groupBy: 'period',
    });

    return this.baseApiService
      .get<
        {
          period: string;
          totalApprovals: number;
          approvedCount: number;
          rejectedCount: number;
          pendingCount: number;
        }[]
      >(`${API_ENDPOINTS.MACHINE_APPROVALS}/trends${queryParams}`)
      .pipe(
        map(
          (
            response: ApiResponse<
              {
                period: string;
                totalApprovals: number;
                approvedCount: number;
                rejectedCount: number;
                pendingCount: number;
              }[]
            >
          ): {
            period: string;
            totalApprovals: number;
            approvedCount: number;
            rejectedCount: number;
            pendingCount: number;
          }[] => {
            if (!response.success) {
              throw new Error(
                response.message || 'Failed to fetch approval trends'
              );
            }
            return response.data;
          }
        ),
        catchError(error => {
          console.error('Error fetching approval trends:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Process an approval (approve or reject)
   */
  processApproval(
    approvalId: string,
    decision: 'APPROVED' | 'REJECTED',
    decisionNotes?: string
  ): Observable<any> {
    return this.baseApiService
      .patch<ApiResponse<any>>(
        `${API_ENDPOINTS.PROCESS_APPROVAL.replace(':id', approvalId)}`,
        {
          decision,
          decisionNotes,
        }
      )
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to process approval');
          }
          return response.data;
        }),
        catchError(error => {
          console.error('Error processing approval:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Build query parameters string
   */
  private buildQueryParams(params?: ApprovalStatsQueryParams): string {
    if (!params) return '';

    const queryParams = new URLSearchParams();

    if (params.timeRange) queryParams.set('timeRange', params.timeRange);
    if (params.departmentId)
      queryParams.set('departmentId', params.departmentId);
    if (params.priority) queryParams.set('priority', params.priority);
    if (params.type) queryParams.set('type', params.type);
    if (params.status) queryParams.set('status', params.status);
    if (params.includeInactive !== undefined)
      queryParams.set('includeInactive', params.includeInactive.toString());
    if (params.limit) queryParams.set('limit', params.limit.toString());
    if (params.page) queryParams.set('page', params.page.toString());
    if (params.sortBy) queryParams.set('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.set('sortOrder', params.sortOrder);
    if (params.groupBy) queryParams.set('groupBy', params.groupBy);
    if (params.overdue !== undefined)
      queryParams.set('overdue', params.overdue.toString());

    const queryString = queryParams.toString();
    return queryString ? `?${queryString}` : '';
  }

  /**
   * Map backend approval type to frontend type
   */
  private mapApprovalType(
    approvalType: string
  ):
    | 'machine_creation'
    | 'machine_update'
    | 'machine_deletion'
    | 'user_approval' {
    switch (approvalType) {
      case 'MACHINE_CREATION':
        return 'machine_creation';
      case 'MACHINE_EDIT':
        return 'machine_update';
      case 'MACHINE_DELETION':
        return 'machine_deletion';
      default:
        return 'machine_creation';
    }
  }

  /**
   * Map backend approval status to frontend status
   */
  private mapApprovalStatus(
    status: string
  ): 'pending' | 'in_review' | 'approved' | 'rejected' {
    switch (status) {
      case 'PENDING':
        return 'pending';
      case 'APPROVED':
        return 'approved';
      case 'REJECTED':
        return 'rejected';
      case 'CANCELLED':
        return 'rejected';
      default:
        return 'pending';
    }
  }

  /**
   * Generate approval title based on approval data
   */
  private generateApprovalTitle(approval: any): string {
    const machineName = approval.machineId?.name || 'Unknown Machine';
    switch (approval.approvalType) {
      case 'MACHINE_CREATION':
        return `Create Machine: ${machineName}`;
      case 'MACHINE_EDIT':
        return `Update Machine: ${machineName}`;
      case 'MACHINE_DELETION':
        return `Delete Machine: ${machineName}`;
      default:
        return `Machine Request: ${machineName}`;
    }
  }

  /**
   * Determine priority based on approval data
   */
  private determinePriority(_approval: any): 'high' | 'medium' | 'low' {
    // You can implement custom logic here based on approval data
    // For now, return medium as default
    return 'medium';
  }

  /**
   * Calculate due date (7 days from creation)
   */
  private calculateDueDate(createdAt: string | Date): Date {
    const created = new Date(createdAt);
    const dueDate = new Date(created);
    dueDate.setDate(dueDate.getDate() + 7);
    return dueDate;
  }
}
