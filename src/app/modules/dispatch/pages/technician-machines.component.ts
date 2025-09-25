import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { BaseApiService } from '../../../core/services/base-api.service';
import { API_ENDPOINTS } from '../../../core/constants/api.constants';
import { AuthService } from '../../../core/services/auth.service';
import { PermissionService } from '../../../core/services/permission.service';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { environment } from '../../../../environments/environment';
import { TechnicianSidebarComponent } from '../components/shared/technician-sidebar/technician-sidebar.component';
import { TablePaginationComponent } from '../../admin/components/user-management/table-pagination.component';
import { ApprovalsService } from '../services/approvals.service';

interface MachineRow {
  _id: string;
  name: string;
  category_id?: { name?: string } | string;
  images?: string[];
  is_approved: boolean;
  createdAt: string;
  approvalStatus?: 'pending' | 'approved' | 'rejected' | null;
  rejectionReason?: string | null;
  approverNotes?: string | null;
  decisionByName?: string | null;
  decisionDate?: string | null;
}

@Component({
  selector: 'app-technician-machines',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    ToastModule,
    TechnicianSidebarComponent,
    TablePaginationComponent,
  ],
  template: `
    <app-technician-sidebar
      [collapsed]="sidebarCollapsed"
      (collapseChange)="sidebarCollapsed = $event"
    ></app-technician-sidebar>
    <div
      class="transition-all duration-300"
      [class.ml-16]="sidebarCollapsed"
      [class.ml-64]="!sidebarCollapsed"
    >
      <div class="p-6 space-y-6">
        <p-toast></p-toast>
        <!-- Header -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <h2 class="text-xl font-semibold">Machines</h2>
          </div>
          <button
            class="px-3 py-2 bg-primary text-white rounded-md font-medium transition-colors duration-150"
            [class.opacity-50]="creating || !canCreate"
            [class.pointer-events-none]="!canCreate"
            [disabled]="creating || !canCreate"
            (click)="openCreate()"
          >
            <i class="pi pi-plus mr-2"></i>
            Create Machine
          </button>
        </div>

        <!-- Filters & Search -->
        <div class="flex flex-col md:flex-row md:items-center gap-3">
          <div
            class="inline-flex rounded-md border border-neutral-300 overflow-hidden"
          >
            <button
              class="px-3 py-1.5 text-sm"
              [class.bg-neutral-200]="filter() === 'all'"
              (click)="setFilter('all')"
            >
              All
            </button>
            <button
              class="px-3 py-1.5 text-sm"
              [class.bg-neutral-200]="filter() === 'own'"
              (click)="setFilter('own')"
            >
              My
            </button>
          </div>
          <input
            type="text"
            class="border rounded px-3 py-2 w-full md:w-64"
            placeholder="Search by name..."
            [(ngModel)]="searchTerm"
            (ngModelChange)="onSearchChanged()"
          />
          <select
            class="border rounded px-3 py-2 w-full md:w-56"
            [(ngModel)]="sortKey"
            (change)="applySort()"
          >
            <option value="created_desc">Newest first</option>
            <option value="created_asc">Oldest first</option>
            <option value="name_asc">Name A–Z</option>
            <option value="name_desc">Name Z–A</option>
            <option value="status">Status</option>
          </select>
        </div>

        <!-- Table -->
        <section
          class="bg-bg border border-neutral-300 rounded-xl shadow-medium"
        >
          <div
            class="px-4 py-3 border-b border-neutral-200 flex items-center justify-between"
          >
            <h3 class="font-medium">
              {{ filter() === 'own' ? 'My Machines' : 'All Machines' }}
            </h3>
            <button
              class="text-sm text-primary hover:underline"
              (click)="refresh()"
            >
              <i class="pi pi-refresh mr-1"></i>Refresh
            </button>
          </div>
          <div class="p-4">
            <div *ngIf="loading" class="text-text-muted">Loading...</div>
            <div *ngIf="!loading && rows.length === 0" class="text-text-muted">
              No machines found.
            </div>
            <div *ngIf="!loading && rows.length > 0" class="overflow-x-auto">
              <table class="min-w-full text-sm table-fixed">
                <thead>
                  <tr class="text-left">
                    <th class="px-3 py-2 whitespace-nowrap w-48">Name</th>
                    <th class="px-3 py-2 whitespace-nowrap w-72">Category</th>
                    <th class="px-3 py-2 whitespace-nowrap w-20">Images</th>
                    <th class="px-3 py-2 whitespace-nowrap w-52">Preview</th>
                    <th class="px-3 py-2 whitespace-nowrap w-48">Created</th>
                    <th class="px-3 py-2 whitespace-nowrap w-48">Status</th>
                    <th class="px-3 py-2 whitespace-nowrap w-56">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    *ngFor="let m of rows"
                    class="border-t border-neutral-200"
                  >
                    <td class="px-3 py-2">
                      <div class="ellipsis" [title]="m.name">{{ m.name }}</div>
                    </td>
                    <td class="px-3 py-2">
                      <div class="ellipsis" [title]="categoryName(m)">
                        {{ categoryName(m) }}
                      </div>
                    </td>
                    <td class="px-3 py-2">{{ m.images?.length || 0 }}</td>
                    <td class="px-3 py-2">
                      <div
                        class="flex gap-2 items-center max-w-[200px] overflow-x-auto hide-scrollbar"
                        *ngIf="(m.images?.length || 0) > 0; else noimg"
                      >
                        <img
                          *ngFor="
                            let img of m.images || [] | slice: 0 : 3;
                            let i = index
                          "
                          [src]="imageUrl(img)"
                          class="thumb cursor-pointer hover:opacity-90"
                          (click)="openPreview(m.images || [], i)"
                          [alt]="m.name + ' image'"
                        />
                        <span
                          *ngIf="(m.images?.length || 0) > 3"
                          class="text-xs text-text-muted"
                          >+{{ (m.images?.length || 0) - 3 }}</span
                        >
                      </div>
                      <ng-template #noimg>
                        <span class="text-xs text-text-muted">No images</span>
                      </ng-template>
                    </td>
                    <td class="px-3 py-2 whitespace-nowrap">
                      {{ m.createdAt | date: 'medium' }}
                    </td>
                    <td class="px-3 py-2">
                      <div class="flex flex-col gap-1">
                        <span
                          class="px-2 py-1 rounded text-xs w-fit"
                          [ngClass]="{
                            'bg-green-100 text-green-700':
                              (m.approvalStatus ||
                                (m.is_approved ? 'approved' : 'pending')) ===
                              'approved',
                            'bg-red-100 text-red-700':
                              m.approvalStatus === 'rejected',
                            'bg-amber-100 text-amber-700':
                              (!m.approvalStatus && !m.is_approved) ||
                              m.approvalStatus === 'pending',
                          }"
                        >
                          {{
                            m.approvalStatus ||
                              (m.is_approved ? 'approved' : 'pending')
                              | titlecase
                          }}
                        </span>
                        <div
                          class="text-xs text-text-muted"
                          *ngIf="m.approvalStatus === 'approved'"
                        >
                          by {{ m.decisionByName || 'approver' }}
                          <span *ngIf="m.decisionDate"
                            >• {{ m.decisionDate | date: 'medium' }}</span
                          >
                        </div>
                        <div
                          class="text-xs text-error"
                          *ngIf="m.approvalStatus === 'rejected'"
                        >
                          by {{ m.decisionByName || 'approver' }}
                          <span *ngIf="m.decisionDate" class="text-text-muted"
                            >• {{ m.decisionDate | date: 'medium' }}</span
                          >
                        </div>
                      </div>
                    </td>
                    <td class="px-3 py-2 whitespace-nowrap">
                      <button
                        class="px-2 py-1 text-sm rounded border hover:bg-neutral-100"
                        [disabled]="!m.images?.length"
                        (click)="openPreview(m.images || [], 0)"
                        title="Preview images"
                      >
                        <i class="pi pi-image mr-1"></i> Preview
                      </button>
                      <ng-container
                        *ngIf="m.approvalStatus === 'rejected'; else noReason"
                      >
                        <button
                          class="px-2 py-1 text-sm rounded border hover:bg-neutral-100 ml-2 text-error"
                          (click)="openRejection(m._id)"
                          title="View rejection reason"
                        >
                          <i class="pi pi-info-circle mr-1"></i> View Reason
                        </button>
                      </ng-container>
                      <ng-template #noReason>
                        <span class="text-xs text-text-muted ml-2"
                          >No reason</span
                        >
                      </ng-template>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Pagination -->
            <app-table-pagination
              class="mt-4"
              [page]="page"
              [pages]="pages"
              [total]="total"
              [limit]="limit"
              (pageChange)="onPageChange($event)"
              (limitChange)="onLimitChange($event)"
            ></app-table-pagination>
          </div>
        </section>

        <!-- Rejection Reason Modal -->
        <div
          class="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
          *ngIf="rejectVisible"
        >
          <div
            class="bg-white w-full max-w-md rounded-xl shadow-xl border border-neutral-300"
          >
            <div
              class="px-4 py-3 border-b border-neutral-200 flex items-center justify-between"
            >
              <h3 class="font-medium">Rejection Details</h3>
              <button
                class="p-2 hover:bg-neutral-100 rounded"
                (click)="rejectVisible = false"
              >
                <i class="pi pi-times"></i>
              </button>
            </div>
            <div class="p-4 space-y-4">
              <div *ngIf="rejectLoading" class="text-text-muted">
                Loading...
              </div>
              <div *ngIf="!rejectLoading">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div class="text-xs text-text-muted mb-1">
                      Rejection Reason
                    </div>
                    <div
                      class="whitespace-pre-wrap text-sm"
                      *ngIf="rejectionReason; else noreason"
                    >
                      {{ rejectionReason }}
                    </div>
                    <ng-template #noreason>
                      <div class="text-text-muted text-sm">
                        No rejection reason available.
                      </div>
                    </ng-template>
                  </div>
                  <div *ngIf="approverNotes">
                    <div class="text-xs text-text-muted mb-1">
                      Approver Notes
                    </div>
                    <div class="whitespace-pre-wrap text-sm">
                      {{ approverNotes }}
                    </div>
                  </div>
                </div>
                <div *ngIf="rejectMachine" class="space-y-2">
                  <div class="text-xs text-text-muted">Machine</div>
                  <div class="text-sm">
                    <span class="font-medium">Name:</span>
                    {{ rejectMachine?.name }}
                  </div>
                  <div class="text-sm">
                    <span class="font-medium">Category:</span>
                    {{
                      rejectMachine?.category_id?.name ||
                        rejectMachine?.category_id ||
                        '-'
                    }}
                  </div>
                  <div *ngIf="rejectMetadata?.length" class="mt-2">
                    <div class="text-xs text-text-muted mb-1">
                      Additional details
                    </div>
                    <div class="border rounded divide-y">
                      <div
                        class="p-2 grid grid-cols-5 gap-2"
                        *ngFor="let m of rejectMetadata"
                      >
                        <div class="col-span-2 text-xs font-medium">
                          {{ m.key }}
                        </div>
                        <div class="col-span-3 text-xs break-all">
                          {{ m.value }}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="pt-2 flex items-center justify-end">
                <button
                  class="px-3 py-2 rounded border"
                  (click)="rejectVisible = false"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Image Lightbox Modal -->
        <div
          class="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          *ngIf="previewVisible"
        >
          <div class="relative w-full max-w-4xl mx-4">
            <button
              class="absolute -top-10 right-0 text-white p-2"
              (click)="closePreview()"
            >
              <i class="pi pi-times text-2xl"></i>
            </button>
            <div class="bg-black rounded-lg overflow-hidden">
              <div
                class="relative flex items-center justify-center"
                style="min-height: 300px;"
              >
                <button
                  class="absolute left-2 text-white bg-black/40 rounded-full p-2"
                  (click)="prevImage()"
                >
                  <i class="pi pi-chevron-left"></i>
                </button>
                <img
                  [src]="imageUrl(previewImages[previewIndex])"
                  class="max-h-[70vh] w-auto object-contain"
                />
                <button
                  class="absolute right-2 text-white bg-black/40 rounded-full p-2"
                  (click)="nextImage()"
                >
                  <i class="pi pi-chevron-right"></i>
                </button>
              </div>
              <div class="p-2 bg-neutral-900 flex gap-2 overflow-x-auto">
                <img
                  *ngFor="let p of previewImages; let i = index"
                  [src]="imageUrl(p)"
                  class="w-14 h-14 object-cover rounded border cursor-pointer"
                  [class.border-primary]="i === previewIndex"
                  (click)="goToImage(i)"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .ellipsis {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .thumb {
        width: 40px;
        height: 40px;
        object-fit: cover;
        border-radius: 6px;
        border: 1px solid rgba(0, 0, 0, 0.1);
      }
      .hide-scrollbar {
        scrollbar-width: none;
        -ms-overflow-style: none;
      }
      .hide-scrollbar::-webkit-scrollbar {
        display: none;
      }
    `,
  ],
})
export class TechnicianMachinesComponent implements OnInit, OnDestroy {
  loading = false;
  rows: MachineRow[] = [];
  filter = signal<'all' | 'own'>('own');

