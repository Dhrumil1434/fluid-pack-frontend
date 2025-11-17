import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
} from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

// Services
import { BaseApiService } from '../../../../core/services/base-api.service';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorHandlerService } from '../../../../core/services/error-handler.service';
import { QCEntryService } from '../../../../core/services/qc-entry.service';
import { environment } from '../../../../../environments/environment';

// Components
import { AdminSidebarComponent } from '../shared/admin-sidebar/admin-sidebar.component';
import { PageHeaderComponent } from '../../../../core/components/page-header/page-header.component';
import { ListFiltersComponent } from '../shared/list/list-filters.component';
import { ListTableShellComponent } from '../shared/list/list-table-shell.component';
import { TablePaginationComponent } from '../user-management/table-pagination.component';

interface QCApproval {
  _id?: string;
  machineId:
    | string
    | {
        _id: string;
        name: string;
        machine_sequence?: string;
        category_id: {
          _id: string;
          name: string;
        };
        images: string[];
      };
  requestedBy?: {
    _id: string;
    username: string;
    name: string;
  };
  approvalType: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  qcNotes?: string;
  requestNotes?: string;
  qualityScore?: number;
  inspectionDate?: string;
  nextInspectionDate?: string;
  approvedBy?: {
    _id: string;
    username: string;
    name: string;
  };
  rejectedBy?: {
    _id: string;
    username: string;
    name: string;
  };
  approvalDate?: string;
  rejectionReason?: string;
  approverNotes?: string;
  machineActivated?: boolean;
  activationDate?: string;
  documents?: Array<{
    _id?: string;
    filename?: string;
    originalName?: string;
    name?: string;
    path?: string;
    file_path?: string;
    mimeType?: string;
    size?: number;
    uploadedAt?: string;
  }>;
  qcEntryId?:
    | {
        _id?: string;
        files?: string[];
        [key: string]: any;
      }
    | string;
  createdAt?: string;
  updatedAt?: string;
}

interface ApprovalStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  activated: number;
}

