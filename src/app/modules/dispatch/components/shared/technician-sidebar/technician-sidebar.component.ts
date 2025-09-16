import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../../../core/services/auth.service';

interface SidebarItem {
  label: string;
  icon: string;
  route: string;
  children?: SidebarItem[];
}

@Component({
  selector: 'app-technician-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <aside
      class="fixed left-0 top-0 h-full bg-white shadow-xl border-r border-neutral-300 transition-all duration-300 ease-in-out z-50 flex flex-col"
      [class.w-16]="collapsed"
      [class.w-64]="!collapsed"
    >
      <div class="p-6 border-b border-neutral-300">
        <div class="flex items-center space-x-3">
          <div
            class="w-10 h-10 bg-gradient-to-r from-primary to-primary-light rounded-xl flex items-center justify-center shadow-lg"
          >
            <i class="pi pi-wrench text-white text-lg"></i>
          </div>
          <div *ngIf="!collapsed" class="transition-all duration-300">
            <h2 class="text-xl font-bold text-text">Dispatch</h2>
            <span class="text-sm text-text-muted">Technician</span>
          </div>
        </div>
      </div>

      <nav class="flex-1 p-4 space-y-2 overflow-y-auto min-h-0">
        <ul class="space-y-1">
          <li *ngFor="let item of sidebarItems; trackBy: trackByItem">
            <button
              class="w-full flex items-center justify-between px-4 py-3 text-text hover:text-primary hover:bg-bg-soft rounded-lg transition-all duration-200"
              [class.bg-bg-soft]="isActive(item.route)"
              [class.text-primary]="isActive(item.route)"
              (click)="onItemClick(item)"
              [title]="collapsed ? item.label : ''"
            >
              <div class="flex items-center space-x-3">
                <i [class]="item.icon" class="text-lg"></i>
                <span *ngIf="!collapsed" class="font-medium">{{
                  item.label
                }}</span>
              </div>
              <div *ngIf="!collapsed && item.children?.length" class="text-xs">
                <i class="pi pi-chevron-right"></i>
              </div>
            </button>
            <ul
              *ngIf="
                item.children?.length && !collapsed && expanded.has(item.route)
              "
              class="ml-6 mt-2 space-y-1 border-l-2 border-neutral-300 pl-4"
            >
              <li *ngFor="let c of item.children; trackBy: trackByItem">
                <button
                  class="w-full flex items-center space-x-3 px-3 py-2 text-sm text-text-muted hover:text-primary hover:bg-bg-soft rounded-lg transition-all duration-200"
                  [class.text-primary]="isActive(c.route)"
                  [class.bg-bg-soft]="isActive(c.route)"
                  (click)="navigate(c.route)"
                >
                  <i [class]="c.icon" class="text-sm"></i>
                  <span>{{ c.label }}</span>
                </button>
              </li>
            </ul>
          </li>
        </ul>
      </nav>

      <!-- Sidebar Footer (expanded) -->
      <div
        class="p-4 border-t border-neutral-300 flex-shrink-0"
        *ngIf="!collapsed"
      >
        <div
          class="flex items-center space-x-3 p-3 bg-bg-soft rounded-lg hover:bg-neutral-300 transition-all duration-200"
        >
          <div
            class="w-10 h-10 bg-gradient-to-r from-accent-teal to-info rounded-full flex items-center justify-center shadow-lg"
          >
            <span class="text-white font-bold text-sm">{{ userInitials }}</span>
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-semibold text-text truncate">
              {{ userName }}
            </div>
            <div class="text-xs text-text-muted truncate">Technician</div>
          </div>
          <button
            class="p-2 text-text-muted hover:text-error hover:bg-error/10 rounded-lg transition-all duration-200"
            (click)="logout()"
            title="Logout"
          >
            <i class="pi pi-sign-out text-lg"></i>
          </button>
        </div>
      </div>
      <!-- Collapsed footer (logout only) -->
      <div class="p-2 flex-shrink-0" *ngIf="collapsed">
        <button
          class="p-2 text-text-muted hover:text-error hover:bg-error/10 rounded-lg"
          (click)="logout()"
          title="Logout"
        >
          <i class="pi pi-sign-out"></i>
        </button>
      </div>
    </aside>
  `,
})
export class TechnicianSidebarComponent {
  @Input() collapsed = false;
  @Output() collapseChange = new EventEmitter<boolean>();

  expanded = new Set<string>();

  sidebarItems: SidebarItem[] = [
    { label: 'Dashboard', icon: 'pi pi-home', route: '/dispatch/technician' },
    {
      label: 'Machines',
      icon: 'pi pi-cog',
      route: '/dispatch/machines',
      children: [
        {
          label: 'My Recent',
          icon: 'pi pi-clock',
          route: '/dispatch/technician',
        },
        {
          label: 'Technician Machines',
          icon: 'pi pi-list',
          route: '/dispatch/machines',
        },
        {
          label: 'Create Machine',
          icon: 'pi pi-plus',
          route: '/dispatch/machines',
        },
      ],
    },
    { label: 'Approvals', icon: 'pi pi-inbox', route: '/dispatch/approvals' },
  ];

  userName = 'Technician';
  userInitials = 'TC';

  constructor(
    private router: Router,
    private auth: AuthService
  ) {
    const u = this.auth.getCurrentUser();
    if (u) {
      this.userName = u.username || 'Technician';
      const initials = (this.userName || 'T C')
        .split(' ')
        .map(x => x.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2);
      this.userInitials = initials || 'TC';
    }
  }

  navigate(route: string): void {
    this.router.navigate([route]);
  }

  isActive(route: string): boolean {
    return this.router.url.startsWith(route);
  }

  onItemClick(item: SidebarItem): void {
    if (item.children?.length) {
      if (this.expanded.has(item.route)) this.expanded.delete(item.route);
      else this.expanded.add(item.route);
    } else {
      this.navigate(item.route);
    }
  }

  trackByItem = (_: number, item: SidebarItem) => item.route;

  logout(): void {
    this.auth.clearAuthData();
    this.router.navigate(['/auth/login']);
  }
}
