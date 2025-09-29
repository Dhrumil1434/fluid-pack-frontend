import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApiService } from './base-api.service';
import {
  QAMachineEntry,
  CreateQAMachineEntryRequest,
  UpdateQAMachineEntryRequest,
  QAMachineFilters,
} from '../models/qa-machine.model';
import { ApiResponse } from '../models/api-response.model';

@Injectable({
  providedIn: 'root',
})
export class QAMachineService {
  constructor(private baseApiService: BaseApiService) {}

  /**
   * Get all QA machine entries with pagination and filters
   */
  getAllQAMachineEntries(
    filters?: QAMachineFilters
  ): Observable<ApiResponse<{ entries: QAMachineEntry[]; pagination: any }>> {
    return this.baseApiService.get<{
      entries: QAMachineEntry[];
      pagination: any;
    }>('/qc-machines', filters);
  }

  /**
   * Get QA machine entry by ID
   */
  getQAMachineEntryById(id: string): Observable<ApiResponse<QAMachineEntry>> {
    return this.baseApiService.get<QAMachineEntry>(`/qc-machines/${id}`);
  }

  /**
   * Create a new QA machine entry
   */
  createQAMachineEntry(
    entryData: CreateQAMachineEntryRequest
  ): Observable<ApiResponse<QAMachineEntry>> {
    return this.baseApiService.post<QAMachineEntry>('/qc-machines', entryData);
  }

  /**
   * Update QA machine entry
   */
  updateQAMachineEntry(
    id: string,
    entryData: UpdateQAMachineEntryRequest
  ): Observable<ApiResponse<QAMachineEntry>> {
    return this.baseApiService.put<QAMachineEntry>(
      `/qc-machines/${id}`,
      entryData
    );
  }

  /**
   * Delete QA machine entry
   */
  deleteQAMachineEntry(id: string): Observable<ApiResponse<null>> {
    return this.baseApiService.delete<null>(`/qc-machines/${id}`);
  }

  /**
   * Get QA entries by machine ID
   */
  getQAMachineEntriesByMachine(
    machineId: string
  ): Observable<ApiResponse<QAMachineEntry[]>> {
    return this.baseApiService.get<QAMachineEntry[]>(
      `/qc-machines/machine/${machineId}`
    );
  }

  /**
   * Get QA entries by user ID
   */
  getQAMachineEntriesByUser(
    userId: string
  ): Observable<ApiResponse<QAMachineEntry[]>> {
    return this.baseApiService.get<QAMachineEntry[]>(
      `/qc-machines/user/${userId}`
    );
  }

  /**
   * Validate multiple QA entry IDs
   */
  validateQAMachineEntryIds(
    entryIds: string[]
  ): Observable<ApiResponse<{ id: string; isValid: boolean }[]>> {
    return this.baseApiService.post<{ id: string; isValid: boolean }[]>(
      '/qc-machines/validate-ids',
      { entryIds }
    );
  }
}
