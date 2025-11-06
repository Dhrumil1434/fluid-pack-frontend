import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  NotificationService,
  Notification,
} from '../../services/notification.service';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule, ToastModule],
  template: `
    <div class="relative">
      <!-- Notification Bell Button -->
      <button
        class="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
        (click)="toggleDropdown()"
        [class.bg-blue-50]="dropdownVisible"
        [class.border-blue-200]="dropdownVisible"
        title="Notifications"
      >
        <i class="pi pi-bell text-xl text-gray-600"></i>
        <!-- Unread Badge -->
        <span
          *ngIf="unreadCount > 0"
          class="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center"
        >
          {{ unreadCount > 99 ? '99+' : unreadCount }}
        </span>
      </button>

      <!-- Notification Dropdown -->
      <div
        *ngIf="dropdownVisible"
        class="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 flex flex-col"
      >
        <!-- Dropdown Header -->
        <div
          class="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50 rounded-t-lg"
        >
          <h3 class="font-semibold text-gray-900">Notifications</h3>
          <div class="flex items-center gap-2">
            <button
              *ngIf="unreadCount > 0"
              class="text-xs text-blue-600 hover:text-blue-800 font-medium"
              (click)="markAllAsRead()"
            >
              Mark all read
            </button>
            <button
              class="text-gray-400 hover:text-gray-600"
              (click)="closeDropdown()"
              title="Close"
            >
              <i class="pi pi-times"></i>
            </button>
          </div>
        </div>

        <!-- Notifications List -->
        <div class="overflow-y-auto flex-1 min-h-0">
          <div *ngIf="loading" class="p-4 text-center text-gray-500 text-sm">
            Loading...
          </div>
          <div
            *ngIf="!loading && notifications.length === 0"
            class="p-8 text-center text-gray-400"
          >
            <i class="pi pi-bell-slash text-3xl mb-2 block"></i>
            <p class="text-sm">No notifications</p>
          </div>
          <div
            *ngIf="!loading && notifications.length > 0"
            class="divide-y divide-gray-100"
          >
            <div
              *ngFor="let notification of notifications"
              class="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
              [class.bg-blue-50]="!notification.read"
              (click)="handleNotificationClick(notification)"
            >
              <div class="flex items-start gap-3">
                <!-- Icon based on type -->
                <div
                  class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
                  [class.bg-blue-100]="
                    notification.type === 'MACHINE_CREATED' ||
                    notification.type === 'APPROVAL_REQUESTED'
                  "
                  [class.bg-green-100]="
                    notification.type === 'MACHINE_APPROVED'
                  "
                  [class.bg-red-100]="notification.type === 'MACHINE_REJECTED'"
                  [class.bg-yellow-100]="
                    notification.type === 'MACHINE_EDIT_REQUESTED'
                  "
                >
                  <i
                    class="text-sm"
                    [class.pi-inbox]="
                      notification.type === 'MACHINE_CREATED' ||
                      notification.type === 'APPROVAL_REQUESTED'
                    "
                    [class.pi-check-circle]="
                      notification.type === 'MACHINE_APPROVED'
                    "
                    [class.pi-times-circle]="
                      notification.type === 'MACHINE_REJECTED'
                    "
                    [class.pi-pencil]="
                      notification.type === 'MACHINE_EDIT_REQUESTED'
                    "
                    [class.text-blue-600]="
                      notification.type === 'MACHINE_CREATED' ||
                      notification.type === 'APPROVAL_REQUESTED'
                    "
                    [class.text-green-600]="
                      notification.type === 'MACHINE_APPROVED'
                    "
                    [class.text-red-600]="
                      notification.type === 'MACHINE_REJECTED'
                    "
                    [class.text-yellow-600]="
                      notification.type === 'MACHINE_EDIT_REQUESTED'
                    "
                  ></i>
                </div>

                <!-- Notification Content -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-start justify-between gap-2">
                    <h4
                      class="text-sm font-semibold text-gray-900"
                      [class.font-bold]="!notification.read"
                    >
                      {{ notification.title }}
                    </h4>
                    <span
                      *ngIf="!notification.read"
                      class="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full"
                    ></span>
                  </div>
                  <p class="text-xs text-gray-600 mt-1 line-clamp-2">
                    {{ notification.message }}
                  </p>
                  <div class="flex items-center justify-between mt-2">
                    <span class="text-xs text-gray-400">
                      {{ notification.createdAt | date: 'short' }}
                    </span>
                    <button
                      *ngIf="!notification.read"
                      class="text-xs text-blue-600 hover:text-blue-800"
                      (click)="
                        markAsRead(notification._id); $event.stopPropagation()
                      "
                    >
                      Mark read
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Dropdown Footer -->
        <div
          *ngIf="notifications.length > 0"
          class="px-4 py-2 border-t border-gray-200 bg-gray-50 rounded-b-lg"
        >
          <button
            class="w-full text-xs text-blue-600 hover:text-blue-800 font-medium text-center"
            (click)="viewAllNotifications()"
          >
            View all notifications
          </button>
        </div>
      </div>
    </div>
    <p-toast></p-toast>
  `,
  styles: [
    `
      .line-clamp-2 {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
    `,
  ],
})
export class NotificationBellComponent implements OnInit, OnDestroy {
  notifications: Notification[] = [];
  unreadCount = 0;
  dropdownVisible = false;
  loading = false;

