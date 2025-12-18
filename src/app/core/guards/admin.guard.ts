import { Injectable } from '@angular/core';
import {
  CanActivate,
  Router,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
} from '@angular/router';
import { Observable, map, take } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class AdminGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    _route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    return this.authService.currentUser$.pipe(
      take(1),
      map(user => {
        // First check if user is authenticated and token is valid
        const accessToken = this.authService.getAccessToken();

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

        if (!user) {
          // User not authenticated, redirect to login
          console.log('❌ No user data found, redirecting to login');
          this.authService.clearAuthData();
          this.router.navigate(['/auth/login'], {
            queryParams: { returnUrl: state.url },
          });
          return false;
        }

        // Check if user is admin, manager, or sub-admin
        const userRole = user.role?.name?.toLowerCase();
        const isAdmin =
          userRole === 'admin' ||
          userRole === 'manager' ||
          userRole === 'sub-admin';

        if (!isAdmin) {
          // User is not admin, redirect to login with error message
          this.router.navigate(['/auth/login'], {
            queryParams: { error: 'access_denied', returnUrl: state.url },
          });
          return false;
        }

        return true;
      })
    );
  }
}
