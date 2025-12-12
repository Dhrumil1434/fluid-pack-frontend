import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApiService } from './base-api.service';
import { ApiResponse } from '../models';

export interface QCDocument {
  name: string;
  file_path: string;
  document_type?: string;
  uploaded_at?: string;
}

export interface QCEntry {
  _id?: string;
  machineId: string;
  addedBy: string;

  // Machine fields
  name?: string;
  category_id?: string;
  subcategory_id?: string;
  machine_sequence?: string;
  party_name?: string;
  location?: string;
  mobile_number?: string;
  dispatch_date?: string;
  images?: string[];
  documents?: QCDocument[];

  // QC-specific fields
  qcNotes?: string;
  qualityScore?: number;
  inspectionDate?: string;
  qc_date?: string;
  nextInspectionDate?: string;
  files?: string[];
  reportLink?: string;

  createdAt?: string;
  updatedAt?: string;
}

export interface QCApproval {
  _id?: string;
  machineId:
    | string
    | {
        _id: string;
        name: string;
        category_id: {
          _id: string;
          name: string;
        };
        images: string[];
      };
  qcEntryId?: string;
  requestedBy?: {
    _id: string;
    username: string;
    name: string;
  };
  approvalType: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  qcNotes?: string;
  qualityScore?: number;
  inspectionDate?: string;
  nextInspectionDate?: string;
  requestNotes?: string;
  approverNotes?: string;
  approvedBy?: {
    _id: string;
    username: string;
    name: string;
  };
  rejectedBy?: {
    _id: string;
    username: string;
    name: string;
  };
  approvalDate?: string;
  rejectionReason?: string;
  machineActivated?: boolean;
  activationDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root',
})
export class QCEntryService {
  constructor(private api: BaseApiService) {}

  /**
   * Create a new QC entry
   */
  createQCEntry(entry: Partial<QCEntry>): Observable<ApiResponse<QCEntry>> {
    return this.api.post<QCEntry>('/qc-machines', entry);
  }

  /**
   * Get all QC entries with pagination and filters
   */
  getQCEntries(
    params?: any
  ): Observable<
    ApiResponse<{ entries: QCEntry[]; total: number; pages: number }>
  > {
    return this.api.get<any>('/qc-machines', params);
  }

  /**
   * Get QC entry by ID
   */
  getQCEntryById(id: string): Observable<ApiResponse<QCEntry>> {
    return this.api.get<QCEntry>(`/qc-machines/${id}`);
  }

  /**
   * Update QC entry
   */
  updateQCEntry(
    id: string,
    entry: Partial<QCEntry>
  ): Observable<ApiResponse<QCEntry>> {
    return this.api.put<QCEntry>(`/qc-machines/${id}`, entry);
  }

  /**
   * Update QC entry with FormData (for file uploads)
   */
  updateQCEntryWithFormData(
    id: string,
    formData: FormData
  ): Observable<ApiResponse<QCEntry>> {
    return this.api.put<QCEntry>(`/qc-machines/${id}`, formData);
  }

  /**
   * Delete QC entry
   */
  deleteQCEntry(id: string): Observable<ApiResponse<void>> {
    return this.api.delete<void>(`/qc-machines/${id}`);
  }

  /**
   * Get QC statistics
   */
  getQCStatistics(): Observable<ApiResponse<any>> {
    return this.api.get<any>('/qc-machines/statistics');
  }

  /**
   * Create QC approval request
   */
  createQCApproval(
    approval: Partial<QCApproval>
  ): Observable<ApiResponse<QCApproval>> {
    return this.api.post<QCApproval>('/qc-approvals', approval);
  }

  /**
   * Get all QC approvals with pagination and filters
   */
  getQCApprovals(
    params?: any
  ): Observable<
    ApiResponse<{ approvals: QCApproval[]; total: number; pages: number }>
  > {
    return this.api.get<any>('/qc-approvals', params);
  }

  /**
   * Get QC approval by ID
   */
  getQCApprovalById(id: string): Observable<ApiResponse<QCApproval>> {
    return this.api.get<QCApproval>(`/qc-approvals/${id}`);
  }

