import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

// Services
import { BaseApiService } from '../../../../core/services/base-api.service';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorHandlerService } from '../../../../core/services/error-handler.service';
import { QCEntryService } from '../../../../core/services/qc-entry.service';
import { MachineService } from '../../../../core/services/machine.service';
import { environment } from '../../../../../environments/environment';
import { CategoryService } from '../../../../core/services/category.service';

// Components
import { QcSidebarComponent } from '../shared/qc-sidebar/qc-sidebar.component';
import { TablePaginationComponent } from '../../../admin/components/user-management/table-pagination.component';
import { ListFiltersComponent } from '../../../admin/components/shared/list/list-filters.component';
import { ListTableShellComponent } from '../../../admin/components/shared/list/list-table-shell.component';
import { PageHeaderComponent } from '../../../../core/components/page-header/page-header.component';
import { NgxDocViewerModule } from 'ngx-doc-viewer';

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
    NgxDocViewerModule,
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
  subcategories: any[] = [];
  filteredMachines: Machine[] = [];
  imageIndexByMachineId: Record<string, number> = {};
  // Track machines that already have a non-rejected QC approval (block selection)
  private blockedApprovalMachineIds: Set<string> = new Set();
  // Track machines that have existing QC entries and their creators
  machinesWithQCEntries: Map<
    string,
    { createdBy: string; createdAt: string; qcEntryId: string }
  > = new Map();
  metadataKeySuggestions: string[] = [];
  allMetadataKeys: string[] = []; // Master list of all keys (like admin)
  showMetadataKeySuggestions = false;

  // Suggestion-based search fields
  partyNameSuggestions: string[] = [];
  showPartyNameSuggestions = false;
  machineSequenceSuggestions: string[] = [];
  showMachineSequenceSuggestions = false;
  locationSuggestions: string[] = [];
  showLocationSuggestions = false;
  mobileNumberSuggestions: string[] = [];
  showMobileNumberSuggestions = false;
  private suggestionDebounceTimers: { [key: string]: any } = {};

  // Filters (matching admin structure)
  filters: {
    search?: string;
    category_id?: string;
    is_approved?: boolean;
    metadata_key?: string;
    metadata_value?: string;
    dispatch_date_from?: string;
    dispatch_date_to?: string;
    // Specific field filters for suggestion-based search
    party_name?: string;
    machine_sequence?: string;
    location?: string;
    mobile_number?: string;
    sortBy?:
      | 'createdAt'
      | 'name'
      | 'category'
      | 'dispatch_date'
      | 'party_name'
      | 'machine_sequence'
      | 'location'
      | 'mobile_number'
      | 'created_by';
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
  // QC Record Info Modal
  showQCRecordModal = false;
  selectedMachineForQCRecord: Machine | null = null;
  qcRecordInfo: {
    createdBy: string;
    createdAt: string;
    qcEntryId: string;
  } | null = null;
  selectedFiles: File[] = [];
  selectedImages: File[] = [];
  selectedDocuments: File[] = [];

  // Document preview state
  previewDocumentVisible = false;
  previewedDocument: File | null = null;
  documentPreviewUrl: string | null = null;
  previewLoading = false;
  previewTextContent = '';
  uploadProgress = 0;
  uploading = false;
  uploadNotes = '';
  uploadReportLink = '';
  // Field-level validation state (modal)
  reportLinkTouched = false;
  reportLinkErrorMsg: string | null = null;

  // Extended QC Entry Fields
  uploadName = '';
  uploadCategoryId = '';
  uploadSubcategoryId = '';
  uploadMachineSequence = '';
  uploadPartyName = '';
  uploadLocation = '';
  uploadMobileNumber = '';
  uploadDispatchDate = '';
  uploadQcDate = '';
  uploadInspectionDate = '';
  uploadNextInspectionDate = '';
  uploadQualityScore: number | null = null;

  constructor(
    private api: BaseApiService,
    private loaderService: LoaderService,
    private errorHandler: ErrorHandlerService,
    private qcEntryService: QCEntryService,
    private categoryService: CategoryService,
    private machineService: MachineService,
    private cdr: ChangeDetectorRef
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
    // Clean up document preview URL
    if (this.documentPreviewUrl) {
      URL.revokeObjectURL(this.documentPreviewUrl);
    }
  }

  loadCategories(): Promise<void> {
    // Use CategoryService to get active categories (same as admin components)
    return new Promise((resolve, reject) => {
      this.categoryService
        .getAllCategories({ includeInactive: false })
        .subscribe({
          next: (res: any) => {
            const data = res?.data || res;
            // Support either { categories: [] } or [] directly
            this.categories = Array.isArray(data)
              ? data
              : data?.categories || [];

            // Re-normalize machines to resolve category names now that categories are loaded
            if (this.machines.length > 0) {
              this.machines = this.machines.map(m => this.normalizeMachine(m));
              this.filteredMachines = [...this.machines];
            }

            resolve();
          },
          error: (error: any) => {
            console.error('Failed to load categories:', error);
            reject(error);
          },
        });
    });
  }

  loadSubcategories(categoryId: string, subcategoryIdToSet?: string): void {
    if (!categoryId) {
      this.subcategories = [];
      this.uploadSubcategoryId = '';
      return;
    }
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
        if (subcategoryIdToSet) {
          const subIdStr = String(subcategoryIdToSet);
          // Check if subcategory exists in the loaded list
          const subExists = this.subcategories.some(
            (s: any) => String(s._id) === subIdStr
          );
          if (subExists) {
            this.uploadSubcategoryId = subIdStr;
          } else if (this.subcategories.length > 0) {
            // If not found but we have subcategories, try to set it anyway (might be valid)
            this.uploadSubcategoryId = subIdStr;
          }
        } else {
          this.uploadSubcategoryId = '';
        }
      },
      error: () => {
        this.subcategories = [];
        // Still set subcategory ID if provided, even if loading failed
        if (subcategoryIdToSet) {
          setTimeout(() => {
            this.uploadSubcategoryId = subcategoryIdToSet;
          }, 150);
        } else {
          this.uploadSubcategoryId = '';
        }
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
    // Specific field filters for suggestion-based search
    if (this.filters.party_name) {
      params.party_name = this.filters.party_name;
    }
    if (this.filters.machine_sequence) {
      params.machine_sequence = this.filters.machine_sequence;
    }
    if (this.filters.location) {
      params.location = this.filters.location;
    }
    if (this.filters.mobile_number) {
      params.mobile_number = this.filters.mobile_number;
    }
    // Always send sort parameters (matching admin pattern)
    params.sortBy = this.filters.sortBy || 'createdAt';
    params.sortOrder = this.filters.sortOrder || 'desc';

    // Use general machines endpoint with approved filter for pagination and server-side filtering
    console.log('[QC Machine Selection] Loading machines with params:', params);
    this.api.get<any>('/machines', params).subscribe({
      next: res => {
        console.log('[QC Machine Selection] Raw API response:', res);
        const data = res?.data || res;
        const serverMachines: Machine[] = (data?.machines ||
          data?.items ||
          data ||
          []) as Machine[];
        console.log(
          '[QC Machine Selection] Server machines received:',
          serverMachines.length
        );
        console.log('[QC Machine Selection] Server machines:', serverMachines);

        // Normalize and enforce approved-only with sequence number (defensive)
        let refined = serverMachines
          .filter(
            m =>
              !!m &&
              m.is_approved === true &&
              m.machine_sequence &&
              m.machine_sequence.trim().length > 0
          )
          .map(m => this.normalizeMachine(m));
        console.log(
          '[QC Machine Selection] After filtering (approved + sequence):',
          refined.length
        );
        console.log('[QC Machine Selection] Filtered machines:', refined);

        // Check for existing QC entries for each machine
        this.checkQCEntriesForMachines(refined)
          .then(() => {
            // Exclude machines that have a PENDING QC approval (can't create new while pending)
            // APPROVED and REJECTED machines will still be visible
            return this.fetchBlockedApprovalsSet();
          })
          .then(() => {
            console.log(
              '[QC Machine Selection] Blocked approval machine IDs:',
              Array.from(this.blockedApprovalMachineIds)
            );
            console.log(
              '[QC Machine Selection] Machines before blocking filter:',
              refined.length
            );
            refined = refined.filter(
              m => !this.blockedApprovalMachineIds.has(m._id)
            );
            console.log(
              '[QC Machine Selection] Machines after blocking filter:',
              refined.length
            );
            console.log(
              '[QC Machine Selection] Final refined machines:',
              refined
            );

            this.machines = refined;
            this.total = data.total || refined.length;
            this.pages = data.pages || Math.ceil(this.total / this.limit);
            this.filteredMachines = [...this.machines];
            console.log(
              '[QC Machine Selection] Final machines array:',
              this.machines.length
            );
            console.log(
              '[QC Machine Selection] Final filteredMachines array:',
              this.filteredMachines.length
            );
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
    this.showPartyNameSuggestions = false;
    this.showMachineSequenceSuggestions = false;
    this.showLocationSuggestions = false;
    this.showMobileNumberSuggestions = false;
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

  // Autocomplete methods for suggestion-based search
  onPartyNameChange(): void {
    const query = this.filters.party_name?.trim() || '';

    // Fetch suggestions
    if (query.length >= 1) {
      clearTimeout(this.suggestionDebounceTimers['partyName']);
      this.suggestionDebounceTimers['partyName'] = setTimeout(() => {
        this.machineService.getSearchSuggestions('partyName', query).subscribe({
          next: res => {
            this.partyNameSuggestions = res.data.suggestions || [];
            this.showPartyNameSuggestions =
              this.partyNameSuggestions.length > 0;
          },
          error: () => {
            this.partyNameSuggestions = [];
            this.showPartyNameSuggestions = false;
          },
        });
      }, 300);
    } else {
      this.showPartyNameSuggestions = false;
      this.partyNameSuggestions = [];
    }

    // Debounce the actual search/filter
    clearTimeout(this.suggestionDebounceTimers['partyNameSearch']);
    this.suggestionDebounceTimers['partyNameSearch'] = setTimeout(() => {
      this.page = 1;
      this.reload();
    }, 500);
  }

  selectPartyName(suggestion: string): void {
    this.filters.party_name = suggestion;
    this.showPartyNameSuggestions = false;
    this.page = 1;
    this.reload();
  }

  hidePartyNameSuggestions(): void {
    setTimeout(() => {
      this.showPartyNameSuggestions = false;
    }, 200);
  }

  onMachineSequenceChange(): void {
    const query = this.filters.machine_sequence?.trim() || '';

    // Fetch suggestions
    if (query.length >= 1) {
      clearTimeout(this.suggestionDebounceTimers['machineSequence']);
      this.suggestionDebounceTimers['machineSequence'] = setTimeout(() => {
        this.machineService
          .getSearchSuggestions('machineSequence', query)
          .subscribe({
            next: res => {
              this.machineSequenceSuggestions = res.data.suggestions || [];
              this.showMachineSequenceSuggestions =
                this.machineSequenceSuggestions.length > 0;
            },
            error: () => {
              this.machineSequenceSuggestions = [];
              this.showMachineSequenceSuggestions = false;
            },
          });
      }, 300);
    } else {
      this.showMachineSequenceSuggestions = false;
      this.machineSequenceSuggestions = [];
    }

    // Debounce the actual search/filter
    clearTimeout(this.suggestionDebounceTimers['machineSequenceSearch']);
    this.suggestionDebounceTimers['machineSequenceSearch'] = setTimeout(() => {
      this.page = 1;
      this.reload();
    }, 500);
  }

  selectMachineSequence(suggestion: string): void {
    this.filters.machine_sequence = suggestion;
    this.showMachineSequenceSuggestions = false;
    this.page = 1;
    this.reload();
  }

  hideMachineSequenceSuggestions(): void {
    setTimeout(() => {
      this.showMachineSequenceSuggestions = false;
    }, 200);
  }

  onLocationChange(): void {
    const query = this.filters.location?.trim() || '';

    // Fetch suggestions
    if (query.length >= 1) {
      clearTimeout(this.suggestionDebounceTimers['location']);
      this.suggestionDebounceTimers['location'] = setTimeout(() => {
        this.machineService.getSearchSuggestions('location', query).subscribe({
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
    } else {
      this.showLocationSuggestions = false;
      this.locationSuggestions = [];
    }

    // Debounce the actual search/filter
    clearTimeout(this.suggestionDebounceTimers['locationSearch']);
    this.suggestionDebounceTimers['locationSearch'] = setTimeout(() => {
      this.page = 1;
      this.reload();
    }, 500);
  }

  selectLocation(suggestion: string): void {
    this.filters.location = suggestion;
    this.showLocationSuggestions = false;
    this.page = 1;
    this.reload();
  }

  hideLocationSuggestions(): void {
    setTimeout(() => {
      this.showLocationSuggestions = false;
    }, 200);
  }

  onMobileNumberChange(): void {
    const query = this.filters.mobile_number?.trim() || '';

    // Fetch suggestions
    if (query.length >= 1) {
      clearTimeout(this.suggestionDebounceTimers['mobileNumber']);
      this.suggestionDebounceTimers['mobileNumber'] = setTimeout(() => {
        this.machineService
          .getSearchSuggestions('mobileNumber', query)
          .subscribe({
            next: res => {
              this.mobileNumberSuggestions = res.data.suggestions || [];
              this.showMobileNumberSuggestions =
                this.mobileNumberSuggestions.length > 0;
            },
            error: () => {
              this.mobileNumberSuggestions = [];
              this.showMobileNumberSuggestions = false;
            },
          });
      }, 300);
    } else {
      this.showMobileNumberSuggestions = false;
      this.mobileNumberSuggestions = [];
    }

    // Debounce the actual search/filter
    clearTimeout(this.suggestionDebounceTimers['mobileNumberSearch']);
    this.suggestionDebounceTimers['mobileNumberSearch'] = setTimeout(() => {
      this.page = 1;
      this.reload();
    }, 500);
  }

  selectMobileNumber(suggestion: string): void {
    this.filters.mobile_number = suggestion;
    this.showMobileNumberSuggestions = false;
    this.page = 1;
    this.reload();
  }

  hideMobileNumberSuggestions(): void {
    setTimeout(() => {
      this.showMobileNumberSuggestions = false;
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
    // Check if machine has existing QC entry - show modal instead
    if (this.hasQCEntry(machine._id)) {
      this.openQCRecordModal(machine);
      return;
    }

    // Guard against duplicate PENDING request for same machine
    // APPROVED and REJECTED approvals should not block creation
    const mid = machine?._id;
    if (!mid) return;

    console.log('[QC Machine Selection] Checking approvals for machine:', mid);
    this.qcEntryService
      .getQCApprovalsByMachine(mid, { page: 1, limit: 5 })
      .subscribe({
        next: res => {
          const approvals = (res as any)?.data?.approvals || [];
          console.log(
            '[QC Machine Selection] Approvals found for machine:',
            mid,
            approvals
          );
          console.log(
            '[QC Machine Selection] Approval statuses:',
            approvals.map((a: any) => ({
              id: a?._id,
              status: a?.status,
              requestedBy: a?.requestedBy?.name || a?.requestedBy?.username,
            }))
          );

          // Only block if there's a PENDING approval for QC ENTRY creation (MACHINE_QC_ENTRY)
          // Don't block for MACHINE_QC_EDIT (sequence changes) or other approval types
          const pendingQCEntryApproval = approvals.find(
            (a: any) =>
              a?.status === 'PENDING' && a?.approvalType === 'MACHINE_QC_ENTRY'
          );
          if (pendingQCEntryApproval) {
            console.log(
              '[QC Machine Selection] Found PENDING QC ENTRY approval, blocking:',
              pendingQCEntryApproval
            );
            const requester =
              pendingQCEntryApproval?.requestedBy?.name ||
              pendingQCEntryApproval?.requestedBy?.username ||
              'another user';
            this.errorHandler.showWarning(
              `A pending QC request already exists by ${requester}.`,
              'Already Requested'
            );
            return;
          }

          console.log(
            '[QC Machine Selection] No PENDING MACHINE_QC_ENTRY approval found. Other approvals:',
            approvals.map((a: any) => ({
              id: a?._id,
              status: a?.status,
              approvalType: a?.approvalType,
              requestedBy: a?.requestedBy?.name || a?.requestedBy?.username,
            }))
          );

          console.log(
            '[QC Machine Selection] No PENDING approval found, proceeding with attach modal'
          );

          // If there's an APPROVED approval but no QC entry in our map,
          // it might have been approved via edit modal - check and show QC Record modal
          const approvedApproval = approvals.find(
            (a: any) => a?.status === 'APPROVED'
          );
          if (approvedApproval && approvedApproval.qcEntryId) {
            // Re-check QC entries to see if we missed it
            this.checkQCEntriesForMachines([machine]).then(() => {
              if (this.hasQCEntry(machine._id)) {
                this.openQCRecordModal(machine);
                return;
              }
              // If still no QC entry found, proceed with attach modal
              this.proceedWithAttachModal(machine);
            });
            return;
          }

          // No blocking approvals - proceed with attach modal
          this.proceedWithAttachModal(machine);
        },
        error: () => {
          // if check fails, still allow; server will enforce
          console.error(
            '[QC Machine Selection] Error checking approvals, proceeding anyway'
          );
          this.proceedWithAttachModal(machine);
        },
      });
  }

  onFileSelected(event: any): void {
    const files = event.target.files;
    if (files && files.length > 0) {
      this.selectedFiles = Array.from(files);
    }
  }

  onUploadImageSelected(event: any): void {
    const files = event.target.files;
    if (files && files.length > 0) {
      this.selectedImages = Array.from(files);
    }
  }

  onUploadDocumentSelected(event: any): void {
    const files = event.target.files;
    if (files && files.length > 0) {
      this.selectedDocuments = Array.from(files);
    }
  }

  // Document preview methods for uploaded files (before submission)
  previewUploadedDocument(doc: File, _index: number): void {
    this.previewedDocument = doc;
    this.previewLoading = true;
    this.previewDocumentVisible = true;

    // Create blob URL for preview (local file preview)
    if (this.documentPreviewUrl) {
      URL.revokeObjectURL(this.documentPreviewUrl);
    }

    // Create blob from file for ngx-doc-viewer
    const blob = new Blob([doc], { type: doc.type });
    this.documentPreviewUrl = URL.createObjectURL(blob);

    // For text files, read content
    if (this.isTextFile(doc)) {
      const reader = new FileReader();
      reader.onload = e => {
        this.previewTextContent = (e.target?.result as string) || '';
        this.previewLoading = false;
      };
      reader.onerror = () => {
        this.previewTextContent = 'Error reading file content.';
        this.previewLoading = false;
      };
      reader.readAsText(doc);
    } else {
      // Small delay to ensure blob URL is ready
      setTimeout(() => {
        this.previewLoading = false;
      }, 100);
    }
  }

  closeDocumentPreview(): void {
    this.previewDocumentVisible = false;
    if (this.documentPreviewUrl) {
      URL.revokeObjectURL(this.documentPreviewUrl);
      this.documentPreviewUrl = null;
    }
    this.previewedDocument = null;
    this.previewTextContent = '';
  }

  downloadPreviewedDocument(): void {
    if (!this.previewedDocument) return;
    const url = URL.createObjectURL(this.previewedDocument);
    const link = document.createElement('a');
    link.href = url;
    link.download = this.previewedDocument.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // File type helpers for uploaded files
  isPdfFile(file: File): boolean {
    return (
      file.type === 'application/pdf' ||
      file.name.toLowerCase().endsWith('.pdf')
    );
  }

  isWordFile(file: File): boolean {
    return (
      file.type === 'application/msword' ||
      file.type ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.name.toLowerCase().endsWith('.doc') ||
      file.name.toLowerCase().endsWith('.docx')
    );
  }

  isExcelFile(file: File): boolean {
    return (
      file.type === 'application/vnd.ms-excel' ||
      file.type ===
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.name.toLowerCase().endsWith('.xls') ||
      file.name.toLowerCase().endsWith('.xlsx')
    );
  }

  isImageFile(file: File): boolean {
    return file.type.startsWith('image/');
  }

  isTextFile(file: File): boolean {
    return (
      file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt')
    );
  }

  isOfficeFile(file: File): boolean {
    return (
      this.isWordFile(file) ||
      this.isExcelFile(file) ||
      this.isPowerPointFile(file)
    );
  }

  isPowerPointFile(file: File): boolean {
    return (
      file.type === 'application/vnd.ms-powerpoint' ||
      file.type ===
        'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
      file.name.toLowerCase().endsWith('.ppt') ||
      file.name.toLowerCase().endsWith('.pptx')
    );
  }

  isArchiveFile(file: File): boolean {
    return (
      file.type === 'application/zip' ||
      file.type === 'application/x-rar-compressed' ||
      file.type === 'application/x-7z-compressed' ||
      file.type === 'application/x-zip-compressed' ||
      file.name.toLowerCase().endsWith('.zip') ||
      file.name.toLowerCase().endsWith('.rar') ||
      file.name.toLowerCase().endsWith('.7z')
    );
  }

  getViewerType(file: File): 'google' | 'office' | 'mammoth' | 'pdf' | 'url' {
    if (this.isPdfFile(file)) {
      return 'pdf';
    } else if (this.isOfficeFile(file)) {
      return 'office';
    }
    return 'url';
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  // Helper method to proceed with opening the attach modal
  private proceedWithAttachModal(machine: Machine): void {
    this.selectedMachineForUpload = machine;
    // Populate fields from machine
    this.uploadName = machine.name || '';

    // Extract category ID - handle both object and string
    let categoryId = '';
    if (machine.category_id) {
      if (
        typeof machine.category_id === 'object' &&
        machine.category_id !== null
      ) {
        categoryId = String(machine.category_id._id || '');
      } else if (typeof machine.category_id === 'string') {
        categoryId = machine.category_id;
      }
    }

    // Extract subcategory ID - handle both object and string
    let subcategoryId = '';
    if (machine.subcategory_id) {
      if (
        typeof machine.subcategory_id === 'object' &&
        machine.subcategory_id !== null
      ) {
        subcategoryId = String(machine.subcategory_id._id || '');
      } else if (typeof machine.subcategory_id === 'string') {
        subcategoryId = machine.subcategory_id;
      }
    }

    // Ensure categories are loaded before setting category ID
    if (this.categories.length === 0) {
      this.loadCategories()
        .then(() => {
          this.setMachineFieldsInModal(machine, categoryId, subcategoryId);
        })
        .catch(() => {
          this.setMachineFieldsInModal(machine, categoryId, subcategoryId);
        });
    } else {
      this.setMachineFieldsInModal(machine, categoryId, subcategoryId);
    }
  }

  // Helper method to set machine fields in modal
  setMachineFieldsInModal(
    machine: Machine,
    categoryId: string,
    subcategoryId: string
  ): void {
    // Set all fields first
    this.uploadMachineSequence = machine.machine_sequence || '';
    this.uploadPartyName = machine.party_name || '';
    this.uploadLocation = machine.location || '';
    this.uploadMobileNumber = machine.mobile_number || '';
    this.uploadDispatchDate = machine.dispatch_date
      ? typeof machine.dispatch_date === 'string'
        ? machine.dispatch_date.split('T')[0]
        : new Date(machine.dispatch_date).toISOString().split('T')[0]
      : '';

    // Reset file selections
    this.selectedFiles = [];
    this.selectedImages = [];
    this.selectedDocuments = [];
    this.uploadNotes = '';
    this.uploadReportLink = '';
    this.uploadQcDate = '';
    this.uploadInspectionDate = '';
    this.uploadNextInspectionDate = '';
    this.uploadQualityScore = null;
    this.reportLinkTouched = false;
    this.reportLinkErrorMsg = null;

    // Show modal first
    this.showDocumentModal = true;

    // Set category and subcategory directly - simple and straightforward
    if (categoryId && this.categories.length > 0) {
      const catIdStr = String(categoryId);
      const matchingCat = this.categories.find(c => String(c._id) === catIdStr);

      if (matchingCat) {
        this.uploadCategoryId = catIdStr;
        // Load subcategories for this category
        if (subcategoryId) {
          this.loadSubcategories(this.uploadCategoryId, String(subcategoryId));
        } else {
          this.loadSubcategories(this.uploadCategoryId);
        }
      }
    } else {
      this.uploadCategoryId = '';
      this.uploadSubcategoryId = '';
      this.subcategories = [];
    }
  }

  onUploadCategoryChange(): void {
    if (this.uploadCategoryId) {
      this.loadSubcategories(this.uploadCategoryId);
      this.uploadSubcategoryId = ''; // Reset subcategory when category changes
    } else {
      this.subcategories = [];
      this.uploadSubcategoryId = '';
    }
  }

  // Helper to get existing images and documents from machine
  getExistingImages(): string[] {
    return this.selectedMachineForUpload?.images || [];
  }

  getExistingDocuments(): Array<{
    name: string;
    file_path: string;
    document_type?: string;
    _id?: string;
  }> {
    return this.selectedMachineForUpload?.documents || [];
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
          // Only block PENDING approvals for QC ENTRY creation (MACHINE_QC_ENTRY)
          // Don't block for MACHINE_QC_EDIT (sequence changes) or other approval types
          const pendingQCEntryApproval = approvals.find(
            (a: any) =>
              a?.status === 'PENDING' && a?.approvalType === 'MACHINE_QC_ENTRY'
          );
          if (pendingQCEntryApproval) {
            const requester =
              pendingQCEntryApproval?.requestedBy?.name ||
              pendingQCEntryApproval?.requestedBy?.username ||
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
    // Validate required fields
    if (!this.uploadName.trim()) {
      this.errorHandler.showWarning('Machine name is required');
      return;
    }
    if (!this.uploadCategoryId) {
      this.errorHandler.showWarning('Category is required');
      return;
    }
    if (!this.uploadPartyName.trim()) {
      this.errorHandler.showWarning('Party name is required');
      return;
    }
    if (!this.uploadLocation.trim()) {
      this.errorHandler.showWarning('Location is required');
      return;
    }
    if (!this.uploadMobileNumber.trim()) {
      this.errorHandler.showWarning('Mobile number is required');
      return;
    }

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

    // Machine fields
    formData.append('name', this.uploadName.trim());
    formData.append('category_id', this.uploadCategoryId);
    if (this.uploadSubcategoryId) {
      formData.append('subcategory_id', this.uploadSubcategoryId);
    }
    if (this.uploadMachineSequence.trim()) {
      formData.append('machine_sequence', this.uploadMachineSequence.trim());
    }
    formData.append('party_name', this.uploadPartyName.trim());
    formData.append('location', this.uploadLocation.trim());
    formData.append('mobile_number', this.uploadMobileNumber.trim());
    if (this.uploadDispatchDate) {
      formData.append('dispatch_date', this.uploadDispatchDate);
    }

    // QC-specific fields
    if (this.uploadNotes.trim()) {
      formData.append('qcNotes', this.uploadNotes.trim());
    }
    if (
      this.uploadQualityScore !== null &&
      this.uploadQualityScore !== undefined
    ) {
      formData.append('qualityScore', this.uploadQualityScore.toString());
    }
    if (this.uploadQcDate) {
      formData.append('qc_date', this.uploadQcDate);
    }
    if (this.uploadInspectionDate) {
      formData.append('inspectionDate', this.uploadInspectionDate);
    }
    if (this.uploadNextInspectionDate) {
      formData.append('nextInspectionDate', this.uploadNextInspectionDate);
    }
    if (this.uploadReportLink.trim()) {
      formData.append('report_link', this.uploadReportLink.trim());
    }

    // Files
    this.selectedImages.forEach(file => formData.append('images', file));
    this.selectedDocuments.forEach(file => formData.append('documents', file));
    this.selectedFiles.forEach(file => formData.append('files', file));

    console.log('[QC Machine Selection] Submitting QC entry form...');
    console.log(
      '[QC Machine Selection] Machine ID:',
      (this.selectedMachineForUpload as Machine)?._id
    );
    console.log(
      '[QC Machine Selection] Form data keys:',
      Array.from(formData.keys())
    );

    this.api.post<any>('/qc-machines', formData).subscribe({
      next: response => {
        console.log('[QC Machine Selection] QC entry created successfully!');
        console.log('[QC Machine Selection] Response:', response);
        const qcEntryId = response?.data?._id || (response?.data as any)?._id;
        console.log('[QC Machine Selection] QC Entry ID:', qcEntryId);

        this.uploading = false;
        this.uploadProgress = 100;
        this.showDocumentModal = false;
        this.selectedFiles = [];
        this.selectedImages = [];
        this.selectedDocuments = [];
        this.selectedMachineForUpload = null;
        this.uploadName = '';
        this.uploadCategoryId = '';
        this.uploadSubcategoryId = '';
        this.uploadMachineSequence = '';
        this.uploadPartyName = '';
        this.uploadLocation = '';
        this.uploadMobileNumber = '';
        this.uploadDispatchDate = '';
        this.uploadNotes = '';
        this.uploadReportLink = '';
        this.uploadQcDate = '';
        this.uploadInspectionDate = '';
        this.uploadNextInspectionDate = '';
        this.uploadQualityScore = null;
        this.reportLinkTouched = false;
        this.reportLinkErrorMsg = null;
        this.subcategories = [];

        this.errorHandler.showSuccess(
          'QC entry created and approval requested successfully'
        );

        // Wait a moment for the backend to create the approval record
        // The approval is created asynchronously, so we need to give it time
        console.log(
          '[QC Machine Selection] Waiting 2 seconds for approval to be created...'
        );
        setTimeout(() => {
          console.log(
            '[QC Machine Selection] Navigating to approval management page...'
          );
          // Navigate to QC approval management after creating the request
          // Add timestamp to URL to force reload and ensure fresh data
          try {
            // Router is not injected in this component; use direct location change
            const timestamp = new Date().getTime();
            const targetUrl = `/qc/approval-management?refresh=${timestamp}`;
            console.log('[QC Machine Selection] Navigation URL:', targetUrl);
            window.location.href = targetUrl;
          } catch (error) {
            console.error('[QC Machine Selection] Navigation error:', error);
            this.loadMachines();
          }
        }, 2000); // Wait 2 seconds for approval to be created and saved
      },
      error: error => {
        console.error('[QC Machine Selection] Error creating QC entry:', error);
        console.error('[QC Machine Selection] Error details:', {
          status: error?.status,
          message: error?.message,
          error: error?.error,
        });
        this.uploading = false;
        this.uploadProgress = 0;
        this.errorHandler.showServerError();
      },
    });
  }

  onCancelUpload(): void {
    this.showDocumentModal = false;
    this.selectedFiles = [];
    this.selectedImages = [];
    this.selectedDocuments = [];
    this.selectedMachineForUpload = null;
    this.uploadName = '';
    this.uploadCategoryId = '';
    this.uploadSubcategoryId = '';
    this.uploadMachineSequence = '';
    this.uploadPartyName = '';
    this.uploadLocation = '';
    this.uploadMobileNumber = '';
    this.uploadDispatchDate = '';
    this.uploadNotes = '';
    this.uploadReportLink = '';
    this.uploadQcDate = '';
    this.uploadInspectionDate = '';
    this.uploadNextInspectionDate = '';
    this.uploadQualityScore = null;
    this.reportLinkTouched = false;
    this.reportLinkErrorMsg = null;
    this.uploading = false;
    this.uploadProgress = 0;
    this.subcategories = [];
  }

  // Check which machines have existing QC entries
  private checkQCEntriesForMachines(machines: Machine[]): Promise<void> {
    return new Promise(resolve => {
      console.log(
        '[QC Machine Selection] Checking QC entries for machines:',
        machines.length
      );
      this.machinesWithQCEntries.clear();
      if (machines.length === 0) {
        console.log(
          '[QC Machine Selection] No machines to check QC entries for'
        );
        resolve();
        return;
      }

      // Check QC entries for all machines in parallel using the machine-specific endpoint
      const checkPromises = machines.map(machine =>
        this.api
          .get<any>(`/qc-machines/machine/${machine._id}`, {
            page: 1,
            limit: 1,
          })
          .toPromise()
          .then((res: any) => {
            console.log(
              `[QC Machine Selection] QC entry check for machine ${machine._id}:`,
              res
            );
            const data = res?.data || res;
            const entries =
              data?.entries || data?.items || data?.qaEntries || [];

            console.log(
              `[QC Machine Selection] Machine ${machine._id} - entries found:`,
              entries.length,
              entries
            );

            // Only mark as having QC entry if we actually have a valid entry with an _id
            if (entries.length > 0 && entries[0] && entries[0]._id) {
              const entry = entries[0];
              console.log(
                `[QC Machine Selection] Machine ${machine._id} HAS QC entry:`,
                entry
              );

              // Get creator info from added_by field (QC person who created the QC entry)
              // IMPORTANT: This is the QC person, NOT the machine creator
              let createdBy = 'Unknown';
              if (entry.added_by) {
                if (typeof entry.added_by === 'object') {
                  // Prefer name, fallback to username, then email
                  createdBy =
                    entry.added_by.name ||
                    entry.added_by.username ||
                    entry.added_by.email ||
                    'Unknown';
                  console.log(
                    '[QC Machine Selection] QC Entry creator (added_by):',
                    {
                      name: entry.added_by.name,
                      username: entry.added_by.username,
                      email: entry.added_by.email,
                      final: createdBy,
                    }
                  );
                } else {
                  createdBy = entry.added_by;
                }
              } else if (entry.addedBy) {
                // Handle camelCase variant
                if (typeof entry.addedBy === 'object') {
                  createdBy =
                    entry.addedBy.name ||
                    entry.addedBy.username ||
                    entry.addedBy.email ||
                    'Unknown';
                } else {
                  createdBy = entry.addedBy;
                }
              } else {
                console.warn(
                  '[QC Machine Selection] No added_by field found in QC entry:',
                  entry
                );
              }
              this.machinesWithQCEntries.set(machine._id, {
                createdBy: createdBy,
                createdAt: entry.createdAt || entry.created_at || '',
                qcEntryId: entry._id || '',
              });
              console.log(
                `[QC Machine Selection] Added machine ${machine._id} to machinesWithQCEntries`
              );
            } else {
              console.log(
                `[QC Machine Selection] Machine ${machine._id} does NOT have QC entry`
              );
            }
          })
          .catch((err: any) => {
            console.error(
              `[QC Machine Selection] Error checking QC entry for machine ${machine._id}:`,
              err
            );
            // Ignore errors for individual machines - don't mark as having QC entry on error
          })
      );

      Promise.all(checkPromises)
        .then(() => {
          console.log(
            '[QC Machine Selection] QC entries check completed. Machines with QC entries:',
            Array.from(this.machinesWithQCEntries.keys())
          );
          console.log(
            '[QC Machine Selection] QC entries map:',
            this.machinesWithQCEntries
          );
          resolve();
        })
        .catch(err => {
          console.error(
            '[QC Machine Selection] Error checking QC entries:',
            err
          );
          resolve();
        });
    });
  }

  // Check if a machine has an existing QC entry
  hasQCEntry(machineId: string): boolean {
    return this.machinesWithQCEntries.has(machineId);
  }

  // Get QC entry info for a machine
  getQCEntryInfo(
    machineId: string
  ): { createdBy: string; createdAt: string; qcEntryId: string } | null {
    return this.machinesWithQCEntries.get(machineId) || null;
  }

  // Build set of machineIds having a PENDING QC approval to exclude from selection
  // Only block PENDING approvals - APPROVED and REJECTED should still be visible
  // Also check QC entry's approval_status to handle cases where entry is approved but approval record is still PENDING
  private fetchBlockedApprovalsSet(): Promise<void> {
    return new Promise(resolve => {
      console.log('[QC Machine Selection] Fetching blocked approvals set...');
      this.qcEntryService.getQCApprovals({ page: 1, limit: 1000 }).subscribe({
        next: res => {
          console.log('[QC Machine Selection] QC Approvals API response:', res);
          const approvals = (res as any)?.data?.approvals || [];
          console.log(
            '[QC Machine Selection] QC Approvals received:',
            approvals.length
          );
          console.log('[QC Machine Selection] QC Approvals data:', approvals);
          const ids = new Set<string>();

          // Process approvals and fetch QC entry data for those that need it
          const promises: Promise<void>[] = [];

          approvals.forEach((a: any) => {
            const mid =
              a?.machineId && typeof a.machineId === 'object'
                ? a.machineId._id
                : a?.machineId;

            if (!mid) return;

            // Check both QC approval status and QC entry approval_status
            const approvalStatus = a?.status;

            // qcEntryId might be a populated object (from $lookup) or just an ID string
            let qcEntryStatus = null;
            let qcEntryIsActive = null;
            let qcEntryId: string | null = null;

            if (a?.qcEntryId) {
              if (typeof a.qcEntryId === 'object' && a.qcEntryId !== null) {
                // It's a populated object from aggregation
                qcEntryStatus = a.qcEntryId.approval_status || null;
                qcEntryIsActive =
                  a.qcEntryId.is_active !== undefined
                    ? a.qcEntryId.is_active
                    : null;
                qcEntryId = a.qcEntryId._id || null;
              } else if (typeof a.qcEntryId === 'string') {
                // It's just an ID - fetch it separately
                qcEntryId = a.qcEntryId;
              }
            }

            console.log('[QC Machine Selection] Processing approval:', {
              machineId: mid,
              approvalStatus: approvalStatus,
              qcEntryId: qcEntryId,
              qcEntryIdRaw: a?.qcEntryId,
              qcEntryIdType: typeof a?.qcEntryId,
              qcEntryStatus: qcEntryStatus,
              qcEntryIsActive: qcEntryIsActive,
              fullApproval: a,
            });

            // If we have a QC entry ID but no status data, fetch it
            if (
              qcEntryId &&
              qcEntryStatus === null &&
              qcEntryIsActive === null &&
              approvalStatus === 'PENDING'
            ) {
              const fetchPromise = this.qcEntryService
                .getQCEntryById(qcEntryId)
                .toPromise()
                .then((entryRes: any) => {
                  const entry = entryRes?.data || entryRes;
                  const entryStatus = entry?.approval_status || null;
                  const entryActive =
                    entry?.is_active !== undefined ? entry?.is_active : null;

                  console.log('[QC Machine Selection] Fetched QC entry data:', {
                    qcEntryId: qcEntryId,
                    approval_status: entryStatus,
                    is_active: entryActive,
                    entry: entry,
                  });

                  // Only block if QC entry is confirmed NOT approved
                  if (entryStatus !== 'APPROVED' && entryActive !== true) {
                    console.log(
                      '[QC Machine Selection] Blocking machine after fetching QC entry:',
                      mid
                    );
                    ids.add(String(mid));
                  } else {
                    console.log(
                      '[QC Machine Selection] NOT blocking - QC entry is approved:',
                      mid
                    );
                  }
                })
                .catch((err: any) => {
                  console.error(
                    '[QC Machine Selection] Error fetching QC entry:',
                    qcEntryId,
                    err
                  );
                  // On error, don't block (let it through)
                });
              promises.push(fetchPromise);
            } else {
              // We have QC entry data or no QC entry - process immediately
              const hasQCEntryData =
                qcEntryStatus !== null || qcEntryIsActive !== null;
              const isQCEntryApproved =
                qcEntryStatus === 'APPROVED' || qcEntryIsActive === true;

              // Only block if:
              // 1. Status is PENDING AND
              // 2. QC entry is confirmed to NOT be approved (we have QC entry data and it's not approved)
              // If we don't have QC entry data, don't block (let it through - might be approved via edit modal)
              const shouldBlock =
                approvalStatus === 'PENDING' &&
                hasQCEntryData && // Only block if we have QC entry data
                !isQCEntryApproved; // And it's confirmed not approved

              if (shouldBlock) {
                console.log(
                  '[QC Machine Selection] Blocking machine with PENDING approval:',
                  mid
                );
                ids.add(String(mid));
              } else {
                console.log(
                  '[QC Machine Selection] NOT blocking machine:',
                  mid,
                  'Approval Status:',
                  approvalStatus,
                  'QC Entry Status:',
                  qcEntryStatus,
                  'QC Entry Active:',
                  qcEntryIsActive,
                  'Has QC Entry Data:',
                  hasQCEntryData
                );
              }
            }
          });

          // Wait for all QC entry fetches to complete
          Promise.all(promises)
            .then(() => {
              this.blockedApprovalMachineIds = ids;
              console.log(
                '[QC Machine Selection] Final blocked machine IDs:',
                Array.from(this.blockedApprovalMachineIds)
              );
              resolve();
            })
            .catch(() => {
              this.blockedApprovalMachineIds = ids;
              console.log(
                '[QC Machine Selection] Final blocked machine IDs (with errors):',
                Array.from(this.blockedApprovalMachineIds)
              );
              resolve();
            });
        },
        error: err => {
          console.error(
            '[QC Machine Selection] Error fetching blocked approvals:',
            err
          );
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

  // QC Record Info Modal methods
  openQCRecordModal(machine: Machine): void {
    this.selectedMachineForQCRecord = machine;
    this.qcRecordInfo = this.getQCEntryInfo(machine._id);
    this.showQCRecordModal = true;
  }

  closeQCRecordModal(): void {
    this.showQCRecordModal = false;
    this.selectedMachineForQCRecord = null;
    this.qcRecordInfo = null;
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
    if (!machine) return 'Unknown';

    // Handle populated object from backend
    if (
      machine.category_id &&
      typeof machine.category_id === 'object' &&
      machine.category_id !== null
    ) {
      return machine.category_id.name || 'Unknown';
    }

    // Handle string ID - try to find in loaded categories
    if (typeof machine.category_id === 'string') {
      const categoryIdStr = machine.category_id;
      const foundCat = this.categories.find(
        c => String(c._id) === categoryIdStr
      );
      return foundCat ? foundCat.name : 'Unknown';
    }

    return 'Unknown';
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

  // Normalize incoming machine to ensure metadata is key/value array and preserve category/subcategory
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

    // Preserve category_id and subcategory_id as-is from backend
    // Backend should populate them as objects with _id, name, etc.
    // Don't modify them - just preserve what backend sends
    return {
      ...m,
      metadata: normalizedMetadata,
      // Preserve category_id and subcategory_id exactly as backend sends them
      category_id: m?.category_id || null,
      subcategory_id: m?.subcategory_id || null,
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
    const url = this.documentUrl(doc.file_path);
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
    let fileName = doc.name || doc.originalname || doc.filename || 'document';

    // Remove any existing extension to avoid duplicates
    const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');

    // Get extension from file_path if available, or from document_type
    let extension = '';
    if (doc.file_path) {
      const match = doc.file_path.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
      if (match) {
        extension = match[1];
      }
    }

    // If no extension from URL, try to get from document_type/mimetype
    if (!extension && doc.document_type) {
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
      extension = mimeToExt[doc.document_type] || '';
    }

    // If still no extension, try to extract from original filename
    if (!extension && (doc.originalname || doc.name)) {
      const originalName = doc.originalname || doc.name;
      const match = originalName.match(/\.([a-zA-Z0-9]+)$/);
      if (match) {
        extension = match[1];
      }
    }

    // Return filename with extension
    return extension ? `${nameWithoutExt}.${extension}` : fileName;
  }

  previewDocument(doc: any): void {
    // Open document in new tab for preview
    const url = this.documentUrl(doc.file_path);
    window.open(url, '_blank');
  }

  documentUrl(filePath: string): string {
    if (!filePath) return '';
    // If it's already a full URL (Cloudinary or other external URLs), return as-is
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      return filePath;
    }
    // Construct the full URL for the document using environment baseUrl
    const baseUrl = environment.apiUrl.replace(/\/?api\/?$/, '');
    // Ensure filePath starts with / if it doesn't already
    const normalizedPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
    return `${baseUrl}${normalizedPath}`;
  }
}
