import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

// Services
import { BaseApiService } from '../../../../core/services/base-api.service';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorHandlerService } from '../../../../core/services/error-handler.service';
import { QCEntryService } from '../../../../core/services/qc-entry.service';
import { environment } from '../../../../../environments/environment';
import { CategoryService } from '../../../../core/services/category.service';

// Components
import { QcSidebarComponent } from '../shared/qc-sidebar/qc-sidebar.component';
import { TablePaginationComponent } from '../../../admin/components/user-management/table-pagination.component';
import { ListFiltersComponent } from '../../../admin/components/shared/list/list-filters.component';
import { ListTableShellComponent } from '../../../admin/components/shared/list/list-table-shell.component';
import { PageHeaderComponent } from '../../../../core/components/page-header/page-header.component';

interface MachineDocument {
  _id?: string;
  name: string;
  file_path: string;
  document_type?: string;
  uploaded_at?: Date | string;
}

interface Machine {
  _id: string;
  name: string;
  category_id: {
    _id: string;
    name: string;
    description?: string;
  } | null;
  subcategory_id?: {
    _id: string;
    name: string;
    description?: string;
  } | null;
  machine_sequence?: string;
  // Normalize metadata to array of key/value for client-side filtering,
  // while still accepting object from backend
  metadata:
    | Array<{
        key: string;
        value: string;
      }>
    | Record<string, unknown>;
  images: string[];
  documents?: MachineDocument[];
  created_by?: {
    _id?: string;
    username?: string;
    email?: string;
    name?: string;
  } | null;
  updatedBy?: {
    _id?: string;
    username?: string;
    email?: string;
  } | null;
  createdAt: string;
  updatedAt?: string;
  is_approved: boolean;
  approvalStatus?: string;
  is_active: boolean;
  party_name?: string;
  location?: string;
  mobile_number?: string;
  dispatch_date?: string | Date;
}

interface Category {
  _id: string;
  name: string;
  description?: string;
}

