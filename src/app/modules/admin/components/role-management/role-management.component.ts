import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminSidebarComponent } from '../shared/admin-sidebar/admin-sidebar.component';
import { RoleFiltersComponent } from './role-filters.component';
import { RoleTableComponent, RoleRow } from './role-table.component';
import { RoleFormModalComponent } from './modals/role-form-modal.component';
import { DepartmentRoleService } from '../../../../core/services/department-role.service';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-role-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ToastModule,
    ConfirmDialogModule,
    AdminSidebarComponent,
    RoleFiltersComponent,
    RoleTableComponent,
    RoleFormModalComponent,
  ],
  template: `
    <p-toast></p-toast>
    <p-confirmDialog
      [style]="{ width: '28rem' }"
      styleClass="fp-dialog rounded-xl shadow-high"
      [dismissableMask]="true"
      [closable]="true"
      [defaultFocus]="'reject'"
      acceptButtonStyleClass="p-button-danger p-button-sm"
      rejectButtonStyleClass="p-button-text p-button-sm"
    ></p-confirmDialog>
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
              <span class="text-text">Roles</span>
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
              (click)="onOpenAddRole()"
            >
              <i class="pi pi-plus mr-2"></i>
              Add Role
            </button>
          </div>
        </div>
      </header>

      <div class="p-6 space-y-6">
        <app-role-filters
          (apply)="onApplyFilters()"
          (clear)="onClearFilters()"
          (searchChange)="onSearchChange($event)"
        ></app-role-filters>
        <app-role-table
          [rows]="rows"
          [total]="total"
          [page]="page"
          [pages]="pages"
          [limit]="limit"
          (pageChange)="onPageChange($event)"
          (limitChange)="onLimitChange($event)"
          (edit)="onEditRole($event)"
          (remove)="onDeleteRole($event)"
        ></app-role-table>
      </div>
    </div>

    <!-- Dialog -->
    <app-role-form-modal
      [visible]="showDialog"
      [mode]="dialogMode"
      [form]="dialogForm"
      (cancel)="onDialogCancel()"
      (save)="onDialogSave($event)"
    ></app-role-form-modal>
  `,
  styles: [':host { display: block; }'],
  providers: [MessageService, ConfirmationService],
})
export class RoleManagementComponent {
  sidebarCollapsed = false;
  applying = false;
  isCompact = false;
  rows: RoleRow[] = [];
  total = 0;
  page = 1;
  limit = 10;
  pages = 0;
  showDialog = false;
  dialogMode: 'create' | 'edit' = 'create';
  dialogForm: { name: string; description?: string } = {
    name: '',
    description: '',
  };
  loading = false;

  constructor(
    private deptRoleService: DepartmentRoleService,
    private messageService: MessageService,
    private confirm: ConfirmationService
  ) {
    this.loadRoles();
  }

  loadRoles(): void {
    this.loading = true;
    this.deptRoleService.getRoles().subscribe({
      next: res => {
        const list = res?.data || [];
        this.rows = list.map(r => ({
          id: r._id,
          name: r.name,
          description: r.description,
          created: r.createdAt || '',
        }));
        this.total = list.length;
        this.pages = Math.ceil(this.total / this.limit) || 1;
      },
      error: err => {
        this.messageService.add({
          severity: 'error',
          summary: 'Failed',
          detail: err?.error?.message || 'Failed to fetch roles',
        });
      },
      complete: () => (this.loading = false),
    });
  }

  onSidebarToggle(): void {}
  onRefresh(): void {
    this.loadRoles();
  }
  onOpenAddRole(): void {
    this.dialogMode = 'create';
    this.dialogForm = { name: '', description: '' };
    this.showDialog = true;
  }
  onClearFilters(): void {}
  onApplyFilters(): void {
    this.applying = true;
    setTimeout(() => (this.applying = false), 250);
  }
  toggleDensity(): void {
    this.isCompact = !this.isCompact;
  }
  onSearchChange(_value: string): void {}
  onEditRole(r: RoleRow): void {
    this.dialogMode = 'edit';
    this.dialogForm = { name: r.name, description: r.description };
    this.showDialog = true;
  }
  onDeleteRole(r: RoleRow): void {
    this.confirm.confirm({
      header: 'Delete Role',
      message: `Are you sure you want to delete "${r.name}"? This action cannot be undone.`,
      icon: 'pi pi-exclamation-triangle text-red-500',
      acceptIcon: 'pi pi-trash',
      rejectIcon: 'pi pi-times',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      defaultFocus: 'reject',
      acceptButtonStyleClass: 'p-button-danger p-button-sm',
      rejectButtonStyleClass: 'p-button-text p-button-sm',
      accept: () => {
        if (!r.id) return;
        this.deptRoleService.deleteRole(r.id).subscribe({
          next: dres => {
            this.messageService.add({
              severity: 'success',
              summary: 'Deleted',
              detail: dres?.message || 'Role deleted',
            });
            this.loadRoles();
          },
          error: err =>
            this.messageService.add({
              severity: 'error',
              summary: 'Failed',
              detail: err?.error?.message || 'Failed to delete role',
            }),
        });
      },
    });
  }
  onPageChange(p: number): void {
    this.page = p; /* Hook backend pagination later */
  }
  onLimitChange(l: number): void {
    this.limit = l;
    this.page = 1; /* Hook backend pagination later */
  }
  onDialogCancel(): void {
    this.showDialog = false;
  }
  onDialogSave(payload: { name: string; description?: string }): void {
    const validation = this.validateRole(payload);
    if (!validation.valid) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation',
        detail: validation.message,
      });
      return;
    }
    if (this.dialogMode === 'create') {
      this.deptRoleService
        .createRole({ name: payload.name, description: payload.description })
        .subscribe({
          next: res => {
            this.messageService.add({
              severity: 'success',
              summary: 'Created',
              detail: res?.message || 'Role created',
            });
            this.loadRoles();
          },
          error: err => {
            this.messageService.add({
              severity: 'error',
              summary: 'Failed',
              detail: err?.error?.message || 'Failed to create role',
            });
          },
        });
    } else {
      const id = this.rows.find(x => x.name === this.dialogForm.name)?.id;
      if (id) {
        this.deptRoleService
          .updateRole(id, {
            name: payload.name,
            description: payload.description,
          })
          .subscribe({
            next: ures => {
              this.messageService.add({
                severity: 'success',
                summary: 'Updated',
                detail: ures?.message || 'Role updated',
              });
              this.loadRoles();
            },
            error: err =>
              this.messageService.add({
                severity: 'error',
                summary: 'Failed',
                detail: err?.error?.message || 'Failed to update role',
              }),
          });
      }
    }
    this.showDialog = false;
  }
  private validateRole(p: { name: string; description?: string }): {
    valid: boolean;
    message?: string;
  } {
    if (!p.name || !p.name.trim())
      return { valid: false, message: 'Role name is required.' };
    if (p.name.length < 2)
      return {
        valid: false,
        message: 'Role name must be at least 2 characters.',
      };
    return { valid: true };
  }
  trackByName = (_: number, r: RoleRow) => r.name;
}
