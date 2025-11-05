import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TechnicianSidebarComponent } from '../components/shared/technician-sidebar/technician-sidebar.component';
import { CreateMachineModalComponent } from '../components/create-machine-modal/create-machine-modal.component';
import { HttpClient } from '@angular/common/http';
import { API_ENDPOINTS } from '../../../core/constants/api.constants';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { BaseApiService } from '../../../core/services/base-api.service';
import { PageHeaderComponent } from '../../../core/components/page-header/page-header.component';

interface MachineRow {
  _id: string;
  name: string;
  category?: { name: string } | string;
  is_approved: boolean;
  party_name?: string;
  location?: string;
  mobile_number?: string;
  machine_sequence?: string;
  documents?: Array<{
    name: string;
    file_path: string;
    document_type?: string;
  }>;
  createdAt: string;
}

@Component({
  selector: 'app-technician-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    TechnicianSidebarComponent,
    CreateMachineModalComponent,
    ToastModule,
    PageHeaderComponent,
  ],
  template: `
    <!-- Standalone technician shell with its own sidebar -->
    <ng-container *ngIf="!embedMode; else embedded">
      <app-technician-sidebar
        [collapsed]="sidebarCollapsed"
        (collapseChange)="sidebarCollapsed = $event"
      ></app-technician-sidebar>
      <div
        class="transition-all duration-300"
        [class.ml-16]="sidebarCollapsed"
        [class.ml-64]="!sidebarCollapsed"
      >
        <!-- Header -->
        <app-page-header
          title="Dashboard"
          subtitle="Technician Dashboard"
          [sidebarCollapsed]="sidebarCollapsed"
          (toggleSidebar)="sidebarCollapsed = !sidebarCollapsed"
          [breadcrumbs]="[
            { label: 'Dispatch', route: '/dispatch/technician' },
            { label: 'Dashboard' },
          ]"
        >
          <div headerActions class="flex items-center gap-2">
            <button
              class="p-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-all duration-200"
              title="Refresh"
              (click)="fetchRecent()"
            >
              <i class="pi pi-refresh text-lg"></i>
            </button>
            <button
              class="px-4 py-2 bg-primary text-white rounded-md font-medium transition-colors duration-150 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              [disabled]="!canCreate"
              (click)="onCreateClicked($event)"
              title="Create new machine"
            >
              <i class="pi pi-plus mr-2"></i>
              Create Machine
            </button>
          </div>
        </app-page-header>
        <p-toast></p-toast>
        <div class="p-6 space-y-6">
          <app-create-machine-modal
            [visible]="createVisible"
            (cancel)="createVisible = false"
            (created)="onMachineCreated()"
          ></app-create-machine-modal>
          <section
            class="bg-bg border border-neutral-300 rounded-xl shadow-medium"
          >
            <div
              class="px-4 py-3 border-b border-neutral-200 flex items-center justify-between"
            >
              <h3 class="font-medium">My Recent Machines</h3>
              <a
                class="text-primary hover:underline"
                [routerLink]="['/admin/machines']"
                >View All</a
              >
            </div>
            <div class="p-4">
              <div *ngIf="loading" class="text-text-muted">Loading...</div>
              <div
                *ngIf="!loading && machines.length === 0"
                class="text-text-muted"
              >
                No machines yet.
              </div>
              <div
                *ngIf="!loading && machines.length > 0"
                class="overflow-x-auto"
              >
                <table class="min-w-full text-sm">
                  <thead>
                    <tr class="text-left">
                      <th class="px-3 py-2">Sequence</th>
                      <th class="px-3 py-2">Name</th>
                      <th class="px-3 py-2">Category</th>
                      <th class="px-3 py-2">Party</th>
                      <th class="px-3 py-2">Location</th>
                      <th class="px-3 py-2">Mobile</th>
                      <th class="px-3 py-2">Created</th>
                      <th class="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      *ngFor="let m of machines"
                      class="border-t border-neutral-200"
                    >
                      <td class="px-3 py-2">
                        <span
                          *ngIf="m.machine_sequence"
                          class="font-mono text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded"
                        >
                          {{ m.machine_sequence }}
                        </span>
                        <span
                          *ngIf="!m.machine_sequence"
                          class="text-gray-400 text-xs italic"
                        >
                          -
                        </span>
                      </td>
                      <td class="px-3 py-2">{{ m.name }}</td>
                      <td class="px-3 py-2">{{ categoryName(m) }}</td>
                      <td class="px-3 py-2">{{ m.party_name || '-' }}</td>
                      <td class="px-3 py-2">{{ m.location || '-' }}</td>
                      <td class="px-3 py-2">{{ m.mobile_number || '-' }}</td>
                      <td class="px-3 py-2">
                        {{ m.createdAt | date: 'medium' }}
                      </td>
                      <td class="px-3 py-2">
                        <span
                          class="px-2 py-1 rounded text-xs"
                          [ngClass]="{
                            'bg-green-100 text-green-700': m.is_approved,
                            'bg-amber-100 text-amber-700': !m.is_approved,
                          }"
                          >{{ m.is_approved ? 'Approved' : 'Pending' }}</span
                        >
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      </div>
    </ng-container>

    <!-- Embedded mode: render only inner content so admin shell can wrap it -->
    <ng-template #embedded>
      <div class="p-6 space-y-6">
        <section
          class="bg-bg border border-neutral-300 rounded-xl shadow-medium"
        >
          <div
            class="px-4 py-3 border-b border-neutral-200 flex items-center justify-between"
          >
            <h3 class="font-medium">My Recent Machines</h3>
            <a
              class="text-primary hover:underline"
              [routerLink]="['/admin/machines']"
              >View All</a
            >
          </div>
          <div class="p-4">
            <div *ngIf="loading" class="text-text-muted">Loading...</div>
            <div
              *ngIf="!loading && machines.length === 0"
              class="text-text-muted"
            >
              No machines yet.
            </div>
            <div
              *ngIf="!loading && machines.length > 0"
              class="overflow-x-auto"
            >
              <table class="min-w-full text-sm">
                <thead>
                  <tr class="text-left">
                    <th class="px-3 py-2">Sequence</th>
                    <th class="px-3 py-2">Name</th>
                    <th class="px-3 py-2">Category</th>
                    <th class="px-3 py-2">Party</th>
                    <th class="px-3 py-2">Location</th>
                    <th class="px-3 py-2">Mobile</th>
                    <th class="px-3 py-2">Created</th>
                    <th class="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    *ngFor="let m of machines"
                    class="border-t border-neutral-200"
                  >
                    <td class="px-3 py-2">
                      <span
                        *ngIf="m.machine_sequence"
                        class="font-mono text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded"
                      >
                        {{ m.machine_sequence }}
                      </span>
                      <span
                        *ngIf="!m.machine_sequence"
                        class="text-gray-400 text-xs italic"
                      >
                        -
                      </span>
                    </td>
                    <td class="px-3 py-2">{{ m.name }}</td>
                    <td class="px-3 py-2">{{ categoryName(m) }}</td>
                    <td class="px-3 py-2">{{ m.party_name || '-' }}</td>
                    <td class="px-3 py-2">{{ m.location || '-' }}</td>
                    <td class="px-3 py-2">{{ m.mobile_number || '-' }}</td>
                    <td class="px-3 py-2">
                      {{ m.createdAt | date: 'medium' }}
                    </td>
                    <td class="px-3 py-2">
                      <span
                        class="px-2 py-1 rounded text-xs"
                        [ngClass]="{
                          'bg-green-100 text-green-700': m.is_approved,
                          'bg-amber-100 text-amber-700': !m.is_approved,
                        }"
                        >{{ m.is_approved ? 'Approved' : 'Pending' }}</span
                      >
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </ng-template>
  `,
})
export class TechnicianDashboardComponent implements OnInit {
  @Input() embedMode = false;
  machines: MachineRow[] = [];
  loading = false;
  sidebarCollapsed = false;
  canCreate = false;
  createVisible = false;

