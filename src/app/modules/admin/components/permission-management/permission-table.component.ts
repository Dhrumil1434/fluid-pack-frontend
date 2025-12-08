import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ListTableShellComponent } from '../shared/list/list-table-shell.component';
import { TablePaginationComponent } from '../user-management/table-pagination.component';
import { TagChipComponent } from '../shared/list/tag-chip.component';

export interface PermissionRuleRow {
  id?: string;
  name: string;
  description?: string;
  action: string;
  appliesTo: string[]; // chips summary
  permission: 'ALLOWED' | 'REQUIRES_APPROVAL' | 'DENIED' | string;
  maxValue?: number;
  priority?: number;
  active: boolean;
  updated?: string;
}

@Component({
  selector: 'app-permission-table',
  standalone: true,
  imports: [
    CommonModule,
    ListTableShellComponent,
    TablePaginationComponent,
    TagChipComponent,
  ],
  template: `
    <app-list-table-shell title="Permission Rules">
      <table class="w-full border-collapse">
        <thead class="bg-bg-soft">
          <tr>
            <th class="text-left px-4 py-3">Name</th>
            <th class="text-left px-4 py-3">Action</th>
            <th class="text-left px-4 py-3">Applies To</th>
            <th class="text-left px-4 py-3">Max Value</th>
            <th class="text-left px-4 py-3">Priority</th>
            <th class="text-left px-4 py-3">Active</th>
            <th class="text-left px-4 py-3">Updated</th>
            <th class="text-left px-4 py-3 w-[360px]">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr
            *ngFor="let r of rows; trackBy: trackByName"
            class="hover:bg-bg-soft border-t border-neutral-200 align-top"
          >
            <td
              class="px-4 py-3 whitespace-nowrap max-w-[220px] truncate"
              title="{{ r.name }}"
            >
              {{ r.name }}
            </td>
            <td class="px-4 py-3 whitespace-nowrap">
              <app-tag-chip
                [label]="r.action"
                tone="info"
                icon="pi-cog"
              ></app-tag-chip>
            </td>
            <td class="px-4 py-3 align-top">
              <div class="flex flex-wrap gap-2 max-w-[320px]">
                <app-tag-chip
                  *ngFor="let chip of r.appliesTo; trackBy: trackByChip"
                  [label]="chip"
                  [tone]="chipTone(chip)"
                  [icon]="chipIcon(chip)"
                ></app-tag-chip>
              </div>
            </td>
            <td class="px-4 py-3 whitespace-nowrap">{{ r.maxValue || '-' }}</td>
            <td class="px-4 py-3 whitespace-nowrap">{{ r.priority || '-' }}</td>
            <td class="px-4 py-3">
              <app-tag-chip
                [label]="r.active ? 'Active' : 'Inactive'"
                [tone]="r.active ? 'success' : 'neutral'"
                [icon]="r.active ? 'pi-check' : 'pi-minus'"
              />
            </td>
            <td class="px-4 py-3 whitespace-nowrap">{{ r.updated || '-' }}</td>
            <td class="px-4 py-3">
              <div class="relative inline-block">
                <button
                  class="px-3 py-1.5 border border-neutral-300 rounded-md flex items-center gap-2 bg-bg hover:bg-neutral-50 transition-colors cursor-pointer"
                  (click)="toggleMenu($event, r)"
                >
                  <i class="pi pi-ellipsis-v"></i>
                  <span>Actions</span>
                </button>
                <div
                  *ngIf="openMenuFor === r"
                  class="absolute right-0 w-44 bg-bg border border-neutral-300 rounded-md shadow-medium z-50"
                  [ngClass]="dropUp ? 'bottom-full mb-2' : 'mt-2'"
                >
                  <button
                    class="w-full px-3 py-2 text-left hover:bg-neutral-50 flex items-center gap-2 cursor-pointer"
                    (click)="onView(r)"
                  >
                    <i class="pi pi-eye"></i>
                    <span>View</span>
                  </button>
                  <button
                    class="w-full px-3 py-2 text-left hover:bg-neutral-50 flex items-center gap-2 cursor-pointer"
                    (click)="onExportPdf(r)"
                  >
                    <i class="pi pi-file-pdf"></i>
                    <span>Export PDF</span>
                  </button>
                  <button
                    class="w-full px-3 py-2 text-left hover:bg-neutral-50 flex items-center gap-2 cursor-pointer"
                    (click)="onEdit(r)"
                  >
                    <i class="pi pi-pencil"></i>
                    <span>Edit</span>
                  </button>
                  <button
                    class="w-full px-3 py-2 text-left hover:bg-neutral-50 flex items-center gap-2 cursor-pointer"
                    (click)="onToggle(r)"
                  >
                    <i
                      class="pi"
                      [ngClass]="r.active ? 'pi-times' : 'pi-check'"
                    ></i>
                    <span>{{ r.active ? 'Deactivate' : 'Activate' }}</span>
                  </button>
                  <button
                    class="w-full px-3 py-2 text-left hover:bg-neutral-50 flex items-center gap-2 cursor-pointer"
                    (click)="onDelete(r)"
                  >
                    <i class="pi pi-trash"></i>
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </td>
          </tr>
          <tr *ngIf="!rows?.length">
            <td colspan="8" class="px-4 py-8 text-center text-text-muted">
              No permission rules found.
            </td>
          </tr>
        </tbody>
      </table>
      <div table-summary>
        <span *ngIf="total > 0"
          >Showing {{ startIndex }}–{{ endIndex }} of {{ total }}</span
        >
        <span *ngIf="total === 0">No records</span>
      </div>
      <div table-footer class="w-full">
        <app-table-pagination
          [page]="page"
          [pages]="pages"
          [total]="total"
          [limit]="limit"
          (pageChange)="onPageChange($event)"
          (limitChange)="onLimitChange($event)"
        ></app-table-pagination>
      </div>
    </app-list-table-shell>
  `,
  styles: [':host { display: block; }'],
})
export class PermissionTableComponent {
  @Input() rows: PermissionRuleRow[] = [];
  @Input() total = 0;
  @Input() page = 1;
  @Input() pages = 0;
  @Input() limit = 10;
  @Output() view = new EventEmitter<PermissionRuleRow>();
  @Output() edit = new EventEmitter<PermissionRuleRow>();
  @Output() toggle = new EventEmitter<PermissionRuleRow>();
  @Output() remove = new EventEmitter<PermissionRuleRow>();
  @Output() exportPdf = new EventEmitter<PermissionRuleRow>();
  @Output() pageChange = new EventEmitter<number>();
  @Output() limitChange = new EventEmitter<number>();