@Component({
  selector: 'app-qc-machine-selection',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    QcSidebarComponent,
    TablePaginationComponent,
    ListFiltersComponent,
    ListTableShellComponent,
    PageHeaderComponent,
  ],
  templateUrl: './qc-machine-selection.component.html',
  styleUrls: ['./qc-machine-selection.component.css'],
})
export class QcMachineSelectionComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  // UI State
  sidebarCollapsed = false;
  loading = false;
  searchLoading = false;

  // Data
  machines: Machine[] = [];
  categories: Category[] = [];
  filteredMachines: Machine[] = [];
  imageIndexByMachineId: Record<string, number> = {};
  // Track machines that already have a non-rejected QC approval (block selection)
  private blockedApprovalMachineIds: Set<string> = new Set();
  metadataKeySuggestions: string[] = [];
  allMetadataKeys: string[] = []; // Master list of all keys (like admin)
  showMetadataKeySuggestions = false;

  // Filters (matching admin structure)
  filters: {
    search?: string;
    category_id?: string;
    is_approved?: boolean;
    metadata_key?: string;
    metadata_value?: string;
    dispatch_date_from?: string;
    dispatch_date_to?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {
    is_approved: true, // Only approved machines for QC
    sortBy: 'createdAt', // Default sort (matching admin)
    sortOrder: 'desc', // Default: latest first (matching admin)
  };

  // Pagination
  page = 1;
  limit = 20;
  total = 0;
  pages = 0;

  // Selection
  selectedMachines: Set<string> = new Set();
  selectAll = false;

  // Document Upload Modal
  showDocumentModal = false;
  selectedMachineForUpload: Machine | null = null;
  selectedFiles: File[] = [];
  uploadProgress = 0;
  uploading = false;
  uploadNotes = '';
  uploadReportLink = '';
  // Field-level validation state (modal)
  reportLinkTouched = false;
  reportLinkErrorMsg: string | null = null;

  constructor(
    private api: BaseApiService,
    private loaderService: LoaderService,
    private errorHandler: ErrorHandlerService,
    private qcEntryService: QCEntryService,
    private categoryService: CategoryService
  ) {
    // Setup search debouncing (matching admin pattern)
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((searchTerm: string) => {
        this.filters.search = searchTerm;
        this.page = 1;
        this.loadMachines();
      });
  }

  ngOnInit(): void {
    this.loadCategories();
    this.loadMachines();
    // Load initial metadata keys from first page to build master list (like admin)
    this.loadInitialMetadataKeys();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCategories(): void {
    // Use CategoryService to get active categories (same as admin components)
    this.categoryService
      .getAllCategories({ includeInactive: false })
      .subscribe({
        next: (res: any) => {
          const data = res?.data || res;
          // Support either { categories: [] } or [] directly
          this.categories = Array.isArray(data) ? data : data?.categories || [];
        },
        error: (error: any) => {
          console.error('Failed to load categories:', error);
        },
      });
  }

  loadMachines(): void {
    this.loading = true;
    this.loaderService.showGlobalLoader('Loading machines...');

    const params: any = {
      page: this.page,
      limit: this.limit,
      // Always restrict to approved machines for QC selection
      is_approved: true,
    };

    if (this.filters.search?.trim()) {
      params.search = this.filters.search.trim();
    }
    if (this.filters.category_id) {
      params.category_id = this.filters.category_id;
    }
    if (this.filters.metadata_key) {
      params.metadata_key = this.filters.metadata_key;
    }
    if (this.filters.metadata_value) {
      params.metadata_value = this.filters.metadata_value;
    }
    if (this.filters.dispatch_date_from) {
      params.dispatch_date_from = this.filters.dispatch_date_from;
    }
    if (this.filters.dispatch_date_to) {
      params.dispatch_date_to = this.filters.dispatch_date_to;
    }
    // Always send sort parameters (matching admin pattern)
    params.sortBy = this.filters.sortBy || 'createdAt';
    params.sortOrder = this.filters.sortOrder || 'desc';

    // Use general machines endpoint with approved filter for pagination and server-side filtering
    this.api.get<any>('/machines', params).subscribe({
      next: res => {
        const data = res?.data || res;
        const serverMachines: Machine[] = (data?.machines ||
          data?.items ||
          data ||
          []) as Machine[];

        // Normalize and enforce approved-only (defensive)
        let refined = serverMachines
          .filter(m => !!m && m.is_approved === true)
          .map(m => this.normalizeMachine(m));

        // Exclude machines that already have a non-rejected QC approval
        this.fetchBlockedApprovalsSet()
          .then(() => {
            refined = refined.filter(
              m => !this.blockedApprovalMachineIds.has(m._id)
            );

            this.machines = refined;
            this.total = data.total || refined.length;
            this.pages = data.pages || Math.ceil(this.total / this.limit);
            this.filteredMachines = [...this.machines];
            // Extract metadata keys for autocomplete (matching admin pattern)
            this.extractMetadataKeys(refined);
            // init image indices for slider
            this.filteredMachines.forEach(m => {
              if (!(m._id in this.imageIndexByMachineId)) {
                this.imageIndexByMachineId[m._id] = 0;
              }
            });
            this.loading = false;
            this.loaderService.hideGlobalLoader();
          })
          .catch(() => {
            // If we failed to fetch approvals, proceed without exclusion
            this.machines = refined;
            this.total = data.total || refined.length;
            this.pages = data.pages || Math.ceil(this.total / this.limit);
            this.filteredMachines = [...this.machines];
            // Extract metadata keys for autocomplete (matching admin pattern)
            this.extractMetadataKeys(refined);
            this.loading = false;
            this.loaderService.hideGlobalLoader();
          });
      },
      error: error => {
        console.error('Error loading machines:', error);
        this.errorHandler.showServerError();
        this.loading = false;
        this.loaderService.hideGlobalLoader();
      },
    });
  }

  onSearchChange(search: string): void {
    // Update search subject which will debounce and update filter
    this.searchSubject.next(search || '');
  }

  reload(): void {
    this.page = 1;
    this.loadMachines();
  }

  clearFilters(): void {
    this.filters = {
      is_approved: true, // Always keep approved filter
      sortBy: 'createdAt', // Default sort (matching admin)
      sortOrder: 'desc', // Default: latest first (matching admin)
    };
    this.page = 1;
    this.showMetadataKeySuggestions = false;
    this.reload();
  }

  onCategoryFilterChange(): void {
    this.reload();
  }

  onMetadataKeyChange(): void {
    // Filter suggestions based on input from master list (matching admin pattern)
    if (this.filters.metadata_key) {
      const input = this.filters.metadata_key.toLowerCase().trim();
      this.metadataKeySuggestions = this.allMetadataKeys.filter(key =>
        key.toLowerCase().includes(input)
      );
    } else {
      this.metadataKeySuggestions = [...this.allMetadataKeys];
    }
    // Don't reload on every keystroke, wait for blur or selection
  }

  onMetadataValueChange(): void {
    // Debounce metadata value search (matching admin pattern)
    clearTimeout((this as any).metadataValueTimer);
    (this as any).metadataValueTimer = setTimeout(() => {
      this.page = 1;
      this.reload();
    }, 500);
  }

  /**
   * Extract metadata keys from machines to build master list (matching admin pattern)
   */
  extractMetadataKeys(machines: Machine[]): void {
    const keySet = new Set<string>();
    machines.forEach(machine => {
      if (machine.metadata && typeof machine.metadata === 'object') {
        if (Array.isArray(machine.metadata)) {
          machine.metadata.forEach((md: any) => {
            if (md?.key && typeof md.key === 'string' && md.key.trim()) {
              keySet.add(md.key.trim());
            }
          });
        } else {
          Object.keys(machine.metadata).forEach(key => {
            if (key && key.trim()) {
              keySet.add(key.trim());
            }
          });
        }
      }
    });
    this.allMetadataKeys = Array.from(keySet).sort();
    // Update suggestions based on current filter input
    if (this.filters.metadata_key) {
      const input = this.filters.metadata_key.toLowerCase().trim();
      this.metadataKeySuggestions = this.allMetadataKeys.filter(key =>
        key.toLowerCase().includes(input)
      );
    } else {
      this.metadataKeySuggestions = [...this.allMetadataKeys];
    }
  }

  /**
   * Load initial metadata keys from first page to build master list
   */
  loadInitialMetadataKeys(): void {
    const params: any = {
      page: 1,
      limit: 100, // Load first 100 machines to extract keys
      is_approved: true,
    };
    this.api.get<any>('/machines', params).subscribe({
      next: res => {
        const data = res?.data || res;
        const serverMachines: Machine[] = (data?.machines ||
          data?.items ||
          data ||
          []) as Machine[];
        const normalized = serverMachines
          .filter(m => !!m && m.is_approved === true)
          .map(m => this.normalizeMachine(m));
        this.extractMetadataKeys(normalized);
      },
      error: () => {
        // Silently fail - metadata suggestions will work from loaded machines
      },
    });
  }

  selectMetadataKey(key: string): void {
    this.filters.metadata_key = key;
    this.showMetadataKeySuggestions = false;
    this.reload();
  }

  hideMetadataSuggestions(): void {
    setTimeout(() => {
      this.showMetadataKeySuggestions = false;
    }, 200);
  }

  // Pagination
  onPageChange(page: number): void {
    this.page = page;
    this.loadMachines();
  }

  onLimitChange(limit: number): void {
    this.limit = limit;
    this.page = 1;
    this.loadMachines();
  }

  // Selection
  toggleMachineSelection(machineId: string): void {
    if (this.selectedMachines.has(machineId)) {
      this.selectedMachines.delete(machineId);
    } else {
      this.selectedMachines.add(machineId);
    }
    this.updateSelectAllState();
  }

  toggleSelectAll(): void {
    if (this.selectAll) {
      this.selectedMachines.clear();
    } else {
      this.filteredMachines.forEach(machine => {
        this.selectedMachines.add(machine._id);
      });
    }
    this.selectAll = !this.selectAll;
  }

  private updateSelectAllState(): void {
    this.selectAll =
      this.filteredMachines.length > 0 &&
      this.filteredMachines.every(machine =>
        this.selectedMachines.has(machine._id)
      );
  }

  isMachineSelected(machineId: string): boolean {
    return this.selectedMachines.has(machineId);
  }

  getSelectedCount(): number {
    return this.selectedMachines.size;
  }

  // Actions
  proceedWithSelection(): void {
    if (this.selectedMachines.size === 0) {
      this.errorHandler.showServerError();
      return;
    }
    // Open entry creation modal to collect details
    this.openEntryModal();
  }

  // Document Upload Modal
  openDocumentModal(machine: Machine): void {
    // Guard against duplicate pending request for same machine
    const mid = machine?._id;
    if (!mid) return;
    this.qcEntryService
      .getQCApprovalsByMachine(mid, { page: 1, limit: 5 })
      .subscribe({
        next: res => {
          const approvals = (res as any)?.data?.approvals || [];
          const active = approvals.find((a: any) => a?.status !== 'REJECTED');
          if (active) {
            const requester =
              active?.requestedBy?.name ||
              active?.requestedBy?.username ||
              'another user';
            this.errorHandler.showWarning(
              `A pending QC request already exists by ${requester}.`,
              'Already Requested'
            );
            return;
          }
          this.selectedMachineForUpload = machine;
          this.selectedFiles = [];
          this.uploadNotes = '';
          this.uploadReportLink = '';
          this.reportLinkTouched = false;
          this.reportLinkErrorMsg = null;
          this.showDocumentModal = true;
        },
        error: () => {
          // if check fails, still allow; server will enforce
          this.selectedMachineForUpload = machine;
          this.selectedFiles = [];
          this.uploadNotes = '';
          this.uploadReportLink = '';
          this.reportLinkTouched = false;
          this.reportLinkErrorMsg = null;
          this.showDocumentModal = true;
        },
      });
  }

  onFileSelected(event: any): void {
    const files = event.target.files;
    if (files && files.length > 0) {
      this.selectedFiles = Array.from(files);
    }
  }

  onReportLinkInput(value: string): void {
    this.uploadReportLink = value || '';
    this.reportLinkTouched = true;
    this.reportLinkErrorMsg = this.validateOptionalUrl(this.uploadReportLink);
  }

  private validateOptionalUrl(value: string): string | null {
    const trimmed = (value || '').trim();
    if (!trimmed) return null; // optional
    try {
      const u = new URL(trimmed);
      if (!/^https?:$/i.test(u.protocol))
        return 'URL must start with http or https';
      return null;
    } catch {
      return 'Enter a valid URL (e.g., https://...)';
    }
  }

  onUploadSubmit(): void {
    if (!this.selectedMachineForUpload || this.selectedFiles.length === 0) {
      this.errorHandler.showServerError();
      return;
    }

    // Final guard: prevent submission if a pending approval exists for this machine
    const mid =
      this.selectedMachineForUpload && this.selectedMachineForUpload._id
        ? this.selectedMachineForUpload._id
        : '';
    if (!mid) {
      this.errorHandler.showServerError();
      return;
    }
    const sub = this.qcEntryService
      .getQCApprovalsByMachine(mid, { page: 1, limit: 5 })
      .subscribe({
        next: res => {
          const approvals = (res as any)?.data?.approvals || [];
          const active = approvals.find((a: any) => a?.status !== 'REJECTED');
          if (active) {
            const requester =
              active?.requestedBy?.name ||
              active?.requestedBy?.username ||
              'another user';
            this.errorHandler.showWarning(
              `A pending QC request already exists by ${requester}.`,
              'Already Requested'
            );
            sub.unsubscribe();
            return;
          }
          sub.unsubscribe();
          this.submitUploadForm();
        },
        error: () => {
          sub.unsubscribe();
          this.submitUploadForm();
        },
      });
  }

  private submitUploadForm(): void {
    // Validate report link as proper URL (http/https) only if provided
    if (this.uploadReportLink.trim()) {
      const msg = this.validateOptionalUrl(this.uploadReportLink);
      this.reportLinkTouched = true;
      this.reportLinkErrorMsg = msg;
      if (msg) return;
    }

    this.uploading = true;
    this.uploadProgress = 0;

    // Create QC Entry via multipart as required by backend (/api/qc-machines)
    const formData = new FormData();
    formData.append(
      'machine_id',
      (this.selectedMachineForUpload as Machine)._id
    );
    if (this.uploadReportLink.trim()) {
      formData.append('report_link', this.uploadReportLink.trim());
    }
    this.selectedFiles.forEach(file => formData.append('files', file));
    if (this.uploadNotes.trim()) {
      formData.append(
        'metadata',
        JSON.stringify({ note: this.uploadNotes.trim() })
      );
    }

    this.api.post<any>('/qc-machines', formData).subscribe({
      next: () => {
        this.uploading = false;
        this.uploadProgress = 100;
        this.showDocumentModal = false;
        this.selectedFiles = [];
        this.selectedMachineForUpload = null;
        this.uploadNotes = '';
        this.uploadReportLink = '';
        this.errorHandler.showSuccess(
          'QC entry created and approval requested successfully'
        );
        // Navigate to QC approval management after creating the request
        try {
          // Router is not injected in this component; use direct location change
          window.location.href = '/qc/approval-management';
        } catch {
          this.loadMachines();
        }
      },
      error: () => {
        this.uploading = false;
        this.uploadProgress = 0;
        this.errorHandler.showServerError();
      },
    });
  }

  onCancelUpload(): void {
    this.showDocumentModal = false;
    this.selectedFiles = [];
    this.selectedMachineForUpload = null;
    this.uploadNotes = '';
    this.uploadReportLink = '';
    this.uploading = false;
    this.uploadProgress = 0;
  }

  // Build set of machineIds having a PENDING QC approval to exclude from selection
  private fetchBlockedApprovalsSet(): Promise<void> {
    return new Promise(resolve => {
      this.qcEntryService.getQCApprovals({ page: 1, limit: 1000 }).subscribe({
        next: res => {
          const approvals = (res as any)?.data?.approvals || [];
          const ids = new Set<string>();
          approvals.forEach((a: any) => {
            const mid =
              a?.machineId && typeof a.machineId === 'object'
                ? a.machineId._id
                : a?.machineId;
            // Block if status is not REJECTED (i.e., PENDING/APPROVED/CANCELLED)
            if (mid && a?.status !== 'REJECTED') ids.add(String(mid));
          });
          this.blockedApprovalMachineIds = ids;
          resolve();
        },
        error: () => {
          this.blockedApprovalMachineIds = new Set();
          resolve();
        },
      });
    });
  }

  // Entry creation modal state
  showEntryModal = false;
  entryNotes = '';
  entryQualityScore: number | null = null;
  entryInspectionDate: string = '';
  entryNextInspectionDate: string = '';
  entryReportLink = '';
  creatingEntries = false;

  openEntryModal(): void {
    this.entryNotes = '';
    this.entryQualityScore = null;
    this.entryInspectionDate = '';
    this.entryNextInspectionDate = '';
    this.entryReportLink = '';
    this.showEntryModal = true;
  }

  cancelEntryModal(): void {
    if (this.creatingEntries) return;
    this.showEntryModal = false;
  }

  submitEntryCreation(): void {
    if (this.creatingEntries) return;
    const selectedMachineIds = Array.from(this.selectedMachines);
    if (selectedMachineIds.length === 0) return;

    this.creatingEntries = true;
    this.loaderService.showGlobalLoader('Creating QC entries...');

    const createPromises = selectedMachineIds.map(machineId => {
      const payload: Partial<
        import('../../../../core/services/qc-entry.service').QCEntry
      > = {
        machineId,
        qcNotes: this.entryNotes || undefined,
        qualityScore:
          this.entryQualityScore === null ? undefined : this.entryQualityScore,
        inspectionDate: this.entryInspectionDate || undefined,
        nextInspectionDate: this.entryNextInspectionDate || undefined,
        reportLink: this.entryReportLink || undefined,
      };
      return this.qcEntryService.createQCEntry(payload).toPromise();
    });

    Promise.all(createPromises)
      .then(() => {
        this.errorHandler.showSuccess('QC entries created successfully');
        this.showEntryModal = false;
        this.selectedMachines.clear();
        this.selectAll = false;
        this.loadMachines();
      })
      .catch(() => {
        this.errorHandler.showServerError();
      })
      .finally(() => {
        this.creatingEntries = false;
        this.loaderService.hideGlobalLoader();
      });
  }

  // Utility methods
  imageUrl(path: string): string {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const base = environment.apiUrl.replace(/\/?api\/?$/, '');
    if (path.startsWith('/')) return `${base}${path}`;
    return `${base}/${path}`;
  }

  getCategoryName(machine: Machine): string {
    return machine?.category_id?.name || 'Unknown';
  }

  getCategoryDisplayName(cat: any): string {
    if (typeof cat === 'string') return cat;
    if (cat?.name) return cat.name;
    return 'Unknown';
  }

  getStatusClass(machine: Machine): string {
    if (machine.is_approved && machine.is_active) {
      return 'bg-success text-white';
    }
    if (machine.is_approved && !machine.is_active) {
      return 'bg-warning text-white';
    }
    return 'bg-gray-500 text-white';
  }

  getStatusText(machine: Machine): string {
    if (machine.is_approved && machine.is_active) {
      return 'Active';
    }
    if (machine.is_approved && !machine.is_active) {
      return 'Inactive';
    }
    return 'Pending';
  }

  formatDate(dateString: string): string {
    return dateString ? new Date(dateString).toLocaleDateString() : '-';
  }

  getMetadataValue(machine: Machine, key: string): string {
    if (Array.isArray(machine.metadata)) {
      const metadata = machine.metadata.find((m: any) => m.key === key);
      return metadata?.value || '-';
    } else if (machine.metadata && typeof machine.metadata === 'object') {
      return (
        (machine.metadata as Record<string, unknown>)[key]?.toString() || '-'
      );
    }
    return '-';
  }

  trackByMachineId(index: number, machine: Machine): string {
    return machine._id;
  }

  get Math() {
    return Math;
  }

  // trackBy helpers used in template
  trackById(_index: number, item: { _id?: string }): string {
    return item?._id || '';
  }
  trackByIndex(index: number): number {
    return index;
  }

  getMachineInitials(name?: string): string {
    if (!name) return 'NA';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  // Details modal state and actions (matching admin structure)
  viewVisible = false;
  selected: Machine | null = null;
  documentsVisible = false;
  // lightbox preview like admin
  lightboxImages: string[] = [];
  lightboxIndex = 0;

  openView(machine: Machine): void {
    // Open immediately with the row data, then refresh from server like admin does
    this.selected = this.normalizeMachine(machine);
    this.viewVisible = true;

    const id = machine?._id;
    if (!id) return;
    this.api.get<any>(`/machines/${id}`).subscribe({
      next: res => {
        const data = res?.data || res;
        const full = data?.machine || data;
        if (full) {
          this.selected = this.normalizeMachine(full as any);
        }
      },
      error: () => {
        // keep the initially set data
      },
    });
  }

  getSubcategoryDisplayName(subcategory: any): string {
    if (typeof subcategory === 'string') return subcategory;
    if (subcategory?.name) return subcategory.name;
    return '-';
  }

  // Lightbox helpers (mirror admin)
  openPreview(images: string[], index: number = 0): void {
    if (!images || images.length === 0) return;
    this.lightboxImages = images;
    this.lightboxIndex = Math.max(0, Math.min(index, images.length - 1));
  }
  closeLightbox(): void {
    this.lightboxImages = [];
    this.lightboxIndex = 0;
  }
  lightboxPrev(): void {
    if (!this.lightboxImages.length) return;
    this.lightboxIndex =
      (this.lightboxIndex - 1 + this.lightboxImages.length) %
      this.lightboxImages.length;
  }
  lightboxNext(): void {
    if (!this.lightboxImages.length) return;
    this.lightboxIndex = (this.lightboxIndex + 1) % this.lightboxImages.length;
  }
  lightboxGo(i: number): void {
    if (i < 0 || i >= this.lightboxImages.length) return;
    this.lightboxIndex = i;
  }

  // Normalize incoming machine to ensure metadata is key/value array
  private normalizeMachine(m: any): Machine {
    let normalizedMetadata:
      | Array<{ key: string; value: string }>
      | Record<string, unknown>;
    const md: any = m?.metadata;
    if (Array.isArray(md)) {
      normalizedMetadata = md
        .filter((x: any) => x && typeof x.key === 'string')
        .map((x: any) => ({
          key: String(x.key),
          value: String(x.value ?? ''),
        }));
    } else if (md && typeof md === 'object') {
      // Keep as object for admin-style display
      normalizedMetadata = md;
    } else {
      normalizedMetadata = {};
    }
    return {
      ...m,
      metadata: normalizedMetadata,
    } as Machine;
  }

  trackByKey(_index: number, item: { key: string }): string {
    return item.key;
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  onSidebarCollapseChange(collapsed: boolean): void {
    this.sidebarCollapsed = collapsed;
  }

  // Documents modal methods (matching admin)
  openDocumentsModal(): void {
    this.documentsVisible = true;
  }

  downloadDocument(doc: any): void {
    // Create a temporary link element to trigger download
    const link = document.createElement('a');
    link.href = this.documentUrl(doc.file_path);
    link.download = doc.name;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  previewDocument(doc: any): void {
    // Open document in new tab for preview
    const url = this.documentUrl(doc.file_path);
    window.open(url, '_blank');
  }

  documentUrl(filePath: string): string {
    // Construct the full URL for the document using environment baseUrl
    const baseUrl = environment.apiUrl.replace(/\/?api\/?$/, '');
    // Ensure filePath starts with / if it doesn't already
    const normalizedPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
    return `${baseUrl}${normalizedPath}`;
  }
}
