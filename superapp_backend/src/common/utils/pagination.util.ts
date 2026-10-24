import {
  PaginationMeta,
  PaginatedResult,
} from '../interfaces/paginated-result.interface';

/**
 * Calculates standard offset-based pagination metadata.
 */
export function buildPaginationMeta(
  totalItems: number,
  page: number,
  limit: number,
): PaginationMeta {
  const safePage = Math.max(1, page || 1);
  const safeLimit = Math.max(1, limit || 20);
  const totalPages = Math.max(1, Math.ceil(totalItems / safeLimit));

  return {
    page: safePage,
    limit: safeLimit,
    totalItems,
    totalPages,
    hasNextPage: safePage < totalPages,
    hasPreviousPage: safePage > 1,
  };
}

/**
 * Wraps items and count into the standardized PaginatedResult envelope.
 */
export function createPaginatedResponse<T>(
  data: T[],
  totalItems: number,
  page: number,
  limit: number,
): PaginatedResult<T> {
  return {
    success: true,
    data,
    meta: buildPaginationMeta(totalItems, page, limit),
  };
}
