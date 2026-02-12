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

export interface BlogFilters extends PaginationParams {
  search: string
  status: string
  category: string
  author: string
  sort: string
  dir: 'asc' | 'desc'
}

export interface PageFilters extends PaginationParams {
  search: string
  status: string
  sort: string
  dir: 'asc' | 'desc'
}

export interface DocumentFilters extends PaginationParams {
  search: string
  category: string
  sort: string
  dir: 'asc' | 'desc'
}

export function parseBlogFilters(params: RawParams): BlogFilters {
  const p = pagination(params)
  const dir = str(params.dir) === 'asc' ? 'asc' as const : 'desc' as const
  return {
    ...p,
    search: str(params.search),
    status: str(params.status),
    category: str(params.category),
    author: str(params.author),
    sort: str(params.sort) || 'created_at',
    dir,
  }
}

export function parsePageFilters(params: RawParams): PageFilters {
  const p = pagination(params)
  const dir = str(params.dir) === 'asc' ? 'asc' as const : 'desc' as const
  return {
    ...p,
    search: str(params.search),
    status: str(params.status),
    sort: str(params.sort) || 'updated_at',
    dir,
  }
}

export function parseDocumentFilters(params: RawParams): DocumentFilters {
  const p = pagination(params)
  const dir = str(params.dir) === 'asc' ? 'asc' as const : 'desc' as const
  return {
    ...p,
    search: str(params.search),
    category: str(params.category),
    sort: str(params.sort) || 'updated_at',
    dir,
  }
}

export interface CreatorFilters extends PaginationParams {
  search: string
  status: string
  tier: string
  sort: string
  dir: 'asc' | 'desc'
}

export interface ThreadFilters extends PaginationParams {
  status: string
  search: string
}

export interface WithdrawalFilters extends PaginationParams {
  status: string
  method: string
  search: string
  dateFrom: string
  dateTo: string
}

export interface ExpenseFilters extends PaginationParams {
  category: string
  dateFrom: string
  dateTo: string
  search: string
}

export interface TaxFilters extends PaginationParams {
  w9_status: string
  form_1099_status: string
  tax_year: number
  requires_1099: string
}

export interface SubscriptionFilters extends PaginationParams {
  status: string
  product: string
  frequency: string
  search: string
  dateFrom: string
  dateTo: string
  sort: string
  dir: 'asc' | 'desc'
}

export function parseCreatorFilters(params: RawParams): CreatorFilters {
  const p = pagination(params)
  const dir = str(params.dir) === 'asc' ? 'asc' as const : 'desc' as const
  return {
    ...p,
    search: str(params.search),
    status: str(params.status),
    tier: str(params.tier),
    sort: str(params.sort) || 'applied_at',
    dir,
  }
}

export interface CreatorDirectoryFilters extends CreatorFilters {
  tags: string[]
  dateFrom: string
  dateTo: string
  dateField: 'applied_at' | 'created_at' | 'last_active_at'
}

export function parseCreatorDirectoryFilters(params: RawParams): CreatorDirectoryFilters {
  const base = parseCreatorFilters(params)
  const tagsParam = params.tags
  let tags: string[] = []
  if (typeof tagsParam === 'string') {
    tags = tagsParam.split(',').filter(Boolean)
  } else if (Array.isArray(tagsParam)) {
    tags = tagsParam.filter((t): t is string => typeof t === 'string')
  }

  const dateField = str(params.dateField)
  const validDateFields = ['applied_at', 'created_at', 'last_active_at']

  return {
    ...base,
    tags,
    dateFrom: str(params.dateFrom),
    dateTo: str(params.dateTo),
    dateField: validDateFields.includes(dateField)
      ? (dateField as 'applied_at' | 'created_at' | 'last_active_at')
      : 'applied_at',
  }
}

export function parseThreadFilters(params: RawParams): ThreadFilters {
  const p = pagination(params)
  return {
    ...p,
    status: str(params.status),
    search: str(params.search),
  }
}

export function parseWithdrawalFilters(params: RawParams): WithdrawalFilters {
  const p = pagination(params)
  return {
    ...p,
    status: str(params.status),
    method: str(params.method),
    search: str(params.search),
    dateFrom: str(params.dateFrom),
    dateTo: str(params.dateTo),
  }
}

export function parseExpenseFilters(params: RawParams): ExpenseFilters {
  const p = pagination(params)
  return {
    ...p,
    category: str(params.category),
    dateFrom: str(params.dateFrom),
    dateTo: str(params.dateTo),
    search: str(params.search),
  }
}

export function parseTaxFilters(params: RawParams): TaxFilters {
  const p = pagination(params)
  const currentYear = new Date().getFullYear()
  return {
    ...p,
    w9_status: str(params.w9_status),
    form_1099_status: str(params.form_1099_status),
    tax_year: parseInt(str(params.tax_year), 10) || currentYear,
    requires_1099: str(params.requires_1099),
  }
}

export interface ContractorFilters extends PaginationParams {
  search: string
  status: string[]
  tags: string[]
  hasPaymentMethod: boolean | null
  hasW9: boolean | null
  sort: string
  dir: 'asc' | 'desc'
}