  constructor(
    private http: HttpClient,
    private messageService: MessageService,
    private baseApiService: BaseApiService
  ) {}

  ngOnInit(): void {
    this.checkCreatePermission();
    this.fetchRecent();
  }

  fetchRecent(): void {
    this.loading = true;
    this.baseApiService
      .get<any>(API_ENDPOINTS.MY_RECENT_MACHINES, { limit: 5 })
      .subscribe({
        next: res => {
          const data = res.data || res;
          this.machines = data.machines || data?.data?.machines || [];
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        },
      });
  }

  private checkCreatePermission(): void {
    const body = { action: 'CREATE_MACHINE' };
    this.baseApiService
      .post<any>(API_ENDPOINTS.CHECK_PERMISSION, body)
      .subscribe({
        next: res => {
          const payload: any = (res as any)?.data ?? res;
          const result = payload?.result ?? payload;
          this.canCreate = !!(result?.allowed || result?.requiresApproval);
          if (!this.canCreate) {
            this.messageService.add({
              severity: 'warn',
              summary: 'Permission denied',
              detail:
                result?.reason ||
                'You do not have permission to create machines.',
            });
          } else if (!result?.allowed && result?.requiresApproval) {
            this.messageService.add({
              severity: 'info',
              summary: 'Requires approval',
              detail: 'Your creation will be submitted for approval.',
            });
          }
        },
        error: () => {
          this.canCreate = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Permission check failed',
            detail: 'Could not verify permissions. Please try again.',
          });
        },
      });
  }

  onCreateClicked(event: Event): void {
    if (!this.canCreate) {
      event.preventDefault();
      this.messageService.add({
        severity: 'warn',
        summary: 'Action blocked',
        detail: 'Technician is not allowed to create machines.',
      });
      return;
    }
    this.createVisible = true;
  }

  categoryName(m: MachineRow): string {
    const anyRef = m as any;
    if (anyRef?.category?.name) return anyRef.category.name;
    if (typeof anyRef?.category === 'string') return anyRef.category;
    if (anyRef?.category_id?.name) return anyRef.category_id.name;
    return '-';
  }

  onMachineCreated(): void {
    this.createVisible = false;
    this.fetchRecent();
  }
}
