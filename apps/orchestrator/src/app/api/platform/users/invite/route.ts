/**
 * User Invitation API
 *
 * POST /api/platform/users/invite - Send user invitation
 * GET /api/platform/users/invite?organizationId=xxx - Get pending invitations
 */

import { requireAuth } from '@cgk-platform/auth'
import {
  getTenantResendClient,
  getTenantResendSenderConfig,
} from '@cgk-platform/integrations'
import { createLogger } from '@cgk-platform/logging'
import {
  createInvitation,
  getOrganization,
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

    // Get organization details for the email
    const organization = await getOrganization(organizationId)
    const orgName = organization?.name || 'the platform'
    const orgSlug = organization?.slug || ''

    // Try to send invitation email via tenant's Resend client
    let emailSent = false
    if (orgSlug) {
      const resend = await getTenantResendClient(orgSlug)
      if (resend) {
        const senderConfig = await getTenantResendSenderConfig(orgSlug)
        const fromEmail = senderConfig?.from || `noreply@${orgSlug}.com`
        const acceptUrl = `${process.env.NEXT_PUBLIC_ORCHESTRATOR_URL || 'https://orchestrator.cgk.com'}/accept-invite?token=${token}`

        try {
          await resend.emails.send({
            from: fromEmail,
            to: email,
            replyTo: senderConfig?.replyTo,
            subject: `You've been invited to join ${orgName}`,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>You've been invited to join ${orgName}</h2>
                <p>You've been invited to join <strong>${orgName}</strong> as a ${role}.</p>
                <p>Click the button below to accept your invitation and create your account:</p>
                <p style="margin: 24px 0;">
                  <a href="${acceptUrl}" style="background-color: #1e3a5f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                    Accept Invitation
                  </a>
                </p>
                <p style="color: #666; font-size: 14px;">
                  This invitation will expire in 7 days.
                </p>
                <p style="color: #666; font-size: 14px;">
                  If you didn't expect this invitation, you can safely ignore this email.
                </p>
              </div>
            `,
          })
          emailSent = true
          logger.info('Invitation email sent', { email, organizationId })
        } catch (emailError) {
          logger.error('Failed to send invitation email', emailError as Error, {
            email,
            organizationId,
          })
        }
      } else {
        logger.warn('Resend not configured for tenant, skipping email', {
          tenantSlug: orgSlug,
        })
      }
    }

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
        emailSent,
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
