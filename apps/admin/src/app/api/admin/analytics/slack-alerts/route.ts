/**
 * Slack Alerts API
 *
 * GET /api/admin/analytics/slack-alerts - List all slack alerts
 * POST /api/admin/analytics/slack-alerts - Create a new slack alert
 */

import { requireAuth } from '@cgk-platform/auth'

import { createSlackAlert, getSlackAlerts } from '@/lib/analytics'
import type { SlackAlertCreate } from '@/lib/analytics'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: Request) {
  const { tenantId } = await requireAuth(req)

  if (!tenantId) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  const alerts = await getSlackAlerts(tenantId)

  return Response.json({ alerts })
}

export async function POST(req: Request) {
  const { tenantId } = await requireAuth(req)

  if (!tenantId) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  const body = (await req.json()) as SlackAlertCreate

  if (!body.alertType || !body.channelId || !body.config) {
    return Response.json(
      { error: 'Missing required fields: alertType, channelId, config' },
      { status: 400 }
    )
  }

  const alert = await createSlackAlert(tenantId, body)

  return Response.json({ alert }, { status: 201 })
}
