import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { API_ENDPOINTS } from '../../../core/constants/api.constants';

interface ApprovalRow {
  _id: string;
  approvalType: string;
  status: string;
  createdAt: string;
  requestedBy?: { username?: string; email?: string };
  machineId?: { name?: string };
}

@Component({
  selector: 'app-approvals-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-6 space-y-6">
      <header
        class="bg-bg border border-neutral-300 rounded-xl shadow-medium p-4 flex items-center justify-between"
      >
        <h2 class="text-xl font-semibold">Dispatch Approvals</h2>
        <button
          class="p-2.5 rounded hover:bg-neutral-100"
          (click)="fetchPending()"
        >
          <i class="pi pi-refresh"></i>
        </button>
      </header>

      <section class="bg-bg border border-neutral-300 rounded-xl shadow-medium">
        <div class="px-4 py-3 border-b border-neutral-200">
          <h3 class="font-medium">Pending Approvals</h3>
        </div>
        <div class="p-4">
          <div *ngIf="loading" class="text-text-muted">Loading...</div>
          <div
            *ngIf="!loading && approvals.length === 0"
            class="text-text-muted"
          >
            No pending approvals.
          </div>
          <div *ngIf="!loading && approvals.length > 0" class="overflow-x-auto">
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
                  *ngFor="let a of approvals"
                  class="border-t border-neutral-200"
                >
                  <td class="px-3 py-2">{{ a.machineId?.name || '-' }}</td>
                  <td class="px-3 py-2">{{ a.approvalType }}</td>
                  <td class="px-3 py-2">
                    {{ a.requestedBy?.username || a.requestedBy?.email || '-' }}
                  </td>
                  <td class="px-3 py-2">{{ a.createdAt | date: 'medium' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  `,
})
export class ApprovalsDashboardComponent implements OnInit {
  approvals: ApprovalRow[] = [];
  loading = false;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.fetchPending();
  }

  fetchPending(): void {
    this.loading = true;
    this.http
      .get<any>(`${API_ENDPOINTS.PENDING_APPROVALS}?page=1&limit=10`)
      .subscribe({
        next: res => {
          const data = res.data || res;
          this.approvals = data.approvals || data?.data?.approvals || [];
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        },
      });
  }
}
