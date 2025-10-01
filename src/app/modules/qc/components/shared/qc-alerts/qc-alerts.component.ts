import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

interface QcAlert {
  id: number;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  machineId?: string;
  machineName?: string;
  actionRequired?: boolean;
  actionUrl?: string;
}

@Component({
  selector: 'app-qc-alerts',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './qc-alerts.component.html',
  styleUrls: ['./qc-alerts.component.css'],
})
export class QcAlertsComponent {
  @Input() data: QcAlert[] = [];

  trackByAlertId(index: number, alert: QcAlert): number {
    return alert.id;
  }

  getAlertTypeClass(type: string): string {
    const classes = {
      info: 'bg-info/10 text-info border-info/20',
      warning: 'bg-warning/10 text-warning border-warning/20',
      error: 'bg-error/10 text-error border-error/20',
      success: 'bg-success/10 text-success border-success/20',
    };
    return (
      classes[type as keyof typeof classes] ||
      'bg-gray-100 text-gray-800 border-gray-200'
    );
  }

  getAlertTypeIcon(type: string): string {
    const icons = {
      info: 'pi pi-info-circle',
      warning: 'pi pi-exclamation-triangle',
      error: 'pi pi-times-circle',
      success: 'pi pi-check-circle',
    };
    return icons[type as keyof typeof icons] || 'pi pi-circle';
  }

  getPriorityClass(priority: string): string {
    const classes = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800',
    };
    return (
      classes[priority as keyof typeof classes] || 'bg-gray-100 text-gray-800'
    );
  }

  getPriorityIcon(priority: string): string {
    const icons: Record<string, string> = {
      low: 'pi pi-arrow-down',
      medium: 'pi pi-minus',
      high: 'pi pi-arrow-up',
      critical: 'pi pi-exclamation-triangle',
    };
    return icons[priority] || 'pi pi-circle';
  }

  getRelativeTime(timestamp: string): string {
    const now = new Date();
    const alertTime = new Date(timestamp);
    const diffInMinutes = Math.floor(
      (now.getTime() - alertTime.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;

    return alertTime.toLocaleDateString();
  }

  getAlertUrgencyClass(priority: string): string {
    const classes = {
      low: 'border-l-gray-300',
      medium: 'border-l-blue-400',
      high: 'border-l-orange-400',
      critical: 'border-l-red-500',
    };
    return classes[priority as keyof typeof classes] || 'border-l-gray-300';
  }

  dismissAlert(alert: QcAlert): void {
    // Remove alert from the list
    const index = this.data.findIndex(a => a.id === alert.id);
    if (index > -1) {
      this.data.splice(index, 1);
    }
  }

  handleAlertAction(alert: QcAlert): void {
    if (alert.actionUrl) {
      // Navigate to action URL or open modal
      console.log('Handling alert action:', alert);
      // this.router.navigate([alert.actionUrl]);
    }
  }

  markAsRead(alert: QcAlert): void {
    // Mark alert as read (could update a read status)
    console.log('Marking alert as read:', alert);
  }

  getFilteredAlerts(): QcAlert[] {
    // Return alerts sorted by priority and timestamp
    return [...this.data].sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const aPriority =
        priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
      const bPriority =
        priorityOrder[b.priority as keyof typeof priorityOrder] || 0;

      if (aPriority !== bPriority) {
        return bPriority - aPriority; // Higher priority first
      }

      // If same priority, sort by timestamp (newest first)
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }
}
