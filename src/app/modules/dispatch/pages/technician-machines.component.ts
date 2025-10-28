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
import { ApprovalsService } from '../services/approvals.service';

interface MachineRow {
  _id: string;
  name: string;
  category_id?: { name?: string } | string;
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
  createdAt: string;
  approvalStatus?: 'pending' | 'approved' | 'rejected' | null;
  rejectionReason?: string | null;
  approverNotes?: string | null;
  decisionByName?: string | null;
  decisionDate?: string | null;
  created_by?: { username: string };
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
                  >
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
          class="fixed inset-0 z-50 flex items-center justify-center"
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
    `,
  ],
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
  documentsVisible = false;
  selectedMachine: any = null;
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
  // rejection modal state
  rejectVisible = false;
  rejectLoading = false;
  rejectionReason = '';
  approverNotes: string | null = null;
  rejectMachine: any = null;
  rejectMetadata: Array<{ key: string; value: any; type?: string }> = [];

  constructor(
    private baseApi: BaseApiService,
    private auth: AuthService,
    private fb: FormBuilder,
    private permissionService: PermissionService,
    private route: ActivatedRoute,
    private approvals: ApprovalsService,
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
        // annotate rows with latest approval status for clarity
        this.annotateApprovalStatuses(mapped)
          .then(annotated => {
            this.rows = this.sortRows(annotated);
            this.loading = false;
          })
          .catch(() => {
            this.rows = this.sortRows(mapped);
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
        return rows.sort((a, b) => {
          const sa =
            a.approvalStatus || (a.is_approved ? 'approved' : 'pending');
          const sb =
            b.approvalStatus || (b.is_approved ? 'approved' : 'pending');
          const order = { approved: 2, pending: 1, rejected: 0 } as any;
          return (order[sa] ?? -1) - (order[sb] ?? -1);
        });
      case 'created_desc':
      default:
        return rows.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }
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
}
