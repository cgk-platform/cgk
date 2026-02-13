/**
 * Klaviyo Segment Sync API
 * GET: List segment-to-list sync configurations
 * POST: Trigger a segment sync to Klaviyo
 */
import { withTenant } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  getKlaviyoSyncConfigs,
  getRfmCustomers,
  getSegmentMembers,
  updateKlaviyoSyncConfig,
} from '@/lib/segments/db'
import type { RfmSegmentType } from '@/lib/segments/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })
  }

  try {
    const configs = await withTenant(tenantSlug, async () => {
      return getKlaviyoSyncConfigs()
    })

    const syncConfigs = configs.map((config) => ({
      id: config.id,
      segmentType: config.segment_type,
      segmentId: config.segment_id,
      klaviyoListId: config.klaviyo_list_id,
      klaviyoListName: config.klaviyo_list_name,
      syncDirection: config.sync_direction,
      lastSyncedAt: config.last_synced_at,
      lastSyncCount: config.last_sync_count,
      enabled: config.enabled,
      hasApiKey: config.api_key_set,
    }))

    return NextResponse.json({ syncConfigs })
  } catch (error) {
    console.error('Failed to fetch Klaviyo sync configs:', error)
    return NextResponse.json({ error: 'Failed to fetch sync configurations' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })
  }

  try {
    const body = await req.json()
    const { configId } = body as { configId?: string }

    if (!configId) {
      return NextResponse.json({ error: 'configId is required' }, { status: 400 })
    }

    const result = await withTenant(tenantSlug, async () => {
      const configs = await getKlaviyoSyncConfigs()
      const config = configs.find((c) => c.id === configId)

      if (!config) {
        return { error: 'Sync configuration not found' }
      }

      if (!config.api_key_set || !config.api_key_encrypted) {
        return { error: 'Klaviyo API key not configured for this sync' }
      }

      if (!config.enabled) {
        return { error: 'This sync configuration is disabled' }
      }

      // Get customers to sync based on segment type
      let customers: Array<{ email: string | null; customerId: string }> = []

      if (config.segment_type === 'rfm') {
        const rfmCustomers = await getRfmCustomers({
          page: 1,
          limit: 10000, // Sync up to 10k customers at a time
          offset: 0,
          search: '',
          segment: config.segment_id as RfmSegmentType,
          minRfmScore: null,
          maxRfmScore: null,
          sort: 'rfm_score',
          dir: 'desc',
        })
        customers = rfmCustomers.rows
          .filter((c) => c.customer_email)
          .map((c) => ({
            email: c.customer_email,
            customerId: c.customer_id,
          }))
      } else if (config.segment_type === 'shopify') {
        const members = await getSegmentMembers(config.segment_id, 10000, 0)
        customers = members.rows
          .filter((m) => m.customer_email)
          .map((m) => ({
            email: m.customer_email,
            customerId: m.customer_id,
          }))
      }

      // In production, this would call the Klaviyo API to add profiles to a list
      // For now, we just simulate the sync
      /*
      const apiKey = decrypt(config.api_key_encrypted)

      for (const customer of customers) {
        if (!customer.email) continue

        await fetch('https://a.klaviyo.com/api/profiles', {
          method: 'POST',
          headers: {
            'Authorization': `Klaviyo-API-Key ${apiKey}`,
            'revision': '2024-02-15',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            data: {
              type: 'profile',
              attributes: {
                email: customer.email,
              },
            },
          }),
        })

        // Add to list
        await fetch(`https://a.klaviyo.com/api/lists/${config.klaviyo_list_id}/relationships/profiles`, {
          method: 'POST',
          headers: {
            'Authorization': `Klaviyo-API-Key ${apiKey}`,
            'revision': '2024-02-15',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            data: [{ type: 'profile', id: profileId }],
          }),
        })
      }
      */

      // Update sync timestamp
      await updateKlaviyoSyncConfig(config.id, {
        lastSyncedAt: new Date().toISOString(),
        lastSyncCount: customers.length,
      })

      return {
        success: true,
        syncedCount: customers.length,
        syncedAt: new Date().toISOString(),
        note: 'In production, customers would be synced to Klaviyo. This is a simulation.',
      }
    })

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to sync to Klaviyo:', error)
    return NextResponse.json({ error: 'Failed to sync to Klaviyo' }, { status: 500 })
  }
}
