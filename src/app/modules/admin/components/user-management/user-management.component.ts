import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AdminSidebarComponent } from '../shared/admin-sidebar/admin-sidebar.component';
import { UserService } from '../../../../core/services/user.service';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { UserTableComponent } from './user-table.component';
import { ApproveRejectDialogComponent } from './approve-reject-dialog.component';
import { AddUserModalComponent } from './add-user-modal.component';
import { EditUserModalComponent } from './edit-user-modal.component';
import { UserDetailsModalComponent } from './user-details-modal.component';
import { User } from '../../../../core/models/user.model';
import { ToastModule } from 'primeng/toast';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { PageHeaderComponent } from '../../../../core/components/page-header/page-header.component';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    AdminSidebarComponent,
    UserTableComponent,
    ApproveRejectDialogComponent,
    AddUserModalComponent,
    EditUserModalComponent,
    UserDetailsModalComponent,
    ToastModule,
    ConfirmDialogModule,
    PageHeaderComponent,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.css'],
})
export class UserManagementComponent implements OnInit {
  sidebarCollapsed = false;

  totalUsers?: number;
  approvedUsers?: number;
  pendingUsers?: number;

  filtersForm: FormGroup;
  roles: Array<{ _id: string; name: string }> = [];
  departments: Array<{ _id: string; name: string }> = [];
  loadingFilters = false;
  applying = false;
  private lastAppliedFilters: any;
  private refreshVersion = 0;
  appliedFilters: any;
  qp: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {};

  // Modal state
  showApproveReject = false;
  approveMode: 'approve' | 'reject' = 'approve';
  actionLoading = false;
  selectedUser: User | null = null;

  showAddUser = false;
  addUserLoading = false;

  showEditUser = false;
  editUserLoading = false;

  showUserDetails = false;

  // Row-level processing state for button loaders
  rowProcessing: {
    userId: string | null;
    action: 'approve' | 'reject' | 'edit' | 'view' | null;
  } = { userId: null, action: null };

  constructor(
    private userService: UserService,
    private fb: FormBuilder,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.filtersForm = this.fb.group({
      search: [''],
      role: [''],
      department: [''],
      status: [''], // '', 'approved', 'pending'
      dateFrom: [null],
      dateTo: [null],
    });
    this.lastAppliedFilters = this.filtersForm.value;
    this.appliedFilters = {
      ...this.lastAppliedFilters,
      _v: this.refreshVersion,
    };
  }

  trackById = (_: number, item: { _id: string; name: string }) => item._id;

