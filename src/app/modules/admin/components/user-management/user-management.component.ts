import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AdminSidebarComponent } from '../shared/admin-sidebar/admin-sidebar.component';
import { UserService } from '../../../../core/services/user.service';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { UserTableComponent } from './user-table.component';
import { ApproveRejectDialogComponent } from './approve-reject-dialog.component';
import { AddUserModalComponent } from './add-user-modal.component';
import { User } from '../../../../core/models/user.model';

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
  ],
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

  // Modal state
  showApproveReject = false;
  approveMode: 'approve' | 'reject' = 'approve';
  actionLoading = false;
  selectedUser: User | null = null;

  showAddUser = false;
  addUserLoading = false;

  constructor(
    private userService: UserService,
    private fb: FormBuilder
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
  }

  trackById = (_: number, item: { _id: string; name: string }) => item._id;

  ngOnInit(): void {
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

  get appliedFilters(): any {
    return { ...this.lastAppliedFilters, _v: this.refreshVersion };
  }

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
      this.refreshTable();
    });
  }

  // Table actions integration
  onViewUser(user: User): void {
    this.selectedUser = user;
    // Future: open details modal
  }

  onApproveUser(user: User): void {
    this.selectedUser = user;
    this.approveMode = 'approve';
    this.showApproveReject = true;
  }

  onRejectUser(user: User): void {
    this.selectedUser = user;
    this.approveMode = 'reject';
    this.showApproveReject = true;
  }

  onConfirmApproveReject(payload: { notes: string }): void {
    if (!this.selectedUser) return;
    this.actionLoading = true;
    this.userService
      .approveUser({
        userId: this.selectedUser._id,
        approved: this.approveMode === 'approve',
        notes: payload.notes,
      })
      .subscribe({
        next: () => {
          this.showApproveReject = false;
          this.selectedUser = null;
          this.refreshTable();
          this.loadStats();
        },
        error: () => {
          this.showApproveReject = false;
          this.selectedUser = null;
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
      next: () => {
        this.showAddUser = false;
        this.refreshTable();
        this.loadStats();
      },
      error: () => {
        this.showAddUser = false;
      },
      complete: () => (this.addUserLoading = false),
    });
  }

  onCancelAddUser(): void {
    this.showAddUser = false;
  }

  private refreshTable(): void {
    this.refreshVersion += 1;
  }
}
