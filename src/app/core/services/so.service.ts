import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApiService } from './base-api.service';
import {
  SO,
  CreateSORequest,
  UpdateSORequest,
  SOFilters,
} from '../models/so.model';
import { ApiResponse } from '../models/api-response.model';

@Injectable({
  providedIn: 'root',
})
export class SOService {
  constructor(private baseApiService: BaseApiService) {}

  /**
   * Get all SOs with pagination and filters
   */
  getAllSOs(filters?: SOFilters): Observable<
    ApiResponse<{
      sos: SO[];
      total: number;
      page: number;
      pages: number;
      limit: number;
    }>
  > {
    return this.baseApiService.get<{
      sos: SO[];
      total: number;
      page: number;
      pages: number;
      limit: number;
    }>('/so', filters);
  }

  /**
   * Get active SOs only (for dropdown)
   */
  getActiveSOs(): Observable<ApiResponse<SO[]>> {
    return this.baseApiService.get<SO[]>('/so/active');
  }

  /**
   * Get SO by ID
   */
  getSOById(id: string): Observable<ApiResponse<SO>> {
    return this.baseApiService.get<SO>(`/so/${id}`);
  }

  /**
   * Create a new SO
   */
  createSO(soData: CreateSORequest): Observable<ApiResponse<SO>> {
    return this.baseApiService.post<SO>('/so', soData);
  }

  /**
   * Create a new SO with documents (multipart/form-data)
   */
  createSOForm(
    data: CreateSORequest & { documents?: File[] }
  ): Observable<ApiResponse<SO>> {
    const form = new FormData();
    if (data.name) form.append('name', data.name);
    form.append('customer', data.customer);
    form.append('location', data.location);
    form.append('po_number', data.po_number);
    // Format date as YYYY-MM-DD for backend
    const poDate =
      data.po_date instanceof Date
        ? data.po_date.toISOString().split('T')[0]
        : typeof data.po_date === 'string'
          ? data.po_date.split('T')[0]
          : data.po_date;
    form.append('po_date', poDate);
    form.append('so_number', data.so_number);
    const soDate =
      data.so_date instanceof Date
        ? data.so_date.toISOString().split('T')[0]
        : typeof data.so_date === 'string'
          ? data.so_date.split('T')[0]
          : data.so_date;
    form.append('so_date', soDate);
    // Always send items as array (even if empty) to satisfy backend validation
    // Ensure items is always an array before stringifying
    const itemsArray = Array.isArray(data.items)
      ? data.items
      : data.items
        ? [data.items]
        : [];
    const itemsJson = JSON.stringify(itemsArray);
    console.log('📤 Frontend sending items:', {
      original: data.items,
      isArray: Array.isArray(data.items),
      itemsArray,
      itemsJson,
      itemsJsonLength: itemsJson.length,
    });
    form.append('items', itemsJson);
    form.append('category_id', data.category_id);
    if (data.subcategory_id) {
      form.append('subcategory_id', data.subcategory_id);
    }
    form.append('party_name', data.party_name);
    form.append('mobile_number', data.mobile_number);
    if (data.description) {
      form.append('description', data.description);
    }
    if (data.documents && data.documents.length) {
      data.documents.forEach(file => form.append('documents', file));
    }
    return this.baseApiService.post<SO>('/so', form);
  }

  /**
   * Update SO
   */
  updateSO(id: string, soData: UpdateSORequest): Observable<ApiResponse<SO>> {
    return this.baseApiService.put<SO>(`/so/${id}`, soData);
  }

  /**
   * Update SO with documents (multipart/form-data)
   */
  updateSOForm(
    id: string,
    data: UpdateSORequest & { documents?: File[]; removedDocuments?: any[] }
  ): Observable<ApiResponse<SO>> {
    const form = new FormData();
    if (data.name) form.append('name', data.name);
    if (data.customer) form.append('customer', data.customer);
    if (data.location) form.append('location', data.location);
    if (data.po_number) form.append('po_number', data.po_number);
    if (data.po_date) {
      const poDate =
        data.po_date instanceof Date
          ? data.po_date.toISOString().split('T')[0]
          : typeof data.po_date === 'string'
            ? data.po_date.split('T')[0]
            : data.po_date;
      form.append('po_date', poDate);
    }
    if (data.so_number) form.append('so_number', data.so_number);
    if (data.so_date) {
      const soDate =
        data.so_date instanceof Date
          ? data.so_date.toISOString().split('T')[0]
          : typeof data.so_date === 'string'
            ? data.so_date.split('T')[0]
            : data.so_date;
      form.append('so_date', soDate);
    }
    // Always send items as array (even if empty) to satisfy backend validation
    // Ensure items is always an array before stringifying
    const itemsArray = Array.isArray(data.items)
      ? data.items
      : data.items
        ? [data.items]
        : [];
    form.append('items', JSON.stringify(itemsArray));
    if (data.category_id) form.append('category_id', data.category_id);
    if (data.subcategory_id !== undefined) {
      form.append('subcategory_id', data.subcategory_id || '');
    }
    if (data.party_name) form.append('party_name', data.party_name);
    if (data.mobile_number) form.append('mobile_number', data.mobile_number);
    if (data.description !== undefined) {
      form.append('description', data.description || '');
    }
    if (data.removedDocuments && data.removedDocuments.length > 0) {
      form.append('removedDocuments', JSON.stringify(data.removedDocuments));
    }
    if (data.documents && data.documents.length) {
      data.documents.forEach(file => form.append('documents', file));
    }
    return this.baseApiService.put<SO>(`/so/${id}`, form);
  }

  /**
   * Delete SO (soft delete)
   */
  deleteSO(id: string): Observable<ApiResponse<void>> {
    return this.baseApiService.delete<void>(`/so/${id}`);
  }

  /**
   * Activate SO
   */
  activateSO(id: string): Observable<ApiResponse<SO>> {
    return this.baseApiService.patch<SO>(`/so/${id}/activate`, {});
  }

  /**
   * Deactivate SO
   */
  deactivateSO(id: string): Observable<ApiResponse<SO>> {
    return this.baseApiService.patch<SO>(`/so/${id}/deactivate`, {});
  }
}
