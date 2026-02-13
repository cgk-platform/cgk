/**
 * Creator Onboarding Wizard API
 *
 * GET /api/creator/onboarding-wizard - Get wizard progress
 * POST /api/creator/onboarding-wizard - Save wizard progress
 */

import { sql, withTenant, getTenantFromRequest } from '@cgk-platform/db'
import type { OnboardingWizardData } from '../../../../lib/onboarding-wizard/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface WizardProgressRecord {
  id: string
  creator_id: string
  wizard_data: OnboardingWizardData
  created_at: string
  updated_at: string
}

/**
 * Get wizard progress for authenticated creator
 */
export async function GET(request: Request): Promise<Response> {
  const tenant = await getTenantFromRequest(request)

  if (!tenant) {
    return Response.json(
      { error: 'Tenant context required' },
      { status: 400 }
    )
  }

  // In production, get creatorId from authenticated session
  const creatorId = request.headers.get('x-creator-id') || 'demo-creator'

  const progress = await withTenant(tenant.slug, async () => {
    const result = await sql<WizardProgressRecord>`
      SELECT id, creator_id, wizard_data, created_at, updated_at
      FROM creator_onboarding_wizard_progress
      WHERE creator_id = ${creatorId}
      ORDER BY updated_at DESC
      LIMIT 1
    `
    return result.rows[0]
  })

  if (!progress) {
    return Response.json({ wizardData: null })
  }

  return Response.json({
    wizardData: progress.wizard_data,
    lastUpdated: progress.updated_at,
  })
}

interface SaveWizardRequest {
  wizardData: OnboardingWizardData
}

/**
 * Save wizard progress
 */
export async function POST(request: Request): Promise<Response> {
  const tenant = await getTenantFromRequest(request)

  if (!tenant) {
    return Response.json(
      { error: 'Tenant context required' },
      { status: 400 }
    )
  }

  let body: SaveWizardRequest
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

  // In production, get creatorId from authenticated session
  const creatorId = request.headers.get('x-creator-id') || wizardData.creatorId || 'demo-creator'

  // Update the wizard data with current timestamp
  const updatedWizardData: OnboardingWizardData = {
    ...wizardData,
    creatorId,
    tenantId: tenant.id,
    lastUpdatedAt: new Date().toISOString(),
  }

  // Upsert the progress
  const result = await withTenant(tenant.slug, async () => {
    const upsertResult = await sql<{ id: string }>`
      INSERT INTO creator_onboarding_wizard_progress (
        creator_id,
        wizard_data,
        updated_at
      ) VALUES (
        ${creatorId},
        ${JSON.stringify(updatedWizardData)},
        NOW()
      )
      ON CONFLICT (creator_id) DO UPDATE SET
        wizard_data = ${JSON.stringify(updatedWizardData)},
        updated_at = NOW()
      RETURNING id
    `
    return upsertResult.rows[0]
  })

  return Response.json({
    success: true,
    progressId: result?.id ?? null,
  })
}
