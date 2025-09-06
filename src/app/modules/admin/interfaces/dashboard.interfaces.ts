// Dashboard Data Interfaces

export interface MachineListResult {
  machines: MachinePreview[];
  total: number;
  pages: number;
}

export interface DashboardStatistics {
  totalUsers: number;
  totalMachines: number;
  pendingApprovals: number;
  qaEntries: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
}

export interface UserStatistics {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  pendingUsers: number;
  adminUsers: number;
  regularUsers: number;
  usersByRole: RoleStatistics[];
  usersByDepartment: DepartmentStatistics[];
  recentRegistrations: number;
  lastLoginActivity: number;
}

export interface MachineStatistics {
  totalMachines: number;
  activeMachines: number;
  inactiveMachines: number;
  pendingMachines: number;
  approvedMachines: number;
  rejectedMachines: number;
  machinesByCategory: CategoryStatistics[];
  recentMachines: number;
  maintenanceRequired: number;
}

export interface ApprovalStatistics {
  totalPending: number;
  highPriority: number;
  mediumPriority: number;
  lowPriority: number;
  approvalsByType: ApprovalTypeStatistics[];
  averageProcessingTime: number; // in hours
  overdueApprovals: number;
}

export interface QAStatistics {
  totalQAEntries: number;
  completedQAEntries: number;
  pendingQAEntries: number;
  qaEntriesByMachine: QAMachineStatistics[];
  averageCompletionTime: number; // in hours
  qualityScore: number; // percentage
}

export interface RoleStatistics {
  roleId: string;
  roleName: string;
  userCount: number;
  percentage: number;
}

export interface DepartmentStatistics {
  departmentId: string;
  departmentName: string;
  userCount: number;
  percentage: number;
}

export interface CategoryStatistics {
  categoryId: string;
  categoryName: string;
  machineCount: number;
  percentage: number;
}

export interface ApprovalTypeStatistics {
  type:
    | 'machine_creation'
    | 'machine_update'
    | 'machine_deletion'
    | 'user_approval';
  count: number;
  percentage: number;
}

export interface QAMachineStatistics {
  machineId: string;
  machineName: string;
  qaEntryCount: number;
  lastQAEntry: Date;
  qualityScore: number;
}

export interface RecentActivity {
  id: string;
  type: 'user' | 'machine' | 'approval' | 'qa' | 'system';
  title: string;
  description: string;
  timestamp: Date;
  user: string;
  userId?: string;
  icon: string;
  color: string;
  metadata?: any;
}

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
  requestedById: string;
  requestedAt: Date;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_review' | 'approved' | 'rejected';
  metadata?: any;
  dueDate?: Date;
}

export interface UserPreview {
  id: string;
  name: string;
  email: string;
  role: string;
  roleId: string;
  department: string;
  departmentId: string;
  status: 'active' | 'inactive' | 'pending';
  lastLogin: Date;
  avatar?: string;
  isApproved: boolean;
}

export interface MachinePreview {
  id: string;
  name: string;
  category: string;
  categoryId: string;
  status: 'active' | 'inactive' | 'pending' | 'maintenance';
  createdBy: string;
  createdById: string;
  createdAt: Date;
  lastUpdated: Date;
  image?: string;
  isApproved: boolean;
}

export interface DashboardData {
  statistics: DashboardStatistics;
  userStatistics: UserStatistics;
  machineStatistics: MachineStatistics;
  approvalStatistics: ApprovalStatistics;
  qaStatistics: QAStatistics;
  recentActivity: RecentActivity[];
  pendingApprovals: PendingApproval[];
  userManagement: {
    totalUsers: number;
    pendingApprovals: number;
    recentUsers: UserPreview[];
    userStats: UserStatistics;
  };
  machineManagement: {
    totalMachines: number;
    pendingApprovals: number;
    recentMachines: MachinePreview[];
    machineStats: MachineStatistics;
  };
}

// API Response Interfaces
export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface PaginatedResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: {
    items: T[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

// Query Parameters
export interface DashboardQueryParams {
  timeRange?: 'today' | 'week' | 'month' | 'quarter' | 'year';
  departmentId?: string;
  categoryId?: string;
  includeInactive?: boolean;
}

export interface UserStatsQueryParams extends DashboardQueryParams {
  roleId?: string;
  status?: 'active' | 'inactive' | 'pending';
  isApproved?: boolean;
  limit?: number;
  page?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface MachineStatsQueryParams extends DashboardQueryParams {
  status?: 'active' | 'inactive' | 'pending' | 'maintenance';
  isApproved?: boolean;
  limit?: number;
  page?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ApprovalStatsQueryParams extends DashboardQueryParams {
  priority?: 'high' | 'medium' | 'low';
  type?:
    | 'machine_creation'
    | 'machine_update'
    | 'machine_deletion'
    | 'user_approval';
  status?: 'pending' | 'in_review' | 'approved' | 'rejected';
  limit?: number;
  page?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  groupBy?: string;
  overdue?: boolean;
}

export interface QAStatsQueryParams extends DashboardQueryParams {
  machineId?: string;
  userId?: string;
  status?: 'completed' | 'pending';
  limit?: number;
  page?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  groupBy?: string;
}