  isCompact = false;
  toggleDensity(): void {
    this.isCompact = !this.isCompact;
  }
  trackByName = (_: number, r: PermissionRuleRow) => r.name;
  trackByChip = (_: number, chip: string) => chip;

  permissionClass(level: PermissionRuleRow['permission']): string {
    const base = 'px-2 py-1 text-xs rounded-full ';
    switch ((level || '').toString().toUpperCase()) {
      case 'ALLOWED':
        return base + 'bg-success text-white';
      case 'REQUIRES_APPROVAL':
        return base + 'bg-warning text-white';
      case 'DENIED':
        return base + 'bg-error text-white';
      default:
        return base + 'bg-neutral-300';
    }
  }
  chipTone(chip: string): 'neutral' | 'success' | 'warning' | 'error' | 'info' {
    const c = (chip || '').toLowerCase();
    if (c.startsWith('role')) return 'info';
    if (c.startsWith('dept') || c.startsWith('department')) return 'info';
    if (c.startsWith('category')) return 'info';
    if (c.startsWith('user')) return 'info';
    return 'neutral';
  }
  chipIcon(chip: string): string | null {
    const c = (chip || '').toLowerCase();
    if (c.startsWith('role')) return 'pi-id-card';
    if (c.startsWith('dept') || c.startsWith('department'))
      return 'pi-building';
    if (c.startsWith('category')) return 'pi-tag';
    if (c.startsWith('user')) return 'pi-user';
    return null;
  }
  onPageChange(p: number): void {
    this.pageChange.emit(p);
  }
  onLimitChange(value: number): void {
    this.limitChange.emit(value);
  }
  get startIndex(): number {
    return this.total === 0 ? 0 : (this.page - 1) * this.limit + 1;
  }
  get endIndex(): number {
    return Math.min(this.page * this.limit, this.total);
  }

  openMenuFor: PermissionRuleRow | null = null;
  dropUp = false;
  toggleMenu(event: Event, r: PermissionRuleRow): void {
    event.stopPropagation();
    if (this.openMenuFor === r) {
      this.openMenuFor = null;
      return;
    }
    // Compute whether to drop up based on viewport
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    this.dropUp = spaceBelow < 180; // if less than menu height, drop up
    this.openMenuFor = r;
  }
  onView(r: PermissionRuleRow): void {
    this.openMenuFor = null;
    this.view.emit(r);
  }
  onEdit(r: PermissionRuleRow): void {
    this.openMenuFor = null;
    this.edit.emit(r);
  }
  onToggle(r: PermissionRuleRow): void {
    this.openMenuFor = null;
    this.toggle.emit(r);
  }
  onDelete(r: PermissionRuleRow): void {
    this.openMenuFor = null;
    this.remove.emit(r);
  }
  onExportPdf(r: PermissionRuleRow): void {
    this.openMenuFor = null;
    this.exportPdf.emit(r);
  }
}