  createVisible = false;
  creating = false;
  form: FormGroup;
  categories: Array<{ _id: string; name: string }> = [];
  selectedFiles: File[] = [];
  selectedPreviews: string[] = [];
  canCreate = true;
  previewVisible = false;
  previewImages: string[] = [];
  previewIndex = 0;
  sidebarCollapsed = false;
  searchTerm = '';
  sortKey:
    | 'created_desc'
    | 'created_asc'
    | 'name_asc'
    | 'name_desc'
    | 'status' = 'created_desc';
  private searchTimer: any;

  // pagination state
  page = 1;
  pages = 0;
  total = 0;
  limit = 10;
  // rejection modal state
  rejectVisible = false;
  rejectLoading = false;
  rejectionReason = '';
  approverNotes: string | null = null;
  rejectMachine: any = null;
  rejectMetadata: Array<{ key: string; value: any; type?: string }> = [];

  constructor(
    private baseApi: BaseApiService,
    private auth: AuthService,
    private fb: FormBuilder,
    private permissionService: PermissionService,
    private route: ActivatedRoute,
    private approvals: ApprovalsService,
    private messageService: MessageService
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      category_id: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.checkCreatePermission();
    this.fetchCategories();
    this.refresh();
    // Auto-open modal if query param specifies it
    this.route.queryParamMap.subscribe(params => {
      const open = params.get('open');
      if (open === 'create' && this.canCreate) {
        this.openCreate();
      }
    });
  }

