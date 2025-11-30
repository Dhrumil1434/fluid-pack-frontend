import {
  Component,
  OnDestroy,
  OnInit,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
} from '@angular/forms';
import { ListFiltersComponent } from '../shared/list/list-filters.component';
import { ListTableShellComponent } from '../shared/list/list-table-shell.component';
import { MachineService } from '../../../../core/services/machine.service';
import { Machine } from '../../../../core/models/machine.model';
import { AdminSidebarComponent } from '../shared/admin-sidebar/admin-sidebar.component';
import { TablePaginationComponent } from '../user-management/table-pagination.component';
import { CategoryService } from '../../../../core/services/category.service';
import { environment } from '../../../../../environments/environment';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import {
  SequenceConfig,
  SequenceGenerationRequest,
} from '../../../../core/models/category.model';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { PageHeaderComponent } from '../../../../core/components/page-header/page-header.component';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-machine-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ListFiltersComponent,
    ListTableShellComponent,
    AdminSidebarComponent,
    TablePaginationComponent,
    ToastModule,
    PageHeaderComponent,
  ],
  providers: [MessageService],
  template: `
    <div
      class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100"
    >
      <app-admin-sidebar
        [collapsed]="sidebarCollapsed"
        (collapseChange)="onSidebarCollapseChange($event)"
      ></app-admin-sidebar>

      <div
        class="transition-all duration-300"
        [class.ml-16]="sidebarCollapsed"
        [class.ml-64]="!sidebarCollapsed"
      >
        <!-- Header -->
        <app-page-header
          title="Machine Management"
          [sidebarCollapsed]="sidebarCollapsed"
          (toggleSidebar)="toggleSidebar()"
          [breadcrumbs]="[
            { label: 'Dashboard', route: '/admin/dashboard' },
            { label: 'Machine Management' },
          ]"
        >
          <div headerActions class="flex items-center gap-2">
            <button
              class="px-4 py-2 bg-primary text-white rounded-md font-medium transition-colors duration-150 hover:bg-primary/90 cursor-pointer flex items-center gap-2 shadow-sm"
              (click)="openCreate()"
              title="Add new machine"
            >
              <i class="pi pi-plus text-sm"></i>
              Add Machine
            </button>
          </div>
        </app-page-header>

        <main class="p-6 space-y-4">
          <app-list-filters
            searchLabel="Search machines"
            searchPlaceholder="Name, metadata, created by..."
            (searchChange)="onSearchChange($event)"
            (apply)="reload()"
            (clear)="clearFilters()"
          >
            <div filters-extra class="flex flex-wrap items-end gap-3">
              <select
                class="px-3 py-2 border border-neutral-300 rounded-md"
                [(ngModel)]="filters.is_approved"
                (change)="reload()"
              >
                <option [ngValue]="undefined">All statuses</option>
                <option [ngValue]="true">Approved</option>
                <option [ngValue]="false">Pending</option>
              </select>
              <select
                class="px-3 py-2 border border-neutral-300 rounded-md"
                [(ngModel)]="filters.has_sequence"
                (change)="reload()"
              >
                <option [ngValue]="undefined">All sequences</option>
                <option [ngValue]="true">With sequence</option>
                <option [ngValue]="false">Without sequence</option>
              </select>
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
                (change)="reload()"
              />
              <!-- Dispatch Date To -->
              <input
                type="date"
                class="px-3 py-2 border border-neutral-300 rounded-md"
                placeholder="Dispatch Date To"
                [(ngModel)]="filters.dispatch_date_to"
                (change)="reload()"
              />
              <!-- Sort By -->
              <select
                class="px-3 py-2 border border-neutral-300 rounded-md"
                [(ngModel)]="filters.sortBy"
                (change)="reload()"
              >
                <option [ngValue]="undefined">Sort By</option>
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
                (change)="reload()"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
          </app-list-filters>

          <app-list-table-shell title="Machines">
            <div table-actions class="flex items-center gap-2">
              <button
                class="px-4 py-2 rounded-md font-medium transition-all duration-150 flex items-center gap-2 shadow-sm border flex-shrink-0"
                [ngClass]="{
                  'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 hover:border-primary/30 cursor-pointer':
                    !isGeneratingSequence &&
                    getMachinesWithoutSequence().length > 0,
                  'bg-gray-200 text-gray-600 border-gray-300 cursor-not-allowed hover:bg-gray-200':
                    isGeneratingSequence ||
                    getMachinesWithoutSequence().length === 0,
                }"
                (click)="generateSequencesForSelectedMachines()"
                [disabled]="
                  isGeneratingSequence ||
                  getMachinesWithoutSequence().length === 0
                "
                [title]="
                  getMachinesWithoutSequence().length === 0
                    ? 'No machines without sequences'
                    : isGeneratingSequence
                      ? 'Generating sequences...'
                      : 'Generate sequences for ' +
                        getMachinesWithoutSequence().length +
                        ' machine(s) without sequences'
                "
              >
                <i
                  *ngIf="isGeneratingSequence"
                  class="pi pi-spinner pi-spin text-sm"
                ></i>
                <i *ngIf="!isGeneratingSequence" class="pi pi-cog text-sm"></i>
                <span class="whitespace-nowrap">
                  {{
                    isGeneratingSequence
                      ? 'Generating...'
                      : 'Generate Sequences' +
                        (getMachinesWithoutSequence().length > 0
                          ? ' (' + getMachinesWithoutSequence().length + ')'
                          : '')
                  }}
                </span>
              </button>
            </div>

            <!-- Bulk Generation Progress -->
            <div
              *ngIf="isGeneratingSequence"
              class="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md"
            >
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-medium text-blue-800"
                  >Generating Sequences...</span
                >
                <span class="text-sm text-blue-600"
                  >{{ sequenceGenerationProgress }}%</span
                >
              </div>
              <div class="w-full bg-blue-200 rounded-full h-2">
                <div
                  class="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  [style.width.%]="sequenceGenerationProgress"
                ></div>
              </div>
            </div>

            <!-- Bulk Actions Toolbar -->
            <div
              *ngIf="selectedMachineIds.size > 0"
              class="mb-4 p-4 bg-primary/5 border border-primary/20 rounded-lg flex items-center justify-between shadow-sm"
            >
              <div class="flex items-center gap-3">
                <span class="text-sm font-medium text-primary">
                  {{ selectedMachineIds.size }}
                  {{ selectedMachineIds.size === 1 ? 'machine' : 'machines' }}
                  selected
                </span>
                <button
                  class="text-xs text-gray-600 hover:text-gray-900 underline"
                  (click)="clearSelection()"
                >
                  Clear selection
                </button>
              </div>
              <div class="flex items-center gap-2">
                <button
                  class="px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-md font-medium transition-all duration-150 hover:bg-primary/20 hover:border-primary/30 cursor-pointer flex items-center gap-2 shadow-sm"
                  (click)="bulkGenerateSequences()"
                  [disabled]="
                    isGeneratingSequence ||
                    getSelectedMachinesWithoutSequence().length === 0
                  "
                  [title]="
                    getSelectedMachinesWithoutSequence().length === 0
                      ? 'No selected machines without sequences'
                      : 'Generate sequences for ' +
                        getSelectedMachinesWithoutSequence().length +
                        ' selected machine(s)'
                  "
                >
                  <i
                    *ngIf="isGeneratingSequence"
                    class="pi pi-spinner pi-spin text-sm"
                  ></i>
                  <i
                    *ngIf="!isGeneratingSequence"
                    class="pi pi-cog text-sm"
                  ></i>
                  <span class="whitespace-nowrap">
                    Generate Sequences
                    {{
                      getSelectedMachinesWithoutSequence().length > 0
                        ? ' (' +
                          getSelectedMachinesWithoutSequence().length +
                          ')'
                        : ''
                    }}
                  </span>
                </button>
                <button
                  class="px-4 py-2 bg-error/10 text-error border border-error/20 rounded-md font-medium transition-all duration-150 hover:bg-error/20 hover:border-error/30 cursor-pointer flex items-center gap-2 shadow-sm"
                  (click)="confirmBulkDelete()"
                  title="Delete selected machines"
                >
                  <i class="pi pi-trash text-sm"></i>
                  <span class="whitespace-nowrap"
                    >Delete ({{ selectedMachineIds.size }})</span
                  >
                </button>
              </div>
            </div>

            <table class="min-w-full text-sm">
              <thead>
                <tr class="bg-gray-50 text-left border-b border-gray-200">
                  <th class="px-4 py-3 w-12">
                    <input
                      type="checkbox"
                      class="w-4 h-4 text-primary border-gray-300 rounded cursor-pointer focus:ring-primary focus:ring-2"
                      [checked]="isAllSelected"
                      [indeterminate]="isIndeterminate"
                      (change)="toggleSelectAll($event)"
                      title="Select all machines"
                    />
                  </th>
                  <th
                    class="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider"
                  >
                    Sequence
                  </th>
                  <th
                    class="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider"
                  >
                    Name
                  </th>
                  <th
                    class="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider"
                  >
                    Category
                  </th>
                  <th
                    class="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider"
                  >
                    Subcategory
                  </th>
                  <th
                    class="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider"
                  >
                    Party
                  </th>
                  <th
                    class="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider"
                  >
                    Location
                  </th>
                  <th
                    class="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider"
                  >
                    Mobile
                  </th>
                  <th
                    class="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider"
                  >
                    Dispatch Date
                  </th>
                  <th
                    class="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider"
                  >
                    Created By
                  </th>
                  <th
                    class="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider"
                  >
                    Docs
                  </th>
                  <th
                    class="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider"
                  >
                    Approved
                  </th>
                  <th
                    class="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider w-40"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr
                  *ngFor="let m of machines"
                  [attr.data-machine-id]="m._id"
                  class="hover:bg-gray-50 transition-colors duration-150"
                  [ngClass]="{
                    'bg-primary/5': selectedMachineIds.has(m._id),
                  }"
                >
                  <td class="px-4 py-3 whitespace-nowrap">
                    <input
                      type="checkbox"
                      class="w-4 h-4 text-primary border-gray-300 rounded cursor-pointer focus:ring-primary focus:ring-2"
                      [checked]="selectedMachineIds.has(m._id)"
                      (change)="toggleMachineSelection(m._id, $event)"
                      (click)="$event.stopPropagation()"
                      title="Select this machine"
                    />
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap">
                    <div class="flex items-center">
                      <!-- Sequence Display with Hover Remove -->
                      <div
                        *ngIf="m.machine_sequence"
                        class="group relative inline-flex items-center font-mono text-sm font-semibold bg-primary/10 text-primary px-3 py-1.5 pr-8 rounded-md border border-primary/20 cursor-pointer hover:bg-primary/20 hover:border-primary/30 transition-all duration-150 shadow-sm"
                        [title]="
                          'Sequence: ' + m.machine_sequence + ' (Click to edit)'
                        "
                        (click)="openEditSequenceModal(m)"
                      >
                        {{ m.machine_sequence }}
                        <button
                          class="absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-error/20 text-error opacity-0 group-hover:opacity-100 transition-opacity duration-150 hover:bg-error/30 cursor-pointer"
                          (click)="
                            removeSequenceFromMachine(m);
                            $event.stopPropagation()
                          "
                          title="Remove sequence"
                        >
                          <i class="pi pi-times text-xs"></i>
                        </button>
                      </div>
                      <!-- Generate Button (Icon Only) -->
                      <button
                        *ngIf="!m.machine_sequence"
                        class="inline-flex items-center justify-center w-8 h-8 text-info bg-info/10 border border-info/20 rounded-md hover:bg-info/20 hover:border-info/30 transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                        (click)="generateSequenceForMachine(m)"
                        title="Generate Sequence for this machine"
                        [disabled]="isGeneratingSequence"
                      >
                        <i
                          class="pi pi-cog text-sm"
                          [class.pi-spin]="isGeneratingSequence"
                        ></i>
                      </button>
                    </div>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">
                      {{ m.name }}
                    </div>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap">
                    <div class="text-sm text-gray-900">
                      {{ m.category_id.name }}
                    </div>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap">
                    <span
                      *ngIf="m.subcategory_id"
                      class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800"
                    >
                      {{ getSubcategoryDisplayName(m.subcategory_id) }}
                    </span>
                    <span
                      *ngIf="!m.subcategory_id"
                      class="text-gray-400 text-sm"
                      >-</span
                    >
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap">
                    <div class="text-sm text-gray-900">
                      {{ m.party_name || '-' }}
                    </div>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap">
                    <div class="text-sm text-gray-900">
                      {{ m.location || '-' }}
                    </div>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap">
                    <div class="text-sm text-gray-900">
                      {{ m.mobile_number || '-' }}
                    </div>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap">
                    <div class="text-sm text-gray-900">
                      {{
                        m.dispatch_date
                          ? (m.dispatch_date | date: 'dd-MM-yyyy')
                          : '-'
                      }}
                    </div>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap">
                    <div class="text-sm text-gray-900">
                      {{ m.created_by.username }}
                    </div>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap text-center">
                    <span
                      class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                    >
                      {{ m.documents.length || 0 }}
                    </span>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap">
                    <span
                      class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                      [ngClass]="{
                        'bg-success/20 text-success': m.is_approved,
                        'bg-warning/20 text-warning': !m.is_approved,
                      }"
                    >
                      {{ m.is_approved ? 'Yes' : 'No' }}
                    </span>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap">
                    <div class="flex items-center gap-2">
                      <button
                        class="inline-flex items-center px-3 py-1.5 text-xs font-medium text-info bg-info/10 border border-info/20 rounded-md hover:bg-info/20 hover:border-info/30 transition-all duration-150 cursor-pointer shadow-sm"
                        (click)="openView(m)"
                        title="View machine details"
                      >
                        <i class="pi pi-eye text-xs mr-1"></i>
                        View
                      </button>
                      <button
                        class="inline-flex items-center px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 border border-primary/20 rounded-md hover:bg-primary/20 hover:border-primary/30 transition-all duration-150 cursor-pointer shadow-sm"
                        (click)="openEdit(m)"
                        title="Edit machine"
                      >
                        <i class="pi pi-pencil text-xs mr-1"></i>
                        Edit
                      </button>
                      <button
                        class="inline-flex items-center px-3 py-1.5 text-xs font-medium text-error bg-error/10 border border-error/20 rounded-md hover:bg-error/20 hover:border-error/30 transition-all duration-150 cursor-pointer shadow-sm"
                        (click)="confirmDelete(m)"
                        title="Delete machine"
                      >
                        <i class="pi pi-trash text-xs mr-1"></i>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
                <tr *ngIf="machines.length === 0">
                  <td colspan="13" class="px-4 py-12 text-center text-gray-500">
                    <div class="flex flex-col items-center justify-center">
                      <i class="pi pi-inbox text-4xl text-gray-300 mb-2"></i>
                      <p class="text-sm font-medium">No machines found</p>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
            <div table-footer class="w-full">
              <app-table-pagination
                [page]="page"
                [pages]="pages"
                [total]="total"
                [limit]="limit"
                (pageChange)="onPageChange($event)"
                (limitChange)="onLimitChange($event)"
              ></app-table-pagination>
            </div>
          </app-list-table-shell>

          <!-- Create / Edit Modal (consistent styling) -->
          <div
            *ngIf="formVisible"
            class="fixed inset-0 z-50 flex items-center justify-center"
          >
            <div
              class="absolute inset-0 bg-black/40"
              (click)="closeForm()"
              role="button"
              tabindex="0"
              (keydown.enter)="closeForm()"
              (keydown.space)="closeForm()"
            ></div>
            <div
              class="relative bg-bg border border-neutral-300 rounded-xl shadow-medium w-full max-w-4xl max-h-[90vh] flex flex-col"
            >
              <div
                class="flex items-center justify-between p-4 border-b border-neutral-200 flex-shrink-0"
              >
                <h3 class="text-lg font-semibold text-text">
                  {{ editing ? 'Edit Machine' : 'Add Machine' }}
                </h3>
                <button
                  class="p-2 text-text-muted hover:bg-neutral-100 rounded-md"
                  (click)="closeForm()"
                >
                  <i class="pi pi-times"></i>
                </button>
              </div>
              <div class="flex-1 overflow-y-auto">
                <form
                  [formGroup]="form"
                  class="p-4 space-y-4"
                  (ngSubmit)="submitForm()"
                >
                  <div *ngIf="formLoading">
                    <div
                      class="flex items-center gap-2 text-text-muted text-sm"
                    >
                      <i class="pi pi-spinner pi-spin"></i>
                      Loading machine details...
                    </div>
                  </div>

                  <div class="space-y-1">
                    <label class="text-sm">Name</label>
                    <input
                      type="text"
                      class="w-full border rounded px-3 py-2"
                      [class.border-red-500]="
                        form.controls['name'].touched &&
                        form.controls['name'].invalid
                      "
                      formControlName="name"
                      placeholder="Enter machine name"
                      (blur)="form.controls['name'].markAsTouched()"
                      (input)="form.controls['name'].markAsTouched()"
                    />
                    <div
                      class="text-xs text-error"
                      *ngIf="
                        form.controls['name'].touched &&
                        form.controls['name'].invalid
                      "
                    >
                      <span *ngIf="form.controls['name'].errors?.['required']">
                        Machine name is required
                      </span>
                      <span *ngIf="form.controls['name'].errors?.['minlength']">
                        Machine name must be at least 2 characters long
                      </span>
                      <span *ngIf="form.controls['name'].errors?.['maxlength']">
                        Machine name cannot exceed 100 characters
                      </span>
                      <span *ngIf="form.controls['name'].errors?.['pattern']">
                        Machine name can only contain letters, numbers, spaces,
                        and common punctuation
                      </span>
                    </div>
                  </div>

                  <div class="space-y-1">
                    <label class="text-sm">Category</label>
                    <select
                      class="w-full border rounded px-3 py-2"
                      [class.border-red-500]="
                        form.controls['category_id'].touched &&
                        form.controls['category_id'].invalid
                      "
                      formControlName="category_id"
                      (change)="onCategoryChange()"
                      (blur)="form.controls['category_id'].markAsTouched()"
                    >
                      <option value="" disabled>Select category</option>
                      <option *ngFor="let c of categories" [value]="c._id">
                        {{ c.name }}
                      </option>
                    </select>
                    <div
                      class="text-xs text-error"
                      *ngIf="
                        form.controls['category_id'].touched &&
                        form.controls['category_id'].invalid
                      "
                    >
                      <span
                        *ngIf="
                          form.controls['category_id'].errors?.['required']
                        "
                      >
                        Category ID is required
                      </span>
                      <span
                        *ngIf="form.controls['category_id'].errors?.['pattern']"
                      >
                        Invalid category ID format
                      </span>
                    </div>
                  </div>

                  <div class="space-y-1" *ngIf="subcategories.length > 0">
                    <label class="text-sm">Subcategory (Optional)</label>
                    <select
                      class="w-full border rounded px-3 py-2"
                      [class.border-red-500]="
                        form.controls['subcategory_id'].touched &&
                        form.controls['subcategory_id'].invalid &&
                        form.controls['subcategory_id'].value
                      "
                      formControlName="subcategory_id"
                      (change)="onSubcategoryChange()"
                      (blur)="form.controls['subcategory_id'].markAsTouched()"
                    >
                      <option value="">No subcategory</option>
                      <option *ngFor="let sc of subcategories" [value]="sc._id">
                        {{ sc.name }}
                      </option>
                    </select>
                    <div
                      class="text-xs text-error"
                      *ngIf="
                        form.controls['subcategory_id'].touched &&
                        form.controls['subcategory_id'].invalid &&
                        form.controls['subcategory_id'].value
                      "
                    >
                      <span
                        *ngIf="
                          form.controls['subcategory_id'].errors?.['pattern']
                        "
                      >
                        Invalid subcategory ID format
                      </span>
                    </div>
                  </div>

                  <div class="space-y-1">
                    <div class="flex items-center justify-between">
                      <label class="text-sm">Machine Sequence</label>
                      <button
                        type="button"
                        class="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        (click)="openSequenceGenerator()"
                        [disabled]="
                          !form.get('category_id')?.value ||
                          isGeneratingSequence
                        "
                      >
                        <i
                          *ngIf="isGeneratingSequence"
                          class="pi pi-spinner pi-spin mr-1"
                        ></i>
                        <i
                          *ngIf="!isGeneratingSequence"
                          class="pi pi-cog mr-1"
                        ></i>
                        {{
                          isGeneratingSequence ? 'Generating...' : 'Generate'
                        }}
                      </button>
                    </div>
                    <input
                      type="text"
                      class="w-full border rounded px-3 py-2"
                      formControlName="machine_sequence"
                      placeholder="Machine sequence will be generated automatically"
                      readonly
                    />
                    <div class="text-xs text-gray-500">
                      <span
                        *ngIf="
                          form.get('category_id')?.value &&
                          hasSequenceConfig(form.get('category_id')?.value)
                        "
                      >
                        ✓ Sequence configuration available for this category
                      </span>
                      <span
                        *ngIf="
                          form.get('category_id')?.value &&
                          !hasSequenceConfig(form.get('category_id')?.value)
                        "
                      >
                        ⚠ No sequence configuration found for this category
                      </span>
                    </div>
                  </div>

                  <div class="space-y-1">
                    <label class="text-sm">Party Name</label>
                    <input
                      type="text"
                      class="w-full border rounded px-3 py-2"
                      [class.border-red-500]="
                        form.controls['party_name'].touched &&
                        form.controls['party_name'].invalid
                      "
                      formControlName="party_name"
                      placeholder="Enter party/company name"
                      (blur)="form.controls['party_name'].markAsTouched()"
                      (input)="form.controls['party_name'].markAsTouched()"
                    />
                    <div
                      class="text-xs text-error"
                      *ngIf="
                        form.controls['party_name'].touched &&
                        form.controls['party_name'].invalid
                      "
                    >
                      <span
                        *ngIf="form.controls['party_name'].errors?.['required']"
                      >
                        Party name is required
                      </span>
                      <span
                        *ngIf="
                          form.controls['party_name'].errors?.['minlength']
                        "
                      >
                        Party name must be at least 2 characters long
                      </span>
                      <span
                        *ngIf="
                          form.controls['party_name'].errors?.['maxlength']
                        "
                      >
                        Party name cannot exceed 100 characters
                      </span>
                      <span
                        *ngIf="form.controls['party_name'].errors?.['pattern']"
                      >
                        Party name can only contain letters, numbers, spaces,
                        and common punctuation
                      </span>
                    </div>
                  </div>

                  <div class="space-y-1">
                    <label class="text-sm">Location</label>
                    <input
                      type="text"
                      class="w-full border rounded px-3 py-2"
                      [class.border-red-500]="
                        form.controls['location'].touched &&
                        form.controls['location'].invalid
                      "
                      formControlName="location"
                      placeholder="Enter city-country or location"
                      (blur)="form.controls['location'].markAsTouched()"
                      (input)="form.controls['location'].markAsTouched()"
                    />
                    <div
                      class="text-xs text-error"
                      *ngIf="
                        form.controls['location'].touched &&
                        form.controls['location'].invalid
                      "
                    >
                      <span
                        *ngIf="form.controls['location'].errors?.['required']"
                      >
                        Location is required
                      </span>
                      <span
                        *ngIf="form.controls['location'].errors?.['minlength']"
                      >
                        Location must be at least 2 characters long
                      </span>
                      <span
                        *ngIf="form.controls['location'].errors?.['maxlength']"
                      >
                        Location cannot exceed 100 characters
                      </span>
                    </div>
                  </div>

                  <div class="space-y-1">
                    <label class="text-sm">Mobile Number</label>
                    <input
                      type="tel"
                      class="w-full border rounded px-3 py-2"
                      [class.border-red-500]="
                        form.controls['mobile_number'].touched &&
                        form.controls['mobile_number'].invalid
                      "
                      formControlName="mobile_number"
                      placeholder="Enter mobile number"
                      (blur)="form.controls['mobile_number'].markAsTouched()"
                      (input)="form.controls['mobile_number'].markAsTouched()"
                    />
                    <div
                      class="text-xs text-error"
                      *ngIf="
                        form.controls['mobile_number'].touched &&
                        form.controls['mobile_number'].invalid
                      "
                    >
                      <span
                        *ngIf="
                          form.controls['mobile_number'].errors?.['required']
                        "
                      >
                        Mobile number is required
                      </span>
                      <span
                        *ngIf="
                          form.controls['mobile_number'].errors?.['minlength']
                        "
                      >
                        Mobile number must be at least 10 characters long
                      </span>
                      <span
                        *ngIf="
                          form.controls['mobile_number'].errors?.['maxlength']
                        "
                      >
                        Mobile number cannot exceed 20 characters
                      </span>
                      <span
                        *ngIf="
                          form.controls['mobile_number'].errors?.['pattern']
                        "
                      >
                        Mobile number can only contain numbers, spaces, hyphens,
                        parentheses, and optional + prefix
                      </span>
                    </div>
                  </div>

                  <div class="space-y-1">
                    <label class="text-sm">Dispatch Date</label>
                    <input
                      type="date"
                      class="w-full border rounded px-3 py-2"
                      [class.border-red-500]="
                        form.controls['dispatch_date'].touched &&
                        form.controls['dispatch_date'].invalid
                      "
                      formControlName="dispatch_date"
                      (blur)="form.controls['dispatch_date'].markAsTouched()"
                    />
                    <div
                      class="text-xs text-error"
                      *ngIf="
                        form.controls['dispatch_date'].touched &&
                        form.controls['dispatch_date'].invalid
                      "
                    >
                      <span
                        *ngIf="form.controls['dispatch_date'].errors?.['date']"
                      >
                        Please enter a valid date
                      </span>
                    </div>
                  </div>
                  <!-- Metadata section -->
                  <div class="space-y-2">
                    <div class="flex items-center justify-between">
                      <label class="text-sm">Additional Fields</label>
                      <button
                        type="button"
                        class="px-2 py-1 text-sm border rounded hover:bg-neutral-50"
                        (click)="addMetadataRow()"
                      >
                        Add Field
                      </button>
                    </div>
                    <div class="space-y-2">
                      <div
                        class="grid grid-cols-5 gap-2"
                        *ngFor="
                          let m of metadataEntries;
                          let i = index;
                          trackBy: trackByIndex
                        "
                      >
                        <input
                          class="col-span-2 border rounded px-2 py-1 text-sm"
                          placeholder="Key"
                          [(ngModel)]="metadataEntries[i].key"
                          [ngModelOptions]="{ standalone: true }"
                          name="meta_key_{{ i }}"
                        />
                        <input
                          class="col-span-3 border rounded px-2 py-1 text-sm"
                          placeholder="Value"
                          [(ngModel)]="metadataEntries[i].value"
                          [ngModelOptions]="{ standalone: true }"
                          name="meta_val_{{ i }}"
                        />
                        <div class="col-span-5 flex justify-end">
                          <button
                            type="button"
                            class="px-2 py-1 text-xs border rounded hover:bg-neutral-50"
                            (click)="removeMetadataRow(i)"
                            *ngIf="metadataEntries.length > 1"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <!-- Images section -->
                  <div class="space-y-2">
                    <label class="text-sm">Images</label>
                    <input
                      #fileInput
                      type="file"
                      multiple
                      accept="image/*"
                      class="hidden"
                      (change)="onFiles($event)"
                    />
                    <div
                      class="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer select-none transition-colors"
                      [ngClass]="{
                        'border-primary': isDragging,
                        'bg-primary/5': isDragging,
                      }"
                      (click)="fileInput.click()"
                      (dragover)="onDragOver($event)"
                      (dragleave)="onDragLeave($event)"
                      (drop)="onDrop($event)"
                    >
                      <div class="flex flex-col items-center gap-1">
                        <i class="pi pi-image text-2xl text-neutral-500"></i>
                        <div class="text-sm">
                          <span class="text-primary font-medium"
                            >Click to upload</span
                          >
                          or drag and drop
                        </div>
                        <div class="text-xs text-neutral-500">
                          PNG, JPG, GIF up to 5 files
                        </div>
                      </div>
                    </div>
                    <div
                      class="text-xs text-text-muted"
                      *ngIf="previewImages.length > 0"
                    >
                      {{ previewImages.length }} image(s) selected (max 5)
                    </div>
                    <div
                      class="grid grid-cols-5 gap-2 mt-2"
                      *ngIf="previewImages.length > 0"
                    >
                      <div
                        class="relative group"
                        *ngFor="let img of previewImages; let i = index"
                      >
                        <img
                          [src]="img"
                          class="w-full h-16 object-cover rounded border"
                        />
                        <button
                          type="button"
                          class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          (click)="removeFile(i)"
                        >
                          <i class="pi pi-times text-xs"></i>
                        </button>
                      </div>
                    </div>

                    <!-- Existing Images (Edit Mode) -->
                    <div
                      *ngIf="editing && existingImages.length > 0"
                      class="mt-4"
                    >
                      <div class="flex items-center justify-between mb-2">
                        <label class="text-sm font-medium"
                          >Existing Images</label
                        >
                        <span class="text-xs text-text-muted"
                          >{{ existingImages.length }} image(s)</span
                        >
                      </div>
                      <div class="grid grid-cols-5 gap-2">
                        <div
                          class="relative group"
                          *ngFor="let img of existingImages; let i = index"
                        >
                          <img
                            [src]="imageUrl(img)"
                            class="w-full h-16 object-cover rounded border"
                            (click)="openPreview(existingImages, i)"
                          />
                          <button
                            type="button"
                            class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            (click)="removeExistingImage(i)"
                          >
                            <i class="pi pi-times text-xs"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <!-- Documents section -->
                  <div class="space-y-2">
                    <label class="text-sm">Documents</label>
                    <input
                      #documentInput
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar"
                      class="hidden"
                      (change)="onDocumentsSelected($event)"
                    />
                    <div
                      class="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer select-none transition-colors"
                      [ngClass]="{
                        'border-primary': isDocumentDragging,
                        'bg-primary/5': isDocumentDragging,
                      }"
                      (click)="openDocumentPicker()"
                      (dragover)="onDocumentDragOver($event)"
                      (dragleave)="onDocumentDragLeave($event)"
                      (drop)="onDocumentDrop($event)"
                    >
                      <div class="flex flex-col items-center gap-1">
                        <i class="pi pi-file text-2xl text-neutral-500"></i>
                        <div class="text-sm">
                          <span class="text-primary font-medium"
                            >Click to upload</span
                          >
                          or drag and drop
                        </div>
                        <div class="text-xs text-neutral-500">
                          PDF, DOC, DOCX, XLS, XLSX, TXT, ZIP, RAR up to 10
                          files
                        </div>
                      </div>
                    </div>
                    <div
                      class="text-xs text-text-muted"
                      *ngIf="selectedDocuments.length > 0"
                    >
                      {{ selectedDocuments.length }} document(s) selected (max
                      10)
                    </div>
                    <div
                      class="space-y-2 mt-2"
                      *ngIf="selectedDocuments.length > 0"
                    >
                      <div
                        class="flex items-center justify-between p-2 bg-neutral-50 rounded border"
                        *ngFor="let doc of selectedDocuments; let i = index"
                      >
                        <div class="flex items-center gap-2">
                          <i class="pi pi-file text-neutral-500"></i>
                          <span class="text-sm">{{ doc.name }}</span>
                          <span class="text-xs text-neutral-500"
                            >({{ doc.size | number }} bytes)</span
                          >
                        </div>
                        <button
                          type="button"
                          class="p-1 text-red-500 hover:bg-red-50 rounded"
                          (click)="removeDocument(i)"
                        >
                          <i class="pi pi-times text-xs"></i>
                        </button>
                      </div>
                    </div>
                  </div>

                  <!-- Existing Documents (Edit Mode) -->
                  <div
                    *ngIf="editing && existingDocuments.length > 0"
                    class="mt-4"
                  >
                    <div class="flex items-center justify-between mb-2">
                      <label class="text-sm font-medium"
                        >Existing Documents</label
                      >
                      <span class="text-xs text-text-muted"
                        >{{ existingDocuments.length }} document(s)</span
                      >
                    </div>
                    <div class="space-y-2">
                      <div
                        class="flex items-center justify-between p-2 bg-neutral-50 rounded border"
                        *ngFor="let doc of existingDocuments; let i = index"
                      >
                        <div class="flex items-center gap-2">
                          <i class="pi pi-file text-neutral-500"></i>
                          <span class="text-sm">{{ doc.name }}</span>
                          <span class="text-xs text-neutral-500">{{
                            doc.document_type || 'Document'
                          }}</span>
                        </div>
                        <div class="flex items-center gap-1">
                          <button
                            type="button"
                            class="p-1 text-blue-500 hover:bg-blue-50 rounded"
                            (click)="downloadDocument(doc)"
                            title="Download"
                          >
                            <i class="pi pi-download text-xs"></i>
                          </button>
                          <button
                            type="button"
                            class="p-1 text-green-500 hover:bg-green-50 rounded"
                            (click)="previewDocument(doc)"
                            title="Preview"
                          >
                            <i class="pi pi-eye text-xs"></i>
                          </button>
                          <button
                            type="button"
                            class="p-1 text-red-500 hover:bg-red-50 rounded"
                            (click)="removeExistingDocument(i)"
                            title="Remove"
                          >
                            <i class="pi pi-times text-xs"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div *ngIf="editing" class="space-y-1">
                    <label class="inline-flex items-center gap-2 text-sm">
                      <input type="checkbox" formControlName="is_approved" />
                      <span>Approved</span>
                    </label>
                  </div>
                </form>
              </div>
              <div
                class="flex items-center justify-end gap-2 p-4 border-t border-neutral-200 flex-shrink-0"
              >
                <button
                  type="button"
                  class="px-3 py-2 rounded-md border border-neutral-300 text-text hover:bg-neutral-50"
                  (click)="closeForm()"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  class="px-3 py-2 rounded-md bg-primary text-white hover:bg-primary-light disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2 transition-colors"
                  [disabled]="form.invalid || submitting"
                  [title]="
                    form.invalid
                      ? 'Please fix validation errors before submitting'
                      : ''
                  "
                  (click)="submitForm()"
                >
                  <i *ngIf="submitting" class="pi pi-spinner pi-spin"></i>
                  <i *ngIf="!submitting" class="pi pi-save"></i>
                  <span>{{ editing ? 'Save Changes' : 'Create' }}</span>
                </button>
              </div>
            </div>
          </div>

          <!-- View Modal (consistent styling) -->
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
              class="relative bg-bg border border-neutral-300 rounded-xl shadow-medium w-full max-w-4xl max-h-[90vh] flex flex-col"
            >
              <div
                class="flex items-center justify-between p-4 border-b border-neutral-200 flex-shrink-0"
              >
                <h3 class="text-lg font-semibold text-text">Machine Details</h3>
                <button
                  class="p-2 text-text-muted hover:bg-neutral-100 rounded-md"
                  (click)="viewVisible = false"
                >
                  <i class="pi pi-times"></i>
                </button>
              </div>
              <div class="flex-1 overflow-y-auto p-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div class="md:col-span-2">
                    <span class="block text-xs text-text-muted mb-1">Name</span>
                    {{ selected?.name }}
                  </div>
                  <div class="md:col-span-1">
                    <span class="block text-xs text-text-muted mb-1"
                      >Party Name</span
                    >
                    {{ selected?.party_name || '-' }}
                  </div>
                  <div class="md:col-span-1">
                    <span class="block text-xs text-text-muted mb-1"
                      >Location</span
                    >
                    {{ selected?.location || '-' }}
                  </div>
                  <div class="md:col-span-1">
                    <span class="block text-xs text-text-muted mb-1"
                      >Mobile Number</span
                    >
                    {{ selected?.mobile_number || '-' }}
                  </div>
                  <div class="md:col-span-1">
                    <span class="block text-xs text-text-muted mb-1"
                      >Dispatch Date</span
                    >
                    {{
                      selected?.dispatch_date
                        ? (selected?.dispatch_date | date: 'dd-MM-yyyy')
                        : '-'
                    }}
                  </div>
                  <div class="md:col-span-1">
                    <span class="block text-xs text-text-muted mb-1"
                      >Category</span
                    >
                    {{ selected?.category_id?.name || selected?.category_id }}
                  </div>
                  <div class="md:col-span-1">
                    <span class="block text-xs text-text-muted mb-1"
                      >Subcategory</span
                    >
                    <span *ngIf="selected?.subcategory_id" class="text-sm">
                      {{
                        selected && selected.subcategory_id
                          ? getSubcategoryDisplayName(selected.subcategory_id)
                          : '-'
                      }}
                    </span>
                    <span
                      *ngIf="!selected?.subcategory_id"
                      class="text-gray-400 text-sm"
                      >-</span
                    >
                  </div>
                  <div class="md:col-span-1">
                    <span class="block text-xs text-text-muted mb-1"
                      >Machine Sequence</span
                    >
                    <span
                      *ngIf="selected?.machine_sequence"
                      class="font-mono text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded"
                    >
                      {{ selected?.machine_sequence }}
                    </span>
                    <span
                      *ngIf="!selected?.machine_sequence"
                      class="text-gray-400"
                      >-</span
                    >
                  </div>
                  <div class="md:col-span-1">
                    <span class="block text-xs text-text-muted mb-1"
                      >Approved</span
                    >
                    {{ selected?.is_approved ? 'Yes' : 'No' }}
                  </div>
                  <div class="md:col-span-1">
                    <span class="block text-xs text-text-muted mb-1"
                      >Created By</span
                    >
                    {{ selected?.created_by?.username }} ({{
                      selected?.created_by?.email
                    }})
                  </div>
                  <div class="md:col-span-1">
                    <span class="block text-xs text-text-muted mb-1"
                      >Updated By</span
                    >
                    {{ selected?.updatedBy?.username || '—' }}
                  </div>
                  <div class="md:col-span-1">
                    <span class="block text-xs text-text-muted mb-1"
                      >Created</span
                    >
                    {{ selected?.createdAt | date: 'medium' }}
                  </div>
                  <div class="md:col-span-1">
                    <span class="block text-xs text-text-muted mb-1"
                      >Updated</span
                    >
                    {{ selected?.updatedAt | date: 'medium' }}
                  </div>
                  <div class="md:col-span-2">
                    <span class="block text-xs text-text-muted mb-1"
                      >Images</span
                    >
                    <div
                      class="mt-1 flex gap-2 flex-wrap"
                      *ngIf="selected?.images?.length; else noimg"
                    >
                      <img
                        *ngFor="
                          let img of selected?.images;
                          let i = index;
                          trackBy: trackByIndex
                        "
                        [src]="imageUrl(img)"
                        class="w-16 h-16 object-cover rounded border cursor-pointer"
                        (click)="openPreview(selected?.images || [], i)"
                      />
                    </div>
                    <ng-template #noimg>
                      <span class="text-xs text-text-muted">No images</span>
                    </ng-template>
                  </div>
                  <div class="md:col-span-2">
                    <div class="flex items-center justify-between mb-1">
                      <span class="block text-xs text-text-muted"
                        >Documents</span
                      >
                      <button
                        *ngIf="selected?.documents?.length"
                        class="px-3 py-1 text-sm bg-primary text-white rounded-md hover:bg-primary-light transition-colors"
                        (click)="openDocumentsModal()"
                      >
                        <i class="pi pi-file mr-1"></i>
                        View All Documents ({{
                          selected?.documents?.length || 0
                        }})
                      </button>
                    </div>
                    <div
                      class="mt-1 flex gap-2 flex-wrap"
                      *ngIf="selected?.documents?.length; else nodocs"
                    >
                      <div
                        *ngFor="
                          let doc of selected?.documents | slice: 0 : 3;
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
                        *ngIf="(selected?.documents?.length || 0) > 3"
                        class="flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-md border border-primary/20 text-sm text-primary font-medium"
                      >
                        <i class="pi pi-plus"></i>
                        <span
                          >+{{
                            (selected?.documents?.length || 0) - 3
                          }}
                          more</span
                        >
                      </div>
                    </div>
                    <ng-template #nodocs>
                      <div
                        class="flex items-center gap-2 text-sm text-text-muted"
                      >
                        <i class="pi pi-file"></i>
                        <span>No documents attached</span>
                      </div>
                    </ng-template>
                  </div>
                  <div class="md:col-span-2" *ngIf="selected?.metadata">
                    <span class="block text-xs text-text-muted mb-1"
                      >Metadata</span
                    >
                    <div class="border rounded divide-y">
                      <div
                        class="p-2 grid grid-cols-5 gap-2"
                        *ngFor="
                          let kv of selected?.metadata | keyvalue;
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
                  class="px-3 py-2 rounded-md border border-neutral-300 text-text hover:bg-neutral-50"
                  (click)="viewVisible = false"
                >
                  Close
                </button>
              </div>
            </div>
          </div>

          <!-- Lightbox Modal -->
          <div
            class="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
            *ngIf="lightboxImages?.length"
          >
            <div class="relative w-full max-w-4xl mx-4">
              <button
                class="absolute -top-10 right-0 text-white p-2"
                (click)="closeLightbox()"
              >
                <i class="pi pi-times text-2xl"></i>
              </button>
              <div class="bg-black rounded-lg overflow-hidden">
                <div
                  class="relative flex items-center justify-center"
                  style="min-height: 300px;"
                >
                  <button
                    class="absolute left-2 text-white bg-black/40 rounded-full p-2"
                    (click)="lightboxPrev()"
                  >
                    <i class="pi pi-chevron-left"></i>
                  </button>
                  <img
                    [src]="imageUrl(lightboxImages[lightboxIndex])"
                    class="max-h-[70vh] w-auto object-contain"
                  />
                  <button
                    class="absolute right-2 text-white bg-black/40 rounded-full p-2"
                    (click)="lightboxNext()"
                  >
                    <i class="pi pi-chevron-right"></i>
                  </button>
                </div>
                <div class="p-2 bg-neutral-900 flex gap-2 overflow-x-auto">
                  <img
                    *ngFor="let p of lightboxImages; let i = index"
                    [src]="imageUrl(p)"
                    class="w-14 h-14 object-cover rounded border cursor-pointer"
                    [class.border-primary]="i === lightboxIndex"
                    (click)="lightboxGo(i)"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Delete Confirmation Modal (consistent styling) -->
          <div
            *ngIf="confirmVisible"
            class="fixed inset-0 z-50 flex items-center justify-center"
          >
            <div
              class="absolute inset-0 bg-black/40"
              (click)="confirmVisible = false"
              role="button"
              tabindex="0"
              (keydown.enter)="confirmVisible = false"
              (keydown.space)="confirmVisible = false"
            ></div>
            <div
              class="relative bg-bg border border-neutral-300 rounded-xl shadow-medium w-full max-w-md p-5"
            >
              <div class="flex items-center justify-between mb-3">
                <h3 class="text-lg font-semibold text-text">Delete Machine</h3>
                <button
                  class="p-2 text-text-muted hover:bg-neutral-100 rounded-md"
                  (click)="confirmVisible = false"
                >
                  <i class="pi pi-times"></i>
                </button>
              </div>
              <div class="text-text">
                Are you sure you want to delete "{{ selected?.name }}"?
              </div>
              <div class="flex items-center justify-end gap-2 mt-4">
                <button
                  class="px-3 py-2 rounded-md border border-neutral-300 text-text hover:bg-neutral-50"
                  (click)="confirmVisible = false"
                >
                  Cancel
                </button>
                <button
                  class="px-3 py-2 rounded-md border border-error text-error hover:bg-error/10"
                  (click)="doDelete()"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>

          <!-- Bulk Generate Sequences Confirmation Modal -->
          <div
            *ngIf="bulkGenerateConfirmVisible"
            class="fixed inset-0 z-50 flex items-center justify-center"
          >
            <div
              class="absolute inset-0 bg-black/40"
              (click)="bulkGenerateConfirmVisible = false"
              role="button"
              tabindex="0"
              (keydown.enter)="bulkGenerateConfirmVisible = false"
              (keydown.space)="bulkGenerateConfirmVisible = false"
            ></div>
            <div
              class="relative bg-bg border border-neutral-300 rounded-xl shadow-medium w-full max-w-md p-5"
            >
              <div class="flex items-center justify-between mb-3">
                <h3 class="text-lg font-semibold text-text">
                  Generate Sequences
                </h3>
                <button
                  class="p-2 text-text-muted hover:bg-neutral-100 rounded-md"
                  (click)="bulkGenerateConfirmVisible = false"
                >
                  <i class="pi pi-times"></i>
                </button>
              </div>
              <div class="text-text">
                Generate sequences for
                {{ pendingBulkGenerateMachines.length }} machine(s) without
                sequences?
              </div>
              <div class="flex items-center justify-end gap-2 mt-4">
                <button
                  class="px-3 py-2 rounded-md border border-neutral-300 text-text hover:bg-neutral-50"
                  (click)="bulkGenerateConfirmVisible = false"
                >
                  Cancel
                </button>
                <button
                  class="px-4 py-2 rounded-md bg-primary text-white hover:bg-primary/90 transition-colors cursor-pointer flex items-center gap-2"
                  (click)="
                    pendingBulkGenerateMachines.length ===
                    getSelectedMachinesWithoutSequence().length
                      ? doBulkGenerateSequences()
                      : doBulkGenerateSequencesForAll()
                  "
                >
                  <i class="pi pi-cog text-sm"></i>
                  Generate Sequences
                </button>
              </div>
            </div>
          </div>

          <!-- Bulk Delete Confirmation Modal -->
          <div
            *ngIf="bulkDeleteConfirmVisible"
            class="fixed inset-0 z-50 flex items-center justify-center"
          >
            <div
              class="absolute inset-0 bg-black/40"
              (click)="bulkDeleteConfirmVisible = false"
              role="button"
              tabindex="0"
              (keydown.enter)="bulkDeleteConfirmVisible = false"
              (keydown.space)="bulkDeleteConfirmVisible = false"
            ></div>
            <div
              class="relative bg-white border border-error/30 rounded-xl shadow-medium w-full max-w-lg mx-4"
            >
              <div
                class="flex items-center justify-between p-4 border-b border-error/20 bg-error/5"
              >
                <div class="flex items-center gap-3">
                  <div
                    class="w-10 h-10 bg-error/20 rounded-full flex items-center justify-center"
                  >
                    <i
                      class="pi pi-exclamation-triangle text-error text-lg"
                    ></i>
                  </div>
                  <h3 class="text-lg font-semibold text-gray-900">
                    Delete Machines
                  </h3>
                </div>
                <button
                  class="p-2 text-gray-400 hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
                  (click)="bulkDeleteConfirmVisible = false"
                >
                  <i class="pi pi-times"></i>
                </button>
              </div>
              <div class="p-4">
                <p class="text-sm text-gray-700 mb-4">
                  Are you sure you want to delete
                  <strong class="text-error">{{
                    selectedMachineIds.size
                  }}</strong>
                  selected machine(s)? This action cannot be undone.
                </p>
                <div
                  *ngIf="getSelectedMachines().length > 0"
                  class="max-h-48 overflow-y-auto border border-gray-200 rounded-md p-3 bg-gray-50"
                >
                  <div
                    *ngFor="let m of getSelectedMachines()"
                    class="text-sm text-gray-700 py-1"
                  >
                    • {{ m.name }}
                  </div>
                </div>
              </div>
              <div
                class="flex items-center justify-end gap-2 p-4 border-t border-gray-200"
              >
                <button
                  class="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                  (click)="bulkDeleteConfirmVisible = false"
                >
                  Cancel
                </button>
                <button
                  class="bulk-delete-btn px-4 py-2 rounded-md text-white transition-all duration-150 cursor-pointer flex items-center gap-2 font-medium shadow-sm hover:shadow-md"
                  (click)="doBulkDelete()"
                >
                  <i class="pi pi-trash text-sm"></i>
                  <span>Delete {{ selectedMachineIds.size }} Machine(s)</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Remove Sequence Confirmation Modal -->
          <div
            *ngIf="removeSequenceConfirmVisible"
            class="fixed inset-0 z-50 flex items-center justify-center"
          >
            <div
              class="absolute inset-0 bg-black/40"
              (click)="removeSequenceConfirmVisible = false"
              role="button"
              tabindex="0"
              (keydown.enter)="removeSequenceConfirmVisible = false"
              (keydown.space)="removeSequenceConfirmVisible = false"
            ></div>
            <div
              class="relative bg-bg border border-neutral-300 rounded-xl shadow-medium w-full max-w-md p-5"
            >
              <div class="flex items-center justify-between mb-3">
                <h3 class="text-lg font-semibold text-text">Remove Sequence</h3>
                <button
                  class="p-2 text-text-muted hover:bg-neutral-100 rounded-md"
                  (click)="removeSequenceConfirmVisible = false"
                >
                  <i class="pi pi-times"></i>
                </button>
              </div>
              <div class="text-text">
                Are you sure you want to remove the sequence "<span
                  class="font-medium"
                  >{{
                    selectedMachineForRemoveSequence?.machine_sequence
                  }}</span
                >" from machine "<span class="font-medium">{{
                  selectedMachineForRemoveSequence?.name
                }}</span
                >"?
              </div>
              <div class="flex items-center justify-end gap-2 mt-4">
                <button
                  class="px-3 py-2 rounded-md border border-neutral-300 text-text hover:bg-neutral-50"
                  (click)="removeSequenceConfirmVisible = false"
                >
                  Cancel
                </button>
                <button
                  class="px-3 py-2 rounded-md border border-error text-error hover:bg-error/10"
                  (click)="doRemoveSequence()"
                >
                  Remove
                </button>
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
              class="relative bg-bg border border-neutral-300 rounded-xl shadow-medium w-full max-w-4xl max-h-[90vh] flex flex-col"
            >
              <div
                class="flex items-center justify-between p-4 border-b border-neutral-200 flex-shrink-0"
              >
                <h3 class="text-lg font-semibold text-text">
                  Machine Documents - {{ selected?.name }}
                </h3>
                <button
                  class="p-2 text-text-muted hover:bg-neutral-100 rounded-md"
                  (click)="documentsVisible = false"
                >
                  <i class="pi pi-times"></i>
                </button>
              </div>
              <div class="flex-1 overflow-y-auto p-4">
                <div *ngIf="selected?.documents?.length; else noDocuments">
                  <div
                    class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                  >
                    <div
                      *ngFor="
                        let doc of selected?.documents;
                        let i = index;
                        trackBy: trackByIndex
                      "
                      class="border border-neutral-300 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div class="flex items-start gap-3">
                        <div class="flex-shrink-0">
                          <div
                            class="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center"
                          >
                            <i class="pi pi-file text-primary text-xl"></i>
                          </div>
                        </div>
                        <div class="flex-1 min-w-0">
                          <h4
                            class="font-medium text-sm text-text truncate"
                            [title]="doc.name"
                          >
                            {{ doc.name }}
                          </h4>
                          <p class="text-xs text-text-muted mt-1">
                            {{ doc.document_type || 'Document' }}
                          </p>
                          <div class="flex gap-2 mt-3">
                            <button
                              class="px-3 py-1 text-xs bg-primary text-white rounded hover:bg-primary-light"
                              (click)="downloadDocument(doc)"
                            >
                              <i class="pi pi-download mr-1"></i>
                              Download
                            </button>
                            <button
                              class="px-3 py-1 text-xs border border-neutral-300 rounded hover:bg-neutral-50"
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
                    <i class="pi pi-file text-4xl text-neutral-400 mb-4"></i>
                    <h3 class="text-lg font-medium text-text mb-2">
                      No Documents
                    </h3>
                    <p class="text-text-muted">
                      This machine doesn't have any documents attached.
                    </p>
                  </div>
                </ng-template>
              </div>
              <div
                class="flex items-center justify-end gap-2 p-4 border-t border-neutral-200 flex-shrink-0"
              >
                <button
                  class="px-3 py-2 rounded-md border border-neutral-300 text-text hover:bg-neutral-50"
                  (click)="documentsVisible = false"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>

      <!-- Toast Component -->
      <p-toast></p-toast>

      <!-- Edit Sequence Modal -->
      <div
        *ngIf="showEditSequenceModal"
        class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        (click)="closeEditSequenceModal()"
      >
        <div
          class="bg-white rounded-lg p-6 max-w-md w-full mx-4"
          (click)="$event.stopPropagation()"
        >
          <h3 class="text-lg font-semibold mb-4">Edit Sequence</h3>
          <form
            [formGroup]="editSequenceForm"
            (ngSubmit)="saveEditedSequence()"
          >
            <div class="mb-4">
              <label class="block text-sm font-medium mb-2"
                >Machine: {{ selectedMachineForSequence?.name }}</label
              >
              <input
                type="text"
                formControlName="machine_sequence"
                class="w-full px-3 py-2 border rounded-md"
                placeholder="Enter sequence number"
              />
              <div
                *ngIf="
                  editSequenceForm.controls['machine_sequence'].invalid &&
                  editSequenceForm.controls['machine_sequence'].touched
                "
                class="text-red-500 text-xs mt-1"
              >
                Sequence is required and must be unique
              </div>
            </div>
            <div class="flex justify-end gap-2">
              <button
                type="button"
                class="px-4 py-2 border rounded-md hover:bg-gray-50"
                (click)="closeEditSequenceModal()"
              >
                Cancel
              </button>
              <button
                type="submit"
                class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                [disabled]="editSequenceForm.invalid"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Swap Sequence Modal -->
      <div
        *ngIf="showSwapSequenceModal"
        class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        (click)="closeSwapSequenceModal()"
      >
        <div
          class="bg-white rounded-lg p-6 max-w-lg w-full mx-4"
          (click)="$event.stopPropagation()"
        >
          <h3 class="text-lg font-semibold mb-4">Swap Sequences</h3>
          <form [formGroup]="swapSequenceForm" (ngSubmit)="swapSequences()">
            <div class="mb-4">
              <label class="block text-sm font-medium mb-2"
                >First Machine</label
              >
              <div class="p-3 bg-gray-50 rounded-md">
                <div class="font-medium">{{ firstMachineForSwap?.name }}</div>
                <div class="text-sm text-gray-600">
                  Current Sequence:
                  <span class="font-mono">{{
                    firstMachineForSwap?.machine_sequence || 'None'
                  }}</span>
                </div>
              </div>
            </div>
            <div class="mb-4">
              <label class="block text-sm font-medium mb-2"
                >Second Machine *</label
              >
              <select
                formControlName="secondMachineId"
                class="w-full px-3 py-2 border rounded-md"
                (change)="
                  onSecondMachineSelect(
                    swapSequenceForm.get('secondMachineId')?.value || ''
                  )
                "
              >
                <option value="">Select a machine...</option>
                <option
                  *ngFor="let m of machines"
                  [value]="m._id"
                  [disabled]="m._id === firstMachineForSwap?._id"
                >
                  {{ m.name }}
                  {{
                    m.machine_sequence ? ' (' + m.machine_sequence + ')' : ''
                  }}
                </option>
              </select>
              <div
                *ngIf="
                  swapSequenceForm.controls['secondMachineId'].invalid &&
                  swapSequenceForm.controls['secondMachineId'].touched
                "
                class="text-red-500 text-xs mt-1"
              >
                Please select a second machine
              </div>
            </div>
            <div
              *ngIf="secondMachineForSwap"
              class="mb-4 p-3 bg-gray-50 rounded-md"
            >
              <div class="font-medium">{{ secondMachineForSwap.name }}</div>
              <div class="text-sm text-gray-600">
                Current Sequence:
                <span class="font-mono">{{
                  secondMachineForSwap.machine_sequence || 'None'
                }}</span>
              </div>
            </div>
            <div class="flex justify-end gap-2">
              <button
                type="button"
                class="px-4 py-2 border rounded-md hover:bg-gray-50"
                (click)="closeSwapSequenceModal()"
              >
                Cancel
              </button>
              <button
                type="submit"
                class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                [disabled]="swapSequenceForm.invalid || !secondMachineForSwap"
              >
                Swap Sequences
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .bulk-delete-btn {
        background-color: #e74c3c !important;
        color: white !important;
      }
      .bulk-delete-btn:hover {
        background-color: #c0392b !important;
      }
      /* Highlight machine row when navigating from notification */
      .highlight-machine {
        animation: highlightPulse 3s ease-in-out;
        background-color: #fef3c7 !important;
        border-left: 4px solid #f59e0b;
      }
      @keyframes highlightPulse {
        0% {
          background-color: #fef3c7;
          border-left-color: #f59e0b;
        }
        50% {
          background-color: #fde68a;
          border-left-color: #d97706;
        }
        100% {
          background-color: transparent;
          border-left-color: transparent;
        }
      }
    `,
  ],
})
export class MachineManagementComponent implements OnInit, OnDestroy {
  machines: Machine[] = [];
  total = 0;
  pages = 1;
  page = 1;
  limit = 10;
  filters: {
    search?: string;
    is_approved?: boolean;
    category_id?: string;
    has_sequence?: boolean;
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
  // form state
  formVisible = false;
  viewVisible = false;
  confirmVisible = false;
  documentsVisible = false;
  editing = false;
  submitting = false;
  formLoading = false;
  selected: Machine | null = null;
  form: FormGroup;
  categories: Array<{
    _id: string;
    name: string;
    level: number;
    children?: any[];
  }> = [];
  filterCategories: Array<{
    _id: string;
    name: string;
    level: number;
  }> = [];
  subcategories: Array<{ _id: string; name: string; level: number }> = [];
  previewImages: string[] = [];
  selectedFiles: File[] = [];
  selectedDocuments: File[] = [];
  existingImages: string[] = [];
  existingDocuments: any[] = [];
  removedDocuments: any[] = []; // Track documents to be removed
  isDragging = false;
  isDocumentDragging = false;
  metadataText = '';
  metadataError: string | null = null;
  metadataEntries: Array<{ key: string; value: string }> = [];
  // layout state
  sidebarCollapsed = false;
  // search debounce
  private searchInput$ = new Subject<string>();
  private subs = new Subscription();
  // category search state
  categorySuggest: Array<{ _id: string; name: string }> = [];
  categorySuggestLoading = false;
  filterCategoryOpen = false;
  formCategoryOpen = false;
  filterCategoryInput = '';
  formCategoryInput = '';
  // lightbox state
  lightboxImages: string[] = [];
  lightboxIndex = 0;

  // sequence management
  sequenceConfigs: SequenceConfig[] = [];
  selectedSequence: string = '';
  showSequenceGenerator = false;
  isGeneratingSequence = false;
  sequenceGenerationProgress = 0;

  // Edit sequence modal
  showEditSequenceModal = false;
  editSequenceForm: FormGroup;
  selectedMachineForSequence: Machine | null = null;

  // Swap sequence modal
  showSwapSequenceModal = false;
  swapSequenceForm: FormGroup;
  firstMachineForSwap: Machine | null = null;
  secondMachineForSwap: Machine | null = null;

  // Confirmation modals
  bulkGenerateConfirmVisible = false;
  pendingBulkGenerateMachines: Machine[] = [];
  removeSequenceConfirmVisible = false;
  selectedMachineForRemoveSequence: Machine | null = null;

  // Bulk selection state
  selectedMachineIds = new Set<string>();
  isAllSelected = false;
  isIndeterminate = false;
  bulkDeleteConfirmVisible = false;

  // Metadata autocomplete
  metadataKeySuggestions: string[] = [];
  allMetadataKeys: string[] = []; // Master list of all keys
  showMetadataKeySuggestions = false;

  // ViewChild for document input
  @ViewChild('documentInput') documentInput!: ElementRef<HTMLInputElement>;

  constructor(
    private machineService: MachineService,
    private fb: FormBuilder,
    private categoryService: CategoryService,
    private messageService: MessageService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.form = this.fb.group({
      name: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(100),
          Validators.pattern(/^[a-zA-Z0-9\s\-_&().,/]+$/),
        ],
      ],
      category_id: [
        '',
        [Validators.required, Validators.pattern(/^[0-9a-fA-F]{24}$/)],
      ],
      party_name: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(100),
          Validators.pattern(/^[a-zA-Z0-9\s\-_&().,/]+$/),
        ],
      ],
      location: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(100),
        ],
      ],
      mobile_number: [
        '',
        [
          Validators.required,
          Validators.minLength(10),
          Validators.maxLength(20),
          Validators.pattern(/^[+]?[0-9\s\-()]+$/),
        ],
      ],
      dispatch_date: [''],
      images: [null],
      machine_sequence: ['', [Validators.maxLength(50)]],
      subcategory_id: ['', [this.subcategoryIdValidator]],
      is_approved: [false],
    });

    // Initialize edit sequence form
    this.editSequenceForm = this.fb.group({
      machine_sequence: ['', [Validators.required, Validators.maxLength(50)]],
    });

    // Initialize swap sequence form
    this.swapSequenceForm = this.fb.group({
      firstMachineId: ['', Validators.required],
      secondMachineId: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    // Check for machineId query param to filter/scroll to specific machine
    this.route.queryParamMap.subscribe(params => {
      const machineId = params.get('machineId');
      if (machineId) {
        // Set search filter to machineId (backend now supports searching by _id)
        this.filters.search = machineId;
        this.page = 1;
        // Reload to show the machine
        this.reload();
        // After data loads, scroll to the machine row
        setTimeout(() => {
          this.scrollToMachine(machineId);
          // Clear the query param after scrolling
          this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { machineId: null },
            queryParamsHandling: 'merge',
          });
        }, 1500);
      } else {
        this.reload();
      }
    });

    this.loadCategories();
    this.loadFilterCategories();
    this.loadSequenceConfigs();
    // Debounce search input
    const s = this.searchInput$
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(term => {
        this.filters.search = term;
        this.page = 1;
        this.reload();
      });
    this.subs.add(s);
    // Load initial metadata keys from first page
    this.machineService
      .getAllMachines({ page: 1, limit: 100 })
      .subscribe(res => {
        this.extractMetadataKeys(res.data.machines);
      });
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  onSearchChange(value: string): void {
    this.searchInput$.next(value || '');
  }

  clearFilters(): void {
    this.filters = {
      sortBy: 'createdAt',
      sortOrder: 'desc', // Default: latest first
    };
    this.page = 1;
    this.reload();
    this.filterCategoryInput = '';
    this.filterCategoryOpen = false;
    this.showMetadataKeySuggestions = false;
  }

  onCategoryFilterChange(): void {
    this.page = 1;
    this.reload();
  }

  onMetadataKeyChange(): void {
    // Filter suggestions based on input from master list
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
    // Debounce metadata value search
    clearTimeout((this as any).metadataValueTimer);
    (this as any).metadataValueTimer = setTimeout(() => {
      this.page = 1;
      this.reload();
    }, 500);
  }

  selectMetadataKey(key: string): void {
    this.filters.metadata_key = key;
    this.showMetadataKeySuggestions = false;
    this.page = 1;
    this.reload();
  }

  hideMetadataSuggestions(): void {
    setTimeout(() => {
      this.showMetadataKeySuggestions = false;
    }, 200);
  }

  // Scroll to specific machine row by ID
  scrollToMachine(machineId: string): void {
    const element = document.querySelector(`[data-machine-id="${machineId}"]`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Highlight the row temporarily
      (element as HTMLElement).classList.add('highlight-machine');
      setTimeout(() => {
        (element as HTMLElement).classList.remove('highlight-machine');
      }, 3000);
    }
  }

  extractMetadataKeys(machines: Machine[]): void {
    const keySet = new Set<string>();
    machines.forEach(machine => {
      if (machine.metadata && typeof machine.metadata === 'object') {
        Object.keys(machine.metadata).forEach(key => {
          if (key && key.trim()) {
            keySet.add(key.trim());
          }
        });
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

  reload(): void {
    this.machineService
      .getAllMachines({
        page: this.page,
        limit: this.limit,
        search: this.filters.search,
        is_approved: this.filters.is_approved,
        category_id: this.filters.category_id,
        has_sequence: this.filters.has_sequence,
        metadata_key: this.filters.metadata_key,
        metadata_value: this.filters.metadata_value,
        dispatch_date_from: this.filters.dispatch_date_from,
        dispatch_date_to: this.filters.dispatch_date_to,
        sortBy: this.filters.sortBy,
        sortOrder: this.filters.sortOrder,
      })
      .subscribe(res => {
        this.machines = res.data.machines;
        // Extract metadata keys for autocomplete
        this.extractMetadataKeys(this.machines);
        this.total = res.data.total;
        this.pages = res.data.pages;
        // Update selection state after reload
        this.updateSelectionState();
      });
  }

  onPageChange(p: number): void {
    this.page = p;
    // Clear selection when changing pages
    this.clearSelection();
    this.reload();
  }

  onLimitChange(l: number): void {
    this.limit = l;
    this.page = 1;
    this.reload();
  }

  openCreate(): void {
    this.editing = false;
    this.selected = null;
    this.form.reset();
    this.formVisible = true;
    this.previewImages = [];
    this.selectedFiles = [];
    this.selectedDocuments = [];
    this.existingImages = [];
    this.existingDocuments = [];
    this.removedDocuments = [];
    this.subcategories = [];
    this.isDragging = false;
    this.isDocumentDragging = false;
    this.metadataText = '';
    this.metadataError = null;
    this.metadataEntries = [{ key: '', value: '' }];
    this.form.patchValue({ is_approved: false });
  }

  openView(machine: Machine): void {
    this.selected = machine;
    this.viewVisible = true;
  }

  openEdit(machine: Machine): void {
    this.editing = true;
    this.formVisible = true;
    this.formLoading = true;
    // Always fetch the latest machine details to ensure defaults & images are current
    const id = (machine?._id as string) || '';
    const applyData = (m: any) => {
      this.selected = m;
      this.form.patchValue({
        name: m.name,
        category_id:
          typeof m.category_id === 'string'
            ? (m.category_id as unknown as string)
            : (m.category_id as any)?._id,
        party_name: m.party_name || '',
        location: m.location || '',
        mobile_number: m.mobile_number || '',
        dispatch_date: m.dispatch_date
          ? typeof m.dispatch_date === 'string'
            ? m.dispatch_date.split('T')[0]
            : new Date(m.dispatch_date).toISOString().split('T')[0]
          : '',
        machine_sequence: m.machine_sequence || '',
        subcategory_id: m.subcategory_id
          ? typeof m.subcategory_id === 'string'
            ? m.subcategory_id
            : (m.subcategory_id as any)?._id || ''
          : '',
        is_approved: !!m.is_approved,
      });
      // Reset client-side selections
      this.previewImages = [];
      this.selectedFiles = [];
      this.selectedDocuments = [];
      this.isDragging = false;
      this.isDocumentDragging = false;

      // Load existing files
      this.existingImages = m.images || [];
      this.existingDocuments = m.documents || [];

      // Load subcategories for the selected category
      if (m.category_id) {
        const categoryId =
          typeof m.category_id === 'string'
            ? m.category_id
            : (m.category_id as any)?._id;
        if (categoryId) {
          this.loadSubcategories(categoryId);
        }
      }
      // Pre-fill metadata entries
      try {
        const meta =
          m?.metadata && typeof m.metadata === 'object'
            ? (m.metadata as Record<string, unknown>)
            : {};
        const keys = Object.keys(meta);
        this.metadataEntries = keys.length
          ? keys.map(k => ({ key: k, value: String((meta as any)[k] ?? '') }))
          : [{ key: '', value: '' }];
      } catch {
        this.metadataEntries = [{ key: '', value: '' }];
      }
      this.metadataText = '';
      this.metadataError = null;
      this.formLoading = false;
    };

    if (id) {
      const sub = this.machineService.getMachineById(id).subscribe({
        next: res => {
          try {
            const m = (res as any)?.data || (res as any);
            applyData(m);
          } finally {
            sub.unsubscribe();
          }
        },
        error: () => {
          try {
            applyData(machine);
          } finally {
            sub.unsubscribe();
          }
        },
        complete: () => {
          this.formLoading = false;
        },
      });
    } else {
      applyData(machine);
    }
  }

  confirmDelete(machine: Machine): void {
    this.selected = machine;
    this.confirmVisible = true;
  }

  closeForm(): void {
    this.formVisible = false;
    this.formLoading = false; // ensure any pending loader is cleared when closing
    this.submitting = false;
    this.lightboxImages = [];
  }

  onFiles(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const files = input?.files ? Array.from(input.files) : [];
    const limited = files.slice(0, 5);
    this.selectedFiles = limited;
    this.form.patchValue({ images: limited });
    // revoke previous previews
    this.previewImages.forEach(u => URL.revokeObjectURL(u));
    this.previewImages = limited.map(f => URL.createObjectURL(f));
  }

  removeFile(i: number): void {
    if (i < 0 || i >= this.selectedFiles.length) return;
    const [removed] = this.previewImages.splice(i, 1);
    if (removed) URL.revokeObjectURL(removed);
    this.selectedFiles.splice(i, 1);
    this.form.patchValue({ images: this.selectedFiles });
  }

  addMetadataRow(): void {
    this.metadataEntries.push({ key: '', value: '' });
  }

  removeMetadataRow(i: number): void {
    if (this.metadataEntries.length <= 1) return;
    this.metadataEntries.splice(i, 1);
  }

  submitForm(): void {
    // Mark all fields as touched to show validation errors
    Object.keys(this.form.controls).forEach(key => {
      this.form.get(key)?.markAsTouched();
    });

    if (this.submitting || this.form.invalid) {
      if (this.form.invalid) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Validation Error',
          detail: 'Please fix the errors in the form before submitting.',
        });
      }
      return;
    }

    this.submitting = true;

    // Extract and sanitize form values
    const name = (this.form.value.name || '').trim();
    const category_id = (this.form.value.category_id || '').trim();
    const party_name = (this.form.value.party_name || '').trim();
    const location = (this.form.value.location || '').trim();
    const mobile_number = (this.form.value.mobile_number || '').trim();
    const dispatch_date = this.form.value.dispatch_date || '';
    const machine_sequence = (this.form.value.machine_sequence || '').trim();
    // Handle subcategory_id: extract ID if it's an object, or use empty string if invalid
    let subcategory_id = '';
    const subcategoryValue = this.form.value.subcategory_id;
    if (subcategoryValue) {
      if (typeof subcategoryValue === 'string') {
        subcategory_id = subcategoryValue.trim();
      } else if (
        typeof subcategoryValue === 'object' &&
        subcategoryValue?._id
      ) {
        subcategory_id = String(subcategoryValue._id).trim();
      }
    }
    // Validate subcategory_id format if it has a value (empty string is allowed)
    if (
      subcategory_id &&
      subcategory_id.trim() !== '' &&
      !/^[0-9a-fA-F]{24}$/.test(subcategory_id)
    ) {
      this.submitting = false;
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Invalid subcategory ID format',
      });
      this.form.get('subcategory_id')?.setErrors({ pattern: true });
      this.form.get('subcategory_id')?.markAsTouched();
      return;
    }
    // Build metadata object from dynamic rows
    const metadataEntries = this.metadataEntries.filter(
      e => (e.key || '').trim().length > 0
    );
    const metadata: Record<string, unknown> = metadataEntries.reduce<
      Record<string, unknown>
    >((acc, e) => {
      acc[e.key.trim()] = e.value;
      return acc;
    }, {});
    if (this.editing && this.selected) {
      const currentApproved = !!this.selected.is_approved;
      const nextApproved = !!this.form.value.is_approved;
      // Note: existing files are handled separately from new uploads
      // The backend will merge existing files with new uploads

      // Prepare the update payload
      const updatePayload: any = {
        name,
        category_id,
        party_name,
        location,
        mobile_number,
        dispatch_date: dispatch_date || undefined, // Only include if not empty
        machine_sequence: machine_sequence || undefined, // Only include if not empty
        images: this.selectedFiles, // Only new files for upload
        documents: this.selectedDocuments, // Only new files for upload
        metadata: metadata, // Always include metadata (empty object clears existing metadata)
        removedDocuments: this.removedDocuments, // Documents to be removed
      };

      // Only include subcategory_id if it has a valid value (empty string is allowed by backend)
      if (subcategory_id) {
        updatePayload.subcategory_id = subcategory_id;
      } else {
        // Send empty string to clear subcategory (backend allows this)
        updatePayload.subcategory_id = '';
      }

      this.machineService
        .updateMachineForm(this.selected._id, updatePayload)
        .subscribe({
          next: () => {
            const finalize = () => {
              this.submitting = false;
              this.formVisible = false;
              this.messageService.add({
                severity: 'success',
                summary: 'Success',
                detail: 'Machine updated successfully',
              });
              this.reload();
            };
            if (currentApproved !== nextApproved) {
              this.machineService
                .updateMachineApproval(this.selected!._id, {
                  is_approved: nextApproved,
                })
                .subscribe({
                  next: finalize,
                  error: (err: any) => {
                    console.error('Error updating approval:', err);
                    finalize();
                  },
                });
            } else {
              finalize();
            }
          },
          error: (err: any) => {
            this.submitting = false;
            console.error('Error updating machine:', err);

            // Extract error message from response
            let errorMessage = 'Failed to update machine';
            if (err?.error?.message) {
              errorMessage = err.error.message;
            } else if (
              err?.error?.details &&
              Array.isArray(err.error.details)
            ) {
              // Handle validation errors from backend
              const validationErrors = err.error.details
                .map((d: any) => `${d.field}: ${d.message}`)
                .join(', ');
              errorMessage = `Validation failed: ${validationErrors}`;
            } else if (err?.message) {
              errorMessage = err.message;
            }

            this.messageService.add({
              severity: 'error',
              summary: 'Update Failed',
              detail: errorMessage,
            });
          },
        });
    } else {
      // Prepare the create payload
      const createPayload: any = {
        name,
        category_id,
        party_name,
        location,
        mobile_number,
        dispatch_date: dispatch_date || undefined, // Only include if not empty
        machine_sequence,
        subcategory_id,
        images: this.selectedFiles,
        documents: this.selectedDocuments,
        metadata: metadata, // Always include metadata (empty object is valid for new machines)
      };

      // Only include subcategory_id if it has a valid value
      if (subcategory_id) {
        createPayload.subcategory_id = subcategory_id;
      }

      this.machineService.createMachineForm(createPayload).subscribe({
        next: () => {
          this.submitting = false;
          this.formVisible = false;
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Machine created successfully',
          });
          this.reload();
        },
        error: (err: any) => {
          this.submitting = false;
          console.error('Error creating machine:', err);

          // Extract error message from response
          let errorMessage = 'Failed to create machine';
          if (err?.error?.message) {
            errorMessage = err.error.message;
          } else if (err?.error?.details && Array.isArray(err.error.details)) {
            // Handle validation errors from backend
            const validationErrors = err.error.details
              .map((d: any) => `${d.field}: ${d.message}`)
              .join(', ');
            errorMessage = `Validation failed: ${validationErrors}`;
          } else if (err?.message) {
            errorMessage = err.message;
          }

          this.messageService.add({
            severity: 'error',
            summary: 'Creation Failed',
            detail: errorMessage,
          });
        },
      });
    }
  }

  doDelete(): void {
    if (!this.selected) return;
    const id = this.selected._id;
    this.machineService.deleteMachine(id).subscribe({
      next: () => {
        this.confirmVisible = false;
        this.reload();
      },
      error: () => {
        this.confirmVisible = false;
      },
    });
  }

  loadCategories(): void {
    this.categoryService
      .getAllCategories({ includeInactive: false })
      .subscribe(res => {
        this.categories = res.data || [];
        // Filter to show only main categories (level 0) in the main dropdown
        this.categories = this.categories.filter(cat => cat.level === 0);
      });
  }

  loadFilterCategories(): void {
    this.categoryService
      .getAllCategories({ includeInactive: false })
      .subscribe(res => {
        // Load all categories for filtering (including subcategories)
        this.filterCategories = res.data || [];
        // Sort by level first, then by name
        this.filterCategories.sort((a, b) => {
          if (a.level !== b.level) return a.level - b.level;
          return (a.name || '').localeCompare(b.name || '');
        });
      });
  }

  // Document handling methods
  onDocumentsSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.acceptDocuments(Array.from(input.files));
    }
  }

  removeDocument(index: number): void {
    this.selectedDocuments.splice(index, 1);
  }

  openDocumentPicker(): void {
    if (this.documentInput) {
      this.documentInput.nativeElement.click();
    }
  }

  onDocumentDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDocumentDragging = true;
  }

  onDocumentDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDocumentDragging = false;
  }

  onDocumentDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDocumentDragging = false;
    if (event.dataTransfer?.files) {
      this.acceptDocuments(Array.from(event.dataTransfer.files));
    }
  }

  acceptDocuments(files: File[]): void {
    const validFiles = files.filter(file => {
      const validTypes = [
        '.pdf',
        '.doc',
        '.docx',
        '.xls',
        '.xlsx',
        '.txt',
        '.zip',
        '.rar',
      ];
      const extension = '.' + file.name.split('.').pop()?.toLowerCase();
      return validTypes.includes(extension);
    });

    if (validFiles.length !== files.length) {
      // Show error for invalid files
      console.warn('Some files were rejected due to invalid file type');
    }

    this.selectedDocuments.push(...validFiles);
  }

  // Category search helpers
  onCategoryInput(value: string, ctx: 'filter' | 'form'): void {
    const term = (value || '').trim();
    if (ctx === 'filter') this.filterCategoryInput = term;
    else this.formCategoryInput = term;
    if (!term) {
      this.categorySuggest = this.categories.slice(0, 10);
      return;
    }
    this.categorySuggestLoading = true;
    // simple client-side search; if needed, replace with API call
    const lc = term.toLowerCase();
    this.categorySuggest = this.categories
      .filter(c => (c.name || '').toLowerCase().includes(lc))
      .slice(0, 10);
    this.categorySuggestLoading = false;
  }

  selectCategory(
    opt: { _id?: string; name: string },
    ctx: 'filter' | 'form'
  ): void {
    if (ctx === 'filter') {
      this.filters.category_id = opt?._id || undefined;
      this.filterCategoryInput = opt?.name || '';
      this.filterCategoryOpen = false;
      this.page = 1;
      this.reload();
    } else {
      if (opt?._id) this.form.patchValue({ category_id: opt._id });
      this.formCategoryInput = opt?.name || '';
      this.formCategoryOpen = false;
    }
  }

  trackById = (_: number, item: { _id: string }) => item._id;
  trackByIndex = (i: number) => i;
  trackByKey = (_: number, item: { key: string; value: unknown }) => item.key;

  // Custom validator for subcategory_id - allows empty string or valid ObjectId
  subcategoryIdValidator = (
    control: AbstractControl
  ): { [key: string]: any } | null => {
    if (!control.value) {
      return null; // Empty/null is allowed (optional field)
    }
    const value = String(control.value).trim();
    if (value === '') {
      return null; // Empty string is allowed (optional field)
    }
    if (!/^[0-9a-fA-F]{24}$/.test(value)) {
      return { pattern: true };
    }
    return null;
  };

  imageUrl(path: string): string {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    // Ensure we build from server origin, not /api base
    const base = environment.apiUrl.replace(/\/?api\/?$/, '');
    if (path.startsWith('/')) return `${base}${path}`;
    return `${base}/${path}`;
  }

  // image lightbox helpers
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

  onToggleApproved(event: Event): void {
    if (!this.editing || !this.selected) return;
    const input = event.target as HTMLInputElement;
    const next = !!input.checked;
    this.submitting = true;
    this.machineService
      .updateMachineApproval(this.selected._id, { is_approved: next })
      .subscribe({
        next: () => {
          this.submitting = false;
          // reflect change locally
          this.selected = {
            ...(this.selected as any),
            is_approved: next,
          } as any;
          // also update list row if present
          const idx = this.machines.findIndex(
            m => m._id === (this.selected as any)._id
          );
          if (idx >= 0)
            this.machines[idx] = {
              ...this.machines[idx],
              is_approved: next,
            } as any;
        },
        error: () => {
          this.submitting = false;
        },
      });
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  onSidebarCollapseChange(collapsed: boolean): void {
    this.sidebarCollapsed = collapsed;
  }

  // Documents modal methods
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
    const baseUrl = environment.baseUrl;
    // Ensure filePath starts with / if it doesn't already
    const normalizedPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
    return `${baseUrl}${normalizedPath}`;
  }

  // Missing drag and drop methods
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
    if (event.dataTransfer?.files) {
      this.onFiles(event);
    }
  }

  // Methods for handling existing files
  removeExistingImage(index: number): void {
    this.existingImages.splice(index, 1);
  }

  removeExistingDocument(index: number): void {
    const removedDoc = this.existingDocuments[index];
    this.removedDocuments.push(removedDoc); // Track for backend removal
    this.existingDocuments.splice(index, 1);
  }

  // ==================== SEQUENCE MANAGEMENT ====================

  loadSequenceConfigs(): void {
    this.categoryService.getAllSequenceConfigs().subscribe({
      next: (response: any) => {
        this.sequenceConfigs = response.data || [];
      },
      error: (error: any) => {
        console.error('Error loading sequence configs:', error);
      },
    });
  }

  getSequenceConfigForCategory(categoryId: string): SequenceConfig | undefined {
    return this.sequenceConfigs.find(
      config => config.category_id === categoryId
    );
  }

  hasSequenceConfig(categoryId: string): boolean {
    return !!this.getSequenceConfigForCategory(categoryId);
  }

  openSequenceGenerator(): void {
    const categoryId = this.form.get('category_id')?.value;
    if (!categoryId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Category Required',
        detail: 'Please select a category first',
      });
      return;
    }
    this.showSequenceGenerator = true;
  }

  generateSequence(): void {
    const categoryId = this.form.get('category_id')?.value;
    const subcategoryId = this.form.get('subcategory_id')?.value;

    if (!categoryId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Category Required',
        detail: 'Please select a category first',
      });
      return;
    }

    this.isGeneratingSequence = true;
    this.sequenceGenerationProgress = 0;

    const request: SequenceGenerationRequest = {
      categoryId: categoryId,
      subcategoryId: subcategoryId || undefined,
    };

    this.categoryService.generateSequence(request).subscribe({
      next: (response: any) => {
        this.selectedSequence = response.data.sequence;
        this.isGeneratingSequence = false;
        this.sequenceGenerationProgress = 100;
        this.showSequenceGenerator = false;

        // Update the form with the generated sequence
        this.form.patchValue({ machine_sequence: this.selectedSequence });
      },
      error: (error: any) => {
        console.error('Error generating sequence:', error);
        this.isGeneratingSequence = false;
        this.sequenceGenerationProgress = 0;
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

  onCategoryChange(): void {
    // Reset sequence and subcategory when category changes
    this.selectedSequence = '';
    this.subcategories = [];
    this.form.patchValue({
      machine_sequence: '',
      subcategory_id: '',
    });

    // Load subcategories for the selected category
    const categoryId = this.form.get('category_id')?.value;
    if (categoryId) {
      this.loadSubcategories(categoryId);
    }
  }

  loadSubcategories(categoryId: string): void {
    this.categoryService
      .getAllCategories({ includeInactive: false, parentId: categoryId })
      .subscribe(res => {
        this.subcategories = res.data || [];
      });
  }

  onSubcategoryChange(): void {
    // Reset sequence when subcategory changes
    this.selectedSequence = '';
    this.form.patchValue({ machine_sequence: '' });
  }

  // ==================== ENHANCED MACHINE MANAGEMENT ====================

  getMachinesWithoutSequence(): Machine[] {
    return this.machines.filter(m => !m.machine_sequence);
  }

  getSubcategoryName(subcategoryId: string): string {
    if (!subcategoryId) return '';
    const subcategory = this.subcategories.find(sc => sc._id === subcategoryId);
    return subcategory?.name || 'Unknown Subcategory';
  }

  getLevelLabel(level: number): string {
    switch (level) {
      case 0:
        return 'Main';
      case 1:
        return 'Sub';
      case 2:
        return 'Sub-sub';
      default:
        return `L${level}`;
    }
  }

  getCategoryDisplayName(cat: { name: string; level: number }): string {
    if (cat.level > 0) {
      return `${cat.name} (${this.getLevelLabel(cat.level)})`;
    }
    return cat.name;
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
    // If it's a string ID, use the helper method
    if (typeof subcategoryId === 'string') {
      return this.getSubcategoryName(subcategoryId) || '-';
    }
    // If it's an object with _id, extract the ID and use helper
    if (
      typeof subcategoryId === 'object' &&
      subcategoryId !== null &&
      '_id' in subcategoryId &&
      subcategoryId._id
    ) {
      const idStr =
        typeof subcategoryId._id === 'string'
          ? subcategoryId._id
          : String(subcategoryId._id);
      return this.getSubcategoryName(idStr) || '-';
    }
    return '-';
  }

  generateSequenceForMachine(machine: Machine): void {
    if (!machine.category_id) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'Machine must have a category to generate sequence',
      });
      return;
    }

    this.isGeneratingSequence = true;
    this.sequenceGenerationProgress = 0;

    const request: SequenceGenerationRequest = {
      categoryId:
        typeof machine.category_id === 'string'
          ? machine.category_id
          : machine.category_id._id,
      subcategoryId: machine.subcategory_id
        ? typeof machine.subcategory_id === 'string'
          ? machine.subcategory_id
          : (machine.subcategory_id as any)?._id
        : undefined,
    };

    this.categoryService.generateSequence(request).subscribe({
      next: (response: any) => {
        const generatedSequence = response.data.sequence;
        this.sequenceGenerationProgress = 50;

        // Save the sequence to the machine
        this.machineService
          .updateMachineForm(machine._id, {
            machine_sequence: generatedSequence,
          })
          .subscribe({
            next: (_updateResponse: any) => {
              this.isGeneratingSequence = false;
              this.sequenceGenerationProgress = 100;

              // Update the machine in the list
              const machineIndex = this.machines.findIndex(
                m => m._id === machine._id
              );
              if (machineIndex !== -1) {
                this.machines[machineIndex] = {
                  ...this.machines[machineIndex],
                  machine_sequence: generatedSequence,
                };
              }

              // Show success message
              this.messageService.add({
                severity: 'success',
                summary: 'Success',
                detail: `Sequence generated successfully: ${generatedSequence}`,
              });
            },
            error: (updateError: any) => {
              console.error('Error saving sequence to machine:', updateError);
              this.isGeneratingSequence = false;
              this.sequenceGenerationProgress = 0;
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail:
                  'Failed to save sequence: ' +
                  (updateError.error?.message || 'Unknown error'),
              });
            },
          });
      },
      error: (error: any) => {
        console.error('Error generating sequence:', error);
        this.isGeneratingSequence = false;
        this.sequenceGenerationProgress = 0;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail:
            'Failed to generate sequence: ' +
            (error.error?.message || 'Unknown error'),
        });
      },
    });
  }

  // Bulk sequence generation
  generateSequencesForSelectedMachines(): void {
    // This method is for generating sequences for ALL machines without sequences
    // Use bulkGenerateSequences() for selected machines
    const machinesWithoutSequence = this.machines.filter(
      m => !m.machine_sequence
    );

    if (machinesWithoutSequence.length === 0) {
      this.messageService.add({
        severity: 'info',
        summary: 'Info',
        detail: 'All machines already have sequences',
      });
      return;
    }

    // Store machines for confirmation modal
    this.pendingBulkGenerateMachines = machinesWithoutSequence;
    this.bulkGenerateConfirmVisible = true;
  }

  // Confirmed bulk sequence generation (for all machines without sequences)
  doBulkGenerateSequencesForAll(): void {
    if (this.pendingBulkGenerateMachines.length === 0) return;

    const machines = [...this.pendingBulkGenerateMachines];
    this.bulkGenerateConfirmVisible = false;
    this.pendingBulkGenerateMachines = [];

    this.isGeneratingSequence = true;
    this.sequenceGenerationProgress = 0;
    let completed = 0;
    let successCount = 0;
    const total = machines.length;

    // Process machines sequentially to avoid duplicate sequences
    const processNextMachine = (index: number): void => {
      if (index >= machines.length) {
        // All machines processed
        this.isGeneratingSequence = false;
        if (successCount === total) {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: `Successfully generated sequences for ${successCount} machines`,
          });
        } else {
          this.messageService.add({
            severity: 'warn',
            summary: 'Warning',
            detail: `Completed with some errors. Generated sequences for ${successCount} out of ${total} machines`,
          });
        }
        this.reload(); // Refresh the list to show updated sequences
        return;
      }

      const machine = machines[index];
      const request: SequenceGenerationRequest = {
        categoryId:
          typeof machine.category_id === 'string'
            ? machine.category_id
            : machine.category_id._id,
        subcategoryId: machine.subcategory_id
          ? typeof machine.subcategory_id === 'string'
            ? machine.subcategory_id
            : (machine.subcategory_id as any)?._id
          : undefined,
      };

      this.categoryService.generateSequence(request).subscribe({
        next: (response: any) => {
          const generatedSequence = response.data.sequence;

          // Save the sequence to the machine
          this.machineService
            .updateMachineForm(machine._id, {
              machine_sequence: generatedSequence,
            })
            .subscribe({
              next: (_updateResponse: any) => {
                completed++;
                successCount++;
                this.sequenceGenerationProgress = Math.round(
                  (completed / total) * 100
                );

                // Update the machine in the list
                const machineIndex = this.machines.findIndex(
                  m => m._id === machine._id
                );
                if (machineIndex !== -1) {
                  this.machines[machineIndex] = {
                    ...this.machines[machineIndex],
                    machine_sequence: generatedSequence,
                  };
                }

                // Process next machine
                processNextMachine(index + 1);
              },
              error: (updateError: any) => {
                console.error(
                  `Error saving sequence for machine ${machine.name}:`,
                  updateError
                );
                completed++;
                this.sequenceGenerationProgress = Math.round(
                  (completed / total) * 100
                );

                // Process next machine even on error
                processNextMachine(index + 1);
              },
            });
        },
        error: (error: any) => {
          console.error(
            `Error generating sequence for machine ${machine.name}:`,
            error
          );
          completed++;
          this.sequenceGenerationProgress = Math.round(
            (completed / total) * 100
          );

          // Process next machine even on error
          processNextMachine(index + 1);
        },
      });
    };

    // Start processing from the first machine
    processNextMachine(0);
  }

  // Edit sequence
  openEditSequenceModal(machine: Machine): void {
    this.selectedMachineForSequence = machine;
    this.editSequenceForm.patchValue({
      machine_sequence: machine.machine_sequence || '',
    });
    this.showEditSequenceModal = true;
  }

  closeEditSequenceModal(): void {
    this.showEditSequenceModal = false;
    this.selectedMachineForSequence = null;
    this.editSequenceForm.reset();
  }

  saveEditedSequence(): void {
    if (this.editSequenceForm.invalid || !this.selectedMachineForSequence) {
      return;
    }

    const newSequence = this.editSequenceForm.value.machine_sequence.trim();
    const currentSequence = this.selectedMachineForSequence.machine_sequence;

    // Don't save if sequence hasn't changed
    if (newSequence === currentSequence) {
      this.closeEditSequenceModal();
      return;
    }

    this.machineService
      .updateMachineForm(this.selectedMachineForSequence._id, {
        machine_sequence: newSequence,
      })
      .subscribe({
        next: (_response: any) => {
          // Update the machine in the list
          const machineIndex = this.machines.findIndex(
            m => m._id === this.selectedMachineForSequence!._id
          );
          if (machineIndex !== -1) {
            this.machines[machineIndex] = {
              ...this.machines[machineIndex],
              machine_sequence: newSequence,
            };
          }

          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: `Sequence updated successfully to ${newSequence}`,
          });

          this.closeEditSequenceModal();
        },
        error: (error: any) => {
          console.error('Error updating sequence:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail:
              error.error?.message ||
              'Failed to update sequence. It may already be assigned to another machine.',
          });
        },
      });
  }

  // Swap sequence
  openSwapSequenceModal(machine: Machine): void {
    this.firstMachineForSwap = machine;
    this.swapSequenceForm.patchValue({
      firstMachineId: machine._id,
    });
    this.showSwapSequenceModal = true;
  }

  closeSwapSequenceModal(): void {
    this.showSwapSequenceModal = false;
    this.firstMachineForSwap = null;
    this.secondMachineForSwap = null;
    this.swapSequenceForm.reset();
  }

  onSecondMachineSelect(machineId: string): void {
    if (!machineId) {
      this.secondMachineForSwap = null;
      return;
    }

    const machine = this.machines.find(m => m._id === machineId);
    this.secondMachineForSwap = machine || null;
    this.swapSequenceForm.patchValue({
      secondMachineId: machineId,
    });
  }

  swapSequences(): void {
    if (
      this.swapSequenceForm.invalid ||
      !this.firstMachineForSwap ||
      !this.secondMachineForSwap
    ) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'Please select both machines to swap sequences',
      });
      return;
    }

    if (this.firstMachineForSwap._id === this.secondMachineForSwap._id) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'Cannot swap sequence with the same machine',
      });
      return;
    }

    const firstSequence = this.firstMachineForSwap.machine_sequence || '';
    const secondSequence = this.secondMachineForSwap.machine_sequence || '';

    // Swap sequences
    this.machineService
      .updateMachineForm(this.firstMachineForSwap._id, {
        machine_sequence: secondSequence,
      })
      .subscribe({
        next: () => {
          this.machineService
            .updateMachineForm(this.secondMachineForSwap!._id, {
              machine_sequence: firstSequence,
            })
            .subscribe({
              next: () => {
                // Update machines in the list
                const firstIndex = this.machines.findIndex(
                  m => m._id === this.firstMachineForSwap!._id
                );
                const secondIndex = this.machines.findIndex(
                  m => m._id === this.secondMachineForSwap!._id
                );

                if (firstIndex !== -1) {
                  this.machines[firstIndex] = {
                    ...this.machines[firstIndex],
                    machine_sequence: secondSequence,
                  };
                }

                if (secondIndex !== -1) {
                  this.machines[secondIndex] = {
                    ...this.machines[secondIndex],
                    machine_sequence: firstSequence,
                  };
                }

                this.messageService.add({
                  severity: 'success',
                  summary: 'Success',
                  detail: 'Sequences swapped successfully',
                });

                this.closeSwapSequenceModal();
              },
              error: (error: any) => {
                console.error('Error updating second machine sequence:', error);
                // Revert first machine
                this.machineService
                  .updateMachineForm(this.firstMachineForSwap!._id, {
                    machine_sequence: firstSequence,
                  })
                  .subscribe();

                this.messageService.add({
                  severity: 'error',
                  summary: 'Error',
                  detail: 'Failed to swap sequences. Please try again.',
                });
              },
            });
        },
        error: (error: any) => {
          console.error('Error updating first machine sequence:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to swap sequences. Please try again.',
          });
        },
      });
  }

  // Remove sequence from machine
  removeSequenceFromMachine(machine: Machine): void {
    if (!machine.machine_sequence) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'This machine does not have a sequence to remove',
      });
      return;
    }

    // Store machine for confirmation modal
    this.selectedMachineForRemoveSequence = machine;
    this.removeSequenceConfirmVisible = true;
  }

  // Confirmed removal of sequence
  doRemoveSequence(): void {
    if (!this.selectedMachineForRemoveSequence) return;

    const machine = this.selectedMachineForRemoveSequence;
    this.removeSequenceConfirmVisible = false;

    // Update machine with empty sequence
    this.machineService
      .updateMachineForm(machine._id, {
        machine_sequence: '',
      })
      .subscribe({
        next: (_response: any) => {
          // Update the machine in the list
          const machineIndex = this.machines.findIndex(
            m => m._id === machine._id
          );
          if (machineIndex !== -1) {
            this.machines[machineIndex] = {
              ...this.machines[machineIndex],
              machine_sequence: '',
            };
          }

          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: `Sequence removed successfully from "${machine.name}"`,
          });
          this.selectedMachineForRemoveSequence = null;
        },
        error: (error: any) => {
          console.error('Error removing sequence:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail:
              'Failed to remove sequence: ' +
              (error?.error?.message || error?.message || 'Unknown error'),
          });
          this.selectedMachineForRemoveSequence = null;
        },
      });
  }

  // Bulk selection methods
  toggleMachineSelection(machineId: string, event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.checked) {
      this.selectedMachineIds.add(machineId);
    } else {
      this.selectedMachineIds.delete(machineId);
    }
    this.updateSelectionState();
  }

  toggleSelectAll(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.checked) {
      // Select all machines on current page
      this.machines.forEach(m => this.selectedMachineIds.add(m._id));
    } else {
      // Deselect all machines on current page
      this.machines.forEach(m => this.selectedMachineIds.delete(m._id));
    }
    this.updateSelectionState();
  }

  updateSelectionState(): void {
    const currentPageIds = new Set(this.machines.map(m => m._id));
    const selectedOnPage = Array.from(this.selectedMachineIds).filter(id =>
      currentPageIds.has(id)
    );
    this.isAllSelected =
      this.machines.length > 0 &&
      selectedOnPage.length === this.machines.length;
    this.isIndeterminate =
      selectedOnPage.length > 0 && selectedOnPage.length < this.machines.length;
  }

  clearSelection(): void {
    this.selectedMachineIds.clear();
    this.updateSelectionState();
  }

  getSelectedMachines(): Machine[] {
    return this.machines.filter(m => this.selectedMachineIds.has(m._id));
  }

  getSelectedMachinesWithoutSequence(): Machine[] {
    return this.getSelectedMachines().filter(m => !m.machine_sequence);
  }

  // Bulk operations
  bulkGenerateSequences(): void {
    const selectedWithoutSequence = this.getSelectedMachinesWithoutSequence();
    if (selectedWithoutSequence.length === 0) {
      this.messageService.add({
        severity: 'info',
        summary: 'Info',
        detail: 'No selected machines without sequences',
      });
      return;
    }

    this.bulkGenerateConfirmVisible = true;
    this.pendingBulkGenerateMachines = selectedWithoutSequence;
  }

  doBulkGenerateSequences(): void {
    const machinesToProcess = [...this.pendingBulkGenerateMachines];
    this.bulkGenerateConfirmVisible = false;
    this.pendingBulkGenerateMachines = [];

    if (machinesToProcess.length === 0) return;

    this.isGeneratingSequence = true;
    this.sequenceGenerationProgress = 0;

    let completed = 0;
    const total = machinesToProcess.length;
    const errors: string[] = [];

    const processNext = (index: number): void => {
      if (index >= machinesToProcess.length) {
        this.isGeneratingSequence = false;
        this.sequenceGenerationProgress = 100;

        // Clear selection after successful generation
        machinesToProcess.forEach(m => this.selectedMachineIds.delete(m._id));
        this.updateSelectionState();
        this.reload();

        if (errors.length > 0) {
          this.messageService.add({
            severity: 'warn',
            summary: 'Partial Success',
            detail: `Generated sequences for ${completed} machine(s). ${errors.length} failed.`,
          });
        } else {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: `Successfully generated sequences for ${completed} machine(s)`,
          });
        }
        return;
      }

      const machine = machinesToProcess[index];
      if (!machine.category_id) {
        errors.push(machine.name);
        this.sequenceGenerationProgress = Math.round(
          ((index + 1) / total) * 100
        );
        processNext(index + 1);
        return;
      }

      const request: SequenceGenerationRequest = {
        categoryId:
          typeof machine.category_id === 'string'
            ? machine.category_id
            : machine.category_id._id,
        subcategoryId: machine.subcategory_id
          ? typeof machine.subcategory_id === 'string'
            ? machine.subcategory_id
            : (machine.subcategory_id as any)?._id
          : undefined,
      };

      this.categoryService.generateSequence(request).subscribe({
        next: (response: any) => {
          const generatedSequence = response.data.sequence;
          this.machineService
            .updateMachineForm(machine._id, {
              machine_sequence: generatedSequence,
            })
            .subscribe({
              next: () => {
                completed++;
                this.sequenceGenerationProgress = Math.round(
                  ((index + 1) / total) * 100
                );
                processNext(index + 1);
              },
              error: (_error: any) => {
                errors.push(machine.name);
                this.sequenceGenerationProgress = Math.round(
                  ((index + 1) / total) * 100
                );
                processNext(index + 1);
              },
            });
        },
        error: () => {
          errors.push(machine.name);
          this.sequenceGenerationProgress = Math.round(
            ((index + 1) / total) * 100
          );
          processNext(index + 1);
        },
      });
    };

    processNext(0);
  }

  confirmBulkDelete(): void {
    if (this.selectedMachineIds.size === 0) return;
    this.bulkDeleteConfirmVisible = true;
  }

  doBulkDelete(): void {
    const machineIds = Array.from(this.selectedMachineIds);
    if (machineIds.length === 0) {
      this.bulkDeleteConfirmVisible = false;
      return;
    }

    this.bulkDeleteConfirmVisible = false;

    // Delete machines one by one
    let completed = 0;
    let failed = 0;
    const total = machineIds.length;

    machineIds.forEach(id => {
      this.machineService.deleteMachine(id).subscribe({
        next: () => {
          completed++;
          this.selectedMachineIds.delete(id);
          if (completed + failed === total) {
            this.clearSelection();
            this.reload();
            if (failed === 0) {
              this.messageService.add({
                severity: 'success',
                summary: 'Success',
                detail: `Successfully deleted ${completed} machine(s)`,
              });
            } else {
              this.messageService.add({
                severity: 'warn',
                summary: 'Partial Success',
                detail: `Deleted ${completed} machine(s). ${failed} failed.`,
              });
            }
          }
        },
        error: (error: any) => {
          failed++;
          console.error(`Error deleting machine ${id}:`, error);
          if (completed + failed === total) {
            this.clearSelection();
            this.reload();
            this.messageService.add({
              severity: failed === total ? 'error' : 'warn',
              summary: failed === total ? 'Error' : 'Partial Success',
              detail:
                failed === total
                  ? 'Failed to delete machines'
                  : `Deleted ${completed} machine(s). ${failed} failed.`,
            });
          }
        },
      });
    });
  }
}
