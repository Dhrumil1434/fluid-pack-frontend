import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApiService } from './base-api.service';
import { 
  MachineApproval, 
  CreateApprovalRequest, 
  ProcessApprovalRequest, 
  ApprovalFilters 
} from '../models/machine-approval.model';
import { ApiResponse } from '../models/api-response.model';

@Injectable({
  providedIn: 'root',
})
export class MachineApprovalService {
  constructor(private baseApiService: BaseApiService) {}

  /**
   * Create approval request
   */
  createApprovalRequest(approvalData: CreateApprovalRequest): Observable<ApiResponse<MachineApproval>> {
    return this.baseApiService.post<MachineApproval>('/machine-approvals', approvalData);
  }

  /**
   * Get user's own approval requests
   */
  getMyApprovalRequests(): Observable<ApiResponse<MachineApproval[]>> {
    return this.baseApiService.get<MachineApproval[]>('/machine-approvals/my-requests');
  }

  /**
   * Get pending approvals (for approvers)
   */
  getPendingApprovals(): Observable<ApiResponse<MachineApproval[]>> {
    return this.baseApiService.get<MachineApproval[]>('/machine-approvals/pending');
  }

  /**
   * Get all approval requests with pagination and filters
   */
  getApprovalRequests(filters?: ApprovalFilters): Observable<ApiResponse<{ approvals: MachineApproval[]; pagination: any }>> {
    return this.baseApiService.get<{ approvals: MachineApproval[]; pagination: any }>(
      '/machine-approvals',
      filters
    );
  }

  /**
   * Get approval request by ID
   */
  getApprovalById(id: string): Observable<ApiResponse<MachineApproval>> {
    return this.baseApiService.get<MachineApproval>(`/machine-approvals/${id}`);
  }

  /**
   * Process approval decision (approve/reject)
   */
  processApprovalDecision(id: string, decisionData: ProcessApprovalRequest): Observable<ApiResponse<MachineApproval>> {
    return this.baseApiService.patch<MachineApproval>(`/machine-approvals/${id}/process`, decisionData);
  }

  /**
   * Cancel approval request (only by requester)
   */
  cancelApprovalRequest(id: string): Observable<ApiResponse<MachineApproval>> {
    return this.baseApiService.patch<MachineApproval>(`/machine-approvals/${id}/cancel`, {});
  }
}