  ngOnDestroy(): void {
    this.selectedPreviews.forEach(url => URL.revokeObjectURL(url));
  }

  setFilter(f: 'all' | 'own'): void {
    if (this.filter() !== f) {
      this.filter.set(f);
      this.page = 1;
      this.refresh();
    }
  }

  categoryName(m: MachineRow): string {
    if (!m.category_id) return '-';
    if (typeof m.category_id === 'string') return m.category_id;
    return m.category_id?.name || '-';
  }

  refresh(): void {
    this.loading = true;
    const user = this.auth.getCurrentUser();
    const params: Record<string, any> = { page: this.page, limit: this.limit };
    if (this.filter() === 'own' && user?._id) {
      params['created_by'] = user._id;
    }
    if (this.searchTerm?.trim()) {
      params['search'] = this.searchTerm.trim();
    }
    this.baseApi.get<any>(API_ENDPOINTS.MACHINES, params).subscribe({
      next: res => {
        const data: any = (res as any).data || res;
        const list = data.machines || data?.data?.machines || [];
        this.total = data.total || data?.data?.total || 0;
        this.pages =
          data.pages ||
          data?.data?.pages ||
          Math.ceil(this.total / this.limit) ||
          0;
        const mapped = list.map((m: any) => ({
          ...m,
          images: Array.isArray(m?.images)
            ? m.images
            : m?.images
              ? [m.images]
              : [],
        }));
        // annotate rows with latest approval status for clarity
        this.annotateApprovalStatuses(mapped)
          .then(annotated => {
            this.rows = this.sortRows(annotated);
            this.loading = false;
          })
          .catch(() => {
            this.rows = this.sortRows(mapped);
            this.loading = false;
          });
      },
      error: () => (this.loading = false),
    });
  }

