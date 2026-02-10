/**
 * API response type definitions
 */

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T> {
  data: T
  success: true
}

/**
 * API error response
 */
export interface ApiError {
  error: string
  code?: string
  details?: Record<string, unknown>
  success: false
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    total: number
    page: number
    pageSize: number
    totalPages: number
    hasMore: boolean
  }
  success: true
}

/**
 * Pagination parameters for list endpoints
 */
export interface PaginationParams {
  page?: number
  pageSize?: number
  cursor?: string
}
