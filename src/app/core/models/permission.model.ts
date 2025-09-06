export enum ActionType {
  CREATE_MACHINE = 'CREATE_MACHINE',
  EDIT_MACHINE = 'EDIT_MACHINE',
  DELETE_MACHINE = 'DELETE_MACHINE',
  APPROVE_MACHINE = 'APPROVE_MACHINE',
  VIEW_MACHINE = 'VIEW_MACHINE',
}

export enum PermissionLevel {
  ALLOWED = 'ALLOWED',
  REQUIRES_APPROVAL = 'REQUIRES_APPROVAL',
  DENIED = 'DENIED',
}

export interface PermissionConfig {
  _id: string;
  name: string;
  description: string;
  action: ActionType;
  roleIds?: string[];
  userIds?: string[];
  departmentIds?: string[];
  categoryIds?: string[];
  permission: PermissionLevel;
  approverRoles?: string[];
  maxValue?: number;
  isActive: boolean;
  priority: number;
  createdBy: {
    _id: string;
    username: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreatePermissionConfigRequest {
  name: string;
  description: string;
  action: ActionType;
  roleIds?: string[];
  userIds?: string[];
  departmentIds?: string[];
  categoryIds?: string[];
  permission: PermissionLevel;
  approverRoles?: string[];
  maxValue?: number;
  priority?: number;
}

export interface UpdatePermissionConfigRequest {
  name?: string;
  description?: string;
  roleIds?: string[];
  userIds?: string[];
  departmentIds?: string[];
  categoryIds?: string[];
  permission?: PermissionLevel;
  approverRoles?: string[];
  maxValue?: number;
  isActive?: boolean;
  priority?: number;
}

export interface CheckPermissionRequest {
  action: ActionType;
  resourceId?: string;
  categoryId?: string;
}

export interface PermissionFilters {
  action?: ActionType;
  isActive?: boolean;
  page?: number;
  limit?: number;
}
