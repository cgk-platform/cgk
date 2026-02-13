/**
 * SLA (Service Level Agreement) Management
 * Phase 2SP-TICKETS
 */

import { sql, withTenant } from '@cgk-platform/db'

import type { SLAConfig, TicketPriority } from './types'

// Default SLA values in minutes (fallback if database not populated)
const DEFAULT_SLA: Record<TicketPriority, { firstResponse: number; resolution: number }> = {
  urgent: { firstResponse: 60, resolution: 240 }, // 1h / 4h
  high: { firstResponse: 240, resolution: 1440 }, // 4h / 24h
  normal: { firstResponse: 1440, resolution: 4320 }, // 24h / 72h
  low: { firstResponse: 4320, resolution: 10080 }, // 72h / 1 week
}

/**
 * Get SLA configuration for a priority
 */
export async function getSLAConfig(
  tenantId: string,
  priority: TicketPriority
): Promise<SLAConfig | null> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT
        id,
        priority,
        first_response_minutes as "firstResponseMinutes",
        resolution_minutes as "resolutionMinutes",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM support_sla_config
      WHERE priority = ${priority}
    `

    if (result.rows.length === 0) return null

    const row = result.rows[0] as Record<string, unknown>
    return {
      id: row.id as string,
      priority: row.priority as TicketPriority,
      firstResponseMinutes: row.firstResponseMinutes as number,
      resolutionMinutes: row.resolutionMinutes as number,
      createdAt: new Date(row.createdAt as string),
      updatedAt: new Date(row.updatedAt as string),
    }
  })
}

/**
 * Get all SLA configurations
 */
export async function getAllSLAConfigs(tenantId: string): Promise<SLAConfig[]> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT
        id,
        priority,
        first_response_minutes as "firstResponseMinutes",
        resolution_minutes as "resolutionMinutes",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM support_sla_config
      ORDER BY
        CASE priority
          WHEN 'urgent' THEN 1
          WHEN 'high' THEN 2
          WHEN 'normal' THEN 3
          WHEN 'low' THEN 4
        END
    `

    return result.rows.map((r) => {
      const row = r as Record<string, unknown>
      return {
        id: row.id as string,
        priority: row.priority as TicketPriority,
        firstResponseMinutes: row.firstResponseMinutes as number,
        resolutionMinutes: row.resolutionMinutes as number,
        createdAt: new Date(row.createdAt as string),
        updatedAt: new Date(row.updatedAt as string),
      }
    })
  })
}

/**
 * Update SLA configuration for a priority
 */
