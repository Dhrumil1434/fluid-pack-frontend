import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ActivityItem {
  id: string;
  type: 'user' | 'machine' | 'approval' | 'qa' | 'system';
  title: string;
  description: string;
  timestamp: Date;
  user: string;
  icon: string;
  color: string;
}

@Component({
  selector: 'app-recent-activity',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './recent-activity.component.html',
  styleUrls: ['./recent-activity.component.css']
})
export class RecentActivityComponent implements OnInit {
  @Input() data: ActivityItem[] = [];

  // Default activities if no data provided
  defaultActivities: ActivityItem[] = [
    {
      id: '1',
      type: 'user',
      title: 'New User Registered',
      description: 'John Doe registered for the system',
      timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
      user: 'System',
      icon: 'pi pi-user-plus',
      color: 'blue'
    },
    {
      id: '2',
      type: 'machine',
      title: 'Machine Created',
      description: 'New machine "Hydraulic Press" added to Engineering category',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      user: 'Admin User',
      icon: 'pi pi-cog',
      color: 'green'
    },
    {
      id: '3',
      type: 'approval',
      title: 'Approval Requested',
      description: 'Machine update approval requested for "Conveyor Belt"',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4), // 4 hours ago
      user: 'Engineer',
      icon: 'pi pi-clock',
      color: 'orange'
    },
    {
      id: '4',
      type: 'qa',
      title: 'QA Entry Added',
      description: 'Quality assurance entry added for "Welding Machine"',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6), // 6 hours ago
      user: 'QA Specialist',
      icon: 'pi pi-check-circle',
      color: 'purple'
    },
    {
      id: '5',
      type: 'system',
      title: 'System Update',
      description: 'System maintenance completed successfully',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8), // 8 hours ago
      user: 'System',
      icon: 'pi pi-wrench',
      color: 'gray'
    }
  ];

  ngOnInit() {
    // Use default activities if no data provided
    if (!this.data || this.data.length === 0) {
      this.data = this.defaultActivities;
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
   * Get activity type color class
   */
  getActivityColorClass(type: string): string {
    return `activity-${type}`;
  }

  /**
   * Get activity icon class
   */
  getActivityIconClass(icon: string): string {
    return icon;
  }

  /**
   * Get activity avatar background class
   */
  getActivityAvatarClass(type: string): string {
    switch (type.toLowerCase()) {
      case 'user':
        return 'bg-gradient-to-r from-blue-500 to-blue-600';
      case 'machine':
        return 'bg-gradient-to-r from-emerald-500 to-emerald-600';
      case 'approval':
        return 'bg-gradient-to-r from-amber-500 to-orange-500';
      case 'qa':
        return 'bg-gradient-to-r from-purple-500 to-pink-500';
      case 'system':
        return 'bg-gradient-to-r from-gray-500 to-gray-600';
      default:
        return 'bg-gradient-to-r from-blue-500 to-blue-600';
    }
  }

  /**
   * Get activity indicator class
   */
  getActivityIndicatorClass(type: string): string {
    switch (type.toLowerCase()) {
      case 'user':
        return 'bg-blue-500';
      case 'machine':
        return 'bg-emerald-500';
      case 'approval':
        return 'bg-amber-500';
      case 'qa':
        return 'bg-purple-500';
      case 'system':
        return 'bg-gray-500';
      default:
        return 'bg-blue-500';
    }
  }

  /**
   * Get activity type class for badges
   */
  getActivityTypeClass(type: string): string {
    switch (type.toLowerCase()) {
      case 'user':
        return 'bg-blue-100 text-blue-800';
      case 'machine':
        return 'bg-emerald-100 text-emerald-800';
      case 'approval':
        return 'bg-amber-100 text-amber-800';
      case 'qa':
        return 'bg-purple-100 text-purple-800';
      case 'system':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  }

  /**
   * Track by function for activity items
   */
  trackByActivityId(index: number, activity: ActivityItem): string {
    return activity.id;
  }
}
