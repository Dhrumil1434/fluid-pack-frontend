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
import {
  SequenceGenerationRequest,
  SequenceConfig,
} from '../../../core/models/category.model';
import { CreateMachineModalComponent } from '../components/create-machine-modal/create-machine-modal.component';
import { PageHeaderComponent } from '../../../core/components/page-header/page-header.component';
import { ListFiltersComponent } from '../../admin/components/shared/list/list-filters.component';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

interface MachineRow {
  _id: string;
  name: string;
  category_id?: { name?: string } | string;
  subcategory_id?: { name?: string; _id?: string } | string | null;
  images?: string[];
  documents?: Array<{
    name: string;
    file_path: string;
    document_type?: string;
  }>;
  is_approved: boolean;
  party_name?: string;
  location?: string;
  mobile_number?: string;
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
    PageHeaderComponent,
    ListFiltersComponent,
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

        <!-- Filters & Search -->
        <app-list-filters
          searchLabel="Search machines"
          searchPlaceholder="Name, party, location, metadata, created by..."
          (searchChange)="onSearchChange($event)"
          (apply)="refresh()"
          (clear)="clearFilters()"
        >
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
            <select
              class="px-3 py-2 border border-neutral-300 rounded-md min-w-48"
              [(ngModel)]="filters.category_id"
              (change)="onCategoryFilterChange()"
            >
              <option [ngValue]="undefined">All categories</option>
              <option *ngFor="let cat of filterCategories" [value]="cat._id">
                {{ getCategoryDisplayName(cat) }}
              </option>
            </select>
            <!-- Metadata Key Autocomplete -->
            <div class="relative">
              <input
                type="text"
                class="px-3 py-2 border border-neutral-300 rounded-md min-w-40"
                placeholder="Metadata Key"
                [(ngModel)]="filters.metadata_key"
                (input)="onMetadataKeyChange()"
                (focus)="showMetadataKeySuggestions = true"
                (blur)="hideMetadataSuggestions()"
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
            <input
              *ngIf="filters.metadata_key"
              type="text"
              class="px-3 py-2 border border-neutral-300 rounded-md min-w-40"
              placeholder="Metadata Value"
              [(ngModel)]="filters.metadata_value"
              (input)="onMetadataValueChange()"
            />
            <!-- Dispatch Date From -->
            <input
              type="date"
              class="px-3 py-2 border border-neutral-300 rounded-md"
              placeholder="Dispatch Date From"
              [(ngModel)]="filters.dispatch_date_from"
              (change)="refresh()"
            />
            <!-- Dispatch Date To -->
            <input
              type="date"
              class="px-3 py-2 border border-neutral-300 rounded-md"
              placeholder="Dispatch Date To"
              [(ngModel)]="filters.dispatch_date_to"
              (change)="refresh()"
            />
            <!-- Sort By -->
            <select
              class="px-3 py-2 border border-neutral-300 rounded-md"
              [(ngModel)]="filters.sortBy"
              (change)="refresh()"
            >
              <option value="createdAt">Created Date</option>
              <option value="name">Name</option>
              <option value="category">Category</option>
              <option value="dispatch_date">Dispatch Date</option>
            </select>
            <!-- Sort Order -->
            <select
              *ngIf="filters.sortBy"
              class="px-3 py-2 border border-neutral-300 rounded-md"
              [(ngModel)]="filters.sortOrder"
              (change)="refresh()"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
        </app-list-filters>

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
            <div *ngIf="loading" class="flex items-center justify-center py-12">
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
                            (m.is_approved || !m.category_id)
                          "
                          class="text-gray-400 text-xs italic"
                          >No sequence</span
                        >
                        <!-- Generate Sequence Button -->
                        <button
                          *ngIf="
                            !m.machine_sequence &&
                            !m.is_approved &&
                            !!m.category_id
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
                          <div
                            class="text-sm font-medium text-gray-900 truncate max-w-48"
                            [title]="m.name"
                          >
                            {{ m.name }}
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
                        [title]="m.party_name"
                      >
                        {{ m.party_name || '-' }}
                      </div>
                    </td>

