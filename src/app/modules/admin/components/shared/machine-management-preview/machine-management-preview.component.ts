import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface MachineManagementData {
  totalMachines: number;
  pendingApprovals: number;
  recentMachines: MachinePreview[];
  machineStats: {
    activeMachines: number;
    inactiveMachines: number;
    approvedMachines: number;
    pendingMachines: number;
  };
}

export interface MachinePreview {
  id: string;
  name: string;
  category: string;
  status: 'active' | 'inactive' | 'pending' | 'maintenance';
  createdBy: string;
  createdAt: Date;
  lastUpdated: Date;
  image?: string;
}

@Component({
  selector: 'app-machine-management-preview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './machine-management-preview.component.html',
  styleUrls: ['./machine-management-preview.component.css']
})
export class MachineManagementPreviewComponent implements OnInit {
  @Input() data: MachineManagementData | null = null;

  // Default data if none provided
  defaultData: MachineManagementData = {
    totalMachines: 0,
    pendingApprovals: 0,
    recentMachines: [],
    machineStats: {
      activeMachines: 0,
      inactiveMachines: 0,
      approvedMachines: 0,
      pendingMachines: 0
    }
  };

  ngOnInit() {
    // Use default data if none provided
    if (!this.data) {
      this.data = this.defaultData;
    }
  }

  /**
   * Get relative time string
   */
  getRelativeTime(timestamp: Date): string {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();

    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }

  /**
   * Get status color class
   */
  getStatusColorClass(status: string): string {
    switch (status) {
      case 'active':
        return 'status-active';
      case 'inactive':
        return 'status-inactive';
      case 'pending':
        return 'status-pending';
      case 'maintenance':
        return 'status-maintenance';
      default:
        return 'status-inactive';
    }
  }

  /**
   * Get status icon
   */
  getStatusIcon(status: string): string {
    switch (status) {
      case 'active':
        return 'pi pi-check-circle';
      case 'inactive':
        return 'pi pi-times-circle';
      case 'pending':
        return 'pi pi-clock';
      case 'maintenance':
        return 'pi pi-wrench';
      default:
        return 'pi pi-question-circle';
    }
  }

  /**
   * Get machine initials for placeholder
   */
  getMachineInitials(name: string): string {
    return name
      .split(' ')
      .map(n => n.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  /**
   * Get status indicator class
   */
  getStatusIndicatorClass(status: string): string {
    switch (status) {
      case 'active':
        return 'bg-success';
      case 'inactive':
        return 'bg-error';
      case 'pending':
        return 'bg-warning';
      case 'maintenance':
        return 'bg-info';
      default:
        return 'bg-gray-500';
    }
  }

  /**
   * Get status badge class
   */
  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'active':
        return 'bg-success/10 text-success';
      case 'inactive':
        return 'bg-error/10 text-error';
      case 'pending':
        return 'bg-warning/10 text-warning';
      case 'maintenance':
        return 'bg-info/10 text-info';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  /**
   * Track by function for machine items
   */
  trackByMachineId(index: number, machine: MachinePreview): string {
    return machine.id;
  }
}
