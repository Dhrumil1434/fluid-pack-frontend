import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApiService } from './base-api.service';
import {
  Machine,
  CreateMachineRequest,
  UpdateMachineRequest,
  MachineFilters,
  MachineApprovalRequest,
} from '../models/machine.model';
import { ApiResponse } from '../models/api-response.model';

@Injectable({
  providedIn: 'root',
})
export class MachineService {
  constructor(private baseApiService: BaseApiService) {}

  /**
   * Get all machines with pagination and filters
   */
  getAllMachines(
    filters?: MachineFilters
  ): Observable<
    ApiResponse<{ machines: Machine[]; total: number; pages: number }>
  > {
    return this.baseApiService.get<{
      machines: Machine[];
      total: number;
      pages: number;
    }>('/machines', filters);
  }

  /**
   * Get approved machines only
   */
  getApprovedMachines(): Observable<ApiResponse<Machine[]>> {
    return this.baseApiService.get<Machine[]>('/machines/approved');
  }

  /**
   * Get machine by ID
   */
  getMachineById(id: string): Observable<ApiResponse<Machine>> {
    return this.baseApiService.get<Machine>(`/machines/${id}`);
  }

  /**
   * Create a new machine
   */
  createMachine(
    machineData: CreateMachineRequest
  ): Observable<ApiResponse<Machine>> {
    return this.baseApiService.post<Machine>('/machines', machineData);
  }

  /**
   * Create a new machine with images (multipart/form-data)
   */
  createMachineForm(data: {
    so_id: string; // Required: Reference to SO
    location?: string; // Optional
    dispatch_date?: string | Date;
    images?: File[];
    documents?: File[];
    metadata?: Record<string, unknown>;
  }): Observable<ApiResponse<Machine>> {
    const form = new FormData();
    form.append('so_id', data.so_id);
    if (data.location) {
      form.append('location', data.location);
    }
    // Always append dispatch_date (empty string will be converted to null on backend)
    const dispatchDate = data.dispatch_date
      ? typeof data.dispatch_date === 'string'
        ? data.dispatch_date
        : data.dispatch_date.toISOString().split('T')[0]
      : '';
    form.append('dispatch_date', dispatchDate);
    if (data.metadata !== undefined) {
      form.append('metadata', JSON.stringify(data.metadata));
    }
    if (data.images && data.images.length) {
      data.images.forEach(file => form.append('images', file));
    }
    if (data.documents && data.documents.length) {
      data.documents.forEach(file => form.append('documents', file));
    }
    return this.baseApiService.post<Machine>('/machines', form);
  }

  /**
   * Update machine
   */
  updateMachine(
    id: string,
    machineData: UpdateMachineRequest
  ): Observable<ApiResponse<Machine>> {
    return this.baseApiService.put<Machine>(`/machines/${id}`, machineData);
  }

  /**
   * Update machine with images (multipart/form-data)
   */
  updateMachineForm(
    id: string,
    data: {
      so_id?: string; // Optional: Update SO reference if needed
      location?: string;
      dispatch_date?: string | Date;
      machine_sequence?: string; // Can be updated but usually auto-generated
      images?: File[];
      documents?: File[];
      metadata?: Record<string, unknown>;
      removedDocuments?: any[];
      removedImages?: string[];
    }
  ): Observable<ApiResponse<Machine>> {
    const form = new FormData();
    if (data.so_id) form.append('so_id', data.so_id);
    if (data.location) form.append('location', data.location);
    // Allow empty string for machine_sequence to clear it
    if (data.machine_sequence !== undefined)
      form.append('machine_sequence', data.machine_sequence);
    // Always append dispatch_date (empty string will be converted to null on backend)
    if (data.dispatch_date !== undefined) {
      const dispatchDate = data.dispatch_date
        ? typeof data.dispatch_date === 'string'
          ? data.dispatch_date
          : data.dispatch_date.toISOString().split('T')[0]
        : '';
      form.append('dispatch_date', dispatchDate);
    }
    if (data.metadata !== undefined) {
      form.append('metadata', JSON.stringify(data.metadata));
    }
    if (data.removedDocuments && data.removedDocuments.length > 0) {
      form.append('removedDocuments', JSON.stringify(data.removedDocuments));
    }
    if (data.removedImages && data.removedImages.length > 0) {
      form.append('removedImages', JSON.stringify(data.removedImages));
    }
    if (data.images && data.images.length) {
      data.images.forEach(file => form.append('images', file));
    }
    if (data.documents && data.documents.length) {
      data.documents.forEach(file => form.append('documents', file));
    }
    return this.baseApiService.put<Machine>(`/machines/${id}`, form);
  }

  /**
   * Delete machine (soft delete)
   */
  deleteMachine(id: string): Observable<ApiResponse<null>> {
    return this.baseApiService.delete<null>(`/machines/${id}`);
  }

  /**
   * Update machine approval status
   */
  updateMachineApproval(
    id: string,
    approvalData: MachineApprovalRequest
  ): Observable<ApiResponse<Machine>> {
    return this.baseApiService.patch<Machine>(
      `/machines/${id}/approval`,
      approvalData
    );
  }

  /**
   * Update machine sequence only
   */
  updateMachineSequence(
    id: string,
    sequence: string
  ): Observable<ApiResponse<Machine>> {
    return this.baseApiService.patch<Machine>(`/machines/${id}/sequence`, {
      machine_sequence: sequence,
    });
  }

  /**
   * Get machines by category
   */
  getMachinesByCategory(
    categoryId: string
  ): Observable<ApiResponse<Machine[]>> {
    return this.baseApiService.get<Machine[]>(
      `/machines/category/${categoryId}`
    );
  }

  /**
   * Validate multiple machine IDs
   */
  validateMachineIds(
    machineIds: string[]
  ): Observable<ApiResponse<{ id: string; isValid: boolean }[]>> {
    return this.baseApiService.post<{ id: string; isValid: boolean }[]>(
      '/machines/validate-ids',
      { machineIds }
    );
  }

  /**
   * Get search suggestions for a specific field
   */
  getSearchSuggestions(
    field: string,
    query: string
  ): Observable<ApiResponse<{ suggestions: string[] }>> {
    return this.baseApiService.get<{ suggestions: string[] }>(
      `/machines/suggestions/${field}`,
      { query, limit: 10 }
    );
  }
}
