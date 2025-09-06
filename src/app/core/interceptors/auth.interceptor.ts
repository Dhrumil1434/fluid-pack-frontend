import { HttpEvent, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { API_ENDPOINTS } from '../constants/api.constants';
import { AuthService } from '../services/auth.service';
import { BaseApiService } from '../services/base-api.service';

export function authInterceptor(
  req: HttpRequest<any>,
  next: HttpHandlerFn
): Observable<HttpEvent<any>> {
  const authService = inject(AuthService);
  let isRefreshing = false;

  // Skip auth interceptor for auth-related endpoints to avoid infinite loops
  if (isAuthEndpoint(req.url)) {
    return next(req);
  }

  return next(req).pipe(
    catchError(error => {
      if (error.status === 401 && !isRefreshing) {
        return handleTokenRefresh(req, next, authService, () => {
          isRefreshing = false;
        });
      }
      return throwError(() => error);
    })
  );
}

/**
 * Check if the request is for an auth endpoint
 */
function isAuthEndpoint(url: string): boolean {
  return (
    url.includes(API_ENDPOINTS.LOGIN) ||
    url.includes(API_ENDPOINTS.REGISTER) ||
    url.includes(API_ENDPOINTS.REFRESH_TOKEN)
  );
}

/**
 * Handle token refresh when 401 occurs
 */
function handleTokenRefresh(
  req: HttpRequest<any>,
  next: HttpHandlerFn,
  authService: AuthService,
  setRefreshingFalse: () => void
): Observable<HttpEvent<any>> {
  const refreshToken = authService.getRefreshToken();

  if (!refreshToken) {
    setRefreshingFalse();
    authService.handleTokenExpired();
    return throwError(() => new Error('No refresh token available'));
  }

  // Here you would make a call to refresh the token
  // For now, we'll simulate it
  return refreshAccessToken(refreshToken).pipe(
    switchMap((newToken: string) => {
      setRefreshingFalse();

      // Update the token in auth service
      authService.updateAccessToken(newToken);

      // Retry the original request with new token
      const authReq = req.clone({
        setHeaders: {
          Authorization: `Bearer ${newToken}`,
        },
      });

      return next(authReq);
    }),
    catchError(error => {
      setRefreshingFalse();
      authService.handleTokenExpired();
      return throwError(() => error);
    })
  );
}

/**
 * Refresh the access token
 */
function refreshAccessToken(refreshToken: string): Observable<string> {
  // Call the Fluid Pack backend refresh endpoint
  const baseApiService = inject(BaseApiService);
  return baseApiService.post<any>(API_ENDPOINTS.REFRESH_TOKEN, { refreshToken }).pipe(
    switchMap((response: any) => {
      if (response.success && response.data?.accessToken) {
        return new Observable<string>(observer => {
          observer.next(response.data.accessToken);
          observer.complete();
        });
      } else {
        throw new Error('Failed to refresh token');
      }
    })
  );
}
