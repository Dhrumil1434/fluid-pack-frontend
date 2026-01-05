import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
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
import { CategoryService } from '../../../core/services/category.service';
import { MachineService } from '../../../core/services/machine.service';
import { SOService } from '../../../core/services/so.service';
import { SO } from '../../../core/models/so.model';
import {
  SequenceGenerationRequest,
  SequenceConfig,
} from '../../../core/models/category.model';
import { CreateMachineModalComponent } from '../components/create-machine-modal/create-machine-modal.component';
import { EditMachineModalComponent } from '../components/edit-machine-modal/edit-machine-modal.component';
import { PageHeaderComponent } from '../../../core/components/page-header/page-header.component';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

interface MachineRow {
  _id: string;
  so_id: string; // Reference to SO
  so?: SO | null; // Populated SO data (optional, for display)
  images?: string[];
  documents?: Array<{
    name: string;
    file_path: string;
    document_type?: string;
  }>;
  is_approved: boolean;
  location?: string;
  machine_sequence?: string;
  dispatch_date?: string | Date;
  createdAt: string;
  updatedAt?: string;
  updatedBy?: { username?: string };
  metadata?: Record<string, any>;
  approvalStatus?: 'pending' | 'approved' | 'rejected' | null;
  rejectionReason?: string | null;
  approverNotes?: string | null;
  decisionByName?: string | null;
  decisionDate?: string | null;
  created_by?: { username: string; email?: string };
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
    CreateMachineModalComponent,
    EditMachineModalComponent,
    PageHeaderComponent,
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
      <!-- Header -->
      <app-page-header
        title="Machines"
        subtitle="Manage your machine records"
        [sidebarCollapsed]="sidebarCollapsed"
        (toggleSidebar)="sidebarCollapsed = !sidebarCollapsed"
      >
        <div headerActions class="flex items-center gap-2">
          <button
            class="px-4 py-2 bg-primary text-white rounded-md font-medium transition-colors duration-150 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            [disabled]="!canCreate"
            (click)="openCreate()"
            title="Create new machine"
          >
            <i class="pi pi-plus mr-2"></i>
            Create Machine
          </button>
        </div>
      </app-page-header>

      <div class="p-6 space-y-6">
        <p-toast></p-toast>

        <!-- Create Machine Modal -->
        <app-create-machine-modal
          [visible]="createVisible"
          (cancel)="createVisible = false"
          (created)="onMachineCreated()"
        ></app-create-machine-modal>

        <app-edit-machine-modal
          [visible]="editMachineVisible"
          [machine]="editingMachineForEdit"
          (close)="closeEditMachineModal()"
          (saved)="onMachineUpdated($event)"
        ></app-edit-machine-modal>

        <!-- Filters & Search -->
        <div
          class="bg-bg border border-neutral-300 rounded-xl shadow-medium p-4 mb-4"
        >
          <!-- Help Section -->
          <div class="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div class="flex items-start gap-2">
              <i class="pi pi-info-circle text-blue-600 mt-0.5"></i>
              <div class="flex-1">
                <h4 class="text-sm font-semibold text-blue-900 mb-1">
                  How to Search Machines
                </h4>
                <p class="text-xs text-blue-800 mb-2">
                  You can search machines by typing any of the following in the
                  search box:
                </p>
                <ul class="text-xs text-blue-700 space-y-1 ml-4 list-disc">
                  <li>
                    <strong>SO Number:</strong> Type the Sales Order number
                    (e.g., SO-12345)
                  </li>
                  <li>
                    <strong>PO Number:</strong> Type the Purchase Order number
                    (e.g., PO-67890)
                  </li>
                  <li>
                    <strong>Customer Name:</strong> Type the customer's name
                  </li>
                  <li><strong>Party Name:</strong> Type the party name</li>
                  <li><strong>Location:</strong> Type the location/address</li>
                  <li>
                    <strong>Sequence Number:</strong> Type the machine sequence
                    (e.g., 023-TESTING)
                  </li>
                  <li>
                    <strong>Mobile Number:</strong> Type the contact mobile
                    number
                  </li>
                </ul>
                <p class="text-xs text-blue-800 mt-2">
                  <strong>Tip:</strong> Use the filters below to narrow down
                  results by category, dates, or metadata. Click "Clear" to
                  reset all filters.
                </p>
              </div>
            </div>
          </div>
          <div class="flex flex-wrap gap-3 items-end">
            <div filters-extra class="flex flex-wrap items-end gap-3">
              <div
                class="inline-flex rounded-md border border-neutral-300 overflow-hidden"
              >
                <button
                  class="px-3 py-1.5 text-sm transition-colors"
                  [class.bg-primary]="filter() === 'all'"
                  [class.text-white]="filter() === 'all'"
                  [class.bg-neutral-200]="filter() === 'all'"
                  [class.bg-white]="filter() !== 'all'"
                  (click)="setFilter('all')"
                >
                  All
                </button>
                <button
                  class="px-3 py-1.5 text-sm transition-colors"
                  [class.bg-primary]="filter() === 'own'"
                  [class.text-white]="filter() === 'own'"
                  [class.bg-neutral-200]="filter() === 'own'"
                  [class.bg-white]="filter() !== 'own'"
                  (click)="setFilter('own')"
                >
                  My
                </button>
              </div>
              <!-- Enhanced Search Bar -->
              <div class="relative min-w-80 grow max-w-lg">
                <label class="block text-sm font-medium text-gray-700 mb-1"
                  >Search Machines
                  <span class="text-xs text-gray-500 font-normal ml-1"
                    >(Type to find machines)</span
                  ></label
                >
                <div class="relative">
                  <input
                    type="text"
                    class="w-full px-3 py-2 pl-10 border border-neutral-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
                    [class.border-red-500]="selectedSO && !filters.so_id"
                    [(ngModel)]="soSearchInput"
                    (input)="onEnhancedSearchInputChange()"
                    (focus)="onEnhancedSearchInputChange()"
                    (blur)="hideEnhancedSearchSuggestions()"
                    (keydown.enter)="onEnhancedSearchEnter()"
                    placeholder="Type SO number, PO number, Customer name, Party name, Location, Sequence number, or any related info..."
                    [ngModelOptions]="{ standalone: true }"
                    title="Search by: SO number, PO number, Customer name, Party name, Location, Sequence number, Mobile number, or any machine-related information"
                  />
                  <i
                    class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                  ></i>
                  <button
                    *ngIf="selectedSO || soSearchInput.trim()"
                    type="button"
                    class="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-red-500 hover:bg-red-50 rounded"
                    (click)="clearEnhancedSearch(); $event.stopPropagation()"
                    title="Clear search"
                  >
                    <i class="pi pi-times text-xs"></i>
                  </button>
                  <!-- Enhanced Search Suggestions Dropdown -->
                  <div
                    *ngIf="showEnhancedSearchSuggestions"
                    class="absolute z-50 w-full mt-1 bg-white border border-neutral-300 rounded-md shadow-lg max-h-60 overflow-y-auto"
                  >
                    <!-- Machine Suggestions -->
                    <ng-container
                      *ngIf="enhancedSearchMachineSuggestions.length > 0"
                    >
                      <div
                        class="px-2 py-1 text-xs font-semibold text-neutral-500 bg-neutral-50 border-b"
                      >
                        Machines
                      </div>
                      <div
                        *ngFor="let machine of enhancedSearchMachineSuggestions"
                        class="px-3 py-2 hover:bg-neutral-100 cursor-pointer text-sm border-b border-neutral-100 last:border-b-0"
                        (mousedown)="selectEnhancedMachineSuggestion(machine)"
                      >
                        <div class="font-medium text-gray-900">
                          <span
                            *ngIf="machine.so && machine.so.so_number"
                            class="text-primary"
                            >SO: {{ machine.so.so_number }}</span
                          >
                          <span
                            *ngIf="
                              machine.so &&
                              !machine.so.so_number &&
                              machine.so.customer
                            "
                            class="text-primary"
                            >Customer: {{ machine.so.customer }}</span
                          >
                          <span
                            *ngIf="machine.machine_sequence"
                            class="text-blue-600 ml-2"
                            >[{{ machine.machine_sequence }}]</span
                          >
                        </div>
                        <div class="text-xs text-neutral-600 mt-1">
                          <span *ngIf="machine.so && machine.so.customer"
                            >Customer: {{ machine.so.customer }}</span
                          >
                          <span
                            *ngIf="
                              machine.so &&
                              machine.so.customer &&
                              machine.so.po_number
                            "
                          >
                            |
                          </span>
                          <span *ngIf="machine.so && machine.so.po_number"
                            >PO: {{ machine.so.po_number }}</span
                          >
                          <span *ngIf="machine.so && machine.so.party_name">
                            | Party: {{ machine.so.party_name }}</span
                          >
                          <span *ngIf="machine.so && machine.so.location">
                            | Location: {{ machine.so.location }}</span
                          >
                        </div>
                      </div>
                    </ng-container>
                    <!-- SO Suggestions -->
                    <ng-container
                      *ngIf="enhancedSearchSOSuggestions.length > 0"
                    >
                      <div
                        class="px-2 py-1 text-xs font-semibold text-neutral-500 bg-neutral-50 border-b"
                        *ngIf="enhancedSearchMachineSuggestions.length > 0"
                      >
                        Sales Orders
                      </div>
                      <div
                        *ngFor="let so of enhancedSearchSOSuggestions"
                        class="px-3 py-2 hover:bg-neutral-100 cursor-pointer text-sm border-b border-neutral-100 last:border-b-0"
                        (mousedown)="selectEnhancedSO(so)"
                      >
                        <div class="font-medium text-gray-900">
                          <span *ngIf="so.so_number" class="text-primary"
                            >SO: {{ so.so_number }}</span
                          >
                          <span
                            *ngIf="!so.so_number && so.customer"
                            class="text-primary"
                            >Customer: {{ so.customer }}</span
                          >
                          <span
                            *ngIf="!so.so_number && !so.customer && so.name"
                            class="text-primary"
                            >{{ so.name }}</span
                          >
                        </div>
                        <div class="text-xs text-neutral-600 mt-1">
                          <span *ngIf="so.customer"
                            >Customer: {{ so.customer }}</span
                          >
                          <span *ngIf="so.customer && so.po_number"> | </span>
                          <span *ngIf="so.po_number"
                            >PO: {{ so.po_number }}</span
                          >
                          <span *ngIf="so.party_name">
                            | Party: {{ so.party_name }}</span
                          >
                          <span *ngIf="so.mobile_number">
                            | Mobile: {{ so.mobile_number }}</span
                          >
                        </div>
                      </div>
                    </ng-container>
                    <div
                      *ngIf="
                        enhancedSearchMachineSuggestions.length === 0 &&
                        enhancedSearchSOSuggestions.length === 0 &&
                        soSearchInput.trim()
                      "
                      class="px-3 py-4 text-sm text-neutral-500 text-center"
                    >
                      No results found matching "{{ soSearchInput }}"
                    </div>
                  </div>
                </div>
              </div>
              <div class="flex flex-wrap items-end gap-3">
                <div class="flex flex-col">
                  <label class="text-xs font-medium text-gray-600 mb-1"
                    >Category</label
                  >
                  <select
                    class="px-3 py-2 border border-neutral-300 rounded-md min-w-48"
                    [(ngModel)]="filters.category_id"
                    (change)="onCategoryFilterChange()"
                    title="Filter machines by category"
                  >
                    <option [ngValue]="undefined">All categories</option>
                    <option
                      *ngFor="let cat of filterCategories"
                      [value]="cat._id"
                    >
                      {{ getCategoryDisplayName(cat) }}
                    </option>
                  </select>
                </div>
                <!-- Metadata Key Autocomplete -->
                <div class="relative flex flex-col">
                  <label class="text-xs font-medium text-gray-600 mb-1"
                    >Metadata Key
                    <span class="text-xs text-gray-400 font-normal"
                      >(Optional)</span
                    ></label
                  >
                  <input
                    type="text"
                    class="px-3 py-2 border border-neutral-300 rounded-md min-w-40"
                    placeholder="e.g., model, serial_number"
                    [(ngModel)]="filters.metadata_key"
                    (input)="onMetadataKeyChange()"
                    (focus)="showMetadataKeySuggestions = true"
                    (blur)="hideMetadataSuggestions()"
                    title="Filter by custom metadata key (e.g., model, serial_number, warranty)"
                  />
                  <div
                    *ngIf="
                      showMetadataKeySuggestions &&
                      metadataKeySuggestions.length > 0
                    "
                    class="absolute z-50 w-full mt-1 bg-white border border-neutral-300 rounded-md shadow-lg max-h-48 overflow-y-auto"
                  >
                    <div
                      *ngFor="let key of metadataKeySuggestions"
                      class="px-3 py-2 hover:bg-neutral-100 cursor-pointer text-sm"
                      (mousedown)="selectMetadataKey(key)"
                    >
                      {{ key }}
                    </div>
                  </div>
                </div>
                <!-- Metadata Value -->
                <div *ngIf="filters.metadata_key" class="flex flex-col">
                  <label class="text-xs font-medium text-gray-600 mb-1"
                    >Metadata Value</label
                  >
                  <input
                    type="text"
                    class="px-3 py-2 border border-neutral-300 rounded-md min-w-40"
                    placeholder="Enter value to search"
                    [(ngModel)]="filters.metadata_value"
                    (input)="onMetadataValueChange()"
                    title="Enter the value for the selected metadata key"
                  />
                </div>
                <!-- Date Range Filters Section -->
                <div
                  class="flex flex-wrap items-end gap-3 p-3 bg-neutral-50 border border-neutral-200 rounded-lg w-full"
                >
                  <div class="flex items-center justify-between mb-2 w-full">
                    <div class="flex items-center gap-2">
                      <i class="pi pi-calendar text-primary"></i>
                      <span class="text-sm font-semibold text-gray-700"
                        >Date Range Filters</span
                      >
                    </div>
                    <div
                      class="flex items-center gap-1 text-xs text-gray-500 cursor-help"
                      title="Select date ranges to filter machines. You can select 'From' date only, 'To' date only, or both for a specific range."
                    >
                      <i class="pi pi-info-circle text-xs"></i>
                      <span>Select From, To, or both</span>
                    </div>
                  </div>