  /**
   * Update QC approval
   */
  updateQCApproval(
    id: string,
    approval: Partial<QCApproval>
  ): Observable<ApiResponse<QCApproval>> {
    return this.api.put<QCApproval>(`/qc-approvals/${id}`, approval);
  }

  /**
   * Delete QC approval
   */
  deleteQCApproval(id: string): Observable<ApiResponse<void>> {
    return this.api.delete<void>(`/qc-approvals/${id}`);
  }

  /**
   * Process QC approval action (approve/reject)
   */
  processQCApprovalAction(
    approvalId: string,
    action: 'approve' | 'reject',
    notes: string
  ): Observable<ApiResponse<QCApproval>> {
    return this.api.post<QCApproval>('/qc-approvals/action', {
      approvalId,
      action,
      notes,
    });
  }

  /**
   * Activate machine after approval
   */
  activateMachine(
    approvalId: string
  ): Observable<ApiResponse<{ activated: boolean }>> {
    return this.api.post<{ activated: boolean }>(
      `/qc-approvals/${approvalId}/activate`,
      {}
    );
  }

  /**
   * Get QC approval statistics
   */
  getQCApprovalStatistics(requestedBy?: string): Observable<ApiResponse<any>> {
    const params: any = {};
    if (requestedBy) {
      params.requestedBy = requestedBy;
    }
    return this.api.get<any>('/qc-approvals/statistics', params);
  }

  /**
   * Get QC approvals by machine ID
   */
  getQCApprovalsByMachine(
    machineId: string,
    params?: any
  ): Observable<
    ApiResponse<{ approvals: QCApproval[]; total: number; pages: number }>
  > {
    return this.api.get<any>(`/qc-approvals/machine/${machineId}`, params);
  }

  /**
   * Get QC approvals by user ID
   */
  getQCApprovalsByUser(
    userId: string,
    params?: any
  ): Observable<
    ApiResponse<{ approvals: QCApproval[]; total: number; pages: number }>
  > {
    return this.api.get<any>(`/qc-approvals/user/${userId}`, params);
  }

  /**
   * Get search suggestions for autocomplete
   */
  getSearchSuggestions(
    field: 'requestedBy' | 'partyName' | 'location',
    query?: string
  ): Observable<ApiResponse<{ suggestions: string[] }>> {
    const params: any = { field };
    if (query) {
      params.query = query;
    }
    return this.api.get<{ suggestions: string[] }>(
      '/qc-approvals/suggestions/search',
      params
    );
  }

  /**
   * Get approvals assigned to the current user ("my approvals")
   */
  listMyAssignedApprovals(
    params?: any
  ): Observable<
    ApiResponse<{ approvals: QCApproval[]; total: number; pages: number }>
  > {
    return this.api.get<any>('/qc-approvals/assigned/my', params);
  }

  /**
   * Get approvals assigned to a specific user
   */
  listUserAssignedApprovals(
    approverId: string,
    params?: any
  ): Observable<
    ApiResponse<{ approvals: QCApproval[]; total: number; pages: number }>
  > {
    return this.api.get<any>(
      `/qc-approvals/assigned/user/${approverId}`,
      params
    );
  }

  /**
   * Upload approval documents (multipart)
   */
  uploadApprovalDocuments(
    approvalId: string,
    formData: FormData
  ): Observable<ApiResponse<any>> {
    // Using HttpClient directly through BaseApiService.post; BaseApiService doesn't support multipart flag,
    // but HttpClient will infer Content-Type for FormData automatically (no need to set it).
    return this.api.post<any>(
      `/qc-approvals/${approvalId}/documents`,
      formData
    );
  }

  /**
   * Delete a specific approval document
   */
  deleteApprovalDocument(
    approvalId: string,
    documentId: string
  ): Observable<ApiResponse<any>> {
    return this.api.delete<any>(
      `/qc-approvals/${approvalId}/documents/${documentId}`
    );
  }
}
