import { sql } from '@cgk-platform/db'
import { nanoid } from 'nanoid'

import { sha256 } from './crypto'
import type { UserRole } from './types'

const INVITATION_TOKEN_LENGTH = 48
const INVITATION_EXPIRATION_DAYS = 7

/**
 * Team member with role and invitation details
 */
export interface TeamMember {
  id: string
  userId: string
  email: string
  name: string | null
  avatarUrl: string | null
  role: UserRole
  status: 'active' | 'invited'
  joinedAt: Date | null
  invitedAt: Date
  invitedBy: {
    id: string
    name: string | null
    email: string
  } | null
}

/**
 * Team invitation record
 */
export interface TeamInvitation {
  id: string
  email: string
  role: UserRole
  status: 'pending' | 'accepted' | 'expired' | 'revoked'
  message: string | null
  invitedBy: {
    id: string
    name: string | null
    email: string
  }
  expiresAt: Date
  createdAt: Date
  acceptedAt: Date | null
}

/**
 * Audit log entry
 */
export interface TeamAuditEntry {
  id: string
  actorId: string
  actorName: string | null
  actorEmail: string
  action: string
  targetUserId: string | null
  targetEmail: string | null
  oldValue: Record<string, unknown> | null
  newValue: Record<string, unknown> | null
  createdAt: Date
}

/**
 * Get all team members for a tenant
 */
export async function getTeamMembers(
  tenantId: string,
  options: { page?: number; limit?: number } = {}
): Promise<{ members: TeamMember[]; total: number }> {
  const page = options.page ?? 1
  const limit = Math.min(options.limit ?? 20, 100)
  const offset = (page - 1) * limit

  const countResult = await sql`
    SELECT COUNT(*) as total
    FROM user_organizations uo
    WHERE uo.organization_id = ${tenantId}
  `
  const total = parseInt(String(countResult.rows[0]?.total ?? 0), 10)

  const result = await sql`
    SELECT
      uo.id,
      uo.user_id,
      u.email,
      u.name,
      NULL as avatar_url,
      uo.role,
      u.status,
      uo.created_at as joined_at,
      uo.created_at as invited_at,
      uo.invited_by,
      inviter.id as inviter_id,
      inviter.name as inviter_name,
      inviter.email as inviter_email
    FROM user_organizations uo
    JOIN users u ON u.id = uo.user_id
    LEFT JOIN users inviter ON inviter.id = uo.invited_by
    WHERE uo.organization_id = ${tenantId}
    ORDER BY uo.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `

  const members: TeamMember[] = result.rows.map((row) => ({
    id: row.id as string,
    userId: row.user_id as string,
    email: row.email as string,
    name: (row.name as string) || null,
    avatarUrl: (row.avatar_url as string) || null,
    role: row.role as UserRole,
    status: (row.status as string) === 'invited' ? 'invited' : 'active',
    joinedAt: row.joined_at ? new Date(row.joined_at as string) : null,
    invitedAt: new Date(row.invited_at as string),
    invitedBy: row.inviter_id
      ? {
          id: row.inviter_id as string,
          name: (row.inviter_name as string) || null,
          email: row.inviter_email as string,
        }
      : null,
  }))

  return { members, total }
}

/**
 * Get a single team member by user ID
 */
