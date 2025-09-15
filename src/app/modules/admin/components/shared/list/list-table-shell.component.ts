import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-list-table-shell',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-bg border border-neutral-300 rounded-xl shadow-medium">
      <div
        class="flex items-center justify-between px-4 py-3 border-b border-neutral-300"
      >
        <div class="font-medium">{{ title }}</div>
        <div class="flex items-center gap-2 text-sm">
          <ng-content select="[table-actions]"></ng-content>
          <button
            class="px-3 py-1 border border-neutral-300 rounded-md"
            (click)="toggleDensity()"
          >
            Density
          </button>
          <button class="px-3 py-1 border border-neutral-300 rounded-md">
            Columns
          </button>
        </div>
      </div>
      <div class="overflow-x-auto">
        <ng-content></ng-content>
      </div>
      <div
        class="px-4 py-3 border-t border-neutral-300 flex items-center justify-between text-sm"
      >
        <div><ng-content select="[table-summary]"></ng-content></div>
        <div class="flex items-center gap-2">
          <ng-content select="[table-footer]"></ng-content>
        </div>
      </div>
    </div>
  `,
  styles: [':host { display: block; }'],
})
export class ListTableShellComponent {
  @Input() title = '';
  isCompact = false;
  toggleDensity(): void {
    this.isCompact = !this.isCompact;
  }
}
