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
    subcategory_id?: string;
    party_name?: string;
    location?: string;
    mobile_number?: string;
    machine_sequence?: string;
    images?: File[];
    documents?: File[];
    metadata?: Record<string, unknown>;
  }): Observable<ApiResponse<Machine>> {
    const form = new FormData();
    form.append('name', data.name);
    form.append('category_id', data.category_id);
    if (data.subcategory_id) {
      form.append('subcategory_id', data.subcategory_id);
    }
    if (data.machine_sequence) {
      form.append('machine_sequence', data.machine_sequence);
    }
    if (data.party_name) {
      form.append('party_name', data.party_name);
    }
    if (data.location) {
      form.append('location', data.location);
    }
    if (data.mobile_number) {
      form.append('mobile_number', data.mobile_number);
    }
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
      name?: string;
      category_id?: string;
      subcategory_id?: string;
      party_name?: string;
      location?: string;
      mobile_number?: string;
      machine_sequence?: string;
      images?: File[];
      documents?: File[];
      metadata?: Record<string, unknown>;
      removedDocuments?: any[];
    }
  ): Observable<ApiResponse<Machine>> {
    const form = new FormData();
    if (data.name) form.append('name', data.name);
    if (data.category_id) form.append('category_id', data.category_id);
    if (data.subcategory_id) form.append('subcategory_id', data.subcategory_id);
    // Allow empty string for machine_sequence to clear it
    if (data.machine_sequence !== undefined)
      form.append('machine_sequence', data.machine_sequence);
    if (data.party_name) form.append('party_name', data.party_name);
    if (data.location) form.append('location', data.location);
    if (data.mobile_number) form.append('mobile_number', data.mobile_number);
    if (data.metadata !== undefined) {
      form.append('metadata', JSON.stringify(data.metadata));
    }
    if (data.removedDocuments && data.removedDocuments.length > 0) {
      form.append('removedDocuments', JSON.stringify(data.removedDocuments));
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