export async function getTeamMember(
  tenantId: string,
  userId: string
): Promise<TeamMember | null> {
  const result = await sql`
    SELECT
      uo.id,
      uo.user_id,
      u.email,
      u.name,
      NULL as avatar_url,
      uo.role,
      u.status,
      uo.created_at as joined_at,
      uo.created_at as invited_at,
      uo.invited_by,
      inviter.id as inviter_id,
      inviter.name as inviter_name,
      inviter.email as inviter_email
    FROM user_organizations uo
    JOIN users u ON u.id = uo.user_id
    LEFT JOIN users inviter ON inviter.id = uo.invited_by
    WHERE uo.organization_id = ${tenantId}
      AND uo.user_id = ${userId}
  `

  const row = result.rows[0]
  if (!row) {
    return null
  }

  return {
    id: row.id as string,
    userId: row.user_id as string,
    email: row.email as string,
    name: (row.name as string) || null,
    avatarUrl: (row.avatar_url as string) || null,
    role: row.role as UserRole,
    status: (row.status as string) === 'invited' ? 'invited' : 'active',
    joinedAt: row.joined_at ? new Date(row.joined_at as string) : null,
    invitedAt: new Date(row.invited_at as string),
    invitedBy: row.inviter_id
      ? {
          id: row.inviter_id as string,
          name: (row.inviter_name as string) || null,
          email: row.inviter_email as string,
        }
      : null,
  }
}

/**
 * Update a team member's role
 */
export async function updateMemberRole(
  tenantId: string,
  userId: string,
  newRole: UserRole,
  actorId: string,
  requestContext?: { ipAddress?: string; userAgent?: string }
): Promise<void> {
  // Get current role for audit
  const currentResult = await sql`
    SELECT role FROM user_organizations
    WHERE organization_id = ${tenantId} AND user_id = ${userId}
  `

  const currentRow = currentResult.rows[0]
  if (!currentRow) {
    throw new Error('Team member not found')
  }

  const oldRole = currentRow.role as string

  // Update role
  await sql`
    UPDATE user_organizations
    SET role = ${newRole}::user_role, updated_at = NOW()
    WHERE organization_id = ${tenantId} AND user_id = ${userId}
  `

  // Log the action
  await logTeamAction(tenantId, actorId, 'role.changed', {
    targetUserId: userId,
    oldValue: { role: oldRole },
    newValue: { role: newRole },
    ipAddress: requestContext?.ipAddress,
    userAgent: requestContext?.userAgent,
  })
}

/**
 * Remove a team member from the organization
 */
export async function removeMember(
  tenantId: string,
  userId: string,
  actorId: string,
  requestContext?: { ipAddress?: string; userAgent?: string }
): Promise<void> {
  // Get member info for audit
  const memberResult = await sql`
    SELECT u.email, uo.role
    FROM user_organizations uo
    JOIN users u ON u.id = uo.user_id
    WHERE uo.organization_id = ${tenantId} AND uo.user_id = ${userId}
  `

  const member = memberResult.rows[0]
  if (!member) {
    throw new Error('Team member not found')
  }

  // Remove from organization
  await sql`
    DELETE FROM user_organizations
    WHERE organization_id = ${tenantId} AND user_id = ${userId}
  `

  // Log the action
  await logTeamAction(tenantId, actorId, 'member.removed', {
    targetUserId: userId,
    targetEmail: member.email as string,
    oldValue: { role: member.role as string },
    ipAddress: requestContext?.ipAddress,
    userAgent: requestContext?.userAgent,
  })
}

/**
 * Create a team invitation
 */
export async function createInvitation(
  tenantId: string,
  email: string,
  role: UserRole,
  invitedBy: string,
  message?: string
): Promise<{ invitationId: string; token: string }> {
  const normalizedEmail = email.toLowerCase().trim()

  // Check if user is already a member
  const existingMemberResult = await sql`
    SELECT uo.id
    FROM user_organizations uo
    JOIN users u ON u.id = uo.user_id
    WHERE uo.organization_id = ${tenantId}
      AND u.email = ${normalizedEmail}
  `

  if (existingMemberResult.rows.length > 0) {
    throw new Error('User is already a team member')
  }

  // Check for existing pending invitation
  const existingInviteResult = await sql`
    SELECT id FROM team_invitations
    WHERE tenant_id = ${tenantId}
      AND email = ${normalizedEmail}
      AND status = 'pending'
      AND expires_at > NOW()
  `

  if (existingInviteResult.rows.length > 0) {
    throw new Error('A pending invitation already exists for this email')
  }

  // Generate token
  const token = nanoid(INVITATION_TOKEN_LENGTH)
  const tokenHash = await sha256(token)

  // Calculate expiration
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRATION_DAYS)

  // Create invitation
  const result = await sql`
    INSERT INTO team_invitations (
      tenant_id, email, role, invited_by, token_hash, expires_at, message
    )
    VALUES (
      ${tenantId},
      ${normalizedEmail},
      ${role}::user_role,
      ${invitedBy},
      ${tokenHash},
      ${expiresAt.toISOString()},
      ${message || null}
    )
    RETURNING id
  `

  const resultRow = result.rows[0]
  if (!resultRow) {
    throw new Error('Failed to create invitation')
  }

  const invitationId = resultRow.id as string

  // Log the action
  await logTeamAction(tenantId, invitedBy, 'member.invited', {
    targetEmail: normalizedEmail,
    newValue: { role, invitationId },
  })

  return { invitationId, token }
}

