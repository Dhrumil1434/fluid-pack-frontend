import { Routes } from '@angular/router';
import { AuthGuard } from '../../core/guards/auth.guard';

export const DISPATCH_ROUTES: Routes = [
  {
    path: 'technician',
    loadComponent: () =>
      import('./pages/technician-dashboard.component').then(
        m => m.TechnicianDashboardComponent
      ),
    canActivate: [AuthGuard],
  },
  {
    path: 'approvals',
    loadComponent: () =>
      import('./pages/approvals-dashboard.component').then(
        m => m.ApprovalsDashboardComponent
      ),
    canActivate: [AuthGuard],
  },
  {
    path: 'machines',
    loadComponent: () =>
      import('./pages/technician-machines.component').then(
        m => m.TechnicianMachinesComponent
      ),
    canActivate: [AuthGuard],
  },
];
