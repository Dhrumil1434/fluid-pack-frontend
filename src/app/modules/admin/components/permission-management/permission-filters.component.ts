import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-permission-filters',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-bg border border-neutral-300 rounded-xl shadow-medium p-4">
      <div class="flex flex-wrap gap-3 items-end">
        <div class="grow min-w-[220px]">
          <label class="block text-sm text-text-muted mb-1">Search</label>
          <input
            class="w-full px-3 py-2 border border-neutral-300 rounded-md"
            placeholder="Search rules"
            (input)="onInput($event)"
          />
        </div>
        <div class="min-w-[180px]">
          <label class="block text-sm text-text-muted mb-1">Action</label>
          <select class="w-full px-3 py-2 border border-neutral-300 rounded-md">
            <option value="">All</option>
            <option value="createMachine">Create Machine</option>
            <option value="approveMachine">Approve Machine</option>
          </select>
        </div>
        <div class="min-w-[180px]">
          <label class="block text-sm text-text-muted mb-1">Status</label>
          <select class="w-full px-3 py-2 border border-neutral-300 rounded-md">
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div class="flex items-center gap-2 ml-auto">
          <button
            class="px-4 py-2 bg-bg border border-neutral-300 rounded-md"
            (click)="clear.emit()"
          >
            Clear
          </button>
          <button
            class="px-4 py-2 bg-primary text-white rounded-md"
            (click)="apply.emit()"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [':host { display: block; }'],
})
export class PermissionFiltersComponent {
  @Output() apply = new EventEmitter<void>();
  @Output() clear = new EventEmitter<void>();
  @Output() searchChange = new EventEmitter<string>();

  onInput(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    this.searchChange.emit(target ? target.value : '');
  }
}
