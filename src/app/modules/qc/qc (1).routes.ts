import { Routes } from '@angular/router';
import { AuthGuard } from '../../core/guards/auth.guard';

export const qcRoutes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./components/dashboard/qc-dashboard.component').then(
        m => m.QcDashboardComponent
      ),
    canActivate: [AuthGuard],
  },
  {
    path: 'document-entry',
    loadComponent: () =>
      import('./components/document-entry/document-entry.component').then(
        m => m.QcDocumentEntryComponent
      ),
    canActivate: [AuthGuard],
  },
  {
    path: 'machine-selection',
    loadComponent: () =>
      import('./components/machine-selection/qc-machine-selection.component').then(
        m => m.QcMachineSelectionComponent
      ),
    canActivate: [AuthGuard],
  },
  {
    path: 'approval-management',
    loadComponent: () =>
      import('./components/approval-management/qc-approval-management.component').then(
        m => m.QcApprovalManagementComponent
      ),
    canActivate: [AuthGuard],
  },
];
