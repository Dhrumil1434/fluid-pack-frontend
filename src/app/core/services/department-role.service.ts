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
  getDepartments(): Observable<{
    statusCode: number;
    data: Department[];
    message: string;
    success: boolean;
  }> {
    return this.baseApiService.get(API_ENDPOINTS.DEPARTMENTS);
  }

  /**
   * Get all roles
   */
  getRoles(): Observable<{
    statusCode: number;
    data: Role[];
    message: string;
    success: boolean;
  }> {
    return this.baseApiService.get(API_ENDPOINTS.ROLES);
  }

  createRole(payload: {
    name: string;
    description?: string;
  }): Observable<{
    statusCode: number;
    data: Role;
    message: string;
    success: boolean;
  }> {
    return this.baseApiService.post(API_ENDPOINTS.ROLE_CREATE, payload);
  }

  updateRole(
    id: string,
    payload: { name: string; description?: string }
  ): Observable<{
    statusCode: number;
    data: Role;
    message: string;
    success: boolean;
  }> {
    return this.baseApiService.put(
      API_ENDPOINTS.ROLE_BY_ID.replace(':id', id),
      payload
    );
  }

  deleteRole(
    id: string
  ): Observable<{
    statusCode: number;
    data: Role;
    message: string;
    success: boolean;
  }> {
    return this.baseApiService.delete(
      API_ENDPOINTS.ROLE_BY_ID.replace(':id', id)
    );
  }

  /**
   * Get department by ID
   */
  getDepartmentById(
    id: string
  ): Observable<{
    statusCode: number;
    data: Department;
    message: string;
    success: boolean;
  }> {
    return this.baseApiService.get(
      API_ENDPOINTS.DEPARTMENT_BY_ID.replace(':id', id)
    );
  }

  /**
   * Get role by ID
   */
  getRoleById(
    id: string
  ): Observable<{
    statusCode: number;
    data: Role;
    message: string;
    success: boolean;
  }> {
    return this.baseApiService.get(API_ENDPOINTS.ROLE_BY_ID.replace(':id', id));
  }
}
