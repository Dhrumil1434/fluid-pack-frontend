import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { UserService } from '../../../../core/services/user.service';
import { User } from '../../../../core/models/user.model';
import { ButtonModule } from 'primeng/button';
import { TablePaginationComponent } from './table-pagination.component';

@Component({
  selector: 'app-user-table',
  standalone: true,
  imports: [CommonModule, ButtonModule, TablePaginationComponent],
  templateUrl: './user-table.component.html',
  styleUrls: ['./user-table.component.css'],
})
export class UserTableComponent implements OnChanges {
  @Input() filters: any;
  @Input() processing: {
    userId: string | null;
    action: 'approve' | 'reject' | 'edit' | 'view' | null;
  } = { userId: null, action: null };

  @Output() view = new EventEmitter<User>();
  @Output() approve = new EventEmitter<User>();
  @Output() reject = new EventEmitter<User>();
  @Output() edit = new EventEmitter<User>();

  users: User[] = [];
  loading = false;

  // Table state
  page = 1;
  limit = 5;
  sortBy: string = 'createdAt';
  sortOrder: 'asc' | 'desc' = 'desc';

  // UI state
  isCompact = false;
  visibleColumns: Record<string, boolean> = {
    user: true,
    email: true,
    role: true,
    department: true,
    status: true,
    createdAt: true,
    actions: true,
  };

  total = 0;
  pages = 0;

  private lastQueryKey = '';

  constructor(private userService: UserService) {}

  // trackBy helpers for templates
  trackByUser = (_: number, item: User) => item._id;
  trackByCol = (_: number, item: string) => item;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['filters']) {
      this.page = 1; // reset page on filters change
      this.load();
    }
  }

  toggleDensity(): void {
    this.isCompact = !this.isCompact;
  }

  toggleColumn(key: string): void {
    this.visibleColumns[key] = !this.visibleColumns[key];
  }

  onSort(column: string): void {
    if (this.sortBy === column) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = column;
      this.sortOrder = 'asc';
    }
    this.load();
  }

  goToPage(p: number): void {
    if (p < 1 || (this.pages && p > this.pages) || p === this.page) return;
    this.page = p;
    this.load();
  }

  private buildQueryKey(): string {
    const f = this.filters || {};
    return JSON.stringify({
      f,
      page: this.page,
      limit: this.limit,
      sortBy: this.sortBy,
      sortOrder: this.sortOrder,
    });
  }

  load(): void {
    const qk = this.buildQueryKey();
    if (qk === this.lastQueryKey) return;
    this.lastQueryKey = qk;

    this.loading = true;
    this.userService
      .getUsers({
        page: this.page,
        limit: this.limit,
        sortBy: this.sortBy,
        sortOrder: this.sortOrder,
      })
      .subscribe({
        next: res => {
          this.users = res.users;
          this.total = res.total;
          this.pages = res.pages;
        },
        error: () => {
          this.users = [];
          this.total = 0;
          this.pages = 0;
        },
        complete: () => (this.loading = false),
      });
  }

  // Helpers
  statusSeverity(user: User): 'success' | 'warning' {
    return user.isApproved ? 'success' : 'warning';
  }

  statusLabel(user: User): string {
    return user.isApproved ? 'Approved' : 'Pending';
  }

  onViewClick(user: User): void {
    this.view.emit(user);
  }

  onApproveClick(user: User): void {
    this.approve.emit(user);
  }

  onRejectClick(user: User): void {
    this.reject.emit(user);
  }

  onEditClick(user: User): void {
    this.edit.emit(user);
  }
}
