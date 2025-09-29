import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

// Services
import { AuthService } from '../../../../../core/services/auth.service';

interface SidebarItem {
  label: string;
  icon: string;
  route: string;
  badge?: number;
  children?: SidebarItem[];
}

@Component({
  selector: 'app-admin-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-sidebar.component.html',
  styleUrls: ['./admin-sidebar.component.css'],
})
export class AdminSidebarComponent implements OnInit {
  @Input() collapsed = false;
  @Output() collapseChange = new EventEmitter<boolean>();

  // Track expanded menu items
  expandedItems: Set<string> = new Set();

  // Sidebar navigation items
  sidebarItems: SidebarItem[] = [
    {
      label: 'Dashboard',
      icon: 'pi pi-home',
      route: '/admin/dashboard',
    },
    {
      label: 'User Management',
      icon: 'pi pi-users',
      route: '/admin/users',
      children: [
        { label: 'All Users', icon: 'pi pi-users', route: '/admin/users' },
        {
          label: 'Pending Approvals',
          icon: 'pi pi-clock',
          route: '/admin/users/pending',
        },
        {
          label: 'Roles & Permissions',
          icon: 'pi pi-key',
          route: '/admin/users/roles',
        },
      ],
    },
    {
      label: 'Machine Management',
      icon: 'pi pi-cog',
      route: '/admin/machines',
      children: [
        { label: 'All Machines', icon: 'pi pi-cog', route: '/admin/machines' },
        {
          label: 'Machine Approvals',
          icon: 'pi pi-inbox',
          route: '/admin/machine-approvals',
        },
        { label: 'Categories', icon: 'pi pi-tags', route: '/admin/categories' },
        {
          label: 'QC Entries',
          icon: 'pi pi-check-circle',
          route: '/admin/qc-entries',
        },
      ],
    },
    {
      label: 'Dispatch',
      icon: 'pi pi-truck',
      route: '/admin/dispatch',
      children: [
        {
          label: 'Approvals',
          icon: 'pi pi-inbox',
          route: '/dispatch/approvals',
        },
        {
          label: 'Machines CRUD',
          icon: 'pi pi-sliders-h',
          route: '/dispatch/machines',
        },
      ],
    },
    {
      label: 'Approvals',
      icon: 'pi pi-check-square',
      route: '/admin/approvals',
      badge: 5, // Will be updated with real data
    },
    {
      label: 'Departments',
      icon: 'pi pi-building',
      route: '/admin/departments',
    },
    {
      label: 'Roles',
      icon: 'pi pi-id-card',
      route: '/admin/roles',
    },
    {
      label: 'Permissions',
      icon: 'pi pi-shield',
      route: '/admin/permissions',
    },
    {
      label: 'Settings',
      icon: 'pi pi-cog',
      route: '/admin/settings',
    },
  ];

  // User info
  currentUser: any = null;

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.loadCurrentUser();
    this.loadPendingApprovalsCount();
  }

  /**
   * Load current user information
   */
  private loadCurrentUser() {
    // Get user data from auth service
    this.authService.currentUser$.subscribe((user: any) => {
      if (user) {
        this.currentUser = {
          name: user.username || 'Admin User',
          email: user.email || 'admin@fluidpack.com',
          role: user.role?.name || 'Admin',
          avatar: null,
        };
      } else {
        // Fallback data if no user is logged in
        this.currentUser = {
          name: 'Admin User',
          email: 'admin@fluidpack.com',
          role: 'Admin',
          avatar: null,
        };
      }
    });
  }

  /**
   * Load pending approvals count for badge
   */
  private loadPendingApprovalsCount() {
    // This would typically come from an API call
    // For now, we'll set a mock value
    const approvalsItem = this.sidebarItems.find(
      item => item.label === 'Approvals'
    );
    if (approvalsItem) {
      approvalsItem.badge = 5; // Mock pending count
    }
  }

  /**
   * Navigate to a route
   */
  navigateTo(route: string) {
    this.router.navigate([route]);
  }

  /**
   * Check if a route is active
   */
  isActiveRoute(route: string): boolean {
    return this.router.url.startsWith(route);
  }

  /**
   * Handle logout
   */
  logout() {
    this.authService.clearAuthData();
    this.router.navigate(['/auth/login']);
  }

  /**
   * Get user initials for avatar
   */
  getUserInitials(): string {
    if (!this.currentUser?.name) return 'AU';
    return this.currentUser.name
      .split(' ')
      .map((name: string) => name.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  /**
   * Track by function for sidebar items
   */
  trackBySidebarItem(index: number, item: SidebarItem): string {
    return item.route;
  }

  /**
   * Track by function for sidebar child items
   */
  trackBySidebarChild(index: number, child: SidebarItem): string {
    return child.route;
  }

  /**
   * Toggle expand/collapse for menu items with children
   */
  toggleExpand(item: SidebarItem): void {
    if (item.children && item.children.length > 0) {
      if (this.expandedItems.has(item.route)) {
        this.expandedItems.delete(item.route);
      } else {
        this.expandedItems.add(item.route);
      }
    }
  }

  /**
   * Check if a menu item is expanded
   */
  isExpanded(item: SidebarItem): boolean {
    return this.expandedItems.has(item.route);
  }

  /**
   * Handle menu item click
   */
  onMenuItemClick(item: SidebarItem): void {
    if (item.children && item.children.length > 0) {
      // Toggle expand/collapse for items with children
      this.toggleExpand(item);
    } else {
      // Navigate to route for items without children
      this.navigateTo(item.route);
    }
  }
}
