/**
 * User Invitations Service
 *
 * Manages user invitations during onboarding and beyond.
 */

import { createHash, randomBytes } from 'crypto'

import { sql } from '@cgk-platform/db'
import { createLogger } from '@cgk-platform/logging'

import type { UserInvitation } from './types.js'

const logger = createLogger({
  meta: { service: 'onboarding', component: 'invitations' },
})

/**
 * Generate a secure invitation token
 */
function generateToken(): string {
  return randomBytes(32).toString('base64url')
}

/**
 * Hash a token using SHA-256
 */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * Invitation record from database
 */
interface InvitationRecord {
  id: string
  organizationId: string
  email: string
  role: 'admin' | 'member'
  status: 'pending' | 'sent' | 'accepted' | 'expired'
  invitedBy: string | null
  expiresAt: Date
  acceptedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Map database row to invitation record
 */
function mapRowToInvitation(row: Record<string, unknown>): InvitationRecord {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    email: row.email as string,
    role: row.role as 'admin' | 'member',
    status: row.status as 'pending' | 'sent' | 'accepted' | 'expired',
    invitedBy: (row.invited_by as string) || null,
    expiresAt: new Date(row.expires_at as string),
    acceptedAt: row.accepted_at ? new Date(row.accepted_at as string) : null,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}

/**
 * Create a user invitation
 *
 * @returns The invitation record and raw token (for email link)
 */
export async function createInvitation(
  organizationId: string,
  email: string,
  role: 'admin' | 'member',
  invitedBy?: string
): Promise<{ invitation: InvitationRecord; token: string }> {
  logger.info('Creating invitation', { organizationId, email, role })

  // Check if invitation already exists
  const existing = await sql`
    SELECT id, status FROM user_invitations
    WHERE organization_id = ${organizationId}
      AND email = ${email.toLowerCase()}
  `

  if (existing.rows.length > 0) {
    const existingStatus = (existing.rows[0] as Record<string, unknown>).status
    if (existingStatus === 'pending' || existingStatus === 'sent') {
      throw new Error(`Invitation already pending for ${email}`)
    }
    // Delete expired/accepted invitation to allow new one
    await sql`
      DELETE FROM user_invitations
      WHERE organization_id = ${organizationId}
        AND email = ${email.toLowerCase()}
    `
  }

  // Generate token
  const token = generateToken()
  const tokenHash = hashToken(token)

  // Create invitation
  const result = await sql`
    INSERT INTO user_invitations (
      organization_id, email, role, token_hash, invited_by
    )
    VALUES (
      ${organizationId},
      ${email.toLowerCase()},
      ${role},
      ${tokenHash},
      ${invitedBy || null}
    )
    RETURNING *
  `

  const invitation = mapRowToInvitation(result.rows[0] as Record<string, unknown>)

  logger.info('Invitation created', { invitationId: invitation.id })

  return { invitation, token }
}

/**
 * Mark invitation as sent
 */
export async function markInvitationSent(invitationId: string): Promise<void> {
  await sql`
    UPDATE user_invitations
    SET status = 'sent'
    WHERE id = ${invitationId}
  `
}

/**
 * Get invitation by token
 */
export async function getInvitationByToken(token: string): Promise<InvitationRecord | null> {
  const tokenHash = hashToken(token)

  const result = await sql`
    SELECT * FROM user_invitations
    WHERE token_hash = ${tokenHash}
      AND status IN ('pending', 'sent')
      AND expires_at > NOW()
  `

  if (result.rows.length === 0) {
    return null
  }

  return mapRowToInvitation(result.rows[0] as Record<string, unknown>)
}

/**
 * Accept an invitation
 */
export async function acceptInvitation(token: string, userId: string): Promise<InvitationRecord> {
  const invitation = await getInvitationByToken(token)
  if (!invitation) {
    throw new Error('Invalid or expired invitation')
  }

  logger.info('Accepting invitation', {
    invitationId: invitation.id,
    userId,
    organizationId: invitation.organizationId,
  })

  // Mark invitation as accepted
  await sql`
    UPDATE user_invitations
    SET status = 'accepted', accepted_at = NOW()
    WHERE id = ${invitation.id}
  `

  // Add user to organization
  await sql`
    INSERT INTO user_organizations (user_id, organization_id, role)
    VALUES (${userId}, ${invitation.organizationId}, ${invitation.role})
    ON CONFLICT (user_id, organization_id) DO UPDATE
    SET role = ${invitation.role}
  `

  return {
    ...invitation,
    status: 'accepted',
    acceptedAt: new Date(),
  }
}

/**
 * Get pending invitations for an organization
 */
export async function getOrganizationInvitations(
  organizationId: string,
  options?: { includeExpired?: boolean }
): Promise<InvitationRecord[]> {
  const result = options?.includeExpired
    ? await sql`
        SELECT * FROM user_invitations
        WHERE organization_id = ${organizationId}
        ORDER BY created_at DESC
      `
    : await sql`
        SELECT * FROM user_invitations
        WHERE organization_id = ${organizationId}
          AND status IN ('pending', 'sent')
          AND expires_at > NOW()
        ORDER BY created_at DESC
      `

  return result.rows.map((row) => mapRowToInvitation(row as Record<string, unknown>))
}

/**
 * Revoke an invitation
 */
export async function revokeInvitation(invitationId: string): Promise<void> {
  logger.info('Revoking invitation', { invitationId })

  await sql`
    DELETE FROM user_invitations
    WHERE id = ${invitationId}
      AND status IN ('pending', 'sent')
  `
}

/**
 * Resend an invitation (regenerate token and reset expiry)
 *
 * @returns New token for the invitation
 */
export async function resendInvitation(invitationId: string): Promise<string> {
  logger.info('Resending invitation', { invitationId })

  const token = generateToken()
  const tokenHash = hashToken(token)

  await sql`
    UPDATE user_invitations
    SET
      token_hash = ${tokenHash},
      status = 'pending',
      expires_at = NOW() + INTERVAL '7 days'
    WHERE id = ${invitationId}
      AND status IN ('pending', 'sent')
  `

  return token
}

/**
 * Clean up expired invitations
 * Should be run by a background job
 */
export async function cleanupExpiredInvitations(): Promise<number> {
  const result = await sql`
    UPDATE user_invitations
    SET status = 'expired'
    WHERE status IN ('pending', 'sent')
      AND expires_at < NOW()
    RETURNING id
  `

  const count = result.rows.length
  if (count > 0) {
    logger.info('Cleaned up expired invitations', { count })
  }

  return count
}

/**
 * Convert invitations to UserInvitation type for UI
 */
export function toUserInvitations(invitations: InvitationRecord[]): UserInvitation[] {
  return invitations.map((inv) => ({
    id: inv.id,
    email: inv.email,
    role: inv.role,
    status: inv.status,
    invitedAt: inv.createdAt,
  }))
}
