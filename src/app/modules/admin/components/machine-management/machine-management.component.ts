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
import { MachineService } from '../../../../core/services/machine.service';
import { Machine } from '../../../../core/models/machine.model';
import { AdminSidebarComponent } from '../shared/admin-sidebar/admin-sidebar.component';
import { TablePaginationComponent } from '../user-management/table-pagination.component';
import { CategoryService } from '../../../../core/services/category.service';
import { environment } from '../../../../../environments/environment';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

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
  ],
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
        <header
          class="bg-white border-b border-gray-100 px-6 py-3 sticky top-0 z-40"
        >
          <div class="flex items-center justify-between">
            <button
              class="p-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all"
              (click)="toggleSidebar()"
              title="Toggle sidebar"
            >
              <i class="pi pi-bars text-lg"></i>
            </button>
            <div class="text-lg font-semibold">Machine Management</div>
            <div class="w-10"></div>
          </div>
        </header>

        <main class="p-6 space-y-4">
          <app-list-filters
            searchLabel="Search machines"
            searchPlaceholder="Name, metadata"
            (searchChange)="onSearchChange($event)"
            (apply)="reload()"
            (clear)="clearFilters()"
          >
            <div filters-extra class="flex items-end gap-3">
              <select
                class="px-3 py-2 border border-neutral-300 rounded-md"
                [(ngModel)]="filters.is_approved"
              >
                <option [ngValue]="undefined">All statuses</option>
                <option [ngValue]="true">Approved</option>
                <option [ngValue]="false">Pending</option>
              </select>
              <div class="relative">
                <input
                  class="px-3 py-2 border border-neutral-300 rounded-md w-64"
                  placeholder="Search categories"
                  [value]="filterCategoryInput"
                  (focus)="
                    filterCategoryOpen = true;
                    onCategoryInput(filterCategoryInput, 'filter')
                  "
                  (input)="onCategoryInput($any($event.target).value, 'filter')"
                />
                <div
                  class="absolute z-50 mt-1 w-64 bg-white border border-neutral-300 rounded-md shadow"
                  *ngIf="filterCategoryOpen"
                >
                  <div
                    class="p-2 text-sm text-text-muted"
                    *ngIf="categorySuggestLoading"
                  >
                    Searching...
                  </div>
                  <button
                    type="button"
                    class="w-full text-left px-3 py-2 hover:bg-neutral-100 text-sm"
                    (click)="
                      selectCategory(
                        { _id: undefined, name: 'All categories' },
                        'filter'
                      )
                    "
                  >
                    All categories
                  </button>
                  <button
                    type="button"
                    class="w-full text-left px-3 py-2 hover:bg-neutral-100 text-sm"
                    *ngFor="let opt of categorySuggest; trackBy: trackById"
                    (click)="selectCategory(opt, 'filter')"
                  >
                    {{ opt.name }}
                  </button>
                </div>
              </div>
            </div>
          </app-list-filters>

          <app-list-table-shell title="Machines">
            <div table-actions class="flex items-center gap-2">
              <button
                class="px-3 py-1 bg-primary text-white rounded-md"
                (click)="openCreate()"
              >
                Add Machine
              </button>
            </div>

            <table class="min-w-full text-sm">
              <thead>
                <tr class="bg-neutral-50 text-left">
                  <th class="px-4 py-2">Name</th>
                  <th class="px-4 py-2">Category</th>
                  <th class="px-4 py-2">Created By</th>
                  <th class="px-4 py-2">Approved</th>
                  <th class="px-4 py-2 w-40">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let m of machines" class="border-t">
                  <td class="px-4 py-2">{{ m.name }}</td>
                  <td class="px-4 py-2">{{ m.category_id.name }}</td>
                  <td class="px-4 py-2">{{ m.created_by.username }}</td>
                  <td class="px-4 py-2">
                    <span
                      class="px-2 py-1 rounded text-xs"
                      [class.bg-green-100]="m.is_approved"
                      [class.bg-yellow-100]="!m.is_approved"
                    >
                      {{ m.is_approved ? 'Yes' : 'No' }}
                    </span>
                  </td>
                  <td class="px-4 py-2">
                    <div class="flex gap-2">
                      <button
                        class="px-2 py-1 border rounded"
                        (click)="openView(m)"
                      >
                        View
                      </button>
                      <button
                        class="px-2 py-1 border rounded"
                        (click)="openEdit(m)"
                      >
                        Edit
                      </button>
                      <button
                        class="px-2 py-1 border rounded text-red-600"
                        (click)="confirmDelete(m)"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
                <tr *ngIf="machines.length === 0">
                  <td
                    colspan="5"
                    class="px-4 py-6 text-center text-neutral-500"
                  >
                    No machines found
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
              class="relative bg-bg border border-neutral-300 rounded-xl shadow-medium w-full max-w-lg p-5"
            >
              <div class="flex items-center justify-between mb-3">
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
              <form
                [formGroup]="form"
                class="grid grid-cols-1 md:grid-cols-2 gap-4"
                (ngSubmit)="submitForm()"
              >
                <div class="md:col-span-2" *ngIf="formLoading">
                  <div class="flex items-center gap-2 text-text-muted text-sm">
                    <i class="pi pi-spinner pi-spin"></i>
                    Loading machine details...
                  </div>
                </div>
                <div class="md:col-span-2">
                  <label class="block text-xs text-text-muted mb-1">Name</label>
                  <input
                    class="w-full border border-neutral-300 rounded-md px-3 py-2 bg-bg text-text"
                    formControlName="name"
                  />
                </div>
                <div class="md:col-span-2">
                  <label class="block text-xs text-text-muted mb-1"
                    >Category</label
                  >
                  <div class="relative">
                    <input
                      class="w-full border border-neutral-300 rounded-md px-3 py-2 bg-bg text-text"
                      placeholder="Search categories"
                      [value]="formCategoryInput"
                      (focus)="
                        formCategoryOpen = true;
                        onCategoryInput(formCategoryInput, 'form')
                      "
                      (input)="
                        onCategoryInput($any($event.target).value, 'form')
                      "
                    />
                    <div
                      class="absolute z-50 mt-1 w-full bg-white border border-neutral-300 rounded-md shadow"
                      *ngIf="formCategoryOpen"
                    >
                      <div
                        class="p-2 text-sm text-text-muted"
                        *ngIf="categorySuggestLoading"
                      >
                        Searching...
                      </div>
                      <button
                        type="button"
                        class="w-full text-left px-3 py-2 hover:bg-neutral-100 text-sm"
                        *ngFor="let opt of categorySuggest; trackBy: trackById"
                        (click)="selectCategory(opt, 'form')"
                      >
                        {{ opt.name }}
                      </button>
                    </div>
                  </div>
                </div>
                <div class="md:col-span-2">
                  <div class="flex items-center justify-between mb-1">
                    <label class="block text-xs text-text-muted"
                      >Metadata</label
                    >
                    <button
                      type="button"
                      class="px-2 py-1 text-sm border rounded"
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
                        class="col-span-2 border border-neutral-300 rounded px-2 py-1 text-sm"
                        placeholder="Key"
                        [(ngModel)]="metadataEntries[i].key"
                        [ngModelOptions]="{ standalone: true }"
                        name="meta_key_{{ i }}"
                      />
                      <input
                        class="col-span-3 border border-neutral-300 rounded px-2 py-1 text-sm"
                        placeholder="Value"
                        [(ngModel)]="metadataEntries[i].value"
                        [ngModelOptions]="{ standalone: true }"
                        name="meta_val_{{ i }}"
                      />
                      <div class="col-span-5 flex justify-end">
                        <button
                          type="button"
                          class="px-2 py-1 text-xs border rounded"
                          (click)="removeMetadataRow(i)"
                          *ngIf="metadataEntries.length > 1"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="md:col-span-2">
                  <label class="block text-xs text-text-muted mb-1"
                    >Images</label
                  >
                  <input type="file" multiple (change)="onFiles($event)" />
                  <div
                    class="mt-2 flex gap-2 flex-wrap"
                    *ngIf="previewImages.length"
                  >
                    <div
                      *ngFor="
                        let p of previewImages;
                        let i = index;
                        trackBy: trackByIndex
                      "
                      class="relative"
                    >
                      <img
                        [src]="p"
                        class="w-16 h-16 object-cover rounded border"
                      />
                      <button
                        type="button"
                        class="absolute -top-2 -right-2 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center"
                        (click)="removeFile(i)"
                      >
                        <i class="pi pi-times text-xs"></i>
                      </button>
                    </div>
                  </div>
                  <div
                    class="mt-2 flex gap-2 flex-wrap"
                    *ngIf="editing && selected?.images?.length"
                  >
                    <img
                      *ngFor="
                        let img of selected?.images;
                        trackBy: trackByIndex
                      "
                      [src]="imageUrl(img)"
                      class="w-16 h-16 object-cover rounded border"
                    />
                  </div>
                </div>
                <div class="md:col-span-2" *ngIf="editing">
                  <label class="inline-flex items-center gap-2 text-sm">
                    <input type="checkbox" formControlName="is_approved" />
                    <span>Approved</span>
                  </label>
                </div>
                <div
                  class="md:col-span-2 flex items-center justify-end gap-2 mt-2"
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
                  >
                    <i *ngIf="submitting" class="pi pi-spinner pi-spin"></i>
                    <i *ngIf="!submitting" class="pi pi-save"></i>
                    <span>{{ editing ? 'Save Changes' : 'Create' }}</span>
                  </button>
                </div>
              </form>
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
              class="relative bg-bg border border-neutral-300 rounded-xl shadow-medium w-full max-w-lg p-5"
            >
              <div class="flex items-center justify-between mb-3">
                <h3 class="text-lg font-semibold text-text">Machine Details</h3>
                <button
                  class="p-2 text-text-muted hover:bg-neutral-100 rounded-md"
                  (click)="viewVisible = false"
                >
                  <i class="pi pi-times"></i>
                </button>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="md:col-span-2">
                  <span class="block text-xs text-text-muted mb-1">Name</span>
                  {{ selected?.name }}
                </div>
                <div class="md:col-span-1">
                  <span class="block text-xs text-text-muted mb-1"
                    >Category</span
                  >
                  {{ selected?.category_id?.name || selected?.category_id }}
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
                  <span class="block text-xs text-text-muted mb-1">Images</span>
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
              <div class="flex items-center justify-end gap-2 mt-4">
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
        </main>
      </div>
    </div>
  `,
  styles: [],
})
export class MachineManagementComponent implements OnInit, OnDestroy {
  machines: Machine[] = [];
  total = 0;
  pages = 1;
  page = 1;
  limit = 10;
  filters: { search?: string; is_approved?: boolean; category_id?: string } =
    {};
  // form state
  formVisible = false;
  viewVisible = false;
  confirmVisible = false;
  editing = false;
  submitting = false;
  formLoading = false;
  selected: Machine | null = null;
  form: FormGroup;
  categories: Array<{ _id: string; name: string }> = [];
  previewImages: string[] = [];
  selectedFiles: File[] = [];
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

  constructor(
    private machineService: MachineService,
    private fb: FormBuilder,
    private categoryService: CategoryService
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      category_id: ['', [Validators.required]],
      images: [null],
      is_approved: [false],
    });
  }

  ngOnInit(): void {
    this.reload();
    this.loadCategories();
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
    this.filterCategoryInput = '';
    this.filterCategoryOpen = false;
  }

  reload(): void {
    this.machineService
      .getAllMachines({
        page: this.page,
        limit: this.limit,
        search: this.filters.search,
        is_approved: this.filters.is_approved,
        category_id: this.filters.category_id,
      })
      .subscribe(res => {
        this.machines = res.data.machines;
        this.total = res.data.total;
        this.pages = res.data.pages;
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
    this.formVisible = true;
    this.previewImages = [];
    this.selectedFiles = [];
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
    const applyData = (m: Machine) => {
      this.selected = m;
      this.form.patchValue({
        name: m.name,
        category_id:
          typeof m.category_id === 'string'
            ? (m.category_id as unknown as string)
            : (m.category_id as any)?._id,
        is_approved: !!m.is_approved,
      });
      // Reset client-side selections
      this.previewImages = [];
      this.selectedFiles = [];
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
    if (this.submitting || this.form.invalid) return;
    this.submitting = true;
    const { name, category_id } = this.form.value as {
      name: string;
      category_id: string;
    };
    // Build metadata object from dynamic rows
    const metadata: Record<string, unknown> | undefined = this.metadataEntries
      .filter(e => (e.key || '').trim().length > 0)
      .reduce<Record<string, unknown>>((acc, e) => {
        acc[e.key.trim()] = e.value;
        return acc;
      }, {});
    const hasMetadata = metadata && Object.keys(metadata!).length > 0;
    if (this.editing && this.selected) {
      const currentApproved = !!this.selected.is_approved;
      const nextApproved = !!this.form.value.is_approved;
      this.machineService
        .updateMachineForm(this.selected._id, {
          name,
          category_id,
          images: this.selectedFiles,
          metadata: hasMetadata ? metadata : undefined,
        })
        .subscribe({
          next: () => {
            const finalize = () => {
              this.submitting = false;
              this.formVisible = false;
              this.reload();
            };
            if (currentApproved !== nextApproved) {
              this.machineService
                .updateMachineApproval(this.selected!._id, {
                  is_approved: nextApproved,
                })
                .subscribe({ next: finalize, error: finalize });
            } else {
              finalize();
            }
          },
          error: () => {
            this.submitting = false;
          },
        });
    } else {
      this.machineService
        .createMachineForm({
          name,
          category_id,
          images: this.selectedFiles,
          metadata: hasMetadata ? metadata : undefined,
        })
        .subscribe({
          next: () => {
            this.submitting = false;
            this.formVisible = false;
            this.reload();
          },
          error: () => {
            this.submitting = false;
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
    this.categoryService.getActiveCategories().subscribe(res => {
      this.categories = res.data || [];
    });
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
}
