/**
 * Step 1 API - Create Organization
 *
 * POST /api/platform/brands/onboard/step-1 - Create organization from basic info
 */

import { requireAuth } from '@cgk/auth'
import { createLogger } from '@cgk/logging'
import {
  addUserToOrganization,
  createOrganization,
  getSession,
  updateSession,
  validateBasicInfo,
  type BasicInfoData,
} from '@cgk/onboarding'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const logger = createLogger({
  meta: { service: 'orchestrator', component: 'onboard-step1-api' },
})

/**
 * POST /api/platform/brands/onboard/step-1
 *
 * Creates the organization and tenant schema
 */
export async function POST(req: Request) {
  try {
    const auth = await requireAuth(req)

    if (auth.role !== 'super_admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json() as {
      sessionId: string
      data: BasicInfoData
    }

    const { sessionId, data } = body

    // Validate session
    const session = await getSession(sessionId)
    if (!session) {
      return Response.json({ error: 'Session not found' }, { status: 404 })
    }

    if (session.createdBy !== auth.userId && auth.role !== 'super_admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Validate data
    const validation = validateBasicInfo(data)
    if (!validation.valid) {
      return Response.json(
        { error: 'Validation failed', errors: validation.errors },
        { status: 400 }
      )
    }

    // Check if organization already created for this session
    if (session.organizationId) {
      return Response.json({
        organization: { id: session.organizationId, slug: data.slug },
        message: 'Organization already created for this session',
      })
    }

    // Create organization and tenant schema
    logger.info('Creating organization', { sessionId, slug: data.slug })

    const organization = await createOrganization(data)

    // Add creator as owner
    await addUserToOrganization(auth.userId, organization.id, 'owner')

    // Update session with organization ID
    await updateSession(sessionId, {
      organizationId: organization.id,
      stepData: {
        ...session.stepData,
        basicInfo: data,
      },
    })

    logger.info('Organization created', {
      organizationId: organization.id,
      slug: organization.slug,
      sessionId,
    })

    return Response.json({ organization }, { status: 201 })
  } catch (error) {
    const errorMessage = (error as Error).message

    if (errorMessage.includes('already taken')) {
      return Response.json(
        { error: 'Slug already taken', field: 'slug' },
        { status: 409 }
      )
    }

    if (errorMessage.includes('Invalid slug')) {
      return Response.json(
        { error: 'Invalid slug format', field: 'slug' },
        { status: 400 }
      )
    }

    logger.error('Failed to create organization', error as Error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
