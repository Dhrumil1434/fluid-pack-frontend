import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { STORAGE_KEYS } from '../constants/app.constants';

export interface UserData {
  _id: string;
  username: string;
  email: string;
  department: {
    _id: string;
    name: string;
    description?: string;
  };
  role: {
    _id: string;
    name: string;
    description?: string;
  };
  isApproved: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<UserData | null>(null);
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);

  public currentUser$ = this.currentUserSubject.asObservable();
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor() {
    this.initializeAuth();

    // Set up periodic token validation (every 5 minutes)
    if (typeof window !== 'undefined') {
      setInterval(
        () => {
          this.validateStoredTokens();
        },
        5 * 60 * 1000
      ); // 5 minutes
    }
  }

  /**
   * Initialize authentication state from storage
   */
  private initializeAuth(): void {
    const userData = this.getUserFromStorage();
    const accessToken = this.getAccessToken();

    if (userData && accessToken) {
      this.currentUserSubject.next(userData);
      this.isAuthenticatedSubject.next(true);
    }
  }

  /**
   * Get current user data
   */
  getCurrentUser(): UserData | null {
    return this.currentUserSubject.value;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  /**
   * Set authentication data after successful login
   */
  public setAuthData(userData: UserData, tokens: AuthTokens): void {
    // Store in memory
    this.currentUserSubject.next(userData);
    this.isAuthenticatedSubject.next(true);

    // Store in storage
    this.setUserInStorage(userData);
    this.setTokensInStorage(tokens);

    // Verify storage was successful
    this.verifyTokenStorage();
  }

  /**
   * Clear authentication data on logout
   */
  clearAuthData(): void {
    // Clear from memory
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);

    // Clear from storage
    this.clearUserFromStorage();
    this.clearTokensFromStorage();
  }

  /**
   * Logout user
   */
  logout(): void {
    this.clearAuthData();
  }

  /**
   * Get access token for API calls
   */
  getAccessToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  }

  /**
   * Get refresh token
   */
  getRefreshToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  }

  /**
   * Update access token (e.g., after refresh)
   */
  updateAccessToken(accessToken: string): void {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
  }

  /**
   * Handle token expiration
   */
  handleTokenExpired(): void {
    // Clear auth data and redirect to login
    this.clearAuthData();
    // Note: Router navigation will be handled by interceptor
  }

  /**
   * Check if token is about to expire
   */
  isTokenExpiringSoon(): boolean {
    const token = this.getAccessToken();
    if (!token) return true;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiryTime = payload.exp * 1000; // Convert to milliseconds
      const currentTime = Date.now();
      const timeUntilExpiry = expiryTime - currentTime;

      // Return true if token expires in less than 5 minutes
      return timeUntilExpiry < 5 * 60 * 1000;
    } catch {
      return true;
    }
  }

  /**
   * Get token expiration info
   */
  getTokenExpiryInfo(): {
    isExpired: boolean;
    timeUntilExpiry: number;
    expiryDate: Date | null;
  } {
    const token = this.getAccessToken();
    if (!token) {
      return { isExpired: true, timeUntilExpiry: 0, expiryDate: null };
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiryTime = payload.exp * 1000; // Convert to milliseconds
      const currentTime = Date.now();
      const timeUntilExpiry = expiryTime - currentTime;
      const expiryDate = new Date(expiryTime);

      return {
        isExpired: currentTime >= expiryTime,
        timeUntilExpiry: Math.max(0, timeUntilExpiry),
        expiryDate,
      };
    } catch {
      return { isExpired: true, timeUntilExpiry: 0, expiryDate: null };
    }
  }

  /**
   * Verify tokens are properly stored
   */
  verifyTokenStorage(): boolean {
    const accessToken = this.getAccessToken();
    const refreshToken = this.getRefreshToken();

    const isValid = !!(accessToken && refreshToken);

    if (!isValid) {
      console.error('❌ Token storage verification failed');
      console.error('   Access token:', accessToken ? 'Present' : 'Missing');
      console.error('   Refresh token:', refreshToken ? 'Present' : 'Missing');
    }

    return isValid;
  }

  /**
   * Validate stored tokens and clean up if expired
   */
  private validateStoredTokens(): void {
    const accessToken = this.getAccessToken();

    if (!accessToken) {
      return; // No token to validate
    }

    try {
      const payload = JSON.parse(atob(accessToken.split('.')[1]));
      const expiryTime = payload.exp * 1000; // Convert to milliseconds
      const currentTime = Date.now();

      if (currentTime >= expiryTime) {
        console.error('❌ Stored access token has expired, clearing auth data');
        this.clearAuthData();
      }
    } catch (error) {
      console.error('❌ Error validating stored token:', error);
      // If we can't parse the token, it's invalid - clear it
      this.clearAuthData();
    }
  }

  // Private storage methods
  private setUserInStorage(userData: UserData): void {
    localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
  }

  private getUserFromStorage(): UserData | null {
    const userData = localStorage.getItem(STORAGE_KEYS.USER_DATA);
    return userData ? JSON.parse(userData) : null;
  }

  private clearUserFromStorage(): void {
    localStorage.removeItem(STORAGE_KEYS.USER_DATA);
  }

  private setTokensInStorage(tokens: AuthTokens): void {
    // Validate tokens before storing
    if (!tokens.accessToken || typeof tokens.accessToken !== 'string') {
      console.error('❌ Invalid access token:', tokens.accessToken);
      throw new Error('Invalid access token');
    }

    if (!tokens.refreshToken || typeof tokens.refreshToken !== 'string') {
      console.error('❌ Invalid refresh token:', tokens.refreshToken);
      throw new Error('Invalid refresh token');
    }

    // Store tokens securely
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken);
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
  }

  private clearTokensFromStorage(): void {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  }
}
