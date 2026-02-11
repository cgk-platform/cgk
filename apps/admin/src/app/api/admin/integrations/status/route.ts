export const dynamic = 'force-dynamic'

import { withTenant, sql } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import type { IntegrationStatus } from '@/lib/integrations/types'

interface IntegrationStatusData {
  id: string
  status: IntegrationStatus
  statusDetails?: string
  lastSyncedAt?: string
  expiresAt?: string
}

/**
 * GET /api/admin/integrations/status
 *
 * Fetches status for all integrations for the current tenant.
 * Uses parallel queries for performance.
 */
export async function GET() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const statuses: Record<string, IntegrationStatusData> = {}

  await withTenant(tenantSlug, async () => {
    // Check if integration_credentials table exists
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'integration_credentials'
      ) as exists
    `

    if (!tableCheck.rows[0]?.exists) {
      // Table doesn't exist yet, return all disconnected
      return
    }

    // Fetch all integration credentials in one query
    const credentialsResult = await sql`
      SELECT
        integration_type,
        status,
        connected_at,
        expires_at,
        last_synced_at,
        metadata
      FROM integration_credentials
    `

    // Map results to our status format
    for (const row of credentialsResult.rows) {
      const integrationType = row.integration_type as string
      const dbStatus = row.status as string
      const expiresAt = row.expires_at as string | null
      const lastSyncedAt = row.last_synced_at as string | null
      const metadata = row.metadata as Record<string, unknown> | null

      // Determine effective status
      let status: IntegrationStatus = 'disconnected'
      let statusDetails: string | undefined

      if (dbStatus === 'active') {
        // Check if token is expired
        if (expiresAt && new Date(expiresAt) < new Date()) {
          status = 'error'
          statusDetails = 'Token expired'
        } else {
          status = 'connected'
        }
      } else if (dbStatus === 'error') {
        status = 'error'
        statusDetails = (metadata?.errorMessage as string) || 'Connection error'
      } else if (dbStatus === 'pending') {
        status = 'pending'
        statusDetails = 'Setup in progress'
      }

      statuses[integrationType] = {
        id: integrationType,
        status,
        statusDetails,
        lastSyncedAt: lastSyncedAt || undefined,
        expiresAt: expiresAt || undefined,
      }
    }
  })

  // Fill in missing integrations as disconnected
  const allIntegrations = [
    'shopify-app',
    'meta-ads',
    'google-ads',
    'tiktok-ads',
    'sms',
    'slack',
    'klaviyo',
    'yotpo',
    'mcp',
  ]

  for (const id of allIntegrations) {
    if (!statuses[id]) {
      statuses[id] = {
        id,
        status: 'disconnected',
      }
    }
  }

  return NextResponse.json({ statuses })
}
