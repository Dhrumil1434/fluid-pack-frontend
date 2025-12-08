import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Export Service
 * Handles export functionality for admin dashboard pages
 */

export type ExportPageId =
  | 'user_management'
  | 'machine_management'
  | 'category_management'
  | 'qc_entries'
  | 'machine_approvals'
  | 'role_management'
  | 'permission_management'
  | 'sequence_management'
  | 'approval_management';

export interface ExportFilters {
  [key: string]: any;
}

@Injectable({
  providedIn: 'root',
})
export class ExportService {
  private readonly baseUrl = `${environment.apiUrl}/admin/export`;

  constructor(private http: HttpClient) {}

  /**
   * Export data to Excel
   * @param pageId The page identifier
   * @param filters Current filters to apply
   */
  exportToExcel(
    pageId: ExportPageId,
    filters: ExportFilters = {}
  ): Observable<Blob> {
    let params = new HttpParams();

    // Add filters to query params
    Object.keys(filters).forEach(key => {
      const value = filters[key];
      if (value !== null && value !== undefined && value !== '') {
        params = params.set(key, value.toString());
      }
    });

    return this.http.get(`${this.baseUrl}/${pageId}/excel`, {
      params,
      responseType: 'blob',
    });
  }

  /**
   * Export individual record to PDF
   * @param pageId The page identifier
   * @param recordId The record ID to export
   */
  exportToPdf(pageId: ExportPageId, recordId: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${pageId}/${recordId}/pdf`, {
      responseType: 'blob',
    });
  }

  /**
   * Download blob as file
   * @param blob The blob to download
   * @param filename The filename
   */
  downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Get MIME type for file extension
   */
  getMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'xlsx':
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case 'pdf':
        return 'application/pdf';
      default:
        return 'application/octet-stream';
    }
  }
}
