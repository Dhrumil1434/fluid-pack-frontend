import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { ListFiltersComponent } from '../shared/list/list-filters.component';
import { ListTableShellComponent } from '../shared/list/list-table-shell.component';
import { AdminSidebarComponent } from '../shared/admin-sidebar/admin-sidebar.component';
import { TablePaginationComponent } from '../user-management/table-pagination.component';
import { PageHeaderComponent } from '../../../../core/components/page-header/page-header.component';
import { CategoryService } from '../../../../core/services/category.service';
import {
  Category,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  SequenceConfig,
  CreateSequenceConfigRequest,
  UpdateSequenceConfigRequest,
} from '../../../../core/models/category.model';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-category-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ListFiltersComponent,
    ListTableShellComponent,
    AdminSidebarComponent,
    TablePaginationComponent,
    PageHeaderComponent,
  ],
  template: `
    <app-admin-sidebar
      [collapsed]="sidebarCollapsed"
      (collapseChange)="sidebarCollapsed = $event"
    ></app-admin-sidebar>

    <div
      class="transition-all duration-300"
      [class.ml-16]="sidebarCollapsed"
      [class.ml-64]="!sidebarCollapsed"
    >
      <!-- Header -->
      <!-- Header -->
      <app-page-header
        title="Category Management"
        subtitle="Manage categories and subcategories"
        [sidebarCollapsed]="sidebarCollapsed"
        (toggleSidebar)="sidebarCollapsed = !sidebarCollapsed"
        [breadcrumbs]="[
          { label: 'Dashboard', route: '/admin/dashboard' },
          { label: 'Category Management' },
        ]"
      >
        <div headerActions class="flex items-center gap-2">
          <button
            class="px-4 py-2 bg-primary text-white rounded-md font-medium transition-colors duration-150 hover:bg-primary/90 cursor-pointer flex items-center gap-2 shadow-sm"
            (click)="openCreate()"
            title="Add new category"
          >
            <i class="pi pi-plus text-sm"></i>
            Add Category
          </button>
          <button
            class="px-4 py-2 bg-blue-500 text-white rounded-md font-medium transition-colors duration-150 hover:bg-blue-600 cursor-pointer flex items-center gap-2 shadow-sm"
            (click)="openSequenceManagement()"
            title="Manage sequence configurations"
          >
            <i class="pi pi-cog text-sm"></i>
            Sequence Configs
          </button>
        </div>
      </app-page-header>

      <main class="p-6 space-y-4">
        <app-list-filters
          searchLabel="Search categories"
          searchPlaceholder="Name, description"
          (searchChange)="onSearchChange($event)"
          (apply)="reload()"
          (clear)="clearFilters()"
        >
          <div filters-extra class="flex items-end gap-3">
            <select
              class="px-3 py-2 border border-neutral-300 rounded-md"
              [(ngModel)]="filters.level"
            >
              <option [ngValue]="undefined">All levels</option>
              <option [ngValue]="0">Main Categories</option>
              <option [ngValue]="1">Subcategories</option>
              <option [ngValue]="2">Sub-subcategories</option>
            </select>
            <label class="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                [(ngModel)]="filters.includeInactive"
                (change)="reload()"
              />
              Include Inactive
            </label>
          </div>
        </app-list-filters>

        <app-list-table-shell title="Categories">
          <table class="min-w-full text-sm">
            <thead>
              <tr class="bg-neutral-50 text-left">
                <th class="px-4 py-2">Name</th>
                <th class="px-4 py-2">Level</th>
                <th class="px-4 py-2">Parent</th>
                <th class="px-4 py-2">Sort Order</th>
                <th class="px-4 py-2">Status</th>
                <th class="px-4 py-2">Created By</th>
                <th class="px-4 py-2">Sequence Config</th>
                <th class="px-4 py-2 w-40">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let c of categories" class="border-t">
                <td class="px-4 py-2">
                  <div class="flex items-center gap-2">
                    <span class="font-medium">{{ c.name }}</span>
                    <span
                      *ngIf="c.description"
                      class="text-xs text-gray-500"
                      [title]="c.description"
                    >
                      <i class="pi pi-info-circle"></i>
                    </span>
                  </div>
                  <div *ngIf="c.slug" class="text-xs text-gray-400 mt-1">
                    {{ c.slug }}
                  </div>
                </td>
                <td class="px-4 py-2">
                  <span
                    class="px-2 py-1 rounded text-xs"
                    [class.bg-blue-100]="c.level === 0"
                    [class.bg-yellow-100]="c.level === 1"
                    [class.bg-green-100]="c.level === 2"
                    [class.text-blue-800]="c.level === 0"
                    [class.text-yellow-800]="c.level === 1"
                    [class.text-green-800]="c.level === 2"
                  >
                    {{ getLevelLabel(c.level) }}
                  </span>
                </td>
                <td class="px-4 py-2">
                  <span *ngIf="c.parent_id" class="text-xs text-gray-600">
                    {{ getParentName(c.parent_id) }}
                  </span>
                  <span *ngIf="!c.parent_id" class="text-gray-400 text-xs"
                    >-</span
                  >
                </td>
                <td class="px-4 py-2">{{ c.sort_order }}</td>
                <td class="px-4 py-2">
                  <span
                    class="px-2 py-1 rounded text-xs"
                    [class.bg-green-100]="c.is_active"
                    [class.bg-gray-100]="!c.is_active"
                    [class.text-green-800]="c.is_active"
                    [class.text-gray-800]="!c.is_active"
                  >
                    {{ c.is_active ? 'Active' : 'Inactive' }}
                  </span>
                </td>
                <td class="px-4 py-2">
                  {{ c.created_by.username || '-' }}
                </td>
                <td class="px-4 py-2">
                  <span
                    *ngIf="hasSequenceConfig(c._id)"
                    class="text-xs text-green-600"
                  >
                    <i class="pi pi-check-circle"></i> Configured
                  </span>
                  <span
                    *ngIf="!hasSequenceConfig(c._id)"
                    class="text-xs text-gray-400"
                    >-</span
                  >
                </td>
                <td class="px-4 py-2">
                  <div class="flex gap-2">
                    <button
                      class="px-2 py-1 border rounded text-xs"
                      (click)="openView(c)"
                      title="View"
                    >
                      <i class="pi pi-eye"></i>
                    </button>
                    <button
                      class="px-2 py-1 border rounded text-xs"
                      (click)="openEdit(c)"
                      title="Edit"
                    >
                      <i class="pi pi-pencil"></i>
                    </button>
                    <button
                      class="px-2 py-1 border rounded text-xs text-blue-600"
                      (click)="openSequenceConfig(c)"
                      title="Sequence Config"
                    >
                      <i class="pi pi-cog"></i>
                    </button>
                    <button
                      class="px-2 py-1 border rounded text-xs text-red-600"
                      (click)="confirmDelete(c)"
                      title="Delete"
                    >
                      <i class="pi pi-trash"></i>
                    </button>
                  </div>
                </td>
              </tr>
              <tr *ngIf="categories.length === 0">
                <td colspan="8" class="px-4 py-6 text-center text-neutral-500">
                  No categories found
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
            class="relative bg-bg border border-neutral-300 rounded-xl shadow-medium w-full max-w-2xl max-h-[90vh] flex flex-col"
          >
            <div
              class="flex items-center justify-between p-4 border-b border-neutral-200 flex-shrink-0"
            >
              <h3 class="text-lg font-semibold text-text">
                {{ editing ? 'Edit Category' : 'Add Category' }}
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
                  <label class="text-sm">Name *</label>
                  <input
                    type="text"
                    class="w-full border rounded px-3 py-2"
                    formControlName="name"
                    placeholder="Enter category name"
                  />
                  <div
                    class="text-xs text-error"
                    *ngIf="
                      form.controls['name'].touched &&
                      form.controls['name'].invalid
                    "
                  >
                    Name is required (min 2 characters)
                  </div>
                </div>

                <div class="space-y-1">
                  <label class="text-sm">Description</label>
                  <textarea
                    class="w-full border rounded px-3 py-2"
                    formControlName="description"
                    placeholder="Enter category description"
                    rows="3"
                  ></textarea>
                </div>

                <div class="space-y-1">
                  <label class="text-sm">Parent Category (Optional)</label>
                  <select
                    class="w-full border rounded px-3 py-2"
                    formControlName="parentId"
                  >
                    <option value="">No parent (Main Category)</option>
                    <option
                      *ngFor="let cat of parentCategories"
                      [value]="cat._id"
                    >
                      {{ cat.name }}
                      <span *ngIf="cat.level > 0">
                        ({{ getLevelLabel(cat.level) }})
                      </span>
                    </option>
                  </select>
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <div class="space-y-1">
                    <label class="text-sm">Sort Order</label>
                    <input
                      type="number"
                      class="w-full border rounded px-3 py-2"
                      formControlName="sortOrder"
                      placeholder="0"
                      min="0"
                    />
                  </div>
                  <div class="space-y-1" *ngIf="editing">
                    <label class="inline-flex items-center gap-2 text-sm">
                      <input type="checkbox" formControlName="isActive" />
                      <span>Active</span>
                    </label>
                  </div>
                </div>

                <div class="space-y-1">
                  <label class="text-sm">Image URL (Optional)</label>
                  <input
                    type="url"
                    class="w-full border rounded px-3 py-2"
                    formControlName="imageUrl"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>

                <div class="space-y-1">
                  <label class="text-sm">SEO Title (Optional)</label>
                  <input
                    type="text"
                    class="w-full border rounded px-3 py-2"
                    formControlName="seoTitle"
                    placeholder="SEO title (max 60 characters)"
                    maxlength="60"
                  />
                </div>

                <div class="space-y-1">
                  <label class="text-sm">SEO Description (Optional)</label>
                  <textarea
                    class="w-full border rounded px-3 py-2"
                    formControlName="seoDescription"
                    placeholder="SEO description (max 160 characters)"
                    rows="2"
                    maxlength="160"
                  ></textarea>
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
                class="px-3 py-2 rounded-md bg-primary text-white hover:bg-primary-light disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                [disabled]="form.invalid || submitting"
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
            class="relative bg-bg border border-neutral-300 rounded-xl shadow-medium w-full max-w-2xl max-h-[90vh] flex flex-col"
          >
            <div
              class="flex items-center justify-between p-4 border-b border-neutral-200 flex-shrink-0"
            >
              <h3 class="text-lg font-semibold text-text">Category Details</h3>
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
                  <span class="block text-xs text-text-muted mb-1">Slug</span>
                  {{ selected?.slug || '-' }}
                </div>
                <div class="md:col-span-1">
                  <span class="block text-xs text-text-muted mb-1">Level</span>
                  <span
                    class="px-2 py-1 rounded text-xs"
                    [class.bg-blue-100]="selected?.level === 0"
                    [class.bg-yellow-100]="selected?.level === 1"
                    [class.bg-green-100]="selected?.level === 2"
                  >
                    {{ getLevelLabel(selected?.level || 0) }}
                  </span>
                </div>
                <div class="md:col-span-2">
                  <span class="block text-xs text-text-muted mb-1"
                    >Description</span
                  >
                  {{ selected?.description || '-' }}
                </div>
                <div class="md:col-span-1">
                  <span class="block text-xs text-text-muted mb-1"
                    >Parent Category</span
                  >
                  {{
                    selected && selected.parent_id
                      ? getParentName(selected.parent_id)
                      : '-'
                  }}
                </div>
                <div class="md:col-span-1">
                  <span class="block text-xs text-text-muted mb-1"
                    >Sort Order</span
                  >
                  {{ selected?.sort_order || 0 }}
                </div>
                <div class="md:col-span-1">
                  <span class="block text-xs text-text-muted mb-1">Status</span>
                  <span
                    class="px-2 py-1 rounded text-xs"
                    [class.bg-green-100]="selected?.is_active"
                    [class.bg-gray-100]="!selected?.is_active"
                  >
                    {{ selected?.is_active ? 'Active' : 'Inactive' }}
                  </span>
                </div>
                <div class="md:col-span-1">
                  <span class="block text-xs text-text-muted mb-1"
                    >Created By</span
                  >
                  {{ selected?.created_by?.username || '-' }}
                </div>
                <div class="md:col-span-1">
                  <span class="block text-xs text-text-muted mb-1"
                    >Created</span
                  >
                  {{ selected?.created_at | date: 'medium' }}
                </div>
                <div class="md:col-span-1">
                  <span class="block text-xs text-text-muted mb-1"
                    >Updated</span
                  >
                  {{ selected?.updated_at | date: 'medium' }}
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
              <h3 class="text-lg font-semibold text-text">Delete Category</h3>
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

        <!-- Sequence Config Modal -->
        <div
          *ngIf="sequenceConfigVisible"
          class="fixed inset-0 z-50 flex items-center justify-center"
        >
          <div
            class="absolute inset-0 bg-black/40"
            (click)="sequenceConfigVisible = false"
            role="button"
            tabindex="0"
            (keydown.enter)="sequenceConfigVisible = false"
            (keydown.space)="sequenceConfigVisible = false"
          ></div>
          <div
            class="relative bg-bg border border-neutral-300 rounded-xl shadow-medium w-full max-w-2xl max-h-[90vh] flex flex-col"
          >
            <div
              class="flex items-center justify-between p-4 border-b border-neutral-200 flex-shrink-0"
            >
              <h3 class="text-lg font-semibold text-text">
                Sequence Configuration
              </h3>
              <button
                class="p-2 text-text-muted hover:bg-neutral-100 rounded-md"
                (click)="sequenceConfigVisible = false"
              >
                <i class="pi pi-times"></i>
              </button>
            </div>
            <div class="flex-1 overflow-y-auto">
              <form
                [formGroup]="sequenceForm"
                class="p-4 space-y-4"
                (ngSubmit)="submitSequenceConfig()"
              >
                <div class="space-y-1">
                  <label class="text-sm">Category *</label>
                  <select
                    class="w-full border rounded px-3 py-2"
                    formControlName="categoryId"
                    (change)="onSequenceCategoryChange()"
                  >
                    <option value="">Select category</option>
                    <option
                      *ngFor="let cat of mainCategories"
                      [value]="cat._id"
                    >
                      {{ cat.name }}
                    </option>
                  </select>
                </div>

                <div class="space-y-1" *ngIf="sequenceSubcategories.length > 0">
                  <label class="text-sm">Subcategory (Optional)</label>
                  <select
                    class="w-full border rounded px-3 py-2"
                    formControlName="subcategoryId"
                  >
                    <option value="">No subcategory</option>
                    <option
                      *ngFor="let sub of sequenceSubcategories"
                      [value]="sub._id"
                    >
                      {{ sub.name }}
                    </option>
                  </select>
                </div>

                <div class="space-y-1">
                  <label class="text-sm">Sequence Prefix *</label>
                  <input
                    type="text"
                    class="w-full border rounded px-3 py-2 uppercase"
                    formControlName="sequencePrefix"
                    placeholder="ABC"
                    maxlength="10"
                  />
                  <div class="text-xs text-gray-500">
                    Uppercase letters and numbers only
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <div class="space-y-1">
                    <label class="text-sm">Starting Number *</label>
                    <input
                      type="number"
                      class="w-full border rounded px-3 py-2"
                      formControlName="startingNumber"
                      placeholder="1"
                      min="1"
                    />
                  </div>
                  <div class="space-y-1">
                    <label class="text-sm">Current Sequence</label>
                    <input
                      type="number"
                      class="w-full border rounded px-3 py-2 bg-gray-50"
                      [value]="editingSequence?.current_sequence || 0"
                      readonly
                    />
                  </div>
                </div>

                <div class="space-y-1">
                  <label class="text-sm">Format *</label>
                  <input
                    type="text"
                    class="w-full border rounded px-3 py-2 font-mono"
                    formControlName="format"
                    placeholder="{{ '{' }}prefix{{ '}' }}-{{ '{' }}number:04d{{
                      '}'
                    }}"
                  />
                  <div class="text-xs text-gray-500">
                    Use {{ '{' }}prefix{{ '}' }} for prefix and
                    {{ '{' }}number:04d{{ '}' }} for padded number
                  </div>
                </div>
              </form>
            </div>
            <div
              class="flex items-center justify-end gap-2 p-4 border-t border-neutral-200 flex-shrink-0"
            >
              <button
                type="button"
                class="px-3 py-2 rounded-md border border-neutral-300 text-text hover:bg-neutral-50"
                (click)="sequenceConfigVisible = false"
              >
                Cancel
              </button>
              <button
                type="submit"
                class="px-3 py-2 rounded-md bg-primary text-white hover:bg-primary-light disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                [disabled]="sequenceForm.invalid || submittingSequence"
                (click)="submitSequenceConfig()"
              >
                <i *ngIf="submittingSequence" class="pi pi-spinner pi-spin"></i>
                <i *ngIf="!submittingSequence" class="pi pi-save"></i>
                <span>{{
                  editingSequence ? 'Update Config' : 'Create Config'
                }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Sequence Management Modal -->
        <div
          *ngIf="sequenceManagementVisible"
          class="fixed inset-0 z-50 flex items-center justify-center"
        >
          <div
            class="absolute inset-0 bg-black/40"
            (click)="sequenceManagementVisible = false"
            role="button"
            tabindex="0"
            (keydown.enter)="sequenceManagementVisible = false"
            (keydown.space)="sequenceManagementVisible = false"
          ></div>
          <div
            class="relative bg-bg border border-neutral-300 rounded-xl shadow-medium w-full max-w-4xl max-h-[90vh] flex flex-col"
          >
            <div
              class="flex items-center justify-between p-4 border-b border-neutral-200 flex-shrink-0"
            >
              <h3 class="text-lg font-semibold text-text">
                Sequence Configurations
              </h3>
              <button
                class="p-2 text-text-muted hover:bg-neutral-100 rounded-md"
                (click)="sequenceManagementVisible = false"
              >
                <i class="pi pi-times"></i>
              </button>
            </div>
            <div class="flex-1 overflow-y-auto p-4">
              <table class="min-w-full text-sm">
                <thead>
                  <tr class="bg-neutral-50 text-left">
                    <th class="px-4 py-2">Category</th>
                    <th class="px-4 py-2">Subcategory</th>
                    <th class="px-4 py-2">Prefix</th>
                    <th class="px-4 py-2">Current</th>
                    <th class="px-4 py-2">Format</th>
                    <th class="px-4 py-2">Status</th>
                    <th class="px-4 py-2 w-32">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let config of sequenceConfigs" class="border-t">
                    <td class="px-4 py-2">
                      {{ getCategoryName(config.category_id) }}
                    </td>
                    <td class="px-4 py-2">
                      {{
                        config.subcategory_id
                          ? getCategoryName(config.subcategory_id)
                          : '-'
                      }}
                    </td>
                    <td class="px-4 py-2 font-mono">
                      {{ config.sequence_prefix }}
                    </td>
                    <td class="px-4 py-2 font-mono">
                      {{ config.current_sequence }}
                    </td>
                    <td class="px-4 py-2 font-mono text-xs">
                      {{ config.format }}
                    </td>
                    <td class="px-4 py-2">
                      <span
                        class="px-2 py-1 rounded text-xs"
                        [class.bg-green-100]="config.is_active"
                        [class.bg-gray-100]="!config.is_active"
                      >
                        {{ config.is_active ? 'Active' : 'Inactive' }}
                      </span>
                    </td>
                    <td class="px-4 py-2">
                      <div class="flex gap-1">
                        <button
                          class="px-2 py-1 border rounded text-xs"
                          (click)="openEditSequenceConfig(config)"
                          title="Edit"
                        >
                          <i class="pi pi-pencil"></i>
                        </button>
                        <button
                          class="px-2 py-1 border rounded text-xs text-red-600"
                          (click)="confirmDeleteSequenceConfig(config)"
                          title="Delete"
                        >
                          <i class="pi pi-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr *ngIf="sequenceConfigs.length === 0">
                    <td
                      colspan="7"
                      class="px-4 py-6 text-center text-neutral-500"
                    >
                      No sequence configurations found
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div
              class="flex items-center justify-end gap-2 p-4 border-t border-neutral-200 flex-shrink-0"
            >
              <button
                class="px-3 py-2 rounded-md border border-neutral-300 text-text hover:bg-neutral-50"
                (click)="sequenceManagementVisible = false"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  `,
  styles: [],
})
export class CategoryManagementComponent implements OnInit, OnDestroy {
  categories: Category[] = [];
  total = 0;
  pages = 1;
  page = 1;
  limit = 10;
  filters: {
    search?: string;
    level?: number;
    includeInactive?: boolean;
  } = {};

