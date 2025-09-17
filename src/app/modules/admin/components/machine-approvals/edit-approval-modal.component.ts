import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-edit-approval-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  template: `
    <div
      class="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
      *ngIf="visible"
    >
      <div
        class="bg-white w-full max-w-2xl rounded-xl shadow-xl border border-neutral-300"
      >
        <div
          class="px-4 py-3 border-b border-neutral-200 flex items-center justify-between"
        >
          <h3 class="font-medium">Edit Approval Request</h3>
          <button
            class="p-2 hover:bg-neutral-100 rounded"
            (click)="cancel.emit()"
          >
            <i class="pi pi-times"></i>
          </button>
        </div>
        <form class="p-4 space-y-4" [formGroup]="form" (ngSubmit)="onSubmit()">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="text-sm">Approval Type</label>
              <select
                class="w-full border rounded px-3 py-2"
                formControlName="approvalType"
              >
                <option value="MACHINE_CREATION">Creation</option>
                <option value="MACHINE_EDIT">Edit</option>
                <option value="MACHINE_DELETION">Deletion</option>
              </select>
            </div>
            <div>
              <label class="text-sm">Approver Roles</label>
              <div class="border rounded p-2 max-h-40 overflow-auto">
                <label
                  class="flex items-center gap-2 text-sm"
                  *ngFor="let r of roleOptions"
                >
                  <input
                    type="checkbox"
                    [value]="r._id"
                    (change)="onToggleRole($event)"
                    [checked]="selectedRoleIds.has(r._id)"
                  />
                  <span>{{ r.name }}</span>
                </label>
              </div>
            </div>
          </div>
          <div>
            <label class="text-sm">Request Notes</label>
            <textarea
              rows="3"
              class="w-full border rounded px-3 py-2"
              formControlName="requestNotes"
              placeholder="Notes for approvers"
            ></textarea>
          </div>
          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="text-sm">Proposed Changes (JSON)</label>
              <span class="text-xs text-text-muted"
                >Invalid JSON will disable Save</span
              >
            </div>
            <textarea
              rows="8"
              class="w-full font-mono text-xs border rounded px-3 py-2"
              [ngModel]="proposedChangesJson"
              (ngModelChange)="onJsonChange($event)"
              [ngModelOptions]="{ standalone: true }"
            ></textarea>
            <div
              class="text-xs mt-1"
              [class.text-error]="!jsonValid"
              [class.text-success]="jsonValid"
            >
              {{ jsonValid ? 'JSON valid' : 'Invalid JSON' }}
            </div>
          </div>
          <div class="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              class="px-3 py-2 rounded border"
              (click)="cancel.emit()"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="px-4 py-2 rounded bg-primary text-white"
              [class.opacity-50]="!canSubmit"
              [class.pointer-events-none]="!canSubmit"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
})
export class EditApprovalModalComponent {
  @Input() visible = false;
  @Input() roleOptions: Array<{ _id: string; name: string }> = [];
  @Input() value: {
    approvalType?: 'MACHINE_CREATION' | 'MACHINE_EDIT' | 'MACHINE_DELETION';
    approverRoles?: string[];
    requestNotes?: string;
    proposedChanges?: Record<string, unknown> | null;
  } | null = null;
  @Output() cancel = new EventEmitter<void>();
  @Output() submitEdit = new EventEmitter<{
    approvalType?: 'MACHINE_CREATION' | 'MACHINE_EDIT' | 'MACHINE_DELETION';
    approverRoles?: string[];
    requestNotes?: string;
    proposedChanges?: Record<string, unknown>;
  }>();

  form: FormGroup;
  selectedRoleIds = new Set<string>();
  proposedChangesJson = '{}';
  jsonValid = true;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      approvalType: ['MACHINE_CREATION', Validators.required],
      requestNotes: [''],
    });
  }

  ngOnChanges(): void {
    this.selectedRoleIds = new Set(this.value?.approverRoles || []);
    this.form.patchValue({
      approvalType: this.value?.approvalType || 'MACHINE_CREATION',
      requestNotes: this.value?.requestNotes || '',
    });
    this.proposedChangesJson = JSON.stringify(
      this.value?.proposedChanges ?? {},
      null,
      2
    );
    this.jsonValid = true;
  }

  onToggleRole(event: Event): void {
    const input = event.target as HTMLInputElement;
    const id = input.value;
    if (input.checked) this.selectedRoleIds.add(id);
    else this.selectedRoleIds.delete(id);
  }

  onJsonChange(val: string): void {
    this.proposedChangesJson = val;
    try {
      JSON.parse(val || '{}');
      this.jsonValid = true;
    } catch {
      this.jsonValid = false;
    }
  }

  get canSubmit(): boolean {
    return this.form.valid && this.jsonValid;
  }

  onSubmit(): void {
    if (!this.canSubmit) return;
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(this.proposedChangesJson || '{}');
    } catch {
      parsed = {};
    }
    this.submitEdit.emit({
      approvalType: this.form.value.approvalType,
      approverRoles: Array.from(this.selectedRoleIds),
      requestNotes: this.form.value.requestNotes,
      proposedChanges: parsed,
    });
  }
}
