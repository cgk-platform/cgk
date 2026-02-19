/**
 * Complete Onboarding Wizard API
 *
 * POST /api/creator/onboarding-wizard/complete - Mark wizard as complete
 */

import { sql, withTenant, getTenantFromRequest } from '@cgk-platform/db'
import type { OnboardingWizardData } from '../../../../../lib/onboarding-wizard/types'
import { areAllRequiredStepsComplete } from '../../../../../lib/onboarding-wizard/validation'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface CompleteWizardRequest {
  wizardData: OnboardingWizardData
}

/**
 * Mark onboarding wizard as complete
 *
 * This finalizes the creator's onboarding:
 * 1. Validates all required steps are complete
 * 2. Updates the creator's profile with collected data
 * 3. Marks the wizard as completed
 * 4. Activates the creator account
 */
export async function POST(request: Request): Promise<Response> {
  const tenant = await getTenantFromRequest(request)

  if (!tenant) {
    return Response.json(
      { error: 'Tenant context required' },
      { status: 400 }
    )
  }

  let body: CompleteWizardRequest
  try {
    body = await request.json()
  } catch {
    return Response.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }

  const { wizardData } = body

  if (!wizardData) {
    return Response.json(
      { error: 'Wizard data is required' },
      { status: 400 }
    )
  }

  // Validate all required steps are complete
  if (!areAllRequiredStepsComplete(wizardData)) {
    return Response.json(
      { error: 'Please complete all required steps before finishing' },
      { status: 400 }
    )
  }

  // Get creatorId ONLY from authenticated session header (set by middleware)
  // NEVER trust creatorId from the request body — that enables account takeover
  const creatorId = request.headers.get('x-creator-id')
  if (!creatorId) {
    return Response.json(
      { error: 'Authentication required - missing creator session' },
      { status: 401 }
    )
  }

  const completedAt = new Date().toISOString()

  // Update wizard progress as completed
  const completedWizardData: OnboardingWizardData = {
    ...wizardData,
    completedAt,
    lastUpdatedAt: completedAt,
  }

  await withTenant(tenant.slug, async () => {
    // Update wizard progress
    await sql`
      UPDATE creator_onboarding_wizard_progress
      SET
        wizard_data = ${JSON.stringify(completedWizardData)},
        updated_at = NOW()
      WHERE creator_id = ${creatorId}
    `

    // Update creator profile with collected data
    await sql`
      UPDATE creators
      SET
        display_name = ${wizardData.profile.displayName},
        bio = ${wizardData.profile.bio},
        photo_url = ${wizardData.profile.photoUrl},
        pronouns = ${wizardData.profile.pronouns || null},
        location = ${wizardData.profile.location || null},
        website = ${wizardData.profile.website || null},
        social_connections = ${JSON.stringify(wizardData.social.connections)},
        primary_platform = ${wizardData.social.primaryPlatform},
        payment_method = ${wizardData.payment.method},
        stripe_connect_id = ${wizardData.payment.stripeConnectId},
        tax_form_type = ${wizardData.tax.formType},
        tax_form_signed = ${Boolean(wizardData.tax.signatureData)},
        onboarding_completed_at = NOW(),
        status = 'active',
        updated_at = NOW()
      WHERE id = ${creatorId}
    `

    // Record agreement signatures
    for (const agreement of wizardData.agreement.agreements) {
      if (agreement.signed) {
        await sql`
          INSERT INTO creator_agreement_signatures (
            creator_id,
            document_id,
            signed_at,
            signature_data
          ) VALUES (
            ${creatorId},
            ${agreement.documentId},
            ${agreement.signedAt},
            ${agreement.signatureData}
          )
          ON CONFLICT (creator_id, document_id) DO UPDATE SET
            signed_at = ${agreement.signedAt},
            signature_data = ${agreement.signatureData}
        `
      }
    }
  })

  return Response.json({
    success: true,
    completedAt,
    message: 'Onboarding completed successfully',
  })
}
