import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { AdminSidebarComponent } from '../shared/admin-sidebar/admin-sidebar.component';
import { TablePaginationComponent } from '../user-management/table-pagination.component';
import { RejectReasonModalComponent } from '../../../dispatch/components/reject-reason-modal/reject-reason-modal.component';
import { ApprovalViewModalComponent } from '../../../dispatch/components/approval-view-modal/approval-view-modal.component';
import { ApprovalsService } from '../../../dispatch/services/approvals.service';
import { EditApprovalModalComponent } from './edit-approval-modal.component';

interface ApprovalRow {
  _id: string;
  approvalType: string;
  status: string;
  createdAt: string;
  requestedBy?: { username?: string; email?: string } | string;
  machineId?: { name?: string; _id?: string } | string;
}

@Component({
  selector: 'app-admin-machine-approvals',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ToastModule,
    AdminSidebarComponent,
    TablePaginationComponent,
    RejectReasonModalComponent,
    ApprovalViewModalComponent,
    EditApprovalModalComponent,
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
      <div class="p-6 space-y-6">
        <p-toast></p-toast>
        <header
          class="bg-bg border border-neutral-300 rounded-xl shadow-medium p-4 flex items-center justify-between"
        >
          <div class="flex items-center gap-3">
            <button
              class="p-2.5 text-text-muted hover:text-text hover:bg-neutral-100 rounded-lg"
              (click)="sidebarCollapsed = !sidebarCollapsed"
            >
              <i class="pi pi-bars"></i>
            </button>
            <h2 class="text-xl font-semibold">Machine Approvals</h2>
          </div>
          <button
            class="p-2.5 rounded hover:bg-neutral-100"
            (click)="refresh()"
          >
            <i class="pi pi-refresh"></i>
          </button>
        </header>

        <section
          class="bg-bg border border-neutral-300 rounded-xl shadow-medium"
        >
          <div class="px-4 py-3 border-b border-neutral-200">
            <div class="grid grid-cols-1 md:grid-cols-5 gap-2 items-center">
              <input
                class="border rounded px-2 py-1 md:col-span-2"
                placeholder="Search subject / requester / machine"
                [(ngModel)]="search"
                (ngModelChange)="onSearch()"
              />
              <select
                class="border rounded px-2 py-1"
                [(ngModel)]="status"
                (change)="refresh()"
              >
                <option value="">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
              <select
                class="border rounded px-2 py-1"
                [(ngModel)]="type"
                (change)="refresh()"
              >
                <option value="">All Types</option>
                <option value="MACHINE_CREATION">Creation</option>
                <option value="MACHINE_EDIT">Edit</option>
                <option value="MACHINE_DELETION">Deletion</option>
              </select>
              <select
                class="border rounded px-2 py-1"
                [(ngModel)]="sort"
                (change)="refresh()"
              >
                <option value="-createdAt">Newest</option>
                <option value="createdAt">Oldest</option>
              </select>
            </div>
          </div>
          <div class="p-4">
            <div *ngIf="loading" class="text-text-muted">Loading...</div>
            <div
              *ngIf="!loading && (rows?.length || 0) === 0"
              class="text-text-muted"
            >
              No approvals found.
            </div>
            <div
              *ngIf="!loading && (rows?.length || 0) > 0"
              class="overflow-x-auto"
            >
              <table class="min-w-full text-sm">
                <thead>
                  <tr class="text-left">
                    <th class="px-3 py-2">Machine</th>
                    <th class="px-3 py-2">Type</th>
                    <th class="px-3 py-2">Requested By</th>
                    <th class="px-3 py-2">Status</th>
                    <th class="px-3 py-2">Created</th>
                    <th class="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    *ngFor="let a of rows"
                    class="border-t border-neutral-200"
                  >
                    <td class="px-3 py-2">{{ machineName(a) }}</td>
                    <td class="px-3 py-2">{{ a.approvalType }}</td>
                    <td class="px-3 py-2">{{ requesterName(a) }}</td>
                    <td class="px-3 py-2">
                      <span
                        class="px-2 py-1 rounded text-xs"
                        [ngClass]="{
                          'bg-amber-100 text-amber-700': a.status === 'PENDING',
                          'bg-green-100 text-green-700':
                            a.status === 'APPROVED',
                          'bg-red-100 text-red-700': a.status === 'REJECTED',
                        }"
                        >{{ a.status }}</span
                      >
                    </td>
                    <td class="px-3 py-2">
                      {{ a.createdAt | date: 'medium' }}
                    </td>
                    <td class="px-3 py-2 whitespace-nowrap">
                      <button
                        class="px-2 py-1 text-sm rounded border hover:bg-neutral-100 mr-2"
                        (click)="view(a)"
                      >
                        View
                      </button>
                      <ng-container
                        *ngIf="a.status === 'PENDING'; else noActions"
                      >
                        <button
                          class="px-2 py-1 text-sm rounded border hover:bg-neutral-100 mr-2"
                          (click)="openEdit(a)"
                        >
                          Edit
                        </button>
                        <button
                          class="px-2 py-1 text-sm rounded border hover:bg-neutral-100 mr-2"
                          (click)="approve(a)"
                        >
                          Approve
                        </button>
                        <button
                          class="px-2 py-1 text-sm rounded border hover:bg-neutral-100 text-error"
                          (click)="openReject(a)"
                        >
                          Reject
                        </button>
                      </ng-container>
                      <ng-template #noActions>
                        <span class="text-xs text-text-muted">No actions</span>
                      </ng-template>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <app-table-pagination
              [page]="page"
              [pages]="pages"
              [total]="total"
              [limit]="limit"
              (pageChange)="onPage($event)"
              (limitChange)="onLimit($event)"
            >
            </app-table-pagination>
          </div>
        </section>

        <app-reject-reason-modal
          [visible]="rejectVisible"
          [proposedChanges]="selectedProposedChanges"
          (cancel)="rejectVisible = false"
          (submitReject)="confirmReject($event)"
        >
        </app-reject-reason-modal>

        <app-approval-view-modal
          [visible]="viewVisible"
          [approval]="selectedApproval"
          [machine]="selectedMachine"
          (close)="viewVisible = false"
        >
        </app-approval-view-modal>

        <app-edit-approval-modal
          [visible]="editVisible"
          [roleOptions]="editRoleOptions"
          [value]="editInitialValue()"
          (cancel)="editVisible = false"
          (submitEdit)="onSubmitEdit($event)"
        ></app-edit-approval-modal>
      </div>
    </div>
  `,
})
export class AdminMachineApprovalsComponent implements OnInit {
  sidebarCollapsed = false;
  loading = false;
  rows: ApprovalRow[] = [];
  page = 1;
  pages = 1;
  total = 0;
  limit = 10;
  search = '';
  status: '' | 'PENDING' | 'APPROVED' | 'REJECTED' = '';
  type: '' | 'MACHINE_CREATION' | 'MACHINE_EDIT' | 'MACHINE_DELETION' = '';
  sort: 'createdAt' | '-createdAt' = '-createdAt';

  // modals
  rejectVisible = false;
  viewVisible = false;
  selectedApproval: any = null;
  selectedMachine: any = null;
  selectedProposedChanges: Record<string, unknown> | null = null;
  editVisible = false;
  editRoleOptions: Array<{ _id: string; name: string }> = [];

  constructor(
    private approvals: ApprovalsService,
    private message: MessageService
  ) {}

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.loading = true;
    const s = this.status ? (this.status.toLowerCase() as any) : 'pending';
    this.approvals
      .getPending(this.page, this.limit, this.search, s, this.sort)
      .subscribe({
        next: res => {
          const d: any = res as any;
          this.rows = Array.isArray(d?.approvals) ? d.approvals : [];
          this.total = Number(d?.total) || this.rows.length || 0;
          this.pages =
            Number(d?.pages) || Math.ceil(this.total / this.limit) || 1;
          this.loading = false;
        },
        error: () => (this.loading = false),
      });
  }

  onSearch(): void {
    this.page = 1;
    this.refresh();
  }
  onPage(p: number): void {
    this.page = p;
    this.refresh();
  }
  onLimit(l: number): void {
    this.limit = l;
    this.page = 1;
    this.refresh();
  }

  approve(a: ApprovalRow): void {
    this.approvals.processApproval(a._id, { approved: true }).subscribe({
      next: () => {
        this.message.add({ severity: 'success', summary: 'Approved' });
        this.refresh();
      },
      error: err => {
        this.message.add({
          severity: 'error',
          summary: 'Error',
          detail: err?.error?.message || 'Failed',
        });
      },
    });
  }

  openReject(a: ApprovalRow): void {
    this.selectedApproval = a;
    this.selectedProposedChanges = null;
    this.approvals.getById(a._id).subscribe({
      next: (full: any) => {
        this.selectedProposedChanges = full?.proposedChanges ?? null;
        this.rejectVisible = true;
      },
      error: () => {
        this.rejectVisible = true;
      },
    });
  }

  confirmReject(data: {
    reason: string;
    approverNotes?: string;
    suggestedChanges: Record<string, unknown> | null;
  }): void {
    const id = this.selectedApproval?._id;
    if (!id) return;
    this.rejectVisible = false;
    this.approvals
      .processApproval(id, {
        approved: false,
        rejectionReason: data.reason,
        approverNotes: data.approverNotes,
        suggestedChanges: data.suggestedChanges ?? undefined,
      })
      .subscribe({
        next: () => {
          this.message.add({ severity: 'success', summary: 'Rejected' });
          this.refresh();
        },
        error: err => {
          this.message.add({
            severity: 'error',
            summary: 'Error',
            detail: err?.error?.message || 'Failed',
          });
        },
      });
  }

  view(a: ApprovalRow): void {
    this.selectedApproval = null;
    this.selectedMachine = null;
    this.approvals.getById(a._id).subscribe({
      next: (full: any) => {
        this.selectedApproval = full;
        const mid =
          typeof full?.machineId === 'string'
            ? full?.machineId
            : full?.machineId?._id;
        if (!mid) {
          this.viewVisible = true;
          return;
        }
        // fetch via same base API used globally (ApprovalsService uses BaseApiService)
        (this.approvals as any).api.get(`/machines/${mid}`).subscribe({
          next: (mres: any) => {
            const data = mres?.data || mres;
            this.selectedMachine = data?.machine || data;
            this.viewVisible = true;
          },
          error: () => {
            this.viewVisible = true;
          },
        });
      },
      error: () => {
        this.viewVisible = true;
      },
    });
  }

  machineName(a: ApprovalRow): string {
    const m = a.machineId as any;
    if (!m) return '-';
    if (typeof m === 'string') return m;
    return m?.name || '-';
  }

  requesterName(a: ApprovalRow): string {
    const r = a.requestedBy as any;
    if (!r) return '-';
    if (typeof r === 'string') return r;
    return r?.username || r?.email || '-';
  }

  openEdit(a: ApprovalRow): void {
    // Always reload the latest approval snapshot from server before editing
    const loadApproval$ = this.approvals.getById(a._id);
    const loadRoles$ = (this.approvals as any).api.get('/admin/roles');

    let rolesLoaded = false;
    let approvalLoaded = false;
    const tryOpen = () => {
      if (rolesLoaded && approvalLoaded) this.editVisible = true;
    };

    loadApproval$.subscribe({
      next: (full: any) => {
        this.selectedApproval = full;
        approvalLoaded = true;
        tryOpen();
      },
      error: () => {
        this.selectedApproval = a;
        approvalLoaded = true;
        tryOpen();
      },
    });
    loadRoles$.subscribe({
      next: (res: any) => {
        const data = res?.data || res;
        this.editRoleOptions = Array.isArray(data?.roles)
          ? data.roles
          : Array.isArray(data)
            ? data
            : [];
        rolesLoaded = true;
        tryOpen();
      },
      error: () => {
        this.editRoleOptions = [];
        rolesLoaded = true;
        tryOpen();
      },
    });
  }

  onSubmitEdit(payload: {
    approvalType?: any;
    approverRoles?: string[];
    requestNotes?: string;
    proposedChanges?: Record<string, unknown>;
  }): void {
    const id = this.selectedApproval?._id;
    if (!id) return;
    this.editVisible = false;
    this.approvals.updateApproval(id, payload).subscribe({
      next: () => {
        this.message.add({ severity: 'success', summary: 'Updated' });
        // Refresh table and selected approval snapshot for subsequent edits
        this.refresh();
        this.approvals.getById(id).subscribe({
          next: (full: any) => (this.selectedApproval = full),
          error: () => {},
        });
      },
      error: err => {
        this.message.add({
          severity: 'error',
          summary: 'Error',
          detail: err?.error?.message || 'Failed to update',
        });
      },
    });
  }

  editInitialValue(): {
    approvalType?: any;
    approverRoles?: string[];
    requestNotes?: string;
    proposedChanges?: Record<string, unknown> | null;
  } {
    const a: any = this.selectedApproval || {};
    const roles = Array.isArray(a?.approverRoles)
      ? a.approverRoles
          .map((r: any) => (typeof r === 'string' ? r : r?._id))
          .filter(Boolean)
      : [];
    return {
      approvalType: a?.approvalType,
      approverRoles: roles,
      requestNotes: a?.requestNotes,
      proposedChanges: a?.proposedChanges ?? {},
    } as any;
  }
}
