import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

interface SidebarItem {
  label: string;
  icon: string;
  route: string;
  badge?: number;
  children?: SidebarItem[];
}

@Component({
  selector: 'app-qc-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './qc-sidebar.component.html',
  styleUrls: ['./qc-sidebar.component.css'],
})
export class QcSidebarComponent implements OnInit {
  @Input() collapsed = false;
  @Output() collapseChange = new EventEmitter<boolean>();

  // Track expanded menu items
  expandedItems: Set<string> = new Set();

  // Sidebar navigation items
  sidebarItems: SidebarItem[] = [
    {
      label: 'Dashboard',
      icon: 'pi pi-home',
      route: '/qc/dashboard',
    },
    {
      label: 'Machine Selection',
      icon: 'pi pi-search',
      route: '/qc/machine-selection',
    },
    {
      label: 'Approval Management',
      icon: 'pi pi-check-circle',
      route: '/qc/approval-management',
      badge: 3, // Will be updated with real data
    },
    {
      label: 'QC Management',
      icon: 'pi pi-cog',
      route: '/qc/management',
      children: [
        {
          label: 'Document Entry',
          icon: 'pi pi-file-plus',
          route: '/qc/document-entry',
        },
        {
          label: 'Machine Status',
          icon: 'pi pi-cog',
          route: '/qc/machine-status',
        },
        { label: 'QC Reports', icon: 'pi pi-chart-bar', route: '/qc/reports' },
        { label: 'QC History', icon: 'pi pi-history', route: '/qc/history' },
      ],
    },
    {
      label: 'Machine Inspection',
      icon: 'pi pi-eye',
      route: '/qc/inspection',
      children: [
        {
          label: 'Active Inspections',
          icon: 'pi pi-eye',
          route: '/qc/inspection/active',
        },
        {
          label: 'Scheduled Inspections',
          icon: 'pi pi-calendar',
          route: '/qc/inspection/scheduled',
        },
        {
          label: 'Inspection Templates',
          icon: 'pi pi-file-text',
          route: '/qc/inspection/templates',
        },
      ],
    },
    {
      label: 'Quality Reports',
      icon: 'pi pi-chart-line',
      route: '/qc/quality-reports',
      badge: 3, // Will be updated with real data
    },
    {
      label: 'Alerts & Notifications',
      icon: 'pi pi-bell',
      route: '/qc/alerts',
      badge: 5,
    },
    {
      label: 'Settings',
      icon: 'pi pi-cog',
      route: '/qc/settings',
    },
  ];

  // User info
  currentUser: any = null;

  constructor(private router: Router) {}

  ngOnInit() {
    this.loadCurrentUser();
  }

  loadCurrentUser() {
    // Load current user data from localStorage
    const userData = localStorage.getItem('userData');
    this.currentUser = userData ? JSON.parse(userData) : null;
  }

  isActiveRoute(route: string): boolean {
    return this.router.url === route;
  }

  isExpanded(item: SidebarItem): boolean {
    return this.expandedItems.has(item.label);
  }

  onMenuItemClick(item: SidebarItem): void {
    if (item.children && item.children.length > 0) {
      // Toggle expanded state for items with children
      if (this.expandedItems.has(item.label)) {
        this.expandedItems.delete(item.label);
      } else {
        this.expandedItems.add(item.label);
      }
    } else {
      // Navigate to route for items without children
      this.router.navigate([item.route]);
    }
  }

  trackBySidebarItem(index: number, item: SidebarItem): string {
    return item.label;
  }

  trackBySidebarChild(index: number, child: SidebarItem): string {
    return child.label;
  }

  getUserInitials(): string {
    if (!this.currentUser?.name) return 'QC';
    const names = this.currentUser.name.split(' ');
    return names
      .map((name: string) => name.charAt(0))
      .join('')
      .toUpperCase();
  }

  logout(): void {
    // Clear user data from localStorage
    localStorage.removeItem('userData');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    this.router.navigate(['/auth/login']);
  }
}
