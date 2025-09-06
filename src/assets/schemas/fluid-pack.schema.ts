import { z } from 'zod';
import { apiResponseSchema, paginationQuerySchema, paginationResponseSchema } from './common.schema';

// ============================================================================
// COMMON SCHEMAS
// ============================================================================

// MongoDB ObjectId validation
const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format');

// Password validation with complexity requirements
const passwordSchema = z
  .string()
  .min(6, 'Password must be at least 6 characters')
  .max(128, 'Password cannot exceed 128 characters')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/,
    'Password must contain at least one uppercase letter, one lowercase letter, and one digit'
  );

// Email validation
const emailSchema = z.string().email('Invalid email format').toLowerCase().trim();

// ============================================================================
// USER SCHEMAS
// ============================================================================

// Department schema
export const departmentSchema = z.object({
  _id: objectIdSchema,
  name: z.string().min(2).max(30).toLowerCase().trim(),
  description: z.string().max(100).optional(),
});

// Role schema
export const roleSchema = z.object({
  _id: objectIdSchema,
  name: z.string().min(2).max(30).toLowerCase().trim(),
  description: z.string().max(100).optional(),
});

// User registration schema
export const userRegistrationSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username cannot exceed 30 characters')
    .toLowerCase()
    .trim(),
  email: emailSchema,
  password: passwordSchema,
  department: objectIdSchema,
  role: objectIdSchema,
  isApproved: z.boolean().optional(),
  createdBy: objectIdSchema.optional(),
});

// User login schema
export const userLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(6, 'Password must be at least 6 characters').max(128),
});

// User update schema
export const userUpdateSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username cannot exceed 30 characters')
    .toLowerCase()
    .trim()
    .optional(),
  email: emailSchema.optional(),
  department: objectIdSchema.optional(),
  role: objectIdSchema.optional(),
  isApproved: z.boolean().optional(),
});

// User data schema (for responses)
export const userDataSchema = z.object({
  _id: objectIdSchema,
  username: z.string(),
  email: z.string().email(),
  department: departmentSchema,
  role: roleSchema,
  isApproved: z.boolean(),
  createdBy: objectIdSchema.optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// User pagination query schema
export const userPaginationQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().optional(),
  role: objectIdSchema.optional(),
  department: objectIdSchema.optional(),
  isApproved: z.boolean().optional(),
});

// Change password schema
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(6).max(128),
  newPassword: passwordSchema,
});

// Forgot password schema
export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

// Reset password schema
export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  newPassword: passwordSchema,
});

// ============================================================================
// MACHINE SCHEMAS
// ============================================================================

// Machine name validation
const machineNameSchema = z
  .string()
  .min(2, 'Machine name must be at least 2 characters')
  .max(100, 'Machine name cannot exceed 100 characters')
  .regex(
    /^[a-zA-Z0-9\s\-_&().,/]+$/,
    'Machine name can only contain letters, numbers, spaces, and common punctuation'
  )
  .trim();

