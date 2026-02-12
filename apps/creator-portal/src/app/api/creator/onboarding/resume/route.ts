/**
 * Creator Application Resume API
 *
 * GET /api/creator/onboarding/resume?id=... - Get application by ID for resume
 * PATCH /api/creator/onboarding/resume - Update application progress
 */

import { sql, withTenant, getTenantFromRequest } from '@cgk/db'
import type { CreatorApplicationForm } from '../../../../../lib/onboarding/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface ApplicationRecord {
  id: string
  email: string
  name: string
  phone: string | null
  instagram: string | null
  tiktok: string | null
  youtube: string | null
  other_social: Record<string, unknown>
  status: string
  created_at: string
}

interface DraftRecord {
  id: string
  email: string
  draft_data: Partial<CreatorApplicationForm>
  step: number
}

/**
 * Get application or draft by ID for resume functionality
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
  const id = url.searchParams.get('id')
  const email = url.searchParams.get('email')

  if (!id && !email) {
    return Response.json(
      { error: 'Either id or email parameter is required' },
      { status: 400 }
    )
  }

  // First try to find a draft
  let draft: DraftRecord | undefined

  if (id) {
    draft = await withTenant(tenant.slug, async () => {
      const result = await sql<DraftRecord>`
        SELECT id, email, draft_data, step
        FROM creator_application_drafts
        WHERE id = ${id}
      `
      return result.rows[0]
    })
  } else if (email) {
    draft = await withTenant(tenant.slug, async () => {
      const result = await sql<DraftRecord>`
        SELECT id, email, draft_data, step
        FROM creator_application_drafts
        WHERE email = ${email.toLowerCase().trim()}
      `
      return result.rows[0]
    })
  }

  if (draft) {
    return Response.json({
      type: 'draft',
      id: draft.id,
      email: draft.email,
      formData: draft.draft_data,
      step: draft.step,
    })
  }

  // Check for existing application
  let application: ApplicationRecord | undefined

  if (id) {
    application = await withTenant(tenant.slug, async () => {
      const result = await sql<ApplicationRecord>`
        SELECT id, email, name, phone, instagram, tiktok, youtube, other_social, status, created_at
        FROM creator_applications
        WHERE id = ${id}
      `
      return result.rows[0]
    })
  } else if (email) {
    application = await withTenant(tenant.slug, async () => {
      const result = await sql<ApplicationRecord>`
        SELECT id, email, name, phone, instagram, tiktok, youtube, other_social, status, created_at
        FROM creator_applications
        WHERE email = ${email.toLowerCase().trim()}
      `
      return result.rows[0]
    })
  }

  if (application) {
    // Application already submitted
    if (application.status === 'pending') {
      return Response.json({
        type: 'submitted',
        status: 'pending',
        message: 'Your application is currently under review',
        submittedAt: application.created_at,
      })
    }
    if (application.status === 'approved' || application.status === 'invited') {
      return Response.json({
        type: 'submitted',
        status: application.status,
        message: 'Your application has been approved',
      })
    }
    if (application.status === 'rejected') {
      return Response.json({
        type: 'submitted',
        status: 'rejected',
        message: 'Your application was not approved at this time',
      })
    }
  }

  // Nothing found
  return Response.json(
    { type: 'not_found', message: 'No application or draft found' },
    { status: 404 }
  )
}

interface UpdateResumeRequest {
  applicationId: string
  step: number
  formData: Partial<CreatorApplicationForm>
}

/**
 * Update application progress (converts draft updates)
 */
export async function PATCH(request: Request): Promise<Response> {
  const tenant = await getTenantFromRequest(request)

  if (!tenant) {
    return Response.json(
      { error: 'Tenant context required' },
      { status: 400 }
    )
  }

  let body: UpdateResumeRequest
  try {
    body = await request.json()
  } catch {
    return Response.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }

  const { applicationId, step, formData } = body

  if (!applicationId || !formData) {
    return Response.json(
      { error: 'Application ID and form data are required' },
      { status: 400 }
    )
  }

  // Update the draft
  const result = await withTenant(tenant.slug, async () => {
    const updateResult = await sql<{ id: string }>`
      UPDATE creator_application_drafts
      SET
        draft_data = ${JSON.stringify(formData)},
        step = ${step},
        updated_at = NOW()
      WHERE id = ${applicationId}
      RETURNING id
    `
    return updateResult.rows[0]
  })

  if (!result) {
    return Response.json(
      { error: 'Draft not found' },
      { status: 404 }
    )
  }

  return Response.json({
    success: true,
    draftId: result.id,
  })
}
