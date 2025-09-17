import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApprovalsService } from '../services/approvals.service';
import { RejectReasonModalComponent } from '../components/reject-reason-modal/reject-reason-modal.component';
import { ApprovalViewModalComponent } from '../components/approval-view-modal/approval-view-modal.component';
import { TablePaginationComponent } from '../../admin/components/user-management/table-pagination.component';
import { FormsModule } from '@angular/forms';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { AdminSidebarComponent } from '../../admin/components/shared/admin-sidebar/admin-sidebar.component';
import { TechnicianSidebarComponent } from '../components/shared/technician-sidebar/technician-sidebar.component';
import { AuthService } from '../../../core/services/auth.service';
import { BaseApiService } from '../../../core/services/base-api.service';
import { API_ENDPOINTS } from '../../../core/constants/api.constants';

interface ApprovalRow {
  _id: string;
  approvalType: string;
  status: string;
  createdAt: string;
  requestedBy?: { username?: string; email?: string };
  machineId?: { name?: string };
  approverRoles?: Array<string | { _id?: string; name?: string }>;
}

@Component({
  selector: 'app-approvals-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ToastModule,
    RejectReasonModalComponent,
    TablePaginationComponent,
    AdminSidebarComponent,
    TechnicianSidebarComponent,
    ApprovalViewModalComponent,
  ],
  template: `
    <ng-container>
      <app-admin-sidebar
        *ngIf="isAdmin; else techSidebar"
        [collapsed]="sidebarCollapsed"
        (collapseChange)="sidebarCollapsed = $event"
      ></app-admin-sidebar>
      <ng-template #techSidebar>
        <app-technician-sidebar
          [collapsed]="sidebarCollapsed"
          (collapseChange)="sidebarCollapsed = $event"
        ></app-technician-sidebar>
      </ng-template>
    </ng-container>

    <div
      class="transition-all duration-300"
      [class.ml-16]="sidebarCollapsed"
      [class.ml-64]="!sidebarCollapsed"
    >
      <div class="p-6 space-y-6">
        <p-toast></p-toast>
        <header
          class="bg-bg border border-neutral-300 rounded-xl shadow-medium p-4 flex items-center justify-between"
        >
          <h2 class="text-xl font-semibold">Dispatch Approvals</h2>
          <button
            class="p-2.5 rounded hover:bg-neutral-100"
            (click)="fetchPending()"
          >
            <i class="pi pi-refresh"></i>
          </button>
        </header>

        <section
          class="bg-bg border border-neutral-300 rounded-xl shadow-medium"
        >
          <div class="px-4 py-3 border-b border-neutral-200">
            <div class="flex items-center justify-between gap-3 flex-wrap">
              <h3 class="font-medium">Pending Approvals</h3>
              <div class="flex items-center gap-2 text-sm">
                <input
                  class="border rounded px-2 py-1"
                  placeholder="Search subject/requester"
                  [(ngModel)]="search"
                  (ngModelChange)="onSearch()"
                />
                <select
                  class="border rounded px-2 py-1"
                  [(ngModel)]="status"
                  (change)="refresh()"
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
                <select
                  class="border rounded px-2 py-1"
                  [(ngModel)]="sort"
                  (change)="refresh()"
                >
                  <option value="-createdAt">Newest</option>
                  <option value="createdAt">Oldest</option>
                </select>
                <button
                  class="px-2 py-1 rounded border hover:bg-neutral-100"
                  (click)="openCreate()"
                >
                  Create Request
                </button>
              </div>
            </div>
          </div>
          <div class="p-4">
            <div *ngIf="loading" class="text-text-muted">Loading...</div>
            <div
              *ngIf="!loading && (approvals?.length || 0) === 0"
              class="text-text-muted"
            >
              No pending approvals.
            </div>
            <div
              *ngIf="!loading && (approvals?.length || 0) > 0"
              class="overflow-x-auto"
            >
              <table class="min-w-full text-sm">
                <thead>
                  <tr class="text-left">
                    <th class="px-3 py-2">Machine</th>
                    <th class="px-3 py-2">Type</th>
                    <th class="px-3 py-2">Requested By</th>
                    <th class="px-3 py-2">Created</th>
                    <th class="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    *ngFor="let a of approvals || []"
                    class="border-t border-neutral-200"
                  >
                    <td class="px-3 py-2">{{ a.machineId?.name || '-' }}</td>
                    <td class="px-3 py-2">{{ a.approvalType }}</td>
                    <td class="px-3 py-2">
                      {{
                        a.requestedBy?.username || a.requestedBy?.email || '-'
                      }}
                    </td>
                    <td class="px-3 py-2">
                      {{ a.createdAt | date: 'medium' }}
                    </td>
                    <td class="px-3 py-2">
                      <ng-container
                        *ngIf="
                          (a.status || '').toLowerCase() === 'pending';
                          else noPending
                        "
                      >
                        <button
                          class="px-2 py-1 text-sm rounded border hover:bg-neutral-100 mr-2"
                          [disabled]="!canAct(a)"
                          (click)="approve(a._id)"
                        >
                          Approve
                        </button>
                        <button
                          class="px-2 py-1 text-sm rounded border hover:bg-neutral-100 text-error mr-2"
                          [disabled]="!canAct(a)"
                          (click)="openReject(a._id)"
                        >
                          Reject
                        </button>
                        <button
                          class="px-2 py-1 text-sm rounded border hover:bg-neutral-100 mr-2"
                          (click)="view(a._id)"
                        >
                          View
                        </button>
                        <button
                          class="px-2 py-1 text-sm rounded border hover:bg-neutral-100"
                          (click)="cancel(a._id)"
                        >
                          Cancel
                        </button>
                      </ng-container>
                      <ng-template #noPending>
                        <button
                          class="px-2 py-1 text-sm rounded border hover:bg-neutral-100 mr-2"
                          (click)="view(a._id)"
                        >
                          View
                        </button>
                        <span class="text-xs text-text-muted">No actions</span>
                      </ng-template>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <app-table-pagination
              [page]="page"
              [pages]="pages"
              [total]="total"
              [limit]="limit"
              (pageChange)="onPage($event)"
              (limitChange)="onLimit($event)"
            ></app-table-pagination>
          </div>
        </section>

        <app-reject-reason-modal
          [visible]="rejectVisible"
          [proposedChanges]="selectedProposedChanges"
          (cancel)="rejectVisible = false"
          (submitReject)="confirmReject($event)"
        ></app-reject-reason-modal>

        <app-approval-view-modal
          [visible]="viewVisible"
          [approval]="selectedApproval"
          [machine]="selectedMachine"
          (close)="viewVisible = false"
        ></app-approval-view-modal>
      </div>
    </div>
  `,
})
export class ApprovalsDashboardComponent implements OnInit {
  approvals: ApprovalRow[] = [];
  loading = false;
  rejectVisible = false;
  rejectId: string | null = null;
  selectedProposedChanges: Record<string, unknown> | null = null;
  viewVisible = false;
  selectedApproval: any = null;
  selectedMachine: any = null;
  search = '';
  status: 'pending' | 'approved' | 'rejected' = 'pending';
  sort: 'createdAt' | '-createdAt' = '-createdAt';
  page = 1;
  limit = 10;
  pages = 1;
  total = 0;
  sidebarCollapsed = false;
  isAdmin = false;
  currentRoleId: string | null = null;