                    <!-- Location -->
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div
                        class="text-sm text-gray-900 truncate max-w-32"
                        [title]="m.location"
                      >
                        {{ m.location || '-' }}
                      </div>
                    </td>

                    <!-- Contact -->
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div
                        class="text-sm text-gray-900"
                        *ngIf="m.mobile_number; else noContact"
                      >
                        <i class="pi pi-phone text-gray-400 mr-1"></i>
                        {{ m.mobile_number }}
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
                            <span>by {{ m.decisionByName || 'approver' }}</span>
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
                            <span>by {{ m.decisionByName || 'approver' }}</span>
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
          class="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
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
              <div *ngIf="selectedMachine?.documents?.length; else noDocuments">
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
                    viewMachine?.name
                  }}</span>
                </div>
                <div class="md:col-span-1">
                  <span class="block text-xs text-gray-500 mb-1"
                    >Party Name</span
                  >
                  <span class="text-sm text-gray-900">{{
                    viewMachine?.party_name || '-'
                  }}</span>
                </div>
                <div class="md:col-span-1">
                  <span class="block text-xs text-gray-500 mb-1">Location</span>
                  <span class="text-sm text-gray-900">{{
                    viewMachine?.location || '-'
                  }}</span>
                </div>
                <div class="md:col-span-1">
                  <span class="block text-xs text-gray-500 mb-1"
                    >Mobile Number</span
                  >
                  <span class="text-sm text-gray-900">{{
                    viewMachine?.mobile_number || '-'
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
                  <span class="block text-xs text-gray-500 mb-1">Category</span>
                  <span class="text-sm text-gray-900">{{
                    getCategoryNameForView() || '-'
                  }}</span>
                </div>
                <div class="md:col-span-1">
                  <span class="block text-xs text-gray-500 mb-1"
                    >Subcategory</span
                  >
                  <span
                    *ngIf="viewMachine?.subcategory_id"
                    class="text-sm text-gray-900"
                  >
                    {{ getSubcategoryDisplayName(viewMachine?.subcategory_id) }}
                  </span>
                  <span
                    *ngIf="!viewMachine?.subcategory_id"
                    class="text-gray-400 text-sm"
                    >-</span
                  >
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
                  <span class="block text-xs text-gray-500 mb-1">Approved</span>
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
                  <span class="block text-xs text-gray-500 mb-1">Created</span>
                  <span class="text-sm text-gray-900">{{
                    viewMachine?.createdAt | date: 'medium'
                  }}</span>
                </div>
                <div class="md:col-span-1">
                  <span class="block text-xs text-gray-500 mb-1">Updated</span>
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
                    <div class="flex items-center gap-2 text-sm text-gray-500">
                      <i class="pi pi-file"></i>
                      <span>No documents attached</span>
                    </div>
                  </ng-template>
                </div>
                <div class="md:col-span-2" *ngIf="viewMachine?.metadata">
                  <span class="block text-xs text-gray-500 mb-1">Metadata</span>
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
              <h3 class="text-xl font-bold text-text">Edit Machine Sequence</h3>
              <p class="text-sm text-text-muted mt-1">
                Update the sequence for {{ editingMachine?.name }}
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
                placeholder="Enter sequence (e.g., {{ sequenceFormatExample }})"
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
    metadata_key?: string;
    metadata_value?: string;
    dispatch_date_from?: string;
    dispatch_date_to?: string;
    sortBy?: 'createdAt' | 'name' | 'category' | 'dispatch_date';
    sortOrder?: 'asc' | 'desc';
  } = {
    sortBy: 'createdAt',
    sortOrder: 'desc', // Default: latest first
  };

  // Metadata key suggestions
  metadataKeySuggestions: string[] = [];
  allMetadataKeys: string[] = []; // Master list of all keys
  showMetadataKeySuggestions = false;

  // Categories for filter
  filterCategories: Array<{ _id: string; name: string; level?: number }> = [];

  // Search debounce
  private searchInput$ = new Subject<string>();
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

  constructor(
    private baseApi: BaseApiService,
    private auth: AuthService,
    private fb: FormBuilder,
    private permissionService: PermissionService,
    private route: ActivatedRoute,
    private approvals: ApprovalsService,
    private messageService: MessageService,
    private categoryService: CategoryService,
    private machineService: MachineService
  ) {}

  ngOnInit(): void {
    this.checkCreatePermission();
    this.loadSequenceConfigs();
    this.loadFilterCategories();

    // Setup debounced search
    this.subs.add(
      this.searchInput$
        .pipe(debounceTime(500), distinctUntilChanged())
        .subscribe(() => {
          this.page = 1;
          this.refresh();
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

  categoryName(m: MachineRow): string {
    if (!m.category_id) return '-';
    if (typeof m.category_id === 'string') return m.category_id;
    return m.category_id?.name || '-';
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

    // Apply search
    if (this.filters.search?.trim()) {
      params['search'] = this.filters.search.trim();
    }

    // Apply category filter
    if (this.filters.category_id) {
      params['category_id'] = this.filters.category_id;
    }

    // Apply metadata filters
    if (this.filters.metadata_key) {
      params['metadata_key'] = this.filters.metadata_key;
      if (this.filters.metadata_value) {
        params['metadata_value'] = this.filters.metadata_value;
      }
    }

    // Apply dispatch date filters
    if (this.filters.dispatch_date_from) {
      params['dispatch_date_from'] = this.filters.dispatch_date_from;
    }
    if (this.filters.dispatch_date_to) {
      params['dispatch_date_to'] = this.filters.dispatch_date_to;
    }

    // Apply sorting
    if (this.filters.sortBy) {
      params['sortBy'] = this.filters.sortBy;
      params['sortOrder'] = this.filters.sortOrder || 'desc';
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
            this.rows = annotated; // Remove sortRows since backend handles sorting
            this.loading = false;
          })
          .catch(() => {
            this.rows = mapped;
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
    this.createVisible = true;
  }

  onMachineCreated(): void {
    this.createVisible = false;
    this.refresh();
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
        !!machine.category_id &&
        !machine.machine_sequence &&
        !machine.is_approved
      );
    }

    if (!machine.category_id) return false;
    const categoryId =
      typeof machine.category_id === 'string'
        ? machine.category_id
        : (machine.category_id as any)?._id;

    if (!categoryId) return false;

    const config = this.getSequenceConfigForCategory(categoryId);
    return !!config;
  }

  generateSequenceForMachine(machine: MachineRow): void {
    if (
      !machine.category_id ||
      machine.is_approved ||
      machine.machine_sequence
    ) {
      return;
    }

    this.generatingSequenceForMachineId = machine._id;

    const categoryId =
      typeof machine.category_id === 'string'
        ? machine.category_id
        : (machine.category_id as any)?._id || '';

    const subcategoryId = machine.subcategory_id
      ? typeof machine.subcategory_id === 'string'
        ? machine.subcategory_id
        : (machine.subcategory_id as any)?._id
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
                detail: `Sequence "${generatedSequence}" generated successfully for "${machine.name}"`,
              });
            },
            error: (updateError: any) => {
              console.error(
                `Error saving sequence for machine ${machine.name}:`,
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
          `Error generating sequence for machine ${machine.name}:`,
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
    this.filters.search = value;
    this.searchTerm = value; // Keep for backward compatibility
    this.searchInput$.next(value || '');
  }

  clearFilters(): void {
    this.filters = {
      sortBy: 'createdAt',
      sortOrder: 'desc',
    };
    this.searchTerm = '';
    this.filter.set('all');
    this.page = 1;
    this.refresh();
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
    this.updateMetadataKeySuggestions();
    // Don't reload on every keystroke, wait for blur or selection
  }

  onMetadataValueChange(): void {
    // Debounce metadata value search
    clearTimeout((this as any).metadataValueTimer);
    (this as any).metadataValueTimer = setTimeout(() => {
      this.page = 1;
      this.refresh();
    }, 500);
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

  // Document modal methods
  openDocumentsModal(machine: any): void {
    this.selectedMachine = machine;
    this.documentsVisible = true;
  }

  downloadDocument(doc: any): void {
    const link = document.createElement('a');
    link.href = this.documentUrl(doc.file_path);
    link.download = doc.name;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  previewDocument(doc: any): void {
    const url = this.documentUrl(doc.file_path);
    window.open(url, '_blank');
  }

  documentUrl(filePath: string): string {
    const baseUrl = environment.baseUrl;
    const normalizedPath = !filePath
      ? ''
      : filePath.startsWith('/')
        ? filePath
        : `/${filePath}`;
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
    const categoryId =
      typeof machine.category_id === 'object'
        ? (machine.category_id as any)?._id
        : machine.category_id;

    if (!categoryId) {
      this.sequenceError = 'Machine must have a category';
      return;
    }

    const subcategoryId = machine.subcategory_id
      ? typeof machine.subcategory_id === 'object'
        ? (machine.subcategory_id as any)?._id
        : machine.subcategory_id
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

    // Generate example - use category/subcategory names or slugs
    const category = this.filterCategories.find(c => c._id === categoryId);
    const categoryName =
      category?.name ||
      (typeof machine.category_id === 'object'
        ? (machine.category_id as any)?.name
        : 'CATEGORY');
    const categorySlug = categoryName.toUpperCase().replace(/\s+/g, '-');

    const subcategoryName = machine.subcategory_id
      ? typeof machine.subcategory_id === 'object'
        ? (machine.subcategory_id as any)?.name
        : ''
      : '';
    const subcategorySlug = subcategoryName
      ? subcategoryName.toUpperCase().replace(/\s+/g, '-')
      : '';

    this.sequenceFormatExample = config.format
      .replace('{category}', categorySlug)
      .replace('{subcategory}', subcategorySlug)
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
            (typeof machine.category_id === 'object'
              ? (machine.category_id as any)?.name
              : 'CATEGORY');
          const categorySlug = categoryName.toUpperCase().replace(/\s+/g, '-');

          const subcategoryName = machine.subcategory_id
            ? typeof machine.subcategory_id === 'object'
              ? (machine.subcategory_id as any)?.name
              : ''
            : '';
          const subcategorySlug = subcategoryName
            ? subcategoryName.toUpperCase().replace(/\s+/g, '-')
            : '';

          this.sequenceFormatExample = config.format
            .replace('{category}', categorySlug)
            .replace('{subcategory}', subcategorySlug)
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
    const categoryId =
      typeof machine.category_id === 'object'
        ? (machine.category_id as any)?._id
        : machine.category_id;
    const subcategoryId = machine.subcategory_id
      ? typeof machine.subcategory_id === 'object'
        ? (machine.subcategory_id as any)?._id
        : machine.subcategory_id
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

  // Validate sequence format
  validateSequenceFormat(sequence: string): boolean {
    if (!this.sequenceFormat || !this.editingMachine) return false;

    const categoryId =
      typeof this.editingMachine.category_id === 'object'
        ? (this.editingMachine.category_id as any)?._id
        : this.editingMachine.category_id;

    const category = this.filterCategories.find(c => c._id === categoryId);
    const categorySlug =
      category?.name?.toUpperCase().replace(/\s+/g, '-') || '[A-Z0-9-]+';
    const subcategorySlug = this.editingMachine.subcategory_id
      ? typeof this.editingMachine.subcategory_id === 'object'
        ? (this.editingMachine.subcategory_id as any)?.name
            ?.toUpperCase()
            .replace(/\s+/g, '-')
        : ''
      : '[A-Z0-9-]*';

    // Build regex pattern
    let pattern = this.sequenceFormat
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\\\{category\\\}/g, categorySlug)
      .replace(/\\\{subcategory\\\}/g, subcategorySlug)
      .replace(/\\\{sequence\\\}/g, '\\d+');

    pattern = pattern.replace(/-+/g, '-').replace(/^-|-$/g, '');
    const regex = new RegExp(`^${pattern}$`, 'i');

    return regex.test(sequence);
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
