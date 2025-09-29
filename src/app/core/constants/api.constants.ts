export const API_ENDPOINTS = {
  // Auth endpoints
  LOGIN: '/user/login',
  REGISTER: '/user/register',
  LOGOUT: '/user/logout',
  REFRESH_TOKEN: '/user/refresh',

  // User management
  USERS: '/user',
  USER_APPROVE: '/user/:id/approve',
  USER_STATISTICS: '/user/statistics',

  // Machine management
  MACHINES: '/machines',
  MACHINE_BY_ID: '/machines/:id',
  MACHINE_APPROVED: '/machines/approved',
  MY_RECENT_MACHINES: '/machines/my/recent',
  MACHINE_APPROVAL: '/machines/:id/approval',
  MACHINE_BY_CATEGORY: '/machines/category/:id',
  MACHINE_VALIDATE_IDS: '/machines/validate-ids',
  MACHINE_STATISTICS: '/machines/statistics',

  // Category management
  CATEGORIES: '/admin/category',
  CATEGORY_BY_ID: '/admin/category/:id',
  CATEGORY_ACTIVE: '/admin/category/active',
  CATEGORY_EXISTS: '/admin/category/exists/:id',

  // Department & Role management
  DEPARTMENTS: '/admin/departments',
  DEPARTMENT_BY_ID: '/admin/department/:id',
  ROLES: '/admin/roles',
  ROLE_CREATE: '/admin/role/create',
  ROLE_BY_ID: '/admin/role/:id',

  // Machine Approval workflow
  MACHINE_APPROVALS: '/machine-approvals',
  MACHINE_APPROVAL_BY_ID: '/machine-approvals/:id',
  MY_APPROVAL_REQUESTS: '/machine-approvals/my-requests',
  PENDING_APPROVALS: '/machine-approvals/pending',
  PROCESS_APPROVAL: '/machine-approvals/:id/process',
  CANCEL_APPROVAL: '/machine-approvals/:id/cancel',
  APPROVAL_STATISTICS: '/machine-approvals/statistics',

  // QC Machine management (was QA)
  QA_MACHINES: '/qc-machines',
  QA_MACHINE_BY_ID: '/qc-machines/:id',
  QA_MACHINE_BY_MACHINE: '/qc-machines/machine/:machineId',
  QA_MACHINE_BY_USER: '/qc-machines/user/:userId',
  QA_MACHINE_VALIDATE_IDS: '/qc-machines/validate-ids',
  QA_STATISTICS: '/qc-machines/statistics',

  // Permission configuration (mounted at /api/permission in backend)
  PERMISSIONS: '/permission',
  PERMISSION_BY_ID: '/permission/:id',
  MY_PERMISSIONS: '/permission/my-permissions',
  CHECK_PERMISSION: '/permission/check',
  CHECK_RESOURCE_PERMISSION: '/permission/check/:action',
  VALIDATE_CATEGORIES: '/permission/validate-categories',
  TOGGLE_PERMISSION: '/permission/:id/toggle',
  CLEAR_PERMISSION_CACHE: '/permission/clear-cache',
} as const;

export const HTTP_STATUS_CODES = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  ACCOUNT_NOT_VERIFIED: 'ACCOUNT_NOT_VERIFIED',
  ACCOUNT_NOT_APPROVED: 'ACCOUNT_NOT_APPROVED',
  ACCOUNT_INACTIVE: 'ACCOUNT_INACTIVE',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  TOKEN_MISSING: 'TOKEN_MISSING',
  TOO_MANY_ATTEMPTS: 'TOO_MANY_ATTEMPTS',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
} as const;
