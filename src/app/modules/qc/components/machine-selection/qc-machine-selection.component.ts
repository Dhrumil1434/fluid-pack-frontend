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

// Components
import { QcSidebarComponent } from '../shared/qc-sidebar/qc-sidebar.component';
import { TablePaginationComponent } from '../../../admin/components/user-management/table-pagination.component';

interface Machine {
  _id: string;
  name: string;
  category_id: {
    _id: string;
    name: string;
    description?: string;
  } | null;
  // Normalize metadata to array of key/value for client-side filtering,
  // while still accepting object from backend
  metadata: Array<{
    key: string;
    value: string;
  }>;
  images: string[];
  created_by?: {
    _id?: string;
    username?: string;
    email?: string;
    name?: string;
  } | null;
  createdAt: string;
  is_approved: boolean;
  approvalStatus?: string;
  is_active: boolean;
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

  // Filters
  searchTerm = '';
  selectedCategory = '';
  selectedStatus = '';
  dateFrom = '';
  dateTo = '';
  sortBy = 'created_desc';
  metadataKey = '';
  metadataValue = '';
  technicianId = '';

  // Pagination
  currentPage = 1;
  pageSize = 20;
  totalCount = 0;
  totalPages = 0;

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
    private qcEntryService: QCEntryService
  ) {
    // Setup search debouncing
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentPage = 1;
        this.loadMachines();
      });
  }

  ngOnInit(): void {
    this.loadCategories();
    this.loadMachines();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCategories(): void {
    // Backend mounts categories at /api/admin/category
    // Use active list for selection
    this.api.get<any>('/admin/category/active').subscribe({
      next: res => {
        const data = res?.data || res;
        // Support either { categories: [] } or [] directly
        this.categories = Array.isArray(data) ? data : data?.categories || [];
      },
      error: error => {
        console.error('Failed to load categories:', error);
      },
    });
  }

  loadMachines(): void {
    this.loading = true;
    this.loaderService.showGlobalLoader('Loading machines...');

    const params: any = {
      page: this.currentPage,
      limit: this.pageSize,
      // Always restrict to approved machines for QC selection
      is_approved: true,
    };

    if (this.searchTerm.trim()) {
      params.search = this.searchTerm.trim();
    }
    if (this.selectedCategory) {
      params.category_id = this.selectedCategory;
    }
    if (this.technicianId.trim()) {
      params.created_by = this.technicianId.trim();
    }

    // Sorting: created/name with asc/desc (backend currently sorts internally; keep params for future support)
    const [sortField, sortDir] = this.sortBy.split('_');
    params.sortBy = sortField === 'name' ? 'name' : 'createdAt';
    params.sortOrder = sortDir === 'asc' ? 'asc' : 'desc';

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
        if (this.selectedStatus === 'active') {
          refined = refined.filter(m => !!m.is_active);
        } else if (this.selectedStatus === 'inactive') {
          refined = refined.filter(m => !m.is_active);
        }
        if (this.dateFrom) {
          const from = new Date(this.dateFrom);
          refined = refined.filter(m => new Date(m.createdAt) >= from);
        }
        if (this.dateTo) {
          const to = new Date(this.dateTo);
          to.setHours(23, 59, 59, 999);
          refined = refined.filter(m => new Date(m.createdAt) <= to);
        }
        if (this.metadataKey && this.metadataValue) {
          const key = this.metadataKey.trim().toLowerCase();
          const val = this.metadataValue.trim().toLowerCase();
          refined = refined.filter(
            m =>
              Array.isArray(m.metadata) &&
              m.metadata.some(
                md =>
                  (md.key || '').toLowerCase() === key &&
                  (md.value || '').toLowerCase().includes(val)
              )
          );
        }

        // Exclude machines that already have a non-rejected QC approval
        this.fetchBlockedApprovalsSet()
          .then(() => {
            refined = refined.filter(
              m => !this.blockedApprovalMachineIds.has(m._id)
            );

            this.machines = refined;
            this.totalCount = data.total || refined.length;
            this.totalPages =
              data.pages || Math.ceil(this.totalCount / this.pageSize);
            this.filteredMachines = [...this.machines];
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
            this.totalCount = data.total || refined.length;
            this.totalPages =
              data.pages || Math.ceil(this.totalCount / this.pageSize);
            this.filteredMachines = [...this.machines];
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

  onSearchChange(): void {
    this.searchSubject.next(this.searchTerm);
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.loadMachines();
  }

  onSortChange(): void {
    this.currentPage = 1;
    this.loadMachines();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedCategory = '';
    this.selectedStatus = '';
    this.dateFrom = '';
    this.dateTo = '';
    this.metadataKey = '';
    this.metadataValue = '';
    this.technicianId = '';
    this.sortBy = 'created_desc';
    this.currentPage = 1;
    this.loadMachines();
  }

  // Pagination
  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadMachines();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
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
    const metadata = machine.metadata?.find(m => m.key === key);
    return metadata?.value || '-';
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

  // Details modal state and actions
  showDetailsModal = false;
  detailsMachine: Machine | null = null;
  detailsImageIndex = 0;
  // lightbox preview like admin
  lightboxImages: string[] = [];
  lightboxIndex = 0;

  viewMachineDetails(machine: Machine): void {
    // Open immediately with the row data, then refresh from server like admin does
    this.detailsMachine = this.normalizeMachine(machine);
    this.detailsImageIndex = 0;
    this.showDetailsModal = true;

    const id = machine?._id;
    if (!id) return;
    this.api.get<any>(`/machines/${id}`).subscribe({
      next: res => {
        const data = res?.data || res;
        const full = data?.machine || data;
        if (full) {
          this.detailsMachine = this.normalizeMachine(full as any);
          this.detailsImageIndex = 0;
        }
      },
      error: () => {
        // keep the initially set data
      },
    });
  }

  closeDetails(): void {
    this.showDetailsModal = false;
    this.detailsMachine = null;
    this.detailsImageIndex = 0;
  }

  prevDetailsImage(): void {
    if (
      !this.detailsMachine ||
      !this.detailsMachine.images ||
      this.detailsMachine.images.length === 0
    )
      return;
    const total = this.detailsMachine.images.length;
    this.detailsImageIndex = (this.detailsImageIndex - 1 + total) % total;
  }

  nextDetailsImage(): void {
    if (
      !this.detailsMachine ||
      !this.detailsMachine.images ||
      this.detailsMachine.images.length === 0
    )
      return;
    const total = this.detailsMachine.images.length;
    this.detailsImageIndex = (this.detailsImageIndex + 1) % total;
  }

  getDetailsImageUrl(): string {
    const current =
      this.detailsMachine && Array.isArray(this.detailsMachine.images)
        ? this.detailsMachine.images[this.detailsImageIndex] || ''
        : '';
    return current;
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
  private normalizeMachine(m: Machine): Machine {
    let normalizedMetadata: Array<{ key: string; value: string }>;
    const md: any = (m as any).metadata;
    if (Array.isArray(md)) {
      normalizedMetadata = md
        .filter((x: any) => x && typeof x.key === 'string')
        .map((x: any) => ({
          key: String(x.key),
          value: String(x.value ?? ''),
        }));
    } else if (md && typeof md === 'object') {
      normalizedMetadata = Object.keys(md).map(k => ({
        key: k,
        value: String(md[k] ?? ''),
      }));
    } else {
      normalizedMetadata = [];
    }
    return {
      ...m,
      metadata: normalizedMetadata,
    } as Machine;
  }
}
