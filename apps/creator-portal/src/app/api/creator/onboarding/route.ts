/**
 * Creator Onboarding Application API
 *
 * POST /api/creator/onboarding - Submit completed application
 */

import { sql, withTenant, getTenantFromRequest } from '@cgk/db'
import { validateForm } from '../../../../lib/onboarding/validation'
import type { CreatorApplicationForm, SurveyQuestion } from '../../../../lib/onboarding/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface SubmitApplicationRequest {
  formData: CreatorApplicationForm
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  referrer?: string
  metaEventId?: string
}

/**
 * Submit a completed creator application
 */
export async function POST(request: Request): Promise<Response> {
  const tenant = await getTenantFromRequest(request)

  if (!tenant) {
    return Response.json(
      { error: 'Tenant context required' },
      { status: 400 }
    )
  }

  let body: SubmitApplicationRequest
  try {
    body = await request.json()
  } catch {
    return Response.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }

  const { formData, utmSource, utmMedium, utmCampaign, referrer, metaEventId } = body

  if (!formData || !formData.email) {
    return Response.json(
      { error: 'Form data with email is required' },
      { status: 400 }
    )
  }

  // Fetch survey questions for validation
  const surveyQuestions = await withTenant(tenant.slug, async () => {
    const result = await sql<{ survey_questions: SurveyQuestion[] }>`
      SELECT survey_questions FROM tenant_onboarding_settings LIMIT 1
    `
    return result.rows[0]?.survey_questions || []
  })

  // Validate the complete form
  const errors = validateForm(formData, surveyQuestions)
  if (Object.keys(errors).length > 0) {
    return Response.json(
      { error: 'Validation failed', details: errors },
      { status: 400 }
    )
  }

  // Check for existing application with this email
  const existingApplication = await withTenant(tenant.slug, async () => {
    const result = await sql<{ id: string; status: string }>`
      SELECT id, status FROM creator_applications WHERE email = ${formData.email}
    `
    return result.rows[0]
  })

  if (existingApplication) {
    if (existingApplication.status === 'pending') {
      return Response.json(
        { error: 'An application with this email is already pending review' },
        { status: 409 }
      )
    }
    if (existingApplication.status === 'approved') {
      return Response.json(
        { error: 'This email is already associated with an approved creator account' },
        { status: 409 }
      )
    }
  }

  // Create the application
  const application = await withTenant(tenant.slug, async () => {
    const result = await sql<{ id: string }>`
      INSERT INTO creator_applications (
        name,
        email,
        phone,
        instagram,
        tiktok,
        youtube,
        other_social,
        bio,
        why_interested,
        content_categories,
        source,
        utm_source,
        utm_medium,
        utm_campaign,
        status,
        created_at
      ) VALUES (
        ${formData.firstName + ' ' + formData.lastName},
        ${formData.email},
        ${formData.phone},
        ${formData.instagram || null},
        ${formData.tiktok || null},
        ${formData.youtube || null},
        ${JSON.stringify({
          portfolioUrl: formData.portfolioUrl,
          address: {
            line1: formData.addressLine1,
            line2: formData.addressLine2,
            city: formData.city,
            state: formData.state,
            postalCode: formData.postalCode,
            country: formData.country,
          },
          interests: {
            reviews: formData.interestedInReviews,
            promotion: formData.interestedInPromotion,
            tiktokShop: formData.tiktokShopCreator,
            willingTiktokShop: formData.willingToPostTiktokShop,
            collabPosts: formData.openToCollabPosts,
          },
          surveyResponses: formData.surveyResponses,
          metaEventId: metaEventId || null,
          referrer: referrer || null,
        })},
        ${null},
        ${null},
        ${null},
        ${utmSource || 'organic'},
        ${utmSource || null},
        ${utmMedium || null},
        ${utmCampaign || null},
        'new',
        NOW()
      )
      RETURNING id
    `
    return result.rows[0]
  })

  // Delete any existing draft for this email
  await withTenant(tenant.slug, async () => {
    await sql`
      DELETE FROM creator_application_drafts WHERE email = ${formData.email}
    `
  })

  return Response.json({
    success: true,
    applicationId: application?.id ?? null,
    message: 'Application submitted successfully',
  })
}
