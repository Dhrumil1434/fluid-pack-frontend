import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

interface QcStatistics {
  totalMachines: number;
  activeMachines: number;
  maintenanceMachines: number;
  averageHealthScore: number;
  monthlyTrend: number[];
}

@Component({
  selector: 'app-qc-statistics-overview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './qc-statistics-overview.component.html',
  styleUrls: ['./qc-statistics-overview.component.css'],
})
export class QcStatisticsOverviewComponent {
  @Input() data: QcStatistics | null = null;

  getHealthScoreClass(score: number): string {
    if (score >= 90) return 'text-success';
    if (score >= 70) return 'text-warning';
    return 'text-error';
  }

  getHealthScoreIcon(score: number): string {
    if (score >= 90) return 'pi pi-check-circle';
    if (score >= 70) return 'pi pi-exclamation-triangle';
    return 'pi pi-times-circle';
  }

  getHealthScoreColor(score: number): string {
    if (score >= 90) return '#10b981';
    if (score >= 70) return '#f59e0b';
    return '#ef4444';
  }

  getMachineStatusPercentage(status: 'active' | 'maintenance'): number {
    if (!this.data) return 0;
    const total = this.data.totalMachines;
    if (total === 0) return 0;

    if (status === 'active') {
      return Math.round((this.data.activeMachines / total) * 100);
    } else {
      return Math.round((this.data.maintenanceMachines / total) * 100);
    }
  }

  getTrendDirection(): 'up' | 'down' | 'stable' {
    if (!this.data || this.data.monthlyTrend.length < 2) return 'stable';

    const recent = this.data.monthlyTrend[this.data.monthlyTrend.length - 1];
    const previous = this.data.monthlyTrend[this.data.monthlyTrend.length - 2];

    if (recent > previous) return 'up';
    if (recent < previous) return 'down';
    return 'stable';
  }

  getTrendIcon(): string {
    const direction = this.getTrendDirection();
    const icons = {
      up: 'pi pi-arrow-up',
      down: 'pi pi-arrow-down',
      stable: 'pi pi-minus',
    };
    return icons[direction];
  }

  getTrendClass(): string {
    const direction = this.getTrendDirection();
    const classes = {
      up: 'text-success',
      down: 'text-error',
      stable: 'text-gray-500',
    };
    return classes[direction];
  }

  getTrendText(): string {
    const direction = this.getTrendDirection();
    const texts = {
      up: 'Improving',
      down: 'Declining',
      stable: 'Stable',
    };
    return texts[direction];
  }

  getChartData(): any {
    if (!this.data) return null;

    return {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
      datasets: [
        {
          data: this.data.monthlyTrend,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
          fill: true,
        },
      ],
    };
  }

  getMaxTrendValue(): number {
    if (!this.data || this.data.monthlyTrend.length === 0) return 100;
    return Math.max(...this.data.monthlyTrend) + 10;
  }

  getTrendBarHeight(value: number): string {
    const maxValue = this.getMaxTrendValue();
    const percentage = (value / maxValue) * 100;
    return `${Math.max(percentage, 5)}%`;
  }
}
