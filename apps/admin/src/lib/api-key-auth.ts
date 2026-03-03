/**
 * Shared API key authentication for openCLAW agent endpoints.
 * Validates keys against public.tenant_api_keys (migration 029).
 */

import { sql } from '@cgk-platform/db'
import { logger } from '@cgk-platform/logging'

export interface TenantApiKeyResult {
  tenantId: string
  tenantSlug: string
}

/**
 * Validate an API key from the x-api-key header against tenant_api_keys.
 * Returns tenant info on success, null on failure.
 */
export async function validateTenantApiKey(request: Request): Promise<TenantApiKeyResult | null> {
  const apiKey = request.headers.get('x-api-key')
  if (!apiKey) return null

  const result = await sql<{ slug: string }>`
    SELECT o.slug
    FROM public.tenant_api_keys tak
    JOIN public.organizations o ON o.id = tak.organization_id
    WHERE tak.api_key = ${apiKey}
      AND tak.is_active = true
      AND (tak.expires_at IS NULL OR tak.expires_at > NOW())
  `

  const record = result.rows[0]
  if (!record) return null

  // Fire-and-forget last_used_at update
  sql`
    UPDATE public.tenant_api_keys SET last_used_at = NOW()
    WHERE api_key = ${apiKey}
  `.catch((err) => logger.error('Failed to update API key last_used_at:', err))

  return {
    tenantId: record.slug,
    tenantSlug: record.slug,
  }
}
