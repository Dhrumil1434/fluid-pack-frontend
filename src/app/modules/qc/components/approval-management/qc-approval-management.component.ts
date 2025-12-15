import { Component, OnInit, OnDestroy } from '@angular/core';
// Removed unused: DomSanitizer, SafeResourceUrl
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
import { AuthService } from '../../../../core/services/auth.service';
import { TablePaginationComponent } from '../../../admin/components/user-management/table-pagination.component';
// Removed unused: Pipe, PipeTransform

// Components
import { QcSidebarComponent } from '../shared/qc-sidebar/qc-sidebar.component';

interface QCApproval {
  _id?: string;
  machineId?:
    | string
    | {
        _id?: string;
        name?: string; // Deprecated - use so_id.name instead
        machine_sequence?: string;
        location?: string;
        dispatch_date?: string | Date;
        category_id?:
          | {
              _id?: string;
              name?: string;
            }
          | string; // Deprecated - use so_id.category_id instead
        so_id?:
          | string
          | {
              _id: string;
              name: string;
              category_id?: { _id: string; name: string } | string;
              subcategory_id?: { _id: string; name: string } | string;
              party_name?: string;
              mobile_number?: string;
              description?: string;
              is_active?: boolean;
            };
        images?: string[];
      };
  requestedBy?: {
    _id?: string;
    username?: string;
    name?: string;
  };
  approvalType: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  qcNotes?: string;
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
  requestNotes?: string;
  machineActivated?: boolean;
  activationDate?: string;
  qcEntryId?: {
    files?: string[];
  };
  documents?: Array<{
    _id?: string;
    filename: string;
    originalName: string;
    path: string;
    mimeType: string;
    size: number;
    uploadedAt: string;
  }>;
  approvers?: Array<{
    _id: string;
    username: string;
    name: string;
    email?: string;
  }>;
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

// (Removed duplicate SafeUrlPipe definition here)

@Component({
  selector: 'app-qc-approval-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    QcSidebarComponent,
    TablePaginationComponent,
    // Document previews open in a new tab; no need for SafeUrlPipe in imports
  ],
  templateUrl: './qc-approval-management.component.html',
  styleUrls: ['./qc-approval-management.component.css'],
})
export class QcApprovalManagementComponent implements OnInit, OnDestroy {
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

  // Autocomplete suggestions
  requestedBySuggestions: string[] = [];
  showRequestedBySuggestions = false;
  partyNameSuggestions: string[] = [];
  showPartyNameSuggestions = false;
  locationSuggestions: string[] = [];
  showLocationSuggestions = false;
  private suggestionDebounceTimers: { [key: string]: any } = {};

  // Pagination
  currentPage = 1;
  pageSize = 20;
  totalCount = 0;
  totalPages = 0;

  // Selection
  selectedApprovals: Set<string> = new Set();
  selectAll = false;

  // Modals
  showApprovalDialog = false;
  showRejectionDialog = false;
  showDocumentDialog = false;
  selectedApproval: QCApproval | null = null;
  documentList: Array<{
    originalName: string;
    path: string;
    size?: number;
    uploadedAt?: string;
  }> = [];
  approvalMode: 'approve' | 'reject' = 'approve';
  approvalNotes = '';
  rejectionReason = '';

  // Document upload
  selectedFiles: File[] = [];
  uploadProgress = 0;
  uploading = false;

  // View mode: my assigned approvals vs all approvals
  viewMode: 'my' | 'all' = 'my';

  // View Details modal & lightbox
  showDetailsModal = false;
  detailsApproval: QCApproval | null = null;
  selectedQCEntry: any = null;
  selectedMachine: any = null;
  viewVisible = false;
  lightboxImages: string[] = [];
  lightboxIndex = 0;

  // Rejection Details Modal
  showRejectionDetailsModal = false;
  rejectionDetailsApproval: QCApproval | null = null;

  // Edit modal
  showEditModal = false;
  editForm: FormGroup;
  editingApproval: QCApproval | null = null;
  editLoading = false;
  editSelectedFiles: File[] = [];
  editUploading = false;
  editExistingDocuments: Array<{
    _id?: string;
    filename: string;
    originalName: string;
    path: string;
    size?: number;
    uploadedAt?: string;
  }> = [];
  deletingDocumentId: string | null = null;

  // trackBy helpers
  trackByIndex = (i: number) => i;
  trackByUserId = (_: number, u: { _id?: string; username?: string }) =>
    u?._id || u?.username || '';

