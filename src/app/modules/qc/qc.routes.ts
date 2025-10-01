import { Routes } from '@angular/router';

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
  },
  {
    path: 'document-entry',
    loadComponent: () =>
      import('./components/document-entry/document-entry.component').then(
        m => m.QcDocumentEntryComponent
      ),
  },
  {
    path: 'machine-selection',
    loadComponent: () =>
      import(
        './components/machine-selection/qc-machine-selection.component'
      ).then(m => m.QcMachineSelectionComponent),
  },
  {
    path: 'approval-management',
    loadComponent: () =>
      import(
        './components/approval-management/qc-approval-management.component'
      ).then(m => m.QcApprovalManagementComponent),
  },
];
