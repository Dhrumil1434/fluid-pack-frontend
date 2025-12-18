import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

// Shared Components
import { QcSidebarComponent } from '../../components/shared/qc-sidebar/qc-sidebar.component';
import {
  StatsCardsComponent,
  StatCard,
} from '../../../admin/components/shared/stats-cards/stats-cards.component';
import { QcRecentEntriesComponent } from '../shared/qc-recent-entries/qc-recent-entries.component';
import { QcMachineStatusComponent } from '../shared/qc-machine-status/qc-machine-status.component';
import { QcQuickActionsComponent } from '../shared/qc-quick-actions/qc-quick-actions.component';
import { QcStatisticsOverviewComponent } from '../shared/qc-statistics-overview/qc-statistics-overview.component';
import { QcAlertsComponent } from '../shared/qc-alerts/qc-alerts.component';

// Services
import { BaseApiService } from '../../../../core/services/base-api.service';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorHandlerService } from '../../../../core/services/error-handler.service';
import { QCEntryService } from '../../../../core/services/qc-entry.service';

@Component({
  selector: 'app-qc-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    QcSidebarComponent,
    StatsCardsComponent,
    QcRecentEntriesComponent,
    QcMachineStatusComponent,
    QcQuickActionsComponent,
    QcStatisticsOverviewComponent,
    QcAlertsComponent,
  ],
  templateUrl: './qc-dashboard.component.html',
  styleUrls: ['./qc-dashboard.component.css'],
})
export class QcDashboardComponent implements OnInit {
  sidebarCollapsed = false;
  isLoading = false;
  error: string | null = null;
  notificationCount = 0;
  searchTerm = '';

  // Dashboard data
  dashboardData: any = null;
  statCards: StatCard[] = [];

  constructor(
    private api: BaseApiService,
    private router: Router,
    private loaderService: LoaderService,
    private errorHandler: ErrorHandlerService,
    private qcEntryService: QCEntryService
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.isLoading = true;
    this.error = null;

    this.loaderService.showGlobalLoader('Loading QC dashboard...');

    // Load statistics
    this.qcEntryService.getQCApprovalStatistics().subscribe({
      next: res => {
        this.processStatisticsData(res?.data || {});
        this.loadRecentEntries();
      },
      error: error => {
        console.error('Error loading QC statistics:', error);
        this.errorHandler.showServerError();
        this.error = 'Failed to load QC statistics';
        this.isLoading = false;
        this.loaderService.hideGlobalLoader();
      },
    });
  }

  private processStatisticsData(stats: any): void {
    this.statCards = [
      {
        title: 'Total QC Approvals',
        value: Number(stats?.total) || 0,
        change: 12.5,
        changeType: 'increase',
        icon: 'pi pi-check-circle',
        color: 'purple',
        description: 'All QC approval requests',
      },
      {
        title: 'Pending Approvals',
        value: Number(stats?.pending) || 0,
        change: 8.2,
        changeType: 'increase',
        icon: 'pi pi-clock',
        color: 'blue',
        description: 'Awaiting approval',
      },
      {
        title: 'Approved Machines',
        value: Number(stats?.approved) || 0,
        change: 3.1,
        changeType: 'increase',
        icon: 'pi pi-check',
        color: 'green',
        description: 'Successfully approved',
      },
      {
        title: 'Activated Machines',
        value: Number(stats?.activated) || 0,
        change: 15.7,
        changeType: 'increase',
        icon: 'pi pi-power-off',
        color: 'orange',
        description: 'Machines in production',
      },
    ];
  }

  private loadRecentEntries(): void {
    this.qcEntryService.getQCApprovals({ page: 1, limit: 10 }).subscribe({
      next: res => {
        const data = res?.data || res;
        this.dashboardData = {
          recentEntries: data.approvals || [],
          machineStatus: this.generateMachineStatusData(),
          statistics: this.generateStatisticsData(),
          alerts: this.generateAlertsData(),
        };
        this.isLoading = false;
        this.loaderService.hideGlobalLoader();
      },
      error: error => {
        console.error('Error loading recent entries:', error);
        this.errorHandler.showServerError();
        this.error = 'Failed to load recent entries';
        this.isLoading = false;
        this.loaderService.hideGlobalLoader();
      },
    });
  }

  private generateMachineStatusData(): any[] {
    return [
      {
        id: 1,
        name: 'Machine A-001',
        status: 'active',
        lastInspection: '2024-01-15',
        nextInspection: '2024-02-15',
        qcEntries: 12,
        healthScore: 95,
      },
      {
        id: 2,
        name: 'Machine B-002',
        status: 'maintenance',
        lastInspection: '2024-01-10',
        nextInspection: '2024-02-10',
        qcEntries: 8,
        healthScore: 78,
      },
      {
        id: 3,
        name: 'Machine C-003',
        status: 'active',
        lastInspection: '2024-01-12',
        nextInspection: '2024-02-12',
        qcEntries: 15,
        healthScore: 88,
      },
    ];
  }

  private generateStatisticsData(): any {
    return {
      totalMachines: 25,
      activeMachines: 22,
      maintenanceMachines: 3,
      averageHealthScore: 87,
      monthlyTrend: [85, 87, 89, 88, 87, 90, 87],
    };
  }

  private generateAlertsData(): any[] {
    return [
      {
        id: 1,
        type: 'warning',
        title: 'Machine B-002 requires maintenance',
        message: 'Scheduled maintenance due in 2 days',
        timestamp: '2024-01-13T10:30:00Z',
        priority: 'high',
      },
      {
        id: 2,
        type: 'info',
        title: 'New QC entry added',
        message: 'Machine A-001 inspection completed',
        timestamp: '2024-01-13T09:15:00Z',
        priority: 'medium',
      },
    ];
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  onSidebarCollapseChange(collapsed: boolean): void {
    this.sidebarCollapsed = collapsed;
  }

  refreshDashboard(): void {
    this.loadDashboardData();
  }

  goToAddEntry(): void {
    this.router.navigate(['/qc/document-entry']);
  }

  onSearchChange(): void {
    // Navigate to approval management with search query
    if (this.searchTerm.trim()) {
      this.router.navigate(['/qc/approval-management'], {
        queryParams: { search: this.searchTerm.trim() },
      });
    }
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.router.navigate(['/qc/approval-management'], {
      queryParams: {},
    });
  }
}