                  <!-- Dispatch Date Range -->
                  <div class="flex flex-col gap-1">
                    <label
                      class="text-xs font-medium text-gray-600 flex items-center gap-1"
                    >
                      <i class="pi pi-truck text-xs"></i>
                      Dispatch Date Range
                    </label>
                    <div class="flex items-center gap-2">
                      <div class="flex flex-col gap-1">
                        <label class="text-xs text-gray-500">From</label>
                        <input
                          type="date"
                          class="px-3 py-2 border border-neutral-300 rounded-md text-sm min-w-40"
                          [(ngModel)]="filters.dispatch_date_from"
                          (change)="onDispatchDateFromChange()"
                          title="Filter machines by dispatch date - start date"
                        />
                      </div>
                      <div class="flex flex-col gap-1">
                        <label class="text-xs text-gray-500">To</label>
                        <input
                          type="date"
                          class="px-3 py-2 border border-neutral-300 rounded-md text-sm min-w-40"
                          [(ngModel)]="filters.dispatch_date_to"
                          (change)="onDispatchDateToChange()"
                          title="Filter machines by dispatch date - end date"
                        />
                      </div>
                    </div>
                  </div>

                  <!-- SO Date Range -->
                  <div class="flex flex-col gap-1">
                    <label
                      class="text-xs font-medium text-gray-600 flex items-center gap-1"
                    >
                      <i class="pi pi-file text-xs"></i>
                      SO Date Range
                    </label>
                    <div class="flex items-center gap-2">
                      <div class="flex flex-col gap-1">
                        <label class="text-xs text-gray-500">From</label>
                        <input
                          type="date"
                          class="px-3 py-2 border border-neutral-300 rounded-md text-sm min-w-40"
                          [(ngModel)]="filters.so_date_from"
                          (change)="onSODateFromChange()"
                          title="Filter machines by Sales Order date - start date"
                        />
                      </div>
                      <div class="flex flex-col gap-1">
                        <label class="text-xs text-gray-500">To</label>
                        <input
                          type="date"
                          class="px-3 py-2 border border-neutral-300 rounded-md text-sm min-w-40"
                          [(ngModel)]="filters.so_date_to"
                          (change)="onSODateToChange()"
                          title="Filter machines by Sales Order date - end date"
                        />
                      </div>
                    </div>
                  </div>

                  <!-- PO Date Range -->
                  <div class="flex flex-col gap-1">
                    <label
                      class="text-xs font-medium text-gray-600 flex items-center gap-1"
                    >
                      <i class="pi pi-shopping-cart text-xs"></i>
                      PO Date Range
                    </label>
                    <div class="flex items-center gap-2">
                      <div class="flex flex-col gap-1">
                        <label class="text-xs text-gray-500">From</label>
                        <input
                          type="date"
                          class="px-3 py-2 border border-neutral-300 rounded-md text-sm min-w-40"
                          [(ngModel)]="filters.po_date_from"
                          (change)="onPODateFromChange()"
                          title="Filter machines by Purchase Order date - start date"
                        />
                      </div>
                      <div class="flex flex-col gap-1">
                        <label class="text-xs text-gray-500">To</label>
                        <input
                          type="date"
                          class="px-3 py-2 border border-neutral-300 rounded-md text-sm min-w-40"
                          [(ngModel)]="filters.po_date_to"
                          (change)="onPODateToChange()"
                          title="Filter machines by Purchase Order date - end date"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <!-- Sort Options -->
                <div class="flex flex-wrap items-end gap-3">
                  <div class="flex flex-col">
                    <label class="text-xs font-medium text-gray-600 mb-1"
                      >Sort By</label
                    >
                    <select
                      class="px-3 py-2 border border-neutral-300 rounded-md"
                      [(ngModel)]="filters.sortBy"
                      (change)="onSortByChange()"
                      title="Select how to sort the machines"
                    >
                      <option [ngValue]="undefined">
                        Default (Created Date)
                      </option>
                      <option value="createdAt">Created Date</option>
                      <option value="name">Customer Name</option>
                      <option value="category">Category</option>
                      <option value="dispatch_date">Dispatch Date</option>
                      <option value="machine_sequence">Sequence Number</option>
                    </select>
                  </div>
                  <!-- Sort Order -->
                  <div *ngIf="filters.sortBy" class="flex flex-col">
                    <label class="text-xs font-medium text-gray-600 mb-1"
                      >Order</label
                    >
                    <select
                      class="px-3 py-2 border border-neutral-300 rounded-md"
                      [(ngModel)]="filters.sortOrder"
                      (change)="onSortOrderChange()"
                      title="Select sort order"
                    >
                      <option value="desc">Newest First</option>
                      <option value="asc">Oldest First</option>
                    </select>
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-2 ml-auto">
                <button
                  class="px-4 py-2 bg-bg border border-neutral-300 rounded-md"
                  (click)="clearFilters()"
                >
                  Clear
                </button>
                <button
                  class="px-4 py-2 bg-primary text-white rounded-md"
                  (click)="refresh()"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>

          <!-- Table -->
          <section
            class="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden"
          >
            <div
              class="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50"
            >
              <div class="flex items-center gap-3">
                <h3 class="text-lg font-semibold text-gray-900">
                  {{ filter() === 'own' ? 'My Machines' : 'All Machines' }}
                </h3>
                <span
                  class="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-200 rounded-full"
                >
                  {{ total }} machines
                </span>
              </div>
              <button
                class="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                (click)="refresh()"
              >
                <i class="pi pi-refresh mr-2"></i>Refresh
              </button>
            </div>
            <div class="overflow-x-auto">
              <div
                *ngIf="loading"
                class="flex items-center justify-center py-12"
              >
                <div class="flex items-center gap-3 text-gray-500">
                  <i class="pi pi-spinner pi-spin text-lg"></i>
                  <span>Loading machines...</span>
                </div>
              </div>
              <div
                *ngIf="!loading && rows.length === 0"
                class="text-center py-12"
              >
                <i class="pi pi-inbox text-4xl text-gray-300 mb-4"></i>
                <h3 class="text-lg font-medium text-gray-900 mb-2">
                  No machines found
                </h3>
                <p class="text-gray-500">
                  Try adjusting your search or filter criteria.
                </p>
              </div>
              <div *ngIf="!loading && rows.length > 0">
                <table class="min-w-full divide-y divide-gray-200">
                  <thead class="bg-gray-50">
                    <tr>
                      <th
                        class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Sequence
                      </th>
                      <th
                        class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Machine
                      </th>
                      <th
                        class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        S.O. Number
                      </th>
                      <th
                        class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        P.O. Number
                      </th>
                      <th
                        class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Category
                      </th>
                      <th
                        class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Party
                      </th>
                      <th
                        class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Location
                      </th>
                      <th
                        class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Contact
                      </th>
                      <th
                        class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Dispatch Date
                      </th>
                      <th
                        class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        S.O. Date
                      </th>
                      <th
                        class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        P.O. Date
                      </th>
                      <th
                        class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Media
                      </th>
                      <th
                        class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Created
                      </th>
                      <th
                        class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Status
                      </th>
                      <th
                        class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody class="bg-white divide-y divide-gray-200">
                    <tr
                      *ngFor="let m of rows; let i = index"
                      class="hover:bg-gray-50 transition-colors"
                      [class.bg-gray-50]="i % 2 === 0"
                      [ngClass]="getRowClass(m)"
                    >
                      <!-- Sequence -->
                      <td class="px-6 py-4 whitespace-nowrap">
                        <div
                          class="flex items-center gap-2 group relative"
                          *ngIf="m.machine_sequence && canEditSequence(m)"
                        >
                          <span
                            class="font-mono text-sm font-semibold bg-blue-100 text-blue-800 px-3 py-1.5 rounded border border-blue-200 cursor-pointer hover:bg-blue-200 transition-colors"
                            [title]="
                              'Sequence: ' +
                              m.machine_sequence +
                              ' (Click to edit)'
                            "
                            (click)="openEditSequenceModal(m)"
                          >
                            {{ m.machine_sequence }}
                          </span>
                          <button
                            class="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center justify-center px-2 py-1 text-xs font-medium text-primary bg-primary/10 border border-primary/20 rounded hover:bg-primary/20"
                            (click)="openEditSequenceModal(m)"
                            title="Edit sequence"
                          >
                            <i class="pi pi-pencil text-sm"></i>
                          </button>
                        </div>
                        <div
                          class="flex items-center gap-2"
                          *ngIf="!m.machine_sequence || !canEditSequence(m)"
                        >
                          <span
                            *ngIf="m.machine_sequence"
                            class="font-mono text-sm font-semibold bg-blue-100 text-blue-800 px-3 py-1.5 rounded border border-blue-200"
                            [title]="'Sequence: ' + m.machine_sequence"
                          >
                            {{ m.machine_sequence }}
                          </span>
                          <span
                            *ngIf="
                              !m.machine_sequence &&
                              (m.is_approved || !m.so?.category_id)
                            "
                            class="text-gray-400 text-xs italic"
                            >No sequence</span
                          >
                          <!-- Generate Sequence Button -->
                          <button
                            *ngIf="
                              !m.machine_sequence &&
                              !m.is_approved &&
                              !!m.so?.category_id
                            "
                            class="inline-flex items-center justify-center px-2 py-1 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded hover:bg-purple-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            (click)="generateSequenceForMachine(m)"
                            [disabled]="
                              isGeneratingSequence ||
                              generatingSequenceForMachineId === m._id
                            "
                            title="Generate sequence for this machine"
                          >
                            <i
                              class="pi pi-cog text-sm"
                              [class.pi-spin]="
                                generatingSequenceForMachineId === m._id
                              "
                            ></i>
                          </button>
                        </div>
                      </td>
                      <!-- Machine Name -->
                      <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center">
                          <div class="flex-shrink-0 h-10 w-10">
                            <div
                              class="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center"
                            >
                              <i class="pi pi-cog text-blue-600"></i>
                            </div>
                          </div>
                          <div class="ml-4">
                            <div class="flex items-center gap-2">
                              <div
                                class="text-sm font-medium text-gray-900 truncate max-w-48"
                                [title]="getSOName(m)"
                              >
                                {{ getSOName(m) }}
                              </div>
                              <!-- Warning badge if SO is deleted -->
                              <span
                                *ngIf="!m.so"
                                class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200"
                                title="SO has been deleted. This machine references a deleted SO. Please update the SO reference."
                              >
                                <i
                                  class="pi pi-exclamation-triangle text-xs mr-1"
                                ></i>
                                SO Deleted
                              </span>
                            </div>
                            <div
                              class="text-sm text-gray-500"
                              *ngIf="m.created_by?.username"
                            >
                              by {{ m.created_by?.username }}
                            </div>
                          </div>
                        </div>
                      </td>

                      <!-- S.O. Number -->
                      <td class="px-6 py-4 whitespace-nowrap">
                        <div
                          class="text-sm text-gray-900 truncate max-w-32"
                          [title]="m.so?.so_number"
                        >
                          {{ m.so?.so_number || '-' }}
                        </div>
                      </td>

                      <!-- P.O. Number -->
                      <td class="px-6 py-4 whitespace-nowrap">
                        <div
                          class="text-sm text-gray-900 truncate max-w-32"
                          [title]="m.so?.po_number"
                        >
                          {{ m.so?.po_number || '-' }}
                        </div>
                      </td>

                      <!-- Category -->
                      <td class="px-6 py-4 whitespace-nowrap">
                        <div
                          class="text-sm text-gray-900 truncate max-w-32"
                          [title]="categoryName(m)"
                        >
                          {{ categoryName(m) }}
                        </div>
                      </td>

                      <!-- Party -->
                      <td class="px-6 py-4 whitespace-nowrap">
                        <div
                          class="text-sm text-gray-900 truncate max-w-32"
                          [title]="m.so?.party_name"
                        >
                          {{ m.so?.party_name || '-' }}
                        </div>
                      </td>

                      <!-- Location -->
                      <td class="px-6 py-4 whitespace-nowrap">
                        <div
                          class="text-sm text-gray-900 truncate max-w-32"
                          [title]="m.so?.location"
                        >
                          {{ m.so?.location || '-' }}
                        </div>
                      </td>

                      <!-- Contact -->
                      <td class="px-6 py-4 whitespace-nowrap">
                        <div
                          class="text-sm text-gray-900"
                          *ngIf="m.so?.mobile_number; else noContact"
                        >
                          <i class="pi pi-phone text-gray-400 mr-1"></i>
                          {{ m.so?.mobile_number }}
                        </div>
                        <ng-template #noContact>
                          <span class="text-sm text-gray-400">-</span>
                        </ng-template>
                      </td>

                      <!-- Dispatch Date -->
                      <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm text-gray-900">
                          {{
                            m.dispatch_date
                              ? (m.dispatch_date | date: 'dd-MM-yyyy')
                              : '-'
                          }}
                        </div>
                      </td>

                      <!-- S.O. Date -->
                      <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm text-gray-900">
                          {{
                            m.so && m.so.so_date
                              ? (m.so.so_date | date: 'dd/MM/yyyy')
                              : '-'
                          }}
                        </div>
                      </td>

                      <!-- P.O. Date -->
                      <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm text-gray-900">
                          {{
                            m.so && m.so.po_date
                              ? (m.so.po_date | date: 'dd/MM/yyyy')
                              : '-'
                          }}
                        </div>
                      </td>

                      <!-- Media -->
                      <td class="px-6 py-4 whitespace-nowrap text-center">
                        <div class="flex items-center justify-center gap-3">
                          <!-- Images -->
                          <div
                            class="flex items-center gap-1"
                            *ngIf="(m.images?.length || 0) > 0; else noImages"
                          >
                            <i class="pi pi-image text-blue-500"></i>
                            <span class="text-sm font-medium text-gray-900">{{
                              m.images?.length || 0
                            }}</span>
                            <button
                              class="ml-1 p-1 text-gray-400 hover:text-blue-600 rounded"
                              (click)="openPreview(m.images || [], 0)"
                              title="Preview images"
                            >
                              <i class="pi pi-eye text-xs"></i>
                            </button>
                          </div>
                          <ng-template #noImages>
                            <span class="text-sm text-gray-400">-</span>
                          </ng-template>

