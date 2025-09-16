import { Routes } from '@angular/router';

export const DISPATCH_ROUTES: Routes = [
  {
    path: 'technician',
    loadComponent: () =>
      import('./pages/technician-dashboard.component').then(
        m => m.TechnicianDashboardComponent
      ),
  },
  {
    path: 'approvals',
    loadComponent: () =>
      import('./pages/approvals-dashboard.component').then(
        m => m.ApprovalsDashboardComponent
      ),
  },
  {
    path: 'machines',
    loadComponent: () =>
      import('./pages/technician-machines.component').then(
        m => m.TechnicianMachinesComponent
      ),
  },
];
