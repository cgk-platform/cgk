/**
 * Video CTA Buttons API
 *
 * GET /api/admin/videos/[id]/cta - Get CTA buttons for video
 * PUT /api/admin/videos/[id]/cta - Replace all CTA buttons
 */

export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  CTA_VALIDATION,
  getCTAButtons,
  replaceCTAButtons,
  validateCTAInput,
  type CTAButtonInput,
} from '@cgk-platform/video/creator-tools'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: RouteParams) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const { id: videoId } = await params
  const buttons = await getCTAButtons(tenantSlug, videoId)

  return NextResponse.json({ buttons })
}

export async function PUT(request: Request, { params }: RouteParams) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const userId = headerList.get('x-user-id')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const { id: videoId } = await params

  let body: { buttons: CTAButtonInput[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!Array.isArray(body.buttons)) {
    return NextResponse.json({ error: 'buttons must be an array' }, { status: 400 })
  }

  if (body.buttons.length > CTA_VALIDATION.maxButtons) {
    return NextResponse.json(
      { error: `Maximum of ${CTA_VALIDATION.maxButtons} CTA buttons allowed` },
      { status: 400 }
    )
  }

  // Validate each button
  const allErrors: string[] = []
  for (let i = 0; i < body.buttons.length; i++) {
    const button = body.buttons[i]
    if (!button) continue
    const validation = validateCTAInput(button)
    if (!validation.valid) {
      allErrors.push(`Button ${i + 1}: ${validation.errors.join(', ')}`)
    }
  }

  if (allErrors.length > 0) {
    return NextResponse.json({ error: allErrors.join('; ') }, { status: 400 })
  }

  try {
    const buttons = await replaceCTAButtons(tenantSlug, videoId, body.buttons)
    return NextResponse.json({ buttons })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update CTA buttons'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
