import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-permission-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div
      *ngIf="visible"
      class="fixed inset-0 bg-black/30 flex items-center justify-center"
    >
      <div
        class="bg-bg border border-neutral-300 rounded-xl shadow-high p-6 w-full max-w-lg"
      >
        <div class="text-lg font-semibold mb-4">
          {{ mode === 'create' ? 'Add Rule' : 'Edit Rule' }}
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="md:col-span-2">
            <label class="block text-sm text-text-muted mb-1">Name</label>
            <input
              class="w-full px-3 py-2 border border-neutral-300 rounded-md"
              [(ngModel)]="form.name"
            />
          </div>
          <div class="md:col-span-2">
            <label class="block text-sm text-text-muted mb-1"
              >Description</label
            >
            <input
              class="w-full px-3 py-2 border border-neutral-300 rounded-md"
              [(ngModel)]="form.description"
            />
          </div>
          <div>
            <label class="block text-sm text-text-muted mb-1">Action</label>
            <select
              class="w-full px-3 py-2 border border-neutral-300 rounded-md"
              [(ngModel)]="form.action"
            >
              <option value="">Select action</option>
              <option value="CREATE_MACHINE">Create Machine</option>
              <option value="EDIT_MACHINE">Edit Machine</option>
              <option value="UPDATE_MACHINE_SEQUENCE">
                Update Machine Sequence
              </option>
              <option value="DELETE_MACHINE">Delete Machine</option>
              <option value="APPROVE_MACHINE">Approve Machine</option>
              <option value="VIEW_MACHINE">View Machine</option>
            </select>
          </div>
          <div>
            <label class="block text-sm text-text-muted mb-1">Permission</label>
            <select
              class="w-full px-3 py-2 border border-neutral-300 rounded-md"
              [(ngModel)]="form.permission"
            >
              <option value="ALLOWED">Allowed</option>
              <option value="REQUIRES_APPROVAL">Requires Approval</option>
              <option value="DENIED">Denied</option>
            </select>
          </div>
          <div>
            <label class="block text-sm text-text-muted mb-1">Max Value</label>
            <input
              type="number"
              class="w-full px-3 py-2 border border-neutral-300 rounded-md"
              [(ngModel)]="form.maxValue"
            />
          </div>
          <div>
            <label class="block text-sm text-text-muted mb-1">Priority</label>
            <input
              type="number"
              class="w-full px-3 py-2 border border-neutral-300 rounded-md"
              [(ngModel)]="form.priority"
            />
          </div>
          <div class="md:col-span-2 flex items-center gap-2">
            <input id="active" type="checkbox" [(ngModel)]="form.active" />
            <label for="active" class="text-sm text-text-muted">Active</label>
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
export class PermissionDialogComponent {
  @Input() visible = false;
  @Input() mode: 'create' | 'edit' = 'create';
  @Input() form: any = {
    name: '',
    description: '',
    action: '',
    permission: 'ALLOWED',
    maxValue: undefined,
    priority: undefined,
    active: true,
  };
  @Output() save = new EventEmitter<any>();
  @Output() cancel = new EventEmitter<void>();
}