  private destroy$ = new Subject<void>();
  private unreadCountInterval?: ReturnType<typeof setInterval>;

  constructor(
    private notificationService: NotificationService,
    private router: Router,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    // Load initial notifications
    this.loadNotifications();

    // Subscribe to real-time notifications
    this.notificationService.newNotification$
      .pipe(takeUntil(this.destroy$))
      .subscribe(notification => {
        // Show toast for new notification
        this.showNotificationToast(notification);

        // Add to list if dropdown is open
        if (!this.dropdownVisible) {
          this.loadNotifications();
        } else {
          this.notifications = [notification, ...this.notifications];
        }

        // Update unread count
        this.updateUnreadCount();
      });

    // Subscribe to unread count updates
    this.notificationService.unreadCount$
      .pipe(takeUntil(this.destroy$))
      .subscribe(count => {
        this.unreadCount = count;
      });

    // Update unread count periodically (every 30 seconds)
    this.unreadCountInterval = setInterval(() => {
      this.updateUnreadCount();
    }, 30000);
  }

  ngOnDestroy(): void {
    // Clear the interval to prevent memory leaks
    if (this.unreadCountInterval) {
      clearInterval(this.unreadCountInterval);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleDropdown(): void {
    this.dropdownVisible = !this.dropdownVisible;
    if (this.dropdownVisible) {
      this.loadNotifications();
    }
  }

  closeDropdown(): void {
    this.dropdownVisible = false;
  }

  loadNotifications(): void {
    this.loading = true;
    this.notificationService.getNotifications({ limit: 20 }).subscribe({
      next: (response: any) => {
        const data = response?.data || response;
        this.notifications = data.notifications || [];
        this.unreadCount = data.unreadCount || 0;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  updateUnreadCount(): void {
    this.notificationService.updateUnreadCount();
  }

  markAsRead(notificationId: string): void {
    this.notificationService.markAsRead(notificationId).subscribe({
      next: () => {
        // Update local state
        const notification = this.notifications.find(
          n => n._id === notificationId
        );
        if (notification) {
          notification.read = true;
          notification.readAt = new Date().toISOString();
        }
        this.updateUnreadCount();
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to mark notification as read',
        });
      },
    });
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        // Update local state
        this.notifications.forEach(n => {
          n.read = true;
          n.readAt = new Date().toISOString();
        });
        this.updateUnreadCount();
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'All notifications marked as read',
        });
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to mark all as read',
        });
      },
    });
  }

  handleNotificationClick(notification: Notification): void {
    // Mark as read if unread
    if (!notification.read) {
      this.markAsRead(notification._id);
    }

    // Navigate based on actionUrl
    if (notification.actionUrl) {
      this.router.navigate([notification.actionUrl]);
      this.closeDropdown();
    } else {
      // Default navigation based on type
      if (
        notification.type === 'MACHINE_CREATED' ||
        notification.type === 'APPROVAL_REQUESTED'
      ) {
        this.router.navigate(['/dispatch/approvals']);
      } else if (
        notification.type === 'MACHINE_APPROVED' ||
        notification.type === 'MACHINE_REJECTED'
      ) {
        this.router.navigate(['/dispatch/machines']);
      }
      this.closeDropdown();
    }
  }

  viewAllNotifications(): void {
    // Navigate to a dedicated notifications page (if exists) or approvals page
    this.router.navigate(['/dispatch/approvals']);
    this.closeDropdown();
  }

  showNotificationToast(notification: Notification): void {
    const severity =
      notification.type === 'MACHINE_APPROVED'
        ? 'success'
        : notification.type === 'MACHINE_REJECTED'
          ? 'error'
          : notification.type === 'MACHINE_CREATED' ||
              notification.type === 'APPROVAL_REQUESTED'
            ? 'info'
            : 'warn';

    this.messageService.add({
      severity,
      summary: notification.title,
      detail: notification.message,
      life: 5000,
      data: notification,
      // Make toast clickable
      closable: true,
    });
  }
}
