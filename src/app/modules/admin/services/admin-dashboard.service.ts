import { Injectable } from '@angular/core';
import { Observable, forkJoin, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { BaseApiService } from '../../../core/services/base-api.service';

// Import individual services
import { ApprovalStatisticsService } from './approval-statistics.service';
import { MachineStatisticsService } from './machine-statistics.service';
import { QAStatisticsService } from './qa-statistics.service';
import { UserStatisticsService } from './user-statistics.service';

// Import interfaces
import {
  DashboardData,
  DashboardQueryParams,
  DashboardStatistics,
  RecentActivity,
} from '../interfaces/dashboard.interfaces';

@Injectable({
  providedIn: 'root',
})
export class AdminDashboardService {
  constructor(
    private baseApiService: BaseApiService,
    private userStatisticsService: UserStatisticsService,
    private machineStatisticsService: MachineStatisticsService,
    private approvalStatisticsService: ApprovalStatisticsService,
    private qaStatisticsService: QAStatisticsService
  ) {}

  /**
   * Get comprehensive dashboard data from multiple APIs
   */
  getDashboardData(params?: DashboardQueryParams): Observable<DashboardData> {
    // Fetch all data in parallel for better performance
    return forkJoin({
      userStats: this.userStatisticsService.getUserStatistics(params),
      machineStats: this.machineStatisticsService.getMachineStatistics(params),
      approvalStats:
        this.approvalStatisticsService.getApprovalStatistics(params),
      qaStats: this.qaStatisticsService.getQAStatistics(params),
      recentActivity: this.getRecentActivity(params),
      pendingApprovals: this.approvalStatisticsService.getPendingApprovals(
        10,
        params
      ),
      recentUsers: this.userStatisticsService.getRecentUsers(5, params),
      recentMachines: this.machineStatisticsService.getRecentMachines(
        5,
        params
      ),
    }).pipe(
      map(data => this.buildDashboardData(data)),
      catchError(error => {
        console.error('Error fetching dashboard data:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get dashboard statistics summary
   */
  getDashboardStatistics(
    params?: DashboardQueryParams
  ): Observable<DashboardStatistics> {
    return forkJoin({
      userStats: this.userStatisticsService.getUserStatisticsSummary(params),
      machineStats:
        this.machineStatisticsService.getMachineStatisticsSummary(params),
      approvalStats:
        this.approvalStatisticsService.getApprovalStatisticsSummary(params),
      qaStats: this.qaStatisticsService.getQAStatisticsSummary(params),
    }).pipe(
      map(data => ({
        totalUsers: data.userStats.totalUsers,
        totalMachines: data.machineStats.totalMachines,
        pendingApprovals: data.approvalStats.totalPending,
        qaEntries: data.qaStats.totalQAEntries,
        systemHealth: this.calculateSystemHealth(data),
      })),
      catchError(error => {
        console.error('Error fetching dashboard statistics:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get recent activity from multiple sources
   */
  private getRecentActivity(
    _params?: DashboardQueryParams
  ): Observable<RecentActivity[]> {
    // This would typically aggregate activity from multiple sources
    // For now, return mock data that would come from an activity log API
    return of([
      {
        id: '1',
        type: 'user' as const,
        title: 'New User Registered',
        description: 'John Doe registered for the system',
        timestamp: new Date(Date.now() - 1000 * 60 * 30),
        user: 'System',
        userId: 'system',
        icon: 'pi pi-user-plus',
        color: 'blue',
      },
      {
        id: '2',
        type: 'machine' as const,
        title: 'Machine Created',
        description:
          'New machine "Hydraulic Press" added to Engineering category',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
        user: 'Admin User',
        userId: 'admin-1',
        icon: 'pi pi-cog',
        color: 'green',
      },
      {
        id: '3',
        type: 'approval' as const,
        title: 'Approval Requested',
        description: 'Machine update approval requested for "Conveyor Belt"',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4),
        user: 'Engineer',
        userId: 'eng-1',
        icon: 'pi pi-clock',
        color: 'orange',
      },
    ]).pipe(
      catchError(error => {
        console.error('Error fetching recent activity:', error);
        return of([]);
      })
    );
  }

  /**
   * Build comprehensive dashboard data from individual service responses
   */
  private buildDashboardData(data: any): DashboardData {
    return {
      statistics: {
        totalUsers: data.userStats.totalUsers,
        totalMachines: data.machineStats.totalMachines,
        pendingApprovals: data.approvalStats.totalPending,
        qaEntries: data.qaStats.totalQAEntries,
        systemHealth: this.calculateSystemHealth({
          userStats: data.userStats,
          machineStats: data.machineStats,
          approvalStats: data.approvalStats,
          qaStats: data.qaStats,
        }),
      },
      userStatistics: data.userStats,
      machineStatistics: data.machineStats,
      approvalStatistics: data.approvalStats,
      qaStatistics: data.qaStats,
      recentActivity: data.recentActivity,
      pendingApprovals: data.pendingApprovals,
      userManagement: {
        totalUsers: data.userStats.totalUsers,
        pendingApprovals: data.approvalStats.totalPending,
        recentUsers: data.recentUsers,
        userStats: data.userStats,
      },
      machineManagement: {
        totalMachines: data.machineStats.totalMachines,
        pendingApprovals: data.approvalStats.totalPending,
        recentMachines: data.recentMachines,
        machineStats: data.machineStats,
      },
    };
  }

  /**
   * Calculate system health based on various metrics
   */
  private calculateSystemHealth(data: any): 'healthy' | 'warning' | 'critical' {
    const { userStats, machineStats, approvalStats, qaStats } = data;

    // Calculate health score based on various factors
    let healthScore = 100;

    // Reduce score based on pending approvals
    if (approvalStats.totalPending > 20) healthScore -= 30;
    else if (approvalStats.totalPending > 10) healthScore -= 15;

    // Reduce score based on inactive users
    const inactiveUserRatio = userStats.inactiveUsers / userStats.totalUsers;
    if (inactiveUserRatio > 0.2) healthScore -= 20;
    else if (inactiveUserRatio > 0.1) healthScore -= 10;

    // Reduce score based on inactive machines
    const inactiveMachineRatio =
      machineStats.inactiveMachines / machineStats.totalMachines;
    if (inactiveMachineRatio > 0.3) healthScore -= 25;
    else if (inactiveMachineRatio > 0.15) healthScore -= 12;

    // Reduce score based on QA completion rate
    const qaCompletionRate =
      qaStats.completedQAEntries / qaStats.totalQAEntries;
    if (qaCompletionRate < 0.7) healthScore -= 20;
    else if (qaCompletionRate < 0.85) healthScore -= 10;

    if (healthScore >= 80) return 'healthy';
    if (healthScore >= 60) return 'warning';
    return 'critical';
  }

  /**
   * Refresh dashboard data
   */
  refreshDashboard(params?: DashboardQueryParams): Observable<DashboardData> {
    return this.getDashboardData(params);
  }

  /**
   * Get dashboard data for specific time range
   */
  getDashboardDataForTimeRange(
    timeRange: 'today' | 'week' | 'month' | 'quarter' | 'year'
  ): Observable<DashboardData> {
    return this.getDashboardData({ timeRange });
  }

  /**
   * Get dashboard data for specific department
   */
  getDashboardDataForDepartment(
    departmentId: string
  ): Observable<DashboardData> {
    return this.getDashboardData({ departmentId });
  }
}
