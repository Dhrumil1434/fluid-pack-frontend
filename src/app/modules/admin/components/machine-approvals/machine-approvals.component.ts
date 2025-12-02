import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { AdminSidebarComponent } from '../shared/admin-sidebar/admin-sidebar.component';
import { TablePaginationComponent } from '../user-management/table-pagination.component';
import { RejectReasonModalComponent } from '../../../dispatch/components/reject-reason-modal/reject-reason-modal.component';
import { ApprovalViewModalComponent } from '../../../dispatch/components/approval-view-modal/approval-view-modal.component';
import { ApprovalsService } from '../../../dispatch/services/approvals.service';
import { EditApprovalModalComponent } from './edit-approval-modal.component';
import { PageHeaderComponent } from '../../../../core/components/page-header/page-header.component';
import { ListFiltersComponent } from '../shared/list/list-filters.component';
import { ListTableShellComponent } from '../shared/list/list-table-shell.component';

interface ApprovalRow {
  _id: string;
  approvalType: string;
  status: string;
  createdAt: string;
  requestedBy?: { username?: string; email?: string } | string;
  machineId?:
    | { name?: string; _id?: string; machine_sequence?: string }
    | string;
}

@Component({
  selector: 'app-admin-machine-approvals',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ToastModule,
    AdminSidebarComponent,
    TablePaginationComponent,
    RejectReasonModalComponent,
    ApprovalViewModalComponent,
    EditApprovalModalComponent,
    PageHeaderComponent,
    ListFiltersComponent,
    ListTableShellComponent,
  ],
  template: `
    <div
      class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100"
    >
      <app-admin-sidebar
        [collapsed]="sidebarCollapsed"
        (collapseChange)="onSidebarCollapseChange($event)"
      ></app-admin-sidebar>

      <div
        class="transition-all duration-300"
        [class.ml-16]="sidebarCollapsed"
        [class.ml-64]="!sidebarCollapsed"
      >
        <!-- Header -->
        <app-page-header
          title="Machine Approvals"
          [sidebarCollapsed]="sidebarCollapsed"
          (toggleSidebar)="toggleSidebar()"
          [breadcrumbs]="[
            { label: 'Dashboard', route: '/admin/dashboard' },
            { label: 'Machine Approvals' },
          ]"
        >
        </app-page-header>

        <main class="p-6 space-y-4">
          <p-toast></p-toast>

          <app-list-filters
            searchLabel="Search approvals"
            searchPlaceholder="Machine name, requester, notes, created by..."
            (searchChange)="onSearchChange($event)"
            (apply)="reload()"
            (clear)="clearFilters()"
          >
            <div filters-extra class="flex flex-wrap items-end gap-3">
              <!-- Status Filter -->
              <select
                class="px-3 py-2 border border-neutral-300 rounded-md"
                [(ngModel)]="filters.status"
                (change)="reload()"
              >
                <option [ngValue]="undefined">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>

              <!-- Approval Type Filter -->
              <select
                class="px-3 py-2 border border-neutral-300 rounded-md"
                [(ngModel)]="filters.approvalType"
                (change)="reload()"
              >
                <option [ngValue]="undefined">All Types</option>
                <option value="MACHINE_CREATION">Creation</option>
                <option value="MACHINE_EDIT">Edit</option>
                <option value="MACHINE_DELETION">Deletion</option>
              </select>

              <!-- Requested By Filter -->
              <input
                type="text"
                class="px-3 py-2 border border-neutral-300 rounded-md min-w-48"
                placeholder="Requested By (username/email)"
                [(ngModel)]="filters.requestedBy"
                (input)="onRequestedByChange()"
              />

              <!-- Created By Filter -->
              <input
                type="text"
                class="px-3 py-2 border border-neutral-300 rounded-md min-w-48"
                placeholder="Created By (username/email)"
                [(ngModel)]="filters.createdBy"
                (input)="onCreatedByChange()"
              />

              <!-- Machine Name Filter -->
              <input
                type="text"
                class="px-3 py-2 border border-neutral-300 rounded-md min-w-48"
                placeholder="Machine Name"
                [(ngModel)]="filters.machineName"
                (input)="onMachineNameChange()"
              />

              <!-- Date From -->
              <input
                type="date"
                class="px-3 py-2 border border-neutral-300 rounded-md"
                placeholder="Date From"
                [(ngModel)]="filters.dateFrom"
                (change)="reload()"
              />

              <!-- Date To -->
              <input
                type="date"
                class="px-3 py-2 border border-neutral-300 rounded-md"
                placeholder="Date To"
                [(ngModel)]="filters.dateTo"
                (change)="reload()"
              />

              <!-- Sort By -->
              <select
                class="px-3 py-2 border border-neutral-300 rounded-md"
                [(ngModel)]="filters.sortBy"
                (change)="reload()"
              >
                <option value="createdAt">Created Date</option>
                <option value="status">Status</option>
                <option value="approvalType">Type</option>
              </select>

              <!-- Sort Order -->
              <select
                *ngIf="filters.sortBy"
                class="px-3 py-2 border border-neutral-300 rounded-md"
                [(ngModel)]="filters.sortOrder"
                (change)="reload()"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
          </app-list-filters>

          <app-list-table-shell title="Approval Requests">
            <div *ngIf="loading" class="p-8 text-center text-gray-500">
              <i class="pi pi-spinner pi-spin text-2xl mb-2"></i>
              <p>Loading approvals...</p>
            </div>

            <div *ngIf="!loading && rows.length === 0" class="p-12 text-center">
              <i class="pi pi-inbox text-4xl text-gray-300 mb-2"></i>
              <p class="text-sm font-medium text-gray-500">
                No approvals found
              </p>
            </div>

            <table
              *ngIf="!loading && rows.length > 0"
              class="min-w-full text-sm"
            >
              <thead>
                <tr class="bg-gray-50 text-left border-b border-gray-200">
                  <th
                    class="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider"
                  >
                    Machine
                  </th>
                  <th
                    class="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider"
                  >
                    Type
                  </th>
                  <th
                    class="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider"
                  >
                    Requested By
                  </th>
                  <th
                    class="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider"
                  >
                    Status
                  </th>
                  <th
                    class="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider"
                  >
                    Created
                  </th>
                  <th
                    class="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider w-40"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr
                  *ngFor="let a of rows"
                  class="hover:bg-gray-50 transition-colors duration-150"
                >
                  <td class="px-4 py-3 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">
                      {{ machineName(a) }}
                    </div>
                    <div
                      *ngIf="getMachineSequence(a)"
                      class="text-xs text-gray-500 font-mono mt-1"
                    >
                      Sequence: {{ getMachineSequence(a) }}
                    </div>
                    <div
                      *ngIf="!getMachineSequence(a)"
                      class="text-xs text-gray-400 italic mt-1"
                    >
                      No sequence
                    </div>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap">
                    <span
                      class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                      [ngClass]="{
                        'bg-blue-100 text-blue-800':
                          a.approvalType === 'MACHINE_CREATION',
                        'bg-purple-100 text-purple-800':
                          a.approvalType === 'MACHINE_EDIT',
                        'bg-red-100 text-red-800':
                          a.approvalType === 'MACHINE_DELETION',
                      }"
                    >
                      {{ getApprovalTypeLabel(a.approvalType) }}
                    </span>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap">
                    <div class="text-sm text-gray-900">
                      {{ requesterName(a) }}
                    </div>
                    <div
                      *ngIf="getRequesterEmail(a)"
                      class="text-xs text-gray-500"
                    >
                      {{ getRequesterEmail(a) }}
                    </div>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap">
                    <span
                      class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                      [ngClass]="{
                        'bg-warning/20 text-warning': a.status === 'PENDING',
                        'bg-success/20 text-success': a.status === 'APPROVED',
                        'bg-error/20 text-error': a.status === 'REJECTED',
                      }"
                    >
                      {{ a.status }}
                    </span>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap">
                    <div class="text-sm text-gray-900">
                      {{ a.createdAt | date: 'dd-MM-yyyy' }}
                    </div>
                    <div class="text-xs text-gray-500">
                      {{ a.createdAt | date: 'HH:mm' }}
                    </div>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap">
                    <div class="flex items-center gap-2">
                      <button
                        class="inline-flex items-center px-3 py-1.5 text-xs font-medium text-info bg-info/10 border border-info/20 rounded-md hover:bg-info/20 hover:border-info/30 transition-all duration-150 cursor-pointer shadow-sm"
                        (click)="view(a)"
                        title="View approval details"
                      >
                        <i class="pi pi-eye text-xs mr-1"></i>
                        View
                      </button>
                      <ng-container
                        *ngIf="a.status === 'PENDING'; else noActions"
                      >
                        <button
                          class="inline-flex items-center px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 border border-primary/20 rounded-md hover:bg-primary/20 hover:border-primary/30 transition-all duration-150 cursor-pointer shadow-sm"
                          (click)="openEdit(a)"
                          title="Edit approval"
                        >
                          <i class="pi pi-pencil text-xs mr-1"></i>
                          Edit
                        </button>
                        <button
                          class="inline-flex items-center px-3 py-1.5 text-xs font-medium text-success bg-success/10 border border-success/20 rounded-md hover:bg-success/20 hover:border-success/30 transition-all duration-150 cursor-pointer shadow-sm"
                          (click)="approve(a)"
                          title="Approve request"
                        >
                          <i class="pi pi-check text-xs mr-1"></i>
                          Approve
                        </button>
                        <button
                          class="inline-flex items-center px-3 py-1.5 text-xs font-medium text-error bg-error/10 border border-error/20 rounded-md hover:bg-error/20 hover:border-error/30 transition-all duration-150 cursor-pointer shadow-sm"
                          (click)="openReject(a)"
                          title="Reject request"
                        >
                          <i class="pi pi-times text-xs mr-1"></i>
                          Reject
                        </button>
                      </ng-container>
                      <ng-template #noActions>
                        <span class="text-xs text-gray-400">No actions</span>
                      </ng-template>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            <div table-footer class="w-full">
              <app-table-pagination
                [page]="page"
                [pages]="pages"
                [total]="total"
                [limit]="limit"
                (pageChange)="onPageChange($event)"
                (limitChange)="onLimitChange($event)"
              ></app-table-pagination>
            </div>
          </app-list-table-shell>

          <app-reject-reason-modal
            [visible]="rejectVisible"
            [proposedChanges]="selectedProposedChanges"
            (cancel)="rejectVisible = false"
            (submitReject)="confirmReject($event)"
          >
          </app-reject-reason-modal>

          <app-approval-view-modal
            [visible]="viewVisible"
            [approval]="selectedApproval"
            [machine]="selectedMachine"
            (close)="viewVisible = false"
          >
          </app-approval-view-modal>

          <app-edit-approval-modal
            [visible]="editVisible"
            [roleOptions]="editRoleOptions"
            [value]="editInitialValue()"
            (cancel)="editVisible = false"
            (submitEdit)="onSubmitEdit($event)"
          ></app-edit-approval-modal>
        </main>
      </div>
    </div>
  `,
})
export class AdminMachineApprovalsComponent implements OnInit, OnDestroy {
  sidebarCollapsed = false;
  loading = false;
  rows: ApprovalRow[] = [];
  page = 1;
  pages = 1;
  total = 0;
  limit = 10;

