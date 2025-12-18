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
import { MachineService } from '../../../core/services/machine.service';
import { PageHeaderComponent } from '../../../core/components/page-header/page-header.component';
import { SO } from '../../../core/models/so.model';

interface MachineRow {
  _id: string;
  so_id: string; // Reference to SO
  so?: SO | null; // Populated SO data
  is_approved: boolean;
  location?: string;
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
                      <td class="px-3 py-2">
                        {{ getSOName(m) }}
                      </td>
                      <td class="px-3 py-2">{{ categoryName(m) }}</td>
                      <td class="px-3 py-2">{{ m.so?.party_name || '-' }}</td>
                      <td class="px-3 py-2">{{ m.so?.location || '-' }}</td>
                      <td class="px-3 py-2">
                        {{ m.so?.mobile_number || '-' }}
                      </td>
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
                    <th class="px-3 py-2">S.O. Number</th>
                    <th class="px-3 py-2">P.O. Number</th>
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
                    <td class="px-3 py-2">
                      {{ getSOName(m) }}
                    </td>
                    <td class="px-3 py-2">
                      {{ m.so?.so_number || '-' }}
                    </td>
                    <td class="px-3 py-2">
                      {{ m.so?.po_number || '-' }}
                    </td>
                    <td class="px-3 py-2">{{ categoryName(m) }}</td>
                    <td class="px-3 py-2">{{ m.so?.party_name || '-' }}</td>
                    <td class="px-3 py-2">{{ m.so?.location || '-' }}</td>
                    <td class="px-3 py-2">{{ m.so?.mobile_number || '-' }}</td>
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
    private baseApiService: BaseApiService,
    private machineService: MachineService
  ) {}

  ngOnInit(): void {
    this.checkCreatePermission();
    this.fetchRecent();
  }

  fetchRecent(): void {
    this.loading = true;
    // Use MachineService to get machines with proper SO population
    this.machineService.getAllMachines({ limit: 5, page: 1 }).subscribe({
      next: (res: any) => {
        const data = res?.data || res;
        const machines = data.machines || data?.data?.machines || [];
        // Map to MachineRow format with SO data
        // Note: Backend populates so_id with the SO object, not a separate 'so' field
        this.machines = machines.map((m: any) => {
          // Extract SO data - so_id is populated as an object by the backend
          const soIdValue = m.so_id;
          let soData = null;
          let soIdString = null;

          // Check if so_id is a populated object or just an ID string
          if (
            soIdValue &&
            typeof soIdValue === 'object' &&
            soIdValue !== null
          ) {
            // so_id is populated - extract the SO data (same as technician-machines component)
            soIdString = soIdValue._id?.toString() || null;
            soData = {
              _id: soIdString,
              name: soIdValue.name || null,
              customer: soIdValue.customer || null,
              so_number: soIdValue.so_number || null,
              po_number: soIdValue.po_number || null,
              so_date: soIdValue.so_date || null,
              po_date: soIdValue.po_date || null,
              location: soIdValue.location || null,
              category_id: soIdValue.category_id || null,
              subcategory_id: soIdValue.subcategory_id || null,
              party_name: soIdValue.party_name || null,
              mobile_number: soIdValue.mobile_number || null,
            };
          } else if (soIdValue && typeof soIdValue === 'string') {
            // so_id is just a string ID (not populated)
            soIdString = soIdValue;
            soData = null;
          }

          return {
            _id: m._id,
            so_id: soIdString || null,
            so: soData,
            is_approved: m.is_approved || false,
            location: m.location || null,
            machine_sequence: m.machine_sequence || null,
            documents: m.documents || [],
            createdAt: m.createdAt || m.created_at || new Date().toISOString(),
          };
        });
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

  getSOName(m: MachineRow): string {
    // Match the logic from technician-machines component
    if (m.so?.customer) return m.so.customer;
    if (m.so?.name) return m.so.name;
    if (m.so?.so_number) return m.so.so_number;
    if (m.so_id) return m.so_id;
    return '-';
  }

  categoryName(m: MachineRow): string {
    if (!m.so?.category_id) return '-';
    if (typeof m.so.category_id === 'string') return m.so.category_id;
    if (typeof m.so.category_id === 'object' && m.so.category_id !== null) {
      return (m.so.category_id as { name?: string }).name || '-';
    }
    return '-';
  }

  onMachineCreated(): void {
    this.createVisible = false;
    this.fetchRecent();
  }
}
