/**
 * Support-specific filter types for admin UI
 */

import type { PaginationParams } from '@/lib/search-params'

export interface TicketFiltersUI extends PaginationParams {
  status: string
  priority: string
  channel: string
  assignedTo: string
  unassigned: string
  slaBreached: string
  search: string
  sort: string
  dir: 'asc' | 'desc'
}

export interface AgentFiltersUI extends PaginationParams {
  role: string
  isActive: string
  isOnline: string
  search: string
}
