# Admin — Roles & Permissions — Backend Endpoints

Base paths (from `back-end/src/app.ts`):

- Departments & Roles: `/api/admin`
- Permission Configs & Checks: `/api/permission`

## Roles

- POST `/api/admin/role/create`
  - body: `{ name: string; description?: string }`
  - 201 → `{ statusCode, data: Role, message }`
- GET `/api/admin/roles`
  - 200 → `{ statusCode, data: Role[], message }`
- GET `/api/admin/role/:id`
  - 200 → `{ statusCode, data: Role, message }`
- PUT `/api/admin/role/:id`
  - body: `{ name: string; description?: string }`
  - 200 → `{ statusCode, data: Role, message }`
- DELETE `/api/admin/role/:id`
  - 200 → `{ statusCode, data: Role, message }`

Role shape (simplified):

```ts
interface Role {
  _id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}
```

## Departments

- POST `/api/admin/department/create`
  - body: `{ name: string; description?: string }`
- GET `/api/admin/departments`
- GET `/api/admin/department/:id`
- PUT `/api/admin/department/:id`
- DELETE `/api/admin/department/:id`

Department shape (simplified):

```ts
interface Department {
  _id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}
```

## Permission Configs (Rules)

- POST `/api/permission/`
  - auth: admin
  - body:

```ts
interface CreatePermissionConfigData {
  name: string;
  description: string;
  action: ActionType; // enum from backend
  roleIds?: string[];
  userIds?: string[];
  departmentIds?: string[];
  categoryIds?: string[];
  permission: PermissionLevel; // ALLOWED | REQUIRES_APPROVAL | DENIED
  approverRoles?: string[];
  maxValue?: number;
  priority?: number;
}
```

- GET `/api/permission/?page&limit`
  - 200 → `{ statusCode, data: { configs, pagination }, message }`
- GET `/api/permission/action/:action?page&limit`
  - 200 → `{ statusCode, data: { configs, pagination }, message }`
- GET `/api/permission/:id`
  - 200 → `{ statusCode, data: PermissionConfig, message }`
- PUT `/api/permission/:id`
  - body: partial of `CreatePermissionConfigData` + `{ isActive?: boolean }`
  - 200 → `{ statusCode, data: PermissionConfig, message }`
- PATCH `/api/permission/:id/toggle`
  - 200 → `{ statusCode, data: PermissionConfig, message }` // flips isActive
- DELETE `/api/permission/:id`
  - 200 → `{ statusCode, data: null, message }` // soft-deletes (sets inactive)
- POST `/api/permission/clear-cache`
  - 200 → `{ statusCode, data: { message }, message }`

PermissionConfig shape (key fields):

```ts
interface PermissionConfig {
  _id: string;
  name: string;
  description?: string;
  action: string; // ActionType
  permission: 'ALLOWED' | 'REQUIRES_APPROVAL' | 'DENIED';
  roleIds?: Array<{ _id: string; name: string }>;
  userIds?: Array<{ _id: string; username: string; email: string }>;
  departmentIds?: Array<{ _id: string; name: string }>;
  categoryIds?: Array<{ _id: string; name: string }>;
  approverRoles?: Array<{ _id: string; name: string }>;
  maxValue?: number;
  priority: number;
  isActive: boolean;
  createdBy?: { _id: string; username: string; email: string };
  createdAt: string;
  updatedAt: string;
}
```

## Permission Checks (for current user)

- GET `/api/permission/my-permissions?categoryId&machineValue`
  - 200 → `{ statusCode, data: { userId, userInfo, categoryId?, machineValue?, permissions }, message }`
- POST `/api/permission/check`
  - body: `{ action: ActionType; categoryId?: string; machineValue?: number }`
  - 200 → `{ statusCode, data: { userId, action, categoryId?, machineValue?, result }, message }`
- GET `/api/permission/check/:action?categoryId&machineValue`
  - 200 → `{ statusCode, data: { userId, action, categoryId?, machineValue?, result }, message }`

PermissionCheck result (simplified):

```ts
interface PermissionCheckResult {
  allowed: boolean;
  requiresApproval: boolean;
  approverRoles?: string[]; // ids
  matchedBy?: string; // e.g., 'role + department rule'
  reason?: string;
}
```

## Frontend Integration Notes

- Reuse User Management service patterns for HTTP calls and toasts.
- For rule priority: backend validates uniqueness among active rules; surface conflict errors.
- Toggle uses PATCH; delete is soft via DELETE.
- Populate dropdowns from APIs (roles, departments, categories, users if needed) — no hardcoded lists.
