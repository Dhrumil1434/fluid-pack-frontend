import { Routes } from '@angular/router';
import { TechnicianDashboardComponent } from './pages/technician-dashboard.component';
import { ApprovalsDashboardComponent } from './pages/approvals-dashboard.component';

export const DISPATCH_ROUTES: Routes = [
  { path: 'technician', component: TechnicianDashboardComponent },
  { path: 'approvals', component: ApprovalsDashboardComponent },
];
