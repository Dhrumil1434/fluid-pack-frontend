import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface UserManagementData {
  totalUsers: number;
  pendingApprovals: number;
  recentUsers: UserPreview[];
  userStats: {
    activeUsers: number;
    inactiveUsers: number;
    adminUsers: number;
    regularUsers: number;
  };
}

export interface UserPreview {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  status: 'active' | 'inactive' | 'pending';
  lastLogin: Date;
  avatar?: string;
}

@Component({
  selector: 'app-user-management-preview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-management-preview.component.html',
  styleUrls: ['./user-management-preview.component.css'],
})
export class UserManagementPreviewComponent implements OnInit {
  @Input() data: UserManagementData | null = null;

  // Default data if none provided
  defaultData: UserManagementData = {
    totalUsers: 0,
    pendingApprovals: 0,
    recentUsers: [],
    userStats: {
      activeUsers: 0,
      inactiveUsers: 0,
      adminUsers: 0,
      regularUsers: 0,
    },
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
      default:
        return 'pi pi-question-circle';
    }
  }

  /**
   * Get user initials for avatar
   */
  getUserInitials(name: string): string {
    return name
      .split(' ')
      .map(n => n.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  /**
   * Build avatar URL using same strategy as User Management table
   */
  getAvatarUrl(nameOrEmail: string | undefined | null): string {
    const base = 'https://ui-avatars.com/api/?background=random&name=';
    const value = (nameOrEmail || '?').toString();
    try {
      return base + encodeURIComponent(value);
    } catch {
      return base + value;
    }
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
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  /**
   * Track by function for user items
   */
  trackByUserId(index: number, user: UserPreview): string {
    return user.id;
  }
}
