import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-list-filters',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-bg border border-neutral-300 rounded-xl shadow-medium p-4">
      <div class="flex flex-wrap gap-3 items-end">
        <div class="grow min-w-[220px]">
          <label class="block text-sm text-text-muted mb-1">{{
            searchLabel
          }}</label>
          <input
            class="w-full px-3 py-2 border border-neutral-300 rounded-md"
            [placeholder]="searchPlaceholder"
            (input)="onInput($event)"
          />
        </div>
        <ng-content select="[filters-extra]"></ng-content>
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
export class ListFiltersComponent {
  @Input() searchLabel = 'Search';
  @Input() searchPlaceholder = 'Search';
  @Output() apply = new EventEmitter<void>();
  @Output() clear = new EventEmitter<void>();
  @Output() searchChange = new EventEmitter<string>();

  onInput(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    this.searchChange.emit(target ? target.value : '');
  }
}
