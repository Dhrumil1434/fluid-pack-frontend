import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnChanges,
  OnInit,
  SimpleChanges,
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
export class EditUserModalComponent implements OnChanges, OnInit {
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
  canSave = false;
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

  ngOnInit(): void {
    // Recalculate canSave on any value change
    this.form.valueChanges.subscribe(() => {
      this.canSave = this.form.valid && (this.form.dirty || this.hasChanges);
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.user) {
      const normalizedRoleId = this.user.role?._id?.toString() || '';
      const normalizedDepartmentId =
        this.user.department?._id?.toString() || '';
      this.form.patchValue({
        username: this.user.username,
        email: this.user.email,
        role: normalizedRoleId,
        department: normalizedDepartmentId,
        isApproved: this.user.isApproved,
      });
      this.initialValue = {
        username: this.user.username,
        email: this.user.email,
        role: normalizedRoleId,
        department: normalizedDepartmentId,
        isApproved: this.user.isApproved,
      };
      this.form.markAsPristine();
      // Update validity and recompute canSave after incoming value changes
      this.form.updateValueAndValidity({ emitEvent: true, onlySelf: false });
      this.canSave = this.form.valid && (this.form.dirty || this.hasChanges);
    }

    // If roles or departments arrive after user is set, ensure defaults are applied
    if ((changes['roles'] || changes['departments']) && this.user) {
      const roleId = this.user.role?._id?.toString() || '';
      const deptId = this.user.department?._id?.toString() || '';

      if (roleId && this.form.value.role !== roleId) {
        this.form.get('role')?.setValue(roleId, { emitEvent: true });
      }
      if (deptId && this.form.value.department !== deptId) {
        this.form.get('department')?.setValue(deptId, { emitEvent: true });
      }
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
    // Normalize whitespace and casing where relevant for a stable compare
    const normalize = (v: unknown) => (typeof v === 'string' ? v.trim() : v);
    const a = {
      username: normalize(current.username),
      email: normalize(current.email),
      role: normalize(current.role),
      department: normalize(current.department),
      isApproved: current.isApproved,
    };
    const b = {
      username: normalize(this.initialValue.username),
      email: normalize(this.initialValue.email),
      role: normalize(this.initialValue.role),
      department: normalize(this.initialValue.department),
      isApproved: this.initialValue.isApproved,
    };
    return JSON.stringify(a) !== JSON.stringify(b);
  }

  get isSaveEnabled(): boolean {
    // Enable if form valid and either dirty or detected logical changes
    return (
      !!this.form && this.form.valid && (this.form.dirty || this.hasChanges)
    );
  }

  onSubmit(): void {
    if (this.canSave && this.user) {
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