  constructor(
    private approvalsService: ApprovalsService,
    private messageService: MessageService,
    private auth: AuthService,
    private baseApi: BaseApiService
  ) {}

  ngOnInit(): void {
    const user = this.auth.getCurrentUser();
    const role = user?.role;
    const roleName = typeof role === 'string' ? role : role?.name;
    this.isAdmin = roleName === 'admin' || roleName === 'manager';
    this.currentRoleId =
      typeof role === 'object' ? (role as any)?._id || null : null;
    this.fetchPending();
  }

  fetchPending(): void {
    this.loading = true;
    this.approvalsService
      .getPending(this.page, this.limit, this.search, this.status, this.sort)
      .subscribe({
        next: data => {
          const d: any = data as any;
          this.approvals = Array.isArray(d?.approvals) ? d.approvals : [];
          this.total = Number(d?.total) || this.approvals.length || 0;
          this.pages =
            Number(d?.pages) || Math.ceil(this.total / this.limit) || 1;
          this.loading = false;
        },
        error: () => (this.loading = false),
      });
  }

  approve(id: string): void {
    this.approvalsService.processApproval(id, { approved: true }).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Approved',
          detail: 'Approval processed successfully.',
        });
        this.fetchPending();
      },
      error: err => {
        const detail = err?.error?.message || 'Failed to approve.';
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail,
        });
      },
    });
  }

  openReject(id: string): void {
    this.rejectId = id;
    this.selectedProposedChanges = null;
    this.approvalsService.getById(id).subscribe({
      next: (a: any) => {
        this.selectedProposedChanges = (a?.proposedChanges as any) ?? null;
        this.rejectVisible = true;
      },
      error: () => {
        this.rejectVisible = true; // still allow entering reason
      },
    });
  }

  confirmReject(data: {
    reason: string;
    approverNotes?: string;
    suggestedChanges: Record<string, unknown> | null;
  }): void {
    if (!this.rejectId) return;
    const id = this.rejectId;
    this.rejectVisible = false;
    this.rejectId = null;
    this.approvalsService
      .processApproval(id, {
        approved: false,
        rejectionReason: data.reason,
        approverNotes: data.approverNotes,
        suggestedChanges: data.suggestedChanges ?? undefined,
      })
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Rejected',
            detail: 'Rejection recorded.',
          });
          this.fetchPending();
        },
        error: err => {
          const detail = err?.error?.message || 'Failed to reject.';
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail,
          });
        },
      });
  }

  cancel(id: string): void {
    this.approvalsService.cancel(id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Cancelled',
          detail: 'Approval request cancelled.',
        });
        this.fetchPending();
      },
      error: err => {
        const detail = err?.error?.message || 'Failed to cancel.';
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail,
        });
      },
    });
  }

  view(id: string): void {
    this.selectedApproval = null;
    this.selectedMachine = null;
    this.approvalsService.getById(id).subscribe({
      next: (a: any) => {
        this.selectedApproval = a;
        const mid =
          typeof a?.machineId === 'string' ? a?.machineId : a?.machineId?._id;
        if (mid) {
          // Fetch machine for images and details using BaseApiService to ensure auth headers/base url
          this.baseApi.get<any>(`${API_ENDPOINTS.MACHINES}/${mid}`).subscribe({
            next: mres => {
              const data = (mres as any)?.data || mres;
              const machine = data?.machine || data;
              const imgs: any = machine?.images;
              machine.images = Array.isArray(imgs) ? imgs : imgs ? [imgs] : [];
              this.selectedMachine = machine;
              this.viewVisible = true;
            },
            error: () => {
              this.viewVisible = true;
            },
          });
        } else {
          this.viewVisible = true;
        }
      },
      error: () => {
        this.viewVisible = true;
      },
    });
  }

  openCreate(): void {
    // Navigate or open a modal in future; placeholder for now
    this.messageService.add({
      severity: 'info',
      summary: 'Coming soon',
      detail: 'Create request UI will be added.',
    });
  }

  onPage(p: number): void {
    this.page = p;
    this.fetchPending();
  }

  onLimit(l: number): void {
    this.limit = l;
    this.page = 1;
    this.fetchPending();
  }

  onSearch(): void {
    this.page = 1;
    this.fetchPending();
  }

  refresh(): void {
    this.page = 1;
    this.fetchPending();
  }

  canAct(a: ApprovalRow): boolean {
    const roles = a?.approverRoles || [];
    const rid = this.currentRoleId;
    if (!rid) return true; // fallback; backend already scopes by role
    return roles.some(r =>
      typeof r === 'string' ? r === rid : (r as any)?._id === rid
    );
  }

  private buildMachineUrl(id: string): string {
    return `/api${API_ENDPOINTS.MACHINES}/${id}`;
  }
}
