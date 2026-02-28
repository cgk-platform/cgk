/**
 * SSO Token Management
 *
 * Handles cross-app single sign-on via one-time tokens
 */

import { sql } from '@cgk-platform/db'
import { nanoid } from 'nanoid'

export type TargetApp = 'admin' | 'storefront' | 'creator-portal' | 'contractor-portal' | 'orchestrator'

export interface SSOToken {
  id: string
  userId: string
  tenantId: string | null
  targetApp: TargetApp
  expiresAt: Date
  usedAt: Date | null
  createdAt: Date
}

export interface GenerateSSOTokenParams {
  userId: string
  tenantId?: string | null
  targetApp: TargetApp
  expiryMinutes?: number
}

export interface ValidateSSOTokenResult {
  valid: boolean
  userId?: string
  tenantId?: string | null
  error?: string
}

/**
 * Generate a one-time SSO token for cross-app authentication
 *
 * @param params - Token generation parameters
 * @returns SSO token ID
 */
export async function generateSSOToken(params: GenerateSSOTokenParams): Promise<string> {
  const { userId, tenantId = null, targetApp, expiryMinutes = 5 } = params

  const tokenId = nanoid(32)
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000)

  await sql`
    INSERT INTO public.sso_tokens (
      id,
      user_id,
      tenant_id,
      target_app,
      expires_at
    ) VALUES (
      ${tokenId},
      ${userId},
      ${tenantId},
      ${targetApp},
      ${expiresAt.toISOString()}
    )
  `

  return tokenId
}

/**
 * Validate and consume an SSO token
 *
 * @param tokenId - Token to validate
 * @param targetApp - Expected target app (must match token)
 * @returns Validation result with user/tenant info
 */
export async function validateSSOToken(
  tokenId: string,
  targetApp: TargetApp
): Promise<ValidateSSOTokenResult> {
  // Fetch token
  const result = await sql`
    SELECT
      id,
      user_id,
      tenant_id,
      target_app,
      expires_at,
      used_at
    FROM public.sso_tokens
    WHERE id = ${tokenId}
  `

  if (result.rows.length === 0) {
    return { valid: false, error: 'Token not found' }
  }

  const row = result.rows[0] as Record<string, unknown>
  const token: SSOToken = {
    id: row.id as string,
    userId: row.user_id as string,
    tenantId: (row.tenant_id as string) || null,
    targetApp: row.target_app as TargetApp,
    expiresAt: new Date(row.expires_at as string),
    usedAt: row.used_at ? new Date(row.used_at as string) : null,
    createdAt: new Date(row.created_at as string),
  }

  // Check if already used
  if (token.usedAt) {
    return { valid: false, error: 'Token already used' }
  }

  // Check if expired
  if (token.expiresAt < new Date()) {
    return { valid: false, error: 'Token expired' }
  }

  // Check target app matches
  if (token.targetApp !== targetApp) {
    return { valid: false, error: 'Invalid target app' }
  }

  // Mark token as used
  await sql`
    UPDATE public.sso_tokens
    SET used_at = NOW()
    WHERE id = ${tokenId}
  `

  return {
    valid: true,
    userId: token.userId,
    tenantId: token.tenantId,
  }
}

/**
 * Clean up expired and used tokens
 * Should be called periodically (e.g., via cron job)
 *
 * @param olderThanHours - Delete tokens older than this many hours (default: 24)
 */
export async function cleanupSSOTokens(olderThanHours = 24): Promise<number> {
  const cutoffDate = new Date(Date.now() - olderThanHours * 60 * 60 * 1000)

  const result = await sql`
    DELETE FROM public.sso_tokens
    WHERE created_at < ${cutoffDate.toISOString()}
      AND (used_at IS NOT NULL OR expires_at < NOW())
    RETURNING id
  `

  return result.rows.length
}
