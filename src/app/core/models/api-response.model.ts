export interface ApiResponse<T = any> {
  success: boolean;
  statusCode: number;
  data: T;
  message: string;
}

export interface ApiError {
  success: false;
  action?: string;
  errorCode: string;
  message: string;
  errors: ErrorDetail[];
  data: DataDetail[] | null;
  statusCode?: number;
}

export interface ErrorDetail {
  field: string;
  message: string;
}

export interface DataDetail {
  expectedField: string;
  description: string;
}

export interface PaginationMeta {
  total: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: PaginationMeta;
}

export interface PaginatedApiResponse<T>
  extends ApiResponse<PaginatedResponse<T>> {}
