export interface User {
  _id: string;
  username: string;
  email: string;
  isApproved: boolean;
  role: {
    _id: string;
    name: string;
  };
  department: {
    _id: string;
    name: string;
  };
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
  avatar?: string;
}

export interface UserFilters {
  search?: string;
  role?: string;
  department?: string;
  isApproved?: boolean;
  status?: 'approved' | 'pending';
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface UserListResponse {
  users: User[];
  total: number;
  pages: number;
  currentPage: number;
  limit: number;
}

export interface UserStatistics {
  totalUsers: number;
  approvedUsers: number;
  pendingUsers: number;
  usersByRole: Array<{ _id: string; name: string; count: number }>;
  usersByDepartment: Array<{ _id: string; name: string; count: number }>;
  recentUsers: number;
}

export interface UserApprovalRequest {
  userId: string;
  approved: boolean;
  notes?: string;
}

export interface BulkUserApprovalRequest {
  userIds: string[];
  approved: boolean;
  notes?: string;
}

export interface UserExportRequest {
  format: 'csv' | 'excel' | 'pdf';
  filters?: UserFilters;
}

export interface UserDetails extends User {
  // Additional fields for detailed view
  permissions?: string[];
  lastActivity?: Date;
  loginCount?: number;
  status: 'active' | 'inactive' | 'pending' | 'suspended';
}

export interface UserUpdateRequest {
  username?: string;
  email?: string;
  role?: string;
  department?: string;
  isApproved?: boolean;
}

export interface UserCreateRequest {
  username: string;
  email: string;
  password: string;
  role: string;
  department: string;
}
