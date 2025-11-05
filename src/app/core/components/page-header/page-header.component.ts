import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NotificationBellComponent } from '../notification-bell/notification-bell.component';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [CommonModule, RouterModule, NotificationBellComponent],
  template: `
    <header
      class="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-40 shadow-sm"
    >
      <div class="flex items-center justify-between">
        <!-- Left Section: Toggle + Title -->
        <div class="flex items-center gap-4 flex-1 min-w-0">
          <!-- Sidebar Toggle -->
          <button
            *ngIf="showSidebarToggle"
            class="p-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all duration-200 group flex-shrink-0"
            (click)="onToggleSidebar()"
            [attr.aria-label]="
              sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'
            "
            title="Toggle sidebar"
          >
            <i
              class="pi pi-bars text-lg group-hover:scale-105 transition-transform duration-200"
            ></i>
          </button>

          <!-- Breadcrumbs (optional) -->
          <nav
            *ngIf="breadcrumbs && breadcrumbs.length > 0"
            class="hidden md:flex items-center gap-2 text-sm text-gray-500 flex-shrink-0"
          >
            <ng-container *ngFor="let crumb of breadcrumbs; let last = last">
              <a
                *ngIf="!last && crumb.route"
                [routerLink]="crumb.route"
                class="hover:text-gray-700 hover:underline transition-colors"
              >
                {{ crumb.label }}
              </a>
              <span *ngIf="!last && crumb.route" class="text-gray-300">/</span>
              <span *ngIf="last" class="text-gray-900 font-medium">{{
                crumb.label
              }}</span>
            </ng-container>
          </nav>

          <!-- Page Title -->
          <div class="flex items-center gap-3 min-w-0">
            <h1
              class="text-2xl font-semibold text-gray-900 truncate"
              [title]="title"
            >
              {{ title }}
            </h1>
            <span
              *ngIf="subtitle"
              class="hidden lg:inline text-sm text-gray-500 truncate"
              [title]="subtitle"
            >
              {{ subtitle }}
            </span>
          </div>
        </div>

        <!-- Right Section: Actions + Notification -->
        <div class="flex items-center gap-3 flex-shrink-0">
          <!-- Additional Actions Slot -->
          <ng-content select="[headerActions]"></ng-content>

          <!-- Notification Bell -->
          <app-notification-bell></app-notification-bell>

          <!-- Settings Button (optional) -->
          <button
            *ngIf="showSettings"
            class="p-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-all duration-200 group"
            title="Settings"
            (click)="onSettingsClick()"
          >
            <i
              class="pi pi-cog text-lg group-hover:rotate-90 transition-transform duration-300"
            ></i>
          </button>
        </div>
      </div>
    </header>
  `,
})
export class PageHeaderComponent {
  @Input() title = 'Page Title';
  @Input() subtitle?: string;
  @Input() showSidebarToggle = true;
  @Input() sidebarCollapsed = false;
  @Input() showSettings = false;
  @Input() breadcrumbs?: Array<{ label: string; route?: string }>;

  @Output() toggleSidebar = new EventEmitter<void>();
  @Output() settingsClick = new EventEmitter<void>();

  onToggleSidebar(): void {
    this.toggleSidebar.emit();
  }

  onSettingsClick(): void {
    this.settingsClick.emit();
  }
}