                          <!-- Documents -->
                          <div
                            class="flex items-center gap-1"
                            *ngIf="(m.documents?.length || 0) > 0; else noDocs"
                          >
                            <i class="pi pi-file text-green-500"></i>
                            <span class="text-sm font-medium text-gray-900">{{
                              m.documents?.length || 0
                            }}</span>
                            <button
                              class="ml-1 p-1 text-gray-400 hover:text-green-600 rounded"
                              (click)="openDocumentsModal(m)"
                              title="View documents"
                            >
                              <i class="pi pi-eye text-xs"></i>
                            </button>
                          </div>
                          <ng-template #noDocs>
                            <span class="text-sm text-gray-400">-</span>
                          </ng-template>
                        </div>
                      </td>

                      <!-- Created -->
                      <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm text-gray-900">
                          {{ m.createdAt | date: 'MMM d, y' }}
                        </div>
                        <div class="text-sm text-gray-500">
                          {{ m.createdAt | date: 'h:mm a' }}
                        </div>
                      </td>

                      <!-- Status -->
                      <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex flex-col gap-2">
                          <span
                            class="inline-flex px-2 py-1 text-xs font-semibold rounded-full w-fit"
                            [ngClass]="{
                              'bg-green-100 text-green-800':
                                (m.approvalStatus ||
                                  (m.is_approved ? 'approved' : 'pending')) ===
                                'approved',
                              'bg-red-100 text-red-800':
                                m.approvalStatus === 'rejected',
                              'bg-yellow-100 text-yellow-800':
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

                          <!-- Approval Details -->
                          <div
                            class="text-xs text-gray-500"
                            *ngIf="m.approvalStatus === 'approved'"
                          >
                            <div class="flex items-center gap-1">
                              <i class="pi pi-check-circle text-green-500"></i>
                              <span
                                >by {{ m.decisionByName || 'approver' }}</span
                              >
                            </div>
                            <div *ngIf="m.decisionDate" class="text-gray-400">
                              {{ m.decisionDate | date: 'MMM d, h:mm a' }}
                            </div>
                          </div>

                          <div
                            class="text-xs text-gray-500"
                            *ngIf="m.approvalStatus === 'rejected'"
                          >
                            <div class="flex items-center gap-1">
                              <i class="pi pi-times-circle text-red-500"></i>
                              <span
                                >by {{ m.decisionByName || 'approver' }}</span
                              >
                            </div>
                            <div *ngIf="m.decisionDate" class="text-gray-400">
                              {{ m.decisionDate | date: 'MMM d, h:mm a' }}
                            </div>
                          </div>
                        </div>
                      </td>

                      <!-- Actions -->
                      <td class="px-6 py-4 whitespace-nowrap text-center">
                        <div class="flex items-center justify-center gap-2">
                          <button
                            class="inline-flex items-center px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 transition-colors"
                            (click)="openView(m)"
                            title="View machine details"
                          >
                            <i class="pi pi-eye mr-1"></i>
                            View
                          </button>
                          <button
                            *ngIf="canEditMachine(m)"
                            class="inline-flex items-center px-3 py-1.5 text-xs font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded-md hover:bg-orange-100 transition-colors"
                            (click)="openEditMachineModal(m)"
                            [title]="
                              !m.so
                                ? 'Edit machine (SO deleted - please update SO reference)'
                                : 'Edit machine'
                            "
                          >
                            <i class="pi pi-pencil mr-1"></i>
                            Edit
                          </button>
                          <button
                            class="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
                            [disabled]="!m.images?.length"
                            (click)="openPreview(m.images || [], 0)"
                            title="Preview images"
                          >
                            <i class="pi pi-image mr-1"></i>
                            Images
                          </button>

                          <button
                            *ngIf="m.approvalStatus === 'rejected'"
                            class="inline-flex items-center px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors"
                            (click)="openRejection(m._id)"
                            title="View rejection reason"
                          >
                            <i class="pi pi-info-circle mr-1"></i>
                            Reason
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Pagination - Sticky to right, stays with table on horizontal scroll -->
              <div
                class="mt-4 flex justify-end sticky right-0 bg-white pt-2 pb-2 z-10"
              >
                <app-table-pagination
                  [page]="page"
                  [pages]="pages"
                  [total]="total"
                  [limit]="limit"
                  (pageChange)="onPageChange($event)"
                  (limitChange)="onLimitChange($event)"
                ></app-table-pagination>
              </div>
            </div>
          </section>

          <!-- Enhanced Rejection Reason Modal -->
          <div
            class="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
            *ngIf="rejectVisible"
          >
            <div
              class="bg-white w-full max-w-2xl max-h-[90vh] rounded-xl shadow-2xl border border-gray-200 flex flex-col"
            >
              <div
                class="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-red-50"
              >
                <div class="flex items-center gap-3">
                  <div
                    class="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center"
                  >
                    <i class="pi pi-times-circle text-red-600"></i>
                  </div>
                  <div>
                    <h3 class="text-lg font-semibold text-gray-900">
                      Rejection Details
                    </h3>
                    <p class="text-sm text-gray-500">
                      Machine approval was rejected
                    </p>
                  </div>
                </div>
                <button
                  class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  (click)="rejectVisible = false"
                >
                  <i class="pi pi-times text-lg"></i>
                </button>
              </div>

              <div class="flex-1 overflow-y-auto p-6">
                <div
                  *ngIf="rejectLoading"
                  class="flex items-center justify-center py-12"
                >
                  <div class="flex items-center gap-3 text-gray-500">
                    <i class="pi pi-spinner pi-spin text-lg"></i>
                    <span>Loading rejection details...</span>
                  </div>
                </div>

                <div *ngIf="!rejectLoading" class="space-y-6">
                  <!-- Rejection Reason -->
                  <div class="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h4
                      class="text-sm font-semibold text-red-900 mb-3 flex items-center gap-2"
                    >
                      <i class="pi pi-exclamation-triangle"></i>
                      Rejection Reason
                    </h4>
                    <div
                      class="whitespace-pre-wrap text-sm text-red-800 bg-white border border-red-200 rounded p-3"
                      *ngIf="rejectionReason; else noreason"
                    >
                      {{ rejectionReason }}
                    </div>
                    <ng-template #noreason>
                      <div
                        class="text-red-600 text-sm bg-white border border-red-200 rounded p-3"
                      >
                        No rejection reason provided.
                      </div>
                    </ng-template>
                  </div>

                  <!-- Approver Notes -->
                  <div
                    *ngIf="approverNotes"
                    class="bg-blue-50 border border-blue-200 rounded-lg p-4"
                  >
                    <h4
                      class="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2"
                    >
                      <i class="pi pi-info-circle"></i>
                      Approver Notes
                    </h4>
                    <div
                      class="whitespace-pre-wrap text-sm text-blue-800 bg-white border border-blue-200 rounded p-3"
                    >
                      {{ approverNotes }}
                    </div>
                  </div>

                  <!-- Machine Details -->
                  <div
                    *ngIf="rejectMachine"
                    class="bg-gray-50 border border-gray-200 rounded-lg p-4"
                  >
                    <h4
                      class="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2"
                    >
                      <i class="pi pi-cog"></i>
                      Machine Information
                    </h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label
                          class="text-xs font-medium text-gray-500 uppercase tracking-wide"
                          >Name</label
                        >
                        <p class="text-sm text-gray-900 mt-1">
                          {{ rejectMachine?.name }}
                        </p>
                      </div>
                      <div>
                        <label
                          class="text-xs font-medium text-gray-500 uppercase tracking-wide"
                          >Category</label
                        >
                        <p class="text-sm text-gray-900 mt-1">
                          {{
                            rejectMachine?.category_id?.name ||
                              rejectMachine?.category_id ||
                              '-'
                          }}
                        </p>
                      </div>
                      <div *ngIf="rejectMachine?.party_name">
                        <label
                          class="text-xs font-medium text-gray-500 uppercase tracking-wide"
                          >Party</label
                        >
                        <p class="text-sm text-gray-900 mt-1">
                          {{ rejectMachine.party_name }}
                        </p>
                      </div>
                      <div *ngIf="rejectMachine?.location">
                        <label
                          class="text-xs font-medium text-gray-500 uppercase tracking-wide"
                          >Location</label
                        >
                        <p class="text-sm text-gray-900 mt-1">
                          {{ rejectMachine.location }}
                        </p>
                      </div>
                    </div>

                    <!-- Additional Metadata -->
                    <div *ngIf="rejectMetadata?.length" class="mt-4">
                      <h5 class="text-sm font-medium text-gray-900 mb-2">
                        Additional Details
                      </h5>
                      <div
                        class="bg-white border border-gray-200 rounded divide-y"
                      >
                        <div
                          class="px-3 py-2 flex justify-between items-start"
                          *ngFor="let m of rejectMetadata"
                        >
                          <span
                            class="text-sm font-medium text-gray-600 flex-shrink-0 w-1/3"
                            >{{ m.key }}</span
                          >
                          <span
                            class="text-sm text-gray-900 text-right break-all w-2/3"
                            >{{ m.value }}</span
                          >
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div
                class="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3"
              >
                <button
                  class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                  (click)="rejectVisible = false"
                >
                  Close
                </button>
              </div>
            </div>
          </div>

          <!-- Enhanced Image Lightbox Modal -->
          <div
            class="fixed inset-0 bg-black/80 flex items-center justify-center z-[70]"
            *ngIf="previewVisible"
          >
            <div class="relative w-full max-w-6xl mx-4">
              <!-- Close Button -->
              <button
                class="absolute -top-12 right-0 text-white p-2 hover:bg-white/20 rounded-full transition-colors z-10"
                (click)="closePreview()"
              >
                <i class="pi pi-times text-2xl"></i>
              </button>

              <!-- Main Image Container -->
              <div class="bg-black rounded-lg overflow-hidden shadow-2xl">
                <div
                  class="relative flex items-center justify-center"
                  style="min-height: 70vh;"
                >
                  <!-- Previous Button -->
                  <button
                    *ngIf="previewImages.length > 1"
                    class="absolute left-4 text-white bg-black/40 hover:bg-black/60 rounded-full p-3 transition-colors z-10"
                    (click)="prevImage()"
                  >
                    <i class="pi pi-chevron-left text-xl"></i>
                  </button>

                  <!-- Main Image -->
                  <img
                    *ngIf="previewImages.length > 0"
                    [src]="imageUrl(previewImages[previewIndex])"
                    class="max-h-[70vh] w-auto object-contain"
                    [alt]="'Image ' + (previewIndex + 1)"
                  />

                  <!-- Next Button -->
                  <button
                    *ngIf="previewImages.length > 1"
                    class="absolute right-4 text-white bg-black/40 hover:bg-black/60 rounded-full p-3 transition-colors z-10"
                    (click)="nextImage()"
                  >
                    <i class="pi pi-chevron-right text-xl"></i>
                  </button>
                </div>

                <!-- Thumbnail Strip -->
                <div
                  *ngIf="previewImages.length > 1"
                  class="p-4 bg-gray-900 flex gap-2 overflow-x-auto"
                >
                  <img
                    *ngFor="let img of previewImages; let i = index"
                    [src]="imageUrl(img)"
                    class="w-16 h-16 object-cover rounded border-2 cursor-pointer transition-all"
                    [class.border-blue-500]="i === previewIndex"
                    [class.border-gray-600]="i !== previewIndex"
                    (click)="goToImage(i)"
                    [alt]="'Thumbnail ' + (i + 1)"
                  />
                </div>

                <!-- Image Counter -->
                <div
                  *ngIf="previewImages.length > 1"
                  class="absolute top-4 left-4 bg-black/60 text-white px-3 py-1 rounded-full text-sm"
                >
                  {{ previewIndex + 1 }} / {{ previewImages.length }}
                </div>
              </div>
            </div>
          </div>

          <!-- Documents Modal -->
          <div
            *ngIf="documentsVisible"
            class="fixed inset-0 z-[60] flex items-center justify-center"
          >
            <div
              class="absolute inset-0 bg-black/40"
              (click)="documentsVisible = false"
              role="button"
              tabindex="0"
              (keydown.enter)="documentsVisible = false"
              (keydown.space)="documentsVisible = false"
            ></div>
            <div
              class="relative bg-white border border-gray-200 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
            >
              <div
                class="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0"
              >
                <div class="flex items-center gap-3">
                  <div
                    class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center"
                  >
                    <i class="pi pi-file text-green-600"></i>
                  </div>
                  <div>
                    <h3 class="text-lg font-semibold text-gray-900">
                      Machine Documents
                    </h3>
                    <p class="text-sm text-gray-500">
                      {{ selectedMachine?.name }}
                    </p>
                  </div>
                </div>
                <button
                  class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  (click)="documentsVisible = false"
                >
                  <i class="pi pi-times text-lg"></i>
                </button>
              </div>
              <div class="flex-1 overflow-y-auto p-6">
                <div
                  *ngIf="selectedMachine?.documents?.length; else noDocuments"
                >
                  <div
                    class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                  >
                    <div
                      *ngFor="
                        let doc of selectedMachine?.documents;
                        let i = index
                      "
                      class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
                    >
                      <div class="flex items-start gap-3">
                        <div class="flex-shrink-0">
                          <div
                            class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center"
                          >
                            <i class="pi pi-file text-green-600 text-xl"></i>
                          </div>
                        </div>
                        <div class="flex-1 min-w-0">
                          <h4
                            class="font-medium text-sm text-gray-900 truncate"
                            [title]="doc.name"
                          >
                            {{ doc.name }}
                          </h4>
                          <p class="text-xs text-gray-500 mt-1">
                            {{ doc.document_type || 'Document' }}
                          </p>
                          <div class="flex gap-2 mt-3">
                            <button
                              class="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                              (click)="downloadDocument(doc)"
                            >
                              <i class="pi pi-download mr-1"></i>
                              Download
                            </button>
                            <button
                              class="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                              (click)="previewDocument(doc)"
                            >
                              <i class="pi pi-eye mr-1"></i>
                              Preview
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <ng-template #noDocuments>
                  <div class="text-center py-12">
                    <i class="pi pi-file text-4xl text-gray-300 mb-4"></i>
                    <h3 class="text-lg font-medium text-gray-900 mb-2">
                      No Documents
                    </h3>
                    <p class="text-gray-500">
                      This machine doesn't have any documents attached.
                    </p>
                  </div>
                </ng-template>
              </div>
              <div
                class="flex items-center justify-end gap-3 p-6 border-t border-gray-200 flex-shrink-0"
              >
                <button
                  class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  (click)="documentsVisible = false"
                >
                  Close
                </button>
              </div>
            </div>
          </div>

