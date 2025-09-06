import { Routes } from '@angular/router';

export const userRoutes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./components/user-dashboard/user-dashboard.component').then(m => m.UserDashboardComponent)
  }
];