  onPageChange(p: number): void {
    this.page = p;
    this.refresh();
  }

  onLimitChange(l: number): void {
    this.limit = l;
    this.page = 1;
    this.refresh();
  }

  openCreate(): void {
    if (!this.canCreate) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Not allowed',
        detail: 'You do not have permission to create a machine.',
      });
      return;
    }
    this.form.reset();
    this.selectedFiles = [];
    this.selectedPreviews.forEach(url => URL.revokeObjectURL(url));
    this.selectedPreviews = [];
    this.createVisible = true;
    // Ensure categories are fresh whenever the modal is opened
    this.fetchCategories();
  }

  closeCreate(): void {
    if (!this.creating) this.createVisible = false;
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    const limited = files.slice(0, 5);
    this.selectedFiles = limited;
    // Previews
    this.selectedPreviews.forEach(url => URL.revokeObjectURL(url));
    this.selectedPreviews = this.selectedFiles.map(f => URL.createObjectURL(f));
  }

  removeFile(index: number): void {
    if (index < 0 || index >= this.selectedFiles.length) return;
    const [removed] = this.selectedPreviews.splice(index, 1);
    if (removed) URL.revokeObjectURL(removed);
    this.selectedFiles.splice(index, 1);
  }

  onSubmit(): void {
    if (this.form.invalid || this.creating) return;
    const user = this.auth.getCurrentUser();
    if (!user?._id) return;
    const formData = new FormData();
    formData.append('name', this.form.value.name);
    formData.append('category_id', this.form.value.category_id);
    // metadata is optional; omit for now
    for (const f of this.selectedFiles) {
      formData.append('images', f);
    }

    this.creating = true;
    this.baseApi.post<any>(API_ENDPOINTS.MACHINES, formData).subscribe({
      next: res => {
        this.creating = false;
        this.createVisible = false;
        const successMsg =
          (res && (res.message || (res as any)?.data?.message)) ||
          'Machine created successfully.';
        this.messageService.add({
          severity: 'success',
          summary: 'Created',
          detail: successMsg,
        });
        this.refresh();
      },
      error: err => {
        this.creating = false;
        const errorCode = err?.errorCode || err?.error?.errorCode;
        const statusCode = err?.statusCode || err?.status;
        let detail =
          err?.message ||
          err?.error?.message ||
          err?.error?.data?.message ||
          (typeof err === 'string' ? err : '') ||
          'Failed to create machine';
        // If backend sends "CODE: message", extract message part for UX
        if (typeof detail === 'string' && detail.includes(':')) {
          const idx = detail.indexOf(':');
          const after = detail.slice(idx + 1).trim();
          if (after) detail = after;
        }
        // Helpful debug log to verify error shape during QA

        console.error('Create machine error payload:', err);

        if (errorCode === 'DUPLICATE_MACHINE_NAME' || statusCode === 409) {
          // Mark field error for better UX and show precise toast
          const nameCtrl = this.form.get('name');
          nameCtrl?.setErrors({ duplicate: true });
          nameCtrl?.markAsTouched();
          this.messageService.add({
            severity: 'error',
            summary: 'Conflict',
            detail,
          });
          return;
        }

        this.messageService.add({
          severity: 'error',
          summary: 'Failed',
          detail,
        });
      },
    });
  }

  private fetchCategories(): void {
    // Use active categories for selection
    this.baseApi.get<any>(API_ENDPOINTS.CATEGORY_ACTIVE).subscribe({
      next: res => {
        const data: any = (res as any).data || res;
        this.categories = Array.isArray(data)
          ? data
          : data.categories || data?.data?.categories || [];
      },
      error: () => {},
    });
  }

  private checkCreatePermission(): void {
    this.permissionService
      .checkPermission({ action: 'CREATE_MACHINE' } as any)
      .subscribe({
        next: res => {
          const allowed = (res as any)?.data?.allowed ?? (res as any)?.allowed;
          this.canCreate = !!allowed;
        },
        error: () => {
          this.canCreate = false;
        },
      });
  }

  imageUrl(path: string): string {
    if (!path) return '';
    const base = environment.apiUrl.replace(/\/?api\/?$/, '');
    return `${base}${path}`;
  }

  openPreview(images: string[], index: number): void {
    if (!images || images.length === 0) return;
    this.previewImages = images;
    this.previewIndex = Math.max(0, Math.min(index, images.length - 1));
    this.previewVisible = true;
  }

  openRejection(machineId: string): void {
    this.rejectVisible = true;
    this.rejectLoading = true;
    this.rejectionReason = '';
    this.approverNotes = null;
    this.rejectMachine = null;
    this.rejectMetadata = [];
    // Query approvals for this machine and get latest rejection reason
    this.baseApi
      .get<any>(API_ENDPOINTS.MY_APPROVAL_REQUESTS, {
        machineId,
        status: 'REJECTED',
        sort: '-updatedAt',
        limit: 1,
      })
      .subscribe({
        next: res => {
          const data = (res as any).data || res;
          const approvals = data.approvals || data?.data?.approvals || [];
          const rejected = approvals[0];
          this.rejectionReason =
            rejected?.rejectionReason || rejected?.approverNotes || '';
          this.approverNotes = rejected?.approverNotes || null;
          const mid =
            typeof rejected?.machineId === 'string'
              ? rejected?.machineId
              : rejected?.machineId?._id;
          if (mid) {
            this.baseApi
              .get<any>(`${API_ENDPOINTS.MACHINES}/${mid}`)
              .subscribe({
                next: mres => {
                  const mdata = (mres as any).data || mres;
                  const machine =
                    mdata.machine || mdata?.data?.machine || mdata;
                  this.rejectMachine = machine;
                  const metaObj =
                    machine?.metadata && typeof machine.metadata === 'object'
                      ? machine.metadata
                      : undefined;
                  if (metaObj) {
                    this.rejectMetadata = Object.keys(metaObj).map(k => ({
                      key: k,
                      value: (metaObj as any)[k],
                    }));
                  }
                  this.rejectLoading = false;
                },
                error: () => {
                  this.rejectLoading = false;
                },
              });
          } else {
            this.rejectLoading = false;
          }
        },
        error: () => {
          this.rejectLoading = false;
        },
      });
  }

  closePreview(): void {
    this.previewVisible = false;
    this.previewImages = [];
    this.previewIndex = 0;
  }

  prevImage(): void {
    if (!this.previewImages.length) return;
    this.previewIndex =
      (this.previewIndex - 1 + this.previewImages.length) %
      this.previewImages.length;
  }

  nextImage(): void {
    if (!this.previewImages.length) return;
    this.previewIndex = (this.previewIndex + 1) % this.previewImages.length;
  }

  goToImage(i: number): void {
    if (i < 0 || i >= this.previewImages.length) return;
    this.previewIndex = i;
  }

  onSearchChanged(): void {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.refresh(), 300);
  }

  applySort(): void {
    this.rows = this.sortRows(this.rows.slice());
  }

  private sortRows(rows: MachineRow[]): MachineRow[] {
    switch (this.sortKey) {
      case 'name_asc':
        return rows.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      case 'name_desc':
        return rows.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
      case 'created_asc':
        return rows.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      case 'status':
        return rows.sort((a, b) => {
          const sa =
            a.approvalStatus || (a.is_approved ? 'approved' : 'pending');
          const sb =
            b.approvalStatus || (b.is_approved ? 'approved' : 'pending');
          const order = { approved: 2, pending: 1, rejected: 0 } as any;
          return (order[sa] ?? -1) - (order[sb] ?? -1);
        });
      case 'created_desc':
      default:
        return rows.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }
  }

  private async annotateApprovalStatuses(
    rows: MachineRow[]
  ): Promise<MachineRow[]> {
    try {
      const machineIds = rows.map(r => r._id);
      const lookups = await Promise.all(
        machineIds.map(id =>
          this.approvals
            .getByMachine(id, '-updatedAt')
            .toPromise()
            .catch(() => null)
        )
      );
      const byId: Record<string, any> = {};
      lookups.forEach((res, idx) => {
        const list =
          (res as any)?.approvals || (res as any)?.data?.approvals || [];
        const latest = list[0];
        byId[machineIds[idx]] = latest || null;
      });

      return rows.map(r => {
        const a: any = byId[r._id];
        if (!a) return r;
        return {
          ...r,
          approvalStatus: (a.status || '').toLowerCase() as any,
          rejectionReason: a.rejectionReason || null,
          approverNotes: a.approverNotes || null,
          decisionByName:
            a?.approvedBy?.username || a?.rejectedBy?.username || null,
          decisionDate: a?.approvalDate || a?.updatedAt || null,
        };
      });
    } catch {
      return rows;
    }
  }
}
