/**
 * Base Enterprise Unified Response Envelope
 */
export interface BaseApiResponse {
  success: boolean;
  statusCode: number;
  message: string;
  path: string;
  timestamp: string;
}

/**
 * Standard Offset-based Pagination Metadata
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Standardized Unified Response Envelope for Offset-paginated endpoints
 */
export interface PaginatedResult<T> extends Partial<BaseApiResponse> {
  success: boolean;
  data: T[];
  meta: PaginationMeta;
}

/**
 * Standard Keyset/Cursor-based Pagination Metadata
 */
export interface CursorPaginationMeta {
  limit: number;
  nextCursor?: string | null;
  hasNextPage: boolean;
}

/**
 * Standardized Unified Response Envelope for Cursor-paginated endpoints
 */
export interface CursorPaginatedResult<T> extends Partial<BaseApiResponse> {
  success: boolean;
  data: T[];
  meta: CursorPaginationMeta;
}

/**
 * Unified Response Envelope for single entities / non-paginated endpoints
 */
export interface ApiResponse<T = any> extends BaseApiResponse {
  data: T;
  meta?: PaginationMeta | CursorPaginationMeta;
}
