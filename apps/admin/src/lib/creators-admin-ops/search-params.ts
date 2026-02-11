/**
 * Search params parsing for creator admin operations
 */

import type {
  CommissionFilters,
  ApplicationFilters,
  SampleFilters,
} from './types'

const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 25

export function parseCommissionFilters(
  params: Record<string, string | undefined>
): CommissionFilters {
  const page = Math.max(1, Number(params.page) || DEFAULT_PAGE)
  const limit = Math.min(100, Math.max(1, Number(params.limit) || DEFAULT_LIMIT))

  return {
    page,
    limit,
    offset: (page - 1) * limit,
    status: params.status || '',
    creatorId: params.creatorId || '',
    dateFrom: params.dateFrom || '',
    dateTo: params.dateTo || '',
    search: params.search || '',
  }
}

export function parseApplicationFilters(
  params: Record<string, string | undefined>
): ApplicationFilters {
  const page = Math.max(1, Number(params.page) || DEFAULT_PAGE)
  const limit = Math.min(100, Math.max(1, Number(params.limit) || DEFAULT_LIMIT))

  return {
    page,
    limit,
    offset: (page - 1) * limit,
    status: params.status || '',
    source: params.source || '',
    dateFrom: params.dateFrom || '',
    dateTo: params.dateTo || '',
    search: params.search || '',
  }
}

export function parseSampleFilters(
  params: Record<string, string | undefined>
): SampleFilters {
  const page = Math.max(1, Number(params.page) || DEFAULT_PAGE)
  const limit = Math.min(100, Math.max(1, Number(params.limit) || DEFAULT_LIMIT))

  return {
    page,
    limit,
    offset: (page - 1) * limit,
    status: params.status || '',
    creatorId: params.creatorId || '',
    dateFrom: params.dateFrom || '',
    dateTo: params.dateTo || '',
    search: params.search || '',
  }
}

export function parseOnboardingPeriod(period: string | undefined): number {
  switch (period) {
    case '7d':
      return 7
    case '90d':
      return 90
    default:
      return 30
  }
}