@Component({
  selector: 'app-qc-entries',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    AdminSidebarComponent,
    PageHeaderComponent,
    ListFiltersComponent,
    ListTableShellComponent,
    TablePaginationComponent,
  ],
  templateUrl: './qc-entries.component.html',
  styleUrls: ['./qc-entries.component.css'],
})
export class QcEntriesComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  // UI State
  sidebarCollapsed = false;
  loading = false;
  actionLoading = false;

  // Data
  approvals: QCApproval[] = [];
  filteredApprovals: QCApproval[] = [];
  stats: ApprovalStats = {
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    activated: 0,
  };

  // Filters
  filtersForm: FormGroup;
  searchTerm = '';

  // Pagination
  page = 1;
  limit = 20;
  total = 0;
  pages = 0;

  // Selection
  selectedApprovals: Set<string> = new Set();
  selectAll = false;

  // Modals
  showApprovalDialog = false;
  showRejectionDialog = false;
  showDocumentDialog = false;
  viewVisible = false;
  selectedApproval: QCApproval | null = null;
  selectedMachine: any = null; // Full machine data for view modal
  approvalMode: 'approve' | 'reject' = 'approve';
  approvalNotes = '';
  rejectionReason = '';

  // Image carousel/lightbox
  lightboxImages: string[] = [];
  lightboxIndex = 0;

  constructor(
    private api: BaseApiService,
    private loaderService: LoaderService,
    private errorHandler: ErrorHandlerService,
    private qcEntryService: QCEntryService,
    private fb: FormBuilder
  ) {
    this.filtersForm = this.fb.group({
      search: [''],
      status: [''],
      approvalType: [''],
      dateFrom: [''],
      dateTo: [''],
      qualityScoreMin: [''],
      qualityScoreMax: [''],
      machineName: [''],
      requestedBy: [''],
      sortBy: ['createdAt'],
      sortOrder: ['desc'],
    });

    // Setup search debouncing
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.page = 1;
        this.loadApprovals();
      });
  }

  ngOnInit(): void {
    this.loadStats();
    this.loadApprovals();
    this.setupFormListeners();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setupFormListeners(): void {
    this.filtersForm
      .get('search')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        this.searchSubject.next(value);
      });

    this.filtersForm.valueChanges
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe(() => {
        this.page = 1;
        this.loadApprovals();
      });
  }

  loadStats(): void {
    this.qcEntryService.getQCApprovalStatistics().subscribe({
      next: (res: any) => {
        this.stats = res?.data || this.stats;
      },
      error: (_error: any) => {
        console.error('Failed to load approval statistics:', _error);
      },
    });
  }

  loadApprovals(): void {
    this.loading = true;
    this.loaderService.showGlobalLoader('Loading QC entries...');

    const formValue = this.filtersForm.value;
    const params: any = {
      page: this.page,
      limit: this.limit,
    };

    if (formValue.search?.trim()) {
      params.search = formValue.search.trim();
    }
    if (formValue.status) {
      params.status = formValue.status;
    }
    if (formValue.approvalType) {
      params.approvalType = formValue.approvalType;
    }
    if (formValue.dateFrom) {
      params.dateFrom = formValue.dateFrom;
    }
    if (formValue.dateTo) {
      params.dateTo = formValue.dateTo;
    }
    if (formValue.qualityScoreMin) {
      params.qualityScoreMin = formValue.qualityScoreMin;
    }
    if (formValue.qualityScoreMax) {
      params.qualityScoreMax = formValue.qualityScoreMax;
    }
    if (formValue.machineName?.trim()) {
      params.machineName = formValue.machineName.trim();
    }
    if (formValue.requestedBy?.trim()) {
      params.requestedBy = formValue.requestedBy.trim();
    }
    if (formValue.sortBy) {
      params.sortBy = formValue.sortBy;
    }
    if (formValue.sortOrder) {
      params.sortOrder = formValue.sortOrder;
    }

    this.qcEntryService.getQCApprovals(params).subscribe({
      next: (res: any) => {
        console.log('QC Approvals API Response:', res);
        const data = res?.data || res;
        // Handle different response structures
        let approvalsArray: any[] = [];
        let totalCount = 0;
        let pagesCount = 0;

        if (Array.isArray(data)) {
          approvalsArray = data;
          totalCount = data.length;
          pagesCount = Math.ceil(totalCount / this.limit);
        } else if (data?.approvals && Array.isArray(data.approvals)) {
          approvalsArray = data.approvals;
          totalCount = data.total || data.approvals.length || 0;
          pagesCount = data.pages || Math.ceil(totalCount / this.limit);
        } else if (data && typeof data === 'object') {
          // Check if data itself contains approval-like objects
          const keys = Object.keys(data);
          if (
            keys.length > 0 &&
            data[keys[0]] &&
            Array.isArray(data[keys[0]])
          ) {
            approvalsArray = data[keys[0]];
            totalCount = data.total || approvalsArray.length || 0;
            pagesCount = data.pages || Math.ceil(totalCount / this.limit);
          }
        }

        // Normalize status values to uppercase and ensure _id is preserved
        this.approvals = approvalsArray.map((approval: any) => {
          // Ensure _id is preserved - check both _id and id fields
          // MongoDB aggregation returns _id as ObjectId, convert to string
          let approvalId = null;
          if (approval._id) {
            approvalId =
              typeof approval._id === 'object' && approval._id.toString
                ? approval._id.toString()
                : String(approval._id);
          } else if (approval.id) {
            approvalId =
              typeof approval.id === 'object' && approval.id.toString
                ? approval.id.toString()
                : String(approval.id);
          }

          if (!approvalId) {
            console.warn('⚠️ Approval missing ID:', approval);
          }

          const normalized = {
            ...approval,
            _id: approvalId,
            status: approval.status
              ? String(approval.status).toUpperCase()
              : 'PENDING',
          };

          console.log('📋 Approval normalized:', {
            originalStatus: approval.status,
            normalizedStatus: normalized.status,
            originalId: approval._id || approval.id,
            normalizedId: normalized._id,
            idType: typeof normalized._id,
            idLength: normalized._id?.length,
          });

          return normalized;
        }) as unknown as QCApproval[];

        this.total = totalCount;
        this.pages = pagesCount;
        this.filteredApprovals = [...this.approvals];
        console.log('Processed approvals:', this.approvals);
        console.log('Total:', this.total, 'Pages:', this.pages);
        console.log(
          'Pending approvals count:',
          this.approvals.filter(a => a.status === 'PENDING').length
        );
        this.loading = false;
        this.loaderService.hideGlobalLoader();
      },
      error: (error: any) => {
        console.error('Error loading QC entries:', error);
        this.errorHandler.showServerError();
        this.approvals = [];
        this.filteredApprovals = [];
        this.total = 0;
        this.pages = 0;
        this.loading = false;
        this.loaderService.hideGlobalLoader();
      },
    });
  }

  onPageChange(page: number): void {
    this.page = page;
    this.loadApprovals();
  }

  onLimitChange(limit: number): void {
    this.limit = limit;
    this.page = 1;
    this.loadApprovals();
  }

  reload(): void {
    this.page = 1;
    this.loadApprovals();
  }

  clearFilters(): void {
    this.filtersForm.reset({
      search: '',
      status: '',
      approvalType: '',
      dateFrom: '',
      dateTo: '',
      qualityScoreMin: '',
      qualityScoreMax: '',
      machineName: '',
      requestedBy: '',
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
    this.page = 1;
    this.loadApprovals();
  }

  onSearchChange(search: string): void {
    this.filtersForm.patchValue({ search });
    this.searchSubject.next(search);
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  onSidebarCollapseChange(collapsed: boolean): void {
    this.sidebarCollapsed = collapsed;
  }

  // Selection
  toggleApprovalSelection(approvalId: string | undefined): void {
    if (!approvalId) return;
    if (this.selectedApprovals.has(approvalId)) {
      this.selectedApprovals.delete(approvalId);
    } else {
      this.selectedApprovals.add(approvalId);
    }
    this.updateSelectAllState();
  }

  toggleSelectAll(): void {
    if (this.selectAll) {
      this.selectedApprovals.clear();
    } else {
      this.filteredApprovals.forEach(approval => {
        if (approval._id) {
          this.selectedApprovals.add(approval._id);
        }
      });
    }
    this.selectAll = !this.selectAll;
  }

  private updateSelectAllState(): void {
    this.selectAll =
      this.filteredApprovals.length > 0 &&
      this.filteredApprovals.every(
        approval => approval._id && this.selectedApprovals.has(approval._id)
      );
  }

  isApprovalSelected(approvalId: string | undefined): boolean {
    return approvalId ? this.selectedApprovals.has(approvalId) : false;
  }

  getSelectedCount(): number {
    return this.selectedApprovals.size;
  }

  // Actions
  onApproveApproval(approval: QCApproval): void {
    console.log('🟢 onApproveApproval called:', {
      approval,
      approvalId: approval._id,
      status: approval.status,
    });
    this.selectedApproval = approval;
    this.approvalMode = 'approve';
    this.approvalNotes = '';
    this.showApprovalDialog = true;
    console.log('🟢 showApprovalDialog set to:', this.showApprovalDialog);
  }

  onRejectApproval(approval: QCApproval): void {
    this.selectedApproval = approval;
    this.approvalMode = 'reject';
    this.rejectionReason = '';
    this.showRejectionDialog = true;
  }

  onConfirmApproval(): void {
    if (!this.selectedApproval) return;

    this.actionLoading = true;
    const notes =
      this.approvalMode === 'approve'
        ? this.approvalNotes
        : this.rejectionReason;

    // Ensure we have a valid ID - check both _id and id fields
    const approvalId =
      this.selectedApproval._id || (this.selectedApproval as any).id;

    if (!approvalId) {
      console.error('No approval ID found in:', this.selectedApproval);
      this.errorHandler.showWarning('Approval ID is missing');
      this.actionLoading = false;
      return;
    }

    console.log('🟡 Processing QC approval action:', {
      approvalId: approvalId,
      approvalIdType: typeof approvalId,
      approvalIdLength: approvalId?.length,
      action: this.approvalMode,
      notes: notes || '',
      fullApproval: this.selectedApproval,
    });

    // Ensure approvalId is a string and valid MongoDB ObjectId format (24 hex chars)
    if (!approvalId || typeof approvalId !== 'string') {
      console.error('❌ Invalid approval ID:', approvalId);
      this.errorHandler.showWarning('Invalid approval ID format');
      this.actionLoading = false;
      return;
    }

    if (approvalId.length !== 24) {
      console.warn('⚠️ Approval ID length is not 24:', approvalId.length);
    }

    this.qcEntryService
      .processQCApprovalAction(
        String(approvalId),
        this.approvalMode,
        notes || ''
      )
      .subscribe({
        next: res => {
          console.log('QC approval action success:', res);
          this.showApprovalDialog = false;
          this.showRejectionDialog = false;
          this.selectedApproval = null;
          this.approvalNotes = '';
          this.rejectionReason = '';
          this.loadApprovals();
          this.loadStats();
          this.errorHandler.showSuccess(
            res.message || 'Action completed successfully'
          );
        },
        error: (error: any) => {
          console.error('QC approval action error:', error);
          this.errorHandler.showServerError();
          this.actionLoading = false;
        },
        complete: () => {
          this.actionLoading = false;
        },
      });
  }

  onCancelApproval(): void {
    this.showApprovalDialog = false;
    this.showRejectionDialog = false;
    this.selectedApproval = null;
    this.approvalNotes = '';
    this.rejectionReason = '';
  }

  onViewApprovalDetails(approval: QCApproval): void {
    this.selectedApproval = approval;

    // Get machine ID - handle both string and object types
    let machineId: string | null = null;
    if (typeof approval.machineId === 'string') {
      machineId = approval.machineId;
    } else if (approval.machineId && typeof approval.machineId === 'object') {
      machineId = approval.machineId._id;
    }

    if (!machineId) {
      console.error('Machine ID not found in approval');
      this.errorHandler.showWarning('Machine information not available');
      return;
    }

    // Set initial machine data from approval if available
    if (approval.machineId && typeof approval.machineId === 'object') {
      this.selectedMachine = {
        ...approval.machineId,
        // Add any missing fields that might be needed
      };
    }

    this.viewVisible = true;

    // Fetch full machine details from API
    this.api.get<any>(`/machines/${machineId}`).subscribe({
      next: (res: any) => {
        const data = res?.data || res;
        const machine = data?.machine || data;
        if (machine) {
          this.selectedMachine = this.normalizeMachine(machine);
        }
      },
      error: (error: any) => {
        console.error('Error loading machine details:', error);
        // Keep the initial data from approval if available
        if (
          !this.selectedMachine &&
          approval.machineId &&
          typeof approval.machineId === 'object'
        ) {
          this.selectedMachine = approval.machineId;
        }
      },
    });
  }

  closeViewModal(): void {
    this.viewVisible = false;
    this.selectedMachine = null;
    this.selectedApproval = null;
  }

  // Normalize machine data
  private normalizeMachine(m: any): any {
    let normalizedMetadata: Record<string, unknown>;
    const md: any = m?.metadata;
    if (md && typeof md === 'object' && !Array.isArray(md)) {
      normalizedMetadata = md;
    } else {
      normalizedMetadata = {};
    }
    return {
      ...m,
      metadata: normalizedMetadata,
    };
  }

  // Image carousel/lightbox methods
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

  imageUrl(path: string): string {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const base = environment.apiUrl.replace(/\/?api\/?$/, '');
    if (path.startsWith('/')) return `${base}${path}`;
    return `${base}/${path}`;
  }

  // Documents modal methods (for machine documents from view modal)
  openDocumentsModal(): void {
    // This is called from view modal, so selectedMachine should be set
    this.showDocumentDialog = true;
  }

  downloadDocument(doc: any): void {
    const link = document.createElement('a');
    link.href = this.documentUrl(doc.file_path || doc.path || doc.filename);
    link.download = doc.originalName || doc.name || doc.filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  previewDocument(doc: any): void {
    const url = this.documentUrl(doc.file_path || doc.path || doc.filename);
    window.open(url, '_blank');
  }

  documentUrl(filePath: string): string {
    if (!filePath) return '';
    if (filePath.startsWith('http')) return filePath;
    const base = environment.apiUrl.replace(/\/?api\/?$/, '');
    const normalizedPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
    return `${base}${normalizedPath}`;
  }

  getSubcategoryDisplayName(subcategory: any): string {
    if (typeof subcategory === 'string') return subcategory;
    if (subcategory?.name) return subcategory.name;
    return '-';
  }

  trackByKey(_index: number, item: any): string {
    const key = item?.key ?? _index;
    return String(key);
  }

  // Helper methods for safe property access
  getMachineName(approval: QCApproval | null): string {
    if (!approval?.machineId) return 'Unknown Machine';
    if (typeof approval.machineId === 'object' && approval.machineId) {
      return approval.machineId.name || 'Unknown Machine';
    }
    return 'Unknown Machine';
  }

  getMachineCategoryName(approval: QCApproval | null): string {
    if (!approval?.machineId) return '-';
    if (
      typeof approval.machineId === 'object' &&
      approval.machineId?.category_id
    ) {
      return approval.machineId.category_id.name || '-';
    }
    return '-';
  }

  getMachineImages(approval: QCApproval | null): string[] {
    if (!approval?.machineId) return [];
    if (typeof approval.machineId === 'object' && approval.machineId?.images) {
      return Array.isArray(approval.machineId.images)
        ? approval.machineId.images
        : [];
    }
    return [];
  }

  getDocumentName(doc: any): string {
    return doc?.name || doc?.originalName || doc?.filename || 'Document';
  }

  extractFileName(filePath: string): string {
    if (!filePath) return 'Document';
    try {
      const clean = filePath.split('?')[0];
      const parts = clean.split('/');
      return parts[parts.length - 1] || 'Document';
    } catch {
      return 'Document';
    }
  }

  downloadFileFromPath(filePath: string): void {
    const url = this.documentUrl(filePath);
    const link = document.createElement('a');
    link.href = url;
    link.download = this.extractFileName(filePath);
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  previewFileFromPath(filePath: string): void {
    const url = this.documentUrl(filePath);
    window.open(url, '_blank');
  }

  getQCEntryFiles(approval: QCApproval | null): string[] {
    if (!approval?.qcEntryId) return [];
    if (typeof approval.qcEntryId === 'string') return [];
    if (typeof approval.qcEntryId === 'object' && approval.qcEntryId?.files) {
      return Array.isArray(approval.qcEntryId.files)
        ? approval.qcEntryId.files
        : [];
    }
    return [];
  }

  hasQCEntryFiles(approval: QCApproval | null): boolean {
    return this.getQCEntryFiles(approval).length > 0;
  }

  getApprovalMachineImage(approval: QCApproval | null): string {
    if (!approval?.machineId) return '';
    if (
      typeof approval.machineId === 'object' &&
      approval.machineId &&
      'images' in approval.machineId &&
      approval.machineId.images &&
      approval.machineId.images.length > 0
    ) {
      return approval.machineId.images[0];
    }
    return '';
  }

  getApprovalMachineName(approval: QCApproval | null): string {
    if (!approval?.machineId) return '';
    if (
      typeof approval.machineId === 'object' &&
      approval.machineId &&
      'name' in approval.machineId
    ) {
      return approval.machineId.name || '';
    }
    return '';
  }

  getApprovalMachineCategoryName(approval: QCApproval | null): string {
    if (!approval?.machineId) return '-';
    if (
      typeof approval.machineId === 'object' &&
      approval.machineId &&
      'category_id' in approval.machineId &&
      approval.machineId.category_id
    ) {
      return approval.machineId.category_id.name || '-';
    }
    return '-';
  }

  getApprovalMachineSequence(approval: QCApproval | null): string | null {
    if (!approval?.machineId) return null;
    if (
      typeof approval.machineId === 'object' &&
      approval.machineId &&
      'machine_sequence' in approval.machineId
    ) {
      const sequence = approval.machineId.machine_sequence;
      return typeof sequence === 'string' ? sequence : null;
    }
    return null;
  }

  hasApprovalMachineImages(approval: QCApproval | null): boolean {
    if (!approval?.machineId) return false;
    if (typeof approval.machineId !== 'object' || !approval.machineId)
      return false;
    if (!('images' in approval.machineId)) return false;
    if (!approval.machineId.images || !Array.isArray(approval.machineId.images))
      return false;
    return approval.machineId.images.length > 0;
  }

  formatSequenceWithQC(sequence: string | null | undefined): string {
    if (!sequence) return '-';
    return `${sequence}-QC`;
  }

  hasQCDocuments(approval: QCApproval | null): boolean {
    if (!approval) return false;
    const hasDocs = !!(
      approval.documents &&
      Array.isArray(approval.documents) &&
      approval.documents.length > 0
    );
    console.log('🔍 Checking QC documents for approval:', {
      approvalId: approval._id,
      hasDocuments: hasDocs,
      documentsCount: approval.documents?.length || 0,
      documents: approval.documents,
    });
    return hasDocs;
  }

  hasAnyDocuments(approval: QCApproval | null): boolean {
    if (!approval) return false;
    return (
      (approval.documents &&
        Array.isArray(approval.documents) &&
        approval.documents.length > 0) ||
      this.hasQCEntryFiles(approval)
    );
  }

  onActivateMachine(approval: QCApproval): void {
    if (!approval.machineActivated && approval._id) {
      this.qcEntryService.activateMachine(approval._id).subscribe({
        next: _res => {
          this.loadApprovals();
          this.loadStats();
          this.errorHandler.showSuccess('Machine activated successfully');
        },
        error: _error => {
          this.errorHandler.showServerError();
        },
      });
    }
  }

  // Document management
  onViewDocuments(approval: QCApproval): void {
    // Always re-fetch approval by ID to leverage backend population of qcEntryId.files
    const id = approval?._id;
    this.selectedApproval = approval;
    this.selectedMachine = null; // Clear machine to show QC approval documents

    if (id) {
      this.qcEntryService.getQCApprovalById(id).subscribe({
        next: (res: any) => {
          try {
            const full = res?.data || res;
            this.selectedApproval = full as any;
            console.log('📄 Fetched QC approval with documents:', {
              approvalId: full?._id,
              documents: full?.documents,
              documentsCount: full?.documents?.length || 0,
              qcEntryId: full?.qcEntryId,
              qcEntryFiles: full?.qcEntryId?.files,
              hasDocuments: !!(full?.documents && full.documents.length > 0),
              hasQCEntryFiles: !!(
                full?.qcEntryId &&
                typeof full.qcEntryId === 'object' &&
                full.qcEntryId?.files &&
                full.qcEntryId.files.length > 0
              ),
            });
          } catch (error) {
            console.error('Error processing approval data:', error);
          } finally {
            this.showDocumentDialog = true;
          }
        },
        error: (error: any) => {
          console.error('Error fetching approval details:', error);
          // Use the approval data we already have
          this.showDocumentDialog = true;
        },
      });
    } else {
      this.showDocumentDialog = true;
    }
  }

  onDownloadDocument(_approval: QCApproval, document: any): void {
    const url = this.documentUrl(
      document.file_path || document.path || document.filename
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = document.originalName || document.name || document.filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  onDeleteDocument(approval: QCApproval, documentId: string): void {
    if (!approval._id) return;

    this.api
      .delete<any>(`/qc-approvals/${approval._id}/documents/${documentId}`)
      .subscribe({
        next: _res => {
          this.loadApprovals();
          this.errorHandler.showSuccess('Document deleted successfully');
        },
        error: _error => {
          this.errorHandler.showServerError();
        },
      });
  }

  // Utility methods
  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      PENDING: 'bg-yellow-500 text-white',
      APPROVED: 'bg-green-500 text-white',
      REJECTED: 'bg-red-500 text-white',
      CANCELLED: 'bg-gray-500 text-white',
    };
    const normalized = String(status || '').toUpperCase();
    return classes[normalized] || 'bg-gray-500 text-white';
  }

  getStatusText(status: string): string {
    if (!status) return 'Unknown';
    const normalized = String(status).toUpperCase();
    const statusMap: Record<string, string> = {
      PENDING: 'Pending',
      APPROVED: 'Approved',
      REJECTED: 'Rejected',
      CANCELLED: 'Cancelled',
    };
    return (
      statusMap[normalized] ||
      normalized.charAt(0) + normalized.slice(1).toLowerCase()
    );
  }

  getApprovalTypeText(type: string): string {
    return type
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  getQualityScoreClass(score: number): string {
    if (score >= 90) return 'text-success font-semibold';
    if (score >= 70) return 'text-warning font-semibold';
    return 'text-error font-semibold';
  }

  getMachineImageUrl(imagePath: string): string {
    if (!imagePath) return '';
    if (imagePath.startsWith('http')) return imagePath;
    const base = environment.apiUrl.replace(/\/?api\/?$/, '');
    if (imagePath.startsWith('/')) return `${base}${imagePath}`;
    return `${base}/uploads/machines/${imagePath}`;
  }

  trackByApprovalId(index: number, approval: QCApproval): string {
    return approval._id || '';
  }

  formatDate(dateString: string | undefined): string {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  }

  get Math() {
    return Math;
  }

  // trackBy helpers used in template
  trackByIndex(index: number): number {
    return index;
  }
}
