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
    // Only validate, don't clear unless actually expired
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
   * Validates token expiry before setting authenticated state
   */
  private initializeAuth(): void {
    const userData = this.getUserFromStorage();
    const accessToken = this.getAccessToken();

    // If both are missing, ensure clean state
    if (!userData && !accessToken) {
      this.clearAuthData();
      return;
    }

    // If we have a token but no user data, or vice versa, something is wrong
    // But don't clear if we have at least one - might be in the middle of login
    if ((!userData && accessToken) || (userData && !accessToken)) {
      console.warn("⚠️ Auth data mismatch: token and user data don't match");
      // Don't clear - let the guard handle validation
    }

    // If we have both, validate token expiry
    if (userData && accessToken) {
      const tokenInfo = this.getTokenExpiryInfo();

      if (tokenInfo.isExpired) {
        console.log('❌ Stored token has expired, clearing auth data');
        this.clearAuthData();
        return;
      }

      // Token is valid, set authenticated state
      this.currentUserSubject.next(userData);
      this.isAuthenticatedSubject.next(true);
      console.log('✅ Authentication initialized from storage');
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
   * Restore authentication state from storage
   * Used when page is reloaded and auth state needs to be restored
   */
  restoreAuthFromStorage(): boolean {
    const userData = this.getUserFromStorage();
    const accessToken = this.getAccessToken();

    if (!userData || !accessToken) {
      return false;
    }

    // Validate token expiry
    const tokenInfo = this.getTokenExpiryInfo();

    if (tokenInfo.isExpired) {
      this.clearAuthData();
      return false;
    }

    // Token is valid, restore state
    this.currentUserSubject.next(userData);
    this.isAuthenticatedSubject.next(true);
    return true;
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
   * Also restores authentication state if token is valid but state is missing
   */
  private validateStoredTokens(): void {
    const accessToken = this.getAccessToken();
    const userData = this.getUserFromStorage();

    if (!accessToken) {
      // No token, but if user data exists, clear it
      if (userData) {
        this.clearAuthData();
      }
      return;
    }

    try {
      const payload = JSON.parse(atob(accessToken.split('.')[1]));
      const expiryTime = payload.exp * 1000; // Convert to milliseconds
      const currentTime = Date.now();

      if (currentTime >= expiryTime) {
        console.log('❌ Stored access token has expired, clearing auth data');
        this.clearAuthData();
      } else {
        // Token is still valid
        // If we have user data but auth state is not set, restore it
        if (userData && !this.isAuthenticated()) {
          this.currentUserSubject.next(userData);
          this.isAuthenticatedSubject.next(true);
          console.log('✅ Restored authentication state from valid token');
        }
      }
    } catch (error) {
      console.error('❌ Error validating stored token:', error);
      // Don't clear on parsing errors - might be a temporary issue
      // Only clear if we're certain the token format is wrong
      // The guard will handle validation on route access
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
