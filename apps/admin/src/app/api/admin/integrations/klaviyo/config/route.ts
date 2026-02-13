/**
 * Klaviyo Sync Config API
 * GET: List all sync configurations
 * POST: Create a new sync configuration
 * PATCH: Update a sync configuration
 * DELETE: Remove a sync configuration
 */
import { withTenant } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  createKlaviyoSyncConfig,
  deleteKlaviyoSyncConfig,
  getKlaviyoSyncConfigs,
  updateKlaviyoSyncConfig,
} from '@/lib/segments/db'
import type { KlaviyoSyncDirection } from '@/lib/segments/types'

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

    return NextResponse.json({
      configs: configs.map((config) => ({
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
        createdAt: config.created_at,
        updatedAt: config.updated_at,
      })),
    })
  } catch (error) {
    console.error('Failed to fetch Klaviyo sync configs:', error)
    return NextResponse.json({ error: 'Failed to fetch configurations' }, { status: 500 })
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
    const { segmentType, segmentId, klaviyoListId, klaviyoListName, syncDirection, apiKey } = body as {
      segmentType?: 'shopify' | 'rfm'
      segmentId?: string
      klaviyoListId?: string
      klaviyoListName?: string
      syncDirection?: KlaviyoSyncDirection
      apiKey?: string
    }

    if (!segmentType || !segmentId || !klaviyoListId) {
      return NextResponse.json(
        { error: 'segmentType, segmentId, and klaviyoListId are required' },
        { status: 400 }
      )
    }

    if (!['shopify', 'rfm'].includes(segmentType)) {
      return NextResponse.json({ error: 'segmentType must be "shopify" or "rfm"' }, { status: 400 })
    }

    const config = await withTenant(tenantSlug, async () => {
      // In production, you would encrypt the API key here
      // const encryptedKey = apiKey ? encrypt(apiKey) : undefined

      return createKlaviyoSyncConfig({
        segmentType,
        segmentId,
        klaviyoListId,
        klaviyoListName,
        syncDirection: syncDirection || 'push',
        apiKeyEncrypted: apiKey, // Would be encrypted in production
      })
    })

    return NextResponse.json({
      id: config.id,
      segmentType: config.segment_type,
      segmentId: config.segment_id,
      klaviyoListId: config.klaviyo_list_id,
      klaviyoListName: config.klaviyo_list_name,
      syncDirection: config.sync_direction,
      enabled: config.enabled,
      hasApiKey: config.api_key_set,
    })
  } catch (error) {
    console.error('Failed to create Klaviyo sync config:', error)

    // Handle unique constraint violation
    if (error instanceof Error && error.message.includes('unique')) {
      return NextResponse.json(
        { error: 'A sync configuration for this segment and list already exists' },
        { status: 409 }
      )
    }

    return NextResponse.json({ error: 'Failed to create configuration' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })
  }

  try {
    const body = await req.json()
    const { id, ...updates } = body as {
      id?: string
      segmentType?: 'shopify' | 'rfm'
      segmentId?: string
      klaviyoListId?: string
      klaviyoListName?: string
      syncDirection?: KlaviyoSyncDirection
      enabled?: boolean
      apiKey?: string
    }

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const config = await withTenant(tenantSlug, async () => {
      // In production, encrypt new API key if provided
      // const encryptedKey = updates.apiKey ? encrypt(updates.apiKey) : undefined

      return updateKlaviyoSyncConfig(id, {
        segmentType: updates.segmentType,
        segmentId: updates.segmentId,
        klaviyoListId: updates.klaviyoListId,
        klaviyoListName: updates.klaviyoListName,
        syncDirection: updates.syncDirection,
        enabled: updates.enabled,
        apiKeyEncrypted: updates.apiKey, // Would be encrypted in production
      })
    })

    if (!config) {
      return NextResponse.json({ error: 'Configuration not found' }, { status: 404 })
    }

    return NextResponse.json({
      id: config.id,
      segmentType: config.segment_type,
      segmentId: config.segment_id,
      klaviyoListId: config.klaviyo_list_id,
      klaviyoListName: config.klaviyo_list_name,
      syncDirection: config.sync_direction,
      enabled: config.enabled,
      hasApiKey: config.api_key_set,
    })
  } catch (error) {
    console.error('Failed to update Klaviyo sync config:', error)
    return NextResponse.json({ error: 'Failed to update configuration' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })
  }

  const url = new URL(req.url)
  const id = url.searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'id parameter is required' }, { status: 400 })
  }

  try {
    const deleted = await withTenant(tenantSlug, async () => {
      return deleteKlaviyoSyncConfig(id)
    })

    if (!deleted) {
      return NextResponse.json({ error: 'Configuration not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete Klaviyo sync config:', error)
    return NextResponse.json({ error: 'Failed to delete configuration' }, { status: 500 })
  }
}