  // Form state
  formVisible = false;
  viewVisible = false;
  confirmVisible = false;
  sequenceConfigVisible = false;
  sequenceManagementVisible = false;
  editing = false;
  submitting = false;
  submittingSequence = false;
  selected: Category | null = null;
  form: FormGroup;
  sequenceForm: FormGroup;
  parentCategories: Category[] = [];
  mainCategories: Category[] = [];
  sequenceSubcategories: Category[] = [];
  editingSequence: SequenceConfig | null = null;

  // Sequence configs
  sequenceConfigs: SequenceConfig[] = [];

  // Layout state
  sidebarCollapsed = false;

  // Search debounce
  private searchInput$ = new Subject<string>();
  private subs = new Subscription();

  constructor(
    private categoryService: CategoryService,
    private fb: FormBuilder
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      description: [''],
      parentId: [''],
      sortOrder: [0],
      imageUrl: [''],
      seoTitle: [''],
      seoDescription: [''],
      isActive: [true],
    });

    this.sequenceForm = this.fb.group({
      categoryId: ['', Validators.required],
      subcategoryId: [''],
      sequencePrefix: [
        '',
        [
          Validators.required,
          Validators.pattern(/^[A-Z0-9-]+$/),
          Validators.maxLength(10),
        ],
      ],
      startingNumber: [1, [Validators.required, Validators.min(1)]],
      format: ['{prefix}-{number:04d}', Validators.required],
    });
  }

  ngOnInit(): void {
    this.reload();
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
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  onSearchChange(value: string): void {
    this.searchInput$.next(value || '');
  }

  clearFilters(): void {
    this.filters = {};
    this.page = 1;
    this.reload();
  }

  reload(): void {
    this.categoryService
      .getAllCategories({
        search: this.filters.search,
        level: this.filters.level,
        includeInactive: this.filters.includeInactive,
        page: this.page,
        limit: this.limit,
      })
      .subscribe({
        next: res => {
          const responseData = res as any;
          // Handle different response structures
          if (responseData.data?.categories) {
            // Admin API response structure
            this.categories = responseData.data.categories || [];
            if (responseData.data.pagination) {
              this.total = responseData.data.pagination.totalItems;
              this.pages = responseData.data.pagination.totalPages;
            } else {
              this.total = this.categories.length;
              this.pages = Math.ceil(this.total / this.limit);
            }
          } else {
            // Standard API response structure
            this.categories = res.data || [];
            this.total = this.categories.length;
            this.pages = Math.ceil(this.total / this.limit);
          }

          // Load parent categories for dropdown
          this.loadParentCategories();
          this.loadMainCategories();
        },
        error: err => {
          console.error('Error loading categories:', err);
        },
      });
  }

  loadParentCategories(): void {
    this.categoryService
      .getAllCategories({ includeInactive: false })
      .subscribe({
        next: res => {
          this.parentCategories = (res.data || []).filter(
            (c: Category) => c.level < 2
          );
        },
      });
  }

  loadMainCategories(): void {
    this.categoryService
      .getAllCategories({ includeInactive: false, level: 0 })
      .subscribe({
        next: res => {
          this.mainCategories = res.data || [];
        },
      });
  }

  loadSequenceConfigs(): void {
    this.categoryService.getAllSequenceConfigs().subscribe({
      next: res => {
        this.sequenceConfigs = res.data || [];
      },
      error: err => {
        console.error('Error loading sequence configs:', err);
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
    this.form.patchValue({ sortOrder: 0, isActive: true });
    this.formVisible = true;
  }

  openView(category: Category): void {
    this.selected = category;
    this.viewVisible = true;
  }

  openEdit(category: Category): void {
    this.editing = true;
    this.selected = category;
    this.form.patchValue({
      name: category.name,
      description: category.description || '',
      parentId: category.parent_id || '',
      sortOrder: category.sort_order || 0,
      imageUrl: category.image_url || '',
      seoTitle: category.seo_title || '',
      seoDescription: category.seo_description || '',
      isActive: category.is_active,
    });
    this.formVisible = true;
  }

  confirmDelete(category: Category): void {
    this.selected = category;
    this.confirmVisible = true;
  }

  doDelete(): void {
    if (!this.selected) return;
    this.categoryService.deleteCategory(this.selected._id).subscribe({
      next: () => {
        this.confirmVisible = false;
        this.reload();
        this.loadSequenceConfigs();
      },
      error: err => {
        console.error('Error deleting category:', err);
        this.confirmVisible = false;
      },
    });
  }

  closeForm(): void {
    this.formVisible = false;
    this.submitting = false;
  }

  submitForm(): void {
    if (this.submitting || this.form.invalid) return;
    this.submitting = true;

    const formValue = this.form.value;
    if (this.editing && this.selected) {
      const updateData: UpdateCategoryRequest = {
        name: formValue.name,
        description: formValue.description,
        parentId: formValue.parentId || undefined,
        sortOrder: formValue.sortOrder,
        imageUrl: formValue.imageUrl || undefined,
        seoTitle: formValue.seoTitle || undefined,
        seoDescription: formValue.seoDescription || undefined,
        isActive: formValue.isActive,
      };

      this.categoryService
        .updateCategory(this.selected._id, updateData)
        .subscribe({
          next: () => {
            this.submitting = false;
            this.formVisible = false;
            this.reload();
            this.loadSequenceConfigs();
          },
          error: () => {
            this.submitting = false;
          },
        });
    } else {
      const createData: CreateCategoryRequest = {
        name: formValue.name,
        description: formValue.description || undefined,
        parentId: formValue.parentId || undefined,
        sortOrder: formValue.sortOrder,
        imageUrl: formValue.imageUrl || undefined,
        seoTitle: formValue.seoTitle || undefined,
        seoDescription: formValue.seoDescription || undefined,
      };

      this.categoryService.createCategory(createData).subscribe({
        next: () => {
          this.submitting = false;
          this.formVisible = false;
          this.reload();
          this.loadSequenceConfigs();
        },
        error: () => {
          this.submitting = false;
        },
      });
    }
  }

  openSequenceConfig(category: Category): void {
    this.editingSequence = null;
    this.selected = category;
    this.sequenceForm.reset();
    this.sequenceSubcategories = [];
    this.sequenceForm.patchValue({
      categoryId: category._id,
      sequencePrefix: category.name.substring(0, 3).toUpperCase(),
      startingNumber: 1,
      format: '{sequence}-{category}',
    });
    this.onSequenceCategoryChange();
    this.sequenceConfigVisible = true;
  }

  openEditSequenceConfig(config: SequenceConfig): void {
    this.editingSequence = config;
    this.sequenceForm.patchValue({
      categoryId: config.category_id,
      subcategoryId: config.subcategory_id || '',
      sequencePrefix: config.sequence_prefix,
      startingNumber: config.starting_number,
      format: config.format,
    });
    this.onSequenceCategoryChange();
    this.sequenceConfigVisible = true;
  }

  onSequenceCategoryChange(): void {
    const categoryId = this.sequenceForm.get('categoryId')?.value;
    if (categoryId) {
      this.categoryService
        .getAllCategories({
          includeInactive: false,
          parentId: categoryId,
        })
        .subscribe({
          next: res => {
            this.sequenceSubcategories = res.data || [];
          },
        });
    } else {
      this.sequenceSubcategories = [];
    }
  }

  submitSequenceConfig(): void {
    if (this.submittingSequence || this.sequenceForm.invalid) return;
    this.submittingSequence = true;

    const formValue = this.sequenceForm.value;
    if (this.editingSequence) {
      const updateData: UpdateSequenceConfigRequest = {
        sequencePrefix: formValue.sequencePrefix,
        startingNumber: formValue.startingNumber,
        format: formValue.format,
      };

      this.categoryService
        .updateSequenceConfig(this.editingSequence._id, updateData)
        .subscribe({
          next: () => {
            this.submittingSequence = false;
            this.sequenceConfigVisible = false;
            this.loadSequenceConfigs();
          },
          error: () => {
            this.submittingSequence = false;
          },
        });
    } else {
      const createData: CreateSequenceConfigRequest = {
        categoryId: formValue.categoryId,
        subcategoryId: formValue.subcategoryId || undefined,
        sequencePrefix: formValue.sequencePrefix.toUpperCase(),
        startingNumber: formValue.startingNumber,
        format: formValue.format,
      };

      this.categoryService.createSequenceConfig(createData).subscribe({
        next: () => {
          this.submittingSequence = false;
          this.sequenceConfigVisible = false;
          this.loadSequenceConfigs();
        },
        error: () => {
          this.submittingSequence = false;
        },
      });
    }
  }

  openSequenceManagement(): void {
    this.sequenceManagementVisible = true;
    this.loadSequenceConfigs();
  }

  confirmDeleteSequenceConfig(config: SequenceConfig): void {
    if (
      confirm(
        `Delete sequence config for ${this.getCategoryName(config.category_id)}?`
      )
    ) {
      this.categoryService.deleteSequenceConfig(config._id).subscribe({
        next: () => {
          this.loadSequenceConfigs();
        },
        error: err => {
          console.error('Error deleting sequence config:', err);
        },
      });
    }
  }

  getLevelLabel(level: number): string {
    switch (level) {
      case 0:
        return 'Main Category';
      case 1:
        return 'Subcategory';
      case 2:
        return 'Sub-subcategory';
      default:
        return `Level ${level}`;
    }
  }

  getParentName(parentId: string): string {
    const parent = this.categories.find(c => c._id === parentId);
    return parent?.name || 'Unknown';
  }

  getCategoryName(categoryId: string | { _id: string; name: string }): string {
    // Handle populated object from backend
    if (typeof categoryId === 'object' && categoryId !== null) {
      return categoryId.name || 'Unknown';
    }
    // Handle string ID - look up in categories array
    const category = this.categories.find(c => c._id === categoryId);
    return category?.name || 'Unknown';
  }

  hasSequenceConfig(categoryId: string): boolean {
    return this.sequenceConfigs.some(config => {
      // Extract ID from category_id (could be object or string)
      const configCategoryId =
        typeof config.category_id === 'object'
          ? config.category_id._id
          : config.category_id;
      return configCategoryId === categoryId;
    });
  }

  trackById = (_: number, item: { _id: string }) => item._id;
}
