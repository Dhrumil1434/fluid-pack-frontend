export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginationResult {
  skip: number;
  take: number;
  totalPages: number;
  currentPage: number;
}

export function getPagination(
  { page = 1, limit = 10 }: PaginationParams,
  totalCount: number
): PaginationResult {
  const currentPage = Math.max(1, page);
  const take = Math.max(1, limit);
  const skip = (currentPage - 1) * take;
  const totalPages = Math.max(1, Math.ceil(totalCount / take));
  return { skip, take, totalPages, currentPage };
}
