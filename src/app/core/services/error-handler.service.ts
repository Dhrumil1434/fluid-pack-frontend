import { Injectable, inject } from '@angular/core';
import { MessageService } from 'primeng/api';
import { ValidationError } from '../models/validation.model';
import { ApiError } from '../models/api-response.model';

export interface FormFieldErrors {
  [fieldName: string]: string;
}

@Injectable({
  providedIn: 'root',
})
export class ErrorHandlerService {
  private messageService = inject(MessageService);

  /**
   * Handle validation errors - display per field for forms (no toast for field validation)
   */
  showValidationError(errors: ValidationError[]): FormFieldErrors {
    console.warn('Validation errors:', errors);

    const fieldErrors: FormFieldErrors = {};

    // Transform validation errors to field-specific errors
    errors.forEach(error => {
      const fieldPath = error.path.join('.');
      if (fieldPath) {
        fieldErrors[fieldPath] = error.message;
      }
    });

    // Don't show toast for field validation errors - let the form handle them
    return fieldErrors;
  }

  /**
   * Handle validation errors with toast (for API validation errors)
   */
  showValidationErrorWithToast(errors: ValidationError[]): FormFieldErrors {
    console.warn('Validation errors:', errors);

    const fieldErrors: FormFieldErrors = {};

    // Transform validation errors to field-specific errors
    errors.forEach(error => {
      const fieldPath = error.path.join('.');
      if (fieldPath) {
        fieldErrors[fieldPath] = error.message;
      }
    });

    // Show toast only for API validation errors
    this.messageService.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: 'Please check the form and try again',
      life: 4000,
    });

    return fieldErrors;
  }

  /**
   * Handle server errors with toast
   */
  showServerError(): void {
    console.error('Server error occurred');
    this.messageService.add({
      severity: 'error',
      summary: 'Server Error',
      detail: 'Server error occurred. Please try again later.',
      life: 5000,
    });
  }

  /**
   * Handle API errors with toast
   */
  showApiError(error: ApiError): void {
    console.error('API Error:', error);

    // Show the main error message in toast
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message,
      life: 5000,
    });

    // Log detailed errors if available
    if (error.errors && error.errors.length > 0) {
      error.errors.forEach(err => {
        console.warn(`Field ${err.field}: ${err.message}`);
      });
    }
  }

  /**
   * Handle network errors with toast
   */
  showNetworkError(): void {
    console.error('Network error occurred');
    this.messageService.add({
      severity: 'error',
      summary: 'Network Error',
      detail: 'Network error. Please check your connection.',
      life: 5000,
    });
  }

  /**
   * Handle authentication errors with toast
   */
  showAuthError(message: string = 'Authentication failed'): void {
    console.error('Authentication error:', message);
    this.messageService.add({
      severity: 'error',
      summary: 'Authentication Error',
      detail: message,
      life: 5000,
    });
  }

  /**
   * Handle permission errors with toast
   */
  showPermissionError(): void {
    console.error('Permission denied');
    this.messageService.add({
      severity: 'error',
      summary: 'Permission Denied',
      detail: 'You do not have permission to perform this action.',
      life: 5000,
    });
  }

  /**
   * Handle success messages with toast
   */
  showSuccess(message: string, summary: string = 'Success'): void {
    this.messageService.add({
      severity: 'success',
      summary,
      detail: message,
      life: 3000,
    });
  }

  /**
   * Handle info messages with toast
   */
  showInfo(message: string, summary: string = 'Info'): void {
    this.messageService.add({
      severity: 'info',
      summary,
      detail: message,
      life: 3000,
    });
  }

  /**
   * Handle warning messages with toast
   */
  showWarning(message: string, summary: string = 'Warning'): void {
    this.messageService.add({
      severity: 'warn',
      summary,
      detail: message,
      life: 4000,
    });
  }

  /**
   * Clear all toast messages
   */
  clearMessages(): void {
    this.messageService.clear();
  }

  /**
   * Get field-specific error message
   */
  getFieldError(fieldErrors: FormFieldErrors, fieldName: string): string | null {
    return fieldErrors[fieldName] || null;
  }

  /**
   * Check if field has error
   */
  hasFieldError(fieldErrors: FormFieldErrors, fieldName: string): boolean {
    return !!fieldErrors[fieldName];
  }
}
