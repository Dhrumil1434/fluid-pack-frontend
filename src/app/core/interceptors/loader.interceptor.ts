import { HttpEvent, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, finalize } from 'rxjs';
import { LoaderService } from '../services/loader.service';

export function loaderInterceptor(
  req: HttpRequest<any>,
  next: HttpHandlerFn
): Observable<HttpEvent<any>> {
  const loaderService = inject(LoaderService);

  // Skip loader for certain requests
  if (shouldSkipLoader(req)) {
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
function shouldSkipLoader(req: HttpRequest<any>): boolean {
  // Skip OPTIONS requests (CORS preflight) - these are automatic browser requests
  if (req.method === 'OPTIONS') {
    return true;
  }

  const url = req.url;

  // Skip loader for these endpoints
  const skipPatterns = [
    '/api/health',
    '/api/ping',
    // User management views manage their own loaders
    '/api/user/statistics',
    // Notification endpoints (polling/background)
    '/api/notification',
    '/api/notifications',
    // Socket.IO connections
    '/socket.io',
  ];

  // Skip if URL matches any skip pattern
  if (skipPatterns.some(pattern => url.includes(pattern))) {
    return true;
  }

  // Skip for user list endpoints (they manage their own loaders)
  // But allow other user endpoints like login, register, etc.
  if (
    url.includes('/api/user') &&
    !url.includes('/user/login') &&
    !url.includes('/user/register') &&
    !url.includes('/user/refresh')
  ) {
    // Check if it's a list/statistics endpoint
    if (
      url.includes('/user') &&
      (url.endsWith('/user') || url.includes('/user?'))
    ) {
      return true;
    }
  }

  return false;
}