/**
 * Get all invitations for a tenant
 */
export async function getInvitations(
  tenantId: string,
  options: { status?: 'pending' | 'all'; page?: number; limit?: number } = {}
): Promise<{ invitations: TeamInvitation[]; total: number }> {
  const page = options.page ?? 1
  const limit = Math.min(options.limit ?? 20, 100)
  const offset = (page - 1) * limit
  const statusFilter = options.status === 'all' ? null : 'pending'

  const countQuery = statusFilter
    ? sql`
        SELECT COUNT(*) as total
        FROM team_invitations
        WHERE tenant_id = ${tenantId} AND status = ${statusFilter}::invitation_status
      `
    : sql`
        SELECT COUNT(*) as total
        FROM team_invitations
        WHERE tenant_id = ${tenantId}
      `

  const countResult = await countQuery
  const total = parseInt(String(countResult.rows[0]?.total ?? 0), 10)

  const dataQuery = statusFilter
    ? sql`
        SELECT
          ti.id,
          ti.email,
          ti.role,
          ti.status,
          ti.message,
          ti.expires_at,
          ti.created_at,
          ti.accepted_at,
          u.id as inviter_id,
          u.name as inviter_name,
          u.email as inviter_email
        FROM team_invitations ti
        JOIN users u ON u.id = ti.invited_by
        WHERE ti.tenant_id = ${tenantId} AND ti.status = ${statusFilter}::invitation_status
        ORDER BY ti.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    : sql`
        SELECT
          ti.id,
          ti.email,
          ti.role,
          ti.status,
          ti.message,
          ti.expires_at,
          ti.created_at,
          ti.accepted_at,
          u.id as inviter_id,
          u.name as inviter_name,
          u.email as inviter_email
        FROM team_invitations ti
        JOIN users u ON u.id = ti.invited_by
        WHERE ti.tenant_id = ${tenantId}
        ORDER BY ti.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `

  const result = await dataQuery

  const invitations: TeamInvitation[] = result.rows.map((row) => ({
    id: row.id as string,
    email: row.email as string,
    role: row.role as UserRole,
    status: row.status as TeamInvitation['status'],
    message: (row.message as string) || null,
    invitedBy: {
      id: row.inviter_id as string,
      name: (row.inviter_name as string) || null,
      email: row.inviter_email as string,
    },
    expiresAt: new Date(row.expires_at as string),
    createdAt: new Date(row.created_at as string),
    acceptedAt: row.accepted_at ? new Date(row.accepted_at as string) : null,
  }))

  return { invitations, total }
}

/**
 * Get a single invitation by ID
 */
export async function getInvitation(
  invitationId: string
): Promise<(TeamInvitation & { tenantId: string; tenantName: string }) | null> {
  const result = await sql`
    SELECT
      ti.id,
      ti.tenant_id,
      ti.email,
      ti.role,
      ti.status,
      ti.message,
      ti.expires_at,
      ti.created_at,
      ti.accepted_at,
      u.id as inviter_id,
      u.name as inviter_name,
      u.email as inviter_email,
      o.name as tenant_name
    FROM team_invitations ti
    JOIN users u ON u.id = ti.invited_by
    JOIN organizations o ON o.id = ti.tenant_id
    WHERE ti.id = ${invitationId}
  `

  const row = result.rows[0]
  if (!row) {
    return null
  }

  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    tenantName: row.tenant_name as string,
    email: row.email as string,
    role: row.role as UserRole,
    status: row.status as TeamInvitation['status'],
    message: (row.message as string) || null,
    invitedBy: {
      id: row.inviter_id as string,
      name: (row.inviter_name as string) || null,
      email: row.inviter_email as string,
    },
    expiresAt: new Date(row.expires_at as string),
    createdAt: new Date(row.created_at as string),
    acceptedAt: row.accepted_at ? new Date(row.accepted_at as string) : null,
  }
}

/**
 * Verify and accept an invitation
 */
export async function acceptInvitation(
  email: string,
  token: string,
  userId: string
): Promise<{ tenantId: string; role: UserRole }> {
  const tokenHash = await sha256(token)
  const normalizedEmail = email.toLowerCase().trim()

  // Find the invitation
  const inviteResult = await sql`
    SELECT id, tenant_id, role, invited_by, status, expires_at
    FROM team_invitations
    WHERE email = ${normalizedEmail}
      AND token_hash = ${tokenHash}
  `

  const invite = inviteResult.rows[0]
  if (!invite) {
    throw new Error('Invalid invitation token')
  }

  // Check status
  if (invite.status !== 'pending') {
    throw new Error(`Invitation has already been ${invite.status as string}`)
  }

  // Check expiration
  if (new Date(invite.expires_at as string) < new Date()) {
    // Mark as expired
    await sql`
      UPDATE team_invitations
      SET status = 'expired'::invitation_status
      WHERE id = ${invite.id}
    `
    throw new Error('Invitation has expired')
  }

  const tenantId = invite.tenant_id as string
  const role = invite.role as UserRole
  const invitedBy = invite.invited_by as string
  const invitationId = invite.id as string

  // Add user to organization
  await sql`
    INSERT INTO user_organizations (user_id, organization_id, role, invited_by, invitation_id)
    VALUES (${userId}, ${tenantId}, ${role}::user_role, ${invitedBy}, ${invitationId})
    ON CONFLICT (user_id, organization_id) DO UPDATE
    SET role = ${role}::user_role, invited_by = ${invitedBy}, invitation_id = ${invitationId}
  `

  // Update user status to active if invited
  await sql`
    UPDATE users
    SET status = 'active'::user_status, email_verified = TRUE
    WHERE id = ${userId} AND status = 'invited'::user_status
  `

  // Mark invitation as accepted
  await sql`
    UPDATE team_invitations
    SET status = 'accepted'::invitation_status, accepted_at = NOW()
    WHERE id = ${invitationId}
  `

  // Log the action
  await logTeamAction(tenantId, userId, 'member.joined', {
    targetUserId: userId,
    newValue: { role, invitationId },
  })

  return { tenantId, role }
}

/**
 * Revoke an invitation
 */
export async function revokeInvitation(
  invitationId: string,
  actorId: string,
  requestContext?: { ipAddress?: string; userAgent?: string }
): Promise<void> {
  // Get invitation info
  const inviteResult = await sql`
    SELECT tenant_id, email, role, status
    FROM team_invitations
    WHERE id = ${invitationId}
  `

  const invite = inviteResult.rows[0]
  if (!invite) {
    throw new Error('Invitation not found')
  }

  if (invite.status !== 'pending') {
    throw new Error('Only pending invitations can be revoked')
  }

  // Revoke the invitation
  await sql`
    UPDATE team_invitations
    SET status = 'revoked'::invitation_status, revoked_at = NOW()
    WHERE id = ${invitationId}
  `

  // Log the action
  await logTeamAction(invite.tenant_id as string, actorId, 'invitation.revoked', {
    targetEmail: invite.email as string,
    oldValue: { role: invite.role as string, invitationId },
    ipAddress: requestContext?.ipAddress,
    userAgent: requestContext?.userAgent,
  })
}

/**
 * Resend an invitation (creates new token, updates expiration)
 */
export async function resendInvitation(
  invitationId: string,
  actorId: string
): Promise<string> {
  // Get invitation info
  const inviteResult = await sql`
    SELECT tenant_id, email, status
    FROM team_invitations
    WHERE id = ${invitationId}
  `

  const invite = inviteResult.rows[0]
  if (!invite) {
    throw new Error('Invitation not found')
  }

  if (invite.status !== 'pending') {
    throw new Error('Only pending invitations can be resent')
  }

  // Generate new token
  const token = nanoid(INVITATION_TOKEN_LENGTH)
  const tokenHash = await sha256(token)

  // Calculate new expiration
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRATION_DAYS)

  // Update invitation
  await sql`
    UPDATE team_invitations
    SET token_hash = ${tokenHash}, expires_at = ${expiresAt.toISOString()}
    WHERE id = ${invitationId}
  `

  // Log the action
  await logTeamAction(invite.tenant_id as string, actorId, 'invitation.resent', {
    targetEmail: invite.email as string,
    newValue: { invitationId, expiresAt: expiresAt.toISOString() },
  })

  return token
}

/**
 * Get team audit log entries
 */
export async function getTeamAuditLog(
  tenantId: string,
  options: { page?: number; limit?: number; userId?: string } = {}
): Promise<{ entries: TeamAuditEntry[]; total: number }> {
  const page = options.page ?? 1
  const limit = Math.min(options.limit ?? 50, 100)
  const offset = (page - 1) * limit

  const countQuery = options.userId
    ? sql`
        SELECT COUNT(*) as total
        FROM team_audit_log
        WHERE tenant_id = ${tenantId}
          AND (target_user_id = ${options.userId} OR actor_id = ${options.userId})
      `
    : sql`
        SELECT COUNT(*) as total
        FROM team_audit_log
        WHERE tenant_id = ${tenantId}
      `

  const countResult = await countQuery
  const total = parseInt(String(countResult.rows[0]?.total ?? 0), 10)

  const dataQuery = options.userId
    ? sql`
        SELECT
          tal.id,
          tal.actor_id,
          u.name as actor_name,
          u.email as actor_email,
          tal.action,
          tal.target_user_id,
          tal.target_email,
          tal.old_value,
          tal.new_value,
          tal.created_at
        FROM team_audit_log tal
        JOIN users u ON u.id = tal.actor_id
        WHERE tal.tenant_id = ${tenantId}
          AND (tal.target_user_id = ${options.userId} OR tal.actor_id = ${options.userId})
        ORDER BY tal.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    : sql`
        SELECT
          tal.id,
          tal.actor_id,
          u.name as actor_name,
          u.email as actor_email,
          tal.action,
          tal.target_user_id,
          tal.target_email,
          tal.old_value,
          tal.new_value,
          tal.created_at
        FROM team_audit_log tal
        JOIN users u ON u.id = tal.actor_id
        WHERE tal.tenant_id = ${tenantId}
        ORDER BY tal.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `

  const result = await dataQuery

  const entries: TeamAuditEntry[] = result.rows.map((row) => ({
    id: row.id as string,
    actorId: row.actor_id as string,
    actorName: (row.actor_name as string) || null,
    actorEmail: row.actor_email as string,
    action: row.action as string,
    targetUserId: (row.target_user_id as string) || null,
    targetEmail: (row.target_email as string) || null,
    oldValue: (row.old_value as Record<string, unknown>) || null,
    newValue: (row.new_value as Record<string, unknown>) || null,
    createdAt: new Date(row.created_at as string),
  }))

  return { entries, total }
}

