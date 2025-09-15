import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TagChipComponent } from '../../shared/list/tag-chip.component';

@Component({
  selector: 'app-rule-view-modal',
  standalone: true,
  imports: [CommonModule, TagChipComponent],
  template: `
    <div
      *ngIf="visible"
      class="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
    >
      <div
        class="bg-bg border border-neutral-300 rounded-xl shadow-high w-full max-w-2xl"
      >
        <div
          class="px-5 py-3 border-b border-neutral-300 flex items-center justify-between"
        >
          <h3 class="text-lg font-semibold">Rule Details</h3>
          <button
            class="p-2 text-text-muted hover:bg-neutral-100 rounded-lg"
            (click)="close.emit()"
            title="Close"
          >
            <i class="pi pi-times"></i>
          </button>
        </div>
        <div class="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div class="text-xs text-text-muted mb-1">Name</div>
            <div class="text-text">{{ data?.name || '—' }}</div>
          </div>
          <div>
            <div class="text-xs text-text-muted mb-1">Action</div>
            <div class="text-text">{{ data?.action || '—' }}</div>
          </div>
          <div class="md:col-span-2">
            <div class="text-xs text-text-muted mb-1">Applies To</div>
            <div class="flex flex-wrap gap-2">
              <app-tag-chip
                *ngFor="let chip of data?.appliesTo || []"
                [label]="chip"
                [icon]="iconFor(chip)"
              ></app-tag-chip>
            </div>
          </div>
          <div>
            <div class="text-xs text-text-muted mb-1">Permission</div>
            <div class="text-text">{{ data?.permission || '—' }}</div>
          </div>
          <div>
            <div class="text-xs text-text-muted mb-1">Max Value</div>
            <div class="text-text">{{ data?.maxValue ?? '—' }}</div>
          </div>
          <div>
            <div class="text-xs text-text-muted mb-1">Priority</div>
            <div class="text-text">{{ data?.priority ?? '—' }}</div>
          </div>
          <div>
            <div class="text-xs text-text-muted mb-1">Status</div>
            <div class="text-text">
              {{ data?.active ? 'Active' : 'Inactive' }}
            </div>
          </div>
          <div class="md:col-span-2">
            <div class="text-xs text-text-muted mb-1">Description</div>
            <div class="text-text">{{ data?.description || '—' }}</div>
          </div>
        </div>
        <div
          class="px-5 py-3 border-t border-neutral-300 flex justify-end gap-2"
        >
          <button
            class="px-3 py-2 border border-neutral-300 rounded-md bg-bg hover:bg-neutral-50"
            (click)="close.emit()"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  `,
})
export class RuleViewModalComponent {
  @Input() visible = false;
  @Input() data: any;
  @Output() close = new EventEmitter<void>();

  iconFor(chip: string): string | null {
    const c = (chip || '').toLowerCase();
    if (c.startsWith('role')) return 'pi-id-card';
    if (c.startsWith('dept') || c.startsWith('department'))
      return 'pi-building';
    if (c.startsWith('category')) return 'pi-tag';
    if (c.startsWith('user')) return 'pi-user';
    return null;
  }
}
