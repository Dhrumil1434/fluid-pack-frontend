import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable, map, take } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    return this.authService.currentUser$.pipe(
      take(1),
      map(user => {
        if (!user) {
          // User not authenticated, redirect to login
          this.router.navigate(['/auth/login']);
          return false;
        }

        // Check if user is admin or manager
        const userRole = user.role?.name?.toLowerCase();
        const isAdmin = userRole === 'admin' || userRole === 'manager';

        if (!isAdmin) {
          // User is not admin, redirect to login with error message
          this.router.navigate(['/auth/login'], {
            queryParams: { error: 'access_denied' }
          });
          return false;
        }

        return true;
      })
    );
  }
}
