import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models';
import { PaginationParams } from '../models/pagination.model';

@Injectable({
  providedIn: 'root',
})
export class BaseApiService {
  constructor(private http: HttpClient) {}

  /**
   * GET request
   */
  get<T>(
    url: string,
    params?: HttpParams | Record<string, any>
  ): Observable<ApiResponse<T>> {
    const httpParams = this.buildHttpParams(params);
    const fullUrl = this.buildUrl(url);
    return this.http.get<ApiResponse<T>>(fullUrl, { params: httpParams });
  }

  /**
   * POST request
   */
  post<T>(url: string, body: any): Observable<ApiResponse<T>> {
    const fullUrl = this.buildUrl(url);
    return this.http.post<ApiResponse<T>>(fullUrl, body);
  }

  /**
   * PUT request
   */
  put<T>(url: string, body: any): Observable<ApiResponse<T>> {
    const fullUrl = this.buildUrl(url);
    return this.http.put<ApiResponse<T>>(fullUrl, body);
  }

  /**
   * PATCH request
   */
  patch<T>(url: string, body: any): Observable<ApiResponse<T>> {
    const fullUrl = this.buildUrl(url);
    return this.http.patch<ApiResponse<T>>(fullUrl, body);
  }

  /**
   * DELETE request
   */
  delete<T>(url: string): Observable<ApiResponse<T>> {
    const fullUrl = this.buildUrl(url);
    return this.http.delete<ApiResponse<T>>(fullUrl);
  }

  /**
   * GET request with pagination
   */
  getPaginated<T>(
    url: string,
    pagination: PaginationParams,
    filters?: Record<string, any>
  ): Observable<ApiResponse<{ items: T[]; meta: any }>> {
    let params = new HttpParams()
      .set('page', pagination.page?.toString() || '1')
      .set('limit', pagination.limit?.toString() || '10');

    // Add filters
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (
          filters[key] !== null &&
          filters[key] !== undefined &&
          filters[key] !== ''
        ) {
          params = params.set(key, filters[key].toString());
        }
      });
    }

    const fullUrl = this.buildUrl(url);
    return this.http.get<ApiResponse<{ items: T[]; meta: any }>>(fullUrl, {
      params,
    });
  }

  /**
   * Build HttpParams from object
   */
  private buildHttpParams(
    params?: HttpParams | Record<string, any>
  ): HttpParams {
    if (params instanceof HttpParams) {
      return params;
    }

    if (params && typeof params === 'object') {
      let httpParams = new HttpParams();
      Object.keys(params).forEach(key => {
        if (
          params[key] !== null &&
          params[key] !== undefined &&
          params[key] !== ''
        ) {
          httpParams = httpParams.set(key, params[key].toString());
        }
      });
      return httpParams;
    }

    return new HttpParams();
  }

  /**
   * Build full URL with base path
   */
  protected buildUrl(endpoint: string): string {
    // Use environment configuration for API base URL
    const fullUrl = `${environment.apiUrl}${endpoint}`;
    return fullUrl;
  }
}