// Machine create schema
export const machineCreateSchema = z.object({
  name: machineNameSchema,
  category_id: objectIdSchema,
  images: z
    .array(z.string())
    .max(10, 'Cannot upload more than 10 images')
    .optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// Machine update schema
export const machineUpdateSchema = z
  .object({
    name: machineNameSchema.optional(),
    category_id: objectIdSchema.optional(),
    images: z
      .array(z.string())
      .max(10, 'Cannot upload more than 10 images')
      .optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

// Machine approval schema
export const machineApprovalSchema = z.object({
  is_approved: z.boolean(),
});

// Machine pagination query schema
export const machinePaginationQuerySchema = paginationQuerySchema.extend({
  search: z
    .string()
    .min(1, 'Search term must be at least 1 character')
    .max(50, 'Search term cannot exceed 50 characters')
    .trim()
    .optional(),
  category_id: objectIdSchema.optional(),
  is_approved: z.boolean().optional(),
  created_by: objectIdSchema.optional(),
});

// Machine ID parameter schema
export const machineIdParamSchema = z.object({
  id: objectIdSchema,
});

// Validate machine IDs schema
export const validateMachineIdsSchema = z.object({
  machineIds: z
    .array(objectIdSchema)
    .min(1, 'At least one machine ID is required')
    .max(50, 'Cannot validate more than 50 machine IDs at once'),
});

// Machine data schema (for responses)
export const machineDataSchema = z.object({
  _id: objectIdSchema,
  name: z.string(),
  category_id: z.object({
    _id: objectIdSchema,
    name: z.string(),
    description: z.string().optional(),
  }),
  created_by: z.object({
    _id: objectIdSchema,
    username: z.string(),
    email: z.string(),
  }),
  is_approved: z.boolean(),
  images: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().optional(),
});

// ============================================================================
// CATEGORY SCHEMAS
// ============================================================================

// Category name validation
const categoryNameSchema = z
  .string()
  .min(2, 'Category name must be at least 2 characters')
  .max(50, 'Category name cannot exceed 50 characters')
  .regex(
    /^[a-zA-Z0-9\s\-_&()]+$/,
    'Category name can only contain letters, numbers, spaces, hyphens, underscores, ampersands, and parentheses'
  )
  .trim();

// Category create schema
export const categoryCreateSchema = z.object({
  name: categoryNameSchema,
  description: z
    .string()
    .min(5, 'Description must be at least 5 characters')
    .max(200, 'Description cannot exceed 200 characters')
    .trim(),
});

// Category update schema
export const categoryUpdateSchema = z
  .object({
    name: categoryNameSchema.optional(),
    description: z
      .string()
      .min(5, 'Description must be at least 5 characters')
      .max(200, 'Description cannot exceed 200 characters')
      .trim()
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

// Category ID parameter schema
export const categoryIdParamSchema = z.object({
  id: objectIdSchema,
});

// Category pagination query schema
export const categoryPaginationQuerySchema = paginationQuerySchema.extend({
  search: z
    .string()
    .min(1, 'Search term must be at least 1 character')
    .max(50, 'Search term cannot exceed 50 characters')
    .trim()
    .optional(),
});

// Validate category IDs schema
export const validateCategoryIdsSchema = z.object({
  categoryIds: z
    .array(objectIdSchema)
    .min(1, 'At least one category ID is required')
    .max(50, 'Cannot validate more than 50 category IDs at once'),
});

// Category data schema (for responses)
export const categoryDataSchema = z.object({
  _id: objectIdSchema,
  name: z.string(),
  description: z.string(),
  createdBy: z.object({
    _id: objectIdSchema,
    username: z.string(),
    email: z.string(),
  }),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// ============================================================================
// DEPARTMENT & ROLE SCHEMAS
// ============================================================================

// Department create schema
export const departmentCreateSchema = z.object({
  name: z
    .string()
    .min(2, 'Department name must be at least 2 characters')
    .max(30, 'Department name cannot exceed 30 characters')
    .toLowerCase()
    .trim(),
  description: z
    .string()
    .max(100, 'Description cannot exceed 100 characters')
    .trim()
    .optional(),
});

// Department update schema
export const departmentUpdateSchema = z.object({
  name: z
    .string()
    .min(2, 'Department name must be at least 2 characters')
    .max(30, 'Department name cannot exceed 30 characters')
    .toLowerCase()
    .trim()
    .optional(),
  description: z
    .string()
    .max(100, 'Description cannot exceed 100 characters')
    .trim()
    .optional(),
});

// Role create schema
export const roleCreateSchema = z.object({
  name: z
    .string()
    .min(2, 'Role name must be at least 2 characters')
    .max(30, 'Role name cannot exceed 30 characters')
    .toLowerCase()
    .trim(),
  description: z
    .string()
    .max(100, 'Description cannot exceed 100 characters')
    .trim()
    .optional(),
});

// Role update schema
export const roleUpdateSchema = z.object({
  name: z
    .string()
    .min(2, 'Role name must be at least 2 characters')
    .max(30, 'Role name cannot exceed 30 characters')
    .toLowerCase()
    .trim()
    .optional(),
  description: z
    .string()
    .max(100, 'Description cannot exceed 100 characters')
    .trim()
    .optional(),
});

// Department/Role ID parameter schema
export const departmentRoleIdParamSchema = z.object({
  id: objectIdSchema,
});

// ============================================================================
// QA MACHINE SCHEMAS
// ============================================================================

// QA Machine entry create schema
export const qaMachineEntryCreateSchema = z.object({
  machine_id: objectIdSchema,
  report_link: z.string().url('Report link must be a valid URL'),
  files: z
    .array(z.string())
    .max(10, 'Cannot upload more than 10 files')
    .optional(),
});

// QA Machine entry update schema
export const qaMachineEntryUpdateSchema = z
  .object({
    report_link: z.string().url('Report link must be a valid URL').optional(),
    files: z
      .array(z.string())
      .max(10, 'Cannot upload more than 10 files')
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

// QA Machine entry ID parameter schema
export const qaMachineEntryIdParamSchema = z.object({
  id: objectIdSchema,
});

// Machine ID parameter for QA entries
export const qaMachineIdParamSchema = z.object({
  machineId: objectIdSchema,
});

// User ID parameter for QA entries
export const qaUserIdParamSchema = z.object({
  userId: objectIdSchema,
});

// QA Machine pagination query schema
export const qaMachinePaginationQuerySchema = paginationQuerySchema.extend({
  machine_id: objectIdSchema.optional(),
  added_by: objectIdSchema.optional(),
  search: z.string().trim().optional(),
});

// Validate QA entry IDs schema
export const validateQAMachineEntryIdsSchema = z.object({
  qaEntryIds: z
    .array(objectIdSchema)
    .min(1, 'At least one QA entry ID is required')
    .max(100, 'Maximum 100 QA entry IDs allowed'),
});

// QA Machine entry data schema (for responses)
export const qaMachineEntryDataSchema = z.object({
  _id: objectIdSchema,
  machine_id: z.object({
    _id: objectIdSchema,
    name: z.string(),
    category_id: z.object({
      _id: objectIdSchema,
      name: z.string(),
    }),
  }),
  added_by: z.object({
    _id: objectIdSchema,
    username: z.string(),
    email: z.string(),
  }),
  report_link: z.string().url(),
  files: z.array(z.string()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// ============================================================================
// MACHINE APPROVAL SCHEMAS
// ============================================================================

// Approval type enum
export const approvalTypeSchema = z.enum([
  'CREATE',
  'UPDATE',
  'DELETE',
  'APPROVE',
  'REJECT',
]);

// Approval status enum
export const approvalStatusSchema = z.enum([
  'PENDING',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
]);

// Create approval request schema
export const createApprovalRequestSchema = z.object({
  machineId: objectIdSchema,
  approvalType: approvalTypeSchema,
  proposedChanges: z.record(z.string(), z.unknown()),
  originalData: z.record(z.string(), z.unknown()).optional(),
  requestNotes: z.string().optional(),
});

// Approval decision schema
export const approvalDecisionSchema = z.object({
  approvalId: objectIdSchema,
  decision: approvalStatusSchema,
  decisionNotes: z.string().optional(),
});

// Machine approval pagination query schema
export const machineApprovalPaginationQuerySchema = paginationQuerySchema.extend({
  status: approvalStatusSchema.optional(),
  approvalType: approvalTypeSchema.optional(),
  machineId: objectIdSchema.optional(),
  requestedBy: objectIdSchema.optional(),
  search: z.string().trim().optional(),
});

// Machine approval data schema (for responses)
export const machineApprovalDataSchema = z.object({
  _id: objectIdSchema,
  machineId: z.object({
    _id: objectIdSchema,
    name: z.string(),
    category_id: z.object({
      _id: objectIdSchema,
      name: z.string(),
    }),
  }),
  requestedBy: z.object({
    _id: objectIdSchema,
    username: z.string(),
    email: z.string(),
  }),
  approvalType: approvalTypeSchema,
  status: approvalStatusSchema,
  originalData: z.record(z.string(), z.unknown()).optional(),
  proposedChanges: z.record(z.string(), z.unknown()),
  requestNotes: z.string().optional(),
  decisionNotes: z.string().optional(),
  approvedBy: z
    .object({
      _id: objectIdSchema,
      username: z.string(),
      email: z.string(),
    })
    .optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// ============================================================================
// PERMISSION CONFIG SCHEMAS
// ============================================================================

// Action type enum
export const actionTypeSchema = z.enum([
  'CREATE_MACHINE',
  'UPDATE_MACHINE',
  'DELETE_MACHINE',
  'APPROVE_MACHINE',
  'REJECT_MACHINE',
  'VIEW_MACHINE',
  'CREATE_CATEGORY',
  'UPDATE_CATEGORY',
  'DELETE_CATEGORY',
  'VIEW_CATEGORY',
  'CREATE_QA_ENTRY',
  'UPDATE_QA_ENTRY',
  'DELETE_QA_ENTRY',
  'VIEW_QA_ENTRY',
  'MANAGE_USERS',
  'MANAGE_ROLES',
  'MANAGE_DEPARTMENTS',
  'MANAGE_PERMISSIONS',
]);

// Permission level enum
export const permissionLevelSchema = z.enum([
  'ALLOW',
  'DENY',
  'REQUIRES_APPROVAL',
]);

// Create permission config schema
export const createPermissionConfigSchema = z
  .object({
    name: z
      .string()
      .min(3, 'Permission name must be at least 3 characters')
      .max(100, 'Permission name cannot exceed 100 characters')
      .trim(),
    description: z
      .string()
      .min(10, 'Description must be at least 10 characters')
      .max(500, 'Description cannot exceed 500 characters')
      .trim(),
    action: actionTypeSchema,
    roleIds: z.array(objectIdSchema).optional(),
    userIds: z.array(objectIdSchema).optional(),
    departmentIds: z.array(objectIdSchema).optional(),
    categoryIds: z.array(objectIdSchema).optional(),
    permission: permissionLevelSchema,
    approverRoles: z.array(objectIdSchema).optional(),
    maxValue: z.number().positive().optional(),
    priority: z.number().int().min(0).max(1000).default(0),
  })
  .refine(
    (data) => {
      const conditions = ['roleIds', 'userIds', 'departmentIds', 'categoryIds'];
      return conditions.some(
        (condition) =>
          data[condition as keyof typeof data] &&
          Array.isArray(data[condition as keyof typeof data]) &&
          (data[condition as keyof typeof data] as unknown[]).length > 0
      );
    },
    {
      message: 'At least one condition (roleIds, userIds, departmentIds, or categoryIds) must be specified',
    }
  )
  .refine(
    (data) => {
      if (data.permission === 'REQUIRES_APPROVAL') {
        return data.approverRoles && data.approverRoles.length > 0;
      }
      return true;
    },
    {
      message: 'Approver roles are required when permission is REQUIRES_APPROVAL',
    }
  );

// Update permission config schema
export const updatePermissionConfigSchema = z
  .object({
    name: z
      .string()
      .min(3, 'Permission name must be at least 3 characters')
      .max(100, 'Permission name cannot exceed 100 characters')
      .trim()
      .optional(),
    description: z
      .string()
      .min(10, 'Description must be at least 10 characters')
      .max(500, 'Description cannot exceed 500 characters')
      .trim()
      .optional(),
    action: actionTypeSchema.optional(),
    roleIds: z.array(objectIdSchema).optional(),
    userIds: z.array(objectIdSchema).optional(),
    departmentIds: z.array(objectIdSchema).optional(),
    categoryIds: z.array(objectIdSchema).optional(),
    permission: permissionLevelSchema.optional(),
    approverRoles: z.array(objectIdSchema).optional(),
    maxValue: z.number().positive().nullable().optional(),
    priority: z.number().int().min(0).max(1000).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

// Check permission schema
export const checkPermissionSchema = z.object({
  action: actionTypeSchema,
  categoryId: objectIdSchema.optional(),
  machineValue: z.number().positive().optional(),
});

// Permission config ID parameter schema
export const permissionConfigIdParamSchema = z.object({
  id: objectIdSchema,
});

// Action parameter schema
export const actionParamSchema = z.object({
  action: actionTypeSchema,
});

// Permission check query schema
export const permissionCheckQuerySchema = z.object({
  categoryId: objectIdSchema.optional(),
  machineValue: z
    .string()
    .regex(/^\d*\.?\d+$/, 'Machine value must be a valid number')
    .transform((val) => parseFloat(val))
    .refine((val) => val > 0, 'Machine value must be positive')
    .optional(),
});

// Category validation schema
export const categoryValidationSchema = z.object({
  categoryIds: z
    .array(objectIdSchema)
    .min(1, 'At least one category ID is required'),
});

// Permission config data schema (for responses)
export const permissionConfigDataSchema = z.object({
  _id: objectIdSchema,
  name: z.string(),
  description: z.string(),
  action: actionTypeSchema,
  roleIds: z.array(z.object({ _id: objectIdSchema, name: z.string() })).optional(),
  userIds: z.array(z.object({ _id: objectIdSchema, username: z.string() })).optional(),
  departmentIds: z.array(z.object({ _id: objectIdSchema, name: z.string() })).optional(),
  categoryIds: z.array(z.object({ _id: objectIdSchema, name: z.string() })).optional(),
  permission: permissionLevelSchema,
  approverRoles: z.array(z.object({ _id: objectIdSchema, name: z.string() })).optional(),
  maxValue: z.number().positive().nullable().optional(),
  priority: z.number().int(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// ============================================================================
// API RESPONSE SCHEMAS
// ============================================================================

// User API responses
export const userApiResponseSchema = apiResponseSchema(userDataSchema);
export const userListApiResponseSchema = apiResponseSchema(
  z.object({
    items: z.array(userDataSchema),
    meta: paginationResponseSchema,
  })
);

// Machine API responses
export const machineApiResponseSchema = apiResponseSchema(machineDataSchema);
export const machineListApiResponseSchema = apiResponseSchema(
  z.object({
    items: z.array(machineDataSchema),
    meta: paginationResponseSchema,
  })
);

// Category API responses
export const categoryApiResponseSchema = apiResponseSchema(categoryDataSchema);
export const categoryListApiResponseSchema = apiResponseSchema(
  z.object({
    items: z.array(categoryDataSchema),
    meta: paginationResponseSchema,
  })
);

// QA Machine API responses
export const qaMachineApiResponseSchema = apiResponseSchema(qaMachineEntryDataSchema);
export const qaMachineListApiResponseSchema = apiResponseSchema(
  z.object({
    items: z.array(qaMachineEntryDataSchema),
    meta: paginationResponseSchema,
  })
);

// Machine Approval API responses
export const machineApprovalApiResponseSchema = apiResponseSchema(machineApprovalDataSchema);
export const machineApprovalListApiResponseSchema = apiResponseSchema(
  z.object({
    items: z.array(machineApprovalDataSchema),
    meta: paginationResponseSchema,
  })
);

// Permission Config API responses
export const permissionConfigApiResponseSchema = apiResponseSchema(permissionConfigDataSchema);
export const permissionConfigListApiResponseSchema = apiResponseSchema(
  z.object({
    items: z.array(permissionConfigDataSchema),
    meta: paginationResponseSchema,
  })
);

// ============================================================================
// TYPE EXPORTS
// ============================================================================

// User types
export type UserRegistration = z.infer<typeof userRegistrationSchema>;
export type UserLogin = z.infer<typeof userLoginSchema>;
export type UserUpdate = z.infer<typeof userUpdateSchema>;
export type UserData = z.infer<typeof userDataSchema>;
export type UserPaginationQuery = z.infer<typeof userPaginationQuerySchema>;
export type ChangePassword = z.infer<typeof changePasswordSchema>;
export type ForgotPassword = z.infer<typeof forgotPasswordSchema>;
export type ResetPassword = z.infer<typeof resetPasswordSchema>;

// Machine types
export type MachineCreate = z.infer<typeof machineCreateSchema>;
export type MachineUpdate = z.infer<typeof machineUpdateSchema>;
export type MachineApproval = z.infer<typeof machineApprovalSchema>;
export type MachineData = z.infer<typeof machineDataSchema>;
export type MachinePaginationQuery = z.infer<typeof machinePaginationQuerySchema>;
export type MachineIdParam = z.infer<typeof machineIdParamSchema>;
export type ValidateMachineIds = z.infer<typeof validateMachineIdsSchema>;

// Category types
export type CategoryCreate = z.infer<typeof categoryCreateSchema>;
export type CategoryUpdate = z.infer<typeof categoryUpdateSchema>;
export type CategoryData = z.infer<typeof categoryDataSchema>;
export type CategoryPaginationQuery = z.infer<typeof categoryPaginationQuerySchema>;
export type CategoryIdParam = z.infer<typeof categoryIdParamSchema>;
export type ValidateCategoryIds = z.infer<typeof validateCategoryIdsSchema>;

// Department & Role types
export type DepartmentCreate = z.infer<typeof departmentCreateSchema>;
export type DepartmentUpdate = z.infer<typeof departmentUpdateSchema>;
export type RoleCreate = z.infer<typeof roleCreateSchema>;
export type RoleUpdate = z.infer<typeof roleUpdateSchema>;
export type DepartmentRoleIdParam = z.infer<typeof departmentRoleIdParamSchema>;

// QA Machine types
export type QAMachineEntryCreate = z.infer<typeof qaMachineEntryCreateSchema>;
export type QAMachineEntryUpdate = z.infer<typeof qaMachineEntryUpdateSchema>;
export type QAMachineEntryData = z.infer<typeof qaMachineEntryDataSchema>;
export type QAMachinePaginationQuery = z.infer<typeof qaMachinePaginationQuerySchema>;
export type QAMachineEntryIdParam = z.infer<typeof qaMachineEntryIdParamSchema>;
export type QAMachineIdParam = z.infer<typeof qaMachineIdParamSchema>;
export type QAMachineUserIdParam = z.infer<typeof qaUserIdParamSchema>;
export type ValidateQAMachineEntryIds = z.infer<typeof validateQAMachineEntryIdsSchema>;

// Machine Approval types
export type ApprovalType = z.infer<typeof approvalTypeSchema>;
export type ApprovalStatus = z.infer<typeof approvalStatusSchema>;
export type CreateApprovalRequest = z.infer<typeof createApprovalRequestSchema>;
export type ApprovalDecision = z.infer<typeof approvalDecisionSchema>;
export type MachineApprovalData = z.infer<typeof machineApprovalDataSchema>;
export type MachineApprovalPaginationQuery = z.infer<typeof machineApprovalPaginationQuerySchema>;

// Permission Config types
export type ActionType = z.infer<typeof actionTypeSchema>;
export type PermissionLevel = z.infer<typeof permissionLevelSchema>;
export type CreatePermissionConfig = z.infer<typeof createPermissionConfigSchema>;
export type UpdatePermissionConfig = z.infer<typeof updatePermissionConfigSchema>;
export type CheckPermission = z.infer<typeof checkPermissionSchema>;
export type PermissionConfigData = z.infer<typeof permissionConfigDataSchema>;
export type PermissionConfigIdParam = z.infer<typeof permissionConfigIdParamSchema>;
export type ActionParam = z.infer<typeof actionParamSchema>;
export type PermissionCheckQuery = z.infer<typeof permissionCheckQuerySchema>;
export type CategoryValidation = z.infer<typeof categoryValidationSchema>;

// API Response types
export type UserApiResponse = z.infer<typeof userApiResponseSchema>;
export type UserListApiResponse = z.infer<typeof userListApiResponseSchema>;
export type MachineApiResponse = z.infer<typeof machineApiResponseSchema>;
export type MachineListApiResponse = z.infer<typeof machineListApiResponseSchema>;
export type CategoryApiResponse = z.infer<typeof categoryApiResponseSchema>;
export type CategoryListApiResponse = z.infer<typeof categoryListApiResponseSchema>;
export type QAMachineApiResponse = z.infer<typeof qaMachineApiResponseSchema>;
export type QAMachineListApiResponse = z.infer<typeof qaMachineListApiResponseSchema>;
export type MachineApprovalApiResponse = z.infer<typeof machineApprovalApiResponseSchema>;
export type MachineApprovalListApiResponse = z.infer<typeof machineApprovalListApiResponseSchema>;
export type PermissionConfigApiResponse = z.infer<typeof permissionConfigApiResponseSchema>;
export type PermissionConfigListApiResponse = z.infer<typeof permissionConfigListApiResponseSchema>;
