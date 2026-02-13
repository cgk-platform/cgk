/**
 * E-Signature Template Fields API
 *
 * GET /api/admin/esign/templates/[id]/fields - Get template fields
 * POST /api/admin/esign/templates/[id]/fields - Save template fields (bulk replace)
 */

import { getTenantContext, requireAuth } from '@cgk-platform/auth'
import { getTemplateFields, replaceTemplateFields, getTemplate, type FieldType } from '@cgk-platform/esign'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { tenantId } = await getTenantContext(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant required' }, { status: 400 })
    }

    const { id: templateId } = await params

    const fields = await getTemplateFields(tenantId, templateId)

    return NextResponse.json({ fields })
  } catch (error) {
    console.error('Error fetching template fields:', error)
    return NextResponse.json(
      { error: 'Failed to fetch template fields' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const auth = await requireAuth(request)
    if (!auth.tenantId) {
      return NextResponse.json({ error: 'Tenant required' }, { status: 400 })
    }

    const { id: templateId } = await params

    // Verify template exists
    const template = await getTemplate(auth.tenantId, templateId)
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    const body = await request.json()
    const { fields } = body

    if (!Array.isArray(fields)) {
      return NextResponse.json({ error: 'Fields must be an array' }, { status: 400 })
    }

    // Validate fields
    for (const field of fields) {
      if (!field.type) {
        return NextResponse.json({ error: 'Each field must have a type' }, { status: 400 })
      }
      if (typeof field.page !== 'number' || field.page < 1) {
        return NextResponse.json({ error: 'Each field must have a valid page number' }, { status: 400 })
      }
      if (typeof field.x !== 'number' || field.x < 0 || field.x > 100) {
        return NextResponse.json({ error: 'Field x must be a percentage between 0 and 100' }, { status: 400 })
      }
      if (typeof field.y !== 'number' || field.y < 0 || field.y > 100) {
        return NextResponse.json({ error: 'Field y must be a percentage between 0 and 100' }, { status: 400 })
      }
      if (typeof field.width !== 'number' || field.width <= 0) {
        return NextResponse.json({ error: 'Field width must be a positive number' }, { status: 400 })
      }
      if (typeof field.height !== 'number' || field.height <= 0) {
        return NextResponse.json({ error: 'Field height must be a positive number' }, { status: 400 })
      }
    }

    // Replace all fields
    const savedFields = await replaceTemplateFields(
      auth.tenantId,
      templateId,
      fields.map((f: Record<string, unknown>) => ({
        type: f.type as FieldType,
        page: f.page as number,
        x: f.x as number,
        y: f.y as number,
        width: f.width as number,
        height: f.height as number,
        required: f.required as boolean | undefined,
        placeholder: f.placeholder as string | undefined,
        default_value: f.defaultValue as string | undefined,
        options: f.options as Array<{ label: string; value: string }> | undefined,
        validation: f.validation as Record<string, unknown> | undefined,
        group_id: f.groupId as string | undefined,
        formula: f.formula as string | undefined,
        read_only: f.readOnly as boolean | undefined,
        signer_order: f.signerOrder as number | undefined,
      }))
    )

    return NextResponse.json({ fields: savedFields })
  } catch (error) {
    console.error('Error saving template fields:', error)
    return NextResponse.json(
      { error: 'Failed to save template fields' },
      { status: 500 }
    )
  }
}
