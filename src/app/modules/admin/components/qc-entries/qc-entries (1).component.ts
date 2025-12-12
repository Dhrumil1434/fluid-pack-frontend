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
import { CategoryService } from '../../../../core/services/category.service';
import { ExportService } from '../../../../core/services/export.service';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { environment } from '../../../../../environments/environment';
import { firstValueFrom } from 'rxjs';

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
    ToastModule,
  ],
  providers: [MessageService],
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

  // Export state
  exportingExcel = false;
  exportingPdf: string | null = null;

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
  limit = 10;
  total = 0;
  pages = 0;

  // Selection
  selectedApprovals: Set<string> = new Set();
  selectAll = false;

  // Modals
  showApprovalDialog = false;
  showRejectionDialog = false;
  showDocumentDialog = false;
  showEditDialog = false;
  showDeleteDialog = false;
  showCreateQCEntryModal = false;
  viewVisible = false;
  selectedApproval: QCApproval | null = null;
  selectedMachine: any = null; // Full machine data for view modal
  selectedQCEntry: any = null; // QC Entry data for view modal
  approvalMode: 'approve' | 'reject' = 'approve';
  approvalNotes = '';
  rejectionReason = '';

  // Image carousel/lightbox
  lightboxImages: string[] = [];
  lightboxIndex = 0;

  // Create QC Entry Modal State
  machines: any[] = [];
  filteredMachines: any[] = [];
  categories: any[] = [];
  subcategories: any[] = [];
  machineFilters: {
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
    is_approved: true,
  };
  machinePage = 1;
  machineLimit = 20;
  machineTotal = 0;
  machinePages = 0;
  selectedMachineForQC: any = null;
  qcEntryForm: FormGroup;
  selectedFiles: File[] = [];
  selectedImages: File[] = [];
  selectedDocuments: File[] = [];
  uploadingQC = false;

  // Machine fields
  qcEntryName = '';
  qcEntryCategoryId = '';
  qcEntrySubcategoryId = '';
  qcEntryMachineSequence = '';
  qcEntryPartyName = '';
  qcEntryLocation = '';
  qcEntryMobileNumber = '';
  qcEntryDispatchDate = '';

  // QC-specific fields
  qcEntryNotes = '';
  qcEntryQualityScore: number | null = null;
  qcEntryInspectionDate = '';
  qcEntryQcDate = '';
  qcEntryNextInspectionDate = '';
  qcEntryReportLink = '';
  reportLinkTouched = false;
  reportLinkErrorMsg: string | null = null;
  metadataKeySuggestions: string[] = [];
  showMetadataKeySuggestions = false;
  private blockedApprovalMachineIds: Set<string> = new Set();
  private machineSearchSubject = new Subject<string>();

  // Autocomplete suggestions
  requestedBySuggestions: string[] = [];
  showRequestedBySuggestions = false;
  partyNameSuggestions: string[] = [];
  showPartyNameSuggestions = false;
  locationSuggestions: string[] = [];
  showLocationSuggestions = false;
  private suggestionDebounceTimers: { [key: string]: any } = {};

  // Edit Modal State
  editForm: FormGroup;
  selectedQCEntryForEdit: any = null;
  existingImages: string[] = [];
  existingDocuments: Array<{
    name: string;
    file_path: string;
    document_type?: string;
    _id?: string;
  }> = [];
  existingFiles: string[] = [];
  imagesToDelete: string[] = [];
  documentsToDelete: string[] = [];
  filesToDelete: string[] = [];
  editSelectedImages: File[] = [];
  editSelectedDocuments: File[] = [];
  editSelectedFiles: File[] = [];

  constructor(
    private api: BaseApiService,
    private loaderService: LoaderService,
    private errorHandler: ErrorHandlerService,
    private qcEntryService: QCEntryService,
    private categoryService: CategoryService,
    private exportService: ExportService,
    private messageService: MessageService,
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
      machineSequence: [''],
      requestedBy: [''],
      category: [''],
      subcategory: [''],
      partyName: [''],
      location: [''],
      mobileNumber: [''],
      dispatchDateFrom: [''],
      dispatchDateTo: [''],
      qcDateFrom: [''],
      qcDateTo: [''],
      inspectionDateFrom: [''],
      inspectionDateTo: [''],
      sortBy: ['createdAt'],
      sortOrder: ['desc'],
    });

    this.qcEntryForm = this.fb.group({
      machineId: ['', []],
      // Machine fields
      name: ['', []],
      category_id: ['', []],
      subcategory_id: [''],
      machine_sequence: [''],
      party_name: ['', []],
      location: ['', []],
      mobile_number: ['', []],
      dispatch_date: [''],
      // QC-specific fields
      qcNotes: [''],
      qualityScore: [null],
      inspectionDate: [''],
      qc_date: [''],
      nextInspectionDate: [''],
      reportLink: [''],
    });

    this.editForm = this.fb.group({
      // Machine fields
      name: [''],
      category_id: [''],
      subcategory_id: [''],
      machine_sequence: [''],
      party_name: [''],
      location: [''],
      mobile_number: [''],
      dispatch_date: [''],
      // QC-specific fields
      qcNotes: [''],
      qualityScore: [null],
      inspectionDate: [''],
      qc_date: [''],
      nextInspectionDate: [''],
      reportLink: [''],
      is_active: [false],
      approval_status: ['PENDING'],
    });

    // Auto-activate when approval status is set to APPROVED
    this.editForm
      .get('approval_status')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(status => {
        if (status === 'APPROVED') {
          this.editForm.patchValue({ is_active: true }, { emitEvent: false });
        }
      });

    // Setup search debouncing
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.page = 1;
        this.loadApprovals();
      });

    // Setup machine search debouncing
    this.machineSearchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.machinePage = 1;
        this.loadMachinesForQC();
      });
  }

  ngOnInit(): void {
    this.loadStats();
    this.loadApprovals();
    this.setupFormListeners();
    this.loadCategories();
    this.setupAutocompleteListeners();
  }

  setupAutocompleteListeners(): void {
    // RequestedBy autocomplete
    this.filtersForm
      .get('requestedBy')
      ?.valueChanges.pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(value => {
        if (value && value.trim().length > 0) {
          this.loadSuggestions('requestedBy', value.trim());
        } else {
          this.requestedBySuggestions = [];
        }
      });

    // PartyName autocomplete
    this.filtersForm
      .get('partyName')
      ?.valueChanges.pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(value => {
        if (value && value.trim().length > 0) {
          this.loadSuggestions('partyName', value.trim());
        } else {
          this.partyNameSuggestions = [];
        }
      });

    // Location autocomplete
    this.filtersForm
      .get('location')
      ?.valueChanges.pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(value => {
        if (value && value.trim().length > 0) {
          this.loadSuggestions('location', value.trim());
        } else {
          this.locationSuggestions = [];
        }
      });
  }

  loadSuggestions(
    field: 'requestedBy' | 'partyName' | 'location',
    query: string
  ): void {
    // Clear previous timer
    if (this.suggestionDebounceTimers[field]) {
      clearTimeout(this.suggestionDebounceTimers[field]);
    }

    // Debounce the API call
    this.suggestionDebounceTimers[field] = setTimeout(() => {
      this.qcEntryService.getSearchSuggestions(field, query).subscribe({
        next: (res: any) => {
          const suggestions = res?.data?.suggestions || [];
          switch (field) {
            case 'requestedBy':
              this.requestedBySuggestions = suggestions;
              break;
            case 'partyName':
              this.partyNameSuggestions = suggestions;
              break;
            case 'location':
              this.locationSuggestions = suggestions;
              break;
          }
        },
        error: () => {
          // Silently fail - don't show error for suggestions
          switch (field) {
            case 'requestedBy':
              this.requestedBySuggestions = [];
              break;
            case 'partyName':
              this.partyNameSuggestions = [];
              break;
            case 'location':
              this.locationSuggestions = [];
              break;
          }
        },
      });
    }, 300);
  }

  selectSuggestion(
    field: 'requestedBy' | 'partyName' | 'location',
    value: string
  ): void {
    this.filtersForm.patchValue({ [field]: value });
    switch (field) {
      case 'requestedBy':
        this.showRequestedBySuggestions = false;
        break;
      case 'partyName':
        this.showPartyNameSuggestions = false;
        break;
      case 'location':
        this.showLocationSuggestions = false;
        break;
    }
  }

  hideSuggestions(field: 'requestedBy' | 'partyName' | 'location'): void {
    // Delay hiding to allow click events to fire
    setTimeout(() => {
      switch (field) {
        case 'requestedBy':
          this.showRequestedBySuggestions = false;
          break;
        case 'partyName':
          this.showPartyNameSuggestions = false;
          break;
        case 'location':
          this.showLocationSuggestions = false;
          break;
      }
    }, 200);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setupFormListeners(): void {
    // Setup search field debouncing
    this.filtersForm
      .get('search')
      ?.valueChanges.pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(value => {
        this.searchSubject.next(value);
      });

    // Setup all filter fields with debouncing
    this.filtersForm.valueChanges
      .pipe(
        debounceTime(500), // Increased debounce time for better performance
        distinctUntilChanged((prev, curr) => {
          // Custom comparison to avoid unnecessary API calls
          return JSON.stringify(prev) === JSON.stringify(curr);
        }),
        takeUntil(this.destroy$)
      )
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

    // General search
    if (formValue.search?.trim()) {
      params.search = formValue.search.trim();
    }

    // Status and type filters
    if (formValue.status) {
      params.status = formValue.status;
    }
    if (formValue.approvalType) {
      params.approvalType = formValue.approvalType;
    }

    // Date range filters
    if (formValue.dateFrom) {
      params.dateFrom = formValue.dateFrom;
    }
    if (formValue.dateTo) {
      params.dateTo = formValue.dateTo;
    }

    // Quality score filters
    if (formValue.qualityScoreMin) {
      params.qualityScoreMin = formValue.qualityScoreMin;
    }
    if (formValue.qualityScoreMax) {
      params.qualityScoreMax = formValue.qualityScoreMax;
    }

    // Machine filters
    if (formValue.machineName?.trim()) {
      params.machineName = formValue.machineName.trim();
    }
    if (formValue.machineSequence?.trim()) {
      params.machineSequence = formValue.machineSequence.trim();
    }
    if (formValue.category?.trim()) {
      params.category = formValue.category.trim();
    }
    if (formValue.subcategory?.trim()) {
      params.subcategory = formValue.subcategory.trim();
    }

    // Machine details filters
    if (formValue.partyName?.trim()) {
      params.partyName = formValue.partyName.trim();
    }
    if (formValue.location?.trim()) {
      params.location = formValue.location.trim();
    }
    if (formValue.mobileNumber?.trim()) {
      params.mobileNumber = formValue.mobileNumber.trim();
    }

    // Dispatch date filters
    if (formValue.dispatchDateFrom) {
      params.dispatchDateFrom = formValue.dispatchDateFrom;
    }
    if (formValue.dispatchDateTo) {
      params.dispatchDateTo = formValue.dispatchDateTo;
    }

    // QC date filters
    if (formValue.qcDateFrom) {
      params.qcDateFrom = formValue.qcDateFrom;
    }
    if (formValue.qcDateTo) {
      params.qcDateTo = formValue.qcDateTo;
    }

    // Inspection date filters
    if (formValue.inspectionDateFrom) {
      params.inspectionDateFrom = formValue.inspectionDateFrom;
    }
    if (formValue.inspectionDateTo) {
      params.inspectionDateTo = formValue.inspectionDateTo;
    }

    // User filters
    if (formValue.requestedBy?.trim()) {
      params.requestedBy = formValue.requestedBy.trim();
    }

    // Sorting
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

        // Primary structure: { approvals: [], total: number, pages: number }
        if (data?.approvals && Array.isArray(data.approvals)) {
          approvalsArray = data.approvals;
          totalCount = data.total ?? 0;
          pagesCount = data.pages ?? Math.ceil(totalCount / this.limit);
        } else if (Array.isArray(data)) {
          // Fallback: if data is directly an array
          approvalsArray = data;
          totalCount = data.length;
          pagesCount = Math.ceil(totalCount / this.limit);
        } else if (data && typeof data === 'object') {
          // Check if data itself contains approval-like objects
          const keys = Object.keys(data);
          if (
            keys.length > 0 &&
            data[keys[0]] &&
            Array.isArray(data[keys[0]])
          ) {
            approvalsArray = data[keys[0]];
            totalCount = data.total ?? approvalsArray.length ?? 0;
            pagesCount = data.pages ?? Math.ceil(totalCount / this.limit);
          }
        }

        // Ensure we have valid pagination values
        if (totalCount < 0) totalCount = 0;
        if (pagesCount < 0) pagesCount = 0;

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

        // CRITICAL: Ensure we only display exactly the number of records based on limit
        // The backend should already limit, but this is a final safeguard
        const maxRecords = this.limit;

        // Only take the exact number of records we should display
        if (this.approvals.length > maxRecords) {
          console.warn(
            `⚠️ Backend returned ${this.approvals.length} records but limit is ${maxRecords}. Limiting display to ${maxRecords} records.`
          );
          this.approvals = this.approvals.slice(0, maxRecords);
        }

        // Set filteredApprovals to match approvals exactly
        this.filteredApprovals = [...this.approvals];

        // Verify we have the correct count
        if (
          this.filteredApprovals.length !== maxRecords &&
          this.filteredApprovals.length < this.total
        ) {
          // This is expected on the last page or when total < limit
          console.log(
            `Displaying ${this.filteredApprovals.length} of ${this.total} total records (page ${this.page}, limit ${this.limit})`
          );
        }
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
    // Ensure page is within valid range
    if (page < 1) {
      this.page = 1;
    } else if (this.pages > 0 && page > this.pages) {
      this.page = this.pages;
    } else {
      this.page = page;
    }
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
      machineSequence: '',
      requestedBy: '',
      category: '',
      subcategory: '',
      partyName: '',
      location: '',
      mobileNumber: '',
      dispatchDateFrom: '',
      dispatchDateTo: '',
      qcDateFrom: '',
      qcDateTo: '',
      inspectionDateFrom: '',
      inspectionDateTo: '',
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
    this.selectedQCEntry = null;

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

          // Load subcategories for the machine's category
          if (machine.category_id?._id || machine.category_id) {
            const catId =
              machine.category_id?._id ||
              (typeof machine.category_id === 'string'
                ? machine.category_id
                : machine.category_id?._id);
            if (catId && typeof catId === 'string') {
              this.loadSubcategories(catId);
            }
          }
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

          // Try to load subcategories from approval data
          if (
            approval.machineId.category_id?._id ||
            approval.machineId.category_id
          ) {
            const catId =
              approval.machineId.category_id?._id ||
              (typeof approval.machineId.category_id === 'string'
                ? approval.machineId.category_id
                : approval.machineId.category_id?._id);
            if (catId && typeof catId === 'string') {
              this.loadSubcategories(catId);
            }
          }
        }
      },
    });

    // Fetch QC Entry details if qcEntryId exists
    if (approval.qcEntryId) {
      const qcEntryId =
        typeof approval.qcEntryId === 'string'
          ? approval.qcEntryId
          : approval.qcEntryId._id;

      if (qcEntryId) {
        this.qcEntryService.getQCEntryById(qcEntryId).subscribe({
          next: (res: any) => {
            const data = res?.data || res;
            this.selectedQCEntry = data;
          },
          error: (error: any) => {
            console.error('Error loading QC entry details:', error);
          },
        });
      }
    }
  }

  closeViewModal(): void {
    this.viewVisible = false;
    this.selectedMachine = null;
    this.selectedApproval = null;
    this.selectedQCEntry = null;
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
    const url = this.documentUrl(doc.file_path || doc.path || doc.filename);
    const fileName = this.getDocumentFileName(doc);

    // For Cloudinary URLs, we need to fetch and create a blob to ensure proper filename
    if (url.startsWith('http://') || url.startsWith('https://')) {
      fetch(url)
        .then(response => response.blob())
        .then(blob => {
          const blobUrl = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          // Clean up the blob URL
          window.URL.revokeObjectURL(blobUrl);
        })
        .catch(error => {
          console.error('Error downloading document:', error);
          // Fallback to direct link
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName;
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        });
    } else {
      // For local files, use direct download
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  /**
   * Get the proper filename for a document with extension
   */
  getDocumentFileName(doc: any): string {
    let fileName = doc.originalName || doc.name || doc.filename || 'document';

    // Remove any existing extension to avoid duplicates
    const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');

    // Get extension from file_path if available, or from document_type
    let extension = '';
    const filePath = doc.file_path || doc.path || doc.filename || '';
    if (filePath) {
      const match = filePath.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
      if (match) {
        extension = match[1];
      }
    }

    // If no extension from URL, try to get from document_type/mimetype
    if (!extension && (doc.document_type || doc.mimeType)) {
      const mimeType = doc.document_type || doc.mimeType;
      const mimeToExt: { [key: string]: string } = {
        'application/pdf': 'pdf',
        'application/msword': 'doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          'docx',
        'application/vnd.ms-excel': 'xls',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
          'xlsx',
        'text/plain': 'txt',
        'application/zip': 'zip',
        'application/x-rar-compressed': 'rar',
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/gif': 'gif',
      };
      extension = mimeToExt[mimeType] || '';
    }

    // If still no extension, try to extract from original filename
    if (!extension && (doc.originalName || doc.name || doc.filename)) {
      const originalName = doc.originalName || doc.name || doc.filename;
      const match = originalName.match(/\.([a-zA-Z0-9]+)$/);
      if (match) {
        extension = match[1];
      }
    }

    // Return filename with extension
    return extension ? `${nameWithoutExt}.${extension}` : fileName;
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
    if (!subcategory) return '-';
    if (typeof subcategory === 'string') {
      // If it's a string ID, try to find it in subcategories or categories
      const found =
        this.subcategories.find(s => s._id === subcategory) ||
        this.categories.find(c => c._id === subcategory);
      return found?.name || subcategory;
    }
    if (typeof subcategory === 'object' && subcategory.name) {
      return subcategory.name;
    }
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

  getFileName(filePath: string): string {
    if (!filePath) return 'Unknown file';
    const parts = filePath.split('/');
    return parts[parts.length - 1] || 'Unknown file';
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

  // Load categories for machine search
  loadCategories(): void {
    this.categoryService
      .getAllCategories({ includeInactive: false })
      .subscribe({
        next: (res: any) => {
          const data = res?.data || res;
          this.categories = Array.isArray(data) ? data : data?.categories || [];
        },
        error: (error: any) => {
          console.error('Failed to load categories:', error);
        },
      });
  }

  // Create QC Entry Modal Methods
  public openCreateQCEntryModal(): void {
    this.showCreateQCEntryModal = true;
    this.machineFilters = {
      is_approved: true,
    };
    this.machinePage = 1;
    this.resetQCEntryForm();
    this.metadataKeySuggestions = [];
    this.showMetadataKeySuggestions = false;
    this.loadMachinesForQC();
  }

  closeCreateQCEntryModal(): void {
    this.showCreateQCEntryModal = false;
    this.resetQCEntryForm();
  }

  loadMachinesForQC(): void {
    this.loading = true;
    this.loaderService.showGlobalLoader('Loading machines...');

    const params: any = {
      page: this.machinePage,
      limit: this.machineLimit,
      is_approved: true,
    };

    if (this.machineFilters.search?.trim()) {
      params.search = this.machineFilters.search.trim();
    }
    if (this.machineFilters.category_id) {
      params.category_id = this.machineFilters.category_id;
    }
    if (this.machineFilters.metadata_key) {
      params.metadata_key = this.machineFilters.metadata_key;
    }
    if (this.machineFilters.metadata_value) {
      params.metadata_value = this.machineFilters.metadata_value;
    }
    if (this.machineFilters.dispatch_date_from) {
      params.dispatch_date_from = this.machineFilters.dispatch_date_from;
    }
    if (this.machineFilters.dispatch_date_to) {
      params.dispatch_date_to = this.machineFilters.dispatch_date_to;
    }
    if (this.machineFilters.sortBy) {
      params.sortBy = this.machineFilters.sortBy;
      params.sortOrder = this.machineFilters.sortOrder || 'desc';
    }

    this.api.get<any>('/machines', params).subscribe({
      next: (res: any) => {
        const data = res?.data || res;
        const serverMachines: any[] = (data?.machines ||
          data?.items ||
          data ||
          []) as any[];

        // Normalize and enforce approved-only
        let refined = serverMachines
          .filter(m => !!m && m.is_approved === true)
          .map(m => this.normalizeMachineForQC(m));

        // Exclude machines that already have a non-rejected QC approval
        this.fetchBlockedApprovalsSet()
          .then(() => {
            refined = refined.filter(
              m => !this.blockedApprovalMachineIds.has(m._id)
            );

            this.machines = refined;
            this.machineTotal = data.total || refined.length;
            this.machinePages =
              data.pages || Math.ceil(this.machineTotal / this.machineLimit);
            this.filteredMachines = [...this.machines];
            this.loading = false;
            this.loaderService.hideGlobalLoader();
          })
          .catch(() => {
            this.machines = refined;
            this.machineTotal = data.total || refined.length;
            this.machinePages =
              data.pages || Math.ceil(this.machineTotal / this.machineLimit);
            this.filteredMachines = [...this.machines];
            this.loading = false;
            this.loaderService.hideGlobalLoader();
          });
      },
      error: (error: any) => {
        console.error('Error loading machines:', error);
        this.errorHandler.showServerError();
        this.machines = [];
        this.filteredMachines = [];
        this.loading = false;
        this.loaderService.hideGlobalLoader();
      },
    });
  }

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

  private normalizeMachineForQC(m: any): any {
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

  onMachineSearchChange(search: string): void {
    this.machineFilters.search = search;
    this.machineSearchSubject.next(search);
  }

  onMachineCategoryFilterChange(): void {
    this.machinePage = 1;
    this.loadMachinesForQC();
  }

  onMachineMetadataKeyChange(): void {
    this.updateMachineMetadataKeySuggestions();
  }

  onMachineMetadataValueChange(): void {
    this.machinePage = 1;
    this.loadMachinesForQC();
  }

  updateMachineMetadataKeySuggestions(): void {
    if (
      !this.machineFilters.metadata_key ||
      this.machineFilters.metadata_key.length < 1
    ) {
      this.metadataKeySuggestions = [];
      return;
    }
    const key = this.machineFilters.metadata_key.toLowerCase();
    const allKeys = new Set<string>();
    this.machines.forEach(m => {
      if (m.metadata && typeof m.metadata === 'object') {
        Object.keys(m.metadata).forEach(k => {
          if (k.toLowerCase().includes(key)) {
            allKeys.add(k);
          }
        });
      }
    });
    this.metadataKeySuggestions = Array.from(allKeys).slice(0, 10);
  }

  selectMachineMetadataKey(key: string): void {
    this.machineFilters.metadata_key = key;
    this.showMetadataKeySuggestions = false;
    this.machinePage = 1;
    this.loadMachinesForQC();
  }

  hideMachineMetadataSuggestions(): void {
    setTimeout(() => {
      this.showMetadataKeySuggestions = false;
    }, 200);
  }

  clearMachineFilters(): void {
    this.machineFilters = {
      is_approved: true,
    };
    this.machinePage = 1;
    this.loadMachinesForQC();
  }

  onMachinePageChange(page: number): void {
    this.machinePage = page;
    this.loadMachinesForQC();
  }

  onMachineLimitChange(limit: number): void {
    this.machineLimit = limit;
    this.machinePage = 1;
    this.loadMachinesForQC();
  }

  selectMachineForQC(machine: any): void {
    this.selectedMachineForQC = machine;

    // Populate form fields with machine data
    this.qcEntryName = machine.name || '';
    const categoryId =
      machine.category_id?._id ||
      (typeof machine.category_id === 'string' ? machine.category_id : '') ||
      '';
    const subcategoryId =
      machine.subcategory_id?._id ||
      (typeof machine.subcategory_id === 'string'
        ? machine.subcategory_id
        : '') ||
      '';

    this.qcEntryCategoryId = categoryId;
    this.qcEntrySubcategoryId = subcategoryId;
    this.qcEntryMachineSequence = machine.machine_sequence || '';
    this.qcEntryPartyName = machine.party_name || '';
    this.qcEntryLocation = machine.location || '';
    this.qcEntryMobileNumber = machine.mobile_number || '';
    this.qcEntryDispatchDate = machine.dispatch_date
      ? new Date(machine.dispatch_date).toISOString().split('T')[0]
      : '';

    // Load subcategories for the selected category, then set subcategory ID
    if (categoryId) {
      this.loadSubcategories(categoryId, subcategoryId);
    } else {
      this.subcategories = [];
      this.qcEntrySubcategoryId = '';
    }

    // Update form group
    this.qcEntryForm.patchValue({
      name: this.qcEntryName,
      category_id: this.qcEntryCategoryId,
      subcategory_id: this.qcEntrySubcategoryId,
      machine_sequence: this.qcEntryMachineSequence,
      party_name: this.qcEntryPartyName,
      location: this.qcEntryLocation,
      mobile_number: this.qcEntryMobileNumber,
      dispatch_date: this.qcEntryDispatchDate,
    });
  }

  onCategoryChange(): void {
    if (this.qcEntryCategoryId) {
      this.loadSubcategories(this.qcEntryCategoryId);
    } else {
      this.subcategories = [];
      this.qcEntrySubcategoryId = '';
    }
  }

  loadSubcategories(categoryId: string, subcategoryIdToSet?: string): void {
    this.categoryService.getCategoryTree().subscribe({
      next: (res: any) => {
        const data = res?.data || res;
        const tree = Array.isArray(data) ? data : [];

        // Find the category in the tree and get its children (subcategories)
        const findCategory = (nodes: any[]): any => {
          for (const node of nodes) {
            if (node._id === categoryId) {
              return node;
            }
            if (node.children && node.children.length > 0) {
              const found = findCategory(node.children);
              if (found) return found;
            }
          }
          return null;
        };

        const category = findCategory(tree);
        this.subcategories = category?.children || [];

        // Set subcategory ID after subcategories are loaded
        // Use setTimeout to ensure Angular change detection picks up the change
        setTimeout(() => {
          if (subcategoryIdToSet) {
            // Verify the subcategory exists in the loaded list
            const subcategoryExists = this.subcategories.some(
              (s: any) => s._id === subcategoryIdToSet
            );
            if (subcategoryExists) {
              this.qcEntrySubcategoryId = subcategoryIdToSet;
            } else {
              // If subcategory doesn't exist in this category's children, keep it anyway (might be from different category)
              this.qcEntrySubcategoryId = subcategoryIdToSet;
            }
          }
        }, 0);
      },
      error: (error: any) => {
        console.error('Error loading subcategories:', error);
        this.subcategories = [];
        // Still set subcategory ID if provided, even if loading failed
        if (subcategoryIdToSet) {
          setTimeout(() => {
            this.qcEntrySubcategoryId = subcategoryIdToSet;
          }, 0);
        }
      },
    });
  }

  getCategoryName(categoryId: string): string {
    if (!categoryId) return '';
    const category = this.categories.find(c => c._id === categoryId);
    return category?.name || '';
  }

  getSubcategoryName(subcategoryId: string): string {
    if (!subcategoryId) return '';
    const subcategory = this.subcategories.find(s => s._id === subcategoryId);
    return subcategory?.name || '';
  }

  trackByMachineId(index: number, machine: any): string {
    return machine._id || '';
  }

  trackById(_index: number, item: { _id?: string }): string {
    return item?._id || '';
  }

  onQCFileSelected(event: any): void {
    const files = event.target.files;
    if (files && files.length > 0) {
      this.selectedFiles = Array.from(files);
    }
  }

  onQCImageSelected(event: any): void {
    const files = event.target.files;
    if (files && files.length > 0) {
      this.selectedImages = Array.from(files);
    }
  }

  onQCDocumentSelected(event: any): void {
    const files = event.target.files;
    if (files && files.length > 0) {
      this.selectedDocuments = Array.from(files);
    }
  }

  onQCReportLinkInput(value: string): void {
    this.qcEntryReportLink = value || '';
    this.reportLinkTouched = true;
    this.reportLinkErrorMsg = this.validateOptionalUrl(this.qcEntryReportLink);
  }

  private validateOptionalUrl(value: string): string | null {
    const trimmed = (value || '').trim();
    if (!trimmed) return null;
    try {
      const u = new URL(trimmed);
      if (!/^https?:$/i.test(u.protocol))
        return 'URL must start with http or https';
      return null;
    } catch {
      return 'Enter a valid URL (e.g., https://...)';
    }
  }

  submitQCEntry(): void {
    if (!this.selectedMachineForQC) {
      this.errorHandler.showWarning('Please select a machine');
      return;
    }

    // Validate required machine fields
    if (!this.qcEntryName.trim()) {
      this.errorHandler.showWarning('Machine name is required');
      return;
    }
    if (!this.qcEntryCategoryId) {
      this.errorHandler.showWarning('Category is required');
      return;
    }
    if (!this.qcEntryPartyName.trim()) {
      this.errorHandler.showWarning('Party name is required');
      return;
    }
    if (!this.qcEntryLocation.trim()) {
      this.errorHandler.showWarning('Location is required');
      return;
    }
    if (!this.qcEntryMobileNumber.trim()) {
      this.errorHandler.showWarning('Mobile number is required');
      return;
    }

    if (this.qcEntryReportLink.trim()) {
      const msg = this.validateOptionalUrl(this.qcEntryReportLink);
      if (msg) {
        this.reportLinkTouched = true;
        this.reportLinkErrorMsg = msg;
        return;
      }
    }

    this.uploadingQC = true;
    const formData = new FormData();

    // Required fields
    formData.append('machine_id', this.selectedMachineForQC._id);
    formData.append('name', this.qcEntryName.trim());
    formData.append('category_id', this.qcEntryCategoryId);
    formData.append('party_name', this.qcEntryPartyName.trim());
    formData.append('location', this.qcEntryLocation.trim());
    formData.append('mobile_number', this.qcEntryMobileNumber.trim());

    // Optional machine fields
    if (this.qcEntrySubcategoryId) {
      formData.append('subcategory_id', this.qcEntrySubcategoryId);
    }
    if (this.qcEntryMachineSequence?.trim()) {
      formData.append('machine_sequence', this.qcEntryMachineSequence.trim());
    }
    if (this.qcEntryDispatchDate) {
      formData.append('dispatch_date', this.qcEntryDispatchDate);
    }

    // Images
    if (this.selectedImages.length > 0) {
      this.selectedImages.forEach(file => formData.append('images', file));
    }

    // Documents
    if (this.selectedDocuments.length > 0) {
      this.selectedDocuments.forEach(file =>
        formData.append('documents', file)
      );
    }

    // QC-specific fields
    if (this.qcEntryNotes && this.qcEntryNotes.trim()) {
      formData.append('qcNotes', this.qcEntryNotes.trim());
    }
    if (
      this.qcEntryQualityScore !== null &&
      this.qcEntryQualityScore !== undefined
    ) {
      formData.append('qualityScore', this.qcEntryQualityScore.toString());
    }
    if (this.qcEntryInspectionDate) {
      formData.append('inspectionDate', this.qcEntryInspectionDate);
    }
    if (this.qcEntryQcDate) {
      formData.append('qc_date', this.qcEntryQcDate);
    }
    if (this.qcEntryNextInspectionDate) {
      formData.append('nextInspectionDate', this.qcEntryNextInspectionDate);
    }
    if (this.qcEntryReportLink.trim()) {
      formData.append('report_link', this.qcEntryReportLink.trim());
    }

    // QC files
    if (this.selectedFiles.length > 0) {
      this.selectedFiles.forEach(file => formData.append('files', file));
    }

    this.api.post<any>('/qc-machines', formData).subscribe({
      next: () => {
        this.uploadingQC = false;
        this.showCreateQCEntryModal = false;
        this.errorHandler.showSuccess('QC entry created successfully');
        this.loadApprovals();
        this.loadStats();
        // Reset form
        this.resetQCEntryForm();
      },
      error: () => {
        this.uploadingQC = false;
        this.errorHandler.showServerError();
      },
    });
  }

  resetQCEntryForm(): void {
    this.selectedMachineForQC = null;
    this.selectedFiles = [];
    this.selectedImages = [];
    this.selectedDocuments = [];
    this.qcEntryName = '';
    this.qcEntryCategoryId = '';
    this.qcEntrySubcategoryId = '';
    this.qcEntryMachineSequence = '';
    this.qcEntryPartyName = '';
    this.qcEntryLocation = '';
    this.qcEntryMobileNumber = '';
    this.qcEntryDispatchDate = '';
    this.qcEntryNotes = '';
    this.qcEntryQualityScore = null;
    this.qcEntryInspectionDate = '';
    this.qcEntryQcDate = '';
    this.qcEntryNextInspectionDate = '';
    this.qcEntryReportLink = '';
    this.reportLinkTouched = false;
    this.reportLinkErrorMsg = null;
    this.qcEntryForm.reset();
  }

  // Edit Modal Methods
  openEditModal(approval: QCApproval): void {
    // Allow editing for both PENDING and APPROVED status
    if (approval.status === 'REJECTED' || approval.status === 'CANCELLED') {
      this.errorHandler.showWarning(
        'Cannot edit rejected or cancelled QC approvals'
      );
      return;
    }

    const qcEntryId =
      typeof approval.qcEntryId === 'string'
        ? approval.qcEntryId
        : approval.qcEntryId?._id;
    if (!qcEntryId) {
      this.errorHandler.showWarning('QC entry not found');
      return;
    }

    this.selectedApproval = approval;
    this.actionLoading = true;

    // Fetch full QC entry data
    this.qcEntryService.getQCEntryById(qcEntryId).subscribe({
      next: res => {
        this.selectedQCEntryForEdit = res.data;
        const qcEntry = res.data;

        // Populate existing files
        this.existingImages = (qcEntry.images || []) as string[];
        this.existingDocuments = (qcEntry.documents || []) as Array<{
          name: string;
          file_path: string;
          document_type?: string;
          _id?: string;
        }>;
        this.existingFiles = (qcEntry.files || []) as string[];

        // Reset deletion lists
        this.imagesToDelete = [];
        this.documentsToDelete = [];
        this.filesToDelete = [];
        this.editSelectedImages = [];
        this.editSelectedDocuments = [];
        this.editSelectedFiles = [];

        // Load subcategories if category exists
        const categoryId =
          (qcEntry.category_id as any)?._id ||
          (typeof qcEntry.category_id === 'string'
            ? qcEntry.category_id
            : '') ||
          '';
        if (categoryId) {
          this.loadSubcategories(categoryId);
        }

        // Populate form with QC entry data
        const subcategoryId =
          (qcEntry.subcategory_id as any)?._id ||
          (typeof qcEntry.subcategory_id === 'string'
            ? qcEntry.subcategory_id
            : '') ||
          '';

        this.editForm.patchValue({
          name: qcEntry.name || '',
          category_id: categoryId,
          subcategory_id: subcategoryId,
          machine_sequence: qcEntry.machine_sequence || '',
          party_name: qcEntry.party_name || '',
          location: qcEntry.location || '',
          mobile_number: qcEntry.mobile_number || '',
          dispatch_date: qcEntry.dispatch_date
            ? new Date(qcEntry.dispatch_date).toISOString().split('T')[0]
            : '',
          qcNotes: qcEntry.qcNotes || '',
          qualityScore: qcEntry.qualityScore || null,
          inspectionDate: qcEntry.inspectionDate
            ? new Date(qcEntry.inspectionDate).toISOString().split('T')[0]
            : '',
          qc_date: qcEntry.qc_date
            ? new Date(qcEntry.qc_date).toISOString().split('T')[0]
            : '',
          nextInspectionDate: qcEntry.nextInspectionDate
            ? new Date(qcEntry.nextInspectionDate).toISOString().split('T')[0]
            : '',
          reportLink: (qcEntry as any).report_link || qcEntry.reportLink || '',
          is_active: (qcEntry as any).is_active || false,
          approval_status: (qcEntry as any).approval_status || 'PENDING',
        });

        this.actionLoading = false;
        this.showEditDialog = true;
      },
      error: () => {
        this.actionLoading = false;
        this.errorHandler.showWarning('Failed to load QC entry data');
      },
    });
  }

  closeEditModal(): void {
    this.showEditDialog = false;
    this.selectedApproval = null;
    this.selectedQCEntryForEdit = null;
    this.existingImages = [];
    this.existingDocuments = [];
    this.existingFiles = [];
    this.imagesToDelete = [];
    this.documentsToDelete = [];
    this.filesToDelete = [];
    this.editSelectedImages = [];
    this.editSelectedDocuments = [];
    this.editSelectedFiles = [];
    this.editForm.reset();
  }

  // Document management methods for edit modal
  removeImageFromEdit(imagePath: string): void {
    this.imagesToDelete.push(imagePath);
    this.existingImages = this.existingImages.filter(img => img !== imagePath);
  }

  removeDocumentFromEdit(document: {
    name: string;
    file_path: string;
    _id?: string;
  }): void {
    if (document._id) {
      this.documentsToDelete.push(document._id);
    } else {
      this.documentsToDelete.push(document.file_path);
    }
    this.existingDocuments = this.existingDocuments.filter(
      doc => doc.file_path !== document.file_path
    );
  }

  removeFileFromEdit(filePath: string): void {
    this.filesToDelete.push(filePath);
    this.existingFiles = this.existingFiles.filter(file => file !== filePath);
  }

  onEditImagesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.editSelectedImages = Array.from(input.files);
    }
  }

  onEditDocumentsSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.editSelectedDocuments = Array.from(input.files);
    }
  }

  onEditFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.editSelectedFiles = Array.from(input.files);
    }
  }

  submitEdit(): void {
    if (!this.selectedQCEntryForEdit?._id) return;

    this.actionLoading = true;

    const formValue = this.editForm.value;
    const formData = new FormData();

    // Add all form fields
    if (formValue.name) formData.append('name', formValue.name);
    if (formValue.category_id)
      formData.append('category_id', formValue.category_id);
    if (formValue.subcategory_id)
      formData.append('subcategory_id', formValue.subcategory_id);
    if (formValue.machine_sequence)
      formData.append('machine_sequence', formValue.machine_sequence);
    if (formValue.party_name)
      formData.append('party_name', formValue.party_name);
    if (formValue.location) formData.append('location', formValue.location);
    if (formValue.mobile_number)
      formData.append('mobile_number', formValue.mobile_number);
    if (formValue.dispatch_date)
      formData.append('dispatch_date', formValue.dispatch_date);
    if (formValue.qcNotes) formData.append('qcNotes', formValue.qcNotes);
    if (formValue.qualityScore !== null && formValue.qualityScore !== undefined)
      formData.append('qualityScore', formValue.qualityScore.toString());
    if (formValue.inspectionDate)
      formData.append('inspectionDate', formValue.inspectionDate);
    if (formValue.qc_date) formData.append('qc_date', formValue.qc_date);
    if (formValue.nextInspectionDate)
      formData.append('nextInspectionDate', formValue.nextInspectionDate);
    if (formValue.reportLink)
      formData.append('report_link', formValue.reportLink);
    if (formValue.is_active !== undefined)
      formData.append('is_active', formValue.is_active.toString());
    if (formValue.approval_status)
      formData.append('approval_status', formValue.approval_status);

    // Handle images: send remaining images as JSON (to replace existing)
    const remainingImages = this.existingImages.filter(
      img => !this.imagesToDelete.includes(img)
    );
    formData.append('images', JSON.stringify(remainingImages));

    // Handle documents: send remaining documents as JSON (to replace existing)
    const remainingDocuments = this.existingDocuments.filter(
      doc => !this.documentsToDelete.includes(doc._id || doc.file_path)
    );
    formData.append('documents', JSON.stringify(remainingDocuments));

    // Handle files: send remaining files as JSON (to replace existing)
    const remainingFiles = this.existingFiles.filter(
      file => !this.filesToDelete.includes(file)
    );
    formData.append('files', JSON.stringify(remainingFiles));

    // Add new files
    if (this.editSelectedImages.length > 0) {
      this.editSelectedImages.forEach(file => formData.append('images', file));
    }
    if (this.editSelectedDocuments.length > 0) {
      this.editSelectedDocuments.forEach(file =>
        formData.append('documents', file)
      );
    }
    if (this.editSelectedFiles.length > 0) {
      this.editSelectedFiles.forEach(file => formData.append('files', file));
    }

    // Update QC entry
    this.qcEntryService
      .updateQCEntryWithFormData(this.selectedQCEntryForEdit._id, formData)
      .subscribe({
        next: () => {
          this.actionLoading = false;
          this.showEditDialog = false;
          this.selectedApproval = null;
          this.selectedQCEntryForEdit = null;
          this.errorHandler.showSuccess('QC entry updated successfully');
          this.loadApprovals();
          this.loadStats();
        },
        error: () => {
          this.actionLoading = false;
          this.errorHandler.showServerError();
        },
      });
  }

  // Delete Modal Methods
  openDeleteModal(approval: QCApproval): void {
    this.selectedApproval = approval;
    this.showDeleteDialog = true;
  }

  closeDeleteModal(): void {
    this.showDeleteDialog = false;
    this.selectedApproval = null;
  }

  confirmDelete(): void {
    if (!this.selectedApproval?._id) return;

    this.actionLoading = true;
    this.qcEntryService.deleteQCApproval(this.selectedApproval._id).subscribe({
      next: () => {
        this.actionLoading = false;
        this.showDeleteDialog = false;
        this.selectedApproval = null;
        this.errorHandler.showSuccess('QC approval deleted successfully');
        this.loadApprovals();
        this.loadStats();
      },
      error: () => {
        this.actionLoading = false;
        this.errorHandler.showServerError();
      },
    });
  }

  /**
   * Export QC entries to Excel
   */
  async exportToExcel(): Promise<void> {
    try {
      this.exportingExcel = true;
      const filters: any = {
        search: this.searchTerm || undefined,
        category_id: this.filtersForm.get('category')?.value || undefined,
        is_approved:
          this.filtersForm.get('status')?.value === 'APPROVED'
            ? true
            : this.filtersForm.get('status')?.value === 'PENDING'
              ? false
              : undefined,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };

      const blob = await firstValueFrom(
        this.exportService.exportToExcel('qc_entries', filters)
      );

      if (blob) {
        const filename = `qc_entries_export_${new Date().toISOString().split('T')[0]}.xlsx`;
        this.exportService.downloadBlob(blob, filename);
        this.messageService.add({
          severity: 'success',
          summary: 'Export Successful',
          detail: 'QC entries exported to Excel successfully',
        });
      }
    } catch (error: any) {
      console.error('Export error:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Export Failed',
        detail: error?.error?.message || 'Failed to export QC entries to Excel',
      });
    } finally {
      this.exportingExcel = false;
    }
  }

  /**
   * Export QC entry to PDF
   */
  async exportQCEntryToPdf(approval: QCApproval): Promise<void> {
    if (!approval._id) return;

    // Get the QC entry ID from the approval
    const qcEntryId =
      typeof approval.qcEntryId === 'object'
        ? approval.qcEntryId?._id
        : approval.qcEntryId;

    if (!qcEntryId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Export Failed',
        detail: 'QC entry ID not found',
      });
      return;
    }

    try {
      this.exportingPdf = approval._id;
      const blob = await firstValueFrom(
        this.exportService.exportToPdf('qc_entries', qcEntryId)
      );

      if (blob) {
        const filename = `qc_entry_${qcEntryId}_${new Date().toISOString().split('T')[0]}.pdf`;
        this.exportService.downloadBlob(blob, filename);
        this.messageService.add({
          severity: 'success',
          summary: 'Export Successful',
          detail: 'QC entry exported to PDF successfully',
        });
      }
    } catch (error: any) {
      console.error('Export error:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Export Failed',
        detail: error?.error?.message || 'Failed to export QC entry to PDF',
      });
    } finally {
      this.exportingPdf = null;
    }
  }
}