          <!-- View Modal (consistent with admin view) -->
          <div
            *ngIf="viewVisible"
            class="fixed inset-0 z-50 flex items-center justify-center"
          >
            <div
              class="absolute inset-0 bg-black/40"
              (click)="viewVisible = false"
              role="button"
              tabindex="0"
              (keydown.enter)="viewVisible = false"
              (keydown.space)="viewVisible = false"
            ></div>
            <div
              class="relative bg-white border border-neutral-300 rounded-xl shadow-medium w-full max-w-4xl max-h-[90vh] flex flex-col"
            >
              <div
                class="flex items-center justify-between p-4 border-b border-neutral-200 flex-shrink-0"
              >
                <h3 class="text-lg font-semibold text-gray-900">
                  Machine Details
                </h3>
                <button
                  class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
                  (click)="viewVisible = false"
                >
                  <i class="pi pi-times"></i>
                </button>
              </div>
              <div class="flex-1 overflow-y-auto p-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div class="md:col-span-2">
                    <span class="block text-xs text-gray-500 mb-1">Name</span>
                    <span class="text-sm font-medium text-gray-900">{{
                      viewMachine ? getSOName(viewMachine) : '-'
                    }}</span>
                  </div>
                  <div class="md:col-span-1">
                    <span class="block text-xs text-gray-500 mb-1"
                      >Party Name</span
                    >
                    <span class="text-sm text-gray-900">{{
                      viewMachine?.so?.party_name || '-'
                    }}</span>
                  </div>
                  <div class="md:col-span-1">
                    <span class="block text-xs text-gray-500 mb-1"
                      >Location</span
                    >
                    <span class="text-sm text-gray-900">{{
                      viewMachine?.so?.location || '-'
                    }}</span>
                  </div>
                  <div class="md:col-span-1">
                    <span class="block text-xs text-gray-500 mb-1"
                      >S.O. Number</span
                    >
                    <span class="text-sm text-gray-900">{{
                      viewMachine?.so?.so_number || '-'
                    }}</span>
                  </div>
                  <div class="md:col-span-1">
                    <span class="block text-xs text-gray-500 mb-1"
                      >P.O. Number</span
                    >
                    <span class="text-sm text-gray-900">{{
                      viewMachine?.so?.po_number || '-'
                    }}</span>
                  </div>
                  <div class="md:col-span-1">
                    <span class="block text-xs text-gray-500 mb-1"
                      >Customer</span
                    >
                    <span class="text-sm text-gray-900">{{
                      viewMachine?.so?.customer || '-'
                    }}</span>
                  </div>
                  <div class="md:col-span-1">
                    <span class="block text-xs text-gray-500 mb-1"
                      >Mobile Number</span
                    >
                    <span class="text-sm text-gray-900">{{
                      viewMachine?.so?.mobile_number || '-'
                    }}</span>
                  </div>
                  <div class="md:col-span-1">
                    <span class="block text-xs text-gray-500 mb-1"
                      >S.O. Date</span
                    >
                    <span class="text-sm text-gray-900">{{
                      viewMachine?.so?.so_date
                        ? (viewMachine?.so?.so_date | date: 'dd/MM/yyyy')
                        : '-'
                    }}</span>
                  </div>
                  <div class="md:col-span-1">
                    <span class="block text-xs text-gray-500 mb-1"
                      >P.O. Date</span
                    >
                    <span class="text-sm text-gray-900">{{
                      viewMachine?.so?.po_date
                        ? (viewMachine?.so?.po_date | date: 'dd/MM/yyyy')
                        : '-'
                    }}</span>
                  </div>
                  <div class="md:col-span-1">
                    <span class="block text-xs text-gray-500 mb-1"
                      >Dispatch Date</span
                    >
                    <span class="text-sm text-gray-900">{{
                      viewMachine?.dispatch_date
                        ? (viewMachine?.dispatch_date | date: 'dd-MM-yyyy')
                        : '-'
                    }}</span>
                  </div>
                  <div class="md:col-span-1">
                    <span class="block text-xs text-gray-500 mb-1"
                      >Machine Sequence</span
                    >
                    <span
                      *ngIf="viewMachine?.machine_sequence"
                      class="font-mono text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded"
                    >
                      {{ viewMachine?.machine_sequence }}
                    </span>
                    <span
                      *ngIf="!viewMachine?.machine_sequence"
                      class="text-gray-400 text-sm"
                      >-</span
                    >
                  </div>
                  <div class="md:col-span-1">
                    <span class="block text-xs text-gray-500 mb-1"
                      >Approved</span
                    >
                    <span class="text-sm text-gray-900">{{
                      viewMachine?.is_approved ? 'Yes' : 'No'
                    }}</span>
                  </div>
                  <div class="md:col-span-1">
                    <span class="block text-xs text-gray-500 mb-1"
                      >Created By</span
                    >
                    <span class="text-sm text-gray-900"
                      >{{ viewMachine?.created_by?.username || '-' }}
                      <span
                        *ngIf="viewMachine?.created_by?.email"
                        class="text-gray-500"
                      >
                        ({{ viewMachine?.created_by?.email }})
                      </span>
                    </span>
                  </div>
                  <div class="md:col-span-1">
                    <span class="block text-xs text-gray-500 mb-1"
                      >Updated By</span
                    >
                    <span class="text-sm text-gray-900">{{
                      viewMachine?.updatedBy?.username || '—'
                    }}</span>
                  </div>
                  <div class="md:col-span-1">
                    <span class="block text-xs text-gray-500 mb-1"
                      >Created</span
                    >
                    <span class="text-sm text-gray-900">{{
                      viewMachine?.createdAt | date: 'medium'
                    }}</span>
                  </div>
                  <div class="md:col-span-1">
                    <span class="block text-xs text-gray-500 mb-1"
                      >Updated</span
                    >
                    <span class="text-sm text-gray-900">{{
                      viewMachine?.updatedAt || viewMachine?.createdAt
                        | date: 'medium'
                    }}</span>
                  </div>
                  <div class="md:col-span-2">
                    <span class="block text-xs text-gray-500 mb-1">Images</span>
                    <div
                      class="mt-1 flex gap-2 flex-wrap"
                      *ngIf="viewMachine?.images?.length; else noimg"
                    >
                      <img
                        *ngFor="
                          let img of viewMachine?.images;
                          let i = index;
                          trackBy: trackByIndex
                        "
                        [src]="imageUrl(img)"
                        class="w-16 h-16 object-cover rounded border cursor-pointer"
                        (click)="openPreview(viewMachine?.images || [], i)"
                      />
                    </div>
                    <ng-template #noimg>
                      <span class="text-xs text-gray-500">No images</span>
                    </ng-template>
                  </div>
                  <div class="md:col-span-2">
                    <div class="flex items-center justify-between mb-1">
                      <span class="block text-xs text-gray-500">Documents</span>
                      <button
                        *ngIf="viewMachine?.documents?.length"
                        class="px-3 py-1 text-sm bg-primary text-white rounded-md hover:bg-primary-light transition-colors"
                        (click)="openDocumentsModal(viewMachine)"
                      >
                        <i class="pi pi-file mr-1"></i>
                        View All Documents ({{
                          viewMachine?.documents?.length || 0
                        }})
                      </button>
                    </div>
                    <div
                      class="mt-1 flex gap-2 flex-wrap"
                      *ngIf="viewMachine?.documents?.length; else nodocs"
                    >
                      <div
                        *ngFor="
                          let doc of viewMachine?.documents | slice: 0 : 3;
                          let i = index;
                          trackBy: trackByIndex
                        "
                        class="flex items-center gap-2 px-3 py-2 bg-neutral-100 rounded-md border text-sm hover:bg-neutral-200 transition-colors"
                      >
                        <i class="pi pi-file text-primary"></i>
                        <span class="truncate max-w-40 font-medium">{{
                          doc.name
                        }}</span>
                      </div>
                      <div
                        *ngIf="(viewMachine?.documents?.length || 0) > 3"
                        class="flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-md border border-primary/20 text-sm text-primary font-medium"
                      >
                        <i class="pi pi-plus"></i>
                        <span
                          >+{{
                            (viewMachine?.documents?.length || 0) - 3
                          }}
                          more</span
                        >
                      </div>
                    </div>
                    <ng-template #nodocs>
                      <div
                        class="flex items-center gap-2 text-sm text-gray-500"
                      >
                        <i class="pi pi-file"></i>
                        <span>No documents attached</span>
                      </div>
                    </ng-template>
                  </div>
                  <div class="md:col-span-2" *ngIf="viewMachine?.metadata">
                    <span class="block text-xs text-gray-500 mb-1"
                      >Metadata</span
                    >
                    <div class="border rounded divide-y">
                      <div
                        class="p-2 grid grid-cols-5 gap-2"
                        *ngFor="
                          let kv of viewMachine?.metadata | keyvalue;
                          trackBy: trackByKey
                        "
                      >
                        <div class="col-span-2 text-xs font-medium">
                          {{ kv.key }}
                        </div>
                        <div class="col-span-3 text-xs break-all">
                          {{ kv.value }}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div
                class="flex items-center justify-end gap-2 p-4 border-t border-neutral-200 flex-shrink-0"
              >
                <button
                  class="px-3 py-2 rounded-md border border-neutral-300 text-gray-700 hover:bg-gray-50"
                  (click)="viewVisible = false"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Edit Sequence Modal -->
        <div
          *ngIf="editSequenceVisible"
          class="fixed inset-0 z-[9999] flex items-center justify-center"
          style="z-index: 9999"
        >
          <div
            class="absolute inset-0 bg-black/50"
            (click)="closeEditSequenceModal()"
            role="button"
            tabindex="0"
          ></div>
          <div
            class="relative bg-white border border-neutral-300 rounded-xl shadow-2xl w-full max-w-2xl z-[10000]"
            style="z-index: 10000"
            (click)="$event.stopPropagation()"
          >
            <div
              class="flex items-center justify-between p-6 border-b border-neutral-200 flex-shrink-0 bg-gradient-to-r from-primary/5 to-primary/10"
            >
              <div>
                <h3 class="text-xl font-bold text-text">
                  Edit Machine Sequence
                </h3>
                <p class="text-sm text-text-muted mt-1">
                  Update the sequence for
                  {{ editingMachine ? getSOName(editingMachine) : '-' }}
                </p>
              </div>
              <button
                class="p-2 text-text-muted hover:bg-neutral-100 rounded-md transition-colors"
                (click)="closeEditSequenceModal()"
                type="button"
              >
                <i class="pi pi-times text-lg"></i>
              </button>
            </div>

            <div class="p-6 space-y-6">
              <!-- Format Info -->
              <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div class="flex items-start gap-3">
                  <i class="pi pi-info-circle text-blue-600 mt-0.5"></i>
                  <div class="flex-1">
                    <h4 class="text-sm font-semibold text-blue-900 mb-1">
                      Expected Format
                    </h4>
                    <p class="text-sm text-blue-800 font-mono mb-2">
                      {{ sequenceFormat }}
                    </p>
                    <p class="text-xs text-blue-700">
                      Example:
                      <span class="font-mono font-semibold">{{
                        sequenceFormatExample
                      }}</span>
                    </p>
                  </div>
                </div>
              </div>

              <!-- Sequence Suggestions -->
              <div *ngIf="sequenceSuggestions.length > 0">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Suggested Sequences (Next Available)
                </label>
                <div class="flex flex-wrap gap-2">
                  <button
                    *ngFor="let suggestion of sequenceSuggestions"
                    type="button"
                    class="inline-flex items-center px-3 py-2 text-sm font-mono bg-primary/10 text-primary border border-primary/20 rounded-md hover:bg-primary/20 hover:border-primary/30 transition-all duration-150"
                    (click)="selectSuggestion(suggestion)"
                  >
                    <i class="pi pi-check-circle text-xs mr-2"></i>
                    {{ suggestion }}
                  </button>
                </div>
              </div>

