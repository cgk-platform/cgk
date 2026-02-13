/**
 * Creator Application Draft API
 *
 * GET /api/creator/onboarding/draft?email=... - Get draft by email
 * POST /api/creator/onboarding/draft - Save draft
 */

import { sql, withTenant, getTenantFromRequest } from '@cgk-platform/db'
import type { CreatorApplicationForm } from '../../../../../lib/onboarding/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface DraftRecord {
  id: string
  email: string
  draft_data: Partial<CreatorApplicationForm>
  step: number
  created_at: string
  updated_at: string
}

/**
 * Get application draft by email
 */
export async function GET(request: Request): Promise<Response> {
  const tenant = await getTenantFromRequest(request)

  if (!tenant) {
    return Response.json(
      { error: 'Tenant context required' },
      { status: 400 }
    )
  }

  const url = new URL(request.url)
  const email = url.searchParams.get('email')

  if (!email) {
    return Response.json(
      { error: 'Email parameter is required' },
      { status: 400 }
    )
  }

  const draft = await withTenant(tenant.slug, async () => {
    const result = await sql<DraftRecord>`
      SELECT id, email, draft_data, step, created_at, updated_at
      FROM creator_application_drafts
      WHERE email = ${email.toLowerCase().trim()}
    `
    return result.rows[0]
  })

  if (!draft) {
    return Response.json(
      { draft: null },
      { status: 200 }
    )
  }

  return Response.json({
    draft: {
      id: draft.id,
      email: draft.email,
      draftData: draft.draft_data,
      step: draft.step,
      createdAt: draft.created_at,
      updatedAt: draft.updated_at,
    },
  })
}

interface SaveDraftRequest {
  email: string
  draftData: Partial<CreatorApplicationForm>
  step: number
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  referrer?: string
}

/**
 * Save or update application draft
 */
export async function POST(request: Request): Promise<Response> {
  const tenant = await getTenantFromRequest(request)

  if (!tenant) {
    return Response.json(
      { error: 'Tenant context required' },
      { status: 400 }
    )
  }

  let body: SaveDraftRequest
  try {
    body = await request.json()
  } catch {
    return Response.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }

  const { email, draftData, step, utmSource, utmMedium, utmCampaign, referrer } = body

  if (!email) {
    return Response.json(
      { error: 'Email is required' },
      { status: 400 }
    )
  }

  if (!draftData || typeof draftData !== 'object') {
    return Response.json(
      { error: 'Draft data is required' },
      { status: 400 }
    )
  }

  const normalizedEmail = email.toLowerCase().trim()

  // Check if user already has a submitted application
  const existingApplication = await withTenant(tenant.slug, async () => {
    const result = await sql<{ id: string; status: string }>`
      SELECT id, status FROM creator_applications
      WHERE email = ${normalizedEmail}
      AND status IN ('pending', 'approved', 'invited')
    `
    return result.rows[0]
  })

  if (existingApplication) {
    return Response.json(
      { error: 'An application already exists for this email' },
      { status: 409 }
    )
  }

  // Upsert the draft
  const result = await withTenant(tenant.slug, async () => {
    const upsertResult = await sql<{ id: string }>`
      INSERT INTO creator_application_drafts (
        email,
        draft_data,
        step,
        utm_source,
        utm_medium,
        utm_campaign,
        referrer,
        updated_at
      ) VALUES (
        ${normalizedEmail},
        ${JSON.stringify(draftData)},
        ${step || 1},
        ${utmSource || null},
        ${utmMedium || null},
        ${utmCampaign || null},
        ${referrer || null},
        NOW()
      )
      ON CONFLICT (email) DO UPDATE SET
        draft_data = ${JSON.stringify(draftData)},
        step = ${step || 1},
        updated_at = NOW()
      RETURNING id
    `
    return upsertResult.rows[0]
  })

  return Response.json({
    success: true,
    draftId: result?.id ?? null,
  })
}