/**
 * Log a team action to the audit log
 */
async function logTeamAction(
  tenantId: string,
  actorId: string,
  action: string,
  details: {
    targetUserId?: string
    targetEmail?: string
    oldValue?: Record<string, unknown>
    newValue?: Record<string, unknown>
    ipAddress?: string
    userAgent?: string
  }
): Promise<void> {
  await sql`
    INSERT INTO team_audit_log (
      tenant_id, actor_id, action, target_user_id, target_email,
      old_value, new_value, ip_address, user_agent
    )
    VALUES (
      ${tenantId},
      ${actorId},
      ${action},
      ${details.targetUserId || null},
      ${details.targetEmail || null},
      ${details.oldValue ? JSON.stringify(details.oldValue) : null}::jsonb,
      ${details.newValue ? JSON.stringify(details.newValue) : null}::jsonb,
      ${details.ipAddress || null}::inet,
      ${details.userAgent || null}
    )
  `
}

/**
 * Check how many invitations were sent today (for rate limiting)
 */
export async function getInvitationCountToday(tenantId: string): Promise<number> {
  const result = await sql`
    SELECT COUNT(*) as count
    FROM team_invitations
    WHERE tenant_id = ${tenantId}
      AND created_at >= CURRENT_DATE
  `
  return parseInt(String(result.rows[0]?.count ?? 0), 10)
}

