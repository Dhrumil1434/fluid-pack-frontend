# VINAISM Frontend - Interceptor-Based Architecture

This Angular frontend implements a sophisticated interceptor-based architecture that perfectly mirrors your backend's validation, error handling, and response structure patterns.

## 🏗️ Architecture Overview

The frontend uses **HTTP Interceptors** to automatically handle:

- **Request Validation**: Zod schema validation before API calls
- **Response Validation**: Zod schema validation of backend responses
- **Authentication**: Automatic token management and refresh
- **Error Handling**: Consistent error transformation and handling
- **Type Safety**: Full TypeScript support with Zod inference

## 🚀 How It Works

### 1. **Request Flow**

```
User Input → Zod Validation → Form Errors → API Call → Backend
```

### 2. **Response Flow**

```
Backend → Response Validation → Success/Error Handling → UI Update
```

### 3. **Interceptor Chain**

```
Request Interceptor → Backend → Response Interceptor → Frontend
```

## 📁 Project Structure

```
src/
├── app/
│   ├── core/                           # Core services & utilities
│   │   ├── constants/                  # API endpoints, validation messages
│   │   ├── interceptors/               # HTTP interceptors
│   │   ├── models/                     # Core data models
│   │   ├── services/                   # Base services
│   │   └── utils/                      # Utility functions
│   ├── modules/                        # Feature modules
│   │   └── auth/                       # Authentication module
│   └── shared/                         # Shared components
├── assets/
│   └── schemas/                        # Zod schemas (shared with backend)
```

## 🔧 Key Components

### **Interceptors**

#### **Request Interceptor** (`request.interceptor.ts`)

- Automatically adds auth tokens to requests
- Validates request body with Zod schemas
- Prevents invalid requests from reaching backend

#### **Response Interceptor** (`response.interceptor.ts`)

- Validates backend responses with Zod schemas
- Transforms errors to consistent frontend format
- Handles HTTP status codes automatically

#### **Auth Interceptor** (`auth.interceptor.ts`)

- Manages token refresh on 401 errors
- Prevents infinite loops on auth endpoints
- Automatically retries failed requests with new tokens

### **Services**

#### **Validation Service** (`validation.service.ts`)

- Core Zod validation logic
- Form error transformation
- Field-level error handling

#### **Auth Service** (`auth.service.ts`)

- User authentication management
- Token storage and refresh
- User state management

#### **Base API Service** (`base-api.service.ts`)

- Common HTTP methods
- Pagination support
- Request/response transformation

## 📝 Usage Examples

### **1. Making an API Call**

```typescript
// Your service becomes very clean!
@Injectable()
export class UserService {
  constructor(private baseApiService: BaseApiService) {}

  login(loginData: UserLoginDto): Observable<LoginApiResponse> {
    // Interceptors handle everything automatically!
    return this.baseApiService.post<LoginResponse>('/api/userLogin', loginData);
  }
}
```

### **2. Form Validation**

```typescript
// Real-time validation with Zod
this.loginForm.valueChanges.subscribe(formValue => {
  const result = this.validationService.validate(formValue, userLoginSchemaDto);

  if (!result.success) {
    // Show field-specific errors
    result.errors.forEach(error => {
      const fieldName = error.path[0] as string;
      const control = this.loginForm.get(fieldName);
      if (control) {
        control.setErrors({ zod: { message: error.message } });
      }
    });
  }
});
```

### **3. Type Safety**

```typescript
// Zod schemas automatically generate TypeScript types
export type UserLoginDto = z.infer<typeof userLoginSchemaDto>;
export type LoginApiResponse = z.infer<typeof loginApiResponseSchema>;

// Full type safety in your components
login(loginData: UserLoginDto): Observable<LoginApiResponse> {
  // TypeScript knows exactly what this returns!
  return this.authService.login(loginData);
}
```

## 🎯 Benefits

### **For Developers**

- ✅ **Zero Boilerplate**: No manual validation or error handling
- ✅ **Type Safety**: Full TypeScript support with Zod inference
- ✅ **Consistent Behavior**: Same patterns across all APIs
- ✅ **Easy Testing**: Mock interceptors for isolated testing

### **For Users**

- ✅ **Immediate Feedback**: Validation errors shown before API calls
- ✅ **Consistent UX**: Same error format across all forms
- ✅ **Better Performance**: No unnecessary API calls for invalid data
- ✅ **Automatic Recovery**: Token refresh, error handling, etc.

## 🚀 Getting Started

### **1. Install Dependencies**

```bash
npm install
```

### **2. Run Development Server**

```bash
npm start
```

### **3. Navigate to Login Demo**

Open `http://localhost:4200/auth/login` to see the interceptor system in action.

## 🔄 Adding New APIs

### **1. Create Zod Schema**

```typescript
// assets/schemas/user.schema.ts
export const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().positive(),
});
```

### **2. Add to Interceptor Mapping**

```typescript
// core/interceptors/request.interceptor.ts
private getSchemaForEndpoint(url: string): any | null {
  const schemaMap: Record<string, any> = {
    '/api/users': createUserSchema,
    // ... other mappings
  };
  return schemaMap[url] || null;
}
```

### **3. Use in Service**

```typescript
createUser(userData: CreateUserDto): Observable<ApiResponse<User>> {
  // Interceptors handle validation automatically!
  return this.baseApiService.post<User>('/api/users', userData);
}
```

## 🧪 Testing

### **Unit Testing Services**

```typescript
describe('AuthService', () => {
  it('should validate login data before API call', () => {
    const invalidData = { email: 'invalid-email' };
    const result = service.login(invalidData);

    // Should fail validation before reaching backend
    expect(result).toBeDefined();
  });
});
```

### **Testing Interceptors**

```typescript
describe('RequestInterceptor', () => {
  it('should add auth token to requests', () => {
    // Test interceptor behavior
  });
});
```

## 🔧 Configuration

### **Environment Variables**

```typescript
// environments/environment.ts
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:3000',
  // Add your configuration here
};
```

### **Interceptor Order**

```typescript
// app.config.ts
provideHttpClient(
  withInterceptors([
    requestInterceptor, // Runs first
    responseInterceptor, // Runs second
    authInterceptor, // Runs last
  ])
);
```

## 📚 API Reference

### **Validation Service Methods**

- `validate<T>(data, schema): ValidationResult`
- `validateOrThrow<T>(data, schema): T`
- `getFieldError(errors, fieldPath): string | null`
- `transformToFormErrors(errors): Record<string, string>`

### **Base API Service Methods**

- `get<T>(url, params?): Observable<ApiResponse<T>>`
- `post<T>(url, body): Observable<ApiResponse<T>>`
- `put<T>(url, body): Observable<ApiResponse<T>>`
- `delete<T>(url): Observable<ApiResponse<T>>`
- `getPaginated<T>(url, pagination, filters?): Observable<PaginatedApiResponse<T>>`

## 🐛 Troubleshooting

### **Common Issues**

1. **Circular Dependency Errors**
   - Use dynamic imports in interceptors
   - Keep schemas in assets folder

2. **Validation Not Working**
   - Check schema mapping in interceptors
   - Ensure Zod schemas are properly exported

3. **Type Errors**
   - Use `z.infer<typeof schema>` for type generation
   - Import types from schema files

## 🤝 Contributing

1. Follow the established architecture patterns
2. Add Zod schemas for new APIs
3. Update interceptor mappings
4. Write tests for new functionality
5. Update documentation

## 📄 License

This project follows the same license as your backend.

---

**Built with ❤️ using Angular best practices and Zod validation**
