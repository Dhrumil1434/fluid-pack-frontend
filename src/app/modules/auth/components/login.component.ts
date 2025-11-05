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
  UserLoginDto,
  userLoginSchemaDto,
} from '../../../../assets/schemas/auth.schema';
import { ValidationService } from '../../../core/services/validation.service';
import {
  ErrorHandlerService,
  FormFieldErrors,
} from '../../../core/services/error-handler.service';
import { LoaderService } from '../../../core/services/loader.service';
import { RoleService } from '../../../core/services/role.service';
import { AuthService } from '../services/auth.service';
import { AuthService as CoreAuthService } from '../../../core/services/auth.service';
import { CommonLoaderButtonComponent } from '../../../shared/components/common-loader-button/common-loader-button.component';
import { LOGO_PATHS } from '../../../core/constants/logo.constants';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    CommonLoaderButtonComponent,
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  isSubmitting = false;
  loginResult: any = null;
  fieldErrors: FormFieldErrors = {};

  // Password visibility toggle
  showPassword = false;

  // Logo path
  logoPath: string | null = LOGO_PATHS.MAIN;

  // Handle logo load error
  onLogoError(): void {
    this.logoPath = null;
  }

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private coreAuthService: CoreAuthService,
    private validationService: ValidationService,
    private errorHandler: ErrorHandlerService,
    private loaderService: LoaderService,
    private roleService: RoleService,
    private messageService: MessageService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });

    // Real-time validation with Zod
    this.setupRealTimeValidation();

    // Check for access denied error from query params
    this.checkForAccessDeniedError();
  }

  private setupRealTimeValidation() {
    // Watch form changes and validate with Zod (only when form is touched)
    this.loginForm.valueChanges.subscribe(formValue => {
      // Only validate if form has been touched or submitted to avoid premature validation
      if (this.loginForm.touched || this.isSubmitting) {
        this.validateFormWithZod(formValue);
      }
    });
  }

  private validateFormWithZod(formValue: any) {
    const result = this.validationService.validate(
      formValue,
      userLoginSchemaDto
    );

    if (!result.success) {
      // Clear previous errors
      this.clearAllErrors();

      // Update field errors for display (no toast for real-time validation)
      this.fieldErrors = this.errorHandler.showValidationError(result.errors);

      // Set new errors for each field
      result.errors.forEach(error => {
        const fieldName = error.path[0] as string;
        const control = this.loginForm.get(fieldName);

        if (control) {
          control.setErrors({
            zod: { message: error.message },
          });
        }
      });
    } else {
      // Clear field errors if validation passes
      this.fieldErrors = {};
    }
  }

  private clearAllErrors() {
    Object.keys(this.loginForm.controls).forEach(key => {
      const control = this.loginForm.get(key);
      if (control) {
        control.setErrors(null);
      }
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.loginForm.get(fieldName);
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
    const control = this.loginForm.get(fieldName);
    if (control && control.errors) {
      if (control.errors['zod']) {
        return control.errors['zod'].message;
      }
      // Fallback to Angular validators
      if (control.errors['required']) return 'This field is required';
      if (control.errors['email']) return 'Invalid email format';
      if (control.errors['minlength'])
        return `Minimum length is ${control.errors['minlength'].requiredLength}`;
    }
    return '';
  }

  async onSubmit() {
    if (this.loginForm.invalid) {
      // Show validation errors on form fields only
      this.markFormGroupTouched();
      return;
    }

    this.isSubmitting = true;
    this.loginResult = null;
    this.fieldErrors = {};

    // Show both button loader and global loader
    this.loaderService.showButtonLoader('login-button');
    this.loaderService.showGlobalLoader('Signing you in...');

    try {
      const loginData: UserLoginDto = this.loginForm.value;

      // Final validation before API call
      const validationResult = this.validationService.validate(
        loginData,
        userLoginSchemaDto
      );

      if (!validationResult.success) {
        this.handleValidationErrors(validationResult.errors);
        // Hide loaders on validation failure
        this.loaderService.hideButtonLoader('login-button');
        this.loaderService.hideGlobalLoader();
        return;
      }

      // API call - interceptors handle everything automatically!
      const response = await firstValueFrom(this.authService.login(loginData));

      // Handle success
      // Authentication data is automatically stored by AuthService.handleLoginSuccess()
      // The basic user data from login response is sufficient for now

      this.errorHandler.showSuccess('Welcome back! Login successful.');
      this.loginResult = {
        success: true,
        message: 'Login successful!',
        data: response,
      };

      // Redirect based on user role
      // Try different possible paths for user data
      const userData =
        response.data?.user || response.data || response.user || response;
      console.log('Login response structure:', response);
      console.log('Extracted user data:', userData);
      this.redirectBasedOnRole(userData);
    } catch (error: any) {
      console.error('Login failed:', error);

      // Handle different types of errors
      if (error.fieldErrors) {
        // Validation errors from interceptors - show field errors only
        this.fieldErrors = error.fieldErrors;
        this.loginResult = {
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
        this.loginResult = {
          success: false,
          message: errorMessage,
          error: apiError,
        };
      } else {
        // Check if the error itself has the message (direct API error)
        const errorMessage = this.extractErrorMessage(error);

        // Show the actual API error message in toast
        this.errorHandler.showApiError(error);
        this.loginResult = {
          success: false,
          message: errorMessage,
          error: error,
        };
      }
    } finally {
      this.isSubmitting = false;
      // Hide both loaders
      this.loaderService.hideButtonLoader('login-button');
      this.loaderService.hideGlobalLoader();
    }
  }

  private markFormGroupTouched() {
    Object.keys(this.loginForm.controls).forEach(key => {
      const control = this.loginForm.get(key);
      if (control) {
        control.markAsTouched();
      }
    });
  }

  // Toggle password visibility
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  // Handle sign up button click
  onSignUp(): void {
    this.errorHandler.showInfo(
      'Please contact your administrator to create an account.'
    );
  }

  // TrackBy function for ngFor directive
  trackByError(index: number, error: any): any {
    return error.message || index;
  }

  /**
   * Check for access denied error from query parameters
   */
  private checkForAccessDeniedError(): void {
    // Check if there's an access denied error in the URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('error') === 'access_denied') {
      this.errorHandler.showApiError({
        success: false,
        message:
          'Access denied. You do not have permission to access this area.',
        errorCode: 'ACCESS_DENIED',
        errors: [],
        data: null,
      });
    }
  }

  /**
   * Redirect user based on their role after successful login
   */
  private redirectBasedOnRole(user: any): void {
    if (!user) {
      console.warn('User information not available for redirection');
      return;
    }

    console.log('User data for redirection:', user);

    // Handle case where role might be just an ID or an object
    if (typeof user.role === 'string') {
      // Role is just an ID, fetch role details from backend
      console.log('Role is an ID:', user.role);
      this.checkRoleAndRedirect(user.role, user);
    } else if (user.role?.name) {
      // Role is an object with name property
      const userRole = user.role.name.toLowerCase();
      console.log('Role from object:', userRole);
      this.performRedirect(userRole);
    } else {
      // Role is not available or still loading
      console.warn(
        'Role information not available, checking user approval status'
      );

      // If user is approved, redirect to admin dashboard as fallback
      if (user.isApproved) {
        this.performRedirect('admin');
      } else {
        this.performRedirect('user');
      }
    }
  }

  /**
   * Check role details from backend and redirect accordingly
   */
  private checkRoleAndRedirect(roleId: string, user: any): void {
    this.roleService.getRoleById(roleId).subscribe({
      next: roleResponse => {
        console.log('Role details response:', roleResponse);
        if (roleResponse.success && roleResponse.data) {
          // Update user object with complete role information
          const updatedUser = {
            ...user,
            role: roleResponse.data,
          };

          // Update the stored user data with complete role information
          // Get current tokens and update auth data
          const accessToken = this.coreAuthService.getAccessToken();
          const refreshToken = this.coreAuthService.getRefreshToken();
          if (accessToken && refreshToken) {
            this.coreAuthService.setAuthData(updatedUser, {
              accessToken,
              refreshToken,
            });
          }

          // Check if user is admin
          const roleName = roleResponse.data.name.toLowerCase().trim();
          const isAdmin = roleName === 'admin' || roleName === 'manager';

          console.log(
            'Role check result - isAdmin:',
            isAdmin,
            'roleName:',
            roleName
          );
          if (isAdmin) {
            this.performRedirect('admin');
          } else {
            this.performRedirect(roleName);
          }
        } else {
          console.error('Failed to get role details:', roleResponse.message);
          // Fallback: if user is approved, assume admin role
          if (user.isApproved) {
            this.performRedirect('admin');
          } else {
            this.performRedirect('user');
          }
        }
      },
      error: error => {
        console.error('Error checking role:', error);
        // Fallback: if user is approved, assume admin role
        if (user.isApproved) {
          this.performRedirect('admin');
        } else {
          this.performRedirect('user');
        }
      },
    });
  }

  /**
   * Perform the actual redirection based on role
   */
  private performRedirect(userRole: string): void {
    console.log('Performing redirect for role:', userRole);

    // Normalize role name
    const normalizedRole = userRole.toLowerCase().trim();

    // Try immediate navigation first
    console.log('About to navigate for role:', normalizedRole);
    switch (normalizedRole) {
      case 'admin':
        console.log('Navigating to admin dashboard...');
        this.router
          .navigate(['/admin/dashboard'])
          .then(success => {
            console.log('Admin dashboard navigation result:', success);
            if (!success) {
              console.log('Navigation failed, trying with delay...');
              setTimeout(() => {
                this.router.navigate(['/admin/dashboard']);
              }, 1000);
            }
          })
          .catch(error => {
            console.error('Admin dashboard navigation error:', error);
          });
        break;
      case 'manager':
        // For now, redirect managers to admin dashboard
        console.log('Navigating to admin dashboard (manager)...');
        this.router
          .navigate(['/admin/dashboard'])
          .then(success => {
            console.log(
              'Admin dashboard navigation result (manager):',
              success
            );
            if (!success) {
              console.log('Navigation failed, trying with delay...');
              setTimeout(() => {
                this.router.navigate(['/admin/dashboard']);
              }, 1000);
            }
          })
          .catch(error => {
            console.error('Admin dashboard navigation error (manager):', error);
          });
        break;
      case 'qc':
      case 'quality controller':
      case 'quality control':
      case 'qa':
      case 'quality assurance':
      case 'quality':
        // QC/QA role → QC dashboard
        console.log('Navigating to QC dashboard...');
        this.router
          .navigate(['/qc/dashboard'])
          .then(success => {
            console.log('QC dashboard navigation result:', success);
            if (!success) {
              console.log('Navigation failed, trying with delay...');
              setTimeout(() => {
                this.router.navigate(['/qc/dashboard']);
              }, 1000);
            }
          })
          .catch(error => {
            console.error('QC dashboard navigation error:', error);
          });
        break;
      case 'engineer':
      case 'user':
      case 'technician':
      default:
        // Technicians and regular users → dispatch technician dashboard
        console.log('Navigating to dispatch technician dashboard...');
        this.router
          .navigate(['/dispatch/technician'])
          .then(success => {
            console.log('User dashboard navigation result:', success);
            if (!success) {
              console.log('Navigation failed, trying with delay...');
              setTimeout(() => {
                this.router.navigate(['/dispatch/technician']);
              }, 1000);
            }
          })
          .catch(error => {
            console.error('User dashboard navigation error:', error);
          });
        break;
    }
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
    return 'Login failed. Please check your credentials and try again.';
  }

  private handleValidationErrors(errors: any[]) {
    console.warn('Validation errors:', errors);
    this.fieldErrors = this.errorHandler.showValidationError(errors);
    this.loginResult = {
      success: false,
      message: 'Please fix the validation errors below',
      errors: errors,
    };
  }
}
