export const dynamic = 'force-dynamic'

import { requireAuth, type AuthContext, checkPermissionOrRespond } from '@cgk-platform/auth'
import { sql } from '@cgk-platform/db'
import { logger } from '@cgk-platform/logging'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * GET /api/admin/api-keys
 *
 * List all API keys for the current tenant.
 * Returns safe fields only — never the raw key or hash.
 */
export async function GET(request: Request) {
  const headerList = await headers()
  const tenantId = headerList.get('x-tenant-id')

  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let auth: AuthContext
  try {
    auth = await requireAuth(request)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const permissionDenied = await checkPermissionOrRespond(
    auth.userId,
    auth.tenantId || '',
    'integrations.manage'
  )
  if (permissionDenied) return permissionDenied

  try {
    const result = await sql<{
      id: string
      name: string
      key_prefix: string
      purpose: string
      scopes: string[]
      last_used_at: string | null
      created_at: string
      expires_at: string | null
    }>`
      SELECT
        ak.id,
        ak.name,
        ak.key_prefix,
        ak.purpose,
        ak.scopes,
        ak.last_used_at,
        ak.created_at,
        ak.expires_at
      FROM public.api_keys ak
      JOIN public.organizations o ON o.id = ak.organization_id
      WHERE o.id = ${tenantId}::uuid
        AND ak.revoked_at IS NULL
      ORDER BY ak.created_at DESC
    `

    return NextResponse.json({ apiKeys: result.rows })
  } catch (error) {
    logger.error(
      'Error fetching API keys:',
      error instanceof Error ? error : new Error(String(error))
    )
    return NextResponse.json({ error: 'Failed to fetch API keys' }, { status: 500 })
  }
}

/**
 * POST /api/admin/api-keys
 *
 * Create a new API key for the current tenant.
 * Returns the full raw key exactly once in the response.
 */
export async function POST(request: Request) {
  const headerList = await headers()
  const tenantId = headerList.get('x-tenant-id')
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantId || !tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let auth: AuthContext
  try {
    auth = await requireAuth(request)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const permissionDenied = await checkPermissionOrRespond(
    auth.userId,
    auth.tenantId || '',
    'integrations.manage'
  )
  if (permissionDenied) return permissionDenied

  let body: { name: string; purpose?: string; scopes?: string[]; expiresAt?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  try {
    const keyId = crypto.randomUUID()

    // Format: cgk_{tenantSlug}_{keyId}_{base64url(32 random bytes)}
    const secretBytes = crypto.getRandomValues(new Uint8Array(32))
    const secret = Buffer.from(secretBytes).toString('base64url')
    const rawKey = `cgk_${tenantSlug}_${keyId}_${secret}`
    const keyPrefix = rawKey.slice(0, 12)

    const encoder = new TextEncoder()
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(rawKey))
    const keyHash = Buffer.from(hashBuffer).toString('hex')

    const purpose = body.purpose || 'general'
    const scopes = body.scopes || []
    const expiresAt = body.expiresAt || null

    const insertResult = await sql<{
      id: string
      name: string
      key_prefix: string
      purpose: string
      created_at: string
    }>`
      INSERT INTO public.api_keys (
        id, organization_id, key_hash, key_prefix, name, scopes, expires_at, purpose
      )
      VALUES (
        ${keyId}::uuid,
        ${tenantId}::uuid,
        ${keyHash},
        ${keyPrefix},
        ${body.name},
        ${`{${scopes.join(',')}}`}::text[],
        ${expiresAt},
        ${purpose}
      )
      RETURNING id, name, key_prefix, purpose, created_at
    `

    const row = insertResult.rows[0]
    if (!row) {
      throw new Error('Failed to insert API key')
    }

    return NextResponse.json(
      {
        id: row.id,
        name: row.name,
        keyPrefix: row.key_prefix,
        purpose: row.purpose,
        createdAt: row.created_at,
        key: rawKey,
      },
      { status: 201 }
    )
  } catch (error) {
    logger.error(
      'Error creating API key:',
      error instanceof Error ? error : new Error(String(error))
    )
    return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 })
  }
}
