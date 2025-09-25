import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { MessageService } from 'primeng/api';
import {
  userRegistrationSchema,
  UserRegistration,
} from '../../../../assets/schemas/fluid-pack.schema';
import { ValidationService } from '../../../core/services/validation.service';
import {
  ErrorHandlerService,
  FormFieldErrors,
} from '../../../core/services/error-handler.service';
import { LoaderService } from '../../../core/services/loader.service';
import {
  DepartmentRoleService,
  Department,
  Role,
} from '../../../core/services/department-role.service';
import { generateObjectId } from '../../../core/utils/object-id.util';
import { AuthService } from '../services/auth.service';
import { CommonLoaderButtonComponent } from '../../../shared/components/common-loader-button/common-loader-button.component';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    CommonLoaderButtonComponent,
  ],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
})
export class RegisterComponent implements OnInit {
  registerForm!: FormGroup;
  isSubmitting = false;
  registerResult: any = null;
  fieldErrors: FormFieldErrors = {};

  // Password visibility toggle
  showPassword = false;
  showConfirmPassword = false;

  // Form steps for better UX
  currentStep = 1;
  totalSteps = 3;

  // Department and role options (will be loaded from API)
  departments: Department[] = [];
  roles: Role[] = [];

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private validationService: ValidationService,
    private errorHandler: ErrorHandlerService,
    private loaderService: LoaderService,
    private messageService: MessageService,
    private router: Router,
    private departmentRoleService: DepartmentRoleService
  ) {}

  ngOnInit() {
    this.initializeForm();
    this.setupRealTimeValidation();
    this.loadDepartmentsAndRoles();
  }

  private initializeForm() {
    this.registerForm = this.fb.group(
      {
        // Step 1: Basic Information
        username: [
          '',
          [
            Validators.required,
            Validators.minLength(3),
            Validators.maxLength(30),
          ],
        ],
        email: ['', [Validators.required, Validators.email]],

        // Step 2: Security
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required]],

        // Step 3: Organization
        department: ['', [Validators.required]],
        role: ['', [Validators.required]],
      },
      { validators: this.passwordMatchValidator }
    );
  }

  private passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');

    if (
      password &&
      confirmPassword &&
      password.value !== confirmPassword.value
    ) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }

    return null;
  }

  private setupRealTimeValidation() {
    // Watch form changes and validate with Zod (only when form is touched)
    this.registerForm.valueChanges.subscribe(formValue => {
      // Only validate if form has been touched or submitted to avoid premature validation
      if (this.registerForm.touched || this.isSubmitting) {
        this.validateFormWithZod(formValue);
      }
    });
  }

  private validateFormWithZod(formValue: any) {
    // Only validate the current step fields
    const currentStepData = this.getCurrentStepData(formValue);

    const result = this.validationService.validate(
      currentStepData,
      this.getCurrentStepSchema()
    );

    if (!result.success) {
      // Clear previous errors for current step
      this.clearCurrentStepErrors();

      // Update field errors for display (no toast for real-time validation)
      const stepFieldErrors = this.errorHandler.showValidationError(
        result.errors
      );
      this.fieldErrors = { ...this.fieldErrors, ...stepFieldErrors };

      // Set new errors for each field
      result.errors.forEach(error => {
        const fieldName = error.path[0] as string;
        const control = this.registerForm.get(fieldName);

        if (control) {
          control.setErrors({
            zod: { message: error.message },
          });
        }
      });
    } else {
      // Clear field errors for current step if validation passes
      this.clearCurrentStepErrors();
    }
  }

  private getCurrentStepData(formValue: any): any {
    switch (this.currentStep) {
      case 1:
        return {
          username: formValue.username,
          email: formValue.email,
        };
      case 2:
        return {
          password: formValue.password,
          confirmPassword: formValue.confirmPassword,
        };
      case 3:
        return {
          department: formValue.department,
          role: formValue.role,
        };
      default:
        return formValue;
    }
  }

  private getCurrentStepSchema(): any {
    // Return appropriate schema for current step
    // For now, we'll use the full schema but this could be optimized
    return userRegistrationSchema.partial();
  }

  private clearCurrentStepErrors() {
    const currentStepFields = this.getCurrentStepFields();
    currentStepFields.forEach(fieldName => {
      const control = this.registerForm.get(fieldName);
      if (control) {
        control.setErrors(null);
      }
      delete this.fieldErrors[fieldName];
    });
  }

  private getCurrentStepFields(): string[] {
    switch (this.currentStep) {
      case 1:
        return ['username', 'email'];
      case 2:
        return ['password', 'confirmPassword'];
      case 3:
        return ['department', 'role'];
      default:
        return [];
    }
  }

  private clearAllErrors() {
    Object.keys(this.registerForm.controls).forEach(key => {
      const control = this.registerForm.get(key);
      if (control) {
        control.setErrors(null);
      }
    });
    this.fieldErrors = {};
  }

  private async loadDepartmentsAndRoles() {
    try {
      // Load departments and roles from API
      const [departmentsResponse, rolesResponse] = await Promise.all([
        this.departmentRoleService.getDepartments().toPromise(),
        this.departmentRoleService.getRoles().toPromise(),
      ]);

      if (departmentsResponse?.success && departmentsResponse.data) {
        this.departments = departmentsResponse.data;
      }

      if (rolesResponse?.success && rolesResponse.data) {
        this.roles = rolesResponse.data;
      }

      // If no data loaded, show fallback message
      if (this.departments.length === 0 || this.roles.length === 0) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Warning',
          detail:
            'No departments or roles available. Please contact administrator.',
          life: 5000,
        });
      }
    } catch (error) {
      console.error('Failed to load departments and roles:', error);

      // Fallback to mock data if API fails
      this.departments = [
        {
          _id: generateObjectId(),
          name: 'Engineering',
          description: 'Engineering Department',
        },
        {
          _id: generateObjectId(),
          name: 'Quality Assurance',
          description: 'QA Department',
        },
        {
          _id: generateObjectId(),
          name: 'Management',
          description: 'Management Department',
        },
      ];

      this.roles = [
        {
          _id: generateObjectId(),
          name: 'Engineer',
          description: 'Engineering Role',
        },
        {
          _id: generateObjectId(),
          name: 'QA Specialist',
          description: 'Quality Assurance Role',
        },
        {
          _id: generateObjectId(),
          name: 'Manager',
          description: 'Management Role',
        },
      ];

      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'Using fallback data. Please ensure backend is running.',
        life: 5000,
      });
    }
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.registerForm.get(fieldName);
    const hasFieldError = this.errorHandler.hasFieldError(
      this.fieldErrors,
      fieldName
    );
    return control
      ? (control.invalid && (control.dirty || control.touched)) || hasFieldError
      : hasFieldError;
  }

  getFieldError(fieldName: string): string {
    // First check for field-specific errors from validation
    const fieldError = this.errorHandler.getFieldError(
      this.fieldErrors,
      fieldName
    );
    if (fieldError) {
      return fieldError;
    }

    // Fallback to Angular form control errors
    const control = this.registerForm.get(fieldName);
    if (control && control.errors) {
      if (control.errors['zod']) {
        return control.errors['zod'].message;
      }
      if (control.errors['passwordMismatch']) {
        return 'Passwords do not match';
      }
      // Fallback to Angular validators
      if (control.errors['required']) return 'This field is required';
      if (control.errors['email']) return 'Invalid email format';
      if (control.errors['minlength'])
        return `Minimum length is ${control.errors['minlength'].requiredLength}`;
      if (control.errors['maxlength'])
        return `Maximum length is ${control.errors['maxlength'].requiredLength}`;
    }
    return '';
  }

  // Step navigation
  nextStep() {
    if (this.isCurrentStepValid()) {
      this.currentStep++;
    } else {
      this.markCurrentStepTouched();
    }
  }

  previousStep() {
    this.currentStep--;
  }

  isCurrentStepValid(): boolean {
    const currentStepFields = this.getCurrentStepFields();
    return currentStepFields.every(fieldName => {
      const control = this.registerForm.get(fieldName);
      return control ? control.valid : true;
    });
  }

  private markCurrentStepTouched() {
    const currentStepFields = this.getCurrentStepFields();
    currentStepFields.forEach(fieldName => {
      const control = this.registerForm.get(fieldName);
      if (control) {
        control.markAsTouched();
      }
    });
  }

  private markFormGroupTouched() {
    Object.keys(this.registerForm.controls).forEach(key => {
      const control = this.registerForm.get(key);
      if (control) {
        control.markAsTouched();
      }
    });
  }

  // Password visibility toggles
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  // Password strength calculation
  getPasswordStrength(): { score: number; label: string; color: string } {
    const password = this.registerForm.get('password')?.value || '';

    if (!password) {
      return { score: 0, label: '', color: '' };
    }

    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    const strengthLevels = [
      { score: 0, label: '', color: '' },
      { score: 1, label: 'Very Weak', color: 'var(--color-error)' },
      { score: 2, label: 'Weak', color: 'var(--color-warning)' },
      { score: 3, label: 'Fair', color: 'var(--color-warning)' },
      { score: 4, label: 'Good', color: 'var(--color-info)' },
      { score: 5, label: 'Strong', color: 'var(--color-success)' },
      { score: 6, label: 'Very Strong', color: 'var(--color-success)' },
    ];

    return strengthLevels[Math.min(score, 6)];
  }

  async onSubmit() {
    if (this.registerForm.invalid) {
      // Show validation errors on form fields only
      this.markFormGroupTouched();
      return;
    }

    this.isSubmitting = true;
    this.registerResult = null;
    this.fieldErrors = {};

    // Show both button loader and global loader
    this.loaderService.showButtonLoader('register-button');
    this.loaderService.showGlobalLoader('Creating your account...');

    try {
      const registrationData: UserRegistration = {
        username: this.registerForm.value.username,
        email: this.registerForm.value.email,
        password: this.registerForm.value.password,
        department: this.registerForm.value.department,
        role: this.registerForm.value.role,
      };

      // Final validation before API call
      const validationResult = this.validationService.validate(
        registrationData,
        userRegistrationSchema
      );

      if (!validationResult.success) {
        this.handleValidationErrors(validationResult.errors);
        // Hide loaders on validation failure
        this.loaderService.hideButtonLoader('register-button');
        this.loaderService.hideGlobalLoader();
        return;
      }

      // API call - interceptors handle everything automatically!
      const response = await firstValueFrom(
        this.authService.register(registrationData)
      );

      // Handle success
      this.errorHandler.showSuccess(
        'Account created successfully! Please wait for admin approval.'
      );
      this.registerResult = {
        success: true,
        message:
          'Registration successful! Your account is pending admin approval.',
        data: response,
      };
    } catch (error: any) {
      console.error('Registration failed:', error);

      // Handle different types of errors
      if (error.fieldErrors) {
        // Validation errors from interceptors - show field errors only
        this.fieldErrors = error.fieldErrors;
        this.registerResult = {
          success: false,
          message: 'Please fix the validation errors below',
          errors: error.errors,
        };
      } else if (error.error) {
        // API errors from backend - extract message from response
        const apiError = error.error;
        const errorMessage = this.extractErrorMessage(apiError);

        // Show the actual API error message in toast
        this.errorHandler.showApiError(apiError);
        this.registerResult = {
          success: false,
          message: errorMessage,
          error: apiError,
        };
      } else {
        // Check if the error itself has the message (direct API error)
        const errorMessage = this.extractErrorMessage(error);

        // Show the actual API error message in toast
        this.errorHandler.showApiError(error);
        this.registerResult = {
          success: false,
          message: errorMessage,
          error: error,
        };
      }
    } finally {
      this.isSubmitting = false;
      // Hide both loaders
      this.loaderService.hideButtonLoader('register-button');
      this.loaderService.hideGlobalLoader();
    }
  }

  // TrackBy function for ngFor directive
  trackByError(index: number, error: any): any {
    return error.message || index;
  }

  // Extract error message from API response
  private extractErrorMessage(apiError: any): string {
    // Check for different possible error message structures
    if (apiError?.message) {
      return apiError.message;
    }

    if (apiError?.error?.message) {
      return apiError.error.message;
    }

    if (apiError?.data?.message) {
      return apiError.data.message;
    }

    if (
      apiError?.errors &&
      Array.isArray(apiError.errors) &&
      apiError.errors.length > 0
    ) {
      // If it's an array of errors, take the first one
      return apiError.errors[0].message || apiError.errors[0];
    }

    if (apiError?.error && typeof apiError.error === 'string') {
      return apiError.error;
    }

    if (typeof apiError === 'string') {
      return apiError;
    }

    // Fallback to a generic message
    return 'Registration failed. Please check your information and try again.';
  }

  private handleValidationErrors(errors: any[]) {
    console.warn('Validation errors:', errors);
    this.fieldErrors = this.errorHandler.showValidationError(errors);
    this.registerResult = {
      success: false,
      message: 'Please fix the validation errors below',
      errors: errors,
    };
  }

  // Navigation methods
  goToLogin() {
    this.router.navigate(['/auth/login']);
  }

  // TrackBy helpers to improve ngFor performance and satisfy lint rules
  trackByDepartment(_index: number, item: Department): string {
    return item._id;
  }

  trackByRole(_index: number, item: Role): string {
    return item._id;
  }
}
