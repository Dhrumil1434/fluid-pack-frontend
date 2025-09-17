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
    name: string;
    category_id: string;
    images?: File[];
    metadata?: Record<string, unknown>;
  }): Observable<ApiResponse<Machine>> {
    const form = new FormData();
    form.append('name', data.name);
    form.append('category_id', data.category_id);
    if (data.metadata) {
      form.append('metadata', JSON.stringify(data.metadata));
    }
    if (data.images && data.images.length) {
      data.images.forEach(file => form.append('images', file));
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
      name?: string;
      category_id?: string;
      images?: File[];
      metadata?: Record<string, unknown>;
    }
  ): Observable<ApiResponse<Machine>> {
    const form = new FormData();
    if (data.name) form.append('name', data.name);
    if (data.category_id) form.append('category_id', data.category_id);
    if (data.metadata) form.append('metadata', JSON.stringify(data.metadata));
    if (data.images && data.images.length) {
      data.images.forEach(file => form.append('images', file));
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
}
