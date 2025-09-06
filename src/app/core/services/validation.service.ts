import { Injectable } from '@angular/core';
import { z } from 'zod';
import {
  ValidationResult,
  ValidationError,
  ValidationErrorException,
} from '../models/validation.model';

@Injectable({
  providedIn: 'root',
})
export class ValidationService {
  /**
   * Validates data against a Zod schema
   */
  validate<T>(data: any, schema: z.ZodSchema<T>): ValidationResult {
    try {
      schema.parse(data);
      return { success: true, errors: [] };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: ValidationError[] = error.issues.map(issue => ({
          path: issue.path as (string | number)[],
          message: issue.message,
          code: issue.code,
        }));
        return { success: false, errors };
      }
      return {
        success: false,
        errors: [
          { path: [], message: 'Unknown validation error', code: 'UNKNOWN' },
        ],
      };
    }
  }

  /**
   * Validates data and throws exception if validation fails
   */
  validateOrThrow<T>(data: any, schema: z.ZodSchema<T>): T {
    const result = this.validate(data, schema);
    if (!result.success) {
      throw new ValidationErrorException(result.errors);
    }
    return data;
  }

  /**
   * Validates request data before API call
   */
  validateRequest<T>(data: any, schema: z.ZodSchema<T>): ValidationResult {
    return this.validate(data, schema);
  }

  /**
   * Validates response data from API
   */
  validateResponse<T>(data: any, schema: z.ZodSchema<T>): ValidationResult {
    return this.validate(data, schema);
  }

  /**
   * Gets field-specific error message
   */
  getFieldError(errors: ValidationError[], fieldPath: string): string | null {
    const fieldError = errors.find(error => error.path.join('.') === fieldPath);
    return fieldError ? fieldError.message : null;
  }

  /**
   * Checks if a specific field has validation errors
   */
  hasFieldError(errors: ValidationError[], fieldPath: string): boolean {
    return errors.some(error => error.path.join('.') === fieldPath);
  }

  /**
   * Transforms Zod validation errors to form errors
   */
  transformToFormErrors(errors: ValidationError[]): Record<string, string> {
    const formErrors: Record<string, string> = {};

    errors.forEach(error => {
      const fieldPath = error.path.join('.');
      if (fieldPath) {
        formErrors[fieldPath] = error.message;
      }
    });

    return formErrors;
  }
}
