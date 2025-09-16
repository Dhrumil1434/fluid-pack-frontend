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

interface MachineRow {
  _id: string;
  name: string;
  category_id?: { name?: string } | string;
  images?: string[];
  is_approved: boolean;
  createdAt: string;
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
              <table class="min-w-full text-sm">
                <thead>
                  <tr class="text-left">
                    <th class="px-3 py-2">Name</th>
                    <th class="px-3 py-2">Category</th>
                    <th class="px-3 py-2">Images</th>
                    <th class="px-3 py-2">Preview</th>
                    <th class="px-3 py-2">Created</th>
                    <th class="px-3 py-2">Status</th>
                    <th class="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    *ngFor="let m of rows"
                    class="border-t border-neutral-200"
                  >
                    <td class="px-3 py-2">{{ m.name }}</td>
                    <td class="px-3 py-2">{{ categoryName(m) }}</td>
                    <td class="px-3 py-2">{{ m.images?.length || 0 }}</td>
                    <td class="px-3 py-2">
                      <div
                        class="flex gap-2 items-center"
                        *ngIf="(m.images?.length || 0) > 0; else noimg"
                      >
                        <img
                          *ngFor="
                            let img of m.images || [] | slice: 0 : 3;
                            let i = index
                          "
                          [src]="imageUrl(img)"
                          class="w-10 h-10 object-cover rounded border cursor-pointer hover:opacity-90"
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
                    <td class="px-3 py-2">
                      {{ m.createdAt | date: 'medium' }}
                    </td>
                    <td class="px-3 py-2">
                      <span
                        class="px-2 py-1 rounded text-xs"
                        [ngClass]="{
                          'bg-green-100 text-green-700': m.is_approved,
                          'bg-amber-100 text-amber-700': !m.is_approved,
                        }"
                        >{{ m.is_approved ? 'Approved' : 'Pending' }}</span
                      >
                    </td>
                    <td class="px-3 py-2">
                      <button
                        class="px-2 py-1 text-sm rounded border hover:bg-neutral-100"
                        [disabled]="!m.images?.length"
                        (click)="openPreview(m.images || [], 0)"
                      >
                        <i class="pi pi-image mr-1"></i> Preview
                      </button>
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

  constructor(
    private baseApi: BaseApiService,
    private auth: AuthService,
    private fb: FormBuilder,
    private permissionService: PermissionService,
    private route: ActivatedRoute,
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
        this.rows = this.sortRows(mapped);
        this.loading = false;
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
      next: () => {
        this.creating = false;
        this.createVisible = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Created',
          detail: 'Machine created and pending approval.',
        });
        this.refresh();
      },
      error: err => {
        this.creating = false;
        const detail = err?.error?.message || 'Failed to create machine';
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
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
        return rows.sort(
          (a, b) => Number(!!a.is_approved) - Number(!!b.is_approved)
        );
      case 'created_desc':
      default:
        return rows.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }
  }
}
