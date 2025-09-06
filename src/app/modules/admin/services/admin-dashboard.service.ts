import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay, catchError } from 'rxjs/operators';
import { BaseApiService } from '../../../core/services/base-api.service';
import { API_ENDPOINTS } from '../../../core/constants/api.constants';

export interface DashboardData {
  statistics: {
    totalUsers: number;
    totalMachines: number;
    pendingApprovals: number;
    qaEntries: number;
  };
  recentActivity: any[];
  pendingApprovals: any[];
  userManagement: {
    totalUsers: number;
    pendingApprovals: number;
    recentUsers: any[];
    userStats: {
      activeUsers: number;
      inactiveUsers: number;
      adminUsers: number;
      regularUsers: number;
    };
  };
  machineManagement: {
    totalMachines: number;
    pendingApprovals: number;
    recentMachines: any[];
    machineStats: {
      activeMachines: number;
      inactiveMachines: number;
      approvedMachines: number;
      pendingMachines: number;
    };
  };
}

@Injectable({
  providedIn: 'root'
})
export class AdminDashboardService {
  constructor(private baseApiService: BaseApiService) {}

  /**
   * Get dashboard data from API
   */
  getDashboardData(): Observable<DashboardData> {
    // For now, return mock data
    // In production, this would make API calls to get real data
    const mockData: DashboardData = {
      statistics: {
        totalUsers: 156,
        totalMachines: 89,
        pendingApprovals: 12,
        qaEntries: 234
      },
      recentActivity: [
        {
          id: '1',
          type: 'user',
          title: 'New User Registered',
          description: 'John Doe registered for the system',
          timestamp: new Date(Date.now() - 1000 * 60 * 30),
          user: 'System',
          icon: 'pi pi-user-plus',
          color: 'blue'
        },
        {
          id: '2',
          type: 'machine',
          title: 'Machine Created',
          description: 'New machine "Hydraulic Press" added to Engineering category',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
          user: 'Admin User',
          icon: 'pi pi-cog',
          color: 'green'
        },
        {
          id: '3',
          type: 'approval',
          title: 'Approval Requested',
          description: 'Machine update approval requested for "Conveyor Belt"',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4),
          user: 'Engineer',
          icon: 'pi pi-clock',
          color: 'orange'
        }
      ],
      pendingApprovals: [
        {
          id: '1',
          type: 'machine_creation',
          title: 'New Machine: Hydraulic Press',
          description: 'Request to add new hydraulic press to Engineering category',
          requestedBy: 'John Engineer',
          requestedAt: new Date(Date.now() - 1000 * 60 * 30),
          priority: 'high',
          status: 'pending'
        },
        {
          id: '2',
          type: 'machine_update',
          title: 'Machine Update: Conveyor Belt',
          description: 'Request to update conveyor belt specifications',
          requestedBy: 'Jane Manager',
          requestedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
          priority: 'medium',
          status: 'in_review'
        }
      ],
      userManagement: {
        totalUsers: 156,
        pendingApprovals: 8,
        recentUsers: [
          {
            id: '1',
            name: 'John Doe',
            email: 'john.doe@company.com',
            role: 'Engineer',
            department: 'Engineering',
            status: 'active',
            lastLogin: new Date(Date.now() - 1000 * 60 * 30),
            avatar: null
          },
          {
            id: '2',
            name: 'Jane Smith',
            email: 'jane.smith@company.com',
            role: 'QA Specialist',
            department: 'Quality Assurance',
            status: 'active',
            lastLogin: new Date(Date.now() - 1000 * 60 * 60 * 2),
            avatar: null
          },
          {
            id: '3',
            name: 'Mike Johnson',
            email: 'mike.johnson@company.com',
            role: 'Manager',
            department: 'Management',
            status: 'pending',
            lastLogin: new Date(Date.now() - 1000 * 60 * 60 * 4),
            avatar: null
          }
        ],
        userStats: {
          activeUsers: 148,
          inactiveUsers: 8,
          adminUsers: 12,
          regularUsers: 144
        }
      },
      machineManagement: {
        totalMachines: 89,
        pendingApprovals: 4,
        recentMachines: [
          {
            id: '1',
            name: 'Hydraulic Press',
            category: 'Engineering',
            status: 'active',
            createdBy: 'John Engineer',
            createdAt: new Date(Date.now() - 1000 * 60 * 30),
            lastUpdated: new Date(Date.now() - 1000 * 60 * 30),
            image: null
          },
          {
            id: '2',
            name: 'Conveyor Belt',
            category: 'Manufacturing',
            status: 'pending',
            createdBy: 'Jane Manager',
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
            lastUpdated: new Date(Date.now() - 1000 * 60 * 60 * 2),
            image: null
          },
          {
            id: '3',
            name: 'Welding Machine',
            category: 'Engineering',
            status: 'maintenance',
            createdBy: 'Bob Supervisor',
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4),
            lastUpdated: new Date(Date.now() - 1000 * 60 * 60 * 4),
            image: null
          }
        ],
        machineStats: {
          activeMachines: 78,
          inactiveMachines: 11,
          approvedMachines: 85,
          pendingMachines: 4
        }
      }
    };

    // Simulate API call with delay
    return of(mockData).pipe(
      delay(1000), // Simulate network delay
      catchError(error => {
        console.error('Error fetching dashboard data:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get user statistics
   */
  getUserStatistics(): Observable<any> {
    // This would typically call the user API
    return of({
      totalUsers: 156,
      activeUsers: 148,
      inactiveUsers: 8,
      adminUsers: 12,
      regularUsers: 144
    }).pipe(delay(500));
  }

  /**
   * Get machine statistics
   */
  getMachineStatistics(): Observable<any> {
    // This would typically call the machine API
    return of({
      totalMachines: 89,
      activeMachines: 78,
      inactiveMachines: 11,
      approvedMachines: 85,
      pendingMachines: 4
    }).pipe(delay(500));
  }

  /**
   * Get pending approvals
   */
  getPendingApprovals(): Observable<any> {
    // This would typically call the approval API
    return of({
      total: 12,
      high: 3,
      medium: 6,
      low: 3
    }).pipe(delay(500));
  }

  /**
   * Get recent activity
   */
  getRecentActivity(): Observable<any> {
    // This would typically call the activity API
    return of([]).pipe(delay(500));
  }
}
