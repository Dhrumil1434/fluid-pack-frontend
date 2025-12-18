import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

// Services
import { AuthService } from '../../../../../core/services/auth.service';
import { LOGO_PATHS } from '../../../../../core/constants/logo.constants';

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
export class AdminSidebarComponent implements OnInit, OnDestroy {
  @Input() collapsed = false;
  @Output() collapseChange = new EventEmitter<boolean>();

  // Logo path
  logoPath: string | null = LOGO_PATHS.ICON;

  // Handle logo load error
  onLogoError(): void {
    this.logoPath = null;
  }

  // Track expanded menu items
  expandedItems: Set<string> = new Set();

  // Router subscription for route changes
  private routerSubscription?: Subscription;

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
          label: 'Sequence Management',
          icon: 'pi pi-sort-numeric-up',
          route: '/admin/sequence-management',
        },
        {
          label: 'QC Entries',
          icon: 'pi pi-check-circle',
          route: '/admin/qc-entries',
        },
      ],
    },
    {
      label: 'SO Management',
      icon: 'pi pi-file-edit',
      route: '/admin/so-management',
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
    this.initializeExpandedItems();

    // Subscribe to route changes to update expanded items
    this.routerSubscription = this.router.events
      .pipe(
        filter(
          (event): event is NavigationEnd => event instanceof NavigationEnd
        )
      )
      .subscribe(() => {
        this.initializeExpandedItems();
      });
  }

  ngOnDestroy() {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  /**
   * Initialize expanded menu items based on current route
   */
  private initializeExpandedItems(): void {
    // Check each sidebar item to see if current route matches any of its children
    this.sidebarItems.forEach(item => {
      if (item.children && item.children.length > 0) {
        // Check if current route matches any child route
        const hasActiveChild = item.children.some(child =>
          this.isActiveRoute(child.route)
        );

        // Also check if current route matches the parent route
        const isParentActive = this.isActiveRoute(item.route);

        // If any child is active or parent is active, expand the menu
        if (hasActiveChild || isParentActive) {
          this.expandedItems.add(item.route);
        } else {
          // Optionally collapse if no child is active
          // this.expandedItems.delete(item.route);
        }
      }
    });
  }

  /**
   * Load current user information
   */
  private loadCurrentUser() {
    // Get user data from auth service
    this.authService.currentUser$.subscribe((user: any) => {
      if (user) {
        // Extract role name properly (role is an object with name property)
        const roleName =
          typeof user.role === 'string'
            ? user.role
            : user.role?.name || 'Admin';

        this.currentUser = {
          name: user.name || user.username || 'Admin User',
          email: user.email || 'admin@fluidpack.com',
          role: roleName,
          avatar: user.avatar || null,
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
   * Check if any child route of an item is active
   */
  hasActiveChild(item: SidebarItem): boolean {
    if (!item.children || item.children.length === 0) {
      return false;
    }
    return item.children.some(child => this.isActiveRoute(child.route));
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
  onMenuItemClick(item: SidebarItem, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (item.children && item.children.length > 0) {
      // If clicking on a parent with children, check if we should navigate or expand
      const hasActiveChild = this.hasActiveChild(item);
      const isParentActive = this.isActiveRoute(item.route);

      // If parent route is active or has active child, toggle expand
      // Otherwise, navigate to parent route first, then expand
      if (isParentActive || hasActiveChild) {
        this.toggleExpand(item);
      } else {
        // Navigate to parent route first, then expand after navigation
        this.navigateTo(item.route);
        // Use setTimeout to ensure navigation completes before expanding
        setTimeout(() => {
          if (!this.expandedItems.has(item.route)) {
            this.expandedItems.add(item.route);
          }
        }, 100);
      }
    } else {
      // Navigate to route for items without children
      this.navigateTo(item.route);
    }
  }

  /**
   * Toggle sidebar collapse state and emit event
   */
  toggleCollapse(): void {
    this.collapsed = !this.collapsed;
    this.collapseChange.emit(this.collapsed);
  }
}
