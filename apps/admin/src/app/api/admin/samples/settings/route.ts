/**
 * Samples Settings API
 * GET: Get sample detection configuration
 * PATCH: Update sample detection configuration
 */
import { withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getSamplesConfig, updateSamplesConfig } from '@/lib/samples/db'
import type { UpdateSamplesConfigInput } from '@/lib/samples/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })
  }

  try {
    const config = await withTenant(tenantSlug, async () => {
      return getSamplesConfig()
    })

    if (!config) {
      // Return defaults if no config exists
      return NextResponse.json({
        id: null,
        ugcTags: ['ugc-sample', 'ugc', 'creator-sample'],
        tiktokTags: ['tiktok-sample', 'tiktok-shop-sample'],
        channelPatterns: ['tiktok%', '%tiktok shop%'],
        zeroPriceOnly: true,
        enabled: true,
        updatedAt: null,
      })
    }

    return NextResponse.json({
      id: config.id,
      ugcTags: config.ugc_tags,
      tiktokTags: config.tiktok_tags,
      channelPatterns: config.channel_patterns,
      zeroPriceOnly: config.zero_price_only,
      enabled: config.enabled,
      updatedAt: config.updated_at,
    })
  } catch (error) {
    console.error('Failed to fetch samples config:', error)
    return NextResponse.json({ error: 'Failed to fetch samples config' }, { status: 500 })
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
    const input: UpdateSamplesConfigInput = {}

    // Validate and extract fields
    if (body.ugcTags !== undefined) {
      if (!Array.isArray(body.ugcTags) || !body.ugcTags.every((t: unknown) => typeof t === 'string')) {
        return NextResponse.json({ error: 'ugcTags must be an array of strings' }, { status: 400 })
      }
      input.ugcTags = body.ugcTags
    }

    if (body.tiktokTags !== undefined) {
      if (!Array.isArray(body.tiktokTags) || !body.tiktokTags.every((t: unknown) => typeof t === 'string')) {
        return NextResponse.json({ error: 'tiktokTags must be an array of strings' }, { status: 400 })
      }
      input.tiktokTags = body.tiktokTags
    }

    if (body.channelPatterns !== undefined) {
      if (!Array.isArray(body.channelPatterns) || !body.channelPatterns.every((t: unknown) => typeof t === 'string')) {
        return NextResponse.json({ error: 'channelPatterns must be an array of strings' }, { status: 400 })
      }
      input.channelPatterns = body.channelPatterns
    }

    if (body.zeroPriceOnly !== undefined) {
      if (typeof body.zeroPriceOnly !== 'boolean') {
        return NextResponse.json({ error: 'zeroPriceOnly must be a boolean' }, { status: 400 })
      }
      input.zeroPriceOnly = body.zeroPriceOnly
    }

    if (body.enabled !== undefined) {
      if (typeof body.enabled !== 'boolean') {
        return NextResponse.json({ error: 'enabled must be a boolean' }, { status: 400 })
      }
      input.enabled = body.enabled
    }

    const config = await withTenant(tenantSlug, async () => {
      return updateSamplesConfig(input)
    })

    return NextResponse.json({
      id: config.id,
      ugcTags: config.ugc_tags,
      tiktokTags: config.tiktok_tags,
      channelPatterns: config.channel_patterns,
      zeroPriceOnly: config.zero_price_only,
      enabled: config.enabled,
      updatedAt: config.updated_at,
    })
  } catch (error) {
    console.error('Failed to update samples config:', error)
    return NextResponse.json({ error: 'Failed to update samples config' }, { status: 500 })
  }
}
