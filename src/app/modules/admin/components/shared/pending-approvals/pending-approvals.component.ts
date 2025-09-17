import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface PendingApproval {
  id: string;
  type:
    | 'machine_creation'
    | 'machine_update'
    | 'machine_deletion'
    | 'user_approval';
  title: string;
  description: string;
  requestedBy: string;
  requestedById?: string;
  requestedByAvatar?: string;
  requestedAt: Date;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_review' | 'approved' | 'rejected';
  metadata?: {
    machineId?: string;
    machineName?: string;
    proposedChanges?: Record<string, unknown>;
  };
  dueDate?: Date;
}

@Component({
  selector: 'app-pending-approvals',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pending-approvals.component.html',
  styleUrls: ['./pending-approvals.component.css'],
})
export class PendingApprovalsComponent implements OnInit {
  @Input() data: PendingApproval[] = [];

  // Default pending approvals if no data provided
  defaultApprovals: PendingApproval[] = [
    {
      id: '1',
      type: 'machine_creation',
      title: 'New Machine: Hydraulic Press',
      description: 'Request to add new hydraulic press to Engineering category',
      requestedBy: 'John Engineer',
      requestedAt: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
      priority: 'high',
      status: 'pending',
    },
    {
      id: '2',
      type: 'machine_update',
      title: 'Machine Update: Conveyor Belt',
      description: 'Request to update conveyor belt specifications',
      requestedBy: 'Jane Manager',
      requestedAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      priority: 'medium',
      status: 'in_review',
    },
    {
      id: '3',
      type: 'user_approval',
      title: 'User Registration: Mike QA',
      description: 'New user registration awaiting approval',
      requestedBy: 'Mike QA',
      requestedAt: new Date(Date.now() - 1000 * 60 * 60 * 4), // 4 hours ago
      priority: 'low',
      status: 'pending',
    },
    {
      id: '4',
      type: 'machine_deletion',
      title: 'Machine Deletion: Old Welder',
      description: 'Request to remove outdated welding machine',
      requestedBy: 'Bob Supervisor',
      requestedAt: new Date(Date.now() - 1000 * 60 * 60 * 6), // 6 hours ago
      priority: 'medium',
      status: 'pending',
    },
  ];

  ngOnInit() {
    // Use default approvals if no data provided
    if (!this.data || this.data.length === 0) {
      this.data = this.defaultApprovals;
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
   * Get priority color class
   */
  getPriorityColorClass(priority: string): string {
    switch (priority) {
      case 'high':
        return 'priority-high';
      case 'medium':
        return 'priority-medium';
      case 'low':
        return 'priority-low';
      default:
        return 'priority-medium';
    }
  }

  /**
   * Get priority icon
   */
  getPriorityIcon(priority: string): string {
    switch (priority) {
      case 'high':
        return 'pi pi-exclamation-triangle';
      case 'medium':
        return 'pi pi-exclamation-circle';
      case 'low':
        return 'pi pi-info-circle';
      default:
        return 'pi pi-info-circle';
    }
  }

  /**
   * Get type icon
   */
  getTypeIcon(type: string): string {
    switch (type) {
      case 'machine_creation':
        return 'pi pi-plus-circle';
      case 'machine_update':
        return 'pi pi-pencil';
      case 'machine_deletion':
        return 'pi pi-trash';
      case 'user_approval':
        return 'pi pi-user-plus';
      default:
        return 'pi pi-question-circle';
    }
  }

  /**
   * Get status color class
   */
  getStatusColorClass(status: string): string {
    switch (status) {
      case 'pending':
        return 'status-pending';
      case 'in_review':
        return 'status-review';
      case 'approved':
        return 'status-approved';
      case 'rejected':
        return 'status-rejected';
      default:
        return 'status-pending';
    }
  }

  /**
   * Get approval avatar background class
   */
  getApprovalAvatarClass(type: string): string {
    switch (type) {
      case 'machine_creation':
        return 'bg-gradient-to-r from-emerald-500 to-emerald-600';
      case 'machine_update':
        return 'bg-gradient-to-r from-blue-500 to-blue-600';
      case 'machine_deletion':
        return 'bg-gradient-to-r from-red-500 to-red-600';
      case 'user_approval':
        return 'bg-gradient-to-r from-purple-500 to-purple-600';
      default:
        return 'bg-gradient-to-r from-gray-500 to-gray-600';
    }
  }

  /**
   * Get priority indicator class
   */
  getPriorityIndicatorClass(priority: string): string {
    switch (priority.toLowerCase()) {
      case 'high':
        return 'bg-error';
      case 'medium':
        return 'bg-warning';
      case 'low':
        return 'bg-success';
      default:
        return 'bg-gray-500';
    }
  }

  /**
   * Get priority badge class
   */
  getPriorityBadgeClass(priority: string): string {
    switch (priority.toLowerCase()) {
      case 'high':
        return 'bg-error/10 text-error';
      case 'medium':
        return 'bg-warning/10 text-warning';
      case 'low':
        return 'bg-success/10 text-success';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  /**
   * Approve an item
   */
  approveItem(approvalId: string): void {
    console.log('Approving item:', approvalId);
    // TODO: Implement approval logic
    // This would typically call a service method to approve the item
    // and update the local data or refresh the list
  }

  /**
   * Reject an item
   */
  rejectItem(approvalId: string): void {
    console.log('Rejecting item:', approvalId);
    // TODO: Implement rejection logic
    // This would typically call a service method to reject the item
    // and update the local data or refresh the list
  }

  /**
   * Track by function for approval items
   */
  trackByApprovalId(index: number, approval: PendingApproval): string {
    return approval.id;
  }
}
