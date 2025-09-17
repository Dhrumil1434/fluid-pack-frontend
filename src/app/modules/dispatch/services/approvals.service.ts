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
    sort: string = '-createdAt'
  ): Observable<PendingApprovalsResponse> {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(limit));
    // The backend expects uppercase status for the general listing endpoint.
    const uppercaseStatus = status?.toUpperCase() as
      | 'PENDING'
      | 'APPROVED'
      | 'REJECTED';

    if (status === 'pending') {
      // Use role-scoped pending endpoint for current approver
      return this.api
        .get<PendingApprovalsResponse>(
          API_ENDPOINTS.PENDING_APPROVALS,
          Object.fromEntries(params as any)
        )
        .pipe(
          map((res: any) => (res?.data ?? res) as PendingApprovalsResponse)
        );
    }

    // For non-pending filters, use general endpoint with uppercase status
    if (uppercaseStatus) params.set('status', uppercaseStatus);
    if (search) params.set('search', search);
    if (sort) params.set('sort', sort);

    return this.api
      .get<PendingApprovalsResponse>(
        API_ENDPOINTS.MACHINE_APPROVALS,
        Object.fromEntries(params as any)
      )
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
