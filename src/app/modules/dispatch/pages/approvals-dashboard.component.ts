import { Component, OnInit, OnDestroy } from '@angular/core';
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
import { CategoryService } from '../../../core/services/category.service';
import { PageHeaderComponent } from '../../../core/components/page-header/page-header.component';
import { ListFiltersComponent } from '../../admin/components/shared/list/list-filters.component';
import { ListTableShellComponent } from '../../admin/components/shared/list/list-table-shell.component';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

interface ApprovalRow {
  _id: string;
  approvalType: string;
  status: string;
  createdAt: string;
  requestedBy?: { username?: string; email?: string };
  machineId?: {
    name?: string;
    machine_sequence?: string;
    dispatch_date?: string | Date;
    category_id?: { _id?: string; name?: string } | string;
    metadata?: Record<string, unknown>;
  };
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
    PageHeaderComponent,
    ListFiltersComponent,
    ListTableShellComponent,
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
      <!-- Header -->
      <app-page-header
        [title]="
          status === 'pending'
            ? 'Pending Approvals'
            : status === 'approved'
              ? 'Approved Approvals'
              : 'Rejected Approvals'
        "
        subtitle="Review and manage approval requests"
        [sidebarCollapsed]="sidebarCollapsed"
        (toggleSidebar)="sidebarCollapsed = !sidebarCollapsed"
      >
        <div headerActions class="flex items-center gap-2">
          <button
            class="p-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-all duration-200"
            (click)="fetchPending()"
            title="Refresh approvals"
          >
            <i class="pi pi-refresh text-lg"></i>
          </button>
          <button
            class="px-4 py-2 bg-primary text-white rounded-md font-medium transition-colors duration-150 hover:bg-primary/90"
            (click)="openCreate()"
            title="Create new approval request"
          >
            <i class="pi pi-plus mr-2"></i>
            Create Request
          </button>
        </div>
      </app-page-header>

      <main class="p-6 space-y-4">
        <p-toast></p-toast>

        <app-list-filters
          searchLabel="Search approvals"
          searchPlaceholder="Machine name, requester, notes, created by..."
          (searchChange)="onSearchChange($event)"
          (apply)="fetchPending()"
          (clear)="clearFilters()"
        >
          <div filters-extra class="flex flex-wrap items-end gap-3">
            <!-- Status Filter -->
            <select
              class="px-3 py-2 border border-neutral-300 rounded-md"
              [(ngModel)]="status"
              (change)="refresh()"
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>

            <!-- Approval Type Filter -->
            <select
              class="px-3 py-2 border border-neutral-300 rounded-md"
              [(ngModel)]="filters.approvalType"
              (change)="onFilterChange()"
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

            <!-- Sequence Search -->
            <input
              type="text"
              class="px-3 py-2 border border-neutral-300 rounded-md min-w-40"
              placeholder="Sequence Number"
              [(ngModel)]="filters.sequence"
              (input)="onSequenceChange()"
            />

            <!-- Category Filter -->
            <select
              class="px-3 py-2 border border-neutral-300 rounded-md min-w-48"
              [(ngModel)]="filters.categoryId"
              (change)="onFilterChange()"
            >
              <option value="">All Categories</option>
              <option *ngFor="let cat of categories" [value]="cat._id">
                {{ cat.name }}
              </option>
            </select>

            <!-- Date From -->
            <input
              type="date"
              class="px-3 py-2 border border-neutral-300 rounded-md"
              placeholder="Date From"
              [(ngModel)]="filters.dateFrom"
              (change)="onFilterChange()"
            />

            <!-- Date To -->
            <input
              type="date"
              class="px-3 py-2 border border-neutral-300 rounded-md"
              placeholder="Date To"
              [(ngModel)]="filters.dateTo"
              (change)="onFilterChange()"
            />

            <!-- Metadata Key -->
            <input
              type="text"
              class="px-3 py-2 border border-neutral-300 rounded-md min-w-40"
              placeholder="Metadata Key"
              [(ngModel)]="filters.metadataKey"
              (input)="onFilterChange()"
            />

            <!-- Metadata Value -->
            <input
              *ngIf="filters.metadataKey"
              type="text"
              class="px-3 py-2 border border-neutral-300 rounded-md min-w-40"
              placeholder="Metadata Value"
              [(ngModel)]="filters.metadataValue"
              (input)="onFilterChange()"
            />

            <!-- Sort By -->
            <select
              class="px-3 py-2 border border-neutral-300 rounded-md"
              [(ngModel)]="filters.sortBy"
              (change)="onFilterChange()"
            >
              <option value="createdAt">Created Date</option>
              <option value="updatedAt">Updated Date</option>
              <option value="status">Status</option>
              <option value="approvalType">Type</option>
            </select>

            <!-- Sort Order -->
            <select
              *ngIf="filters.sortBy"
              class="px-3 py-2 border border-neutral-300 rounded-md"
              [(ngModel)]="filters.sortOrder"
              (change)="onFilterChange()"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
        </app-list-filters>

