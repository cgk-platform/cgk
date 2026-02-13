export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { withTenant, sql } from '@cgk-platform/db'
import type { SlackBlock } from '@cgk-platform/slack'

interface TemplateRecord {
  id: string
  tenantId: string
  notificationType: string
  blocks: unknown
  fallbackText: string
  version: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

/**
 * GET /api/admin/notifications/slack/templates/[type]
 * Gets a specific template
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ type: string }> },
) {
  const { type } = await params
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  try {
    const result = await withTenant(tenantSlug, async () => {
      return sql<TemplateRecord>`
        SELECT
          id,
          tenant_id as "tenantId",
          notification_type as "notificationType",
          blocks,
          fallback_text as "fallbackText",
          version,
          is_active as "isActive",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM tenant_slack_templates
        WHERE notification_type = ${type}
          AND is_active = true
        LIMIT 1
      `
    })

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    return NextResponse.json({ template: result.rows[0] })
  } catch (error) {
    console.error('Failed to get Slack template:', error)
    return NextResponse.json(
      { error: 'Failed to get template' },
      { status: 500 },
    )
  }
}

/**
 * PUT /api/admin/notifications/slack/templates/[type]
 * Updates or creates a template
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ type: string }> },
) {
  const { type } = await params
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: {
    blocks: SlackBlock[]
    fallbackText: string
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.blocks || !body.fallbackText) {
    return NextResponse.json(
      { error: 'blocks and fallbackText are required' },
      { status: 400 },
    )
  }

  try {
    const result = await withTenant(tenantSlug, async () => {
      return sql<TemplateRecord>`
        INSERT INTO tenant_slack_templates (
          tenant_id,
          notification_type,
          blocks,
          fallback_text,
          version,
          is_active
        ) VALUES (
          ${tenantSlug},
          ${type},
          ${JSON.stringify(body.blocks)},
          ${body.fallbackText},
          1,
          true
        )
        ON CONFLICT (tenant_id, notification_type) DO UPDATE SET
          blocks = EXCLUDED.blocks,
          fallback_text = EXCLUDED.fallback_text,
          version = tenant_slack_templates.version + 1,
          is_active = true,
          updated_at = NOW()
        RETURNING
          id,
          tenant_id as "tenantId",
          notification_type as "notificationType",
          blocks,
          fallback_text as "fallbackText",
          version,
          is_active as "isActive",
          created_at as "createdAt",
          updated_at as "updatedAt"
      `
    })

    return NextResponse.json({ template: result.rows[0] })
  } catch (error) {
    console.error('Failed to update Slack template:', error)
    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 },
    )
  }
}
