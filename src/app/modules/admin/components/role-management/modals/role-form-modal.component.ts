import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-role-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div
      *ngIf="visible"
      class="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
    >
      <div
        class="bg-bg border border-neutral-300 rounded-xl shadow-high w-full max-w-xl"
      >
        <div
          class="px-5 py-3 border-b border-neutral-300 flex items-center justify-between"
        >
          <h3 class="text-lg font-semibold">
            {{ mode === 'create' ? 'Add Role' : 'Edit Role' }}
          </h3>
          <button
            class="p-2 text-text-muted hover:bg-neutral-100 rounded-lg"
            (click)="cancel.emit()"
            title="Close"
          >
            <i class="pi pi-times"></i>
          </button>
        </div>
        <div class="p-5 space-y-4">
          <div>
            <label class="block text-xs text-text-muted mb-1">Name</label>
            <input
              class="w-full px-3 py-2 border border-neutral-300 rounded-md"
              [(ngModel)]="form.name"
            />
          </div>
          <div>
            <label class="block text-xs text-text-muted mb-1"
              >Description</label
            >
            <textarea
              rows="2"
              class="w-full px-3 py-2 border border-neutral-300 rounded-md"
              [(ngModel)]="form.description"
            ></textarea>
          </div>
        </div>
        <div
          class="px-5 py-3 border-t border-neutral-300 flex justify-end gap-2"
        >
          <button
            class="px-3 py-2 border border-neutral-300 rounded-md bg-bg hover:bg-neutral-50"
            (click)="cancel.emit()"
          >
            Cancel
          </button>
          <button
            class="px-3 py-2 bg-primary text-white rounded-md font-medium hover:bg-primary/90"
            (click)="save.emit(form)"
          >
            {{ mode === 'create' ? 'Save' : 'Update' }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class RoleFormModalComponent {
  @Input() visible = false;
  @Input() mode: 'create' | 'edit' = 'create';
  @Input() form: { name: string; description?: string } = {
    name: '',
    description: '',
  };
  @Output() save = new EventEmitter<{ name: string; description?: string }>();
  @Output() cancel = new EventEmitter<void>();
}