/**
 * Get count of team members
 */
export async function getTeamMemberCount(tenantId: string): Promise<number> {
  const result = await sql`
    SELECT COUNT(*) as count
    FROM user_organizations
    WHERE organization_id = ${tenantId}
  `
  return parseInt(String(result.rows[0]?.count ?? 0), 10)
}

/**
 * Check if user can leave organization (not the last owner)
 */
export async function canUserLeaveOrganization(
  tenantId: string,
  userId: string
): Promise<{ canLeave: boolean; reason?: string }> {
  // Check if user is an owner
  const memberResult = await sql`
    SELECT role FROM user_organizations
    WHERE organization_id = ${tenantId} AND user_id = ${userId}
  `

  const memberRow = memberResult.rows[0]
  if (!memberRow) {
    return { canLeave: false, reason: 'User is not a member of this organization' }
  }

  const role = memberRow.role as string

  // If not owner, can always leave
  if (role !== 'owner') {
    return { canLeave: true }
  }

  // Check if there are other owners
  const otherOwnersResult = await sql`
    SELECT COUNT(*) as count
    FROM user_organizations
    WHERE organization_id = ${tenantId}
      AND user_id != ${userId}
      AND role = 'owner'
  `

  const otherOwnerCount = parseInt(String(otherOwnersResult.rows[0]?.count ?? 0), 10)

  if (otherOwnerCount === 0) {
    return {
      canLeave: false,
      reason: 'Cannot leave: you are the only owner. Transfer ownership first.',
    }
  }

  return { canLeave: true }
}

/**
 * User voluntarily leaves an organization
 */
export async function leaveOrganization(
  tenantId: string,
  userId: string,
  requestContext?: { ipAddress?: string; userAgent?: string }
): Promise<void> {
  const { canLeave, reason } = await canUserLeaveOrganization(tenantId, userId)

  if (!canLeave) {
    throw new Error(reason)
  }

  // Get member info for audit
  const memberResult = await sql`
    SELECT u.email, uo.role
    FROM user_organizations uo
    JOIN users u ON u.id = uo.user_id
    WHERE uo.organization_id = ${tenantId} AND uo.user_id = ${userId}
  `

  const member = memberResult.rows[0]
  if (!member) {
    throw new Error('Member not found')
  }

  // Remove from organization
  await sql`
    DELETE FROM user_organizations
    WHERE organization_id = ${tenantId} AND user_id = ${userId}
  `

  // Log the action
  await logTeamAction(tenantId, userId, 'member.left', {
    targetUserId: userId,
    targetEmail: member.email as string,
    oldValue: { role: member.role as string },
    ipAddress: requestContext?.ipAddress,
    userAgent: requestContext?.userAgent,
  })
}
