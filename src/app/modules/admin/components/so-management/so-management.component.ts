import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  FormArray,
  Validators,
  AbstractControl,
} from '@angular/forms';
import { ListTableShellComponent } from '../shared/list/list-table-shell.component';
import { SOService } from '../../../../core/services/so.service';
import { SO, SOFilters } from '../../../../core/models/so.model';
import { AdminSidebarComponent } from '../shared/admin-sidebar/admin-sidebar.component';
import { TablePaginationComponent } from '../user-management/table-pagination.component';
import { CategoryService } from '../../../../core/services/category.service';
import { LoaderService } from '../../../../core/services/loader.service';
import { environment } from '../../../../../environments/environment';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { PageHeaderComponent } from '../../../../core/components/page-header/page-header.component';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-so-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
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
          title="SO Management"
          [sidebarCollapsed]="sidebarCollapsed"
          (toggleSidebar)="toggleSidebar()"
          [breadcrumbs]="[
            { label: 'Dashboard', route: '/admin/dashboard' },
            { label: 'SO Management' },
          ]"
        >
          <div headerActions class="flex items-center gap-2">
            <button
              class="px-4 py-2 bg-primary text-white rounded-md font-medium transition-colors duration-150 hover:bg-primary/90 cursor-pointer flex items-center gap-2 shadow-sm"
              (click)="openCreate()"
              title="Add new SO"
            >
              <i class="pi pi-plus text-sm"></i>
              Add SO
            </button>
          </div>
        </app-page-header>

        <main class="p-6 space-y-4">
          <!-- Custom Search with Autocomplete -->
          <div
            class="bg-bg border border-neutral-300 rounded-xl shadow-medium p-4"
          >
            <div class="flex flex-wrap gap-3 items-end">
              <div class="grow min-w-[220px] relative">
                <label class="block text-sm text-text-muted mb-1"
                  >Search SOs</label
                >
                <input
                  type="text"
                  class="w-full px-3 py-2 border border-neutral-300 rounded-md"
                  [(ngModel)]="searchInput"
                  (input)="onSearchInputChange()"
                  (focus)="showSearchSuggestions = true"
                  (blur)="hideSearchSuggestions()"
                  (keydown.enter)="onSearchEnter()"
                  placeholder="Search by SO number, Customer, or PO number..."
                  [ngModelOptions]="{ standalone: true }"
                />
                <!-- Search Suggestions Dropdown -->
                <div
                  *ngIf="showSearchSuggestions && searchSuggestions.length > 0"
                  class="absolute z-50 w-full mt-1 bg-white border border-neutral-300 rounded-md shadow-lg max-h-60 overflow-y-auto"
                >
                  <div
                    *ngFor="let so of searchSuggestions"
                    class="px-3 py-2 hover:bg-neutral-100 cursor-pointer text-sm border-b border-neutral-100 last:border-b-0"
                    (mousedown)="selectSearchSuggestion(so)"
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
                    </div>
                    <div class="text-xs text-neutral-600 mt-1">
                      <span *ngIf="so.customer"
                        >Customer: {{ so.customer }}</span
                      >
                      <span *ngIf="so.customer && so.po_number"> | </span>
                      <span *ngIf="so.po_number">PO: {{ so.po_number }}</span>
                      <span *ngIf="so.party_name">
                        | Party: {{ so.party_name }}</span
                      >
                    </div>
                  </div>
                </div>
                <div
                  *ngIf="
                    showSearchSuggestions &&
                    searchSuggestions.length === 0 &&
                    searchInput.trim()
                  "
                  class="absolute z-50 w-full mt-1 bg-white border border-neutral-300 rounded-md shadow-lg px-3 py-4 text-sm text-neutral-500 text-center"
                >
                  No SOs found matching "{{ searchInput }}"
                </div>
              </div>
              <div class="flex flex-wrap items-end gap-3">
                <select
                  class="px-3 py-2 border border-neutral-300 rounded-md"
                  [(ngModel)]="filters.is_active"
                  (change)="reload()"
                >
                  <option [ngValue]="undefined">All statuses</option>
                  <option [ngValue]="true">Active</option>
                  <option [ngValue]="false">Inactive</option>
                </select>
                <select
                  class="px-3 py-2 border border-neutral-300 rounded-md min-w-48"
                  [(ngModel)]="filters.category_id"
                  (change)="onCategoryFilterChange()"
                >
                  <option [ngValue]="undefined">All categories</option>
                  <option *ngFor="let cat of categories" [value]="cat._id">
                    {{ cat.name }}
                  </option>
                </select>
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
                  (click)="reload()"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>

          <app-list-table-shell title="Sales Orders">
            <table class="min-w-full text-sm">
              <thead>
                <tr class="bg-gray-50 text-left border-b border-gray-200">
                  <th
                    class="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider"
                  >
                    Customer
                  </th>
                  <th
                    class="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider"
                  >
                    P.O. Number
                  </th>
                  <th
                    class="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider"
                  >
                    S.O. Number
                  </th>
                  <th
                    class="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider"
                  >
                    Party Name
                  </th>
                  <th
                    class="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider"
                  >
                    Location
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
                  *ngFor="let so of sos"
                  class="hover:bg-gray-50 transition-colors duration-150"
                >
                  <td class="px-4 py-3 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">
                      {{ so.customer || '-' }}
                    </div>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap">
                    <div class="text-sm text-gray-900">
                      {{ so.po_number || '-' }}
                    </div>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap">
                    <div class="text-sm text-gray-900">
                      {{ so.so_number || '-' }}
                    </div>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap">
                    <div class="text-sm text-gray-900">
                      {{ so.party_name || '-' }}
                    </div>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap">
                    <div class="text-sm text-gray-900">
                      {{ so.location || '-' }}
                    </div>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap">
                    <div class="flex items-center gap-2">
                      <button
                        class="inline-flex items-center px-3 py-1.5 text-xs font-medium text-info bg-info/10 border border-info/20 rounded-md hover:bg-info/20 hover:border-info/30 transition-all duration-150 cursor-pointer shadow-sm"
                        (click)="openView(so)"
                        title="View SO details"
                      >
                        <i class="pi pi-eye text-xs mr-1"></i>
                        View
                      </button>
                      <button
                        *ngIf="canEditSO(so)"
                        class="inline-flex items-center px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 border border-primary/20 rounded-md hover:bg-primary/20 hover:border-primary/30 transition-all duration-150 cursor-pointer shadow-sm"
                        (click)="openEdit(so)"
                        title="Edit SO"
                      >
                        <i class="pi pi-pencil text-xs mr-1"></i>
                        Edit
                      </button>
                      <button
                        class="inline-flex items-center px-3 py-1.5 text-xs font-medium text-error bg-error/10 border border-error/20 rounded-md hover:bg-error/20 hover:border-error/30 transition-all duration-150 cursor-pointer shadow-sm"
                        (click)="confirmDelete(so)"
                        title="Delete SO"
                      >
                        <i class="pi pi-trash text-xs mr-1"></i>
                        Delete
                      </button>
                      <button
                        *ngIf="!so.is_active"
                        class="inline-flex items-center px-3 py-1.5 text-xs font-medium text-success bg-success/10 border border-success/20 rounded-md hover:bg-success/20 hover:border-success/30 transition-all duration-150 cursor-pointer shadow-sm"
                        (click)="activateSO(so)"
                        title="Activate SO"
                      >
                        <i class="pi pi-check text-xs mr-1"></i>
                        Activate
                      </button>
                      <button
                        *ngIf="so.is_active"
                        class="inline-flex items-center px-3 py-1.5 text-xs font-medium text-warning bg-warning/10 border border-warning/20 rounded-md hover:bg-warning/20 hover:border-warning/30 transition-all duration-150 cursor-pointer shadow-sm"
                        (click)="deactivateSO(so)"
                        title="Deactivate SO"
                      >
                        <i class="pi pi-times text-xs mr-1"></i>
                        Deactivate
                      </button>
                    </div>
                  </td>
                </tr>
                <tr *ngIf="sos.length === 0">
                  <td colspan="6" class="px-4 py-12 text-center text-gray-500">
                    <div class="flex flex-col items-center justify-center">
                      <i class="pi pi-inbox text-4xl text-gray-300 mb-2"></i>
                      <p class="text-sm font-medium">No SOs found</p>
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

          <!-- Create / Edit Modal -->
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
                  {{ editing ? 'Edit SO' : 'Add SO' }}
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
                  <div class="space-y-1">
                    <label class="text-sm">Customer *</label>
                    <input
                      type="text"
                      class="w-full border rounded px-3 py-2"
                      [class.border-red-500]="
                        (form.controls['customer'].touched &&
                          form.controls['customer'].invalid) ||
                        backendErrors['customer']
                      "
                      formControlName="customer"
                      placeholder="Enter customer (e.g., T0037 - fsnf skfsfn sfksn)"
                      (blur)="form.controls['customer'].markAsTouched()"
                      (input)="clearBackendError('customer')"
                    />
                    <div
                      class="text-xs text-error"
                      *ngIf="
                        form.controls['customer'].touched &&
                        form.controls['customer'].invalid
                      "
                    >
                      <span
                        *ngIf="form.controls['customer'].errors?.['required']"
                      >
                        Customer is required
                      </span>
                      <span
                        *ngIf="form.controls['customer'].errors?.['minlength']"
                      >
                        Customer must be at least 2 characters long
                      </span>
                      <span
                        *ngIf="form.controls['customer'].errors?.['maxlength']"
                      >
                        Customer cannot exceed 200 characters
                      </span>
                      <span
                        *ngIf="backendErrors['customer']"
                        class="text-error"
                      >
                        {{ backendErrors['customer'] }}
                      </span>
                    </div>
                  </div>

                  <div class="space-y-1">
                    <label class="text-sm">Location *</label>
                    <input
                      type="text"
                      class="w-full border rounded px-3 py-2"
                      [class.border-red-500]="
                        (form.controls['location'].touched &&
                          form.controls['location'].invalid) ||
                        backendErrors['location']
                      "
                      formControlName="location"
                      placeholder="Enter location"
                      (blur)="form.controls['location'].markAsTouched()"
                      (input)="clearBackendError('location')"
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
                      <span
                        *ngIf="backendErrors['location']"
                        class="text-error"
                      >
                        {{ backendErrors['location'] }}
                      </span>
                    </div>
                  </div>

                  <!-- P.O. Number and P.O. Date -->
                  <div class="grid grid-cols-2 gap-4">
                    <div class="space-y-1">
                      <label class="text-sm">P.O. Number *</label>
                      <input
                        type="text"
                        class="w-full border rounded px-3 py-2"
                        [class.border-red-500]="
                          (form.controls['po_number'].touched &&
                            form.controls['po_number'].invalid) ||
                          backendErrors['po_number']
                        "
                        formControlName="po_number"
                        placeholder="Enter P.O. Number"
                        (blur)="form.controls['po_number'].markAsTouched()"
                        (input)="clearBackendError('po_number')"
                      />
                      <div
                        class="text-xs text-error"
                        *ngIf="
                          form.controls['po_number'].touched &&
                          form.controls['po_number'].invalid
                        "
                      >
                        <span
                          *ngIf="
                            form.controls['po_number'].errors?.['required']
                          "
                        >
                          P.O. Number is required
                        </span>
                        <span
                          *ngIf="backendErrors['po_number']"
                          class="text-error"
                        >
                          {{ backendErrors['po_number'] }}
                        </span>
                      </div>
                    </div>
                    <div class="space-y-1">
                      <label class="text-sm">P.O. Date * (DD/MM/YYYY)</label>
                      <input
                        type="text"
                        class="w-full border rounded px-3 py-2"
                        [class.border-red-500]="
                          (form.controls['po_date'].touched &&
                            form.controls['po_date'].invalid) ||
                          backendErrors['po_date']
                        "
                        formControlName="po_date"
                        placeholder="DD/MM/YYYY"
                        maxlength="10"
                        (blur)="
                          formatDateField('po_date');
                          form.controls['po_date'].markAsTouched()
                        "
                        (input)="
                          onDateInput('po_date', $event);
                          clearBackendError('po_date')
                        "
                      />
                      <div
                        class="text-xs text-error"
                        *ngIf="
                          form.controls['po_date'].touched &&
                          form.controls['po_date'].invalid
                        "
                      >
                        <span
                          *ngIf="form.controls['po_date'].errors?.['required']"
                        >
                          P.O. Date is required
                        </span>
                        <span
                          *ngIf="
                            form.controls['po_date'].errors?.['invalidDate']
                          "
                        >
                          Invalid date format. Please use DD/MM/YYYY
                        </span>
                        <span
                          *ngIf="
                            form.controls['po_date'].errors?.['invalidFormat']
                          "
                        >
                          Date must be in DD/MM/YYYY format
                        </span>
                        <span
                          *ngIf="backendErrors['po_date']"
                          class="text-error"
                        >
                          {{ backendErrors['po_date'] }}
                        </span>
                      </div>
                    </div>
                  </div>

                  <!-- S.O. Number and S.O. Date -->
                  <div class="grid grid-cols-2 gap-4">
                    <div class="space-y-1">
                      <label class="text-sm">S.O. Number *</label>
                      <input
                        type="text"
                        class="w-full border rounded px-3 py-2"
                        [class.border-red-500]="
                          (form.controls['so_number'].touched &&
                            form.controls['so_number'].invalid) ||
                          backendErrors['so_number']
                        "
                        formControlName="so_number"
                        placeholder="Enter S.O. Number"
                        (blur)="form.controls['so_number'].markAsTouched()"
                        (input)="clearBackendError('so_number')"
                      />
                      <div
                        class="text-xs text-error"
                        *ngIf="
                          form.controls['so_number'].touched &&
                          form.controls['so_number'].invalid
                        "
                      >
                        <span
                          *ngIf="
                            form.controls['so_number'].errors?.['required']
                          "
                        >
                          S.O. Number is required
                        </span>
                        <span
                          *ngIf="backendErrors['so_number']"
                          class="text-error"
                        >
                          {{ backendErrors['so_number'] }}
                        </span>
                      </div>
                    </div>
                    <div class="space-y-1">
                      <label class="text-sm">S.O. Date * (DD/MM/YYYY)</label>
                      <input
                        type="text"
                        class="w-full border rounded px-3 py-2"
                        [class.border-red-500]="
                          (form.controls['so_date'].touched &&
                            form.controls['so_date'].invalid) ||
                          backendErrors['so_date']
                        "
                        formControlName="so_date"
                        placeholder="DD/MM/YYYY"
                        maxlength="10"
                        (blur)="
                          formatDateField('so_date');
                          form.controls['so_date'].markAsTouched()
                        "
                        (input)="
                          onDateInput('so_date', $event);
                          clearBackendError('so_date')
                        "
                      />
                      <div
                        class="text-xs text-error"
                        *ngIf="
                          form.controls['so_date'].touched &&
                          form.controls['so_date'].invalid
                        "
                      >
                        <span
                          *ngIf="form.controls['so_date'].errors?.['required']"
                        >
                          S.O. Date is required
                        </span>
                        <span
                          *ngIf="
                            form.controls['so_date'].errors?.['invalidDate']
                          "
                        >
                          Invalid date format. Please use DD/MM/YYYY
                        </span>
                        <span
                          *ngIf="
                            form.controls['so_date'].errors?.['invalidFormat']
                          "
                        >
                          Date must be in DD/MM/YYYY format
                        </span>
                        <span
                          *ngIf="backendErrors['so_date']"
                          class="text-error"
                        >
                          {{ backendErrors['so_date'] }}
                        </span>
                      </div>
                    </div>
                  </div>

                  <!-- Dynamic Items -->
                  <div class="space-y-2">
                    <div class="flex items-center justify-between">
                      <label class="text-sm font-medium"
                        >Items (Optional)</label
                      >
                      <button
                        type="button"
                        class="text-primary text-sm"
                        (click)="addItem()"
                      >
                        + Add Item
                      </button>
                    </div>
                    <div
                      class="rounded border border-neutral-200 divide-y"
                      formArrayName="items"
                    >
                      <div
                        class="p-3 space-y-3"
                        *ngFor="
                          let item of items.controls;
                          let i = index;
                          trackBy: trackByIndex
                        "
                        [formGroupName]="i"
                      >
                        <div class="flex items-center justify-between mb-2">
                          <span class="text-sm font-medium"
                            >Item {{ i + 1 }}</span
                          >
                          <button
                            type="button"
                            class="p-1 text-red-500 hover:bg-red-50 rounded"
                            (click)="removeItem(i)"
                            *ngIf="items.length > 0"
                          >
                            <i class="pi pi-trash text-sm"></i>
                          </button>
                        </div>
                        <div class="grid grid-cols-2 gap-3">
                          <div class="space-y-1">
                            <label class="text-xs">No. (Optional)</label>
                            <input
                              type="number"
                              class="w-full border rounded px-2 py-1 text-sm"
                              [class.border-red-500]="
                                backendErrors['items.' + i + '.no']
                              "
                              formControlName="no"
                              min="1"
                              placeholder="1"
                            />
                            <div
                              class="text-xs text-error"
                              *ngIf="backendErrors['items.' + i + '.no']"
                            >
                              {{ backendErrors['items.' + i + '.no'] }}
                            </div>
                          </div>
                          <div class="space-y-1">
                            <label class="text-xs">Item Code (Optional)</label>
                            <input
                              type="text"
                              class="w-full border rounded px-2 py-1 text-sm"
                              [class.border-red-500]="
                                backendErrors['items.' + i + '.item_code']
                              "
                              formControlName="item_code"
                              placeholder="Enter item code"
                            />
                            <div
                              class="text-xs text-error"
                              *ngIf="backendErrors['items.' + i + '.item_code']"
                            >
                              {{ backendErrors['items.' + i + '.item_code'] }}
                            </div>
                          </div>
                        </div>
                        <div class="space-y-1">
                          <label class="text-xs">Item Details (Optional)</label>
                          <input
                            type="text"
                            class="w-full border rounded px-2 py-1 text-sm"
                            [class.border-red-500]="
                              backendErrors['items.' + i + '.item_details']
                            "
                            formControlName="item_details"
                            placeholder="Enter item details"
                          />
                          <div
                            class="text-xs text-error"
                            *ngIf="
                              backendErrors['items.' + i + '.item_details']
                            "
                          >
                            {{ backendErrors['items.' + i + '.item_details'] }}
                          </div>
                        </div>
                        <div class="grid grid-cols-2 gap-3">
                          <div class="space-y-1">
                            <label class="text-xs">UOM (Optional)</label>
                            <input
                              type="text"
                              class="w-full border rounded px-2 py-1 text-sm"
                              [class.border-red-500]="
                                backendErrors['items.' + i + '.uom']
                              "
                              formControlName="uom"
                              placeholder="Enter UOM"
                            />
                            <div
                              class="text-xs text-error"
                              *ngIf="backendErrors['items.' + i + '.uom']"
                            >
                              {{ backendErrors['items.' + i + '.uom'] }}
                            </div>
                          </div>
                          <div class="space-y-1">
                            <label class="text-xs">Quantity (Optional)</label>
                            <input
                              type="number"
                              class="w-full border rounded px-2 py-1 text-sm"
                              [class.border-red-500]="
                                backendErrors['items.' + i + '.quantity']
                              "
                              formControlName="quantity"
                              min="0"
                              placeholder="0"
                            />
                            <div
                              class="text-xs text-error"
                              *ngIf="backendErrors['items.' + i + '.quantity']"
                            >
                              {{ backendErrors['items.' + i + '.quantity'] }}
                            </div>
                          </div>
                        </div>
                        <div class="grid grid-cols-2 gap-3">
                          <div class="space-y-1">
                            <label class="text-xs"
                              >Delivery Schedule (Optional)</label
                            >
                            <input
                              type="text"
                              class="w-full border rounded px-2 py-1 text-sm"
                              [class.border-red-500]="
                                backendErrors[
                                  'items.' + i + '.delivery_schedule'
                                ]
                              "
                              formControlName="delivery_schedule"
                              placeholder="DD/MM/YYYY"
                              maxlength="10"
                              (blur)="
                                formatItemDateField(i, 'delivery_schedule')
                              "
                              (input)="
                                onItemDateInput(i, 'delivery_schedule', $event)
                              "
                            />
                            <div
                              class="text-xs text-error"
                              *ngIf="
                                backendErrors[
                                  'items.' + i + '.delivery_schedule'
                                ]
                              "
                            >
                              {{
                                backendErrors[
                                  'items.' + i + '.delivery_schedule'
                                ]
                              }}
                            </div>
                          </div>
                          <div class="space-y-1">
                            <label class="text-xs">Total (Optional)</label>
                            <input
                              type="number"
                              class="w-full border rounded px-2 py-1 text-sm"
                              [class.border-red-500]="
                                backendErrors['items.' + i + '.total']
                              "
                              formControlName="total"
                              min="0"
                              placeholder="0"
                            />
                            <div
                              class="text-xs text-error"
                              *ngIf="backendErrors['items.' + i + '.total']"
                            >
                              {{ backendErrors['items.' + i + '.total'] }}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="space-y-1">
                    <label class="text-sm">Category *</label>
                    <select
                      class="w-full border rounded px-3 py-2"
                      [class.border-red-500]="
                        (form.controls['category_id'].touched &&
                          form.controls['category_id'].invalid) ||
                        backendErrors['category_id']
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
                        Category is required
                      </span>
                      <span
                        *ngIf="backendErrors['category_id']"
                        class="text-error"
                      >
                        {{ backendErrors['category_id'] }}
                      </span>
                    </div>
                  </div>

                  <div class="space-y-1" *ngIf="subcategories.length > 0">
                    <label class="text-sm">Subcategory (Optional)</label>
                    <select
                      class="w-full border rounded px-3 py-2"
                      formControlName="subcategory_id"
                      (change)="onSubcategoryChange()"
                    >
                      <option value="">No subcategory</option>
                      <option *ngFor="let sc of subcategories" [value]="sc._id">
                        {{ sc.name }}
                      </option>
                    </select>
                  </div>

                  <div class="space-y-1">
                    <label class="text-sm">Party Name *</label>
                    <input
                      type="text"
                      class="w-full border rounded px-3 py-2"
                      [class.border-red-500]="
                        (form.controls['party_name'].touched &&
                          form.controls['party_name'].invalid) ||
                        backendErrors['party_name']
                      "
                      formControlName="party_name"
                      placeholder="Enter party/company name"
                      (blur)="form.controls['party_name'].markAsTouched()"
                      (input)="clearBackendError('party_name')"
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
                        *ngIf="backendErrors['party_name']"
                        class="text-error"
                      >
                        {{ backendErrors['party_name'] }}
                      </span>
                    </div>
                  </div>

                  <div class="space-y-1">
                    <label class="text-sm">Mobile Number *</label>
                    <input
                      type="tel"
                      class="w-full border rounded px-3 py-2"
                      [class.border-red-500]="
                        (form.controls['mobile_number'].touched &&
                          form.controls['mobile_number'].invalid) ||
                        backendErrors['mobile_number']
                      "
                      formControlName="mobile_number"
                      placeholder="Enter mobile number (e.g., +1234567890, (123) 456-7890)"
                      (blur)="form.controls['mobile_number'].markAsTouched()"
                      (input)="clearBackendError('mobile_number')"
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
                        Mobile number must be at least 10 characters
                      </span>
                      <span
                        *ngIf="
                          form.controls['mobile_number'].errors?.['pattern']
                        "
                      >
                        Invalid mobile number format. Use format like:
                        +1234567890, (123) 456-7890, or 123-456-7890
                      </span>
                      <span
                        *ngIf="backendErrors['mobile_number']"
                        class="text-error"
                      >
                        {{ backendErrors['mobile_number'] }}
                      </span>
                    </div>
                  </div>

                  <div class="space-y-1">
                    <label class="text-sm">Description (Optional)</label>
                    <textarea
                      class="w-full border rounded px-3 py-2"
                      formControlName="description"
                      placeholder="Enter description (max 1000 characters)"
                      rows="3"
                    ></textarea>
                    <div
                      class="text-xs text-error"
                      *ngIf="
                        form.controls['description'].touched &&
                        form.controls['description'].invalid
                      "
                    >
                      <span
                        *ngIf="
                          form.controls['description'].errors?.['maxlength']
                        "
                      >
                        Description cannot exceed 50000 characters
                      </span>
                      <span
                        *ngIf="backendErrors['description']"
                        class="text-error"
                      >
                        {{ backendErrors['description'] }}
                      </span>
                    </div>
                  </div>

                  <!-- Documents section -->
                  <div class="space-y-2">
                    <label class="text-sm">Documents (Optional, max 10)</label>
                    <input
                      #documentInput
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
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
                          PDF, DOC, DOCX, XLS, XLSX, TXT up to 10 files
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
                </form>
              </div>
              <div
                class="flex items-center justify-end gap-2 p-4 border-t border-neutral-200 shrink-0"
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
                  [disabled]="
                    (editing ? !form.dirty : form.invalid) || submitting
                  "
                  [title]="
                    form.invalid && !editing
                      ? 'Please fix validation errors before submitting'
                      : submitting
                        ? 'Saving...'
                        : editing && !form.dirty
                          ? 'No changes to save'
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

          <!-- View Modal -->
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
                <h3 class="text-lg font-semibold text-text">SO Details</h3>
                <button
                  class="p-2 text-text-muted hover:bg-neutral-100 rounded-md"
                  (click)="viewVisible = false"
                >
                  <i class="pi pi-times"></i>
                </button>
              </div>
              <div class="flex-1 overflow-y-auto p-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <!-- Name (if exists) -->
                  <div class="md:col-span-2" *ngIf="selected?.name">
                    <span class="block text-xs text-text-muted mb-1">Name</span>
                    <span class="text-sm font-medium">{{
                      selected?.name
                    }}</span>
                  </div>

                  <!-- Customer -->
                  <div class="md:col-span-1">
                    <span class="block text-xs text-text-muted mb-1"
                      >Customer</span
                    >
                    <span class="text-sm">{{ selected?.customer || '-' }}</span>
                  </div>

                  <!-- Location -->
                  <div class="md:col-span-1">
                    <span class="block text-xs text-text-muted mb-1"
                      >Location</span
                    >
                    <span class="text-sm">{{ selected?.location || '-' }}</span>
                  </div>

                  <!-- P.O. Number -->
                  <div class="md:col-span-1">
                    <span class="block text-xs text-text-muted mb-1"
                      >P.O. Number</span
                    >
                    <span class="text-sm">{{
                      selected?.po_number || '-'
                    }}</span>
                  </div>

                  <!-- P.O. Date -->
                  <div class="md:col-span-1">
                    <span class="block text-xs text-text-muted mb-1"
                      >P.O. Date</span
                    >
                    <span class="text-sm">{{
                      selected?.po_date
                        ? (selected?.po_date | date: 'dd/MM/yyyy')
                        : '-'
                    }}</span>
                  </div>

                  <!-- S.O. Number -->
                  <div class="md:col-span-1">
                    <span class="block text-xs text-text-muted mb-1"
                      >S.O. Number</span
                    >
                    <span class="text-sm">{{
                      selected?.so_number || '-'
                    }}</span>
                  </div>

                  <!-- S.O. Date -->
                  <div class="md:col-span-1">
                    <span class="block text-xs text-text-muted mb-1"
                      >S.O. Date</span
                    >
                    <span class="text-sm">{{
                      selected?.so_date
                        ? (selected?.so_date | date: 'dd/MM/yyyy')
                        : '-'
                    }}</span>
                  </div>

                  <!-- Category -->
                  <div class="md:col-span-1">
                    <span class="block text-xs text-text-muted mb-1"
                      >Category</span
                    >
                    <span class="text-sm">{{
                      selected?.category_id?.name || '-'
                    }}</span>
                  </div>

                  <!-- Subcategory -->
                  <div class="md:col-span-1">
                    <span class="block text-xs text-text-muted mb-1"
                      >Subcategory</span
                    >
                    <span *ngIf="selected?.subcategory_id" class="text-sm">
                      {{ selected?.subcategory_id?.name }}
                    </span>
                    <span
                      *ngIf="!selected?.subcategory_id"
                      class="text-gray-400 text-sm"
                      >-</span
                    >
                  </div>

                  <!-- Party Name -->
                  <div class="md:col-span-1">
                    <span class="block text-xs text-text-muted mb-1"
                      >Party Name</span
                    >
                    <span class="text-sm">{{
                      selected?.party_name || '-'
                    }}</span>
                  </div>

                  <!-- Mobile Number -->
                  <div class="md:col-span-1">
                    <span class="block text-xs text-text-muted mb-1"
                      >Mobile Number</span
                    >
                    <span class="text-sm">{{
                      selected?.mobile_number || '-'
                    }}</span>
                  </div>

                  <!-- Description -->
                  <div class="md:col-span-2">
                    <span class="block text-xs text-text-muted mb-1"
                      >Description</span
                    >
                    <span class="text-sm">{{
                      selected?.description || '-'
                    }}</span>
                  </div>

                  <!-- Items -->
                  <div
                    class="md:col-span-2"
                    *ngIf="
                      selected?.items && (selected?.items?.length ?? 0) > 0
                    "
                  >
                    <span class="block text-xs text-text-muted mb-2"
                      >Items</span
                    >
                    <div class="border border-neutral-200 rounded-md divide-y">
                      <ng-container *ngIf="selected && selected.items">
                        <div
                          *ngFor="let item of selected.items; let i = index"
                          class="p-3 space-y-2"
                        >
                          <div class="flex items-center justify-between">
                            <span class="text-sm font-medium"
                              >Item {{ i + 1 }}</span
                            >
                          </div>
                          <div class="grid grid-cols-2 gap-3 text-sm">
                            <div *ngIf="item.no">
                              <span class="text-text-muted text-xs">No.:</span>
                              <span class="ml-2">{{ item.no }}</span>
                            </div>
                            <div *ngIf="item.item_code">
                              <span class="text-text-muted text-xs"
                                >Item Code:</span
                              >
                              <span class="ml-2">{{ item.item_code }}</span>
                            </div>
                            <div *ngIf="item.item_details" class="col-span-2">
                              <span class="text-text-muted text-xs"
                                >Item Details:</span
                              >
                              <span class="ml-2">{{ item.item_details }}</span>
                            </div>
                            <div *ngIf="item.uom">
                              <span class="text-text-muted text-xs">UOM:</span>
                              <span class="ml-2">{{ item.uom }}</span>
                            </div>
                            <div
                              *ngIf="
                                item.quantity !== undefined &&
                                item.quantity !== null
                              "
                            >
                              <span class="text-text-muted text-xs"
                                >Quantity:</span
                              >
                              <span class="ml-2">{{ item.quantity }}</span>
                            </div>
                            <div *ngIf="item.delivery_schedule">
                              <span class="text-text-muted text-xs"
                                >Delivery Schedule:</span
                              >
                              <span class="ml-2">{{
                                item.delivery_schedule | date: 'dd/MM/yyyy'
                              }}</span>
                            </div>
                            <div
                              *ngIf="
                                item.total !== undefined && item.total !== null
                              "
                            >
                              <span class="text-text-muted text-xs"
                                >Total:</span
                              >
                              <span class="ml-2">{{ item.total }}</span>
                            </div>
                          </div>
                        </div>
                      </ng-container>
                    </div>
                  </div>

                  <!-- Status -->
                  <div class="md:col-span-1">
                    <span class="block text-xs text-text-muted mb-1"
                      >Status</span
                    >
                    <span
                      class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                      [ngClass]="{
                        'bg-success/20 text-success': selected?.is_active,
                        'bg-warning/20 text-warning': !selected?.is_active,
                      }"
                    >
                      {{ selected?.is_active ? 'Active' : 'Inactive' }}
                    </span>
                  </div>

                  <!-- Created By -->
                  <div class="md:col-span-1">
                    <span class="block text-xs text-text-muted mb-1"
                      >Created By</span
                    >
                    <span class="text-sm">
                      {{ selected?.created_by?.username || '-' }}
                      <span
                        *ngIf="selected?.created_by?.email"
                        class="text-text-muted"
                      >
                        ({{ selected?.created_by?.email }})
                      </span>
                    </span>
                  </div>

                  <!-- Updated By -->
                  <div class="md:col-span-1">
                    <span class="block text-xs text-text-muted mb-1"
                      >Updated By</span
                    >
                    <span class="text-sm">{{
                      selected?.updatedBy?.username || '—'
                    }}</span>
                  </div>

                  <!-- Created Date -->
                  <div class="md:col-span-1">
                    <span class="block text-xs text-text-muted mb-1"
                      >Created Date</span
                    >
                    <span class="text-sm">{{
                      selected?.createdAt | date: 'medium'
                    }}</span>
                  </div>

                  <!-- Updated Date -->
                  <div class="md:col-span-1">
                    <span class="block text-xs text-text-muted mb-1"
                      >Updated Date</span
                    >
                    <span class="text-sm">{{
                      selected?.updatedAt | date: 'medium'
                    }}</span>
                  </div>

                  <!-- Documents -->
                  <div class="md:col-span-2">
                    <div class="flex items-center justify-between mb-1">
                      <span class="block text-xs text-text-muted"
                        >Documents</span
                      >
                    </div>
                    <div
                      class="mt-1 flex gap-2 flex-wrap"
                      *ngIf="selected?.documents?.length; else nodocs"
                    >
                      <div
                        *ngFor="
                          let doc of selected?.documents;
                          let i = index;
                          trackBy: trackByIndex
                        "
                        class="flex items-center gap-2 px-3 py-2 bg-neutral-100 rounded-md border text-sm hover:bg-neutral-200 transition-colors"
                      >
                        <i class="pi pi-file text-primary"></i>
                        <span class="truncate max-w-40 font-medium">{{
                          doc.name
                        }}</span>
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
                </div>
              </div>
              <div
                class="flex items-center justify-end gap-2 p-4 border-t border-neutral-200 shrink-0"
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

          <!-- Delete Confirmation Modal -->
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
                <h3 class="text-lg font-semibold text-text">Delete SO</h3>
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
                  [disabled]="submitting"
                >
                  <i *ngIf="submitting" class="pi pi-spinner pi-spin mr-1"></i>
                  Delete
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>

      <!-- Toast Component -->
      <p-toast></p-toast>
    </div>
  `,
})
export class SOManagementComponent implements OnInit, OnDestroy {
  // Data properties
  sos: SO[] = [];
  total = 0;
  pages = 1;
  page = 1;
  limit = 10;
  filters: SOFilters = {
    sortBy: 'createdAt',
    sortOrder: 'desc',
  };

  // UI state
  sidebarCollapsed = false;
  formVisible = false;
  viewVisible = false;
  confirmVisible = false;
  editing = false;
  selected: SO | null = null;
  loading = false;
  submitting = false;
  formLoading = false;

  // Form
  form: FormGroup;

  // Categories
  categories: Array<{
    _id: string;
    name: string;
    level: number;
  }> = [];
  subcategories: Array<{ _id: string; name: string; level: number }> = [];

  // Documents
  selectedDocuments: File[] = [];
  existingDocuments: any[] = [];
  removedDocuments: any[] = [];
  isDocumentDragging = false;

  // Search debounce
  private searchInput$ = new Subject<string>();
  private subs = new Subscription();

  // Search autocomplete
  searchInput = '';
  searchSuggestions: SO[] = [];
  showSearchSuggestions = false;
  allSOs: SO[] = [];

  // Backend validation errors
  backendErrors: { [key: string]: string } = {};

  // ViewChild for document input
  @ViewChild('documentInput') documentInput!: ElementRef<HTMLInputElement>;

  constructor(
    private soService: SOService,
    private fb: FormBuilder,
    private categoryService: CategoryService,
    private messageService: MessageService,
    private loaderService: LoaderService,
    private authService: AuthService
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.maxLength(100)]],
      customer: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(200),
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
      po_number: ['', [Validators.required, Validators.maxLength(200)]],
      po_date: ['', [Validators.required, this.dateFormatValidator]],
      so_number: ['', [Validators.required, Validators.maxLength(200)]],
      so_date: ['', [Validators.required, this.dateFormatValidator]],
      items: this.fb.array([]),
      category_id: [
        '',
        [Validators.required, Validators.pattern(/^[0-9a-fA-F]{24}$/)],
      ],
      subcategory_id: ['', [this.subcategoryIdValidator]],
      party_name: [
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
          Validators.pattern(
            /^[+]?[(]?[0-9]{1,4}[)]?[-\\s.]?[(]?[0-9]{1,4}[)]?[-\\s.]?[0-9]{1,9}$/
          ),
        ],
      ],
      description: ['', [Validators.maxLength(50000)]],
      documents: [null],
    });
    // Items are optional - no initial item needed
  }

  ngOnInit(): void {
    this.loadCategories();
    this.loadAllSOsForSearch();
    this.reload();

    // Debounce search input
    const s = this.searchInput$
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(term => {
        this.filters.search = term;
        this.page = 1;
        this.reload();
      });
    this.subs.add(s);
  }

  // Load all SOs for autocomplete suggestions
  loadAllSOsForSearch(): void {
    this.soService.getAllSOs({ is_active: true }).subscribe({
      next: response => {
        if (response.success && response.data) {
          this.allSOs = response.data.sos || [];
        }
      },
      error: err => {
        console.error('Error loading SOs for search:', err);
      },
    });
  }

  // Handle search input changes for autocomplete
  onSearchInputChange(): void {
    const query = this.searchInput.trim().toLowerCase();

    // Update search filter for backend search
    this.filters.search = this.searchInput.trim();

    if (query.length === 0) {
      this.searchSuggestions = [];
      this.showSearchSuggestions = false;
      // Clear search filter
      this.filters.search = '';
      this.page = 1;
      this.reload();
      return;
    }

    // Filter SOs based on SO number, Customer, or PO number for suggestions
    this.searchSuggestions = this.allSOs
      .filter(so => {
        const soNumberMatch =
          so.so_number?.toLowerCase().includes(query) || false;
        const customerMatch =
          so.customer?.toLowerCase().includes(query) || false;
        const poNumberMatch =
          so.po_number?.toLowerCase().includes(query) || false;
        return soNumberMatch || customerMatch || poNumberMatch;
      })
      .slice(0, 10); // Limit to 10 suggestions

    this.showSearchSuggestions = true;

    // Debounce the actual search
    this.searchInput$.next(this.searchInput.trim());
  }

  // Select a search suggestion
  selectSearchSuggestion(so: SO): void {
    // Set search input to show selected SO
    this.searchInput = so.so_number || so.customer || '';
    this.searchSuggestions = [];
    this.showSearchSuggestions = false;

    // Set search filter and reload
    this.filters.search = so.so_number || so.customer || '';
    this.page = 1;
    this.reload();
  }

  // Hide search suggestions
  hideSearchSuggestions(): void {
    // Delay to allow click event to fire
    setTimeout(() => {
      this.showSearchSuggestions = false;
    }, 200);
  }

  // Handle Enter key press in search
  onSearchEnter(): void {
    if (this.searchSuggestions.length > 0) {
      // Select first suggestion
      this.selectSearchSuggestion(this.searchSuggestions[0]);
    } else {
      // Perform search with current input
      this.showSearchSuggestions = false;
      this.filters.search = this.searchInput.trim();
      this.page = 1;
      this.reload();
    }
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  reload(): void {
    this.loading = true;
    this.loaderService.showGlobalLoader();
    this.soService
      .getAllSOs({
        page: this.page,
        limit: this.limit,
        search: this.filters.search,
        is_active: this.filters.is_active,
        category_id: this.filters.category_id,
        sortBy: this.filters.sortBy,
        sortOrder: this.filters.sortOrder,
      })
      .subscribe({
        next: res => {
          this.sos = res.data.sos;
          this.total = res.data.total;
          this.pages = res.data.pages;
          this.loading = false;
          this.loaderService.hideGlobalLoader();
        },
        error: error => {
          console.error('Error loading SOs:', error);
          this.loading = false;
          this.loaderService.hideGlobalLoader();
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load SOs. Please try again.',
          });
        },
      });
  }

  onPageChange(p: number): void {
    this.page = p;
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
    // Clear items array - items are optional
    while (this.items.length !== 0) {
      this.items.removeAt(0);
    }
    this.formVisible = true;
    this.selectedDocuments = [];
    this.existingDocuments = [];
    this.removedDocuments = [];
    this.subcategories = [];
    this.isDocumentDragging = false;
    this.backendErrors = {};
  }

  openView(so: SO): void {
    this.selected = so;
    this.viewVisible = true;
  }

  openEdit(so: SO): void {
    // Check if user is subadmin and SO is activated - prevent editing
    const currentUser = this.authService.getCurrentUser();
    const userRole = currentUser?.role?.name?.toLowerCase();
    const isSubAdmin = userRole === 'sub-admin';

    if (isSubAdmin && so.is_active) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Edit Restricted',
        detail:
          'Sub-admins cannot edit activated SOs. Please contact an admin to deactivate the SO first.',
      });
      return;
    }

    this.editing = true;
    this.formVisible = true;
    this.formLoading = true;
    this.selected = null; // Clear previous selection
    this.form.reset(); // Reset form first
    // Clear items array
    while (this.items.length !== 0) {
      this.items.removeAt(0);
    }
    this.selectedDocuments = [];
    this.existingDocuments = [];
    this.removedDocuments = [];
    this.subcategories = [];
    this.backendErrors = {};
    const id = so._id;
    this.soService.getSOById(id).subscribe({
      next: res => {
        const s = res.data;
        this.selected = s;
        // Clear items array
        while (this.items.length !== 0) {
          this.items.removeAt(0);
        }
        // Load items
        if (s.items && s.items.length > 0) {
          s.items.forEach((item: any) => {
            const itemGroup = this.fb.group({
              no: [item.no || 0, [Validators.min(1)]],
              item_code: [item.item_code || '', [Validators.maxLength(100)]],
              item_details: [
                item.item_details || '',
                [Validators.maxLength(500)],
              ],
              uom: [item.uom || '', [Validators.maxLength(50)]],
              quantity: [item.quantity || 0, [Validators.min(0)]],
              delivery_schedule: [
                this.formatDateForDisplay(item.delivery_schedule) || '',
              ],
              total: [item.total || 0, [Validators.min(0)]],
            });
            this.items.push(itemGroup);
          });
        } else {
          this.addItem();
        }

        // Format dates for input fields (DD/MM/YYYY)

        this.form.patchValue({
          name: s.name || '',
          customer: s.customer || '',
          location: s.location || '',
          po_number: s.po_number || '',
          po_date: this.formatDateForDisplay(s.po_date),
          so_number: s.so_number || '',
          so_date: this.formatDateForDisplay(s.so_date),
          category_id:
            typeof s.category_id === 'string'
              ? s.category_id
              : s.category_id?._id,
          subcategory_id: s.subcategory_id
            ? typeof s.subcategory_id === 'string'
              ? s.subcategory_id
              : s.subcategory_id?._id || ''
            : '',
          party_name: s.party_name || '',
          mobile_number: s.mobile_number || '',
          description: s.description || '',
        });

        // Reset client-side selections
        this.selectedDocuments = [];
        this.isDocumentDragging = false;

        // Load existing documents
        this.existingDocuments = s.documents || [];

        // Load subcategories for the selected category
        if (s.category_id) {
          const categoryId =
            typeof s.category_id === 'string'
              ? s.category_id
              : s.category_id?._id;
          if (categoryId) {
            this.loadSubcategories(categoryId);
          }
        }
        this.formLoading = false;
      },
      error: error => {
        console.error('Error loading SO:', error);
        this.formLoading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load SO details.',
        });
        this.closeForm();
      },
    });
  }

  closeForm(): void {
    this.formVisible = false;
    this.formLoading = false;
    this.submitting = false;
    this.editing = false;
    this.selected = null;
    this.form.reset();
    // Clear items array
    while (this.items.length !== 0) {
      this.items.removeAt(0);
    }
    this.selectedDocuments = [];
    this.existingDocuments = [];
    this.removedDocuments = [];
    this.subcategories = [];
    this.isDocumentDragging = false;
    this.backendErrors = {};
  }

  /**
   * Get display name for SO (for delete confirmation, etc.)
   */
  getSODisplayName(so: SO | null): string {
    if (!so) return 'this SO';
    return so.customer || so.so_number || so.po_number || so.name || 'this SO';
  }

  /**
   * Check if current user can edit the SO
   * Sub-admins can only edit SOs that are not activated
   */
  canEditSO(so: SO): boolean {
    const currentUser = this.authService.getCurrentUser();
    const userRole = currentUser?.role?.name?.toLowerCase();
    const isSubAdmin = userRole === 'sub-admin';

    // Sub-admins cannot edit activated SOs
    if (isSubAdmin && so.is_active) {
      return false;
    }

    // Admins can always edit
    return true;
  }

  /**
   * Handle backend validation errors and set them on form controls
   */
  private handleBackendErrors(err: any): void {
    this.backendErrors = {};

    // Check multiple possible error response formats
    let errorDetails: any[] = [];

    // Format 1: err.error.details (array with field and message)
    if (err?.error?.details && Array.isArray(err.error.details)) {
      errorDetails = err.error.details;
    }
    // Format 2: err.error.data (alternative structure)
    else if (err?.error?.data && Array.isArray(err.error.data)) {
      errorDetails = err.error.data;
    }
    // Format 3: Direct array in error
    else if (Array.isArray(err?.error)) {
      errorDetails = err.error;
    }

    // Process error details
    if (errorDetails.length > 0) {
      errorDetails.forEach((detail: any) => {
        // Try different field name variations
        const field =
          detail.field ||
          detail.path?.join('.') ||
          (Array.isArray(detail.path) ? detail.path.join('.') : detail.path) ||
          detail.key ||
          detail.name;

        // Try different message variations
        const message =
          detail.message || detail.msg || detail.error || 'Invalid value';

        if (field) {
          // Map backend field names to form control names if needed
          const formFieldName = this.mapBackendFieldToFormControl(field);
          this.backendErrors[formFieldName] = message;

          // Handle items array errors separately (already handled in mapBackendFieldToFormControl)
          if (!field.startsWith('items.')) {
            // Set error on form control for non-items fields
            const control = this.form.get(formFieldName);
            if (control) {
              control.setErrors({ backendError: true });
              control.markAsTouched();
            }
          }
        }
      });
    } else if (err?.error?.message) {
      // If there's a general error message but no field-specific errors
      // Don't show toast here - let the calling method handle it
    }
  }

  /**
   * Map backend field names to form control names
   */
  private mapBackendFieldToFormControl(backendField: string): string {
    // Handle items array field errors (e.g., "items.0.item_code" or "items.1.quantity")
    const itemsMatch = backendField.match(/^items\.(\d+)\.(.+)$/);
    if (itemsMatch) {
      const itemIndex = parseInt(itemsMatch[1], 10);
      const itemField = itemsMatch[2];
      // Store error with item index for display
      const errorKey = `items.${itemIndex}.${itemField}`;
      // Set error on the specific item form control
      const itemControl = this.items.at(itemIndex)?.get(itemField);
      if (itemControl) {
        itemControl.setErrors({ backendError: true });
        itemControl.markAsTouched();
      }
      return errorKey;
    }

    // Handle common field name mappings
    const mappings: { [key: string]: string } = {
      mobile_number: 'mobile_number',
      party_name: 'party_name',
      category_id: 'category_id',
      subcategory_id: 'subcategory_id',
      name: 'name',
      description: 'description',
      customer: 'customer',
      location: 'location',
      po_number: 'po_number',
      po_date: 'po_date',
      so_number: 'so_number',
      so_date: 'so_date',
      items: 'items',
    };

    return mappings[backendField] || backendField;
  }

  /**
   * Clear backend error for a specific field when user starts typing
   */
  clearBackendError(fieldName: string): void {
    if (this.backendErrors[fieldName]) {
      delete this.backendErrors[fieldName];
      const control = this.form.get(fieldName);
      if (control && control.errors?.['backendError']) {
        const errors = { ...control.errors };
        delete errors['backendError'];
        control.setErrors(Object.keys(errors).length > 0 ? errors : null);
      }
    }
  }

  submitForm(): void {
    // Mark all fields as touched to show validation errors
    Object.keys(this.form.controls).forEach(key => {
      this.form.get(key)?.markAsTouched();
    });

    if (this.submitting) {
      return;
    }

    // Validate the form
    if (this.form.invalid) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation Error',
        detail: 'Please fix the errors in the form before submitting.',
      });
      return;
    }

    this.submitting = true;

    // Extract and sanitize form values
    const name = (this.form.value.name || '').trim();
    const customer = (this.form.value.customer || '').trim();
    const location = (this.form.value.location || '').trim();
    const po_number = (this.form.value.po_number || '').trim();
    // Parse dates from DD/MM/YYYY to YYYY-MM-DD for backend
    const po_date = this.parseDate(this.form.value.po_date);
    if (!po_date) {
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'P.O. Date is required and must be in DD/MM/YYYY format',
      });
      this.submitting = false;
      return;
    }
    const so_number = (this.form.value.so_number || '').trim();
    const so_date = this.parseDate(this.form.value.so_date);
    if (!so_date) {
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'S.O. Date is required and must be in DD/MM/YYYY format',
      });
      this.submitting = false;
      return;
    }
    // Filter out empty items and only include items with at least one field filled
    const items = this.items.value
      .map((item: any, index: number) => {
        const hasData =
          (item.item_code && item.item_code.trim()) ||
          (item.item_details && item.item_details.trim()) ||
          (item.uom && item.uom.trim()) ||
          item.quantity > 0;

        if (!hasData) return null;

        return {
          no: item.no || index + 1,
          item_code: (item.item_code || '').trim(),
          item_details: (item.item_details || '').trim(),
          uom: (item.uom || '').trim(),
          quantity: item.quantity || 0,
          delivery_schedule:
            item.delivery_schedule && item.delivery_schedule.trim()
              ? this.parseDate(item.delivery_schedule)
              : undefined,
          total: item.total || undefined,
        };
      })
      .filter((item: any) => item !== null);

    // Ensure items is always an array (even if empty)
    const finalItems = Array.isArray(items) ? items : [];

    console.log('📋 Component prepared items:', {
      formItemsValue: this.items.value,
      filteredItems: items,
      finalItems,
      finalItemsIsArray: Array.isArray(finalItems),
      finalItemsLength: finalItems.length,
    });

    const category_id = (this.form.value.category_id || '').trim();
    const party_name = (this.form.value.party_name || '').trim();
    const mobile_number = (this.form.value.mobile_number || '').trim();
    const description = (this.form.value.description || '').trim();

    // Handle subcategory_id
    let subcategory_id: string | null = null;
    const subcategoryValue = this.form.value.subcategory_id;
    if (subcategoryValue) {
      if (typeof subcategoryValue === 'string') {
        subcategory_id = subcategoryValue.trim() || null;
      }
    }

    if (this.editing && this.selected) {
      // Update SO
      const updateData: any = {
        name: name || undefined,
        customer,
        location,
        po_number,
        po_date,
        so_number,
        so_date,
        category_id,
        party_name,
        mobile_number,
        description: description || null,
        documents: this.selectedDocuments,
        removedDocuments: this.removedDocuments,
      };

      // Always include items as array (even if empty) to satisfy backend validation
      updateData.items = finalItems;

      if (subcategory_id !== null) {
        updateData.subcategory_id = subcategory_id;
      } else {
        updateData.subcategory_id = '';
      }

      this.soService.updateSOForm(this.selected._id, updateData).subscribe({
        next: _response => {
          this.submitting = false;
          this.formVisible = false;
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'SO updated successfully',
          });

          // If view modal is open, refresh the selected SO data
          if (this.viewVisible && this.selected) {
            this.soService.getSOById(this.selected._id).subscribe({
              next: res => {
                this.selected = res.data;
              },
              error: err => {
                console.error('Error refreshing SO in view modal:', err);
              },
            });
          }

          this.reload();
        },
        error: (err: any) => {
          this.submitting = false;
          console.error('Error updating SO:', err);

          // Handle backend validation errors
          this.handleBackendErrors(err);

          // Show general error message if no field-specific errors
          if (Object.keys(this.backendErrors).length === 0) {
            let errorMessage = 'Failed to update SO';
            if (err?.error?.message) {
              errorMessage = err.error.message;
            } else if (err?.message) {
              errorMessage = err.message;
            }
            this.messageService.add({
              severity: 'error',
              summary: 'Update Failed',
              detail: errorMessage,
            });
          } else {
            // Show toast with field errors summary
            const errorFields = Object.keys(this.backendErrors);
            this.messageService.add({
              severity: 'error',
              summary: 'Validation Failed',
              detail: `Please fix errors in: ${errorFields.join(', ')}`,
            });
          }
        },
      });
    } else {
      // Create SO
      const createData: any = {
        name: name || undefined,
        customer,
        location,
        po_number,
        po_date,
        so_number,
        so_date,
        category_id,
        party_name,
        mobile_number,
        description: description || null,
        documents: this.selectedDocuments,
      };

      // Always include items as array (even if empty) to satisfy backend validation
      createData.items = finalItems;

      if (subcategory_id) {
        createData.subcategory_id = subcategory_id;
      }

      this.soService.createSOForm(createData).subscribe({
        next: () => {
          this.submitting = false;
          this.closeForm();
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'SO created successfully',
          });
          this.reload();
        },
        error: (err: any) => {
          this.submitting = false;
          console.error('Error creating SO:', err);

          // Handle backend validation errors
          this.handleBackendErrors(err);

          // Show general error message if no field-specific errors
          if (Object.keys(this.backendErrors).length === 0) {
            let errorMessage = 'Failed to create SO';
            if (err?.error?.message) {
              errorMessage = err.error.message;
            } else if (err?.message) {
              errorMessage = err.message;
            }
            this.messageService.add({
              severity: 'error',
              summary: 'Creation Failed',
              detail: errorMessage,
            });
          } else {
            // Show toast with field errors summary
            const errorFields = Object.keys(this.backendErrors);
            this.messageService.add({
              severity: 'error',
              summary: 'Validation Failed',
              detail: `Please fix errors in: ${errorFields.join(', ')}`,
            });
          }
        },
      });
    }
  }

  confirmDelete(so: SO): void {
    this.selected = so;
    this.confirmVisible = true;
  }

  doDelete(): void {
    if (!this.selected) return;
    const id = this.selected._id;
    const soDisplayName = this.getSODisplayName(this.selected);
    this.submitting = true;
    this.soService.deleteSO(id).subscribe({
      next: () => {
        this.submitting = false;
        this.confirmVisible = false;
        this.selected = null;
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: `SO "${soDisplayName}" deleted successfully`,
        });
        this.reload();
      },
      error: (err: any) => {
        this.submitting = false;
        console.error('Error deleting SO:', err);
        let errorMessage = 'Failed to delete SO. Please try again.';
        if (err?.error?.message) {
          errorMessage = err.error.message;
        } else if (err?.message) {
          errorMessage = err.message;
        }
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: errorMessage,
        });
        // Don't close modal on error so user can retry
      },
    });
  }

  activateSO(so: SO): void {
    this.soService.activateSO(so._id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'SO activated successfully',
        });
        this.reload();
      },
      error: (err: any) => {
        console.error('Error activating SO:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to activate SO. Please try again.',
        });
      },
    });
  }

  deactivateSO(so: SO): void {
    this.soService.deactivateSO(so._id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'SO deactivated successfully',
        });
        this.reload();
      },
      error: (err: any) => {
        console.error('Error deactivating SO:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to deactivate SO. Please try again.',
        });
      },
    });
  }

  onSearchChange(search: string): void {
    this.searchInput$.next(search || '');
  }

  clearFilters(): void {
    this.filters = {
      sortBy: 'createdAt',
      sortOrder: 'desc',
    };
    this.searchInput = '';
    this.searchSuggestions = [];
    this.showSearchSuggestions = false;
    this.page = 1;
    this.reload();
  }

  onCategoryFilterChange(): void {
    this.page = 1;
    this.reload();
  }

  onCategoryChange(): void {
    // Reset subcategory when category changes
    this.subcategories = [];
    this.form.patchValue({
      subcategory_id: '',
    });

    // Load subcategories for the selected category
    const categoryId = this.form.get('category_id')?.value;
    if (categoryId) {
      this.loadSubcategories(categoryId);
    }
  }

  onSubcategoryChange(): void {
    // Handle subcategory change if needed
  }

  loadSubcategories(categoryId: string): void {
    this.categoryService
      .getAllCategories({ includeInactive: false, parentId: categoryId })
      .subscribe(res => {
        this.subcategories = res.data || [];
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
    this.form.markAsDirty();
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
      const validTypes = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt'];
      const extension = '.' + file.name.split('.').pop()?.toLowerCase();
      return validTypes.includes(extension);
    });

    if (validFiles.length > 0) {
      this.form.markAsDirty();
    }

    if (validFiles.length !== files.length) {
      console.warn('Some files were rejected due to invalid file type');
    }

    // Limit to 10 documents total
    const remainingSlots = 10 - this.selectedDocuments.length;
    const filesToAdd = validFiles.slice(0, remainingSlots);
    this.selectedDocuments.push(...filesToAdd);

    if (validFiles.length > remainingSlots) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Limit Reached',
        detail: 'Maximum 10 documents allowed. Some files were not added.',
      });
    }
  }

  removeExistingDocument(index: number): void {
    const removedDoc = this.existingDocuments[index];
    this.removedDocuments.push(removedDoc);
    this.existingDocuments.splice(index, 1);
    this.form.markAsDirty();
  }

  downloadDocument(doc: any): void {
    const url = this.documentUrl(doc.file_path);
    const fileName = doc.name || 'document';

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
          window.URL.revokeObjectURL(blobUrl);
        })
        .catch(error => {
          console.error('Error downloading document:', error);
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName;
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        });
    } else {
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  previewDocument(doc: any): void {
    const url = this.documentUrl(doc.file_path);
    window.open(url, '_blank');
  }

  documentUrl(filePath: string): string {
    if (!filePath) return '';
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      return filePath;
    }
    const baseUrl = environment.baseUrl;
    const normalizedPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
    return `${baseUrl}${normalizedPath}`;
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  onSidebarCollapseChange(collapsed: boolean): void {
    this.sidebarCollapsed = collapsed;
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

  // Custom validator for subcategory_id
  subcategoryIdValidator = (
    control: AbstractControl
  ): { [key: string]: any } | null => {
    if (!control.value) {
      return null;
    }
    const value = String(control.value).trim();
    if (value === '') {
      return null;
    }
    if (!/^[0-9a-fA-F]{24}$/.test(value)) {
      return { pattern: true };
    }
    return null;
  };

  // Custom validator for DD/MM/YYYY date format
  dateFormatValidator = (
    control: AbstractControl
  ): { [key: string]: any } | null => {
    if (!control.value) {
      return null; // Required validator will handle empty values
    }
    const value = String(control.value).trim();
    if (value === '') {
      return null;
    }
    // Check DD/MM/YYYY format
    const dateMatch = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!dateMatch) {
      return { invalidFormat: true };
    }
    const day = parseInt(dateMatch[1], 10);
    const month = parseInt(dateMatch[2], 10) - 1;
    const year = parseInt(dateMatch[3], 10);
    const date = new Date(year, month, day);
    // Validate date
    if (
      date.getDate() !== day ||
      date.getMonth() !== month ||
      date.getFullYear() !== year
    ) {
      return { invalidDate: true };
    }
    return null;
  };

  trackByIndex = (i: number) => i;

  trackByCategoryId = (index: number, category: any) => category?._id || index;
  trackBySOId = (index: number, so: SO) => so?._id || index;
  trackBySuggestionId = (index: number, suggestion: any) =>
    suggestion?._id || suggestion?.so_number || index;
  trackByDocumentIndex = (index: number, doc: any) => doc?.name || index;
  trackByItemIndex = (index: number, item: any) => item?.no || index;

  // Items form array getter
  get items(): FormArray {
    return this.form.get('items') as FormArray;
  }

  // Add item to form array
  addItem(): void {
    const itemGroup = this.fb.group({
      no: [this.items.length + 1, [Validators.min(1)]],
      item_code: ['', [Validators.maxLength(100)]],
      item_details: ['', [Validators.maxLength(500)]],
      uom: ['', [Validators.maxLength(50)]],
      quantity: [0, [Validators.min(0)]],
      delivery_schedule: [''],
      total: [0, [Validators.min(0)]],
    });
    this.items.push(itemGroup);
  }

  // Remove item from form array
  removeItem(index: number): void {
    if (this.items.length > 0) {
      this.items.removeAt(index);
      // Update no. values
      this.items.controls.forEach((control, i) => {
        control.patchValue({ no: i + 1 });
      });
    }
  }

  // Date input handler for DD/MM/YYYY format
  onDateInput(fieldName: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, ''); // Remove non-digits

    // Format as DD/MM/YYYY
    if (value.length >= 2) {
      value = value.substring(0, 2) + '/' + value.substring(2);
    }
    if (value.length >= 5) {
      value = value.substring(0, 5) + '/' + value.substring(5, 9);
    }

    this.form.patchValue({ [fieldName]: value });
  }

  // Format date field on blur - validate DD/MM/YYYY format
  formatDateField(fieldName: string): void {
    const value = this.form.get(fieldName)?.value;
    if (!value || typeof value !== 'string') return;

    const trimmedValue = value.trim();
    if (trimmedValue === '') {
      // Clear errors if field is empty (required validator will handle it)
      const control = this.form.get(fieldName);
      if (control) {
        const errors = { ...control.errors };
        delete errors['invalidDate'];
        delete errors['invalidFormat'];
        control.setErrors(Object.keys(errors).length > 0 ? errors : null);
      }
      return;
    }

    // Parse DD/MM/YYYY format
    const dateMatch = trimmedValue.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (dateMatch) {
      const day = parseInt(dateMatch[1], 10);
      const month = parseInt(dateMatch[2], 10) - 1; // Month is 0-indexed
      const year = parseInt(dateMatch[3], 10);
      const date = new Date(year, month, day);

      // Validate date
      if (
        date.getDate() === day &&
        date.getMonth() === month &&
        date.getFullYear() === year
      ) {
        // Keep DD/MM/YYYY format in form, parseDate will convert on submit
        const control = this.form.get(fieldName);
        if (control) {
          const errors = { ...control.errors };
          delete errors['invalidDate'];
          delete errors['invalidFormat'];
          control.setErrors(Object.keys(errors).length > 0 ? errors : null);
        }
      } else {
        // Invalid date, show error
        this.form.get(fieldName)?.setErrors({ invalidDate: true });
      }
    } else if (trimmedValue !== '') {
      // Invalid format
      this.form.get(fieldName)?.setErrors({ invalidFormat: true });
    }
  }

  // Convert DD/MM/YYYY string to Date object for submission
  private parseDate(dateString: string | Date | undefined): string | undefined {
    if (!dateString) return undefined;
    if (dateString instanceof Date) {
      return dateString.toISOString().split('T')[0];
    }
    if (typeof dateString === 'string') {
      // Check if it's already in YYYY-MM-DD format
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return dateString;
      }
      // Try to parse DD/MM/YYYY
      const dateMatch = dateString.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (dateMatch) {
        const day = parseInt(dateMatch[1], 10);
        const month = parseInt(dateMatch[2], 10) - 1;
        const year = parseInt(dateMatch[3], 10);
        const date = new Date(year, month, day);
        if (
          date.getDate() === day &&
          date.getMonth() === month &&
          date.getFullYear() === year
        ) {
          return date.toISOString().split('T')[0];
        }
      }
    }
    return undefined;
  }

  // Format date from backend (YYYY-MM-DD) to DD/MM/YYYY for display
  formatDateForDisplay(date: string | Date | undefined): string {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  // Date input handler for items array fields
  onItemDateInput(itemIndex: number, fieldName: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, ''); // Remove non-digits

    // Format as DD/MM/YYYY
    if (value.length >= 2) {
      value = value.substring(0, 2) + '/' + value.substring(2);
    }
    if (value.length >= 5) {
      value = value.substring(0, 5) + '/' + value.substring(5, 9);
    }

    const itemControl = this.items.at(itemIndex);
    if (itemControl) {
      itemControl.patchValue({ [fieldName]: value });
    }
  }

  // Format date field on blur for items array
  formatItemDateField(itemIndex: number, fieldName: string): void {
    const itemControl = this.items.at(itemIndex);
    if (!itemControl) return;

    const value = itemControl.get(fieldName)?.value;
    if (!value || typeof value !== 'string') return;

    const trimmedValue = value.trim();
    if (trimmedValue === '') {
      // Clear errors if field is empty
      const control = itemControl.get(fieldName);
      if (control) {
        const errors = { ...control.errors };
        delete errors['invalidDate'];
        delete errors['invalidFormat'];
        control.setErrors(Object.keys(errors).length > 0 ? errors : null);
      }
      return;
    }

    // Parse DD/MM/YYYY format
    const dateMatch = trimmedValue.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (dateMatch) {
      const day = parseInt(dateMatch[1], 10);
      const month = parseInt(dateMatch[2], 10) - 1; // Month is 0-indexed
      const year = parseInt(dateMatch[3], 10);
      const date = new Date(year, month, day);

      // Validate date
      if (
        date.getDate() === day &&
        date.getMonth() === month &&
        date.getFullYear() === year
      ) {
        // Keep DD/MM/YYYY format in form, parseDate will convert on submit
        const control = itemControl.get(fieldName);
        if (control) {
          const errors = { ...control.errors };
          delete errors['invalidDate'];
          delete errors['invalidFormat'];
          control.setErrors(Object.keys(errors).length > 0 ? errors : null);
        }
        // Clear backend error if date is valid
        const errorKey = `items.${itemIndex}.${fieldName}`;
        if (this.backendErrors[errorKey]) {
          delete this.backendErrors[errorKey];
        }
      } else {
        // Invalid date, show error
        itemControl.get(fieldName)?.setErrors({ invalidDate: true });
      }
    } else if (trimmedValue !== '') {
      // Invalid format
      itemControl.get(fieldName)?.setErrors({ invalidFormat: true });
    }
  }
}
