import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-approve-reject-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './approve-reject-dialog.component.html',
  styleUrls: ['./approve-reject-dialog.component.css'],
})
export class ApproveRejectDialogComponent {
  @Input() visible = false;
  @Input() mode: 'approve' | 'reject' = 'approve';
  @Input() loading = false;

  @Output() cancel = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<{ notes: string }>();

  form: FormGroup;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({ notes: [''] });
  }

  onCancel(): void {
    this.cancel.emit();
  }

  onConfirm(): void {
    if (this.loading) return;
    this.confirm.emit({ notes: this.form.value.notes || '' });
  }
}
