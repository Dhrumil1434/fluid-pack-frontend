import { HttpEvent, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ValidationErrorException } from '../models/validation.model';
import { AuthService } from '../services/auth.service';
import { ValidationService } from '../services/validation.service';

export function requestInterceptor(
  req: HttpRequest<any>,
  next: HttpHandlerFn
): Observable<HttpEvent<any>> {
  const authService = inject(AuthService);
  const validationService = inject(ValidationService);

  // 1. AUTOMATICALLY add auth token to every request
  const authReq = addAuthToken(req, authService);

  // 2. AUTOMATICALLY validate request body with Zod schema
  if (req.body && shouldValidateRequest(req)) {
    const validationResult = validateRequestData(authReq, validationService);
    if (!validationResult.success) {
      // Automatically return validation error without hitting backend
      return throwError(
        () => new ValidationErrorException(validationResult.errors)
      );
    }
  }

  // 3. Continue with the validated and transformed request
  return next(authReq).pipe(
    catchError(error => {
      // Handle any errors that occur during the request
      return throwError(() => error);
    })
  );
}

/**
 * Add authentication token to request headers
 */
function addAuthToken(
  req: HttpRequest<any>,
  authService: AuthService
): HttpRequest<any> {
  const token = authService.getAccessToken();
  if (token) {
    return req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
  }
  return req;
}

/**
 * Determine if request should be validated
 */
function shouldValidateRequest(req: HttpRequest<any>): boolean {
  // Only validate POST/PUT/PATCH requests with body
  return ['POST', 'PUT', 'PATCH'].includes(req.method) && req.body;
}

/**
 * Validate request data using appropriate Zod schema
 */
function validateRequestData(
  req: HttpRequest<any>,
  validationService: ValidationService
): any {
  // Get the appropriate Zod schema based on the endpoint
  const schema = getSchemaForEndpoint(req.url);
  if (schema) {
    return validationService.validate(req.body, schema);
  }
  return { success: true, errors: [] };
}

/**
 * Map endpoints to their corresponding Zod schemas
 */
function getSchemaForEndpoint(_url: string): any | null {
  // For now, return null to avoid circular dependency issues
  // We'll implement proper schema loading later
  return null;
}
