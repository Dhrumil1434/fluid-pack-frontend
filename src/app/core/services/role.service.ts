import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_ENDPOINTS } from '../constants/api.constants';

export interface RoleDetails {
  _id: string;
  name: string;
  description?: string;
  permissions?: string[];
}

export interface RoleResponse {
  success: boolean;
  data: RoleDetails;
  message?: string;
}

export interface RolesListResponse {
  success: boolean;
  data: RoleDetails[];
  message?: string;
}

@Injectable({
  providedIn: 'root',
})
export class RoleService {
  private readonly baseUrl = 'http://localhost:5000/api';

  constructor(private http: HttpClient) {}

  /**
   * Get role details by ID from the roles list
   */
  getRoleById(roleId: string): Observable<RoleResponse> {
    return this.getAllRoles().pipe(
      map(response => {
        if (response.success && response.data) {
          const role = response.data.find(r => r._id === roleId);
          if (role) {
            return {
              success: true,
              data: role,
              message: 'Role found',
            };
          } else {
            return {
              success: false,
              data: {} as RoleDetails,
              message: 'Role not found',
            };
          }
        }
        return {
          success: false,
          data: {} as RoleDetails,
          message: 'Failed to fetch roles',
        };
      })
    );
  }

  /**
   * Get all roles
   */
  getAllRoles(): Observable<RolesListResponse> {
    return this.http.get<RolesListResponse>(API_ENDPOINTS.ROLES);
  }

  /**
   * Check if a role ID corresponds to an admin role
   */
  isAdminRole(roleId: string): Observable<boolean> {
    return this.getRoleById(roleId).pipe(
      map(response => {
        if (response.success && response.data) {
          const roleName = response.data.name.toLowerCase();
          return roleName === 'admin' || roleName === 'manager';
        }
        return false;
      })
    );
  }
}
