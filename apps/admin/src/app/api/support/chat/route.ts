/**
 * Public Chat Session API
 *
 * POST /api/support/chat - Start a new chat session
 * GET /api/support/chat - Get widget config (for embedding)
 *
 * @ai-pattern api-route
 * @ai-note Public endpoint - uses tenant header instead of auth
 */

import { NextRequest, NextResponse } from 'next/server'

import { getTenantContext } from '@cgk/auth'
import {
  createChatSession,
  getWidgetConfig,
  isWithinBusinessHours,
  type CreateChatSessionInput,
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
    console.error('[support/chat] GET error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch config' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const { tenantId } = await getTenantContext(req)

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant context required' },
        { status: 400 }
      )
    }

    const body = await req.json() as CreateChatSessionInput

    if (!body.visitorId) {
      return NextResponse.json(
        { error: 'Visitor ID is required' },
        { status: 400 }
      )
    }

    // Validate email if provided
    if (body.visitorEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(body.visitorEmail)) {
        return NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        )
      }
    }

    // Check if within business hours
    const isOnline = await isWithinBusinessHours(tenantId)
    const config = await getWidgetConfig(tenantId)

    const session = await createChatSession(tenantId, body)

    return NextResponse.json({
      session,
      isOnline,
      offlineMessage: !isOnline ? config.offlineMessage : null,
    }, { status: 201 })
  } catch (error) {
    console.error('[support/chat] POST error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start chat' },
      { status: 500 }
    )
  }
}
