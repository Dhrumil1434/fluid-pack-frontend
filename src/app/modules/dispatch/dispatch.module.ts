import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { DISPATCH_ROUTES } from './dispatch.routes';
import { TechnicianDashboardComponent } from './pages/technician-dashboard.component';
import { ApprovalsDashboardComponent } from './pages/approvals-dashboard.component';

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(DISPATCH_ROUTES),
    TechnicianDashboardComponent,
    ApprovalsDashboardComponent,
  ],
})
export class DispatchModule {}
