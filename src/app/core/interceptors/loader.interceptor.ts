import { HttpEvent, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, finalize } from 'rxjs';
import { LoaderService } from '../services/loader.service';

export function loaderInterceptor(
  req: HttpRequest<any>,
  next: HttpHandlerFn
): Observable<HttpEvent<any>> {
  const loaderService = inject(LoaderService);

  // Skip loader for certain endpoints
  if (shouldSkipLoader(req.url)) {
    return next(req);
  }

  // Show global loader for HTTP requests
  loaderService.showGlobalLoader('Processing request...');

  return next(req).pipe(
    finalize(() => {
      // Hide loader when request completes (success or error)
      loaderService.hideGlobalLoader();
    })
  );
}

/**
 * Determine if loader should be skipped for this request
 */
function shouldSkipLoader(url: string): boolean {
  // Skip loader for these endpoints
  const skipPatterns = [
    '/api/health',
    '/api/ping',
    // User management views manage their own loaders
    '/api/user',
    '/api/user/statistics',
    // Add more patterns as needed
  ];

  return skipPatterns.some(pattern => url.includes(pattern));
}
