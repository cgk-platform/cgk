/**
 * User Invitation API
 *
 * POST /api/platform/users/invite - Send user invitation
 * GET /api/platform/users/invite?organizationId=xxx - Get pending invitations
 */

import { requireAuth } from '@cgk-platform/auth'
import { createLogger } from '@cgk-platform/logging'
import {
  createInvitation,
  getOrganizationInvitations,
  markInvitationSent,
  revokeInvitation,
  toUserInvitations,
} from '@cgk-platform/onboarding'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const logger = createLogger({
  meta: { service: 'orchestrator', component: 'user-invite-api' },
})

/**
 * GET /api/platform/users/invite?organizationId=xxx
 *
 * Get pending invitations for an organization
 */
export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req)

    const url = new URL(req.url)
    const organizationId = url.searchParams.get('organizationId')

    if (!organizationId) {
      return Response.json(
        { error: 'organizationId required' },
        { status: 400 }
      )
    }

    // Check user has access to organization (super admin or org member)
    if (auth.role !== 'super_admin') {
      const hasAccess = auth.orgs.some((org) => org.id === organizationId)
      if (!hasAccess) {
        return Response.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const invitations = await getOrganizationInvitations(organizationId)

    return Response.json({
      invitations: toUserInvitations(invitations),
    })
  } catch (error) {
    logger.error('Failed to get invitations', error as Error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/platform/users/invite
 *
 * Create and send a user invitation
 */
export async function POST(req: Request) {
  try {
    const auth = await requireAuth(req)

    const body = await req.json() as {
      organizationId: string
      email: string
      role: 'admin' | 'member'
    }

    const { organizationId, email, role = 'member' } = body

    if (!organizationId || !email) {
      return Response.json(
        { error: 'organizationId and email required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailPattern.test(email)) {
      return Response.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Check user has access to invite (super admin or org admin/owner)
    if (auth.role !== 'super_admin') {
      const orgAccess = auth.orgs.find((org) => org.id === organizationId)
      if (!orgAccess || !['owner', 'admin'].includes(orgAccess.role)) {
        return Response.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    logger.info('Creating invitation', {
      organizationId,
      email,
      role,
      invitedBy: auth.userId,
    })

    // Create invitation
    const { invitation, token } = await createInvitation(
      organizationId,
      email,
      role,
      auth.userId
    )

    // TODO: Send invitation email via communications package
    // For now, just mark as sent
    // await sendInvitationEmail(email, token, organizationId)
    await markInvitationSent(invitation.id)

    logger.info('Invitation created', {
      invitationId: invitation.id,
      email,
    })

    return Response.json(
      {
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          status: 'sent',
        },
        // Include token for development/testing
        // In production, this should only be sent via email
        ...(process.env.NODE_ENV === 'development' && { token }),
      },
      { status: 201 }
    )
  } catch (error) {
    const errorMessage = (error as Error).message

    if (errorMessage.includes('already pending')) {
      return Response.json(
        { error: 'Invitation already pending for this email' },
        { status: 409 }
      )
    }

    logger.error('Failed to create invitation', error as Error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/platform/users/invite
 *
 * Revoke a pending invitation
 */
export async function DELETE(req: Request) {
  try {
    const auth = await requireAuth(req)

    const url = new URL(req.url)
    const invitationId = url.searchParams.get('invitationId')

    if (!invitationId) {
      return Response.json(
        { error: 'invitationId required' },
        { status: 400 }
      )
    }

    // Note: In a full implementation, we'd check the invitation exists
    // and verify the user has permission to revoke it

    logger.info('Revoking invitation', {
      invitationId,
      userId: auth.userId,
    })

    await revokeInvitation(invitationId)

    return Response.json({ success: true })
  } catch (error) {
    logger.error('Failed to revoke invitation', error as Error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
