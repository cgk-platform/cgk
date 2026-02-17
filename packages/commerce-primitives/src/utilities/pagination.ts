/**
 * Pagination Utilities
 *
 * Utilities for building and parsing cursor-based pagination.
 */

import type { ListParams, PageInfo } from '@cgk-platform/commerce'
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  MAX_CURSOR_LENGTH,
  type SortDirection,
  DEFAULT_SORT_DIRECTION,
} from '../constants/pagination'

/**
 * Cursor data structure (encoded in cursor string)
 */
export interface CursorData {
  /** Offset or position */
  offset: number
  /** Sort key */
  sortKey?: string
  /** Sort direction */
  sortDirection?: SortDirection
  /** Additional filter context */
  filters?: Record<string, string>
  /** Timestamp for cursor expiry validation */
  timestamp?: number
}

/**
 * Build a cursor string from cursor data
 *
 * @param data - Cursor data to encode
 * @returns Base64 encoded cursor string
 */
export function buildCursor(data: CursorData): string {
  const payload = {
    ...data,
    timestamp: data.timestamp ?? Date.now(),
  }
  const json = JSON.stringify(payload)
  // Use base64url encoding for URL safety
  return btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Parse a cursor string back to cursor data
 *
 * @param cursor - Base64 encoded cursor string
 * @returns Parsed cursor data or null if invalid
 */
export function parseCursor(cursor: string): CursorData | null {
  if (!cursor || cursor.length > MAX_CURSOR_LENGTH) {
    return null
  }

  try {
    // Restore base64 padding and standard characters
    let base64 = cursor.replace(/-/g, '+').replace(/_/g, '/')
    while (base64.length % 4) {
      base64 += '='
    }

    const json = atob(base64)
    const data = JSON.parse(json)

    // Validate required fields
    if (typeof data.offset !== 'number' || data.offset < 0) {
      return null
    }

    return {
      offset: data.offset,
      sortKey: data.sortKey,
      sortDirection: data.sortDirection,
      filters: data.filters,
      timestamp: data.timestamp,
    }
  } catch {
    return null
  }
}

/**
 * Build pagination parameters for a query
 *
 * @param options - Pagination options
 * @returns ListParams for commerce provider
 */
export function buildPaginationParams(options: {
  cursor?: string | null
  pageSize?: number
  sortKey?: string
  sortDirection?: SortDirection
}): ListParams {
  const { cursor, pageSize = DEFAULT_PAGE_SIZE, sortKey, sortDirection } = options

  const first = Math.min(Math.max(1, pageSize), MAX_PAGE_SIZE)

  const params: ListParams = {
    first,
  }

  if (cursor) {
    params.after = cursor
  }

  if (sortKey) {
    params.sortKey = sortKey
    params.reverse = sortDirection === 'desc'
  }

  return params
}

/**
 * Calculate offset-based pagination params
 *
 * @param page - Page number (1-indexed)
 * @param pageSize - Items per page
 * @returns Offset and limit
 */
export function getOffsetParams(page: number, pageSize: number = DEFAULT_PAGE_SIZE): {
  offset: number
  limit: number
} {
  const safePage = Math.max(1, page)
  const safePageSize = Math.min(Math.max(1, pageSize), MAX_PAGE_SIZE)

  return {
    offset: (safePage - 1) * safePageSize,
    limit: safePageSize,
  }
}

/**
 * Build page info from pagination results
 *
 * @param options - Pagination context
 * @returns PageInfo object
 */
export function buildPageInfo(options: {
  hasMore: boolean
  itemCount: number
  cursor?: string
  prevCursor?: string
}): PageInfo {
  const { hasMore, cursor, prevCursor } = options

  return {
    hasNextPage: hasMore,
    hasPreviousPage: !!prevCursor,
    startCursor: prevCursor ?? null,
    endCursor: cursor ?? null,
  }
}

/**
 * Calculate total pages from item count
 *
 * @param totalItems - Total number of items
 * @param pageSize - Items per page
 * @returns Total number of pages
 */
export function calculateTotalPages(totalItems: number, pageSize: number = DEFAULT_PAGE_SIZE): number {
  return Math.ceil(totalItems / Math.min(Math.max(1, pageSize), MAX_PAGE_SIZE))
}

/**
 * Generate an array of page numbers for pagination UI
 *
 * @param currentPage - Current page (1-indexed)
 * @param totalPages - Total pages
 * @param maxVisible - Maximum visible page numbers
 * @returns Array of page numbers and ellipsis markers
 */
export function generatePageNumbers(
  currentPage: number,
  totalPages: number,
  maxVisible: number = 7
): (number | 'ellipsis')[] {
  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  const pages: (number | 'ellipsis')[] = []
  const halfVisible = Math.floor((maxVisible - 2) / 2)

  // Always show first page
  pages.push(1)

  // Calculate start and end of visible range
  let start = Math.max(2, currentPage - halfVisible)
  let end = Math.min(totalPages - 1, currentPage + halfVisible)

  // Adjust range if near edges
  if (currentPage <= halfVisible + 1) {
    end = Math.min(totalPages - 1, maxVisible - 2)
  } else if (currentPage >= totalPages - halfVisible) {
    start = Math.max(2, totalPages - maxVisible + 3)
  }

  // Add ellipsis after first page if needed
  if (start > 2) {
    pages.push('ellipsis')
  }

  // Add visible page numbers
  for (let i = start; i <= end; i++) {
    pages.push(i)
  }

  // Add ellipsis before last page if needed
  if (end < totalPages - 1) {
    pages.push('ellipsis')
  }

  // Always show last page
  if (totalPages > 1) {
    pages.push(totalPages)
  }

  return pages
}

/**
 * Parse sort parameter from URL
 *
 * @param sort - Sort parameter (e.g., "price:asc", "name:desc")
 * @returns Parsed sort key and direction
 */
export function parseSortParam(sort: string | null): {
  sortKey: string | undefined
  sortDirection: SortDirection
} {
  if (!sort) {
    return { sortKey: undefined, sortDirection: DEFAULT_SORT_DIRECTION }
  }

  const [key, direction] = sort.split(':')
  return {
    sortKey: key || undefined,
    sortDirection: direction === 'desc' ? 'desc' : 'asc',
  }
}

/**
 * Build sort parameter for URL
 *
 * @param sortKey - Sort key
 * @param sortDirection - Sort direction
 * @returns Sort parameter string
 */
export function buildSortParam(sortKey: string, sortDirection: SortDirection = 'asc'): string {
  return `${sortKey}:${sortDirection}`
}
