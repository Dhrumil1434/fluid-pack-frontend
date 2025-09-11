import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnChanges,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { User } from '../../../../core/models/user.model';

@Component({
  selector: 'app-edit-user-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
  ],
  templateUrl: './edit-user-modal.component.html',
  styleUrls: ['./edit-user-modal.component.css'],
})
export class EditUserModalComponent implements OnChanges {
  @Input() visible = false;
  @Input() user: User | null = null;
  @Input() roles: Array<{ _id: string; name: string }> = [];
  @Input() departments: Array<{ _id: string; name: string }> = [];
  @Input() loading = false;

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() save = new EventEmitter<{
    userId: string;
    username: string;
    email: string;
    role: string;
    department: string;
    isApproved: boolean;
  }>();

  form: FormGroup;
  private initialValue: {
    username: string;
    email: string;
    role: string;
    department: string;
    isApproved: boolean;
  } | null = null;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      role: ['', [Validators.required]],
      department: ['', [Validators.required]],
      isApproved: [false],
    });
  }

  ngOnChanges(): void {
    if (this.user) {
      this.form.patchValue({
        username: this.user.username,
        email: this.user.email,
        role: this.user.role?._id || '',
        department: this.user.department?._id || '',
        isApproved: this.user.isApproved,
      });
      this.initialValue = {
        username: this.user.username,
        email: this.user.email,
        role: this.user.role?._id || '',
        department: this.user.department?._id || '',
        isApproved: this.user.isApproved,
      };
      this.form.markAsPristine();
    }
  }

  get hasChanges(): boolean {
    if (!this.initialValue) return false;
    const current = {
      username: this.form.value.username,
      email: this.form.value.email,
      role: this.form.value.role,
      department: this.form.value.department,
      isApproved: this.form.value.isApproved,
    } as {
      username: string;
      email: string;
      role: string;
      department: string;
      isApproved: boolean;
    };
    return JSON.stringify(current) !== JSON.stringify(this.initialValue);
  }

  onSubmit(): void {
    if (this.form.valid && this.user) {
      this.save.emit({
        userId: this.user._id,
        username: this.form.value.username,
        email: this.form.value.email,
        role: this.form.value.role,
        department: this.form.value.department,
        isApproved: this.form.value.isApproved,
      });
    }
  }

  onCancel(): void {
    this.visibleChange.emit(false);
  }

  trackById = (_: number, item: { _id: string; name: string }) => item._id;
}
