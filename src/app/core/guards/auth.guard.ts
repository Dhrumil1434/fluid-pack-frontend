import { Injectable } from '@angular/core';
import {
  CanActivate,
  Router,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
} from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    _route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    // First, try to restore auth from storage if not already initialized
    // This handles the case where the page was closed and reopened
    const isAuthenticated = this.authService.isAuthenticated();
    const accessToken = this.authService.getAccessToken();

    // If we have a token but auth state is not set, try to restore
    if (accessToken && !isAuthenticated) {
      const restored = this.authService.restoreAuthFromStorage();
      if (restored) {
        console.log('✅ Restored authentication from storage');
      }
    }

    // Now check authentication again after potential restore
    const currentUser = this.authService.getCurrentUser();

    // If no token, redirect to login
    if (!accessToken) {
      console.log('❌ No access token found, redirecting to login');
      this.router.navigate(['/auth/login'], {
        queryParams: { returnUrl: state.url },
      });
      return false;
    }

    // Validate token expiry
    const tokenInfo = this.authService.getTokenExpiryInfo();

    if (tokenInfo.isExpired) {
      console.log('❌ Access token has expired, redirecting to login');
      this.authService.clearAuthData();
      this.router.navigate(['/auth/login'], {
        queryParams: { returnUrl: state.url, expired: 'true' },
      });
      return false;
    }

    // Check if user data exists
    if (!currentUser) {
      console.log('❌ No user data found, redirecting to login');
      this.authService.clearAuthData();
      this.router.navigate(['/auth/login'], {
        queryParams: { returnUrl: state.url },
      });
      return false;
    }

    // User is authenticated and token is valid
    return true;
  }
}
