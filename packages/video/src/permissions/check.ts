/**
 * @cgk/video - Permission checking
 *
 * Validates user access to videos based on permissions.
 */

import { createHash } from 'crypto'

import { withTenant, sql } from '@cgk/db'

import type { PermissionLevel } from '../types.js'
import type { PermissionCheckResult, PermissionUserContext } from './types.js'

/**
 * Permission level hierarchy (higher index = more permissions)
 */
const PERMISSION_HIERARCHY: PermissionLevel[] = [
  'viewer',
  'commenter',
  'editor',
  'owner',
]

/**
 * Check if one permission level includes another
 */
export function permissionIncludes(
  have: PermissionLevel,
  need: PermissionLevel,
): boolean {
  const haveIndex = PERMISSION_HIERARCHY.indexOf(have)
  const needIndex = PERMISSION_HIERARCHY.indexOf(need)
  return haveIndex >= needIndex
}

/**
 * Check if a user can access a video
 *
 * @param tenantId - Tenant ID
 * @param videoId - Video ID
 * @param user - User context (userId, email, isTeamMember)
 * @param requiredLevel - Minimum permission level required
 * @param password - Optional password for password-protected videos
 * @returns Permission check result
 */
export async function checkVideoPermission(
  tenantId: string,
  videoId: string,
  user: PermissionUserContext,
  requiredLevel: PermissionLevel = 'viewer',
  password?: string,
): Promise<PermissionCheckResult> {
  return withTenant(tenantId, async () => {
    // First, get the video to check if user is owner
    const videoResult = await sql`
      SELECT user_id as "userId"
      FROM videos
      WHERE id = ${videoId}
        AND tenant_id = ${tenantId}
        AND deleted_at IS NULL
    `

    const video = videoResult.rows[0] as { userId: string } | undefined
    if (!video) {
      return {
        allowed: false,
        level: null,
        reason: 'Video not found',
      }
    }

    // Video owner always has full access
    if (user.userId && video.userId === user.userId) {
      return {
        allowed: true,
        level: 'owner',
      }
    }

    // Check for explicit user permission
    if (user.userId) {
      const userPermResult = await sql`
        SELECT permission, password_hash as "passwordHash", expires_at as "expiresAt"
        FROM video_permissions
        WHERE video_id = ${videoId}
          AND tenant_id = ${tenantId}
          AND user_id = ${user.userId}
        LIMIT 1
      `

      const userPerm = userPermResult.rows[0] as {
        permission: PermissionLevel
        passwordHash: string | null
        expiresAt: Date | null
      } | undefined

      if (userPerm) {
        // Check expiration
        if (userPerm.expiresAt && new Date(userPerm.expiresAt) < new Date()) {
          return {
            allowed: false,
            level: null,
            reason: 'Permission has expired',
            expired: true,
          }
        }

        // Check password if required
        if (userPerm.passwordHash) {
          if (!password) {
            return {
              allowed: false,
              level: null,
              reason: 'Password required',
              passwordRequired: true,
            }
          }
          const hash = createHash('sha256').update(password).digest('hex')
          if (hash !== userPerm.passwordHash) {
            return {
              allowed: false,
              level: null,
              reason: 'Invalid password',
              passwordRequired: true,
            }
          }
        }

        // Check if permission level is sufficient
        if (permissionIncludes(userPerm.permission, requiredLevel)) {
          return {
            allowed: true,
            level: userPerm.permission,
          }
        }
      }
    }

    // Check for email permission
    if (user.email) {
      const emailPermResult = await sql`
        SELECT permission, password_hash as "passwordHash", expires_at as "expiresAt"
        FROM video_permissions
        WHERE video_id = ${videoId}
          AND tenant_id = ${tenantId}
          AND LOWER(email) = LOWER(${user.email})
        LIMIT 1
      `

      const emailPerm = emailPermResult.rows[0] as {
        permission: PermissionLevel
        passwordHash: string | null
        expiresAt: Date | null
      } | undefined

      if (emailPerm) {
        if (emailPerm.expiresAt && new Date(emailPerm.expiresAt) < new Date()) {
          return {
            allowed: false,
            level: null,
            reason: 'Permission has expired',
            expired: true,
          }
        }

        if (emailPerm.passwordHash) {
          if (!password) {
            return {
              allowed: false,
              level: null,
              reason: 'Password required',
              passwordRequired: true,
            }
          }
          const hash = createHash('sha256').update(password).digest('hex')
          if (hash !== emailPerm.passwordHash) {
            return {
              allowed: false,
              level: null,
              reason: 'Invalid password',
              passwordRequired: true,
            }
          }
        }

        if (permissionIncludes(emailPerm.permission, requiredLevel)) {
          return {
            allowed: true,
            level: emailPerm.permission,
          }
        }
      }
    }

    // Check for team permission
    if (user.isTeamMember) {
      const teamPermResult = await sql`
        SELECT permission, password_hash as "passwordHash", expires_at as "expiresAt"
        FROM video_permissions
        WHERE video_id = ${videoId}
          AND tenant_id = ${tenantId}
          AND is_team = true
        LIMIT 1
      `

      const teamPerm = teamPermResult.rows[0] as {
        permission: PermissionLevel
        passwordHash: string | null
        expiresAt: Date | null
      } | undefined

      if (teamPerm) {
        if (teamPerm.expiresAt && new Date(teamPerm.expiresAt) < new Date()) {
          return {
            allowed: false,
            level: null,
            reason: 'Permission has expired',
            expired: true,
          }
        }

        if (teamPerm.passwordHash) {
          if (!password) {
            return {
              allowed: false,
              level: null,
              reason: 'Password required',
              passwordRequired: true,
            }
          }
          const hash = createHash('sha256').update(password).digest('hex')
          if (hash !== teamPerm.passwordHash) {
            return {
              allowed: false,
              level: null,
              reason: 'Invalid password',
              passwordRequired: true,
            }
          }
        }

        if (permissionIncludes(teamPerm.permission, requiredLevel)) {
          return {
            allowed: true,
            level: teamPerm.permission,
          }
        }
      }
    }

    // Check for public permission
    const publicPermResult = await sql`
      SELECT permission, password_hash as "passwordHash", expires_at as "expiresAt"
      FROM video_permissions
      WHERE video_id = ${videoId}
        AND tenant_id = ${tenantId}
        AND is_public = true
      LIMIT 1
    `

    const publicPerm = publicPermResult.rows[0] as {
      permission: PermissionLevel
      passwordHash: string | null
      expiresAt: Date | null
    } | undefined

    if (publicPerm) {
      if (publicPerm.expiresAt && new Date(publicPerm.expiresAt) < new Date()) {
        return {
          allowed: false,
          level: null,
          reason: 'Public link has expired',
          expired: true,
        }
      }

      if (publicPerm.passwordHash) {
        if (!password) {
          return {
            allowed: false,
            level: null,
            reason: 'Password required',
            passwordRequired: true,
          }
        }
        const hash = createHash('sha256').update(password).digest('hex')
        if (hash !== publicPerm.passwordHash) {
          return {
            allowed: false,
            level: null,
            reason: 'Invalid password',
            passwordRequired: true,
          }
        }
      }

      if (permissionIncludes(publicPerm.permission, requiredLevel)) {
        return {
          allowed: true,
          level: publicPerm.permission,
        }
      }
    }

    // No matching permission found
    return {
      allowed: false,
      level: null,
      reason: 'Access denied',
    }
  })
}

/**
 * Check if user can edit a video
 */
export async function canEditVideo(
  tenantId: string,
  videoId: string,
  user: PermissionUserContext,
): Promise<boolean> {
  const result = await checkVideoPermission(tenantId, videoId, user, 'editor')
  return result.allowed
}

/**
 * Check if user can delete a video
 */
export async function canDeleteVideo(
  tenantId: string,
  videoId: string,
  user: PermissionUserContext,
): Promise<boolean> {
  const result = await checkVideoPermission(tenantId, videoId, user, 'owner')
  return result.allowed
}

/**
 * Check if user can comment on a video
 */
export async function canCommentOnVideo(
  tenantId: string,
  videoId: string,
  user: PermissionUserContext,
): Promise<boolean> {
  const result = await checkVideoPermission(
    tenantId,
    videoId,
    user,
    'commenter',
  )
  return result.allowed
}
