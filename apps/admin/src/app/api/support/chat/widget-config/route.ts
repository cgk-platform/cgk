/**
 * Public Widget Config API
 *
 * GET /api/support/chat/widget-config - Get public widget configuration
 *
 * @ai-pattern api-route
 * @ai-note Public endpoint for widget embedding
 */

import { NextRequest, NextResponse } from 'next/server'

import { getTenantContext } from '@cgk/auth'
import { getWidgetConfig, isWithinBusinessHours } from '@cgk/support'

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

    // Return only public-facing config properties
    return NextResponse.json({
      primaryColor: config.primaryColor,
      secondaryColor: config.secondaryColor,
      headerText: config.headerText,
      greetingMessage: config.greetingMessage,
      position: config.position,
      offsetX: config.offsetX,
      offsetY: config.offsetY,
      autoOpenDelaySeconds: config.autoOpenDelaySeconds,
      showAgentTyping: config.showAgentTyping,
      showReadReceipts: config.showReadReceipts,
      offlineMessage: config.offlineMessage,
      fileUploadEnabled: config.fileUploadEnabled,
      maxFileSizeMb: config.maxFileSizeMb,
      allowedFileTypes: config.allowedFileTypes,
      isOnline,
    })
  } catch (error) {
    console.error('[support/chat/widget-config] GET error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch config' },
      { status: 500 }
    )
  }
}
