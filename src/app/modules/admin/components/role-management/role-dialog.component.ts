import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-role-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div
      *ngIf="visible"
      class="fixed inset-0 bg-black/30 flex items-center justify-center"
    >
      <div
        class="bg-bg border border-neutral-300 rounded-xl shadow-high p-6 w-full max-w-md"
      >
        <div class="text-lg font-semibold mb-4">
          {{ mode === 'create' ? 'Add Role' : 'Edit Role' }}
        </div>
        <div class="space-y-3">
          <div>
            <label class="block text-sm text-text-muted mb-1">Name</label>
            <input
              class="w-full px-3 py-2 border border-neutral-300 rounded-md"
              [(ngModel)]="form.name"
            />
          </div>
          <div>
            <label class="block text-sm text-text-muted mb-1"
              >Description</label
            >
            <input
              class="w-full px-3 py-2 border border-neutral-300 rounded-md"
              [(ngModel)]="form.description"
            />
          </div>
        </div>
        <div class="mt-6 flex justify-end gap-2">
          <button
            class="px-4 py-2 bg-bg border border-neutral-300 rounded-md"
            (click)="cancel.emit()"
          >
            Cancel
          </button>
          <button
            class="px-4 py-2 bg-primary text-white rounded-md"
            (click)="save.emit(form)"
          >
            {{ mode === 'create' ? 'Save' : 'Update' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [':host { display: contents; }'],
})
export class RoleDialogComponent {
  @Input() visible = false;
  @Input() mode: 'create' | 'edit' = 'create';
  @Input() form: { name: string; description?: string } = {
    name: '',
    description: '',
  };
  @Output() save = new EventEmitter<{ name: string; description?: string }>();
  @Output() cancel = new EventEmitter<void>();
}
