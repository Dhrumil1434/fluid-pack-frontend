import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { BaseApiService } from '../../../core/services/base-api.service';
import { API_ENDPOINTS } from '../../../core/constants/api.constants';
import {
  QAStatistics,
  ApiResponse,
  QAMachineStatistics,
  QAStatsQueryParams,
} from '../interfaces/dashboard.interfaces';

@Injectable({
  providedIn: 'root',
})
export class QAStatisticsService {
  constructor(private baseApiService: BaseApiService) {}

  /**
   * Get comprehensive QA statistics
   */
  getQAStatistics(params?: QAStatsQueryParams): Observable<QAStatistics> {
    const queryParams = this.buildQueryParams(params);

    return this.baseApiService
      .get<QAStatistics>(
        `${API_ENDPOINTS.QA_MACHINES}/statistics${queryParams}`
      )
      .pipe(
        map((response: ApiResponse<QAStatistics>): QAStatistics => {
          if (!response.success) {
            throw new Error(
              response.message || 'Failed to fetch QA statistics'
            );
          }
          return response.data;
        }),
        catchError(error => {
          console.error('Error fetching QA statistics:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get QA statistics summary for dashboard cards
   */
  getQAStatisticsSummary(params?: QAStatsQueryParams): Observable<{
    totalQAEntries: number;
    completedQAEntries: number;
    pendingQAEntries: number;
    qualityScore: number;
  }> {
    return this.getQAStatistics(params).pipe(
      map(stats => ({
        totalQAEntries: stats.totalQAEntries,
        completedQAEntries: stats.completedQAEntries,
        pendingQAEntries: stats.pendingQAEntries,
        qualityScore: stats.qualityScore,
      }))
    );
  }

  /**
   * Get QA entries by machine statistics
   */
  getQAByMachine(
    params?: QAStatsQueryParams
  ): Observable<QAMachineStatistics[]> {
    return this.getQAStatistics(params).pipe(
      map(stats => stats.qaEntriesByMachine)
    );
  }

  /**
   * Get recent QA entries
   */
  getRecentQAEntries(
    limit: number = 10,
    params?: QAStatsQueryParams
  ): Observable<any[]> {
    const queryParams = this.buildQueryParams({
      ...params,
      limit,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });

    return this.baseApiService
      .get<{
        entries: any[];
        total: number;
        pages: number;
      }>(`${API_ENDPOINTS.QA_MACHINES}${queryParams}`)
      .pipe(
        map(
          (
            response: ApiResponse<{
              entries: any[];
              total: number;
              pages: number;
            }>
          ): any[] => {
            if (!response.success) {
              throw new Error(
                response.message || 'Failed to fetch recent QA entries'
              );
            }
            return response.data.entries;
          }
        ),
        catchError(error => {
          console.error('Error fetching recent QA entries:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get QA completion metrics
   */
  getQACompletionMetrics(params?: QAStatsQueryParams): Observable<{
    averageCompletionTime: number;
    completionRate: number;
    qualityScore: number;
    efficiency: number;
  }> {
    return this.getQAStatistics(params).pipe(
      map(stats => ({
        averageCompletionTime: stats.averageCompletionTime,
        completionRate:
          stats.totalQAEntries > 0
            ? (stats.completedQAEntries / stats.totalQAEntries) * 100
            : 0,
        qualityScore: stats.qualityScore,
        efficiency:
          stats.averageCompletionTime > 0
            ? Math.max(0, 100 - stats.averageCompletionTime / 24)
            : 100, // Assuming 24 hours as baseline
      }))
    );
  }

  /**
   * Get QA entries by user
   */
  getQAByUser(userId: string, params?: QAStatsQueryParams): Observable<any[]> {
    const queryParams = this.buildQueryParams({
      ...params,
      userId,
    });

    return this.baseApiService
      .get<{
        entries: any[];
        total: number;
        pages: number;
      }>(
        `${API_ENDPOINTS.QA_MACHINE_BY_USER.replace(':userId', userId)}${queryParams}`
      )
      .pipe(
        map(
          (
            response: ApiResponse<{
              entries: any[];
              total: number;
              pages: number;
            }>
          ): any[] => {
            if (!response.success) {
              throw new Error(
                response.message || 'Failed to fetch QA entries by user'
              );
            }
            return response.data.entries;
          }
        ),
        catchError(error => {
          console.error('Error fetching QA entries by user:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get QA entries by machine
   */
  getQAByMachineId(
    machineId: string,
    params?: QAStatsQueryParams
  ): Observable<any[]> {
    const queryParams = this.buildQueryParams({
      ...params,
      machineId,
    });

    return this.baseApiService
      .get<{
        entries: any[];
        total: number;
        pages: number;
      }>(
        `${API_ENDPOINTS.QA_MACHINE_BY_MACHINE.replace(':machineId', machineId)}${queryParams}`
      )
      .pipe(
        map(
          (
            response: ApiResponse<{
              entries: any[];
              total: number;
              pages: number;
            }>
          ): any[] => {
            if (!response.success) {
              throw new Error(
                response.message || 'Failed to fetch QA entries by machine'
              );
            }
            return response.data.entries;
          }
        ),
        catchError(error => {
          console.error('Error fetching QA entries by machine:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get QA quality trends
   */
  getQAQualityTrends(params?: QAStatsQueryParams): Observable<
    {
      period: string;
      averageQualityScore: number;
      totalEntries: number;
      completedEntries: number;
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
          averageQualityScore: number;
          totalEntries: number;
          completedEntries: number;
        }[]
      >(`${API_ENDPOINTS.QA_MACHINES}/trends${queryParams}`)
      .pipe(
        map(
          (
            response: ApiResponse<
              {
                period: string;
                averageQualityScore: number;
                totalEntries: number;
                completedEntries: number;
              }[]
            >
          ): {
            period: string;
            averageQualityScore: number;
            totalEntries: number;
            completedEntries: number;
          }[] => {
            if (!response.success) {
              throw new Error(
                response.message || 'Failed to fetch QA quality trends'
              );
            }
            return response.data;
          }
        ),
        catchError(error => {
          console.error('Error fetching QA quality trends:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get QA performance metrics
   */
  getQAPerformanceMetrics(params?: QAStatsQueryParams): Observable<{
    totalEntries: number;
    completedEntries: number;
    pendingEntries: number;
    averageQualityScore: number;
    averageCompletionTime: number;
    topPerformers: {
      userId: string;
      userName: string;
      qualityScore: number;
      completionCount: number;
    }[];
  }> {
    return this.getQAStatistics(params).pipe(
      map(stats => ({
        totalEntries: stats.totalQAEntries,
        completedEntries: stats.completedQAEntries,
        pendingEntries: stats.pendingQAEntries,
        averageQualityScore: stats.qualityScore,
        averageCompletionTime: stats.averageCompletionTime,
        topPerformers: [], // This would come from a separate API call
      }))
    );
  }

  /**
   * Create a new QA entry
   */
  createQAEntry(data: {
    machineId: string;
    reportLink: string;
    files?: string[];
  }): Observable<any> {
    return this.baseApiService
      .post<ApiResponse<any>>(API_ENDPOINTS.QA_MACHINES, data)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to create QA entry');
          }
          return response.data;
        }),
        catchError(error => {
          console.error('Error creating QA entry:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Update a QA entry
   */
  updateQAEntry(
    entryId: string,
    data: {
      reportLink?: string;
      files?: string[];
    }
  ): Observable<any> {
    return this.baseApiService
      .put<
        ApiResponse<any>
      >(`${API_ENDPOINTS.QA_MACHINE_BY_ID.replace(':id', entryId)}`, data)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to update QA entry');
          }
          return response.data;
        }),
        catchError(error => {
          console.error('Error updating QA entry:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Build query parameters string
   */
  private buildQueryParams(params?: QAStatsQueryParams): string {
    if (!params) return '';

    const queryParams = new URLSearchParams();

    if (params.timeRange) queryParams.set('timeRange', params.timeRange);
    if (params.departmentId)
      queryParams.set('departmentId', params.departmentId);
    if (params.categoryId) queryParams.set('categoryId', params.categoryId);
    if (params.machineId) queryParams.set('machineId', params.machineId);
    if (params.userId) queryParams.set('userId', params.userId);
    if (params.status) queryParams.set('status', params.status);
    if (params.includeInactive !== undefined)
      queryParams.set('includeInactive', params.includeInactive.toString());
    if (params.limit) queryParams.set('limit', params.limit.toString());
    if (params.page) queryParams.set('page', params.page.toString());
    if (params.sortBy) queryParams.set('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.set('sortOrder', params.sortOrder);
    if (params.groupBy) queryParams.set('groupBy', params.groupBy);

    const queryString = queryParams.toString();
    return queryString ? `?${queryString}` : '';
  }
}