              <!-- Manual Input -->
              <div>
                <label
                  for="sequence-input"
                  class="block text-sm font-medium text-gray-700 mb-2"
                >
                  Enter Sequence Manually
                </label>
                <input
                  id="sequence-input"
                  type="text"
                  [(ngModel)]="editSequenceValue"
                  class="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  [class.border-error]="sequenceError"
                  [class.border-neutral-300]="!sequenceError"
                  placeholder="Enter sequence (e.g., {{
                    sequenceFormatExample
                  }})"
                  (input)="sequenceError = null"
                />
                <p
                  *ngIf="sequenceError"
                  class="mt-2 text-sm text-error flex items-center gap-1"
                >
                  <i class="pi pi-exclamation-triangle"></i>
                  {{ sequenceError }}
                </p>
                <p class="mt-2 text-xs text-gray-500">
                  The sequence must follow the format:
                  <span class="font-mono">{{ sequenceFormat }}</span>
                </p>
              </div>
            </div>

            <!-- Modal Footer -->
            <div
              class="flex items-center justify-end gap-3 p-6 border-t border-neutral-200 flex-shrink-0"
            >
              <button
                type="button"
                class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                (click)="closeEditSequenceModal()"
                [disabled]="isUpdatingSequence"
              >
                Cancel
              </button>
              <button
                type="button"
                class="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                (click)="updateSequence()"
                [disabled]="isUpdatingSequence || !editSequenceValue.trim()"
              >
                <i
                  *ngIf="isUpdatingSequence"
                  class="pi pi-spin pi-spinner mr-2"
                ></i>
                <i *ngIf="!isUpdatingSequence" class="pi pi-check mr-2"></i>
                {{ isUpdatingSequence ? 'Updating...' : 'Update Sequence' }}
              </button>
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
      /* Rejected row styling - clean approach without column shift */
      tbody tr.rejected-row td:first-child {
        box-shadow: inset 3px 0 0 #ef4444;
      }
      tbody tr.rejected-row:hover {
        background: linear-gradient(to right, #fef2f2 0%, #ffffff 20%);
      }
      tbody tr.rejected-row:hover td:first-child {
        box-shadow: inset 4px 0 0 #dc2626;
      }
      tbody tr.rejected-row {
        transition: background-color 0.2s ease;
      }
      tbody tr.rejected-row td:first-child {
        transition: box-shadow 0.2s ease;
      }
    `,
  ],
})
export class TechnicianMachinesComponent implements OnInit, OnDestroy {
  loading = false;
  rows: MachineRow[] = [];
  filter = signal<'all' | 'own'>('own');

  createVisible = false;
  canCreate = true;
  previewVisible = false;
  previewImages: string[] = [];
  previewIndex = 0;
  documentsVisible = false;
  selectedMachine: any = null;
  sidebarCollapsed = false;
  // View modal state
  viewVisible = false;
  viewMachine: MachineRow | null = null;
  searchTerm = '';

  // Sequence generation
  isGeneratingSequence = false;
  generatingSequenceForMachineId: string | null = null;

  // Sequence configs
  sequenceConfigs: SequenceConfig[] = [];

  // Enhanced filters
  filters: {
    search?: string;
    category_id?: string;
    so_id?: string; // SO filter
    metadata_key?: string;
    metadata_value?: string;
    dispatch_date_from?: string;
    dispatch_date_to?: string;
    so_date_from?: string;
    so_date_to?: string;
    po_date_from?: string;
    po_date_to?: string;
    sortBy?:
      | 'createdAt'
      | 'name'
      | 'category'
      | 'dispatch_date'
      | 'party_name'
      | 'machine_sequence'
      | 'location'
      | 'created_by';
    sortOrder?: 'asc' | 'desc';
  } = {
    // Initialize with undefined values (not empty strings) to avoid validation errors
    search: undefined,
    category_id: undefined,
    so_id: undefined,
    metadata_key: undefined,
    metadata_value: undefined,
    dispatch_date_from: undefined,
    dispatch_date_to: undefined,
    so_date_from: undefined,
    so_date_to: undefined,
    po_date_from: undefined,
    po_date_to: undefined,
    sortBy: 'createdAt',
    sortOrder: 'desc', // Default: latest first
  };

  // Metadata key suggestions
  metadataKeySuggestions: string[] = [];
  allMetadataKeys: string[] = []; // Master list of all keys
  showMetadataKeySuggestions = false;

  // Categories for filter
  filterCategories: Array<{ _id: string; name: string; level?: number }> = [];

  // SO search and selection
  soSearchInput = '';
  soSuggestions: SO[] = [];
  showSOSuggestions = false;
  selectedSO: SO | null = null;

  // Enhanced search properties
  searchInput = '';
  searchSuggestions: MachineRow[] = [];
  showSearchSuggestions = false;
  allMachines: MachineRow[] = [];

  // Enhanced unified search
  enhancedSearchMachineSuggestions: MachineRow[] = [];
  enhancedSearchSOSuggestions: SO[] = [];
  showEnhancedSearchSuggestions = false;
  allSOs: SO[] = []; // Cache all SOs for efficient search

  // Search debounce
  private searchInput$ = new Subject<string>();
  private enhancedSearchInput$ = new Subject<string>();
  private subs = new Subscription();

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

  // Edit sequence modal state
  editSequenceVisible = false;
  editingMachine: MachineRow | null = null;
  editSequenceValue = '';
  sequenceSuggestions: string[] = [];
  sequenceFormat = '';
  sequenceFormatExample = '';
  sequenceError: string | null = null;
  isUpdatingSequence = false;

  // Edit machine modal state
  editMachineVisible = false;
  editingMachineForEdit: MachineRow | null = null;

  constructor(
    private baseApi: BaseApiService,
    private auth: AuthService,
    private fb: FormBuilder,
    private permissionService: PermissionService,
    private route: ActivatedRoute,
    private approvals: ApprovalsService,
    private messageService: MessageService,
    private categoryService: CategoryService,
    private machineService: MachineService,
    private soService: SOService
  ) {}

  ngOnInit(): void {
    this.checkCreatePermission();
    this.loadSequenceConfigs();
    this.loadFilterCategories();
    this.loadAllMachinesForSearch();
    this.loadAllSOsForSearch();

    // Setup debounced search
    this.subs.add(
      this.searchInput$
        .pipe(debounceTime(500), distinctUntilChanged())
        .subscribe((searchValue: string) => {
          // Sync searchInput with filters.search - only set if not empty
          const trimmedValue = searchValue?.trim();
          this.filters.search =
            trimmedValue && trimmedValue.length > 0 ? trimmedValue : undefined;
          this.page = 1;
          this.refresh();
        })
    );

    // Setup debounced enhanced search
    this.subs.add(
      this.enhancedSearchInput$
        .pipe(debounceTime(300), distinctUntilChanged())
        .subscribe((query: string) => {
          this.performEnhancedSearch(query);
        })
    );

    // Load metadata keys from all machines
    this.loadAllMetadataKeys();

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
    this.subs.unsubscribe();
  }

  setFilter(f: 'all' | 'own'): void {
    if (this.filter() !== f) {
      this.filter.set(f);
      this.page = 1;
      this.refresh();
    }
  }

  getSOName(m: MachineRow): string {
    // Handle deleted SO case
    if (!m.so) {
      return `[SO Deleted - ID: ${m.so_id?.substring(0, 8)}...]`;
    }
    if (m.so?.customer) return m.so.customer;
    if (m.so?.name) return m.so.name;
    if (m.so?.so_number) return m.so.so_number;
    return '-';
  }

  categoryName(m: MachineRow): string {
    if (!m.so?.category_id) return '-';
    if (typeof m.so.category_id === 'string') return m.so.category_id;
    if (typeof m.so.category_id === 'object' && m.so.category_id !== null) {
      return (m.so.category_id as { name?: string }).name || '-';
    }
    return '-';
  }

  getCategoryNameForView(): string {
    if (!this.viewMachine) return '-';
    return this.categoryName(this.viewMachine);
  }

  refresh(): void {
    this.loading = true;
    const user = this.auth.getCurrentUser();
    const params: Record<string, any> = { page: this.page, limit: this.limit };

    // Apply filter (All/My)
    if (this.filter() === 'own' && user?._id) {
      params['created_by'] = user._id;
    }

    // Apply search - only send if not empty (backend requires min 1 char)
    // Double-check: ensure we never send empty strings or undefined values
    if (this.filters.search) {
      const searchValue = String(this.filters.search).trim();
      if (searchValue.length > 0 && searchValue.length <= 50) {
        params['search'] = searchValue;
      }
      // If searchValue is empty after trim or too long, don't add it to params
    }

    // Apply SO filter - validate MongoDB ObjectId format
    if (this.filters.so_id) {
      const soId = String(this.filters.so_id).trim();
      // MongoDB ObjectId pattern: 24 hex characters
      if (soId && /^[0-9a-fA-F]{24}$/.test(soId)) {
        params['so_id'] = soId;
      }
    }

    // Apply category filter - validate MongoDB ObjectId format
    if (this.filters.category_id) {
      const categoryId = String(this.filters.category_id).trim();
      // MongoDB ObjectId pattern: 24 hex characters
      if (categoryId && /^[0-9a-fA-F]{24}$/.test(categoryId)) {
        params['category_id'] = categoryId;
      }
    }

    // Apply metadata filters - only send if non-empty and valid
    if (this.filters.metadata_key) {
      const metadataKey = String(this.filters.metadata_key).trim();
      if (metadataKey.length > 0 && metadataKey.length <= 100) {
        params['metadata_key'] = metadataKey;
        if (this.filters.metadata_value) {
          const metadataValue = String(this.filters.metadata_value).trim();
          if (metadataValue.length > 0 && metadataValue.length <= 500) {
            params['metadata_value'] = metadataValue;
          }
        }
      }
    }

    // Apply dispatch date filters - validate ISO date format
    if (this.filters.dispatch_date_from) {
      const dateFrom = String(this.filters.dispatch_date_from).trim();
      // Validate ISO date format (YYYY-MM-DD)
      if (dateFrom && /^\d{4}-\d{2}-\d{2}$/.test(dateFrom)) {
        params['dispatch_date_from'] = dateFrom;
      }
    }
    if (this.filters.dispatch_date_to) {
      const dateTo = String(this.filters.dispatch_date_to).trim();
      // Validate ISO date format (YYYY-MM-DD)
      if (dateTo && /^\d{4}-\d{2}-\d{2}$/.test(dateTo)) {
        params['dispatch_date_to'] = dateTo;
      }
    }

    // Apply SO date filters - validate ISO date format
    if (this.filters.so_date_from) {
      const dateFrom = String(this.filters.so_date_from).trim();
      // Validate ISO date format (YYYY-MM-DD)
      if (dateFrom && /^\d{4}-\d{2}-\d{2}$/.test(dateFrom)) {
        params['so_date_from'] = dateFrom;
      }
    }
    if (this.filters.so_date_to) {
      const dateTo = String(this.filters.so_date_to).trim();
      // Validate ISO date format (YYYY-MM-DD)
      if (dateTo && /^\d{4}-\d{2}-\d{2}$/.test(dateTo)) {
        params['so_date_to'] = dateTo;
      }
    }

    // Apply PO date filters - validate ISO date format
    if (this.filters.po_date_from) {
      const dateFrom = String(this.filters.po_date_from).trim();
      // Validate ISO date format (YYYY-MM-DD)
      if (dateFrom && /^\d{4}-\d{2}-\d{2}$/.test(dateFrom)) {
        params['po_date_from'] = dateFrom;
      }
    }
    if (this.filters.po_date_to) {
      const dateTo = String(this.filters.po_date_to).trim();
      // Validate ISO date format (YYYY-MM-DD)
      if (dateTo && /^\d{4}-\d{2}-\d{2}$/.test(dateTo)) {
        params['po_date_to'] = dateTo;
      }
    }

    // Apply sorting - validate against allowed values
    if (this.filters.sortBy) {
      const validSortBy = [
        'createdAt',
        'name',
        'category',
        'dispatch_date',
        'party_name',
        'machine_sequence',
        'location',
        'created_by',
      ];
      const sortByValue = String(this.filters.sortBy).trim();
      if (validSortBy.includes(sortByValue)) {
        params['sortBy'] = sortByValue;
        const sortOrder = this.filters.sortOrder || 'desc';
        if (sortOrder === 'asc' || sortOrder === 'desc') {
          params['sortOrder'] = sortOrder;
        }
      }
    }

    // Clean params: remove any undefined, null, or empty string values
    const cleanedParams: Record<string, any> = {};
    Object.keys(params).forEach(key => {
      const value = params[key];
      if (value !== undefined && value !== null && value !== '') {
        cleanedParams[key] = value;
      }
    });

    this.baseApi.get<any>(API_ENDPOINTS.MACHINES, cleanedParams).subscribe({
      next: res => {
        const data: any = (res as any).data || res;
        const list = data.machines || data?.data?.machines || [];
        this.total = data.total || data?.data?.total || 0;
        this.pages =
          data.pages ||
          data?.data?.pages ||
          Math.ceil(this.total / this.limit) ||
          0;
        // Map machines and properly extract SO data
        // Note: Backend populates so_id with the SO object, not a separate 'so' field
        const mapped = list.map((m: any) => {
          // Extract SO data - so_id is populated as an object by the backend
          const soIdValue = m.so_id;
          let soData = null;
          let soIdString = null;

          // Check if so_id is a populated object or just an ID string
          if (
            soIdValue &&
            typeof soIdValue === 'object' &&
            soIdValue !== null
          ) {
            // so_id is populated - extract the SO data
            soIdString = soIdValue._id?.toString() || null;
            soData = {
              _id: soIdString,
              name: soIdValue.name || null,
              customer: soIdValue.customer || null,
              so_number: soIdValue.so_number || null,
              po_number: soIdValue.po_number || null,
              so_date: soIdValue.so_date || null,
              po_date: soIdValue.po_date || null,
              location: soIdValue.location || null,
              category_id: soIdValue.category_id || null,
              subcategory_id: soIdValue.subcategory_id || null,
              party_name: soIdValue.party_name || null,
              mobile_number: soIdValue.mobile_number || null,
            };
          } else if (soIdValue && typeof soIdValue === 'string') {
            // so_id is just a string ID (not populated)
            soIdString = soIdValue;
            soData = null;
          }

          return {
            ...m,
            _id: m._id,
            so_id: soIdString || null,
            so: soData,
            images: Array.isArray(m?.images)
              ? m.images
              : m?.images
                ? [m.images]
                : [],
          };
        });
        // Set rows immediately to show data, then annotate in background
        this.rows = mapped;
        this.loading = false;

        // Annotate rows with latest approval status in background (non-blocking)
        this.annotateApprovalStatuses(mapped)
          .then(annotated => {
            // Only update if component is still active and rows haven't changed
            if (this.rows.length === mapped.length) {
              this.rows = annotated;
            }
          })
          .catch(err => {
            console.error('Error annotating approval statuses:', err);
            // Silently fail - rows are already set above
          });
      },
      error: err => {
        console.error('Error loading machines:', err);
        this.loading = false;
        this.rows = [];
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load machines. Please try again.',
        });
      },
    });
  }

  onPageChange(p: number): void {
    this.page = p;
    this.refresh();
  }

  onLimitChange(l: number): void {
    // Backend maximum limit is 100, so cap it at 100
    this.limit = Math.min(l, 100);
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
    this.createVisible = true;
  }

  onMachineCreated(): void {
    this.createVisible = false;
    this.refresh();
  }

  // Check if machine can be edited (must not be approved and must be created by current user)
  canEditMachine(machine: MachineRow): boolean {
    // Cannot edit if approved
    if (machine.is_approved) {
      return false;
    }

    // Check if current user is the creator
    const user = this.auth.getCurrentUser();
    if (!user?._id || !machine.created_by) return false;

    const creatorId =
      typeof machine.created_by === 'object'
        ? (machine.created_by as any)?._id || machine.created_by
        : machine.created_by;

    return String(creatorId) === String(user._id);
  }

  // Open edit machine modal
  openEditMachineModal(machine: MachineRow): void {
    if (!this.canEditMachine(machine)) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Cannot Edit',
        detail:
          'This machine cannot be edited. Only non-approved machines created by you can be edited.',
      });
      return;
    }

    this.editingMachineForEdit = machine;
    this.editMachineVisible = true;
  }

  // Close edit machine modal
  closeEditMachineModal(): void {
    this.editMachineVisible = false;
    this.editingMachineForEdit = null;
  }

  // Handle machine updated event
  onMachineUpdated(_updatedMachine: MachineRow): void {
    this.closeEditMachineModal();
    this.refresh();
    this.messageService.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Machine updated successfully',
      life: 3000,
    });
  }

  // Sequence config methods
  loadSequenceConfigs(): void {
    this.categoryService.getAllSequenceConfigs().subscribe({
      next: (response: any) => {
        // Handle different response structures
        if (Array.isArray(response)) {
          this.sequenceConfigs = response;
        } else if (response?.data) {
          this.sequenceConfigs = Array.isArray(response.data)
            ? response.data
            : [];
        } else {
          this.sequenceConfigs = [];
        }
        console.log('Sequence configs loaded:', this.sequenceConfigs.length);
      },
      error: (error: any) => {
        console.error('Error loading sequence configs:', error);
        this.sequenceConfigs = []; // Set empty array on error
      },
    });
  }

  getSequenceConfigForCategory(categoryId: string): SequenceConfig | undefined {
    return this.sequenceConfigs.find(
      config => config.category_id === categoryId
    );
  }

  hasSequenceConfigForMachine(machine: MachineRow): boolean {
    // If sequence configs failed to load, still show button - let the API handle validation
    if (this.sequenceConfigs.length === 0) {
      // If configs haven't loaded yet or failed, still allow button if machine has category
      // The generate endpoint will return an error if no config exists
      return (
        !!machine.so?.category_id &&
        !machine.machine_sequence &&
        !machine.is_approved
      );
    }

    if (!machine.so?.category_id) return false;
    const categoryId =
      typeof machine.so.category_id === 'string'
        ? machine.so.category_id
        : machine.so.category_id._id;

    if (!categoryId) return false;

    const config = this.getSequenceConfigForCategory(categoryId);
    return !!config;
  }

  generateSequenceForMachine(machine: MachineRow): void {
    if (
      !machine.so?.category_id ||
      machine.is_approved ||
      machine.machine_sequence
    ) {
      return;
    }

    this.generatingSequenceForMachineId = machine._id;

    const categoryId =
      typeof machine.so.category_id === 'string'
        ? machine.so.category_id
        : machine.so.category_id._id;

    const subcategoryId = machine.so.subcategory_id
      ? typeof machine.so.subcategory_id === 'string'
        ? machine.so.subcategory_id
        : machine.so.subcategory_id._id
      : undefined;

    const request: SequenceGenerationRequest = {
      categoryId: categoryId,
      subcategoryId: subcategoryId,
    };

    this.categoryService.generateSequence(request).subscribe({
      next: (response: any) => {
        const generatedSequence = response.data.sequence;

        // Update the machine with the generated sequence
        this.machineService
          .updateMachineSequence(machine._id, generatedSequence)
          .subscribe({
            next: (_updateResponse: any) => {
              // Update the machine in the list
              const machineIndex = this.rows.findIndex(
                m => m._id === machine._id
              );
              if (machineIndex !== -1) {
                this.rows[machineIndex] = {
                  ...this.rows[machineIndex],
                  machine_sequence: generatedSequence,
                };
              }

              this.generatingSequenceForMachineId = null;
              this.messageService.add({
                severity: 'success',
                summary: 'Sequence Generated',
                detail: `Sequence "${generatedSequence}" generated successfully for "${
                  machine.so?.name || machine._id
                }"`,
              });
            },
            error: (updateError: any) => {
              console.error(
                `Error saving sequence for machine ${machine._id}:`,
                updateError
              );
              this.generatingSequenceForMachineId = null;
              const errorMessage =
                updateError?.error?.message ||
                updateError?.message ||
                'Unknown error';
              this.messageService.add({
                severity: 'error',
                summary: 'Update Failed',
                detail: `Failed to save sequence: ${errorMessage}`,
              });
            },
          });
      },
      error: (error: any) => {
        console.error(
          `Error generating sequence for machine ${machine._id}:`,
          error
        );
        this.generatingSequenceForMachineId = null;
        const errorMessage =
          error?.error?.message || error?.message || 'Unknown error';
        this.messageService.add({
          severity: 'error',
          summary: 'Generation Failed',
          detail: `Failed to generate sequence: ${errorMessage}`,
        });
      },
    });
  }

  private checkCreatePermission(): void {
    const body = { action: 'CREATE_MACHINE' };
    this.baseApi.post<any>(API_ENDPOINTS.CHECK_PERMISSION, body).subscribe({
      next: res => {
        const payload: any = (res as any)?.data ?? res;
        const result = payload?.result ?? payload;
        this.canCreate = !!(result?.allowed || result?.requiresApproval);
        if (!this.canCreate) {
          this.messageService.add({
            severity: 'warn',
            summary: 'Permission denied',
            detail:
              result?.reason ||
              'You do not have permission to create machines.',
          });
        } else if (!result?.allowed && result?.requiresApproval) {
          this.messageService.add({
            severity: 'info',
            summary: 'Requires approval',
            detail: 'Your creation will be submitted for approval.',
          });
        }
      },
      error: () => {
        this.canCreate = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Permission check failed',
          detail: 'Could not verify permissions. Please try again.',
        });
      },
    });
  }

  imageUrl(path: string): string {
    if (!path) return '';
    // If it's already a full URL (Cloudinary or other external URLs), return as-is
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    // Otherwise, prepend the base URL for local paths
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

  onSearchChange(value: string): void {
    // Clean the search value - trim and set to undefined if empty
    const trimmedValue = value?.trim();
    this.filters.search =
      trimmedValue && trimmedValue.length > 0 ? trimmedValue : undefined;
    this.searchTerm = trimmedValue || ''; // Keep for backward compatibility
    this.searchInput$.next(trimmedValue || '');
  }

  // Enhanced search methods
  loadAllMachinesForSearch(): void {
    if (this.allMachines.length > 0) return; // Already loaded

    // Backend limit is max 100, so we'll load in batches if needed
    this.machineService.getAllMachines({ limit: 100, page: 1 }).subscribe({
      next: (res: any) => {
        const data = res?.data || res;
        const machines = data.machines || data?.data?.machines || [];
        this.allMachines = machines.map((m: any) => {
          const soIdValue = m.so_id;
          let soData = null;

          if (
            soIdValue &&
            typeof soIdValue === 'object' &&
            soIdValue !== null
          ) {
            soData = {
              _id: soIdValue._id?.toString() || null,
              name: soIdValue.name || null,
              customer: soIdValue.customer || null,
              so_number: soIdValue.so_number || null,
              po_number: soIdValue.po_number || null,
              so_date: soIdValue.so_date || null,
              po_date: soIdValue.po_date || null,
              location: soIdValue.location || null,
              category_id: soIdValue.category_id || null,
              subcategory_id: soIdValue.subcategory_id || null,
              party_name: soIdValue.party_name || null,
              mobile_number: soIdValue.mobile_number || null,
            };
          }

          return {
            ...m,
            _id: m._id,
            so_id:
              soIdValue && typeof soIdValue === 'object' && soIdValue !== null
                ? soIdValue._id?.toString() || null
                : typeof soIdValue === 'string'
                  ? soIdValue
                  : null,
            so: soData,
            // Ensure all machine fields are preserved
            machine_sequence: m.machine_sequence || null,
            dispatch_date: m.dispatch_date || null,
          };
        });
      },
      error: () => {
        this.allMachines = [];
      },
    });
  }

  onSearchInputChange(): void {
    const query = this.searchInput.trim().toLowerCase();

    if (!query) {
      // Clear search immediately if empty
      // Ensure filters.search is undefined (not empty string) to prevent validation errors
      this.searchSuggestions = [];
      this.showSearchSuggestions = false;
      this.filters.search = undefined;
      // Don't trigger debounced search for empty input
      this.page = 1;
      this.refresh();
      return;
    }

    // Update searchInput$ for debouncing - only if query is not empty
    this.searchInput$.next(this.searchInput);

    if (this.allMachines.length === 0) {
      this.loadAllMachinesForSearch();
      setTimeout(() => this.onSearchInputChange(), 300);
      return;
    }

    this.searchSuggestions = this.allMachines
      .filter(m => {
        if (!m.so) return false;

        const soNumberMatch =
          m.so.so_number?.toLowerCase().includes(query) || false;
        const poNumberMatch =
          m.so.po_number?.toLowerCase().includes(query) || false;
        const partyMatch =
          m.so.party_name?.toLowerCase().includes(query) || false;
        const locationMatch =
          m.so.location?.toLowerCase().includes(query) || false;
        const customerMatch =
          m.so.customer?.toLowerCase().includes(query) || false;
        const sequenceMatch =
          m.machine_sequence?.toLowerCase().includes(query) || false;

        // Search in dates (format as DD/MM/YYYY)
        let soDateMatch = false;
        let poDateMatch = false;
        if (m.so.so_date) {
          const soDateStr = new Date(m.so.so_date).toLocaleDateString('en-GB');
          soDateMatch = soDateStr.toLowerCase().includes(query);
        }
        if (m.so.po_date) {
          const poDateStr = new Date(m.so.po_date).toLocaleDateString('en-GB');
          poDateMatch = poDateStr.toLowerCase().includes(query);
        }

        return (
          soNumberMatch ||
          poNumberMatch ||
          partyMatch ||
          locationMatch ||
          customerMatch ||
          sequenceMatch ||
          soDateMatch ||
          poDateMatch
        );
      })
      .slice(0, 50);

    this.showSearchSuggestions = true;
  }

  selectSearchSuggestion(machine: MachineRow): void {
    // Set filters based on selected machine
    if (machine.so?._id) {
      this.filters.so_id = machine.so._id;
      this.selectedSO = machine.so;
      const displayName =
        machine.so.so_number || machine.so.customer || machine.so.name || '';
      this.soSearchInput = `${displayName}${machine.so.party_name ? ' - ' + machine.so.party_name : ''}`;
    }
    this.searchInput = '';
    this.searchSuggestions = [];
    this.showSearchSuggestions = false;
    this.page = 1;
    this.refresh();
  }

  hideSearchSuggestions(): void {
    setTimeout(() => {
      this.showSearchSuggestions = false;
    }, 200);
  }

  onSearchEnter(): void {
    if (this.searchSuggestions.length > 0) {
      this.selectSearchSuggestion(this.searchSuggestions[0]);
    } else {
      // Perform regular search - sync with filters and trigger debounced search
      const trimmedSearch = this.searchInput.trim();
      // Only set search if it has at least 1 character (backend requirement)
      if (trimmedSearch && trimmedSearch.length > 0) {
        this.filters.search = trimmedSearch;
        this.searchInput$.next(trimmedSearch);
      } else {
        // Clear search if empty
        this.filters.search = undefined;
        this.searchInput$.next('');
      }
      this.showSearchSuggestions = false;
    }
  }

  clearFilters(): void {
    this.filters = {
      // Initialize all filters as undefined (not empty strings) to avoid validation errors
      search: undefined,
      category_id: undefined,
      so_id: undefined,
      metadata_key: undefined,
      metadata_value: undefined,
      dispatch_date_from: undefined,
      dispatch_date_to: undefined,
      so_date_from: undefined,
      so_date_to: undefined,
      po_date_from: undefined,
      po_date_to: undefined,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    };
    this.searchTerm = '';
    this.searchInput = '';
    this.soSearchInput = '';
    this.selectedSO = null;
    this.enhancedSearchMachineSuggestions = [];
    this.enhancedSearchSOSuggestions = [];
    this.showEnhancedSearchSuggestions = false;
    // Don't trigger debounced search when clearing - just refresh
    this.filter.set('all');
    this.clearSOSelection();
    this.page = 1;
    this.refresh();
  }

  // Load all SOs for search caching
  loadAllSOsForSearch(): void {
    if (this.allSOs.length > 0) return; // Already loaded

    this.soService.getActiveSOs().subscribe({
      next: (response: any) => {
        const sos: SO[] = response?.data || response || [];
        this.allSOs = sos;
      },
      error: () => {
        this.allSOs = [];
      },
    });
  }

  // Enhanced unified search methods
  onEnhancedSearchInputChange(): void {
    const query = this.soSearchInput.trim();
    if (!query) {
      this.enhancedSearchMachineSuggestions = [];
      this.enhancedSearchSOSuggestions = [];
      this.showEnhancedSearchSuggestions = false;
      // Clear filters if search is empty
      if (this.selectedSO) {
        this.clearSOSelection();
      }
      if (this.filters.search) {
        this.filters.search = undefined;
        this.page = 1;
        this.refresh();
      }
      return;
    }

    this.showEnhancedSearchSuggestions = true;
    // Trigger debounced search
    this.enhancedSearchInput$.next(query);
  }

  // Perform the actual search (called after debounce)
  performEnhancedSearch(query: string): void {
    if (!query || !query.trim()) {
      this.enhancedSearchMachineSuggestions = [];
      this.enhancedSearchSOSuggestions = [];
      return;
    }

    const queryLower = query.toLowerCase();
    const queryParts = queryLower.split(/\s+/).filter(p => p.length > 0);

    // Search machines
    if (this.allMachines.length === 0) {
      this.loadAllMachinesForSearch();
      setTimeout(() => this.performEnhancedSearch(query), 300);
      return;
    }

    this.enhancedSearchMachineSuggestions = this.allMachines
      .filter(m => {
        if (!m.so) return false;

        // Build searchable text from all relevant fields
        const searchableText = [
          m.so.so_number,
          m.so.po_number,
          m.so.party_name,
          m.so.location,
          m.so.customer,
          m.so.name,
          m.machine_sequence,
          m.so.mobile_number,
        ]
          .filter(Boolean)
          .map(s => s?.toLowerCase() || '')
          .join(' ');

        // Also include formatted dates
        let dateText = '';
        if (m.so.so_date) {
          dateText +=
            new Date(m.so.so_date).toLocaleDateString('en-GB').toLowerCase() +
            ' ';
        }
        if (m.so.po_date) {
          dateText +=
            new Date(m.so.po_date).toLocaleDateString('en-GB').toLowerCase() +
            ' ';
        }

        const fullSearchableText = (searchableText + ' ' + dateText).trim();

        // Check if all query parts match (for multi-word queries)
        if (queryParts.length > 1) {
          return queryParts.every(part => fullSearchableText.includes(part));
        }

        // Single word or exact match
        return fullSearchableText.includes(queryLower);
      })
      .slice(0, 20); // Limit to 20 machines

    // Search SOs from cache
    if (this.allSOs.length === 0) {
      this.loadAllSOsForSearch();
      setTimeout(() => this.performEnhancedSearch(query), 300);
      return;
    }

    const filtered = this.allSOs.filter(so => {
      // Build searchable text
      const searchableText = [
        so.name,
        so.customer,
        so.party_name,
        so.mobile_number,
        so.so_number,
        so.po_number,
        so.location,
        typeof so.category_id === 'object' && so.category_id !== null
          ? so.category_id.name
          : null,
        so.subcategory_id &&
        typeof so.subcategory_id === 'object' &&
        so.subcategory_id !== null
          ? so.subcategory_id.name
          : null,
      ]
        .filter(Boolean)
        .map(s => s?.toLowerCase() || '')
        .join(' ');

      // Check if all query parts match (for multi-word queries)
      if (queryParts.length > 1) {
        return queryParts.every(part => searchableText.includes(part));
      }

      // Single word or exact match
      return searchableText.includes(queryLower);
    });

    // Limit to 20 SOs
    this.enhancedSearchSOSuggestions = filtered.slice(0, 20);
  }

  selectEnhancedMachineSuggestion(machine: MachineRow): void {
    // Set filters based on selected machine
    if (machine.so?._id) {
      this.filters.so_id = machine.so._id;
      this.selectedSO = machine.so;
      const displayName =
        machine.so.so_number || machine.so.customer || machine.so.name || '';
      this.soSearchInput = `${displayName}${machine.so.party_name ? ' - ' + machine.so.party_name : ''}`;
    }
    this.enhancedSearchMachineSuggestions = [];
    this.enhancedSearchSOSuggestions = [];
    this.showEnhancedSearchSuggestions = false;
    this.page = 1;
    this.refresh();
  }

  selectEnhancedSO(so: SO): void {
    this.selectedSO = so;
    this.filters.so_id = so._id;
    const displayName = so.so_number || so.customer || so.name || '';
    this.soSearchInput = `${displayName}${so.party_name ? ' - ' + so.party_name : ''}`;
    this.enhancedSearchMachineSuggestions = [];
    this.enhancedSearchSOSuggestions = [];
    this.showEnhancedSearchSuggestions = false;
    this.page = 1;
    this.refresh();
  }

  clearEnhancedSearch(): void {
    this.selectedSO = null;
    this.filters.so_id = undefined;
    this.filters.search = undefined;
    this.soSearchInput = '';
    this.enhancedSearchMachineSuggestions = [];
    this.enhancedSearchSOSuggestions = [];
    this.showEnhancedSearchSuggestions = false;
    this.page = 1;
    this.refresh();
  }

  hideEnhancedSearchSuggestions(): void {
    setTimeout(() => {
      this.showEnhancedSearchSuggestions = false;
    }, 200);
  }

  onEnhancedSearchEnter(): void {
    if (
      this.enhancedSearchMachineSuggestions.length > 0 ||
      this.enhancedSearchSOSuggestions.length > 0
    ) {
      // Select first suggestion
      if (this.enhancedSearchMachineSuggestions.length > 0) {
        this.selectEnhancedMachineSuggestion(
          this.enhancedSearchMachineSuggestions[0]
        );
      } else if (this.enhancedSearchSOSuggestions.length > 0) {
        this.selectEnhancedSO(this.enhancedSearchSOSuggestions[0]);
      }
    } else {
      // Perform general search
      const trimmedSearch = this.soSearchInput.trim();
      if (trimmedSearch && trimmedSearch.length > 0) {
        this.filters.search = trimmedSearch;
        this.searchInput$.next(trimmedSearch);
      } else {
        this.filters.search = undefined;
        this.searchInput$.next('');
      }
      this.showEnhancedSearchSuggestions = false;
    }
  }

  // SO search and selection methods (kept for backward compatibility if needed)
  onSOInputChange(): void {
    const query = this.soSearchInput.trim();
    if (!query) {
      this.soSuggestions = [];
      this.showSOSuggestions = false;
      return;
    }

    this.showSOSuggestions = true;

    // Search SOs by name, party_name, mobile_number, and category/subcategory names
    this.soService.getActiveSOs().subscribe({
      next: (response: any) => {
        const sos: SO[] = response?.data || response || [];
        const queryLower = query.toLowerCase();

        const filtered = sos.filter(so => {
          // Search in SO name or customer
          if (
            so.name?.toLowerCase().includes(queryLower) ||
            so.customer?.toLowerCase().includes(queryLower)
          )
            return true;
          // Search in party name
          if (so.party_name?.toLowerCase().includes(queryLower)) return true;
          // Search in mobile number
          if (so.mobile_number?.includes(query)) return true;
          // Search in category name
          if (
            typeof so.category_id === 'object' &&
            so.category_id !== null &&
            so.category_id.name?.toLowerCase().includes(queryLower)
          )
            return true;
          // Search in subcategory name
          if (
            so.subcategory_id &&
            typeof so.subcategory_id === 'object' &&
            so.subcategory_id !== null &&
            so.subcategory_id.name?.toLowerCase().includes(queryLower)
          )
            return true;
          return false;
        });

        // Limit to 50 for performance
        this.soSuggestions = filtered.slice(0, 50);
      },
      error: () => {
        this.soSuggestions = [];
      },
    });
  }

  selectSO(so: SO): void {
    this.selectedSO = so;
    this.filters.so_id = so._id;
    const displayName = so.so_number || so.customer || so.name || '';
    this.soSearchInput = `${displayName}${so.party_name ? ' - ' + so.party_name : ''}`;
    this.showSOSuggestions = false;
    this.page = 1;
    this.refresh();
  }

  clearSOSelection(): void {
    this.selectedSO = null;
    this.filters.so_id = undefined;
    this.soSearchInput = '';
    this.soSuggestions = [];
    this.showSOSuggestions = false;
    this.page = 1;
    this.refresh();
  }

  hideSOSuggestions(): void {
    setTimeout(() => {
      this.showSOSuggestions = false;
    }, 200);
  }

  // Load filter categories
  loadFilterCategories(): void {
    this.categoryService
      .getAllCategories({ includeInactive: false })
      .subscribe({
        next: (response: any) => {
          const data = response?.data || response;
          this.filterCategories = Array.isArray(data)
            ? data
            : data?.categories || [];
        },
        error: () => {
          this.filterCategories = [];
        },
      });
  }

  getCategoryDisplayName(cat: { name?: string; level?: number }): string {
    if (!cat.name) return '';
    const indent = cat.level ? '  '.repeat(cat.level) : '';
    return `${indent}${cat.name}`;
  }

  onCategoryFilterChange(): void {
    this.page = 1;
    this.refresh();
  }

  // Load ALL metadata keys from all machines (across all pages)
  // This fetches from ALL machines regardless of current filter to get complete metadata key list
  loadAllMetadataKeys(): void {
    const keySet = new Set<string>();
    const limit = 100; // Fetch 100 at a time

    const fetchPage = (page: number): void => {
      const params: Record<string, any> = { page, limit };
      // Don't apply created_by filter here - we want ALL metadata keys from ALL machines

      this.machineService.getAllMachines(params).subscribe({
        next: (response: any) => {
          const machines = response?.machines || response?.data?.machines || [];

          // Extract metadata keys from this page
          machines.forEach((machine: any) => {
            if (machine.metadata && typeof machine.metadata === 'object') {
              Object.keys(machine.metadata).forEach(key => {
                if (key && key.trim()) {
                  keySet.add(key.trim());
                }
              });
            }
          });

          const total = response?.total || response?.data?.total || 0;
          const totalPages = Math.ceil(total / limit);

          // If there are more pages, fetch next page
          if (page < totalPages && page < 10) {
            // Limit to 10 pages (1000 machines) to avoid too many requests
            fetchPage(page + 1);
          } else {
            // Done fetching, update the keys
            this.allMetadataKeys = Array.from(keySet).sort();
            this.updateMetadataKeySuggestions();
          }
        },
        error: () => {
          // On error, use whatever keys we've collected so far
          this.allMetadataKeys = Array.from(keySet).sort();
          this.updateMetadataKeySuggestions();
        },
      });
    };

    fetchPage(1);
  }

  // Update metadata key suggestions based on current input
  updateMetadataKeySuggestions(): void {
    if (!this.filters.metadata_key) {
      this.metadataKeySuggestions = [...this.allMetadataKeys];
      return;
    }

    const input = this.filters.metadata_key.toLowerCase().trim();
    this.metadataKeySuggestions = this.allMetadataKeys.filter(key =>
      key.toLowerCase().includes(input)
    );
  }

  onMetadataKeyChange(): void {
    // Clean metadata_key - set to undefined if empty
    if (
      this.filters.metadata_key === '' ||
      this.filters.metadata_key === null
    ) {
      this.filters.metadata_key = undefined;
      this.filters.metadata_value = undefined; // Clear value when key is cleared
    } else {
      // Trim the value
      const trimmed = String(this.filters.metadata_key).trim();
      this.filters.metadata_key = trimmed.length > 0 ? trimmed : undefined;
    }
    this.updateMetadataKeySuggestions();
    // Don't reload on every keystroke, wait for blur or selection
  }

  onMetadataValueChange(): void {
    // Clean metadata_value - set to undefined if empty
    if (
      this.filters.metadata_value === '' ||
      this.filters.metadata_value === null
    ) {
      this.filters.metadata_value = undefined;
    } else {
      // Trim the value
      const trimmed = String(this.filters.metadata_value).trim();
      this.filters.metadata_value = trimmed.length > 0 ? trimmed : undefined;
    }
    // Debounce metadata value search
    clearTimeout((this as any).metadataValueTimer);
    (this as any).metadataValueTimer = setTimeout(() => {
      this.page = 1;
      this.refresh();
    }, 500);
  }

  onDispatchDateFromChange(): void {
    // Clean dispatch_date_from - set to undefined if empty
    if (
      this.filters.dispatch_date_from === '' ||
      this.filters.dispatch_date_from === null
    ) {
      this.filters.dispatch_date_from = undefined;
    }
    this.page = 1;
    this.refresh();
  }

  onDispatchDateToChange(): void {
    // Clean dispatch_date_to - set to undefined if empty
    if (
      this.filters.dispatch_date_to === '' ||
      this.filters.dispatch_date_to === null
    ) {
      this.filters.dispatch_date_to = undefined;
    }
    this.page = 1;
    this.refresh();
  }

  onSODateFromChange(): void {
    // Clean so_date_from - set to undefined if empty
    if (
      this.filters.so_date_from === '' ||
      this.filters.so_date_from === null
    ) {
      this.filters.so_date_from = undefined;
    }
    this.page = 1;
    this.refresh();
  }

  onSODateToChange(): void {
    // Clean so_date_to - set to undefined if empty
    if (this.filters.so_date_to === '' || this.filters.so_date_to === null) {
      this.filters.so_date_to = undefined;
    }
    this.page = 1;
    this.refresh();
  }

  onPODateFromChange(): void {
    // Clean po_date_from - set to undefined if empty
    if (
      this.filters.po_date_from === '' ||
      this.filters.po_date_from === null
    ) {
      this.filters.po_date_from = undefined;
    }
    this.page = 1;
    this.refresh();
  }

  onPODateToChange(): void {
    // Clean po_date_to - set to undefined if empty
    if (this.filters.po_date_to === '' || this.filters.po_date_to === null) {
      this.filters.po_date_to = undefined;
    }
    this.page = 1;
    this.refresh();
  }

  onSortByChange(): void {
    // Clean sortBy - set to undefined if invalid
    if (!this.filters.sortBy) {
      this.filters.sortBy = undefined;
      this.filters.sortOrder = undefined;
    } else {
      // Ensure sortOrder is set if sortBy is set
      if (!this.filters.sortOrder) {
        this.filters.sortOrder = 'desc';
      }
    }
    this.page = 1;
    this.refresh();
  }

  onSortOrderChange(): void {
    // Ensure sortOrder is valid
    if (this.filters.sortOrder !== 'asc' && this.filters.sortOrder !== 'desc') {
      this.filters.sortOrder = 'desc';
    }
    this.page = 1;
    this.refresh();
  }

  selectMetadataKey(key: string): void {
    this.filters.metadata_key = key;
    this.showMetadataKeySuggestions = false;
    this.updateMetadataKeySuggestions();
    this.page = 1;
    this.refresh();
  }

  hideMetadataSuggestions(): void {
    setTimeout(() => {
      this.showMetadataKeySuggestions = false;
    }, 200);
  }

  private async annotateApprovalStatuses(
    rows: MachineRow[]
  ): Promise<MachineRow[]> {
    try {
      // If no rows, return early
      if (!rows || rows.length === 0) {
        return rows;
      }

      const machineIds = rows.map(r => r._id);

      // Create promises with timeout to prevent hanging
      const lookups = await Promise.all(
        machineIds.map(id => {
          const promise = this.approvals
            .getByMachine(id, '-updatedAt')
            .toPromise()
            .catch(() => null);

          // Add 3 second timeout per request
          const timeoutPromise = new Promise<null>(resolve =>
            setTimeout(() => resolve(null), 3000)
          );

          return Promise.race([promise, timeoutPromise]);
        })
      );

      const byId: Record<string, any> = {};
      lookups.forEach((res, idx) => {
        if (res) {
          const list =
            (res as any)?.approvals || (res as any)?.data?.approvals || [];
          const latest = list[0];
          byId[machineIds[idx]] = latest || null;
        }
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
    } catch (err) {
      console.error('Error in annotateApprovalStatuses:', err);
      return rows;
    }
  }

  // Document modal methods
  openDocumentsModal(machine: any): void {
    this.selectedMachine = machine;
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
    const url = this.documentUrl(doc.file_path);
    window.open(url, '_blank');
  }

  documentUrl(filePath: string): string {
    if (!filePath) return '';
    // If it's already a full URL (Cloudinary or other external URLs), return as-is
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      return filePath;
    }
    // Otherwise, prepend the base URL for local paths
    const baseUrl = environment.baseUrl;
    const normalizedPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
    return `${baseUrl}${normalizedPath}`;
  }

  // View modal methods
  openView(machine: MachineRow): void {
    this.viewMachine = machine;
    this.viewVisible = true;
  }

  getSubcategoryDisplayName(
    subcategoryId: string | { _id?: string; name?: string } | null | undefined
  ): string {
    if (!subcategoryId) return '-';
    // If it's an object with a name property (populated from backend)
    if (
      typeof subcategoryId === 'object' &&
      subcategoryId !== null &&
      'name' in subcategoryId &&
      subcategoryId.name
    ) {
      return subcategoryId.name;
    }
    // If it's a string ID, we can't resolve it without a lookup, so return '-'
    // For technician view, we'll rely on populated data from backend
    if (typeof subcategoryId === 'string') {
      return '-';
    }
    // If it's an object with _id but no name, return '-'
    return '-';
  }

  trackByIndex = (i: number) => i;
  trackByKey = (_: number, item: { key: string; value: unknown }) => item.key;

  // Get row class for styling (highlight rejected machines)
  getRowClass(machine: MachineRow): string {
    if (machine.approvalStatus === 'rejected') {
      return 'rejected-row';
    }
    return '';
  }

  // Check if current user can edit sequence (must be creator)
  canEditSequence(machine: MachineRow): boolean {
    const user = this.auth.getCurrentUser();
    if (!user?._id || !machine.created_by) return false;
    const creatorId =
      typeof machine.created_by === 'object'
        ? (machine.created_by as any)?._id || machine.created_by
        : machine.created_by;
    return String(creatorId) === String(user._id);
  }

  // Open edit sequence modal
  openEditSequenceModal(machine: MachineRow): void {
    if (!this.canEditSequence(machine)) return;
    this.editSequenceVisible = true;
    this.editingMachine = machine;
    this.editSequenceValue = machine.machine_sequence || '';
    this.sequenceError = null;
    this.loadSequenceConfigForEdit(machine);
  }

  // Load sequence config and generate suggestions
  loadSequenceConfigForEdit(machine: MachineRow): void {
    if (!machine.so?.category_id) {
      this.sequenceError = 'Machine must have an SO with a category';
      return;
    }

    const categoryId =
      typeof machine.so.category_id === 'object'
        ? machine.so.category_id._id
        : machine.so.category_id;

    if (!categoryId) {
      this.sequenceError = 'Machine must have a category';
      return;
    }

    const subcategoryId = machine.so.subcategory_id
      ? typeof machine.so.subcategory_id === 'object'
        ? machine.so.subcategory_id._id
        : machine.so.subcategory_id
      : null;

    // Find config - first try subcategory-specific, then category-only
    let config = this.sequenceConfigs.find(c => {
      const configCategoryId =
        typeof c.category_id === 'object'
          ? (c.category_id as any)?._id
          : c.category_id;
      const configSubcategoryId = c.subcategory_id
        ? typeof c.subcategory_id === 'object'
          ? (c.subcategory_id as any)?._id
          : c.subcategory_id
        : null;

      return (
        configCategoryId === categoryId &&
        configSubcategoryId === subcategoryId &&
        c.is_active !== false
      );
    });

    // Fallback to category-only config if subcategory config not found
    if (!config && subcategoryId) {
      config = this.sequenceConfigs.find(c => {
        const configCategoryId =
          typeof c.category_id === 'object'
            ? (c.category_id as any)?._id
            : c.category_id;
        const configSubcategoryId = c.subcategory_id
          ? typeof c.subcategory_id === 'object'
            ? (c.subcategory_id as any)?._id
            : c.subcategory_id
          : null;

        return (
          configCategoryId === categoryId &&
          configSubcategoryId === null &&
          c.is_active !== false
        );
      });
    }

    // If still not found, try simple match
    if (!config) {
      config = this.sequenceConfigs.find(c => {
        const configCategoryId =
          typeof c.category_id === 'object'
            ? (c.category_id as any)?._id
            : c.category_id;
        return configCategoryId === categoryId && c.is_active !== false;
      });
    }

    if (!config || !config.format) {
      this.sequenceError = 'No sequence configuration found for this category';
      // Try to fetch from API as fallback
      this.fetchSequenceConfigFromAPI(machine, categoryId, subcategoryId);
      return;
    }

    this.sequenceFormat = config.format;

    // Generate example - use category/subcategory names (preserves special characters)
    const category = this.filterCategories.find(c => c._id === categoryId);
    const categoryName =
      category?.name ||
      (typeof machine.so?.category_id === 'object'
        ? machine.so.category_id?.name
        : 'CATEGORY');
    // Format category name for sequence (preserves special characters like parentheses and dots)
    const formatCategoryNameForSequence = (name: string): string => {
      return name
        .toUpperCase()
        .trim()
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
        .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
    };
    const categoryFormatted = formatCategoryNameForSequence(categoryName);

    const subcategoryName = machine.so?.subcategory_id
      ? typeof machine.so.subcategory_id === 'object'
        ? machine.so.subcategory_id?.name
        : ''
      : '';
    const subcategoryFormatted = subcategoryName
      ? formatCategoryNameForSequence(subcategoryName)
      : '';

    this.sequenceFormatExample = config.format
      .replace('{category}', categoryFormatted)
      .replace('{subcategory}', subcategoryFormatted)
      .replace('{sequence}', '001')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    // Generate suggestions (next 3 non-assigned sequences)
    this.generateSequenceSuggestions(machine, config);
  }

  // Fetch sequence config from API as fallback
  fetchSequenceConfigFromAPI(
    machine: MachineRow,
    categoryId: string,
    subcategoryId: string | null
  ): void {
    this.categoryService.getAllSequenceConfigs().subscribe({
      next: (response: any) => {
        const configs = Array.isArray(response)
          ? response
          : response?.data || [];

        // Update local configs
        this.sequenceConfigs = configs;

        // Try to find config again
        let config = configs.find((c: SequenceConfig) => {
          const configCategoryId =
            typeof c.category_id === 'object'
              ? (c.category_id as any)?._id
              : c.category_id;
          const configSubcategoryId = c.subcategory_id
            ? typeof c.subcategory_id === 'object'
              ? (c.subcategory_id as any)?._id
              : c.subcategory_id
            : null;

          return (
            configCategoryId === categoryId &&
            configSubcategoryId === subcategoryId &&
            c.is_active !== false
          );
        });

        if (!config && subcategoryId) {
          config = configs.find((c: SequenceConfig) => {
            const configCategoryId =
              typeof c.category_id === 'object'
                ? (c.category_id as any)?._id
                : c.category_id;
            const configSubcategoryId = c.subcategory_id
              ? typeof c.subcategory_id === 'object'
                ? (c.subcategory_id as any)?._id
                : c.subcategory_id
              : null;

            return (
              configCategoryId === categoryId &&
              configSubcategoryId === null &&
              c.is_active !== false
            );
          });
        }

        if (config && config.format) {
          this.sequenceFormat = config.format;

          const category = this.filterCategories.find(
            c => c._id === categoryId
          );
          const categoryName =
            category?.name ||
            (typeof machine.so?.category_id === 'object'
              ? machine.so.category_id?.name
              : 'CATEGORY');

          // Format category name for sequence (preserves special characters like parentheses and dots)
          const formatCategoryNameForSequence = (name: string): string => {
            return name
              .toUpperCase()
              .trim()
              .replace(/\s+/g, '-') // Replace spaces with hyphens
              .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
              .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
          };
          const categoryFormatted = formatCategoryNameForSequence(categoryName);

          const subcategoryName = machine.so?.subcategory_id
            ? typeof machine.so.subcategory_id === 'object'
              ? machine.so.subcategory_id?.name
              : ''
            : '';
          const subcategoryFormatted = subcategoryName
            ? formatCategoryNameForSequence(subcategoryName)
            : '';

          this.sequenceFormatExample = config.format
            .replace('{category}', categoryFormatted)
            .replace('{subcategory}', subcategoryFormatted)
            .replace('{sequence}', '001')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');

          this.sequenceError = null;
          this.generateSequenceSuggestions(machine, config);
        } else {
          this.sequenceError =
            'No active sequence configuration found for this category';
        }
      },
      error: error => {
        console.error('Error fetching sequence configs:', error);
        this.sequenceError = 'Failed to load sequence configuration';
      },
    });
  }

  // Generate sequence suggestions
  async generateSequenceSuggestions(
    machine: MachineRow,
    _config: SequenceConfig
  ): Promise<void> {
    if (!machine.so?.category_id) return;
    const categoryId =
      typeof machine.so.category_id === 'object'
        ? machine.so.category_id._id
        : machine.so.category_id;
    const subcategoryId = machine.so.subcategory_id
      ? typeof machine.so.subcategory_id === 'object'
        ? machine.so.subcategory_id._id
        : machine.so.subcategory_id
      : undefined;

    const suggestions: string[] = [];
    let attempts = 0;
    const maxAttempts = 10;

    while (suggestions.length < 3 && attempts < maxAttempts) {
      try {
        const request: SequenceGenerationRequest = {
          categoryId: categoryId as string,
          subcategoryId: subcategoryId as string | undefined,
        };

        const response: any = await this.categoryService
          .generateSequence(request)
          .toPromise();
        const generated = response?.data?.sequence;

        if (generated && !suggestions.includes(generated)) {
          suggestions.push(generated);
        }
        attempts++;
      } catch (error) {
        console.error('Error generating suggestion:', error);
        attempts++;
      }
    }

    this.sequenceSuggestions = suggestions;
  }

  // Validate sequence format - accepts both old format (slug) and new format (name with special characters)
  validateSequenceFormat(sequence: string): boolean {
    if (!this.sequenceFormat || !this.editingMachine) return false;
    if (!this.editingMachine.so?.category_id) return false;

    const categoryId =
      typeof this.editingMachine.so.category_id === 'object'
        ? this.editingMachine.so.category_id._id
        : this.editingMachine.so.category_id;

    const category = this.filterCategories.find(c => c._id === categoryId);
    const categoryName =
      category?.name ||
      (typeof this.editingMachine.so.category_id === 'object'
        ? this.editingMachine.so.category_id?.name
        : 'CATEGORY');

    // Helper function to format category name for sequence (preserves special characters)
    const formatCategoryNameForSequence = (name: string): string => {
      return name
        .toUpperCase()
        .trim()
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
        .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
    };

    // New format: using category name (preserves special characters)
    const categoryFormatted = formatCategoryNameForSequence(categoryName);

    // Old format: using slug (no special characters) - for backward compatibility
    // Generate slug from name by removing special characters
    const categorySlug = categoryName
      .toUpperCase()
      .replace(/[^A-Z0-9\s-]/g, '')
      .replace(/\s+/g, '-');

    const subcategoryName = this.editingMachine.so?.subcategory_id
      ? typeof this.editingMachine.so.subcategory_id === 'object'
        ? this.editingMachine.so.subcategory_id?.name
        : ''
      : '';

    const subcategoryFormatted = subcategoryName
      ? formatCategoryNameForSequence(subcategoryName)
      : '';

    // Generate slug from subcategory name by removing special characters
    const subcategorySlug = subcategoryName
      ? subcategoryName
          .toUpperCase()
          .replace(/[^A-Z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
      : '';

    // Build regex pattern for new format (with special characters)
    let patternNew = this.sequenceFormat
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\\\{category\\\}/g, this.escapeRegex(categoryFormatted))
      .replace(/\\\{subcategory\\\}/g, subcategoryFormatted || '[A-Z0-9-().]*')
      .replace(/\\\{sequence\\\}/g, '\\d+');
    patternNew = patternNew.replace(/-+/g, '-').replace(/^-|-$/g, '');

    // Build regex pattern for old format (slug-based, no special characters) - for backward compatibility
    let patternOld = this.sequenceFormat
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\\\{category\\\}/g, this.escapeRegex(categorySlug))
      .replace(/\\\{subcategory\\\}/g, subcategorySlug || '[A-Z0-9-]*')
      .replace(/\\\{sequence\\\}/g, '\\d+');
    patternOld = patternOld.replace(/-+/g, '-').replace(/^-|-$/g, '');

    // Test against both patterns (new format and old format for backward compatibility)
    const regexNew = new RegExp(`^${patternNew}$`, 'i');
    const regexOld = new RegExp(`^${patternOld}$`, 'i');

    return regexNew.test(sequence) || regexOld.test(sequence);
  }

  // Helper function to escape regex special characters
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Close edit sequence modal
  closeEditSequenceModal(): void {
    this.editSequenceVisible = false;
    this.editingMachine = null;
    this.editSequenceValue = '';
    this.sequenceSuggestions = [];
    this.sequenceFormat = '';
    this.sequenceFormatExample = '';
    this.sequenceError = null;
  }

  // Select suggestion
  selectSuggestion(suggestion: string): void {
    this.editSequenceValue = suggestion;
    this.sequenceError = null;
  }

  // Update sequence
  async updateSequence(): Promise<void> {
    if (!this.editingMachine || !this.editSequenceValue.trim()) {
      this.sequenceError = 'Please enter a sequence';
      return;
    }

    const sequence = this.editSequenceValue.trim();

    // Validate format
    if (!this.validateSequenceFormat(sequence)) {
      this.sequenceError = `Invalid format. Expected format: ${this.sequenceFormat}. Example: ${this.sequenceFormatExample}`;
      return;
    }

    // Check if machine was approved before update
    const wasApproved =
      this.editingMachine.is_approved ||
      this.editingMachine.approvalStatus === 'approved';

    this.isUpdatingSequence = true;
    this.sequenceError = null;

    try {
      const response: any = await this.machineService
        .updateMachineSequence(this.editingMachine._id, sequence)
        .toPromise();

      const responseMessage =
        response?.message ||
        (wasApproved
          ? 'Machine sequence updated successfully. Machine has been unapproved and sent for review.'
          : 'Machine sequence updated successfully');

      this.messageService.add({
        severity: 'success',
        summary: 'Sequence Updated',
        detail: responseMessage,
        life: 5000, // Show for 5 seconds since it's important
      });

      // If machine was approved, show additional info message
      if (wasApproved) {
        setTimeout(() => {
          this.messageService.add({
            severity: 'info',
            summary: 'Approval Required',
            detail:
              'The machine has been unapproved and a QC approval request has been created. Approvers have been notified.',
            life: 6000,
          });
        }, 500);
      }

      this.closeEditSequenceModal();
      this.refresh();
    } catch (error: any) {
      const errorMessage =
        error?.error?.message || error?.message || 'Failed to update sequence';
      this.sequenceError = errorMessage;
      this.messageService.add({
        severity: 'error',
        summary: 'Update Failed',
        detail: errorMessage,
      });
    } finally {
      this.isUpdatingSequence = false;
    }
  }
}
