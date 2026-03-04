/**
 * Shared API key authentication for openCLAW agent endpoints.
 * Primary lookup against public.api_keys (SHA-256 hashed).
 * Falls back to public.tenant_api_keys for backward compatibility.
 */

import { sql } from '@cgk-platform/db'
import { logger } from '@cgk-platform/logging'

export interface TenantApiKeyResult {
  tenantId: string
  tenantSlug: string
}

async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Validate an API key from the x-api-key header.
 * Checks api_keys (hashed) first; falls back to tenant_api_keys (plaintext, deprecated).
 * Returns tenant info on success, null on failure.
 */
export async function validateTenantApiKey(request: Request): Promise<TenantApiKeyResult | null> {
  const apiKey = request.headers.get('x-api-key')
  if (!apiKey) return null

  const keyHash = await sha256(apiKey)

  // Primary path: api_keys table (SHA-256 hashed)
  const hashedResult = await sql<{ slug: string; id: string }>`
    SELECT o.slug, ak.id
    FROM public.api_keys ak
    JOIN public.organizations o ON o.id = ak.organization_id
    WHERE ak.key_hash = ${keyHash}
      AND ak.revoked_at IS NULL
      AND (ak.expires_at IS NULL OR ak.expires_at > NOW())
  `

  if (hashedResult.rows[0]) {
    const record = hashedResult.rows[0]

    sql`
      UPDATE public.api_keys SET last_used_at = NOW()
      WHERE id = ${record.id}::uuid
    `.catch((err) => logger.error('Failed to update api_keys last_used_at:', err))

    return { tenantId: record.slug, tenantSlug: record.slug }
  }

  // Fallback: tenant_api_keys table (plaintext, deprecated)
  const legacyResult = await sql<{ slug: string }>`
    SELECT o.slug
    FROM public.tenant_api_keys tak
    JOIN public.organizations o ON o.id = tak.organization_id
    WHERE tak.api_key = ${apiKey}
      AND tak.is_active = true
      AND (tak.expires_at IS NULL OR tak.expires_at > NOW())
  `

  if (!legacyResult.rows[0]) return null

  const legacyRecord = legacyResult.rows[0]
  logger.warn('API key authenticated via deprecated tenant_api_keys table', {
    tenantSlug: legacyRecord.slug,
  })

  sql`
    UPDATE public.tenant_api_keys SET last_used_at = NOW()
    WHERE api_key = ${apiKey}
  `.catch((err) => logger.error('Failed to update tenant_api_keys last_used_at:', err))

  return { tenantId: legacyRecord.slug, tenantSlug: legacyRecord.slug }
}