        <app-list-table-shell
          [title]="
            status === 'pending'
              ? 'Pending Approvals'
              : status === 'approved'
                ? 'Approved Approvals'
                : 'Rejected Approvals'
          "
        >
          <div table-actions class="flex items-center gap-2">
            <button
              class="px-4 py-2 bg-primary text-white rounded-md font-medium transition-colors duration-150 hover:bg-primary/90 cursor-pointer flex items-center gap-2 shadow-sm"
              (click)="openCreate()"
              title="Create new approval request"
            >
              <i class="pi pi-plus text-sm"></i>
              Create Request
            </button>
          </div>

          <div *ngIf="loading" class="p-8 text-center text-gray-500">
            <i class="pi pi-spinner pi-spin text-2xl mb-2"></i>
            <p>Loading approvals...</p>
          </div>

          <div
            *ngIf="!loading && approvals.length === 0"
            class="p-12 text-center"
          >
            <i class="pi pi-inbox text-4xl text-gray-300 mb-2"></i>
            <p class="text-sm font-medium text-gray-500">No approvals found</p>
          </div>

          <table
            *ngIf="!loading && approvals.length > 0"
            class="min-w-full text-sm"
          >
            <thead>
              <tr class="bg-gray-50 text-left border-b border-gray-200">
                <th
                  class="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider"
                >
                  Sequence
                </th>
                <th
                  class="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider"
                >
                  Machine
                </th>
                <th
                  class="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider"
                >
                  Category
                </th>
                <th
                  class="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider"
                >
                  Dispatch Date
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
                *ngFor="let a of approvals"
                class="hover:bg-gray-50 transition-colors duration-150"
              >
                <td class="px-4 py-3 whitespace-nowrap">
                  <span
                    *ngIf="a.machineId?.machine_sequence"
                    class="inline-flex items-center font-mono text-sm font-semibold bg-primary/10 text-primary px-3 py-1.5 rounded-md border border-primary/20"
                  >
                    {{ a.machineId?.machine_sequence }}
                  </span>
                  <span
                    *ngIf="!a.machineId?.machine_sequence"
                    class="text-gray-400 text-sm"
                    >-</span
                  >
                </td>
                <td class="px-4 py-3 whitespace-nowrap">
                  <div class="text-sm font-medium text-gray-900">
                    {{ a.machineId?.name || '-' }}
                  </div>
                </td>
                <td class="px-4 py-3 whitespace-nowrap">
                  <div class="text-sm text-gray-900">
                    {{ getCategoryNameForApproval(a) || '-' }}
                  </div>
                </td>
                <td class="px-4 py-3 whitespace-nowrap">
                  <div class="text-sm text-gray-900">
                    {{
                      a.machineId?.dispatch_date
                        ? (a.machineId?.dispatch_date | date: 'dd-MM-yyyy')
                        : '-'
                    }}
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
                    {{ formatApprovalType(a.approvalType) }}
                  </span>
                </td>
                <td class="px-4 py-3 whitespace-nowrap">
                  <div class="text-sm text-gray-900">
                    {{ a.requestedBy?.username || a.requestedBy?.email || '-' }}
                  </div>
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
                      (click)="view(a._id)"
                      title="View approval details"
                    >
                      <i class="pi pi-eye text-xs mr-1"></i>
                      View
                    </button>
                    <ng-container
                      *ngIf="
                        (a.status || '').toLowerCase() === 'pending';
                        else noPending
                      "
                    >
                      <button
                        class="inline-flex items-center px-3 py-1.5 text-xs font-medium text-success bg-success/10 border border-success/20 rounded-md hover:bg-success/20 hover:border-success/30 transition-all duration-150 cursor-pointer shadow-sm"
                        [disabled]="!canAct(a)"
                        (click)="approve(a._id)"
                        title="Approve request"
                      >
                        <i class="pi pi-check text-xs mr-1"></i>
                        Approve
                      </button>
                      <button
                        class="inline-flex items-center px-3 py-1.5 text-xs font-medium text-error bg-error/10 border border-error/20 rounded-md hover:bg-error/20 hover:border-error/30 transition-all duration-150 cursor-pointer shadow-sm"
                        [disabled]="!canAct(a)"
                        (click)="openReject(a._id)"
                        title="Reject request"
                      >
                        <i class="pi pi-times text-xs mr-1"></i>
                        Reject
                      </button>
                    </ng-container>
                    <ng-template #noPending>
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
              (pageChange)="onPage($event)"
              (limitChange)="onLimit($event)"
            ></app-table-pagination>
          </div>
        </app-list-table-shell>

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
      </main>
    </div>
  `,
})
export class ApprovalsDashboardComponent implements OnInit, OnDestroy {
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
  page = 1;
  limit = 10;
  pages = 1;
  total = 0;
  sidebarCollapsed = false;
  isAdmin = false;
  currentRoleId: string | null = null;

  // Enhanced filters
  filters: {
    approvalType?: 'MACHINE_CREATION' | 'MACHINE_EDIT' | 'MACHINE_DELETION';
    sequence?: string;
    categoryId?: string;
    dateFrom?: string;
    dateTo?: string;
    requestedBy?: string;
    createdBy?: string;
    metadataKey?: string;
    metadataValue?: string;
    sortBy?: 'createdAt' | 'updatedAt' | 'status' | 'approvalType';
    sortOrder?: 'asc' | 'desc';
  } = {
    sortBy: 'createdAt',
    sortOrder: 'desc', // Default: latest first
  };
  metadataKeyError = '';

  // Categories for dropdown
  categories: Array<{ _id: string; name: string }> = [];
  categoriesLoading = false;

  // Search debounce subjects
  private searchInput$ = new Subject<string>();
  private requestedByInput$ = new Subject<string>();
  private createdByInput$ = new Subject<string>();
  private sequenceInput$ = new Subject<string>();
  private subs = new Subscription();

  constructor(
    private approvalsService: ApprovalsService,
    private messageService: MessageService,
    private auth: AuthService,
    private baseApi: BaseApiService,
    private categoryService: CategoryService
  ) {}

  ngOnInit(): void {
    const user = this.auth.getCurrentUser();
    const role = user?.role;
    const roleName = typeof role === 'string' ? role : role?.name;
    this.isAdmin = roleName === 'admin' || roleName === 'manager';
    this.currentRoleId =
      typeof role === 'object' ? (role as any)?._id || null : null;

    // Setup debounced search
    this.subs.add(
      this.searchInput$
        .pipe(debounceTime(500), distinctUntilChanged())
        .subscribe(() => {
          this.page = 1;
          this.fetchPending();
        })
    );

    this.subs.add(
      this.requestedByInput$
        .pipe(debounceTime(500), distinctUntilChanged())
        .subscribe(() => {
          this.page = 1;
          this.fetchPending();
        })
    );

    this.subs.add(
      this.createdByInput$
        .pipe(debounceTime(500), distinctUntilChanged())
        .subscribe(() => {
          this.page = 1;
          this.fetchPending();
        })
    );

    this.subs.add(
      this.sequenceInput$
        .pipe(debounceTime(500), distinctUntilChanged())
        .subscribe(() => {
          this.page = 1;
          this.fetchPending();
        })
    );

    this.loadCategories();
    this.fetchPending();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  loadCategories(): void {
    this.categoriesLoading = true;
    this.categoryService
      .getAllCategories({ includeInactive: false })
      .subscribe({
        next: (response: any) => {
          const data = response?.data || response;
          this.categories = Array.isArray(data) ? data : data?.categories || [];
          this.categoriesLoading = false;
        },
        error: () => {
          this.categoriesLoading = false;
        },
      });
  }

  fetchPending(): void {
    this.loading = true;

    // Build sort string
    const sortBy = this.filters.sortBy || 'createdAt';
    const sortOrder = this.filters.sortOrder || 'desc';
    const sort = sortOrder === 'desc' ? `-${sortBy}` : sortBy;

    // Build enhanced filters
    const enhancedFilters: any = {
      ...this.filters,
    };
    if (this.filters.createdBy) {
      enhancedFilters.createdBy = this.filters.createdBy;
    }

    this.approvalsService
      .getPending(
        this.page,
        this.limit,
        this.search,
        this.status,
        sort,
        enhancedFilters
      )
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

  onSearchChange(value: string): void {
    this.search = value;
    this.searchInput$.next(value);
  }

  onRequestedByChange(): void {
    this.requestedByInput$.next(this.filters.requestedBy || '');
  }

  onCreatedByChange(): void {
    this.createdByInput$.next(this.filters.createdBy || '');
  }

  onSequenceChange(): void {
    this.sequenceInput$.next(this.filters.sequence || '');
  }

  onFilterChange(): void {
    this.page = 1;
    this.fetchPending();
  }

  validateMetadataKey(): void {
    if (!this.filters.metadataKey) {
      this.metadataKeyError = '';
      return;
    }

    // Basic validation: key should be alphanumeric with underscores/hyphens
    const keyPattern = /^[a-zA-Z0-9_-]+$/;
    if (!keyPattern.test(this.filters.metadataKey)) {
      this.metadataKeyError =
        'Metadata key must contain only letters, numbers, underscores, and hyphens';
      return;
    }

    // Check if key exists in any machine metadata (optional - could be expensive)
    // For now, just validate format
    this.metadataKeyError = '';
  }

  clearFilters(): void {
    this.filters = {
      sortBy: 'createdAt',
      sortOrder: 'desc',
    };
    this.search = '';
    this.metadataKeyError = '';
    this.page = 1;
    this.fetchPending();
  }

  getCategoryName(categoryId: string): string {
    if (!categoryId) return '';
    const category = this.categories.find(c => c._id === categoryId);
    return category?.name || categoryId;
  }

  getCategoryNameForApproval(approval: ApprovalRow): string {
    if (!approval.machineId?.category_id) return '-';
    const catId = approval.machineId.category_id;
    if (typeof catId === 'string') {
      return this.getCategoryName(catId);
    }
    if (catId && typeof catId === 'object' && 'name' in catId) {
      return catId.name || '-';
    }
    return '-';
  }

  formatApprovalType(type: string): string {
    if (!type) return type;
    return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
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
