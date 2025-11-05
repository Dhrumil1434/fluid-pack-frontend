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
import { CategoryService } from '../../../core/services/category.service';
import { PageHeaderComponent } from '../../../core/components/page-header/page-header.component';

interface ApprovalRow {
  _id: string;
  approvalType: string;
  status: string;
  createdAt: string;
  requestedBy?: { username?: string; email?: string };
  machineId?: {
    name?: string;
    machine_sequence?: string;
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

      <div class="p-6 space-y-6">
        <p-toast></p-toast>

        <section
          class="bg-bg border border-neutral-300 rounded-xl shadow-medium"
        >
          <!-- Filters Section -->
          <div class="px-4 py-3 border-b border-neutral-200">
            <div class="flex items-center justify-between gap-3 flex-wrap mb-3">
              <h3 class="font-medium">
                {{
                  status === 'pending'
                    ? 'Pending'
                    : status === 'approved'
                      ? 'Approved'
                      : 'Rejected'
                }}
                Approvals
              </h3>
              <div class="flex items-center gap-2 text-sm">
                <button
                  class="px-3 py-1.5 text-xs rounded border hover:bg-neutral-100 flex items-center gap-1"
                  (click)="filtersExpanded = !filtersExpanded"
                  [class.bg-blue-50]="filtersExpanded"
                  [class.border-blue-300]="filtersExpanded"
                >
                  <i
                    class="pi"
                    [class.pi-filter]="!filtersExpanded"
                    [class.pi-filter-slash]="filtersExpanded"
                  ></i>
                  {{ filtersExpanded ? 'Hide' : 'Show' }} Filters
                </button>
                <select
                  class="border rounded px-2 py-1 text-sm"
                  [(ngModel)]="status"
                  (change)="refresh()"
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
                <select
                  class="border rounded px-2 py-1 text-sm"
                  [(ngModel)]="sort"
                  (change)="refresh()"
                >
                  <option value="-createdAt">Newest First</option>
                  <option value="createdAt">Oldest First</option>
                  <option value="-updatedAt">Recently Updated</option>
                  <option value="updatedAt">Least Updated</option>
                </select>
                <button
                  class="px-3 py-1.5 text-xs rounded border hover:bg-neutral-100 flex items-center gap-1"
                  (click)="clearFilters()"
                  title="Clear all filters"
                >
                  <i class="pi pi-times"></i>
                  Clear
                </button>
                <button
                  class="px-3 py-1.5 text-xs rounded bg-primary text-white hover:bg-primary/90"
                  (click)="openCreate()"
                >
                  <i class="pi pi-plus mr-1"></i>
                  Create Request
                </button>
              </div>
            </div>

            <!-- Enhanced Filters Panel -->
            <div
              *ngIf="filtersExpanded"
              class="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-4"
            >
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <!-- Sequence Search -->
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">
                    Sequence Number
                  </label>
                  <input
                    type="text"
                    class="w-full border rounded px-3 py-2 text-sm"
                    placeholder="e.g., MACH-001"
                    [(ngModel)]="filters.sequence"
                    (input)="onFilterChange()"
                  />
                </div>

                <!-- Requested By Search -->
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">
                    Requested By
                  </label>
                  <input
                    type="text"
                    class="w-full border rounded px-3 py-2 text-sm"
                    placeholder="Username or email"
                    [(ngModel)]="filters.requestedBy"
                    (input)="onFilterChange()"
                  />
                </div>

                <!-- Category Filter -->
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    class="w-full border rounded px-3 py-2 text-sm bg-white"
                    [(ngModel)]="filters.categoryId"
                    (change)="onFilterChange()"
                  >
                    <option value="">All Categories</option>
                    <option *ngFor="let cat of categories" [value]="cat._id">
                      {{ cat.name }}
                    </option>
                  </select>
                </div>

                <!-- Date Range: From -->
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">
                    Date From
                  </label>
                  <input
                    type="date"
                    class="w-full border rounded px-3 py-2 text-sm"
                    [(ngModel)]="filters.dateFrom"
                    (change)="onFilterChange()"
                  />
                </div>

                <!-- Date Range: To -->
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">
                    Date To
                  </label>
                  <input
                    type="date"
                    class="w-full border rounded px-3 py-2 text-sm"
                    [(ngModel)]="filters.dateTo"
                    (change)="onFilterChange()"
                  />
                </div>

                <!-- Metadata Key -->
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">
                    Metadata Key
                    <span class="text-gray-400 text-xs ml-1">(optional)</span>
                  </label>
                  <input
                    type="text"
                    class="w-full border rounded px-3 py-2 text-sm"
                    placeholder="Enter metadata key"
                    [(ngModel)]="filters.metadataKey"
                    (blur)="validateMetadataKey()"
                    (input)="onFilterChange()"
                  />
                  <div
                    *ngIf="metadataKeyError"
                    class="text-xs text-red-600 mt-1"
                  >
                    {{ metadataKeyError }}
                  </div>
                </div>

                <!-- Metadata Value -->
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">
                    Metadata Value
                    <span class="text-gray-400 text-xs ml-1"
                      >(required if key provided)</span
                    >
                  </label>
                  <input
                    type="text"
                    class="w-full border rounded px-3 py-2 text-sm"
                    placeholder="Enter metadata value"
                    [(ngModel)]="filters.metadataValue"
                    [disabled]="!filters.metadataKey"
                    (input)="onFilterChange()"
                  />
                </div>
              </div>

              <!-- Active Filters Summary -->
              <div
                *ngIf="hasActiveFilters()"
                class="flex flex-wrap gap-2 pt-2 border-t border-gray-200"
              >
                <span class="text-xs font-medium text-gray-600"
                  >Active Filters:</span
                >
                <span
                  *ngIf="filters.sequence"
                  class="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs"
                >
                  Sequence: {{ filters.sequence }}
                  <button
                    class="hover:bg-blue-200 rounded-full p-0.5"
                    (click)="filters.sequence = ''; onFilterChange()"
                  >
                    <i class="pi pi-times text-xs"></i>
                  </button>
                </span>
                <span
                  *ngIf="filters.categoryId"
                  class="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs"
                >
                  Category: {{ getCategoryName(filters.categoryId) }}
                  <button
                    class="hover:bg-blue-200 rounded-full p-0.5"
                    (click)="filters.categoryId = ''; onFilterChange()"
                  >
                    <i class="pi pi-times text-xs"></i>
                  </button>
                </span>
                <span
                  *ngIf="filters.requestedBy"
                  class="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs"
                >
                  Requested By: {{ filters.requestedBy }}
                  <button
                    class="hover:bg-blue-200 rounded-full p-0.5"
                    (click)="filters.requestedBy = ''; onFilterChange()"
                  >
                    <i class="pi pi-times text-xs"></i>
                  </button>
                </span>
                <span
                  *ngIf="filters.dateFrom || filters.dateTo"
                  class="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs"
                >
                  Date: {{ filters.dateFrom || '...' }} to
                  {{ filters.dateTo || '...' }}
                  <button
                    class="hover:bg-blue-200 rounded-full p-0.5"
                    (click)="
                      filters.dateFrom = '';
                      filters.dateTo = '';
                      onFilterChange()
                    "
                  >
                    <i class="pi pi-times text-xs"></i>
                  </button>
                </span>
                <span
                  *ngIf="filters.metadataKey"
                  class="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs"
                >
                  Metadata: {{ filters.metadataKey }} =
                  {{ filters.metadataValue || 'any' }}
                  <button
                    class="hover:bg-blue-200 rounded-full p-0.5"
                    (click)="
                      filters.metadataKey = '';
                      filters.metadataValue = '';
                      onFilterChange()
                    "
                  >
                    <i class="pi pi-times text-xs"></i>
                  </button>
                </span>
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
                <thead class="bg-gray-50">
                  <tr class="text-left">
                    <th class="px-4 py-3 font-semibold text-gray-700">
                      Sequence
                    </th>
                    <th class="px-4 py-3 font-semibold text-gray-700">
                      Machine
                    </th>
                    <th class="px-4 py-3 font-semibold text-gray-700">
                      Category
                    </th>
                    <th class="px-4 py-3 font-semibold text-gray-700">Type</th>
                    <th class="px-4 py-3 font-semibold text-gray-700">
                      Requested By
                    </th>
                    <th class="px-4 py-3 font-semibold text-gray-700">
                      Created
                    </th>
                    <th class="px-4 py-3 font-semibold text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                  <tr
                    *ngFor="let a of approvals || []"
                    class="hover:bg-gray-50 transition-colors"
                  >
                    <!-- Sequence Column (First) -->
                    <td class="px-4 py-3">
                      <span
                        *ngIf="a.machineId?.machine_sequence"
                        class="font-mono text-xs font-semibold bg-blue-100 text-blue-800 px-2 py-1 rounded border border-blue-200"
                        [title]="
                          'Sequence: ' + (a.machineId?.machine_sequence || '')
                        "
                      >
                        {{ a.machineId?.machine_sequence }}
                      </span>
                      <span
                        *ngIf="!a.machineId?.machine_sequence"
                        class="text-gray-400 text-xs italic"
                        >-</span
                      >
                    </td>
                    <!-- Machine Name -->
                    <td class="px-4 py-3">
                      <span class="font-medium text-gray-900">{{
                        a.machineId?.name || '-'
                      }}</span>
                    </td>
                    <!-- Category -->
                    <td class="px-4 py-3">
                      <span class="text-gray-700 text-sm">{{
                        getCategoryNameForApproval(a) || '-'
                      }}</span>
                    </td>
                    <!-- Approval Type -->
                    <td class="px-4 py-3">
                      <span
                        class="inline-flex items-center px-2 py-1 rounded text-xs font-medium"
                        [class.bg-purple-100]="
                          a.approvalType === 'MACHINE_CREATION'
                        "
                        [class.text-purple-800]="
                          a.approvalType === 'MACHINE_CREATION'
                        "
                        [class.bg-yellow-100]="
                          a.approvalType === 'MACHINE_EDIT'
                        "
                        [class.text-yellow-800]="
                          a.approvalType === 'MACHINE_EDIT'
                        "
                        [class.bg-red-100]="
                          a.approvalType === 'MACHINE_DELETION'
                        "
                        [class.text-red-800]="
                          a.approvalType === 'MACHINE_DELETION'
                        "
                      >
                        {{ formatApprovalType(a.approvalType) }}
                      </span>
                    </td>
                    <!-- Requested By -->
                    <td class="px-4 py-3">
                      <span class="text-gray-700 text-sm">{{
                        a.requestedBy?.username || a.requestedBy?.email || '-'
                      }}</span>
                    </td>
                    <!-- Created Date -->
                    <td class="px-4 py-3">
                      <span class="text-gray-600 text-sm">{{
                        a.createdAt | date: 'short'
                      }}</span>
                    </td>
                    <!-- Actions -->
                    <td class="px-4 py-3">
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
  sort: string = '-createdAt';
  page = 1;
  limit = 10;
  pages = 1;
  total = 0;
  sidebarCollapsed = false;
  isAdmin = false;
  currentRoleId: string | null = null;

  // Enhanced filters
  filtersExpanded = false;
  filters: {
    sequence?: string;
    categoryId?: string;
    dateFrom?: string;
    dateTo?: string;
    requestedBy?: string;
    metadataKey?: string;
    metadataValue?: string;
  } = {};
  metadataKeyError = '';

  // Categories for dropdown
  categories: Array<{ _id: string; name: string }> = [];
  categoriesLoading = false;

  // Search debounce timer
  private searchTimer: any = null;

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
    this.loadCategories();
    this.fetchPending();
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
    this.approvalsService
      .getPending(
        this.page,
        this.limit,
        this.search,
        this.status,
        this.sort,
        this.filters
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

  onSearch(): void {
    this.page = 1;
    // Debounce search to avoid too many API calls
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
    this.searchTimer = setTimeout(() => {
      this.fetchPending();
    }, 500);
  }

  onFilterChange(): void {
    this.page = 1;
    // Debounce filter changes
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
    this.searchTimer = setTimeout(() => {
      this.fetchPending();
    }, 300);
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
    this.filters = {};
    this.search = '';
    this.metadataKeyError = '';
    this.page = 1;
    this.fetchPending();
  }

  hasActiveFilters(): boolean {
    return !!(
      this.filters.sequence ||
      this.filters.categoryId ||
      this.filters.requestedBy ||
      this.filters.dateFrom ||
      this.filters.dateTo ||
      this.filters.metadataKey ||
      this.search
    );
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
