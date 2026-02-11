export interface PaginationParams {
  page: number
  limit: number
  offset: number
}

export interface OrderFilters extends PaginationParams {
  search: string
  status: string
  fulfillment: string
  financial: string
  dateFrom: string
  dateTo: string
  sort: string
  dir: 'asc' | 'desc'
}

export interface CustomerFilters extends PaginationParams {
  search: string
  sort: string
  dir: 'asc' | 'desc'
}

export interface ReviewFilters extends PaginationParams {
  status: string
  rating: string
  verified: string
}

type RawParams = Record<string, string | string[] | undefined>

function str(val: string | string[] | undefined): string {
  if (Array.isArray(val)) return val[0] || ''
  return val || ''
}

function pagination(params: RawParams, defaultLimit = 20): PaginationParams {
  const page = Math.max(1, parseInt(str(params.page), 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(str(params.limit), 10) || defaultLimit))
  return { page, limit, offset: (page - 1) * limit }
}

export function parseOrderFilters(params: RawParams): OrderFilters {
  const p = pagination(params)
  const dir = str(params.dir) === 'asc' ? 'asc' as const : 'desc' as const
  return {
    ...p,
    search: str(params.search),
    status: str(params.status),
    fulfillment: str(params.fulfillment),
    financial: str(params.financial),
    dateFrom: str(params.dateFrom),
    dateTo: str(params.dateTo),
    sort: str(params.sort) || 'order_placed_at',
    dir,
  }
}

export function parseCustomerFilters(params: RawParams): CustomerFilters {
  const p = pagination(params)
  const dir = str(params.dir) === 'asc' ? 'asc' as const : 'desc' as const
  return {
    ...p,
    search: str(params.search),
    sort: str(params.sort) || 'total_spent_cents',
    dir,
  }
}

export function parseReviewFilters(params: RawParams): ReviewFilters {
  const p = pagination(params)
  return {
    ...p,
    status: str(params.status) || 'pending',
    rating: str(params.rating),
    verified: str(params.verified),
  }
}

export function buildFilterUrl(
  basePath: string,
  filters: Record<string, string | number | undefined>,
): string {
  const params = new URLSearchParams()
  for (const [key, val] of Object.entries(filters)) {
    if (val !== undefined && val !== '' && val !== null) {
      params.set(key, String(val))
    }
  }
  const qs = params.toString()
  return qs ? `${basePath}?${qs}` : basePath
}
