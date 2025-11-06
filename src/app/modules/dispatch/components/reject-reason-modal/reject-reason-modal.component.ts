import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

@Component({
  selector: 'app-reject-reason-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  styles: [
    `
      .reject-submit-btn {
        background-color: #e74c3c !important;
        color: white !important;
        border-color: #e74c3c !important;
      }
      .reject-submit-btn:hover:not(:disabled) {
        background-color: #c0392b !important;
        border-color: #c0392b !important;
      }
      .reject-submit-btn:disabled {
        background-color: #9ca3af !important;
        color: white !important;
        border-color: #9ca3af !important;
        opacity: 0.6 !important;
      }
    `,
  ],
  template: `
    <div
      class="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
      *ngIf="visible"
    >
      <div
        class="bg-white w-full max-w-3xl rounded-xl shadow-xl border border-neutral-300"
      >
        <div
          class="px-4 py-3 border-b border-neutral-200 flex items-center justify-between"
        >
          <h3 class="font-medium">Reject Approval & Suggest Changes</h3>
          <button
            class="p-2 hover:bg-neutral-100 rounded"
            (click)="cancel.emit()"
          >
            <i class="pi pi-times"></i>
          </button>
        </div>
        <form class="p-4 space-y-4" [formGroup]="form" (ngSubmit)="onSubmit()">
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label class="text-sm">Reason</label>
              <textarea
                rows="6"
                class="w-full border rounded px-3 py-2"
                formControlName="reason"
                placeholder="Provide a clear reason for rejection"
              ></textarea>
              <div
                class="text-xs text-error"
                *ngIf="
                  form.controls['reason'].touched &&
                  form.controls['reason'].invalid
                "
              >
                Reason is required (min 10 characters)
              </div>
            </div>
            <div>
              <label class="text-sm">Approver Notes (optional)</label>
              <textarea
                rows="6"
                class="w-full border rounded px-3 py-2"
                formControlName="approverNotes"
                placeholder="Optional notes for the requester"
              ></textarea>
            </div>
          </div>
          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="text-sm">Proposed Changes (editable JSON)</label>
              <span class="text-xs text-text-muted"
                >Invalid JSON will disable submit</span
              >
            </div>
            <textarea
              rows="10"
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
              type="submit"
              class="reject-submit-btn px-4 py-2 rounded-md font-medium shadow-sm transition-all duration-150 cursor-pointer border"
              [class.cursor-not-allowed]="!canSubmit"
              [disabled]="!canSubmit"
              aria-label="Reject and send suggestions"
            >
              Reject & Send Suggestions
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
})
export class RejectReasonModalComponent {
  @Input() visible = false;
  @Input() proposedChanges: Record<string, unknown> | null = null;
  @Output() cancel = new EventEmitter<void>();
  @Output() submitReject = new EventEmitter<{
    reason: string;
    approverNotes?: string;
    suggestedChanges: Record<string, unknown> | null;
  }>();

  form: FormGroup;
  proposedChangesJson = '';
  jsonValid = true;
  get canSubmit(): boolean {
    return this.form.valid && this.jsonValid;
  }

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      reason: ['', [Validators.required, Validators.minLength(10)]],
      approverNotes: [''],
    });
  }

  ngOnChanges(): void {
    this.proposedChangesJson = JSON.stringify(
      this.proposedChanges ?? {},
      null,
      2
    );
    this.jsonValid = true;
  }

  onJsonChange(value: string): void {
    this.proposedChangesJson = value;
    try {
      JSON.parse(value || '{}');
      this.jsonValid = true;
    } catch {
      this.jsonValid = false;
    }
  }

  onSubmit(): void {
    if (this.form.invalid || !this.jsonValid) return;
    let suggested: Record<string, unknown> | null = null;
    try {
      suggested = JSON.parse(this.proposedChangesJson || '{}');
    } catch {
      suggested = null;
    }
    this.submitReject.emit({
      reason: this.form.value.reason,
      approverNotes: this.form.value.approverNotes,
      suggestedChanges: suggested,
    });
  }
}
