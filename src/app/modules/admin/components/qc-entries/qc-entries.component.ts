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

interface QCApproval {
  _id?: string;
  machineId: {
    _id: string;
    name: string;
    category_id: {
      _id: string;
      name: string;
    };
    images: string[];
  };
  requestedBy: {
    _id: string;
    username: string;
    name: string;
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
  machineActivated?: boolean;
  activationDate?: string;
  documents?: Array<{
    _id?: string;
    filename: string;
    originalName: string;
    path: string;
    mimeType: string;
    size: number;
    uploadedAt: string;
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

@Component({
  selector: 'app-qc-entries',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    AdminSidebarComponent,
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
  approvalMode: 'approve' | 'reject' = 'approve';
  approvalNotes = '';
  rejectionReason = '';

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
        this.currentPage = 1;
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
        this.currentPage = 1;
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
      page: this.currentPage,
      limit: this.pageSize,
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
        const data = res?.data || res;
        this.approvals = (data.approvals || []) as unknown as QCApproval[];
        this.totalCount = data.total || 0;
        this.totalPages =
          data.pages || Math.ceil(this.totalCount / this.pageSize);
        this.filteredApprovals = [...this.approvals];
        this.loading = false;
        this.loaderService.hideGlobalLoader();
      },
      error: (_error: any) => {
        console.error('Error loading QC entries:', _error);
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
    this.filtersForm.reset();
    this.currentPage = 1;
    this.loadApprovals();
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
    this.selectedApproval = approval;
    this.approvalMode = 'approve';
    this.approvalNotes = '';
    this.showApprovalDialog = true;
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
    // Open approval details modal or navigate to details page
    console.log('View approval details:', approval);
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
    this.selectedApproval = approval;
    this.showDocumentDialog = true;
  }

  onDownloadDocument(_approval: QCApproval, document: any): void {
    const url = `${environment.baseUrl}/uploads/qc-approvals/${document.filename}`;
    window.open(url, '_blank');
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
    const classes = {
      PENDING: 'bg-warning text-white',
      APPROVED: 'bg-success text-white',
      REJECTED: 'bg-error text-white',
      CANCELLED: 'bg-gray-500 text-white',
    };
    return classes[status as keyof typeof classes] || 'bg-gray-500 text-white';
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

  getMachineImageUrl(imagePath: string): string {
    return `${environment.baseUrl}/uploads/machines/${imagePath}`;
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
}