  constructor(
    private api: BaseApiService,
    private loaderService: LoaderService,
    private errorHandler: ErrorHandlerService,
    private qcEntryService: QCEntryService,
    private authService: AuthService,
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
      category: [''],
      subcategory: [''],
      machineSequence: [''],
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

    // Edit form
    this.editForm = this.fb.group({
      qcNotes: [''],
      qualityScore: [null],
      inspectionDate: [''],
      nextInspectionDate: [''],
      requestNotes: [''],
    });

    // Setup search debouncing
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentPage = 1;
        this.loadApprovals();
      });
  }

  ngOnInit(): void {
    console.log('[QC Approval Management] Component initialized');
    console.log('[QC Approval Management] View mode:', this.viewMode);
    console.log(
      '[QC Approval Management] Current user:',
      this.authService.getCurrentUser()
    );

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
        this.currentPage = 1;
        this.loadApprovals();
      });
  }

  loadStats(): void {
    console.log('[QC Approval Management] Loading statistics...');
    console.log('[QC Approval Management] View mode:', this.viewMode);

    // For "my" view, use statistics endpoint with requestedBy filter
    if (this.viewMode === 'my') {
      const me = this.authService.getCurrentUser();
      const requestedBy = me?.username || '';
      console.log(
        '[QC Approval Management] Loading stats for user:',
        requestedBy
      );
      if (!requestedBy) {
        console.warn(
          '[QC Approval Management] No username found, cannot load stats'
        );
        return;
      }

      this.qcEntryService.getQCApprovalStatistics(requestedBy).subscribe({
        next: res => {
          console.log(
            '[QC Approval Management] Statistics loaded for user:',
            res?.data
          );
          this.stats = res?.data || this.stats;
        },
        error: error => {
          console.error(
            '[QC Approval Management] Failed to load approval statistics:',
            error
          );
        },
      });
      return;
    }

    // Otherwise, load global stats
    console.log('[QC Approval Management] Loading global statistics');
    this.qcEntryService.getQCApprovalStatistics().subscribe({
      next: res => {
        console.log(
          '[QC Approval Management] Global statistics loaded:',
          res?.data
        );
        this.stats = res?.data || this.stats;
      },
      error: error => {
        console.error(
          '[QC Approval Management] Failed to load approval statistics:',
          error
        );
      },
    });
  }

  loadApprovals(): void {
    console.log('[QC Approval Management] Loading approvals...');
    console.log('[QC Approval Management] View mode:', this.viewMode);
    console.log('[QC Approval Management] Current page:', this.currentPage);
    console.log('[QC Approval Management] Page size:', this.pageSize);

    this.loading = true;
    this.loaderService.showGlobalLoader('Loading QC approvals...');

    const formValue = this.filtersForm.value;
    const params: any = {
      page: this.currentPage,
      limit: this.pageSize,
    };

    console.log('[QC Approval Management] Form filters:', formValue);

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
    if (formValue.category?.trim()) {
      params.category = formValue.category.trim();
    }
    if (formValue.subcategory?.trim()) {
      params.subcategory = formValue.subcategory.trim();
    }
    if (formValue.machineSequence?.trim()) {
      params.machineSequence = formValue.machineSequence.trim();
    }
    if (formValue.partyName?.trim()) {
      params.partyName = formValue.partyName.trim();
    }
    if (formValue.location?.trim()) {
      params.location = formValue.location.trim();
    }
    if (formValue.mobileNumber?.trim()) {
      params.mobileNumber = formValue.mobileNumber.trim();
    }
    if (formValue.dispatchDateFrom) {
      params.dispatchDateFrom = formValue.dispatchDateFrom;
    }
    if (formValue.dispatchDateTo) {
      params.dispatchDateTo = formValue.dispatchDateTo;
    }
    if (formValue.qcDateFrom) {
      params.qcDateFrom = formValue.qcDateFrom;
    }
    if (formValue.qcDateTo) {
      params.qcDateTo = formValue.qcDateTo;
    }
    if (formValue.inspectionDateFrom) {
      params.inspectionDateFrom = formValue.inspectionDateFrom;
    }
    if (formValue.inspectionDateTo) {
      params.inspectionDateTo = formValue.inspectionDateTo;
    }
    if (formValue.sortBy) {
      params.sortBy = formValue.sortBy;
    }
    if (formValue.sortOrder) {
      params.sortOrder = formValue.sortOrder;
    }

    let source$;
    if (this.viewMode === 'my') {
      const me = this.authService.getCurrentUser();
      console.log('[QC Approval Management] Current user:', me);
      if (me) {
        // Prefer _id for more reliable filtering, fallback to username
        // Backend will look up user by _id, username, name, or email
        if (me._id) {
          params.requestedBy = me._id;
          console.log(
            '[QC Approval Management] Filtering by requestedBy (user ID):',
            me._id
          );
        } else if (me.username) {
          params.requestedBy = me.username;
          console.log(
            '[QC Approval Management] Filtering by requestedBy (username):',
            me.username
          );
        } else if (me.email) {
          params.requestedBy = me.email;
          console.log(
            '[QC Approval Management] Filtering by requestedBy (email):',
            me.email
          );
        } else {
          console.warn(
            '[QC Approval Management] No user identifier found (no _id, username, or email)'
          );
        }
      } else {
        console.warn(
          '[QC Approval Management] No current user found - cannot filter by user'
        );
      }
      source$ = this.qcEntryService.getQCApprovals(params);
    } else {
      console.log(
        '[QC Approval Management] Loading all approvals (not filtered by user)'
      );
      source$ = this.qcEntryService.getQCApprovals(params);
    }

    console.log('[QC Approval Management] API params:', params);
    console.log(
      '[QC Approval Management] Making API call to getQCApprovals...'
    );

    source$.subscribe({
      next: res => {
        console.log('[QC Approval Management] API response received:', res);
        const data = res?.data || res;
        console.log('[QC Approval Management] Response data:', data);

        this.approvals = (data.approvals || []) as unknown as QCApproval[];
        this.totalCount = data.total || 0;
        this.totalPages =
          data.pages || Math.ceil(this.totalCount / this.pageSize);
        this.filteredApprovals = [...this.approvals];

        console.log(
          '[QC Approval Management] Loaded approvals count:',
          this.approvals.length
        );
        console.log('[QC Approval Management] Total count:', this.totalCount);
        console.log('[QC Approval Management] Total pages:', this.totalPages);
        console.log('[QC Approval Management] All approvals:', this.approvals);

        if (this.approvals.length > 0) {
          console.log(
            '[QC Approval Management] First approval:',
            this.approvals[0]
          );
          console.log('[QC Approval Management] First approval details:', {
            id: this.approvals[0]._id,
            status: this.approvals[0].status,
            approvalType: this.approvals[0].approvalType,
            machineId:
              typeof this.approvals[0].machineId === 'object'
                ? this.approvals[0].machineId?._id
                : this.approvals[0].machineId,
            machineName: this.getMachineName(this.approvals[0]),
            requestedBy:
              this.approvals[0].requestedBy?.username ||
              this.approvals[0].requestedBy?.name,
            qcEntryId: this.approvals[0].qcEntryId,
          });
        } else {
          console.warn('[QC Approval Management] No approvals found!');
          console.warn('[QC Approval Management] This might indicate:');
          console.warn('  1. No approvals exist for this user/filters');
          console.warn('  2. Approval was not created yet (timing issue)');
          console.warn('  3. Filter is too restrictive');
          console.warn('[QC Approval Management] Current filters:', params);
          console.warn('[QC Approval Management] View mode:', this.viewMode);

          // If in "my" view and no results, suggest checking "all" view
          if (this.viewMode === 'my') {
            console.warn(
              '[QC Approval Management] TIP: Try switching to "All" view to see if approvals exist'
            );
            console.warn(
              '[QC Approval Management] The username filter might not match the approval creator'
            );
          }
        }

        this.loading = false;
        this.loaderService.hideGlobalLoader();
      },
      error: error => {
        console.error(
          '[QC Approval Management] Error loading QC approvals:',
          error
        );
        console.error('[QC Approval Management] Error details:', {
          status: error?.status,
          statusText: error?.statusText,
          message: error?.message,
          error: error?.error,
          url: error?.url,
        });
        this.errorHandler.showServerError();
        this.loading = false;
        this.loaderService.hideGlobalLoader();
      },
    });
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadApprovals();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
    this.loadApprovals();
  }

  clearFilters(): void {
    this.filtersForm.reset({
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
    this.showRequestedBySuggestions = false;
    this.showPartyNameSuggestions = false;
    this.showLocationSuggestions = false;
    this.currentPage = 1;
    this.loadApprovals();
  }

  // Autocomplete methods for suggestion-based search
  onRequestedByChange(): void {
    const query = this.filtersForm.get('requestedBy')?.value?.trim() || '';
    if (query.length < 1) {
      this.showRequestedBySuggestions = false;
      return;
    }

    clearTimeout(this.suggestionDebounceTimers['requestedBy']);
    this.suggestionDebounceTimers['requestedBy'] = setTimeout(() => {
      this.qcEntryService.getSearchSuggestions('requestedBy', query).subscribe({
        next: res => {
          this.requestedBySuggestions = res.data.suggestions || [];
          this.showRequestedBySuggestions =
            this.requestedBySuggestions.length > 0;
        },
        error: () => {
          this.requestedBySuggestions = [];
          this.showRequestedBySuggestions = false;
        },
      });
    }, 300);
  }

  selectRequestedBy(suggestion: string): void {
    this.filtersForm.patchValue({ requestedBy: suggestion });
    this.showRequestedBySuggestions = false;
    this.currentPage = 1;
    this.loadApprovals();
  }

  hideRequestedBySuggestions(): void {
    setTimeout(() => {
      this.showRequestedBySuggestions = false;
    }, 200);
  }

  onPartyNameChange(): void {
    const query = this.filtersForm.get('partyName')?.value?.trim() || '';
    if (query.length < 1) {
      this.showPartyNameSuggestions = false;
      return;
    }

    clearTimeout(this.suggestionDebounceTimers['partyName']);
    this.suggestionDebounceTimers['partyName'] = setTimeout(() => {
      this.qcEntryService.getSearchSuggestions('partyName', query).subscribe({
        next: res => {
          this.partyNameSuggestions = res.data.suggestions || [];
          this.showPartyNameSuggestions = this.partyNameSuggestions.length > 0;
        },
        error: () => {
          this.partyNameSuggestions = [];
          this.showPartyNameSuggestions = false;
        },
      });
    }, 300);
  }

  selectPartyName(suggestion: string): void {
    this.filtersForm.patchValue({ partyName: suggestion });
    this.showPartyNameSuggestions = false;
    this.currentPage = 1;
    this.loadApprovals();
  }

  hidePartyNameSuggestions(): void {
    setTimeout(() => {
      this.showPartyNameSuggestions = false;
    }, 200);
  }

  onLocationChange(): void {
    const query = this.filtersForm.get('location')?.value?.trim() || '';
    if (query.length < 1) {
      this.showLocationSuggestions = false;
      return;
    }

    clearTimeout(this.suggestionDebounceTimers['location']);
    this.suggestionDebounceTimers['location'] = setTimeout(() => {
      this.qcEntryService.getSearchSuggestions('location', query).subscribe({
        next: res => {
          this.locationSuggestions = res.data.suggestions || [];
          this.showLocationSuggestions = this.locationSuggestions.length > 0;
        },
        error: () => {
          this.locationSuggestions = [];
          this.showLocationSuggestions = false;
        },
      });
    }, 300);
  }

  selectLocation(suggestion: string): void {
    this.filtersForm.patchValue({ location: suggestion });
    this.showLocationSuggestions = false;
    this.currentPage = 1;
    this.loadApprovals();
  }

  hideLocationSuggestions(): void {
    setTimeout(() => {
      this.showLocationSuggestions = false;
    }, 200);
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
    // QC users cannot approve their own requests
    if (this.isOwnRequest(approval)) {
      this.errorHandler.showServerError();
      return;
    }

    this.selectedApproval = approval;
    this.approvalMode = 'approve';
    this.approvalNotes = '';
    this.showApprovalDialog = true;
  }

  onRejectApproval(approval: QCApproval): void {
    // QC users cannot reject their own requests
    if (this.isOwnRequest(approval)) {
      this.errorHandler.showServerError();
      return;
    }

    this.selectedApproval = approval;
    this.approvalMode = 'reject';
    this.rejectionReason = '';
    this.showRejectionDialog = true;
  }

  // Check if the current user is the requester
  isOwnRequest(_approval: QCApproval): boolean {
    // This would need to be implemented based on your auth service
    // For now, we'll assume QC users can only view their own requests
    return true; // QC users can only view, not approve/reject
  }

  onConfirmApproval(): void {
    if (!this.selectedApproval) return;

    this.actionLoading = true;
    const notes =
      this.approvalMode === 'approve'
        ? this.approvalNotes
        : this.rejectionReason;

    if (!this.selectedApproval._id) return;
    this.qcEntryService
      .processQCApprovalAction(
        this.selectedApproval._id,
        this.approvalMode,
        notes
      )
      .subscribe({
        next: res => {
          this.showApprovalDialog = false;
          this.showRejectionDialog = false;
          this.selectedApproval = null;
          this.loadApprovals();
          this.loadStats();
          this.errorHandler.showSuccess(
            res.message || 'Action completed successfully'
          );
        },
        error: _error => {
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
    this.selectedMachine = null;

    // Get machine ID - handle both string and object types
    let machineId: string | null = null;
    if (typeof approval.machineId === 'string') {
      machineId = approval.machineId;
    } else if (approval.machineId && typeof approval.machineId === 'object') {
      machineId = approval.machineId._id || null;
    }

    // Set initial machine data from approval if available
    if (approval.machineId && typeof approval.machineId === 'object') {
      this.selectedMachine = {
        ...approval.machineId,
      };
    }

    this.viewVisible = true;
    this.showDetailsModal = true;

    // Fetch full machine details from API if machineId exists
    if (machineId) {
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

    // Fetch QC Entry details if qcEntryId exists
    if (approval.qcEntryId) {
      const qcEntryId =
        typeof approval.qcEntryId === 'string'
          ? approval.qcEntryId
          : approval.qcEntryId &&
              typeof approval.qcEntryId === 'object' &&
              '_id' in approval.qcEntryId
            ? (approval.qcEntryId as any)._id
            : null;

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

    // Also fetch latest approval to include approvers and qcEntryId.files
    const id = approval?._id;
    if (id) {
      const sub = this.qcEntryService.getQCApprovalById(id).subscribe({
        next: res => {
          try {
            const full = (res as any)?.data || res;
            this.selectedApproval = full as any;
            this.detailsApproval = full as any;
          } finally {
            sub.unsubscribe();
          }
        },
        error: () => {
          // Keep existing approval data
        },
      });
    }
  }

  closeViewModal(): void {
    this.viewVisible = false;
    this.showDetailsModal = false;
    this.selectedMachine = null;
    this.selectedApproval = null;
    this.selectedQCEntry = null;
    this.detailsApproval = null;
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

  // Document upload methods
  onUploadDocuments(approval: QCApproval): void {
    this.selectedApproval = approval;
    this.selectedFiles = [];
    this.showDocumentDialog = true;
  }

  onFileSelected(event: any): void {
    const files = event.target.files;
    if (files && files.length > 0) {
      this.selectedFiles = Array.from(files);
    }
  }

  onUploadSubmit(): void {
    if (
      !this.selectedApproval ||
      !this.selectedApproval._id ||
      this.selectedFiles.length === 0
    ) {
      return;
    }

    this.uploading = true;
    this.uploadProgress = 0;

    const formData = new FormData();
    this.selectedFiles.forEach(file => {
      formData.append('documents', file);
    });

    this.qcEntryService
      .uploadApprovalDocuments(this.selectedApproval._id, formData)
      .subscribe({
        next: _res => {
          this.uploading = false;
          this.uploadProgress = 100;
          this.showDocumentDialog = false;
          this.selectedFiles = [];
          this.loadApprovals();
          this.errorHandler.showSuccess('Documents uploaded successfully');
        },
        error: _error => {
          this.uploading = false;
          this.uploadProgress = 0;
          this.errorHandler.showServerError();
        },
      });
  }

  onCancelDocumentUpload(): void {
    this.showDocumentDialog = false;
    this.selectedFiles = [];
    this.uploadProgress = 0;
    this.uploading = false;
  }

  onDeleteDocument(approval: QCApproval, documentId: string): void {
    if (!approval._id) return;

    this.qcEntryService
      .deleteApprovalDocument(approval._id, documentId)
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

  onDownloadDocument(approval: QCApproval, document: any): void {
    const url = this.documentUrl(
      document.path || document.file_path || document.filename
    );
    window.open(url, '_blank');
  }

  onDownloadMachineDocument(machine: any, document: any): void {
    const url = this.documentUrl(
      document.file_path || document.path || document.filename || document
    );
    window.open(url, '_blank');
  }

  onViewMachineDocuments(machine: any): void {
    if (!machine?.documents || machine.documents.length === 0) {
      return;
    }

    // Set up document list for viewing
    this.documentList = machine.documents.map((doc: any) => ({
      originalName: this.getDocumentName(doc),
      path: doc.file_path || doc.path || doc.filename || doc,
      size: doc.size,
      uploadedAt: doc.uploadedAt || doc.createdAt,
    }));

    this.showDocumentDialog = true;
  }

  onViewDocuments(approval: QCApproval): void {
    // Always re-fetch approval by ID to leverage backend population of qcEntryId.files
    const id = approval?._id;
    this.selectedApproval = approval;
    this.documentList = [];

    const handleDocsFromApproval = (appr: any) => {
      // 1) From approval.documents if present
      const docs = appr?.documents as Array<any> | undefined;
      if (Array.isArray(docs) && docs.length > 0) {
        this.documentList = docs
          .map(d => ({
            originalName:
              d.originalName || d.filename || this.extractName(d.path || ''),
            path: d.path || d.filename,
            size: d.size,
            uploadedAt: d.uploadedAt,
          }))
          .filter(d => !!d.path);
        return;
      }
      // 2) From populated qcEntryId.files
      const entryFiles: string[] = appr?.qcEntryId?.files || [];
      if (Array.isArray(entryFiles) && entryFiles.length > 0) {
        this.documentList = entryFiles.map(p => ({
          originalName: this.extractName(p),
          path: p,
        }));
      }
    };

    if (id) {
      const sub = this.qcEntryService.getQCApprovalById(id).subscribe({
        next: res => {
          try {
            const full = (res as any)?.data || res;
            this.selectedApproval = full as any;
            handleDocsFromApproval(full);
          } finally {
            sub.unsubscribe();
            this.showDocumentDialog = true;
          }
        },
        error: () => {
          handleDocsFromApproval(approval as any);
          this.showDocumentDialog = true;
        },
      });
    } else {
      handleDocsFromApproval(approval as any);
      this.showDocumentDialog = true;
    }
  }

  onPreviewDocument(
    _approval: QCApproval,
    document: { path?: string; filename?: string }
  ): void {
    const path = (document as any)?.path || (document as any)?.filename || '';
    if (!path) return;
    const url = this.imageUrl(path);
    window.open(url, '_blank');
  }

  private extractName(p: string): string {
    if (!p) return 'Document';
    try {
      const clean = p.split('?')[0];
      const parts = clean.split('/');
      return parts[parts.length - 1] || 'Document';
    } catch {
      return 'Document';
    }
  }

  // Utility methods
  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      PENDING: 'bg-yellow-500 text-white border border-yellow-600 shadow-sm',
      APPROVED: 'bg-green-500 text-white border border-green-600 shadow-sm',
      REJECTED: 'bg-red-500 text-white border border-red-600 shadow-sm',
      CANCELLED: 'bg-gray-500 text-white border border-gray-600 shadow-sm',
    };
    const normalized = String(status || '').toUpperCase();
    return (
      classes[normalized] ||
      'bg-gray-500 text-white border border-gray-600 shadow-sm'
    );
  }

  getRowClass(approval: QCApproval): string {
    if (approval.status === 'REJECTED') {
      return 'rejected-row';
    }
    return 'hover:bg-gray-50 transition-colors duration-200';
  }

  onViewRejectionDetails(approval: QCApproval): void {
    if (approval.status !== 'REJECTED') return;
    this.rejectionDetailsApproval = approval;
    this.showRejectionDetailsModal = true;
  }

  getStatusText(status: string): string {
    return status.charAt(0) + status.slice(1).toLowerCase();
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

  // Helper methods for view modal (matching admin dashboard)
  getQCEntryFiles(approval: QCApproval | null): string[] {
    if (!approval) return [];
    if (approval.qcEntryId && typeof approval.qcEntryId === 'object') {
      return approval.qcEntryId.files || [];
    }
    return [];
  }

  hasQCDocuments(approval: QCApproval | null): boolean {
    if (!approval) return false;
    const hasDocuments = approval.documents && approval.documents.length > 0;
    const hasQCFiles =
      approval.qcEntryId &&
      typeof approval.qcEntryId === 'object' &&
      approval.qcEntryId.files &&
      approval.qcEntryId.files.length > 0;
    return !!(hasDocuments || hasQCFiles);
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

  previewDocument(doc: any): void {
    const path = doc.path || doc.file_path || doc.filename;
    if (!path) return;
    const url = this.imageUrl(path);
    window.open(url, '_blank');
  }

  documentUrl(filePath: string): string {
    if (!filePath) return '';
    if (filePath.startsWith('http')) return filePath;
    const base = environment.apiUrl.replace(/\/?api\/?$/, '');
    const normalizedPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
    return `${base}${normalizedPath}`;
  }

  getCategoryName(categoryId: string | any): string {
    if (!categoryId) return '';
    if (typeof categoryId === 'object' && categoryId.name) {
      return categoryId.name;
    }
    if (typeof categoryId === 'string') {
      return categoryId;
    }
    return '';
  }

  getSubcategoryName(subcategoryId: string | any): string {
    if (!subcategoryId) return '';
    if (typeof subcategoryId === 'object' && subcategoryId.name) {
      return subcategoryId.name;
    }
    if (typeof subcategoryId === 'string') {
      return subcategoryId;
    }
    return '';
  }

  // Helper methods matching admin dashboard - updated for SO-based structure
  getMachineName(approval: QCApproval | null): string {
    if (!approval?.machineId) return 'Unknown Machine';
    if (typeof approval.machineId === 'string') return 'Unknown Machine';

    // First try to get from SO
    const soIdValue = approval.machineId.so_id;
    if (soIdValue && typeof soIdValue === 'object' && soIdValue !== null) {
      return soIdValue.name || 'Unknown Machine';
    }

    // Fallback to legacy name field
    return approval.machineId.name || 'Unknown Machine';
  }

  getMachineCategoryName(approval: QCApproval | null): string {
    if (!approval?.machineId) return '-';
    if (typeof approval.machineId === 'string') return '-';

    // First try to get from SO
    const soIdValue = approval.machineId.so_id;
    if (soIdValue && typeof soIdValue === 'object' && soIdValue !== null) {
      const categoryId = soIdValue.category_id;
      if (categoryId && typeof categoryId === 'object' && categoryId !== null) {
        return categoryId.name || '-';
      }
    }

    // Fallback to legacy category_id
    const categoryId = approval.machineId.category_id;
    if (categoryId && typeof categoryId === 'object' && categoryId !== null) {
      return categoryId.name || '-';
    }

    return '-';
  }

  getMachineSubcategoryName(approval: QCApproval | null): string {
    if (!approval?.machineId) return '-';
    if (typeof approval.machineId === 'string') return '-';

    // First try to get from SO
    const soIdValue = approval.machineId.so_id;
    if (soIdValue && typeof soIdValue === 'object' && soIdValue !== null) {
      const subcategoryId = soIdValue.subcategory_id;
      if (
        subcategoryId &&
        typeof subcategoryId === 'object' &&
        subcategoryId !== null
      ) {
        return subcategoryId.name || '-';
      }
    }

    return '-';
  }

  getMachinePartyName(approval: QCApproval | null): string {
    if (!approval?.machineId) return '-';
    if (typeof approval.machineId === 'string') return '-';

    // First try to get from SO
    const soIdValue = approval.machineId.so_id;
    if (soIdValue && typeof soIdValue === 'object' && soIdValue !== null) {
      return soIdValue.party_name || '-';
    }

    return '-';
  }

  getMachineMobileNumber(approval: QCApproval | null): string {
    if (!approval?.machineId) return '-';
    if (typeof approval.machineId === 'string') return '-';

    // First try to get from SO
    const soIdValue = approval.machineId.so_id;
    if (soIdValue && typeof soIdValue === 'object' && soIdValue !== null) {
      return soIdValue.mobile_number || '-';
    }

    return '-';
  }

  getMachineImages(approval: QCApproval | null): string[] {
    if (!approval?.machineId) return [];
    if (typeof approval.machineId === 'string') return [];
    return approval.machineId.images || [];
  }

  getDocumentName(doc: any): string {
    if (!doc) return 'Document';
    if (typeof doc === 'string') {
      return this.extractFileName(doc);
    }
    return (
      doc.originalName ||
      doc.filename ||
      doc.name ||
      doc.file_path ||
      'Document'
    );
  }

  getDocumentSize(doc: any): string {
    if (!doc) return '';
    const size = doc.size;
    if (!size) return '';
    return (size / 1024 / 1024).toFixed(2) + ' MB';
  }

  getDocumentDate(doc: any): string | undefined {
    if (!doc) return undefined;
    return doc.uploadedAt || doc.createdAt || undefined;
  }

  trackByKey(_index: number, item: any): string {
    const key = item?.key ?? _index;
    return String(key);
  }

  // Categories and subcategories for display
  categories: any[] = [];
  subcategories: any[] = [];

  getSubcategoryDisplayName(subcategory: any): string {
    if (!subcategory) return '-';
    if (typeof subcategory === 'string') {
      // If it's a string ID, try to find it in subcategories
      const found = this.subcategories.find(s => s._id === subcategory);
      return found?.name || subcategory;
    }
    if (typeof subcategory === 'object' && subcategory.name) {
      return subcategory.name;
    }
    return '-';
  }

  loadSubcategories(_categoryId: string): void {
    // This will be implemented if needed for subcategory display
    // For now, subcategories will be loaded from the machine data
  }

  imageUrl(path: string): string {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const base = environment.apiUrl.replace(/\/?api\/?$/, '');
    if (path.startsWith('/')) return `${base}${path}`;
    return `${base}/${path}`;
  }

  // Lightbox helpers (reuse from selection)
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

  // Action gating helpers
  canUpdate(approval: QCApproval): boolean {
    return approval.status === 'PENDING' || approval.status === 'REJECTED';
  }

  canEdit(approval: QCApproval): boolean {
    // QC users can edit their own PENDING or REJECTED approvals
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser || !approval.requestedBy) return false;

    const isOwnRequest =
      approval.requestedBy._id === currentUser._id ||
      approval.requestedBy.username === currentUser.username;

    return (
      isOwnRequest &&
      (approval.status === 'PENDING' || approval.status === 'REJECTED')
    );
  }

  trackByApprovalId(index: number, approval: QCApproval): string {
    return approval._id || '';
  }

  formatDate(dateString: string | undefined): string {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  }

  formatDateTime(dateString: string | undefined): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  }

  // Helper methods for QC sequence
  getApprovalMachineSequence(approval: QCApproval | null): string | null {
    if (!approval?.machineId) return null;
    if (
      typeof approval.machineId === 'object' &&
      approval.machineId.machine_sequence
    ) {
      return approval.machineId.machine_sequence;
    }
    return null;
  }

  formatSequenceWithQC(sequence: string | null | undefined): string {
    if (!sequence) return '-';
    return `${sequence}-QC`;
  }

  // Removed unsafe helper; previews open in new tab via onPreviewDocument

  get Math() {
    return Math;
  }

  // Edit functionality
  onEditApproval(approval: QCApproval): void {
    if (!this.canEdit(approval)) {
      this.errorHandler.showWarning(
        'You can only edit your own PENDING or REJECTED approvals'
      );
      return;
    }

    this.editingApproval = approval;
    this.editForm.patchValue({
      qcNotes: approval.qcNotes || '',
      qualityScore: approval.qualityScore || null,
      inspectionDate: approval.inspectionDate
        ? new Date(approval.inspectionDate).toISOString().split('T')[0]
        : '',
      nextInspectionDate: approval.nextInspectionDate
        ? new Date(approval.nextInspectionDate).toISOString().split('T')[0]
        : '',
      requestNotes: approval.requestNotes || '',
    });

    // Load existing documents
    this.editExistingDocuments = [];
    if (approval._id) {
      this.qcEntryService.getQCApprovalById(approval._id).subscribe({
        next: res => {
          const fullApproval = (res as any)?.data || res;
          // Get documents from approval.documents or qcEntryId.files
          const docs = fullApproval?.documents || [];
          const entryFiles = fullApproval?.qcEntryId?.files || [];

          this.editExistingDocuments = [
            ...docs.map((d: any) => ({
              _id: d._id,
              filename: d.filename,
              originalName: d.originalName || d.filename,
              path: d.path || d.filename,
              size: d.size,
              uploadedAt: d.uploadedAt,
            })),
            ...entryFiles.map((f: string) => ({
              filename: this.extractName(f),
              originalName: this.extractName(f),
              path: f,
            })),
          ];
        },
        error: () => {
          // Fallback to approval.documents if available
          if (approval.documents) {
            this.editExistingDocuments = approval.documents.map(d => ({
              _id: d._id,
              filename: d.filename,
              originalName: d.originalName || d.filename,
              path: d.path || d.filename,
              size: d.size,
              uploadedAt: d.uploadedAt,
            }));
          }
        },
      });
    }

    this.showEditModal = true;
  }

  onCancelEdit(): void {
    this.showEditModal = false;
    this.editingApproval = null;
    this.editForm.reset();
    this.editSelectedFiles = [];
    this.editUploading = false;
    this.editExistingDocuments = [];
    this.deletingDocumentId = null;
  }

  onDeleteEditDocument(documentId: string | undefined): void {
    if (!documentId || !this.editingApproval?._id) return;

    // Confirm deletion
    if (
      !confirm(
        'Are you sure you want to delete this document? This action cannot be undone.'
      )
    ) {
      return;
    }

    this.deletingDocumentId = documentId;
    this.qcEntryService
      .deleteApprovalDocument(this.editingApproval._id, documentId)
      .subscribe({
        next: () => {
          // Remove from local list
          this.editExistingDocuments = this.editExistingDocuments.filter(
            d => d._id !== documentId
          );
          this.deletingDocumentId = null;
          this.errorHandler.showSuccess('Document deleted successfully');

          // Refresh the approval data to get updated document list
          if (this.editingApproval?._id) {
            this.qcEntryService
              .getQCApprovalById(this.editingApproval._id)
              .subscribe({
                next: res => {
                  const fullApproval = (res as any)?.data || res;
                  const docs = fullApproval?.documents || [];
                  const entryFiles = fullApproval?.qcEntryId?.files || [];

                  this.editExistingDocuments = [
                    ...docs.map((d: any) => ({
                      _id: d._id,
                      filename: d.filename,
                      originalName: d.originalName || d.filename,
                      path: d.path || d.filename,
                      size: d.size,
                      uploadedAt: d.uploadedAt,
                    })),
                    ...entryFiles.map((f: string) => ({
                      filename: this.extractName(f),
                      originalName: this.extractName(f),
                      path: f,
                    })),
                  ];
                },
                error: () => {},
              });
          }
        },
        error: error => {
          console.error('Error deleting document:', error);
          this.deletingDocumentId = null;
          this.errorHandler.showServerError();
        },
      });
  }

  onPreviewEditDocument(doc: { path?: string; filename?: string }): void {
    const path = doc.path || doc.filename || '';
    if (!path) return;
    const url = this.imageUrl(path);
    window.open(url, '_blank');
  }

  onEditFileSelected(event: any): void {
    const files = event.target.files;
    if (files && files.length > 0) {
      this.editSelectedFiles = Array.from(files);
    }
  }

  onSaveEdit(): void {
    if (!this.editingApproval || !this.editingApproval._id) return;

    this.editLoading = true;
    const formValue = this.editForm.value;

    const updateData: any = {
      qcNotes: formValue.qcNotes || undefined,
      qualityScore: formValue.qualityScore || undefined,
      inspectionDate: formValue.inspectionDate || undefined,
      nextInspectionDate: formValue.nextInspectionDate || undefined,
      requestNotes: formValue.requestNotes || undefined,
    };

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined || updateData[key] === '') {
        delete updateData[key];
      }
    });

    // First update the approval data
    this.qcEntryService
      .updateQCApproval(this.editingApproval._id, updateData)
      .subscribe({
        next: res => {
          // If there are files to upload, upload them
          if (this.editSelectedFiles.length > 0) {
            this.editUploading = true;
            const formData = new FormData();
            this.editSelectedFiles.forEach(file => {
              formData.append('documents', file);
            });

            this.qcEntryService
              .uploadApprovalDocuments(this.editingApproval!._id!, formData)
              .subscribe({
                next: () => {
                  this.errorHandler.showSuccess(
                    res.message ||
                      'QC approval updated successfully with documents'
                  );
                  this.editUploading = false;
                  this.editSelectedFiles = [];
                  this.showEditModal = false;
                  this.editingApproval = null;
                  this.editForm.reset();
                  this.loadApprovals();
                  this.loadStats();
                  this.editLoading = false;
                },
                error: error => {
                  console.error('Error uploading documents:', error);
                  this.errorHandler.showWarning(
                    'Approval updated but document upload failed'
                  );
                  this.editUploading = false;
                  this.editSelectedFiles = [];
                  this.showEditModal = false;
                  this.editingApproval = null;
                  this.editForm.reset();
                  this.loadApprovals();
                  this.loadStats();
                  this.editLoading = false;
                },
              });
          } else {
            // No files to upload, just close
            this.errorHandler.showSuccess(
              res.message || 'QC approval updated successfully'
            );
            this.showEditModal = false;
            this.editingApproval = null;
            this.editForm.reset();
            this.editSelectedFiles = [];
            this.loadApprovals();
            this.loadStats();
            this.editLoading = false;
          }
        },
        error: error => {
          console.error('Error updating QC approval:', error);
          this.errorHandler.showServerError();
          this.editLoading = false;
        },
      });
  }
}

// Remove duplicate/unused SafeUrlPipe
