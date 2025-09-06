import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApiService } from './base-api.service';
import { API_ENDPOINTS } from '../constants/api.constants';

export interface Department {
  _id: string;
  name: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Role {
  _id: string;
  name: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root',
})
export class DepartmentRoleService {
  constructor(private baseApiService: BaseApiService) {}

  /**
   * Get all departments
   */
  getDepartments(): Observable<{ statusCode: number; data: Department[]; message: string; success: boolean }> {
    return this.baseApiService.get(API_ENDPOINTS.DEPARTMENTS);
  }

  /**
   * Get all roles
   */
  getRoles(): Observable<{ statusCode: number; data: Role[]; message: string; success: boolean }> {
    return this.baseApiService.get(API_ENDPOINTS.ROLES);
  }

  /**
   * Get department by ID
   */
  getDepartmentById(id: string): Observable<{ statusCode: number; data: Department; message: string; success: boolean }> {
    return this.baseApiService.get(API_ENDPOINTS.DEPARTMENT_BY_ID.replace(':id', id));
  }

  /**
   * Get role by ID
   */
  getRoleById(id: string): Observable<{ statusCode: number; data: Role; message: string; success: boolean }> {
    return this.baseApiService.get(API_ENDPOINTS.ROLE_BY_ID.replace(':id', id));
  }
}
