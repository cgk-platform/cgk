/**
 * Alert management (acknowledge, resolve, query)
 */

import { sql } from '@cgk/db'

import type { Alert, AlertSeverity, AlertStatus } from '../types.js'

/**
 * Get open alerts
 */
export async function getOpenAlerts(options?: {
  service?: string
  tenantId?: string
  severity?: AlertSeverity
  limit?: number
}): Promise<Alert[]> {
  const { service, tenantId, severity, limit = 100 } = options || {}

  // Use a single query with all filters
  const result = await sql<{
    id: string
    severity: string
    source: string
    service: string
    tenant_id: string | null
    tenant_slug: string | null
    metric: string | null
    current_value: number | null
    threshold_value: number | null
    title: string
    message: string
    metadata: Record<string, unknown>
    status: string
    created_at: string
    acknowledged_at: string | null
    acknowledged_by: string | null
    resolved_at: string | null
    resolved_by: string | null
    resolution_notes: string | null
    delivery_status: Record<string, string>
  }>`
    SELECT
      a.*,
      o.slug as tenant_slug
    FROM public.platform_alerts a
    LEFT JOIN public.organizations o ON a.tenant_id = o.id
    WHERE a.status = 'open'
      AND (${service || null}::text IS NULL OR a.service = ${service || null})
      AND (${tenantId || null}::uuid IS NULL OR a.tenant_id = ${tenantId || null})
      AND (${severity || null}::text IS NULL OR a.severity = ${severity || null})
    ORDER BY
      CASE a.severity
        WHEN 'p1' THEN 1
        WHEN 'p2' THEN 2
        WHEN 'p3' THEN 3
      END,
      a.created_at DESC
    LIMIT ${limit}
  `

  return result.rows.map(mapRowToAlert)
}

/**
 * Get alert by ID
 */
export async function getAlert(alertId: string): Promise<Alert | null> {
  const result = await sql<{
    id: string
    severity: string
    source: string
    service: string
    tenant_id: string | null
    tenant_slug: string | null
    metric: string | null
    current_value: number | null
    threshold_value: number | null
    title: string
    message: string
    metadata: Record<string, unknown>
    status: string
    created_at: string
    acknowledged_at: string | null
    acknowledged_by: string | null
    resolved_at: string | null
    resolved_by: string | null
    resolution_notes: string | null
    delivery_status: Record<string, string>
  }>`
    SELECT
      a.*,
      o.slug as tenant_slug
    FROM public.platform_alerts a
    LEFT JOIN public.organizations o ON a.tenant_id = o.id
    WHERE a.id = ${alertId}
  `

  const row = result.rows[0]
  return row ? mapRowToAlert(row) : null
}

/**
 * Acknowledge an alert
 */
export async function acknowledgeAlert(
  alertId: string,
  userId: string
): Promise<Alert | null> {
  const result = await sql<{
    id: string
    severity: string
    source: string
    service: string
    tenant_id: string | null
    metric: string | null
    current_value: number | null
    threshold_value: number | null
    title: string
    message: string
    metadata: Record<string, unknown>
    status: string
    created_at: string
    acknowledged_at: string | null
    acknowledged_by: string | null
    resolved_at: string | null
    resolved_by: string | null
    resolution_notes: string | null
    delivery_status: Record<string, string>
  }>`
    UPDATE public.platform_alerts
    SET
      status = 'acknowledged',
      acknowledged_at = NOW(),
      acknowledged_by = ${userId}
    WHERE id = ${alertId} AND status = 'open'
    RETURNING *
  `

  const row = result.rows[0]
  return row ? mapRowToAlert(row) : null
}

/**
 * Resolve an alert
 */
export async function resolveAlert(
  alertId: string,
  userId: string,
  notes?: string
): Promise<Alert | null> {
  const result = await sql<{
    id: string
    severity: string
    source: string
    service: string
    tenant_id: string | null
    metric: string | null
    current_value: number | null
    threshold_value: number | null
    title: string
    message: string
    metadata: Record<string, unknown>
    status: string
    created_at: string
    acknowledged_at: string | null
    acknowledged_by: string | null
    resolved_at: string | null
    resolved_by: string | null
    resolution_notes: string | null
    delivery_status: Record<string, string>
  }>`
    UPDATE public.platform_alerts
    SET
      status = 'resolved',
      resolved_at = NOW(),
      resolved_by = ${userId},
      resolution_notes = ${notes || null}
    WHERE id = ${alertId} AND status IN ('open', 'acknowledged')
    RETURNING *
  `

  const row = result.rows[0]
  return row ? mapRowToAlert(row) : null
}

/**
 * Get alert counts by status
 */
export async function getAlertCounts(): Promise<Record<AlertStatus, number>> {
  const result = await sql<{ status: string; count: string }>`
    SELECT status, count(*)::text as count
    FROM public.platform_alerts
    GROUP BY status
  `

  const counts: Record<AlertStatus, number> = {
    open: 0,
    acknowledged: 0,
    resolved: 0,
  }

  for (const row of result.rows) {
    counts[row.status as AlertStatus] = parseInt(row.count, 10)
  }

  return counts
}

/**
 * Get recent alerts (for dashboard)
 */
export async function getRecentAlerts(limit = 10): Promise<Alert[]> {
  const result = await sql<{
    id: string
    severity: string
    source: string
    service: string
    tenant_id: string | null
    tenant_slug: string | null
    metric: string | null
    current_value: number | null
    threshold_value: number | null
    title: string
    message: string
    metadata: Record<string, unknown>
    status: string
    created_at: string
    acknowledged_at: string | null
    acknowledged_by: string | null
    resolved_at: string | null
    resolved_by: string | null
    resolution_notes: string | null
    delivery_status: Record<string, string>
  }>`
    SELECT
      a.*,
      o.slug as tenant_slug
    FROM public.platform_alerts a
    LEFT JOIN public.organizations o ON a.tenant_id = o.id
    ORDER BY a.created_at DESC
    LIMIT ${limit}
  `

  return result.rows.map(mapRowToAlert)
}

/**
 * Map database row to Alert type
 */
function mapRowToAlert(row: {
  id: string
  severity: string
  source: string
  service: string
  tenant_id: string | null
  tenant_slug?: string | null
  metric: string | null
  current_value: number | null
  threshold_value: number | null
  title: string
  message: string
  metadata: Record<string, unknown>
  status: string
  created_at: string
  acknowledged_at: string | null
  acknowledged_by: string | null
  resolved_at: string | null
  resolved_by: string | null
  resolution_notes: string | null
  delivery_status: Record<string, string>
}): Alert {
  return {
    id: row.id,
    severity: row.severity as AlertSeverity,
    source: row.source as Alert['source'],
    service: row.service,
    tenantId: row.tenant_id || undefined,
    tenantSlug: row.tenant_slug || undefined,
    metric: row.metric || undefined,
    currentValue: row.current_value || undefined,
    thresholdValue: row.threshold_value || undefined,
    title: row.title,
    message: row.message,
    metadata: row.metadata,
    status: row.status as AlertStatus,
    createdAt: row.created_at,
    acknowledgedAt: row.acknowledged_at || undefined,
    acknowledgedBy: row.acknowledged_by || undefined,
    resolvedAt: row.resolved_at || undefined,
    resolvedBy: row.resolved_by || undefined,
    resolutionNotes: row.resolution_notes || undefined,
    deliveryStatus: row.delivery_status as Record<string, 'sent' | 'failed' | 'pending'>,
  }
}
