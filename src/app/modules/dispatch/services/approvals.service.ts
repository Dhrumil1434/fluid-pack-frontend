import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_ENDPOINTS } from '../../../core/constants/api.constants';
import { BaseApiService } from '../../../core/services/base-api.service';

export interface PendingApprovalsResponse {
  approvals: Array<any>;
  total?: number;
  pages?: number;
}

export interface ProcessApprovalPayload {
  approved: boolean;
  approverNotes?: string;
  rejectionReason?: string;
  suggestedChanges?: Record<string, unknown>;
}

@Injectable({ providedIn: 'root' })
export class ApprovalsService {
  constructor(private api: BaseApiService) {}

  getPending(
    page = 1,
    limit = 10,
    search?: string,
    status: 'pending' | 'approved' | 'rejected' = 'pending',
    sort: string = '-createdAt',
    filters?: {
      approvalType?: 'MACHINE_CREATION' | 'MACHINE_EDIT' | 'MACHINE_DELETION';
      sequence?: string;
      categoryId?: string;
      dateFrom?: string;
      dateTo?: string;
      soDateFrom?: string;
      soDateTo?: string;
      poDateFrom?: string;
      poDateTo?: string;
      soNumber?: string;
      poNumber?: string;
      requestedBy?: string;
      createdBy?: string;
      machineName?: string;
      metadataKey?: string;
      metadataValue?: string;
    }
  ): Observable<PendingApprovalsResponse> {
    const params: Record<string, string> = {
      page: String(page),
      limit: String(limit),
    };

    // The backend expects uppercase status for the general listing endpoint.
    const uppercaseStatus = status?.toUpperCase() as
      | 'PENDING'
      | 'APPROVED'
      | 'REJECTED';

    if (status === 'pending') {
      // Use role-scoped pending endpoint for current approver
      if (search) params['search'] = search;
      if (sort) params['sort'] = sort;

      // Add enhanced filters
      if (filters?.approvalType) params['approvalType'] = filters.approvalType;
      if (filters?.sequence) params['sequence'] = filters.sequence;
      if (filters?.categoryId) params['categoryId'] = filters.categoryId;
      if (filters?.dateFrom) params['dateFrom'] = filters.dateFrom;
      if (filters?.dateTo) params['dateTo'] = filters.dateTo;
      if (filters?.soDateFrom) params['soDateFrom'] = filters.soDateFrom;
      if (filters?.soDateTo) params['soDateTo'] = filters.soDateTo;
      if (filters?.poDateFrom) params['poDateFrom'] = filters.poDateFrom;
      if (filters?.poDateTo) params['poDateTo'] = filters.poDateTo;
      if (filters?.soNumber) params['soNumber'] = filters.soNumber;
      if (filters?.poNumber) params['poNumber'] = filters.poNumber;
      if (filters?.requestedBy) params['requestedBy'] = filters.requestedBy;
      if (filters?.createdBy) params['createdBy'] = filters.createdBy;
      if (filters?.machineName) params['machineName'] = filters.machineName;
      if (filters?.metadataKey) params['metadataKey'] = filters.metadataKey;
      if (filters?.metadataValue)
        params['metadataValue'] = filters.metadataValue;

      return this.api
        .get<PendingApprovalsResponse>(API_ENDPOINTS.PENDING_APPROVALS, params)
        .pipe(
          map((res: any) => (res?.data ?? res) as PendingApprovalsResponse)
        );
    }

    // For non-pending filters, use general endpoint with uppercase status
    if (uppercaseStatus) params['status'] = uppercaseStatus;
    if (search) params['search'] = search;
    if (sort) params['sort'] = sort;

    // Add enhanced filters
    if (filters?.approvalType) params['approvalType'] = filters.approvalType;
    if (filters?.sequence) params['sequence'] = filters.sequence;
    if (filters?.categoryId) params['categoryId'] = filters.categoryId;
    if (filters?.dateFrom) params['dateFrom'] = filters.dateFrom;
    if (filters?.dateTo) params['dateTo'] = filters.dateTo;
    if (filters?.soDateFrom) params['soDateFrom'] = filters.soDateFrom;
    if (filters?.soDateTo) params['soDateTo'] = filters.soDateTo;
    if (filters?.poDateFrom) params['poDateFrom'] = filters.poDateFrom;
    if (filters?.poDateTo) params['poDateTo'] = filters.poDateTo;
    if (filters?.soNumber) params['soNumber'] = filters.soNumber;
    if (filters?.poNumber) params['poNumber'] = filters.poNumber;
    if (filters?.requestedBy) params['requestedBy'] = filters.requestedBy;
    if (filters?.createdBy) params['createdBy'] = filters.createdBy;
    if (filters?.machineName) params['machineName'] = filters.machineName;
    if (filters?.metadataKey) params['metadataKey'] = filters.metadataKey;
    if (filters?.metadataValue) params['metadataValue'] = filters.metadataValue;

    return this.api
      .get<PendingApprovalsResponse>(API_ENDPOINTS.MACHINE_APPROVALS, params)
      .pipe(map((res: any) => (res?.data ?? res) as PendingApprovalsResponse));
  }

  getByMachine(
    machineId: string,
    sort: string = '-updatedAt'
  ): Observable<PendingApprovalsResponse> {
    const params = new URLSearchParams();
    params.set('machineId', machineId);
    params.set('limit', '10');
    if (sort) params.set('sort', sort);
    return this.api
      .get<PendingApprovalsResponse>(
        API_ENDPOINTS.MY_APPROVAL_REQUESTS,
        Object.fromEntries(params as any)
      )
      .pipe(map((res: any) => (res?.data ?? res) as PendingApprovalsResponse));
  }

  getMyRequests(
    page = 1,
    limit = 10,
    status?: 'pending' | 'approved' | 'rejected',
    search?: string,
    sort: string = '-createdAt'
  ): Observable<PendingApprovalsResponse> {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(limit));
    if (status) params.set('status', status);
    if (search) params.set('search', search);
    if (sort) params.set('sort', sort);
    return this.api
      .get<PendingApprovalsResponse>(
        API_ENDPOINTS.MY_APPROVAL_REQUESTS,
        Object.fromEntries(params as any)
      )
      .pipe(map((res: any) => (res?.data ?? res) as PendingApprovalsResponse));
  }

  processApproval(
    id: string,
    payload: ProcessApprovalPayload
  ): Observable<any> {
    const url = API_ENDPOINTS.PROCESS_APPROVAL.replace(':id', id);
    return this.api.patch(url, payload);
  }

  getById(id: string): Observable<any> {
    const url = API_ENDPOINTS.MACHINE_APPROVAL_BY_ID.replace(':id', id);
    return this.api.get(url).pipe(map((res: any) => res?.data ?? res));
  }

  cancel(id: string): Observable<any> {
    const url = API_ENDPOINTS.CANCEL_APPROVAL.replace(':id', id);
    return this.api.patch(url, {});
  }

  updateApproval(
    id: string,
    payload: {
      approverRoles?: string[];
      approvalType?: 'MACHINE_CREATION' | 'MACHINE_EDIT' | 'MACHINE_DELETION';
      requestNotes?: string;
      proposedChanges?: Record<string, unknown>;
    }
  ): Observable<any> {
    const url = API_ENDPOINTS.MACHINE_APPROVAL_BY_ID.replace(':id', id);
    return this.api.patch(url, payload);
  }
}
