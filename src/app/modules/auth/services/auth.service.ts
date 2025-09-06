import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import {
  loginApiResponseSchema,
  LoginResponse,
  UserLoginDto,
  userLoginSchemaDto,
} from '../../../../assets/schemas/auth.schema';
import {
  userRegistrationSchema,
  UserRegistration,
} from '../../../../assets/schemas/fluid-pack.schema';
import { API_ENDPOINTS } from '../../../core/constants/api.constants';
import {
  AuthTokens,
  AuthService as CoreAuthService,
  UserData,
} from '../../../core/services/auth.service';
import { BaseApiService } from '../../../core/services/base-api.service';
import { ValidationService } from '../../../core/services/validation.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  constructor(
    private baseApiService: BaseApiService,
    private coreAuthService: CoreAuthService,
    private validationService: ValidationService
  ) {}

  /**
   * User login - interceptors handle everything automatically!
   */
  login(loginData: UserLoginDto): Observable<any> {
    // 1. Final validation before API call (interceptor will also validate)
    const validationResult = this.validationService.validate(
      loginData,
      userLoginSchemaDto
    );

    if (!validationResult.success) {
      return throwError(() => new Error('Validation failed'));
    }

    // 2. Make API call - interceptors handle the rest!
    return this.baseApiService
      .post<LoginResponse>(API_ENDPOINTS.LOGIN, loginData)
      .pipe(
        // 3. Validate response (interceptor will also validate)
        tap(response => {
          const responseValidation = this.validationService.validate(
            response,
            loginApiResponseSchema
          );
          if (!responseValidation.success) {
            console.error(
              'Response validation failed:',
              responseValidation.errors
            );
          }
        }),

        // 4. Handle successful login
        tap((response: any) => {
          // The response is the raw login data directly (not wrapped in ApiResponse)
          if (response.user && response.accessToken && response.refreshToken) {
            this.handleLoginSuccess(response);
          }
        }),

        // 5. Handle errors
        catchError(error => {
          this.handleLoginError(error);
          return throwError(() => error);
        })
      );
  }

  /**
   * User registration
   */
  register(registrationData: UserRegistration): Observable<any> {
    // 1. Final validation before API call (interceptor will also validate)
    const validationResult = this.validationService.validate(
      registrationData,
      userRegistrationSchema
    );

    if (!validationResult.success) {
      return throwError(() => new Error('Validation failed'));
    }

    // 2. Make API call - interceptors handle the rest!
    return this.baseApiService
      .post<any>(API_ENDPOINTS.REGISTER, registrationData)
      .pipe(
        // 3. Handle successful registration
        tap((response: any) => {
          console.log('Registration successful:', response);
        }),

        // 4. Handle errors
        catchError(error => {
          this.handleRegistrationError(error);
          return throwError(() => error);
        })
      );
  }

  /**
   * User logout
   */
  logout(): Observable<any> {
    return this.baseApiService.post(API_ENDPOINTS.LOGOUT, {}).pipe(
      tap(() => {
        this.coreAuthService.clearAuthData();
      }),
      catchError(error => {
        // Even if logout fails, clear local auth data
        this.coreAuthService.clearAuthData();
        return throwError(() => error);
      })
    );
  }

  /**
   * Refresh access token
   */
  refreshToken(): Observable<any> {
    const refreshToken = this.coreAuthService.getRefreshToken();

    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }

    return this.baseApiService
      .post<any>(API_ENDPOINTS.REFRESH_TOKEN, { refreshToken })
      .pipe(
        tap(response => {
          if (response.success && response.data) {
            this.coreAuthService.updateAccessToken(response.data.accessToken);
          }
        })
      );
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.coreAuthService.isAuthenticated();
  }

  /**
   * Get current user data
   */
  getCurrentUser(): UserData | null {
    return this.coreAuthService.getCurrentUser();
  }

  /**
   * Get current user as observable
   */
  getCurrentUser$(): Observable<UserData | null> {
    return this.coreAuthService.currentUser$;
  }

  /**
   * Check if token is expiring soon
   */
  isTokenExpiringSoon(): boolean {
    return this.coreAuthService.isTokenExpiringSoon();
  }

  // Private methods
  private handleLoginSuccess(loginData: LoginResponse): void {
    // Create a user data structure that matches what backend actually returns
    const userData: UserData = {
      _id: loginData.user._id,
      username: loginData.user.username,
      email: loginData.user.email,
      // Backend returns role as ObjectId string, not populated object
      department: {
        _id: 'unknown', // Will be populated when needed
        name: 'Loading...',
        description: 'Department details will be loaded when needed',
      },
      role: {
        _id: loginData.user.role, // This is the ObjectId from backend
        name: 'Loading...', // Will be populated when needed
        description: 'Role details will be loaded when needed',
      },
      isApproved: true, // If user can login, they are approved
      createdBy: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const tokens: AuthTokens = {
      accessToken: loginData.accessToken,
      refreshToken: loginData.refreshToken,
    };

    this.coreAuthService.setAuthData(userData, tokens);
  }

  private handleLoginError(_error: any): void {
    // Clear any existing auth data on error
    this.coreAuthService.clearAuthData();

    // You can add additional error handling here
    // e.g., show toast messages, track analytics, etc.
  }

  private handleRegistrationError(_error: any): void {
    // You can add additional error handling here
    // e.g., show toast messages, track analytics, etc.
  }
}
