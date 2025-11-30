import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminSidebarComponent } from '../shared/admin-sidebar/admin-sidebar.component';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { PermissionService } from '../../../../core/services/permission.service';
import { FormsModule } from '@angular/forms';
import { PermissionFiltersComponent } from './permission-filters.component';
import {
  PermissionTableComponent,
  PermissionRuleRow,
} from './permission-table.component';
import { RuleFormModalComponent } from './modals/rule-form-modal.component';
import { RuleViewModalComponent } from './modals/rule-view-modal.component';

@Component({
  selector: 'app-permission-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ToastModule,
    AdminSidebarComponent,
    PermissionFiltersComponent,
    PermissionTableComponent,
    RuleFormModalComponent,
    RuleViewModalComponent,
  ],
  template: `
    <p-toast></p-toast>
    <app-admin-sidebar
      [collapsed]="sidebarCollapsed"
      (collapseChange)="sidebarCollapsed = $event"
    ></app-admin-sidebar>
    <div
      class="transition-all duration-300"
      [class.ml-16]="sidebarCollapsed"
      [class.ml-64]="!sidebarCollapsed"
    >
      <header
        class="bg-bg border-b border-neutral-300 px-6 py-3 sticky top-0 z-40"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <button
              class="p-2.5 text-text-muted hover:text-text hover:bg-neutral-100 cursor-pointer rounded-lg transition-all duration-200"
              title="Toggle sidebar"
              (click)="sidebarCollapsed = !sidebarCollapsed"
            >
              <i class="pi pi-bars"></i>
            </button>
            <nav class="text-sm text-text-muted flex items-center gap-2">
              <i class="pi pi-home"></i>
              <a routerLink="/admin/dashboard" class="hover:underline"
                >Dashboard</a
              >
              <span>/</span>
              <span class="text-text">Permission Rules</span>
            </nav>
          </div>
          <div class="flex items-center gap-2">
            <button
              class="p-2.5 text-text-muted hover:text-text hover:bg-neutral-100 cursor-pointer rounded-lg transition-all duration-200"
              title="Refresh"
              (click)="onRefresh()"
            >
              <i class="pi pi-refresh"></i>
            </button>
            <button
              class="px-3 py-2 bg-primary text-white rounded-md font-medium transition-colors duration-150 hover:bg-primary/90 cursor-pointer"
              (click)="onOpenAddRule()"
            >
              <i class="pi pi-plus mr-2"></i>
              Add Rule
            </button>
          </div>
        </div>
      </header>

      <div class="p-6 space-y-6">
        <app-permission-filters
          (apply)="onApplyFilters()"
          (clear)="onClearFilters()"
          (searchChange)="onSearchChange($event)"
        ></app-permission-filters>
        <app-permission-table
          [rows]="rows"
          [total]="total"
          [page]="page"
          [pages]="pages"
          [limit]="limit"
          (pageChange)="onPageChange($event)"
          (limitChange)="onLimitChange($event)"
          (view)="onViewRule($event)"
          (edit)="onEditRule($event)"
          (toggle)="onToggleRule($event)"
          (remove)="onDeleteRule($event)"
        ></app-permission-table>
      </div>
    </div>

    <app-rule-form-modal
      [visible]="showForm"
      [mode]="dialogMode"
      [form]="dialogForm"
      [roles]="roleOptions"
      [departments]="departmentOptions"
      [categories]="categoryOptions"
      [userOptions]="userOptions"
      [saving]="saving"
      [errors]="formErrors"
      (searchUsers)="onSearchUsers($event)"
      (cancel)="onDialogCancel()"
      (save)="onDialogSave($event)"
    ></app-rule-form-modal>
    <app-rule-view-modal
      [visible]="showView"
      [data]="viewData"
      (close)="onCloseView()"
    ></app-rule-view-modal>

    <!-- Custom Delete Confirmation Modal -->
    <div
      *ngIf="showDeleteDialog"
      class="fixed inset-0 z-[9999] flex items-center justify-center"
      style="z-index: 9999"
    >
      <div
        class="absolute inset-0 bg-black/50"
        (click)="closeDeleteDialog()"
        role="button"
        tabindex="0"
      ></div>
      <div
        class="relative bg-white border border-neutral-300 rounded-xl shadow-2xl w-full max-w-md z-[10000]"
        style="z-index: 10000; width: 28rem"
        (click)="$event.stopPropagation()"
        (keydown.escape)="closeDeleteDialog()"
      >
        <div
          class="flex items-center justify-between p-6 border-b border-neutral-200 bg-gradient-to-r from-error/5 to-error/10"
        >
          <div>
            <h3 class="text-xl font-bold text-text">Delete Permission Rule</h3>
            <p class="text-sm text-text-muted mt-1">
              This action cannot be undone
            </p>
          </div>
          <button
            class="p-2 text-text-muted hover:bg-neutral-100 rounded-md transition-colors"
            (click)="closeDeleteDialog()"
            type="button"
          >
            <i class="pi pi-times text-lg"></i>
          </button>
        </div>

        <div class="p-6">
          <div class="flex items-start gap-4 mb-4">
            <div
              class="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center flex-shrink-0"
            >
              <i class="pi pi-exclamation-triangle text-error text-2xl"></i>
            </div>
            <div>
              <p class="font-semibold text-gray-900">
                Are you sure you want to delete this permission rule?
              </p>
              <p class="text-sm text-gray-600 mt-1">
                Rule: {{ ruleToDelete?.name || 'Unknown' }}
              </p>
            </div>
          </div>
          <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p class="text-sm text-yellow-800">
              <i class="pi pi-info-circle mr-2"></i>
              This will permanently delete the permission rule and all
              associated data.
            </p>
          </div>
        </div>

        <div
          class="flex items-center justify-end gap-3 p-6 border-t border-neutral-200 bg-gray-50"
        >
          <button
            type="button"
            (click)="closeDeleteDialog()"
            [disabled]="deleteLoading"
            class="px-3 py-1.5 rounded-md text-text hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            (click)="confirmDeleteRule()"
            [disabled]="deleteLoading"
            class="px-3 py-1.5 rounded-md bg-error text-white hover:bg-error/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors text-sm"
          >
            <i *ngIf="deleteLoading" class="pi pi-spin pi-spinner"></i>
            <i *ngIf="!deleteLoading" class="pi pi-trash"></i>
            <span *ngIf="!deleteLoading">Delete</span>
            <span *ngIf="deleteLoading">Deleting...</span>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [':host { display: block; }'],
  providers: [MessageService],
})
export class PermissionManagementComponent {
  sidebarCollapsed = false;
  rows: PermissionRuleRow[] = [];
  total = 0;
  page = 1;
  pages = 0;
  limit = 10;

  showForm = false;
  showView = false;
  viewData: any = null;

  // Delete confirmation modal
  showDeleteDialog = false;
  ruleToDelete: PermissionRuleRow | null = null;
  deleteLoading = false;
  dialogMode: 'create' | 'edit' = 'create';
  dialogForm: {
    name: string;
    description?: string;
    action: string;
    permission: 'ALLOWED' | 'REQUIRES_APPROVAL' | 'DENIED';
    approverRoles: string[];
    roles: string[];
    departments: string[];
    categories: string[];
    users: string[];
    maxValue?: number;
    priority?: number;
    active: boolean;
  } = {
    name: '',
    description: '',
    action: '',
    permission: 'ALLOWED',
    approverRoles: [],
    roles: [],
    departments: [],
    categories: [],
    users: [],
    maxValue: undefined,
    priority: undefined,
    active: true,
  };
  roleOptions: Array<{ _id: string; name: string }> = [];
  departmentOptions: Array<{ _id: string; name: string }> = [];
  categoryOptions: Array<{ _id: string; name: string }> = [];
  userOptions: Array<{ _id: string; username: string; email?: string }> = [];
  loadingRefs = false;
  saving = false;
  formErrors: { [key: string]: string[] } | null = null;

  constructor(
    private permissionService: PermissionService,
    private messageService: MessageService
  ) {
    this.loadRules();
  }

  private mapScopes(c: any): string[] {
    const chips: string[] = [];
    if (c.roleIds?.length)
      chips.push(...c.roleIds.map((r: any) => `Role: ${r?.name || r}`));
    if (c.departmentIds?.length)
      chips.push(...c.departmentIds.map((d: any) => `Dept: ${d?.name || d}`));
    if (c.categoryIds?.length)
      chips.push(
        ...c.categoryIds.map((cat: any) => `Category: ${cat?.name || cat}`)
      );
    if (c.userIds?.length)
      chips.push(...c.userIds.map((u: any) => `User: ${u?.username || u}`));
    return chips.length ? chips : ['Global'];
  }

  loadRules(): void {
    this.permissionService
      .getAllPermissionConfigs({
        page: this.page,
        limit: this.limit,
        isActive: true,
      } as any)
      .subscribe({
        next: res => {
          const configs = (res?.data as any)?.configs || [];
          this.rows = configs.map((c: any) => ({
            id: c._id,
            name: c.name,
            description: c.description,
            action: c.action,
            appliesTo: this.mapScopes(c),
            permission: c.permission,
            maxValue: c.maxValue,
            priority: c.priority,
            active: c.isActive,
            updated: c.updatedAt,
          }));
          const pagination = (res?.data as any)?.pagination;
          if (pagination) {
            this.total = pagination.totalItems || 0;
            this.page = pagination.currentPage || 1;
            this.pages = pagination.totalPages || 1;
            this.limit = pagination.itemsPerPage || this.limit;
          } else {
            this.total = this.rows.length;
            this.pages = Math.ceil(this.total / this.limit) || 1;
          }
        },
        error: err =>
          this.messageService.add({
            severity: 'error',
            summary: 'Failed',
            detail: err?.error?.message || 'Failed to load rules',
          }),
      });
  }

  onRefresh(): void {
    this.loadRules();
  }
  onOpenAddRule(): void {
    this.dialogMode = 'create';
    this.dialogForm = {
      name: '',
      description: '',
      action: '',
      permission: 'ALLOWED',
      approverRoles: [],
      roles: [],
      departments: [],
      categories: [],
      users: [],
      active: true,
    };
    this.showForm = true;
    this.loadReferenceData();
  }
  onApplyFilters(): void {}
  onClearFilters(): void {}
  onSearchChange(_value: string): void {}

  onViewRule(r: PermissionRuleRow): void {
    this.viewData = { ...r };
    this.showView = true;
  }
  onEditRule(r: PermissionRuleRow): void {
    this.dialogMode = 'edit';
    this.dialogForm = {
      name: r.name,
      description: r.description,
      action: r.action,
      permission: (r.permission as any) || 'ALLOWED',
      approverRoles: [],
      roles: [],
      departments: [],
      categories: [],
      users: [],
      maxValue: r.maxValue,
      priority: r.priority,
      active: r.active,
    };
    this.showForm = true;
    this.loadReferenceData();
  }
  onToggleRule(r: PermissionRuleRow): void {
    const id = r.id;
    if (!id) return;
    this.permissionService.togglePermissionConfig(id).subscribe({
      next: tres => {
        this.messageService.add({
          severity: 'success',
          summary: 'Toggled',
          detail: tres?.message || 'Rule status updated',
        });
        this.loadRules();
      },
      error: err =>
        this.messageService.add({
          severity: 'error',
          summary: 'Failed',
          detail: err?.error?.message || 'Failed to toggle rule',
        }),
    });
  }
  onDeleteRule(r: PermissionRuleRow): void {
    this.ruleToDelete = r;
    this.showDeleteDialog = true;
  }

  closeDeleteDialog(): void {
    this.showDeleteDialog = false;
    this.ruleToDelete = null;
    this.deleteLoading = false;
  }

  confirmDeleteRule(): void {
    if (!this.ruleToDelete?.id) return;

    this.deleteLoading = true;
    this.permissionService
      .deletePermissionConfig(this.ruleToDelete.id)
      .subscribe({
        next: dres => {
          this.messageService.add({
            severity: 'success',
            summary: 'Deleted',
            detail: dres?.message || 'Rule deleted',
          });
          this.closeDeleteDialog();
          this.loadRules();
        },
        error: err => {
          this.messageService.add({
            severity: 'error',
            summary: 'Failed',
            detail: err?.error?.message || 'Failed to delete rule',
          });
          this.deleteLoading = false;
        },
      });
  }

  onDialogCancel(): void {
    this.showForm = false;
  }
  onDialogSave(payload: typeof this.dialogForm): void {
    const validation = this.validateRulePayload(payload);
    if (!validation.valid) {
      this.formErrors = this.mapValidationToFields(validation.message);
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation',
        detail: validation.message,
      });
      return;
    }
    this.saving = true;
    const body = this.buildCreateOrUpdatePayload(payload);
    if (this.dialogMode === 'create') {
      this.permissionService.createPermissionConfig(body as any).subscribe({
        next: res => {
          this.messageService.add({
            severity: 'success',
            summary: 'Created',
            detail: res?.message || 'Rule created',
          });
          this.loadRules();
          this.formErrors = null;
        },
        error: err => {
          this.messageService.add({
            severity: 'error',
            summary: 'Failed',
            detail: err?.error?.message || 'Failed to create rule',
          });
          this.formErrors = this.mapBackendErrors(err);
        },
      });
    } else {
      const id = this.rows.find(x => x.name === this.dialogForm.name)?.id;
      if (id) {
        this.permissionService
          .updatePermissionConfig(id, {
            ...body,
            isActive: payload.active,
          } as any)
          .subscribe({
            next: ures => {
              this.messageService.add({
                severity: 'success',
                summary: 'Updated',
                detail: ures?.message || 'Rule updated',
              });
              this.loadRules();
              this.formErrors = null;
            },
            error: err => {
              this.messageService.add({
                severity: 'error',
                summary: 'Failed',
                detail: err?.error?.message || 'Failed to update rule',
              });
              this.formErrors = this.mapBackendErrors(err);
            },
          });
      }
    }
    this.saving = false;
    this.showForm = false;
  }
  private validateRulePayload(p: typeof this.dialogForm): {
    valid: boolean;
    message?: string;
  } {
    // Equivalent to a Joi-like validation (frontend mirror of backend)
    if (!p.name || !p.name.trim())
      return { valid: false, message: 'Name is required.' };
    if (!p.action || !p.action.trim())
      return { valid: false, message: 'Action is required.' };
    const allowedPerms = ['ALLOWED', 'REQUIRES_APPROVAL', 'DENIED'];
    if (!allowedPerms.includes(p.permission as any))
      return {
        valid: false,
        message: 'Permission must be Allowed, Requires Approval or Denied.',
      };
    if (
      p.permission === 'REQUIRES_APPROVAL' &&
      (!p.approverRoles || p.approverRoles.length === 0)
    ) {
      return {
        valid: false,
        message:
          'Approver roles are required when permission requires approval.',
      };
    }
    const hasScope =
      (p.roles && p.roles.length) ||
      (p.departments && p.departments.length) ||
      (p.categories && p.categories.length) ||
      (p.users && p.users.length);
    if (!hasScope) {
      return {
        valid: false,
        message:
          'Select at least one condition: Role, Department, Category, or User.',
      };
    }
    if (p.maxValue !== undefined && p.maxValue !== null) {
      const mv = Number(p.maxValue);
      if (Number.isNaN(mv) || mv < 0)
        return {
          valid: false,
          message: 'Max Value must be a non-negative number.',
        };
    }
    if (p.priority !== undefined && p.priority !== null) {
      const pr = Number(p.priority);
      if (!Number.isInteger(pr) || pr < 0)
        return {
          valid: false,
          message: 'Priority must be a non-negative integer.',
        };
    }
    // Optional: at least one scoping condition or allow global rules
    // If all scope arrays empty, treat as global; allowed by backend
    return { valid: true };
  }

  private buildCreateOrUpdatePayload(
    p: typeof this.dialogForm
  ): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      name: p.name?.trim(),
      description: p.description?.trim(),
      action: p.action,
      permission: p.permission,
    };
    // Only include non-empty arrays
    if (Array.isArray(p.roles) && p.roles.length) payload['roleIds'] = p.roles;
    if (Array.isArray(p.users) && p.users.length) payload['userIds'] = p.users;
    if (Array.isArray(p.departments) && p.departments.length)
      payload['departmentIds'] = p.departments;
    if (Array.isArray(p.categories) && p.categories.length)
      payload['categoryIds'] = p.categories;
    if (Array.isArray(p.approverRoles) && p.approverRoles.length)
      payload['approverRoles'] = p.approverRoles;
    // Only include numbers when valid
    const mv = p.maxValue;
    if (mv !== undefined && mv !== null && !Number.isNaN(Number(mv)))
      payload['maxValue'] = Number(mv);
    const pr = p.priority;
    if (pr !== undefined && pr !== null && Number.isInteger(Number(pr)))
      payload['priority'] = Number(pr);
    return payload;
  }

  private mapValidationToFields(
    message?: string | undefined | null
  ): { [key: string]: string[] } | null {
    if (!message) return null;
    const errors: { [key: string]: string[] } = {};
    const msg = message.toLowerCase();
    if (msg.includes('approver')) errors['approverRoles'] = [message];
    else if (msg.includes('select at least one') || msg.includes('condition'))
      errors['scope'] = [message];
    else if (msg.includes('name')) errors['name'] = [message];
    else if (msg.includes('action')) errors['action'] = [message];
    else if (msg.includes('max value')) errors['maxValue'] = [message];
    else if (msg.includes('priority')) errors['priority'] = [message];
    else if (msg.includes('description')) errors['description'] = [message];
    return errors;
  }

  private mapBackendErrors(err: any): { [key: string]: string[] } | null {
    const details =
      err?.error?.details || err?.error?.data || err?.error?.errors;
    if (Array.isArray(details)) {
      const map: { [key: string]: string[] } = {};
      for (const d of details) {
        const field = d.field || 'form';
        const msg = d.message || 'Invalid value';
        map[field] = map[field] ? [...map[field], msg] : [msg];
      }
      return map;
    }
    const message = err?.error?.message || err?.message;
    return this.mapValidationToFields(message);
  }
  loadReferenceData(): void {
    this.loadingRefs = true;
    // Roles and Departments can be fetched via UserService helper
    import('../../../../core/services/user.service').then(m => {
      const us = new m.UserService(this.permissionService['baseApiService']);
      us.getRoles().subscribe({
        next: r => {
          this.roleOptions = r || [];
          // Default approver: Admin if available
          const admin = (this.roleOptions || []).find(
            x => (x.name || '').toLowerCase() === 'admin'
          );
          if (
            admin &&
            (!this.dialogForm.approverRoles ||
              this.dialogForm.approverRoles.length === 0)
          ) {
            this.dialogForm.approverRoles = [admin._id];
          }
        },
      });
      us.getDepartments().subscribe({
        next: d => (this.departmentOptions = d || []),
      });
    });
    import('../../../../core/services/category.service')
      .then(m => {
        const cs = new m.CategoryService(
          this.permissionService['baseApiService']
        );
        cs.getAllCategories({ includeInactive: false }).subscribe({
          next: (res: any) => (this.categoryOptions = (res?.data as any) || []),
        });
      })
      .finally(() => (this.loadingRefs = false));
  }
  onSearchUsers = (q: string) => {
    // Lightweight search using Users endpoint with search param
    import('../../../../core/services/user.service').then(m => {
      const us = new m.UserService(this.permissionService['baseApiService']);
      us.getUsers({ page: 1, limit: 10, search: q }).subscribe({
        next: r => (this.userOptions = (r.users as any) || []),
      });
    });
  };
  onPageChange(p: number): void {
    this.page = p;
    this.loadRules();
  }
  onLimitChange(l: number): void {
    this.limit = l;
    this.page = 1;
    this.loadRules();
  }
  onCloseView(): void {
    this.showView = false;
    this.viewData = null;
  }
}
