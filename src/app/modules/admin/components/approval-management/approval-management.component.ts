import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminSidebarComponent } from '../shared/admin-sidebar/admin-sidebar.component';
import { HttpClient } from '@angular/common/http';
import { API_ENDPOINTS } from '../../../../core/constants/api.constants';

@Component({
  selector: 'app-approval-management',
  standalone: true,
  imports: [CommonModule, AdminSidebarComponent],
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
      <header
        class="bg-bg border-b border-neutral-300 px-6 py-3 sticky top-0 z-40"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <button
              class="p-2.5 text-text-muted hover:text-text hover:bg-neutral-100 rounded-lg"
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
              <span class="text-text">Approvals</span>
            </nav>
          </div>
          <div class="flex items-center gap-2">
            <button
              class="p-2.5 text-text-muted hover:text-text hover:bg-neutral-100 rounded-lg"
              title="Refresh"
              (click)="refreshAll()"
            >
              <i class="pi pi-refresh"></i>
            </button>
          </div>
        </div>
      </header>

      <main class="p-6 space-y-6">
        <!-- Tabs -->
        <div class="flex gap-2">
          <button
            class="px-3 py-2 rounded-md"
            [class.bg-neutral-200]="activeTab === 'users'"
            (click)="activeTab = 'users'"
          >
            User Approvals
          </button>
          <button
            class="px-3 py-2 rounded-md"
            [class.bg-neutral-200]="activeTab === 'machines'"
            (click)="activeTab = 'machines'"
          >
            Dispatch Approvals
          </button>
        </div>

        <!-- User Approvals Table -->
        <section
          *ngIf="activeTab === 'users'"
          class="bg-bg border border-neutral-300 rounded-xl shadow-medium"
        >
          <div
            class="px-4 py-3 border-b border-neutral-200 flex items-center justify-between"
          >
            <h3 class="font-medium">Pending User Approvals</h3>
          </div>
          <div class="p-4">
            <div *ngIf="loadingUsers" class="text-text-muted">Loading...</div>
            <div
              *ngIf="!loadingUsers && pendingUsers.length === 0"
              class="text-text-muted"
            >
              No pending users.
            </div>
            <div
              *ngIf="!loadingUsers && pendingUsers.length > 0"
              class="overflow-x-auto"
            >
              <table class="min-w-full text-sm">
                <thead>
                  <tr class="text-left">
                    <th class="px-3 py-2">Name</th>
                    <th class="px-3 py-2">Email</th>
                    <th class="px-3 py-2">Role</th>
                    <th class="px-3 py-2">Requested</th>
                    <th class="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    *ngFor="let u of pendingUsers"
                    class="border-t border-neutral-200"
                  >
                    <td class="px-3 py-2">{{ u.username }}</td>
                    <td class="px-3 py-2">{{ u.email }}</td>
                    <td class="px-3 py-2">{{ u.role?.name || '-' }}</td>
                    <td class="px-3 py-2">
                      {{ u.createdAt | date: 'medium' }}
                    </td>
                    <td class="px-3 py-2">
                      <button
                        class="px-2 py-1 bg-primary text-white rounded hover:bg-primary/90 mr-2"
                        (click)="approveUser(u._id)"
                      >
                        Approve
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <!-- Machine Approvals Table -->
        <section
          *ngIf="activeTab === 'machines'"
          class="bg-bg border border-neutral-300 rounded-xl shadow-medium"
        >
          <div
            class="px-4 py-3 border-b border-neutral-200 flex items-center justify-between"
          >
            <h3 class="font-medium">Pending Dispatch Approvals</h3>
            <a
              class="text-primary hover:underline"
              routerLink="/dispatch/approvals"
              >Open Dispatch Approvals</a
            >
          </div>
          <div class="p-4">
            <div *ngIf="loadingApprovals" class="text-text-muted">
              Loading...
            </div>
            <div
              *ngIf="!loadingApprovals && pendingApprovals.length === 0"
              class="text-text-muted"
            >
              No pending dispatch approvals.
            </div>
            <div
              *ngIf="!loadingApprovals && pendingApprovals.length > 0"
              class="overflow-x-auto"
            >
              <table class="min-w-full text-sm">
                <thead>
                  <tr class="text-left">
                    <th class="px-3 py-2">Machine</th>
                    <th class="px-3 py-2">Type</th>
                    <th class="px-3 py-2">Requested By</th>
                    <th class="px-3 py-2">Created</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    *ngFor="let a of pendingApprovals"
                    class="border-t border-neutral-200"
                  >
                    <td class="px-3 py-2">{{ a.machineId?.name || '-' }}</td>
                    <td class="px-3 py-2">{{ a.approvalType }}</td>
                    <td class="px-3 py-2">
                      {{
                        a.requestedBy?.username || a.requestedBy?.email || '-'
                      }}
                    </td>
                    <td class="px-3 py-2">
                      {{ a.createdAt | date: 'medium' }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
    </div>
  `,
  styles: [':host { display: block; }'],
})
export class ApprovalManagementComponent implements OnInit {
  sidebarCollapsed = false;
  activeTab: 'users' | 'machines' = 'users';

  pendingUsers: any[] = [];
  pendingApprovals: any[] = [];
  loadingUsers = false;
  loadingApprovals = false;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.refreshAll();
  }

  refreshAll(): void {
    if (this.activeTab === 'users') {
      this.fetchPendingUsers();
    } else {
      this.fetchPendingApprovals();
    }
  }

  fetchPendingUsers(): void {
    this.loadingUsers = true;
    this.http
      .get<any>(`${API_ENDPOINTS.USERS}?isApproved=false&page=1&limit=10`)
      .subscribe({
        next: res => {
          const data = res.data || res;
          this.pendingUsers = data.users || data?.data?.users || [];
          this.loadingUsers = false;
        },
        error: () => (this.loadingUsers = false),
      });
  }

  fetchPendingApprovals(): void {
    this.loadingApprovals = true;
    this.http
      .get<any>(`${API_ENDPOINTS.PENDING_APPROVALS}?page=1&limit=10`)
      .subscribe({
        next: res => {
          const data = res.data || res;
          this.pendingApprovals = data.approvals || data?.data?.approvals || [];
          this.loadingApprovals = false;
        },
        error: () => (this.loadingApprovals = false),
      });
  }

  approveUser(userId: string): void {
    const url = API_ENDPOINTS.USER_APPROVE.replace(':id', userId);
    this.http.patch<any>(url, {}).subscribe({
      next: () => {
        this.pendingUsers = this.pendingUsers.filter(u => u._id !== userId);
      },
      error: () => {},
    });
  }
}
