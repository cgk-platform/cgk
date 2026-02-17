/**
 * Pagination Constants
 *
 * Defines constants for pagination across commerce operations.
 */

/** Default number of items per page */
export const DEFAULT_PAGE_SIZE = 20

/** Maximum items per page (prevents large queries) */
export const MAX_PAGE_SIZE = 100

/** Default starting page (1-indexed for UI) */
export const DEFAULT_PAGE = 1

/** Default cursor for first page (null indicates first page) */
export const DEFAULT_CURSOR: string | null = null

/** Maximum cursor length (for security/validation) */
export const MAX_CURSOR_LENGTH = 256

/** Default sort direction */
export const DEFAULT_SORT_DIRECTION = 'asc' as const

/**
 * Supported sort directions
 */
export const SORT_DIRECTIONS = ['asc', 'desc'] as const

export type SortDirection = (typeof SORT_DIRECTIONS)[number]

/**
 * Pagination configuration options
 */
export interface PaginationConfig {
  /** Items per page */
  pageSize: number
  /** Maximum allowed page size */
  maxPageSize: number
  /** Whether to use cursor-based pagination */
  useCursor: boolean
}

/**
 * Default pagination configuration
 */
export const DEFAULT_PAGINATION_CONFIG: PaginationConfig = {
  pageSize: DEFAULT_PAGE_SIZE,
  maxPageSize: MAX_PAGE_SIZE,
  useCursor: true,
}
