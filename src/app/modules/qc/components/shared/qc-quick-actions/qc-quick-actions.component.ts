import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

interface QuickAction {
  id: string;
  label: string;
  icon: string;
  description: string;
  route: string;
  color: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-qc-quick-actions',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './qc-quick-actions.component.html',
  styleUrls: ['./qc-quick-actions.component.css'],
})
export class QcQuickActionsComponent {
  quickActions: QuickAction[] = [
    {
      id: 'add-entry',
      label: 'Add QC Entry',
      icon: 'pi pi-plus-circle',
      description: 'Create new quality control entry',
      route: '/qc/document-entry',
      color: 'blue',
    },
    {
      id: 'schedule-inspection',
      label: 'Schedule Inspection',
      icon: 'pi pi-calendar-plus',
      description: 'Schedule machine inspection',
      route: '/qc/inspection/schedule',
      color: 'green',
    },
    {
      id: 'view-reports',
      label: 'View Reports',
      icon: 'pi pi-chart-bar',
      description: 'Access QC reports and analytics',
      route: '/qc/reports',
      color: 'purple',
    },
    {
      id: 'machine-status',
      label: 'Machine Status',
      icon: 'pi pi-cog',
      description: 'Check machine health status',
      route: '/qc/machine-status',
      color: 'orange',
    },
    {
      id: 'alerts',
      label: 'View Alerts',
      icon: 'pi pi-bell',
      description: 'Check QC alerts and notifications',
      route: '/qc/alerts',
      color: 'red',
    },
    {
      id: 'templates',
      label: 'QC Templates',
      icon: 'pi pi-file-text',
      description: 'Manage inspection templates',
      route: '/qc/templates',
      color: 'teal',
    },
  ];

  constructor(private router: Router) {}

  getActionColorClass(color: string): string {
    const classes = {
      blue: 'bg-blue-500 hover:bg-blue-600 text-white',
      green: 'bg-green-500 hover:bg-green-600 text-white',
      purple: 'bg-purple-500 hover:bg-purple-600 text-white',
      orange: 'bg-orange-500 hover:bg-orange-600 text-white',
      red: 'bg-red-500 hover:bg-red-600 text-white',
      teal: 'bg-teal-500 hover:bg-teal-600 text-white',
    };
    return (
      classes[color as keyof typeof classes] ||
      'bg-gray-500 hover:bg-gray-600 text-white'
    );
  }

  getActionIconClass(color: string): string {
    const classes = {
      blue: 'text-blue-100',
      green: 'text-green-100',
      purple: 'text-purple-100',
      orange: 'text-orange-100',
      red: 'text-red-100',
      teal: 'text-teal-100',
    };
    return classes[color as keyof typeof classes] || 'text-gray-100';
  }

  getActionHoverClass(color: string): string {
    const classes = {
      blue: 'hover:bg-blue-50 hover:text-blue-600',
      green: 'hover:bg-green-50 hover:text-green-600',
      purple: 'hover:bg-purple-50 hover:text-purple-600',
      orange: 'hover:bg-orange-50 hover:text-orange-600',
      red: 'hover:bg-red-50 hover:text-red-600',
      teal: 'hover:bg-teal-50 hover:text-teal-600',
    };
    return (
      classes[color as keyof typeof classes] ||
      'hover:bg-gray-50 hover:text-gray-600'
    );
  }

  executeAction(action: QuickAction): void {
    if (action.disabled) return;

    // Navigate to the specified route
    this.router.navigate([action.route]);
  }

  trackByActionId(index: number, action: QuickAction): string {
    return action.id;
  }
}
