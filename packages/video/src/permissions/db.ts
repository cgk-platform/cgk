/**
 * @cgk-platform/video - Permission database operations
 *
 * CRUD operations for video permissions with tenant isolation.
 */

import { createHash } from 'crypto'

import { sql, withTenant } from '@cgk-platform/db'

import type {
  CreatePermissionInput,
  PermissionLevel,
  VideoPermission,
} from '../types.js'

/**
 * Hash a password for storage
 */
function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex')
}

/**
 * Get all permissions for a video
 */
export async function getVideoPermissions(
  tenantId: string,
  videoId: string,
): Promise<VideoPermission[]> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT
        id,
        tenant_id as "tenantId",
        video_id as "videoId",
        permission,
        user_id as "userId",
        email,
        is_public as "isPublic",
        is_team as "isTeam",
        password_hash as "passwordHash",
        expires_at as "expiresAt",
        created_at as "createdAt"
      FROM video_permissions
      WHERE video_id = ${videoId}
        AND tenant_id = ${tenantId}
      ORDER BY created_at DESC
    `
    return result.rows as VideoPermission[]
  })
}

/**
 * Get a specific permission by ID
 */
export async function getPermission(
  tenantId: string,
  permissionId: string,
): Promise<VideoPermission | null> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT
        id,
        tenant_id as "tenantId",
        video_id as "videoId",
        permission,
        user_id as "userId",
        email,
        is_public as "isPublic",
        is_team as "isTeam",
        password_hash as "passwordHash",
        expires_at as "expiresAt",
        created_at as "createdAt"
      FROM video_permissions
      WHERE id = ${permissionId}
        AND tenant_id = ${tenantId}
    `
    return (result.rows[0] as VideoPermission | undefined) ?? null
  })
}

/**
 * Create a new permission
 */
export async function createPermission(
  tenantId: string,
  videoId: string,
  input: CreatePermissionInput,
): Promise<VideoPermission> {
  return withTenant(tenantId, async () => {
    const passwordHash = input.password ? hashPassword(input.password) : null

    const result = await sql`
      INSERT INTO video_permissions (
        tenant_id,
        video_id,
        permission,
        user_id,
        email,
        is_public,
        is_team,
        password_hash,
        expires_at
      ) VALUES (
        ${tenantId},
        ${videoId},
        ${input.permission},
        ${input.userId ?? null},
        ${input.email ?? null},
        ${input.isPublic ?? false},
        ${input.isTeam ?? false},
        ${passwordHash},
        ${input.expiresAt ? input.expiresAt.toISOString() : null}
      )
      RETURNING
        id,
        tenant_id as "tenantId",
        video_id as "videoId",
        permission,
        user_id as "userId",
        email,
        is_public as "isPublic",
        is_team as "isTeam",
        password_hash as "passwordHash",
        expires_at as "expiresAt",
        created_at as "createdAt"
    `
    return result.rows[0] as VideoPermission
  })
}

/**
 * Update a permission
 */
export async function updatePermission(
  tenantId: string,
  permissionId: string,
  updates: {
    permission?: PermissionLevel
    expiresAt?: Date | null
    password?: string | null
  },
): Promise<VideoPermission | null> {
  return withTenant(tenantId, async () => {
    if (
      updates.permission === undefined &&
      updates.expiresAt === undefined &&
      updates.password === undefined
    ) {
      return getPermission(tenantId, permissionId)
    }

    // Get current permission
    const current = await getPermission(tenantId, permissionId)
    if (!current) return null

    // Apply updates
    const permission =
      updates.permission !== undefined ? updates.permission : current.permission
    const expiresAt =
      updates.expiresAt !== undefined
        ? updates.expiresAt
          ? updates.expiresAt.toISOString()
          : null
        : current.expiresAt
          ? current.expiresAt.toISOString()
          : null
    const passwordHash =
      updates.password !== undefined
        ? updates.password === null
          ? null
          : hashPassword(updates.password)
        : current.passwordHash

    const result = await sql`
      UPDATE video_permissions
      SET
        permission = ${permission},
        expires_at = ${expiresAt},
        password_hash = ${passwordHash}
      WHERE id = ${permissionId}
        AND tenant_id = ${tenantId}
      RETURNING
        id,
        tenant_id as "tenantId",
        video_id as "videoId",
        permission,
        user_id as "userId",
        email,
        is_public as "isPublic",
        is_team as "isTeam",
        password_hash as "passwordHash",
        expires_at as "expiresAt",
        created_at as "createdAt"
    `
    return (result.rows[0] as VideoPermission | undefined) ?? null
  })
}

/**
 * Delete a permission
 */
export async function deletePermission(
  tenantId: string,
  permissionId: string,
): Promise<boolean> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      DELETE FROM video_permissions
      WHERE id = ${permissionId}
        AND tenant_id = ${tenantId}
    `
    return (result.rowCount ?? 0) > 0
  })
}

/**
 * Delete all permissions for a video
 */
export async function deleteVideoPermissions(
  tenantId: string,
  videoId: string,
): Promise<number> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      DELETE FROM video_permissions
      WHERE video_id = ${videoId}
        AND tenant_id = ${tenantId}
    `
    return result.rowCount ?? 0
  })
}

/**
 * Check if a public permission exists for a video
 */
export async function hasPublicPermission(
  tenantId: string,
  videoId: string,
): Promise<boolean> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT 1
      FROM video_permissions
      WHERE video_id = ${videoId}
        AND tenant_id = ${tenantId}
        AND is_public = true
        AND (expires_at IS NULL OR expires_at > now())
      LIMIT 1
    `
    return result.rows.length > 0
  })
}

/**
 * Get permission for a specific user
 */
export async function getUserPermission(
  tenantId: string,
  videoId: string,
  userId: string,
): Promise<VideoPermission | null> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT
        id,
        tenant_id as "tenantId",
        video_id as "videoId",
        permission,
        user_id as "userId",
        email,
        is_public as "isPublic",
        is_team as "isTeam",
        password_hash as "passwordHash",
        expires_at as "expiresAt",
        created_at as "createdAt"
      FROM video_permissions
      WHERE video_id = ${videoId}
        AND tenant_id = ${tenantId}
        AND user_id = ${userId}
        AND (expires_at IS NULL OR expires_at > now())
      LIMIT 1
    `
    return (result.rows[0] as VideoPermission | undefined) ?? null
  })
}

/**
 * Get permission for a specific email
 */
export async function getEmailPermission(
  tenantId: string,
  videoId: string,
  email: string,
): Promise<VideoPermission | null> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT
        id,
        tenant_id as "tenantId",
        video_id as "videoId",
        permission,
        user_id as "userId",
        email,
        is_public as "isPublic",
        is_team as "isTeam",
        password_hash as "passwordHash",
        expires_at as "expiresAt",
        created_at as "createdAt"
      FROM video_permissions
      WHERE video_id = ${videoId}
        AND tenant_id = ${tenantId}
        AND LOWER(email) = LOWER(${email})
        AND (expires_at IS NULL OR expires_at > now())
      LIMIT 1
    `
    return (result.rows[0] as VideoPermission | undefined) ?? null
  })
}
