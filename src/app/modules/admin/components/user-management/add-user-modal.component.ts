import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';

@Component({
  selector: 'app-add-user-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './add-user-modal.component.html',
  styleUrls: ['./add-user-modal.component.css'],
})
export class AddUserModalComponent {
  @Input() visible = false;
  @Input() roles: Array<{ _id: string; name: string }> = [];
  @Input() departments: Array<{ _id: string; name: string }> = [];
  @Input() loading = false;

  @Output() cancel = new EventEmitter<void>();
  @Output() submitForm = new EventEmitter<{
    username: string;
    email: string;
    password: string;
    role: string;
    department: string;
  }>();

  form: FormGroup;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      role: ['', Validators.required],
      department: ['', Validators.required],
    });
  }

  trackByRole = (_: number, item: { _id: string; name: string }) => item._id;
  trackByDepartment = (_: number, item: { _id: string; name: string }) =>
    item._id;

  onCancel(): void {
    this.cancel.emit();
  }

  onSubmit(): void {
    if (this.loading || this.form.invalid) return;
    this.submitForm.emit(this.form.value);
  }
}
