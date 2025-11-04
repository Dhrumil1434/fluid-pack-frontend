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
import { CategoryService } from '../../../../core/services/category.service';
import {
  Category,
  SequenceConfig,
  CreateSequenceConfigRequest,
  UpdateSequenceConfigRequest,
  SequenceResetRequest,
} from '../../../../core/models/category.model';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-sequence-management',
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
  ],
  providers: [MessageService],
  templateUrl: './sequence-management.component.html',
})
export class SequenceManagementComponent implements OnInit, OnDestroy {
  // Data
  sequenceConfigs: SequenceConfig[] = [];
  categories: Category[] = [];
  mainCategories: Category[] = [];
  subcategories: Category[] = [];

  // Form
  form: FormGroup;
  resetForm: FormGroup;

  // UI State
  loading = false;
  submitting = false;
  formVisible = false;
  resetModalVisible = false;
  editing = false;
  selected: SequenceConfig | null = null;

  // Filters
  searchTerm = '';
  searchSubject = new Subject<string>();
  filters = {
    categoryId: undefined as string | undefined,
    includeInactive: false,
  };

  // Pagination
  page = 1;
  limit = 10;
  total = 0;
  pages = 1;

  // Sidebar
  sidebarCollapsed = false;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private categoryService: CategoryService,
    private messageService: MessageService
  ) {
    this.form = this.fb.group({
      categoryId: ['', Validators.required],
      subcategoryId: [''],
      sequencePrefix: [
        '',
        [
          Validators.required,
          Validators.minLength(1),
          Validators.maxLength(10),
          Validators.pattern(/^[A-Z0-9-]+$/),
        ],
      ],
      startingNumber: [1, [Validators.required, Validators.min(1)]],
      format: [
        '',
        [
          Validators.required,
          Validators.pattern(/.*\{category\}.*\{sequence\}.*/),
        ],
      ],
    });

    this.resetForm = this.fb.group({
      newStartingNumber: [1, [Validators.required, Validators.min(1)]],
    });

    // Setup search debounce
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(() => {
        this.reload();
      });
  }

  ngOnInit(): void {
    this.loadSequenceConfigs();
    this.loadCategories();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadSequenceConfigs(): void {
    this.loading = true;
    this.categoryService.getAllSequenceConfigs().subscribe({
      next: (response: any) => {
        this.sequenceConfigs = response.data || [];
        this.total = this.sequenceConfigs.length;
        this.pages = Math.ceil(this.total / this.limit);
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error loading sequence configs:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load sequence configurations',
        });
        this.loading = false;
      },
    });
  }

  loadCategories(): void {
    this.categoryService
      .getAllCategories({ includeInactive: false })
      .subscribe({
        next: (response: any) => {
          this.categories = response.data || [];
          this.mainCategories = this.categories.filter(c => c.level === 0);
        },
        error: (error: any) => {
          console.error('Error loading categories:', error);
        },
      });
  }

  onCategoryChange(): void {
    this.subcategories = [];
    this.form.patchValue({ subcategoryId: '' });
    const categoryId = this.form.get('categoryId')?.value;
    if (categoryId) {
      this.subcategories = this.categories.filter(
        c => c.parent_id === categoryId
      );
    }
  }

  onSearchChange(term: string): void {
    this.searchTerm = term;
    this.searchSubject.next(term);
  }

  onFilterChange(): void {
    this.reload();
  }

  reload(): void {
    this.loadSequenceConfigs();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.filters = {
      categoryId: undefined,
      includeInactive: false,
    };
    this.reload();
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  onSidebarCollapseChange(collapsed: boolean): void {
    this.sidebarCollapsed = collapsed;
  }

  openCreate(): void {
    this.editing = false;
    this.selected = null;
    this.form.reset({
      categoryId: '',
      subcategoryId: '',
      sequencePrefix: '',
      startingNumber: 1,
      format: '{category}-{sequence}',
    });
    this.formVisible = true;
  }

  openEdit(config: SequenceConfig): void {
    this.editing = true;
    this.selected = config;

    // Extract ID from category_id (could be object or string)
    const categoryId =
      typeof config.category_id === 'object'
        ? config.category_id._id
        : config.category_id;

    // Extract ID from subcategory_id (could be object, string, or null)
    const subcategoryId =
      config.subcategory_id && typeof config.subcategory_id === 'object'
        ? config.subcategory_id._id
        : config.subcategory_id || '';

    this.form.patchValue({
      categoryId: categoryId,
      subcategoryId: subcategoryId,
      sequencePrefix: config.sequence_prefix,
      startingNumber: config.starting_number,
      format: config.format,
    });
    this.onCategoryChange();
    this.formVisible = true;
  }

  closeForm(): void {
    this.formVisible = false;
    this.editing = false;
    this.selected = null;
    this.form.reset();
  }

  submitForm(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting = true;
    const formValue = this.form.value;

    if (this.editing && this.selected) {
      const updateData: UpdateSequenceConfigRequest = {
        sequencePrefix: formValue.sequencePrefix,
        startingNumber: formValue.startingNumber,
        format: formValue.format,
      };

      this.categoryService
        .updateSequenceConfig(this.selected._id, updateData)
        .subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Sequence configuration updated successfully',
            });
            this.closeForm();
            this.loadSequenceConfigs();
            this.submitting = false;
          },
          error: (error: any) => {
            console.error('Error updating sequence config:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail:
                error.message || 'Failed to update sequence configuration',
            });
            this.submitting = false;
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
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Sequence configuration created successfully',
          });
          this.closeForm();
          this.loadSequenceConfigs();
          this.submitting = false;
        },
        error: (error: any) => {
          console.error('Error creating sequence config:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error.message || 'Failed to create sequence configuration',
          });
          this.submitting = false;
        },
      });
    }
  }

  confirmDelete(config: SequenceConfig): void {
    if (
      confirm(
        `Are you sure you want to delete the sequence configuration for "${this.getCategoryName(config.category_id)}"?`
      )
    ) {
      this.categoryService.deleteSequenceConfig(config._id).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Sequence configuration deleted successfully',
          });
          this.loadSequenceConfigs();
        },
        error: (error: any) => {
          console.error('Error deleting sequence config:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error.message || 'Failed to delete sequence configuration',
          });
        },
      });
    }
  }

  openResetModal(config: SequenceConfig): void {
    this.selected = config;
    this.resetForm.patchValue({
      newStartingNumber: config.starting_number,
    });
    this.resetModalVisible = true;
  }

  closeResetModal(): void {
    this.resetModalVisible = false;
    this.selected = null;
    this.resetForm.reset();
  }

  submitReset(): void {
    if (this.resetForm.invalid || !this.selected) {
      return;
    }

    this.submitting = true;
    const resetData: SequenceResetRequest = {
      newStartingNumber: this.resetForm.value.newStartingNumber,
    };

    this.categoryService.resetSequence(this.selected._id, resetData).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Sequence reset successfully',
        });
        this.closeResetModal();
        this.loadSequenceConfigs();
        this.submitting = false;
      },
      error: (error: any) => {
        console.error('Error resetting sequence:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error.message || 'Failed to reset sequence',
        });
        this.submitting = false;
      },
    });
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

  getSubcategoryName(
    subcategoryId: string | { _id: string; name: string } | null | undefined
  ): string {
    if (!subcategoryId) {
      return '-';
    }
    // Handle populated object from backend
    if (typeof subcategoryId === 'object' && subcategoryId !== null) {
      return subcategoryId.name || '-';
    }
    // Handle string ID - look up in categories array
    const subcategory = this.categories.find(c => c._id === subcategoryId);
    return subcategory?.name || '-';
  }

  getFilteredConfigs(): SequenceConfig[] {
    let filtered = [...this.sequenceConfigs];

    // Search filter
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(config => {
        const categoryName = this.getCategoryName(
          config.category_id
        ).toLowerCase();
        const subcategoryName = config.subcategory_id
          ? this.getSubcategoryName(config.subcategory_id).toLowerCase()
          : '';
        return (
          categoryName.includes(term) ||
          subcategoryName.includes(term) ||
          config.sequence_prefix.toLowerCase().includes(term) ||
          config.format.toLowerCase().includes(term)
        );
      });
    }

    // Category filter
    if (this.filters.categoryId) {
      filtered = filtered.filter(config => {
        const categoryId =
          typeof config.category_id === 'object'
            ? config.category_id._id
            : config.category_id;
        return categoryId === this.filters.categoryId;
      });
    }

    // Active filter
    if (!this.filters.includeInactive) {
      filtered = filtered.filter(config => config.is_active);
    }

    // Pagination
    const start = (this.page - 1) * this.limit;
    const end = start + this.limit;
    this.total = filtered.length;
    this.pages = Math.ceil(this.total / this.limit);

    return filtered.slice(start, end);
  }

  onPageChange(newPage: number): void {
    this.page = newPage;
  }

  onLimitChange(newLimit: number): void {
    this.limit = newLimit;
    this.page = 1;
  }

  trackByCategoryId(_index: number, category: Category): string {
    return category._id;
  }

  trackByConfigId(_index: number, config: SequenceConfig): string {
    return config._id;
  }

  trackBySubcategoryId(_index: number, subcategory: Category): string {
    return subcategory._id;
  }
}
