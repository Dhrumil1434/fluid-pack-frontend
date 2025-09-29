import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

interface MachineStatus {
  id: number;
  name: string;
  status: 'active' | 'maintenance' | 'inactive' | 'warning';
  lastInspection: string;
  nextInspection: string;
  qcEntries: number;
  healthScore: number;
  location?: string;
  operator?: string;
}

@Component({
  selector: 'app-qc-machine-status',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './qc-machine-status.component.html',
  styleUrls: ['./qc-machine-status.component.css'],
})
export class QcMachineStatusComponent {
  @Input() data: MachineStatus[] = [];

  trackByMachineId(index: number, machine: MachineStatus): number {
    return machine.id;
  }

  getStatusClass(status: string): string {
    const classes = {
      active: 'bg-success text-white',
      maintenance: 'bg-warning text-white',
      inactive: 'bg-gray-500 text-white',
      warning: 'bg-error text-white',
    };
    return classes[status as keyof typeof classes] || 'bg-gray-500 text-white';
  }

  getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      active: 'pi pi-check-circle',
      maintenance: 'pi pi-wrench',
      inactive: 'pi pi-pause-circle',
      warning: 'pi pi-exclamation-triangle',
    };
    return icons[status] || 'pi pi-circle';
  }

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

  getRelativeTime(timestamp: string): string {
    const now = new Date();
    const machineTime = new Date(timestamp);
    const diffInDays = Math.floor(
      (now.getTime() - machineTime.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;

    return machineTime.toLocaleDateString();
  }

  getNextInspectionDays(timestamp: string): number {
    const now = new Date();
    const nextInspection = new Date(timestamp);
    const diffInDays = Math.ceil(
      (nextInspection.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    return Math.max(0, diffInDays);
  }

  getNextInspectionClass(days: number): string {
    if (days <= 1) return 'text-error font-semibold';
    if (days <= 3) return 'text-warning font-semibold';
    return 'text-gray-600';
  }

  viewMachineDetails(machine: MachineStatus): void {
    // Navigate to machine details or open modal
    console.log('Viewing machine details:', machine);
  }

  scheduleInspection(machine: MachineStatus): void {
    // Open inspection scheduling modal
    console.log('Scheduling inspection for:', machine);
  }
}