  ngOnInit(): void {
    // Read initial query params for table state
    this.route.queryParamMap.subscribe(params => {
      const page = Number(params.get('page'));
      const limit = Number(params.get('limit'));
      const sortBy = params.get('sortBy') || undefined;
      const sortOrder =
        (params.get('sortOrder') as 'asc' | 'desc') || undefined;
      this.qp = {
        page: Number.isFinite(page) && page > 0 ? page : undefined,
        limit: Number.isFinite(limit) && limit > 0 ? limit : undefined,
        sortBy,
        sortOrder,
      };
    });
    this.loadStats();
    this.loadFilterData();

    // Auto-apply search with debounce, without requiring Apply
    const searchCtrl = this.filtersForm.get('search');
    searchCtrl?.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged())
      .subscribe(() => {
        this.onAutoApplySearch();
      });
  }

  get canApply(): boolean {
    return (
      this.filtersForm.valid &&
      !this.loadingFilters &&
      !this.applying &&
      !this.areEqual(this.filtersForm.value, this.lastAppliedFilters)
    );
  }

  // appliedFilters is maintained as a stable reference; updated only when filters or version change

  private areEqual(a: any, b: any): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  private loadStats(): void {
    this.userService.getUserStatistics().subscribe({
      next: stats => {
        this.totalUsers = stats.totalUsers;
        this.approvedUsers = stats.approvedUsers;
        this.pendingUsers = stats.pendingUsers;
      },
      error: () => {
        this.totalUsers = 0;
        this.approvedUsers = 0;
        this.pendingUsers = 0;
      },
    });
  }

  private loadFilterData(): void {
    this.loadingFilters = true;
    let pending = 2;
    this.userService.getRoles().subscribe({
      next: roles => (this.roles = roles || []),
      error: () => (this.roles = []),
      complete: () => {
        pending -= 1;
        if (pending === 0) this.loadingFilters = false;
      },
    });
    this.userService.getDepartments().subscribe({
      next: deps => (this.departments = deps || []),
      error: () => (this.departments = []),
      complete: () => {
        pending -= 1;
        if (pending === 0) this.loadingFilters = false;
      },
    });
  }

  onClearFilters(): void {
    this.filtersForm.reset({
      search: '',
      role: '',
      department: '',
      status: '',
      dateFrom: null,
      dateTo: null,
    });
  }

  onApplyFilters(): void {
    if (!this.canApply) return;
    this.applying = true;
    // Placeholder for list API fetch; will be wired in the next step
    Promise.resolve().then(() => {
      this.lastAppliedFilters = this.filtersForm.value;
      this.filtersForm.markAsPristine();
      this.applying = false;
      this.syncUrlToFirstPage();
      this.refreshTable();
    });
  }

  private onAutoApplySearch(): void {
    // If only search changed, auto-apply it without affecting other pending changes
    this.applying = true;
    Promise.resolve().then(() => {
      const current = this.filtersForm.value;
      this.lastAppliedFilters = {
        ...this.lastAppliedFilters,
        search: current.search,
      };
      this.filtersForm.get('search')?.markAsPristine();
      this.applying = false;
      this.syncUrlToFirstPage();
      this.refreshTable();
    });
  }

  // Table actions integration
  onViewUser(user: User): void {
    this.rowProcessing = { userId: user._id, action: 'view' };
    this.selectedUser = user;
    this.showUserDetails = true;
    this.rowProcessing = { userId: null, action: null };
  }

  onApproveUser(user: User): void {
    this.rowProcessing = { userId: user._id, action: 'approve' };
    this.selectedUser = user;
    this.approveMode = 'approve';
    this.showApproveReject = true;
    this.rowProcessing = { userId: null, action: null };
  }

  onRejectUser(user: User): void {
    this.rowProcessing = { userId: user._id, action: 'reject' };
    this.selectedUser = user;
    this.approveMode = 'reject';
    this.showApproveReject = true;
    this.rowProcessing = { userId: null, action: null };
  }

  onConfirmApproveReject(): void {
    if (!this.selectedUser) return;
    this.actionLoading = true;
    this.userService
      .approveUser({
        userId: this.selectedUser._id,
        approved: this.approveMode === 'approve',
      })
      .subscribe({
        next: res => {
          const msg = res.message || `User ${this.approveMode}d successfully.`;
          this.showApproveReject = false;
          this.selectedUser = null;
          this.refreshTable();
          this.loadStats();
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: msg,
          });
        },
        error: err => {
          const msg =
            err?.error?.message || `Failed to ${this.approveMode} user.`;
          this.showApproveReject = false;
          this.selectedUser = null;
          this.messageService.add({
            severity: 'error',
            summary: 'Failed',
            detail: msg,
          });
        },
        complete: () => (this.actionLoading = false),
      });
  }

  onCancelApproveReject(): void {
    this.showApproveReject = false;
    this.selectedUser = null;
  }

  onOpenAddUser(): void {
    this.showAddUser = true;
  }

  onCreateUser(formValue: {
    username: string;
    email: string;
    password: string;
    role: string;
    department: string;
  }): void {
    this.addUserLoading = true;
    this.userService.createUser(formValue).subscribe({
      next: res => {
        const msg = res.message || 'User created successfully.';
        this.showAddUser = false;
        this.refreshTable();
        this.loadStats();
        this.messageService.add({
          severity: 'success',
          summary: 'Created',
          detail: msg,
        });
      },
      error: err => {
        const msg = err?.error?.message || 'Failed to create user.';
        this.showAddUser = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Failed',
          detail: msg,
        });
      },
      complete: () => (this.addUserLoading = false),
    });
  }

  onCancelAddUser(): void {
    this.showAddUser = false;
  }

  // Edit User Modal
  onEditUser(user: User): void {
    this.rowProcessing = { userId: user._id, action: 'edit' };
    this.selectedUser = user;
    this.showEditUser = true;
    this.rowProcessing = { userId: null, action: null };
  }

  onUpdateUser(payload: {
    userId: string;
    username: string;
    email: string;
    role: string;
    department: string;
    isApproved: boolean;
  }): void {
    this.editUserLoading = true;
    const { userId, ...userData } = payload;
    this.userService.updateUser(userId, userData).subscribe({
      next: res => {
        const msg = res.message || 'User updated successfully.';
        this.showEditUser = false;
        this.selectedUser = null;
        this.refreshTable();
        this.loadStats();
        this.messageService.add({
          severity: 'success',
          summary: 'Updated',
          detail: msg,
        });
      },
      error: err => {
        const msg = err?.error?.message || 'Failed to update user.';
        this.showEditUser = false;
        this.selectedUser = null;
        this.messageService.add({
          severity: 'error',
          summary: 'Failed',
          detail: msg,
        });
      },
      complete: () => (this.editUserLoading = false),
    });
  }

  onCancelEditUser(): void {
    this.showEditUser = false;
    this.selectedUser = null;
  }

  // User Details Modal
  onCloseUserDetails(): void {
    this.showUserDetails = false;
    this.selectedUser = null;
  }

  onEditFromDetails(user: User): void {
    this.showUserDetails = false;
    this.onEditUser(user);
  }

  onApproveFromDetails(user: User): void {
    this.showUserDetails = false;
    this.onApproveUser(user);
  }

  onRejectFromDetails(user: User): void {
    this.showUserDetails = false;
    this.onRejectUser(user);
  }

  onDeleteUser(user: User): void {
    this.confirmationService.confirm({
      header: 'Delete User',
      message: `Are you sure you want to delete ${user.username}? This action cannot be undone.`,
      icon: 'pi pi-exclamation-triangle',
      acceptIcon: 'pi pi-trash',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.userService.deleteUser(user._id).subscribe({
          next: res => {
            const msg = res.message || 'User removed successfully.';
            this.showUserDetails = false;
            this.selectedUser = null;
            this.refreshTable();
            this.loadStats();
            this.messageService.add({
              severity: 'success',
              summary: 'Deleted',
              detail: msg,
            });
          },
          error: err => {
            const msg = err?.error?.message || 'Failed to delete user.';
            this.messageService.add({
              severity: 'error',
              summary: 'Failed',
              detail: msg,
            });
          },
        });
      },
    });
  }

  private refreshTable(): void {
    this.refreshVersion += 1;
    this.appliedFilters = {
      ...this.lastAppliedFilters,
      _v: this.refreshVersion,
    };
  }

  private syncUrlToFirstPage(): void {
    // Ensure URL reflects page reset when filters/search change
    const q = { ...this.qp, page: 1 };
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: q,
      queryParamsHandling: 'merge',
    });
    this.qp = q;
  }

  // URL sync handlers
  onTablePageChange(event: { page: number; limit: number }): void {
    const q = { ...this.qp, page: event.page, limit: event.limit };
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: q,
      queryParamsHandling: 'merge',
    });
    this.qp = q;
  }

  onTableLimitChange(limit: number): void {
    const q = { ...this.qp, page: 1, limit };
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: q,
      queryParamsHandling: 'merge',
    });
    this.qp = q;
  }

  onTableSortChange(e: { sortBy: string; sortOrder: 'asc' | 'desc' }): void {
    const q = { ...this.qp, sortBy: e.sortBy, sortOrder: e.sortOrder };
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: q,
      queryParamsHandling: 'merge',
    });
    this.qp = q;
  }
}