  filters: {
    search?: string;
    status?: 'PENDING' | 'APPROVED' | 'REJECTED';
    approvalType?: 'MACHINE_CREATION' | 'MACHINE_EDIT' | 'MACHINE_DELETION';
    requestedBy?: string;
    createdBy?: string;
    machineName?: string;
    dateFrom?: string;
    dateTo?: string;
    sortBy?: 'createdAt' | 'status' | 'approvalType';
    sortOrder?: 'asc' | 'desc';
  } = {
    sortBy: 'createdAt',
    sortOrder: 'desc', // Default: latest first
  };

  // modals
  rejectVisible = false;
  viewVisible = false;
  selectedApproval: any = null;
  selectedMachine: any = null;
  selectedProposedChanges: Record<string, unknown> | null = null;
  editVisible = false;
  editRoleOptions: Array<{ _id: string; name: string }> = [];

  // Search debounce
  private searchInput$ = new Subject<string>();
  private requestedByInput$ = new Subject<string>();
  private createdByInput$ = new Subject<string>();
  private machineNameInput$ = new Subject<string>();
  private subs = new Subscription();

  constructor(
    private approvals: ApprovalsService,
    private message: MessageService
  ) {}

  ngOnInit(): void {
    // Setup debounced search
    this.subs.add(
      this.searchInput$
        .pipe(debounceTime(500), distinctUntilChanged())
        .subscribe(() => {
          this.page = 1;
          this.reload();
        })
    );

    this.subs.add(
      this.requestedByInput$
        .pipe(debounceTime(500), distinctUntilChanged())
        .subscribe(() => {
          this.page = 1;
          this.reload();
        })
    );

    this.subs.add(
      this.machineNameInput$
        .pipe(debounceTime(500), distinctUntilChanged())
        .subscribe(() => {
          this.page = 1;
          this.reload();
        })
    );

    this.subs.add(
      this.createdByInput$
        .pipe(debounceTime(500), distinctUntilChanged())
        .subscribe(() => {
          this.page = 1;
          this.reload();
        })
    );

    this.reload();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  onSearchChange(value: string): void {
    this.filters.search = value;
    this.searchInput$.next(value);
  }

  onRequestedByChange(): void {
    this.requestedByInput$.next(this.filters.requestedBy || '');
  }

  onMachineNameChange(): void {
    this.machineNameInput$.next(this.filters.machineName || '');
  }

  onCreatedByChange(): void {
    this.createdByInput$.next(this.filters.createdBy || '');
  }

  clearFilters(): void {
    this.filters = {
      sortBy: 'createdAt',
      sortOrder: 'desc',
    };
    this.page = 1;
    this.reload();
  }

  reload(): void {
    this.loading = true;
    const status = this.filters.status
      ? (this.filters.status.toLowerCase() as
          | 'pending'
          | 'approved'
          | 'rejected')
      : undefined;

    // Build sort string
    const sortBy = this.filters.sortBy || 'createdAt';
    const sortOrder = this.filters.sortOrder || 'desc';
    const sort = sortOrder === 'desc' ? `-${sortBy}` : sortBy;

    // Build enhanced filters
    const enhancedFilters: any = {};
    if (this.filters.requestedBy) {
      enhancedFilters.requestedBy = this.filters.requestedBy;
    }
    if (this.filters.createdBy) {
      enhancedFilters.createdBy = this.filters.createdBy;
    }
    if (this.filters.machineName) {
      enhancedFilters.machineName = this.filters.machineName;
    }
    if (this.filters.dateFrom) {
      enhancedFilters.dateFrom = this.filters.dateFrom;
    }
    if (this.filters.dateTo) {
      enhancedFilters.dateTo = this.filters.dateTo;
    }

    this.approvals
      .getPending(
        this.page,
        this.limit,
        this.filters.search,
        status || 'pending',
        sort,
        enhancedFilters
      )
      .subscribe({
        next: res => {
          const d: any = res as any;
          this.rows = Array.isArray(d?.approvals) ? d.approvals : [];
          this.total = Number(d?.total) || this.rows.length || 0;
          this.pages =
            Number(d?.pages) || Math.ceil(this.total / this.limit) || 1;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        },
      });
  }

  onPageChange(p: number): void {
    this.page = p;
    this.reload();
  }

  onLimitChange(l: number): void {
    this.limit = l;
    this.page = 1;
    this.reload();
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  onSidebarCollapseChange(collapsed: boolean): void {
    this.sidebarCollapsed = collapsed;
  }

  approve(a: ApprovalRow): void {
    this.approvals.processApproval(a._id, { approved: true }).subscribe({
      next: () => {
        this.message.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Approval request approved successfully',
        });
        this.reload();
      },
      error: err => {
        this.message.add({
          severity: 'error',
          summary: 'Error',
          detail: err?.error?.message || 'Failed to approve request',
        });
      },
    });
  }