export async function updateSLAConfig(
  tenantId: string,
  priority: TicketPriority,
  firstResponseMinutes: number,
  resolutionMinutes: number
): Promise<SLAConfig> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      INSERT INTO support_sla_config (priority, first_response_minutes, resolution_minutes)
      VALUES (${priority}, ${firstResponseMinutes}, ${resolutionMinutes})
      ON CONFLICT (priority)
      DO UPDATE SET
        first_response_minutes = ${firstResponseMinutes},
        resolution_minutes = ${resolutionMinutes}
      RETURNING
        id,
        priority,
        first_response_minutes as "firstResponseMinutes",
        resolution_minutes as "resolutionMinutes",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `

    const row = result.rows[0] as Record<string, unknown>
    if (!row) throw new Error('Failed to update SLA config')
    return {
      id: row.id as string,
      priority: row.priority as TicketPriority,
      firstResponseMinutes: row.firstResponseMinutes as number,
      resolutionMinutes: row.resolutionMinutes as number,
      createdAt: new Date(row.createdAt as string),
      updatedAt: new Date(row.updatedAt as string),
    }
  })
}

/**
 * Calculate SLA deadline based on priority and created time
 */
export async function calculateSLADeadline(
  tenantId: string,
  priority: TicketPriority,
  createdAt: Date
): Promise<Date> {
  // Get SLA config from database
  const config = await getSLAConfig(tenantId, priority)

  // Use database config or fall back to defaults
  const resolutionMinutes = config?.resolutionMinutes ?? DEFAULT_SLA[priority].resolution

  // Calculate deadline
  const deadline = new Date(createdAt)
  deadline.setMinutes(deadline.getMinutes() + resolutionMinutes)

  return deadline
}

/**
 * Calculate first response deadline
 */
export async function calculateFirstResponseDeadline(
  tenantId: string,
  priority: TicketPriority,
  createdAt: Date
): Promise<Date> {
  const config = await getSLAConfig(tenantId, priority)
  const firstResponseMinutes =
    config?.firstResponseMinutes ?? DEFAULT_SLA[priority].firstResponse

  const deadline = new Date(createdAt)
  deadline.setMinutes(deadline.getMinutes() + firstResponseMinutes)

  return deadline
}

/**
 * Check if SLA is breached based on deadline
 */
export function isSLABreached(deadline: Date | null): boolean {
  if (!deadline) return false
  return new Date() > deadline
}

/**
 * Get remaining time until SLA breach in minutes
 * Returns negative value if already breached
 */
export function getRemainingMinutes(deadline: Date | null): number | null {
  if (!deadline) return null
  const now = new Date()
  const diff = deadline.getTime() - now.getTime()
  return Math.floor(diff / (1000 * 60))
}

/**
 * Get SLA status: 'safe', 'warning', or 'breached'
 * Warning threshold is 25% of remaining time
 */
export function getSLAStatus(
  deadline: Date | null,
  createdAt: Date
): 'safe' | 'warning' | 'breached' | null {
  if (!deadline) return null

  const now = new Date()

  if (now > deadline) {
    return 'breached'
  }

  // Calculate total SLA window
  const totalWindow = deadline.getTime() - createdAt.getTime()
  const remaining = deadline.getTime() - now.getTime()

  // Warning when less than 25% of time remaining
  if (remaining < totalWindow * 0.25) {
    return 'warning'
  }

  return 'safe'
}

/**
 * Format remaining time for display
 */
export function formatRemainingTime(deadline: Date | null): string {
  const minutes = getRemainingMinutes(deadline)

  if (minutes === null) return 'No SLA'

  if (minutes < 0) {
    const overdue = Math.abs(minutes)
    if (overdue < 60) return `${overdue}m overdue`
    if (overdue < 1440) return `${Math.floor(overdue / 60)}h overdue`
    return `${Math.floor(overdue / 1440)}d overdue`
  }

  if (minutes < 60) return `${minutes}m remaining`
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h remaining`
  return `${Math.floor(minutes / 1440)}d remaining`
}

/**
 * Check all tickets for SLA breaches and update status
 * This should be run as a background job
 */
export async function checkSLABreaches(tenantId: string): Promise<number> {
  return withTenant(tenantId, async () => {
    // Find tickets that have breached SLA but not yet marked
    const result = await sql`
      UPDATE support_tickets
      SET sla_breached = TRUE
      WHERE status IN ('open', 'pending')
        AND sla_deadline IS NOT NULL
        AND sla_deadline < NOW()
        AND sla_breached = FALSE
      RETURNING id
    `

    return result.rowCount ?? 0
  })
}

/**
 * Recalculate SLA deadline when priority changes
 */
export async function recalculateSLADeadline(
  tenantId: string,
  ticketId: string,
  newPriority: TicketPriority
): Promise<Date> {
  return withTenant(tenantId, async () => {
    // Get ticket creation time
    const ticketResult = await sql`
      SELECT created_at FROM support_tickets WHERE id = ${ticketId}
    `

    const ticketRow = ticketResult.rows[0] as Record<string, unknown> | undefined
    if (!ticketRow) {
      throw new Error(`Ticket ${ticketId} not found`)
    }

    const createdAt = new Date(ticketRow.created_at as string)
    const newDeadline = await calculateSLADeadline(tenantId, newPriority, createdAt)

    // Update ticket with new deadline
    await sql`
      UPDATE support_tickets
      SET sla_deadline = ${newDeadline.toISOString()},
          sla_breached = ${newDeadline < new Date()}
      WHERE id = ${ticketId}
    `

    return newDeadline
  })
}
