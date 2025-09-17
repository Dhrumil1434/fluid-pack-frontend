import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

// Shared Components
import { AdminSidebarComponent } from '../shared/admin-sidebar/admin-sidebar.component';
import { TechnicianDashboardComponent } from '../../../dispatch/pages/technician-dashboard.component';
import { StatsCardsComponent } from '../shared/stats-cards/stats-cards.component';
import { RecentActivityComponent } from '../shared/recent-activity/recent-activity.component';
import { PendingApprovalsComponent } from '../shared/pending-approvals/pending-approvals.component';
import { UserManagementPreviewComponent } from '../shared/user-management-preview/user-management-preview.component';
import { MachineManagementPreviewComponent } from '../shared/machine-management-preview/machine-management-preview.component';

// Services
import { AdminDashboardService } from '../../services/admin-dashboard.service';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorHandlerService } from '../../../../core/services/error-handler.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    AdminSidebarComponent,
    TechnicianDashboardComponent,
    StatsCardsComponent,
    RecentActivityComponent,
    PendingApprovalsComponent,
    UserManagementPreviewComponent,
    MachineManagementPreviewComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit {
  // Dashboard data
  dashboardData: any = null;
  isLoading = false;
  error: string | null = null;
  // Adapted cards for stats component
  statCards: {
    title: string;
    value: number;
    change: number;
    changeType: 'increase' | 'decrease' | 'neutral';
    icon: string;
    color: string;
    description?: string;
  }[] = [];

  // Sidebar state
  sidebarCollapsed = false;

  // Notifications badge count derived from pending approvals
  get notificationCount(): number {
    return Array.isArray(this.dashboardData?.pendingApprovals)
      ? this.dashboardData.pendingApprovals.length
      : 0;
  }

  constructor(
    private adminDashboardService: AdminDashboardService,
    private loaderService: LoaderService,
    private errorHandler: ErrorHandlerService
  ) {}

  ngOnInit() {
    this.loadDashboardData();
  }

  /**
   * Load dashboard data from API
   */
  private loadDashboardData() {
    this.isLoading = true;
    this.error = null;

    this.loaderService.showCardLoader('dashboard', 'Loading dashboard data...');

    this.adminDashboardService.getDashboardData().subscribe({
      next: data => {
        this.dashboardData = data;
        this.statCards = this.buildStatCards(data);
        this.isLoading = false;
        this.loaderService.hideCardLoader('dashboard');
      },
      error: error => {
        console.error('Error loading dashboard data:', error);
        this.error = 'Failed to load dashboard data. Please try again.';
        this.isLoading = false;
        this.loaderService.hideCardLoader('dashboard');
      },
    });
  }

  /**
   * Toggle sidebar collapsed state
   */
  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  /**
   * Refresh dashboard data
   */
  refreshDashboard() {
    this.loadDashboardData();
  }

  /**
   * Refresh dashboard data for specific time range
   */
  refreshDashboardForTimeRange(
    timeRange: 'today' | 'week' | 'month' | 'quarter' | 'year'
  ) {
    this.isLoading = true;
    this.error = null;

    this.loaderService.showCardLoader('dashboard', 'Loading dashboard data...');

    this.adminDashboardService
      .getDashboardDataForTimeRange(timeRange)
      .subscribe({
        next: data => {
          this.dashboardData = data;
          this.isLoading = false;
          this.loaderService.hideCardLoader('dashboard');
        },
        error: error => {
          console.error('Error loading dashboard data:', error);
          this.error = 'Failed to load dashboard data. Please try again.';
          this.isLoading = false;
          this.loaderService.hideCardLoader('dashboard');
        },
      });
  }

  /**
   * Handle sidebar collapse state change
   */
  onSidebarCollapseChange(collapsed: boolean) {
    this.sidebarCollapsed = collapsed;
  }

  private buildStatCards(data: any) {
    const stats = data?.statistics || {};
    return [
      {
        title: 'Total Users',
        value: Number(stats.totalUsers) || 0,
        change: 0,
        changeType: 'neutral' as const,
        icon: 'pi pi-users',
        color: 'blue',
        description: 'Registered users',
      },
      {
        title: 'Total Machines',
        value: Number(stats.totalMachines) || 0,
        change: 0,
        changeType: 'neutral' as const,
        icon: 'pi pi-cog',
        color: 'green',
        description: 'Active machines',
      },
      {
        title: 'Pending Approvals',
        value: Number(stats.pendingApprovals) || 0,
        change: 0,
        changeType: 'neutral' as const,
        icon: 'pi pi-clock',
        color: 'orange',
        description: 'Awaiting approval',
      },
      {
        title: 'QA Entries',
        value: Number(stats.qaEntries) || 0,
        change: 0,
        changeType: 'neutral' as const,
        icon: 'pi pi-check-circle',
        color: 'purple',
        description: 'Quality assurance entries',
      },
    ];
  }
}