  openReject(a: ApprovalRow): void {
    this.selectedApproval = a;
    this.selectedProposedChanges = null;
    this.approvals.getById(a._id).subscribe({
      next: (full: any) => {
        this.selectedProposedChanges = full?.proposedChanges ?? null;
        this.rejectVisible = true;
      },
      error: () => {
        this.rejectVisible = true;
      },
    });
  }

  confirmReject(data: {
    reason: string;
    approverNotes?: string;
    suggestedChanges: Record<string, unknown> | null;
  }): void {
    const id = this.selectedApproval?._id;
    if (!id) return;
    this.rejectVisible = false;
    this.approvals
      .processApproval(id, {
        approved: false,
        rejectionReason: data.reason,
        approverNotes: data.approverNotes,
        suggestedChanges: data.suggestedChanges ?? undefined,
      })
      .subscribe({
        next: () => {
          this.message.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Approval request rejected successfully',
          });
          this.reload();
        },
        error: err => {
          this.message.add({
            severity: 'error',
            summary: 'Error',
            detail: err?.error?.message || 'Failed to reject request',
          });
        },
      });
  }

  view(a: ApprovalRow): void {
    this.selectedApproval = null;
    this.selectedMachine = null;
    this.approvals.getById(a._id).subscribe({
      next: (full: any) => {
        this.selectedApproval = full;
        const mid =
          typeof full?.machineId === 'string'
            ? full?.machineId
            : full?.machineId?._id;
        if (!mid) {
          this.viewVisible = true;
          return;
        }
        // fetch via same base API used globally
        (this.approvals as any).api.get(`/machines/${mid}`).subscribe({
          next: (mres: any) => {
            const data = mres?.data || mres;
            this.selectedMachine = data?.machine || data;
            this.viewVisible = true;
          },
          error: () => {
            this.viewVisible = true;
          },
        });
      },
      error: () => {
        this.viewVisible = true;
      },
    });
  }

  machineName(a: ApprovalRow): string {
    const m = a.machineId as any;
    if (!m) return '-';
    if (typeof m === 'string') return m;
    return m?.name || '-';
  }

  getMachineSequence(a: ApprovalRow): string | null {
    const m = a.machineId as any;
    if (!m) return null;
    if (typeof m === 'string') return null;
    // Check both machine_sequence and machineSequence (in case of different naming)
    return m?.machine_sequence || m?.machineSequence || null;
  }

  requesterName(a: ApprovalRow): string {
    const r = a.requestedBy as any;
    if (!r) return '-';
    if (typeof r === 'string') return r;
    return r?.username || '-';
  }

  getRequesterEmail(a: ApprovalRow): string | null {
    const r = a.requestedBy as any;
    if (!r || typeof r === 'string') return null;
    return r?.email || null;
  }

  getApprovalTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      MACHINE_CREATION: 'Creation',
      MACHINE_EDIT: 'Edit',
      MACHINE_DELETION: 'Deletion',
    };
    return labels[type] || type;
  }

  openEdit(a: ApprovalRow): void {
    const loadApproval$ = this.approvals.getById(a._id);
    const loadRoles$ = (this.approvals as any).api.get('/admin/roles');

    let rolesLoaded = false;
    let approvalLoaded = false;
    const tryOpen = () => {
      if (rolesLoaded && approvalLoaded) this.editVisible = true;
    };

    loadApproval$.subscribe({
      next: (full: any) => {
        this.selectedApproval = full;
        approvalLoaded = true;
        tryOpen();
      },
      error: () => {
        this.selectedApproval = a;
        approvalLoaded = true;
        tryOpen();
      },
    });
    loadRoles$.subscribe({
      next: (res: any) => {
        const data = res?.data || res;
        this.editRoleOptions = Array.isArray(data?.roles)
          ? data.roles
          : Array.isArray(data)
            ? data
            : [];
        rolesLoaded = true;
        tryOpen();
      },
      error: () => {
        this.editRoleOptions = [];
        rolesLoaded = true;
        tryOpen();
      },
    });
  }

  onSubmitEdit(payload: {
    approvalType?: any;
    approverRoles?: string[];
    requestNotes?: string;
    proposedChanges?: Record<string, unknown>;
  }): void {
    const id = this.selectedApproval?._id;
    if (!id) return;
    this.editVisible = false;
    this.approvals.updateApproval(id, payload).subscribe({
      next: () => {
        this.message.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Approval request updated successfully',
        });
        this.reload();
        this.approvals.getById(id).subscribe({
          next: (full: any) => (this.selectedApproval = full),
          error: () => {},
        });
      },
      error: err => {
        this.message.add({
          severity: 'error',
          summary: 'Error',
          detail: err?.error?.message || 'Failed to update approval',
        });
      },
    });
  }

  editInitialValue(): {
    approvalType?: any;
    approverRoles?: string[];
    requestNotes?: string;
    proposedChanges?: Record<string, unknown> | null;
  } {
    const a: any = this.selectedApproval || {};
    const roles = Array.isArray(a?.approverRoles)
      ? a.approverRoles
          .map((r: any) => (typeof r === 'string' ? r : r?._id))
          .filter(Boolean)
      : [];
    return {
      approvalType: a?.approvalType,
      approverRoles: roles,
      requestNotes: a?.requestNotes,
      proposedChanges: a?.proposedChanges ?? {},
    } as any;
  }
}
