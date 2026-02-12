/**
 * Chat Widget Configuration API
 *
 * GET /api/admin/support/chat/config - Get widget configuration
 * PATCH /api/admin/support/chat/config - Update widget configuration
 *
 * @ai-pattern api-route
 * @ai-required Uses getTenantContext for tenant isolation
 */

import { type NextRequest, NextResponse } from 'next/server'

import { getTenantContext } from '@cgk/auth'
import {
  getWidgetConfig,
  isWithinBusinessHours,
  updateWidgetConfig,
  type UpdateWidgetConfigInput,
} from '@cgk/support'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: NextRequest) {
  try {
    const { tenantId } = await getTenantContext(req)

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant context required' },
        { status: 400 }
      )
    }

    const [config, isOnline] = await Promise.all([
      getWidgetConfig(tenantId),
      isWithinBusinessHours(tenantId),
    ])

    return NextResponse.json({
      config,
      isOnline,
    })
  } catch (error) {
    console.error('[chat/config] GET error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch config' },
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { tenantId } = await getTenantContext(req)

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant context required' },
        { status: 400 }
      )
    }

    const body = await req.json() as UpdateWidgetConfigInput

    // Validate color formats
    if (body.primaryColor && !/^#[0-9A-Fa-f]{6}$/.test(body.primaryColor)) {
      return NextResponse.json(
        { error: 'Invalid primary color format. Use hex format (e.g., #374d42)' },
        { status: 400 }
      )
    }

    if (body.secondaryColor && !/^#[0-9A-Fa-f]{6}$/.test(body.secondaryColor)) {
      return NextResponse.json(
        { error: 'Invalid secondary color format. Use hex format (e.g., #3d3d3d)' },
        { status: 400 }
      )
    }

    // Validate position
    if (body.position && !['bottom-right', 'bottom-left'].includes(body.position)) {
      return NextResponse.json(
        { error: 'Invalid position. Use bottom-right or bottom-left' },
        { status: 400 }
      )
    }

    // Validate offsets
    if (body.offsetX !== undefined && (body.offsetX < 0 || body.offsetX > 100)) {
      return NextResponse.json(
        { error: 'Offset X must be between 0 and 100' },
        { status: 400 }
      )
    }

    if (body.offsetY !== undefined && (body.offsetY < 0 || body.offsetY > 100)) {
      return NextResponse.json(
        { error: 'Offset Y must be between 0 and 100' },
        { status: 400 }
      )
    }

    // Validate max file size
    if (body.maxFileSizeMb !== undefined && (body.maxFileSizeMb < 1 || body.maxFileSizeMb > 50)) {
      return NextResponse.json(
        { error: 'Max file size must be between 1 and 50 MB' },
        { status: 400 }
      )
    }

    const config = await updateWidgetConfig(tenantId, body)

    return NextResponse.json({ config })
  } catch (error) {
    console.error('[chat/config] PATCH error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update config' },
      { status: 500 }
    )
  }
}
