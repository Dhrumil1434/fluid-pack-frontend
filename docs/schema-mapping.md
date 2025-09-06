# Fluid Pack Frontend Schema Mapping

## Overview
This document maps all the Zod schemas created for the Fluid Pack frontend to match the backend Joi validations. The schemas are organized by module and provide comprehensive type safety for all API interactions.

## Schema Files Structure

```
src/assets/schemas/
├── index.ts                 # Main export file
├── auth.schema.ts          # Authentication schemas
├── common.schema.ts        # Common utility schemas
├── user.schema.ts          # User management schemas (legacy)
└── fluid-pack.schema.ts    # Comprehensive Fluid Pack schemas
```

## Backend API Mapping

### 1. User Management (`/api/user`)
- **POST /register** → `userRegistrationSchema`
- **POST /login** → `userLoginSchema`
- **POST /logout** → No body validation needed
- **POST /refresh** → `refreshTokenSchema`
- **GET /** → `userPaginationQuerySchema`
- **GET /:id** → `userIdParamSchema`
- **PUT /:id** → `userUpdateSchema`
- **PATCH /:id/approve** → `userIdParamSchema`
- **POST /change-password** → `changePasswordSchema`
- **POST /forgot-password** → `forgotPasswordSchema`
- **POST /reset-password** → `resetPasswordSchema`

### 2. Machine Management (`/api/machines`)
- **POST /** → `machineCreateSchema`
- **GET /** → `machinePaginationQuerySchema`
- **GET /:id** → `machineIdParamSchema`
- **PUT /:id** → `machineUpdateSchema`
- **DELETE /:id** → `machineIdParamSchema`
- **GET /approved** → No query validation needed
- **PATCH /:id/approval** → `machineApprovalSchema`
- **GET /category/:id** → `categoryIdParamSchema`
- **POST /validate-ids** → `validateMachineIdsSchema`

### 3. Category Management (`/api/admin/category`)
- **POST /** → `categoryCreateSchema`
- **GET /** → `categoryPaginationQuerySchema`
- **GET /:id** → `categoryIdParamSchema`
- **PUT /:id** → `categoryUpdateSchema`
- **DELETE /:id** → `categoryIdParamSchema`
- **POST /validate-ids** → `validateCategoryIdsSchema`

### 4. Department & Role Management (`/api/admin`)
- **POST /departments** → `departmentCreateSchema`
- **GET /departments** → `paginationQuerySchema`
- **GET /departments/:id** → `departmentRoleIdParamSchema`
- **PUT /departments/:id** → `departmentUpdateSchema`
- **DELETE /departments/:id** → `departmentRoleIdParamSchema`
- **POST /roles** → `roleCreateSchema`
- **GET /roles** → `paginationQuerySchema`
- **GET /roles/:id** → `departmentRoleIdParamSchema`
- **PUT /roles/:id** → `roleUpdateSchema`
- **DELETE /roles/:id** → `departmentRoleIdParamSchema`

### 5. QA Machine Management (`/api/qa-machines`)
- **POST /** → `qaMachineEntryCreateSchema`
- **GET /** → `qaMachinePaginationQuerySchema`
- **GET /:id** → `qaMachineEntryIdParamSchema`
- **PUT /:id** → `qaMachineEntryUpdateSchema`
- **DELETE /:id** → `qaMachineEntryIdParamSchema`
- **GET /machine/:machineId** → `qaMachineIdParamSchema`
- **GET /user/:userId** → `qaUserIdParamSchema`
- **POST /validate-ids** → `validateQAMachineEntryIdsSchema`

### 6. Machine Approval Management (`/api/machine-approvals`)
- **POST /** → `createApprovalRequestSchema`
- **GET /** → `machineApprovalPaginationQuerySchema`
- **GET /:id** → `machineApprovalIdParamSchema`
- **PATCH /:id/approve** → `approvalDecisionSchema`
- **PATCH /:id/reject** → `approvalDecisionSchema`
- **DELETE /:id** → `machineApprovalIdParamSchema`

### 7. Permission Configuration (`/api/permission`)
- **POST /** → `createPermissionConfigSchema`
- **GET /** → `paginationQuerySchema`
- **GET /:id** → `permissionConfigIdParamSchema`
- **PUT /:id** → `updatePermissionConfigSchema`
- **DELETE /:id** → `permissionConfigIdParamSchema`
- **POST /check** → `checkPermissionSchema`
- **GET /check/:action** → `permissionCheckQuerySchema`
- **POST /validate-categories** → `categoryValidationSchema`

## Key Features

### 1. Comprehensive Validation
- **ObjectId Validation**: All MongoDB ObjectIds are validated with regex pattern
- **Password Complexity**: Enforces uppercase, lowercase, and digit requirements
- **Email Validation**: Proper email format validation with trimming
- **String Length Limits**: Matches backend constraints exactly
- **Array Limits**: Prevents excessive data with max length constraints

### 2. Type Safety
- **Full TypeScript Support**: All schemas export TypeScript types
- **API Response Types**: Complete response type definitions
- **Pagination Support**: Standardized pagination query and response types
- **Error Handling**: Comprehensive error message mapping

### 3. Backend Compatibility
- **Joi to Zod Mapping**: Direct translation of all Joi validations
- **Error Messages**: Matches backend error messages exactly
- **Validation Rules**: Identical validation logic and constraints
- **API Structure**: Perfect alignment with backend API structure

## Usage Examples

### Basic Form Validation
```typescript
import { userRegistrationSchema, UserRegistration } from '@/assets/schemas';

// Validate form data
const result = userRegistrationSchema.safeParse(formData);
if (result.success) {
  const userData: UserRegistration = result.data;
  // Use validated data
} else {
  // Handle validation errors
  console.error(result.error.issues);
}
```

### API Request Validation
```typescript
import { machineCreateSchema, MachineCreate } from '@/assets/schemas';

// Validate before API call
const createMachine = async (data: MachineCreate) => {
  const validatedData = machineCreateSchema.parse(data);
  return await machineService.create(validatedData);
};
```

### API Response Validation
```typescript
import { machineListApiResponseSchema, MachineListApiResponse } from '@/assets/schemas';

// Validate API response
const response = await fetch('/api/machines');
const data = await response.json();
const validatedResponse = machineListApiResponseSchema.parse(data);
```

## Schema Categories

### 1. Request Schemas
- **Create Schemas**: For POST requests
- **Update Schemas**: For PUT/PATCH requests
- **Query Schemas**: For GET request parameters
- **Param Schemas**: For URL parameters

### 2. Response Schemas
- **Data Schemas**: For individual entity responses
- **List Schemas**: For paginated list responses
- **API Response Schemas**: For complete API responses

### 3. Utility Schemas
- **Pagination**: Standard pagination query and response
- **Validation**: For bulk ID validation endpoints
- **Enums**: For status and type enumerations

## Error Handling

All schemas provide detailed error messages that match the backend exactly:

```typescript
// Example error handling
try {
  const data = machineCreateSchema.parse(formData);
} catch (error) {
  if (error instanceof z.ZodError) {
    error.issues.forEach(issue => {
      console.error(`${issue.path.join('.')}: ${issue.message}`);
    });
  }
}
```

## Migration Notes

1. **Replace Existing Schemas**: Update imports to use `fluid-pack.schema.ts`
2. **Update Type Imports**: Use the new comprehensive type exports
3. **Form Validation**: Update form validators to use new schemas
4. **API Services**: Update service methods to use new types
5. **Error Handling**: Update error handling to use new error messages

## Benefits

1. **Type Safety**: Complete type safety across the entire application
2. **Validation Consistency**: Identical validation rules between frontend and backend
3. **Developer Experience**: Clear error messages and IntelliSense support
4. **Maintainability**: Single source of truth for all API schemas
5. **Performance**: Efficient validation with Zod's optimized parsing
6. **Scalability**: Easy to add new schemas as the API grows

This comprehensive schema system ensures that your frontend is perfectly aligned with your backend API, providing robust validation, type safety, and an excellent developer experience.
