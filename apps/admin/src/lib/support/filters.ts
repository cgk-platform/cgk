import type { TicketFiltersUI, AgentFiltersUI } from './types'

type RawParams = Record<string, string | string[] | undefined>

function str(val: string | string[] | undefined): string {
  if (Array.isArray(val)) return val[0] || ''
  return val || ''
}

function pagination(params: RawParams, defaultLimit = 20) {
  const page = Math.max(1, parseInt(str(params.page), 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(str(params.limit), 10) || defaultLimit))
  return { page, limit, offset: (page - 1) * limit }
}

export function parseTicketFilters(params: RawParams): TicketFiltersUI {
  const p = pagination(params)
  const dir = str(params.dir) === 'asc' ? ('asc' as const) : ('desc' as const)
  return {
    ...p,
    status: str(params.status),
    priority: str(params.priority),
    channel: str(params.channel),
    assignedTo: str(params.assignedTo),
    unassigned: str(params.unassigned),
    slaBreached: str(params.slaBreached),
    search: str(params.search),
    sort: str(params.sort) || 'created_at',
    dir,
  }
}

export function parseAgentFilters(params: RawParams): AgentFiltersUI {
  const p = pagination(params)
  return {
    ...p,
    role: str(params.role),
    isActive: str(params.isActive),
    isOnline: str(params.isOnline),
    search: str(params.search),
  }
}
