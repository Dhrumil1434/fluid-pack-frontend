import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ListTableShellComponent } from '../shared/list/list-table-shell.component';
import { TablePaginationComponent } from '../user-management/table-pagination.component';

export interface RoleRow {
  id?: string;
  name: string;
  description?: string;
  created?: string;
}

@Component({
  selector: 'app-role-table',
  standalone: true,
  imports: [CommonModule, ListTableShellComponent, TablePaginationComponent],
  template: `
    <app-list-table-shell title="Roles">
      <table class="w-full border-collapse">
        <thead class="bg-bg-soft">
          <tr>
            <th class="text-left px-4 py-3">Name</th>
            <th class="text-left px-4 py-3">Description</th>
            <th class="text-left px-4 py-3 whitespace-nowrap">Created</th>
            <th class="text-left px-4 py-3 w-[340px]">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr
            *ngFor="let r of rows; trackBy: trackByName"
            class="hover:bg-bg-soft"
          >
            <td class="px-4 py-3">{{ r.name }}</td>
            <td class="px-4 py-3 text-text-muted">{{ r.description }}</td>
            <td class="px-4 py-3 whitespace-nowrap">{{ r.created }}</td>
            <td class="px-4 py-3">
              <div class="flex flex-wrap gap-2 max-w-[320px]">
                <button
                  class="px-3 py-1.5 border border-neutral-300 rounded-md flex items-center gap-2 bg-bg hover:bg-neutral-50 transition-colors cursor-pointer"
                  (click)="edit.emit(r)"
                >
                  <i class="pi pi-pencil"></i>
                  <span>Edit</span>
                </button>
                <button
                  class="px-3 py-1.5 border border-neutral-300 rounded-md flex items-center gap-2 bg-bg hover:bg-neutral-50 transition-colors cursor-pointer"
                  (click)="remove.emit(r)"
                >
                  <i class="pi pi-trash"></i>
                  <span>Delete</span>
                </button>
              </div>
            </td>
          </tr>
          <tr *ngIf="!rows?.length">
            <td colspan="4" class="px-4 py-8 text-center text-text-muted">
              No roles found.
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
          (limitChange)="onLimitChangeNumber($event)"
        ></app-table-pagination>
      </div>
    </app-list-table-shell>
  `,
  styles: [':host { display: block; }'],
})
export class RoleTableComponent {
  @Input() rows: RoleRow[] = [];
  @Input() total = 0;
  @Input() page = 1;
  @Input() pages = 0;
  @Input() limit = 10;
  @Output() edit = new EventEmitter<RoleRow>();
  @Output() remove = new EventEmitter<RoleRow>();
  @Output() limitChange = new EventEmitter<number>();
  @Output() pageChange = new EventEmitter<number>();

  isCompact = false;

  toggleDensity(): void {
    this.isCompact = !this.isCompact;
  }
  trackByName = (_: number, r: RoleRow) => r.id || r.name;
  onLimitChange(event: Event): void {
    const target = event.target as HTMLSelectElement | null;
    this.limitChange.emit(target ? Number(target.value) : 10);
  }
  onLimitChangeNumber(value: number): void {
    this.limitChange.emit(value);
  }
  onPageChange(p: number): void {
    this.pageChange.emit(p);
  }
  get startIndex(): number {
    return this.total === 0 ? 0 : (this.page - 1) * this.limit + 1;
  }
  get endIndex(): number {
    return Math.min(this.page * this.limit, this.total);
  }
}
