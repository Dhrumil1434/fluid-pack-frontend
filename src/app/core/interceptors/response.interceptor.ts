import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandlerFn,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ValidationErrorException } from '../models/validation.model';
import { AuthService } from '../services/auth.service';
import { ErrorHandlerService } from '../services/error-handler.service';
import { ValidationService } from '../services/validation.service';

export function responseInterceptor(
  req: HttpRequest<any>,
  next: HttpHandlerFn
): Observable<HttpEvent<any>> {
  const validationService = inject(ValidationService);
  const errorHandler = inject(ErrorHandlerService);
  const authService = inject(AuthService);

  return next(req).pipe(
    // 1. AUTOMATICALLY validate successful responses with Zod
    map((event: HttpEvent<any>) => {
      if (event instanceof HttpResponse) {
        return validateAndTransformResponse(event, validationService);
      }
      return event;
    }),

    // 2. AUTOMATICALLY handle and transform errors
    catchError(error => {
      return handleError(error, req, errorHandler, authService);
    })
  );
}

/**
 * Validate and transform successful responses
 */
function validateAndTransformResponse(
  response: HttpResponse<any>,
  validationService: ValidationService
): HttpResponse<any> {
  try {
    // Get the response schema for this endpoint
    const responseSchema = getResponseSchemaForEndpoint(response.url || '');

    if (responseSchema) {
      // AUTOMATICALLY validate response structure
      const validationResult = validationService.validate(
        response.body,
        responseSchema
      );

      if (!validationResult.success) {
        // Response doesn't match expected schema - log and transform
        console.warn('Response validation failed:', validationResult.errors);

        // Transform to safe format or throw error
        const safeResponse = transformToSafeResponse(
          response.body,
          validationResult.errors
        );
        return response.clone({ body: safeResponse });
      }
    }

    // Response is valid - return as is
    return response;
  } catch (error) {
    console.error('Response validation error:', error);
    return response;
  }
}

/**
 * Get response schema for specific endpoint
 */
function getResponseSchemaForEndpoint(_url: string): any | null {
  // For now, return null to avoid circular dependency issues
  // We'll implement proper schema loading later
  return null;
}

/**
 * Transform invalid response to safe format
 */
function transformToSafeResponse(responseBody: any, _errors: any[]): any {
  // For now, return the original response body
  // In production, you might want to sanitize or provide fallback data
  console.warn('Response validation failed, returning original response');
  return responseBody;
}

/**
 * Handle different types of errors automatically
 */
function handleError(
  error: any,
  req: HttpRequest<any>,
  errorHandler: ErrorHandlerService,
  authService: AuthService
): Observable<never> {
  // AUTOMATICALLY handle different types of errors

  if (error instanceof ValidationErrorException) {
    // Request validation failed - return field errors for form handling (no toast)
    const fieldErrors = errorHandler.showValidationError(error.errors);
    return throwError(() => ({ ...error, fieldErrors }));
  }

  if (error instanceof HttpErrorResponse) {
    return handleHttpError(error, req, errorHandler, authService);
  }

  // Generic error handling
  console.error('Unknown error:', error);
  return throwError(() => error);
}

/**
 * Handle HTTP-specific errors
 */
function handleHttpError(
  error: HttpErrorResponse,
  req: HttpRequest<any>,
  errorHandler: ErrorHandlerService,
  authService: AuthService
): Observable<never> {
  switch (error.status) {
    case 401:
      // Check if this is a login request or token expiration
      if (req.url.includes('/user/login')) {
        // For login requests, let the component handle the error message
        // Don't show automatic toast here, just return the error
        console.log('Login failed with 401, letting component handle error message');
        return throwError(() => error);
      } else {
        // Token expired or invalid for other requests - automatically handle
        authService.handleTokenExpired();
        errorHandler.showAuthError('Session expired. Please login again.');
      }
      break;

    case 403:
      // Permission denied
      errorHandler.showPermissionError();
      break;

    case 404:
      // Resource not found
      console.error('Resource not found:', req.url);
      break;

    case 422:
      // Validation error from backend - show toast for API validation errors
      if (error.error && error.error.errors) {
        errorHandler.showValidationErrorWithToast(error.error.errors);
      }
      break;

    case 500:
      // Server error
      errorHandler.showServerError();
      break;

    default:
      // Other HTTP errors
      console.error(`HTTP Error ${error.status}:`, error);
      break;
  }

  // Transform backend error to frontend format
  const transformedError = transformBackendError(error);
  return throwError(() => transformedError);
}

/**
 * Transform backend error to frontend format
 */
function transformBackendError(backendError: HttpErrorResponse): any {
  // Your backend already returns consistent error structure
  // Just ensure it matches our frontend expectations
  if (backendError.error) {
    return {
      message: backendError.error.message || 'Something went wrong',
      errors: backendError.error.errors || [],
      statusCode: backendError.status || 500,
      errorCode: backendError.error.errorCode || 'UNKNOWN_ERROR',
    };
  }

  return {
    message: backendError.message || 'Network error occurred',
    errors: [],
    statusCode: backendError.status || 500,
    errorCode: 'NETWORK_ERROR',
  };
}