export function parseContractorFilters(params: RawParams): ContractorFilters {
  const p = pagination(params)
  const dir = str(params.dir) === 'asc' ? ('asc' as const) : ('desc' as const)

  // Parse status multi-select
  const statusParam = params.status
  let status: string[] = []
  if (typeof statusParam === 'string' && statusParam) {
    status = statusParam.split(',').filter(Boolean)
  } else if (Array.isArray(statusParam)) {
    status = statusParam.filter((s): s is string => typeof s === 'string' && s !== '')
  }

  // Parse tags
  const tagsParam = params.tags
  let tags: string[] = []
  if (typeof tagsParam === 'string' && tagsParam) {
    tags = tagsParam.split(',').filter(Boolean)
  } else if (Array.isArray(tagsParam)) {
    tags = tagsParam.filter((t): t is string => typeof t === 'string' && t !== '')
  }

  // Parse boolean filters
  const hasPaymentMethodStr = str(params.hasPaymentMethod)
  const hasPaymentMethod =
    hasPaymentMethodStr === 'true' ? true : hasPaymentMethodStr === 'false' ? false : null

  const hasW9Str = str(params.hasW9)
  const hasW9 = hasW9Str === 'true' ? true : hasW9Str === 'false' ? false : null

  return {
    ...p,
    search: str(params.search),
    status,
    tags,
    hasPaymentMethod,
    hasW9,
    sort: str(params.sort) || 'createdAt',
    dir,
  }
}

export interface AbandonedCheckoutFilters extends PaginationParams {
  status: string
  dateFrom: string
  dateTo: string
  minValue: string
  maxValue: string
  search: string
  sort: string
  dir: 'asc' | 'desc'
}

export function parseAbandonedCheckoutFilters(params: RawParams): AbandonedCheckoutFilters {
  const p = pagination(params)
  const dir = str(params.dir) === 'asc' ? 'asc' as const : 'desc' as const
  return {
    ...p,
    status: str(params.status),
    dateFrom: str(params.dateFrom),
    dateTo: str(params.dateTo),
    minValue: str(params.minValue),
    maxValue: str(params.maxValue),
    search: str(params.search),
    sort: str(params.sort) || 'abandoned_at',
    dir,
  }
}

// ============================================================================
// Segments & Samples Filters
// ============================================================================

export interface SegmentFilters extends PaginationParams {
  search: string
  type: 'shopify' | 'rfm' | 'all'
}

export interface RfmCustomerFilters extends PaginationParams {
  search: string
  segment: string
  minRfmScore: number | null
  maxRfmScore: number | null
  sort: string
  dir: 'asc' | 'desc'
}

export interface SamplesFilters extends PaginationParams {
  search: string
  type: string
  fulfillmentStatus: string
  dateFrom: string
  dateTo: string
  sort: string
  dir: 'asc' | 'desc'
}

export function parseSegmentFilters(params: RawParams): SegmentFilters {
  const p = pagination(params)
  const typeVal = str(params.type)
  const type = typeVal === 'shopify' || typeVal === 'rfm' ? typeVal : 'all'
  return {
    ...p,
    search: str(params.search),
    type,
  }
}

export function parseRfmCustomerFilters(params: RawParams): RfmCustomerFilters {
  const p = pagination(params)
  const dir = str(params.dir) === 'asc' ? 'asc' as const : 'desc' as const
  const minScore = str(params.minRfmScore)
  const maxScore = str(params.maxRfmScore)
  return {
    ...p,
    search: str(params.search),
    segment: str(params.segment),
    minRfmScore: minScore ? parseInt(minScore, 10) : null,
    maxRfmScore: maxScore ? parseInt(maxScore, 10) : null,
    sort: str(params.sort) || 'rfm_score',
    dir,
  }
}

export function parseSamplesFilters(params: RawParams): SamplesFilters {
  const p = pagination(params)
  const dir = str(params.dir) === 'asc' ? 'asc' as const : 'desc' as const
  return {
    ...p,
    search: str(params.search),
    type: str(params.type),
    fulfillmentStatus: str(params.fulfillmentStatus),
    dateFrom: str(params.dateFrom),
    dateTo: str(params.dateTo),
    sort: str(params.sort) || 'order_placed_at',
    dir,
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

// ============================================================================
// Promo Codes, Selling Plans, and Promotions Filters
// ============================================================================

export interface PromoCodeFilters extends PaginationParams {
  search: string
  status: string
  type: string
  creatorId: string
  sort: string
  dir: 'asc' | 'desc'
}

export function parsePromoCodeFilters(params: RawParams): PromoCodeFilters {
  const p = pagination(params)
  const dir = str(params.dir) === 'asc' ? 'asc' as const : 'desc' as const
  return {
    ...p,
    search: str(params.search),
    status: str(params.status),
    type: str(params.type),
    creatorId: str(params.creatorId),
    sort: str(params.sort) || 'created_at',
    dir,
  }
}

export interface SellingPlanFilters extends PaginationParams {
  activeOnly: boolean
}

export function parseSellingPlanFilters(params: RawParams): SellingPlanFilters {
  const p = pagination(params, 50)
  return {
    ...p,
    activeOnly: str(params.activeOnly) === 'true',
  }
}

export interface PromotionFilters extends PaginationParams {
  status: string
  includeEnded: boolean
  startDate: string
  endDate: string
}

export function parsePromotionFilters(params: RawParams): PromotionFilters {
  const p = pagination(params, 50)
  return {
    ...p,
    status: str(params.status),
    includeEnded: str(params.includeEnded) !== 'false',
    startDate: str(params.startDate),
    endDate: str(params.endDate),
  }
}

export function parseSubscriptionFilters(params: RawParams): SubscriptionFilters {
  const p = pagination(params)
  const dir = str(params.dir) === 'asc' ? 'asc' as const : 'desc' as const
  return {
    ...p,
    status: str(params.status),
    product: str(params.product),
    frequency: str(params.frequency),
    search: str(params.search),
    dateFrom: str(params.dateFrom),
    dateTo: str(params.dateTo),
    sort: str(params.sort) || 'created_at',
    dir,
  }
}
