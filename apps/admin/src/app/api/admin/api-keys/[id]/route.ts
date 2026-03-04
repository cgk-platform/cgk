export const dynamic = 'force-dynamic'

import { requireAuth, type AuthContext, checkPermissionOrRespond } from '@cgk-platform/auth'
import { sql } from '@cgk-platform/db'
import { logger } from '@cgk-platform/logging'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * DELETE /api/admin/api-keys/[id]
 *
 * Revoke an API key by setting revoked_at = NOW().
 * The key record is retained for audit purposes.
 */
export async function DELETE(request: Request, context: RouteContext) {
  const { id } = await context.params
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
    const result = await sql<{ id: string }>`
      UPDATE public.api_keys
      SET revoked_at = NOW()
      WHERE id = ${id}::uuid
        AND organization_id = ${tenantId}::uuid
        AND revoked_at IS NULL
      RETURNING id
    `

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error(
      'Error revoking API key:',
      error instanceof Error ? error : new Error(String(error))
    )
    return NextResponse.json({ error: 'Failed to revoke API key' }, { status: 500 })
  }
}

/**
 * PATCH /api/admin/api-keys/[id]
 *
 * Update mutable fields on an API key: name, scopes, expiresAt.
 */
export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params
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

  let body: { name?: string; scopes?: string[]; expiresAt?: string | null }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.name && !body.scopes && !('expiresAt' in body)) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  try {
    // Build per-field updates to avoid sql.unsafe()
    let result

    if (body.name && body.scopes && 'expiresAt' in body) {
      result = await sql<{ id: string; name: string; scopes: string[]; expires_at: string | null }>`
        UPDATE public.api_keys
        SET name = ${body.name}, scopes = ${`{${body.scopes.join(',')}}`}::text[], expires_at = ${body.expiresAt ?? null}
        WHERE id = ${id}::uuid AND organization_id = ${tenantId}::uuid AND revoked_at IS NULL
        RETURNING id, name, scopes, expires_at
      `
    } else if (body.name && body.scopes) {
      result = await sql<{ id: string; name: string; scopes: string[]; expires_at: string | null }>`
        UPDATE public.api_keys
        SET name = ${body.name}, scopes = ${`{${body.scopes.join(',')}}`}::text[]
        WHERE id = ${id}::uuid AND organization_id = ${tenantId}::uuid AND revoked_at IS NULL
        RETURNING id, name, scopes, expires_at
      `
    } else if (body.name && 'expiresAt' in body) {
      result = await sql<{ id: string; name: string; scopes: string[]; expires_at: string | null }>`
        UPDATE public.api_keys
        SET name = ${body.name}, expires_at = ${body.expiresAt ?? null}
        WHERE id = ${id}::uuid AND organization_id = ${tenantId}::uuid AND revoked_at IS NULL
        RETURNING id, name, scopes, expires_at
      `
    } else if (body.scopes && 'expiresAt' in body) {
      result = await sql<{ id: string; name: string; scopes: string[]; expires_at: string | null }>`
        UPDATE public.api_keys
        SET scopes = ${`{${body.scopes.join(',')}}`}::text[], expires_at = ${body.expiresAt ?? null}
        WHERE id = ${id}::uuid AND organization_id = ${tenantId}::uuid AND revoked_at IS NULL
        RETURNING id, name, scopes, expires_at
      `
    } else if (body.name) {
      result = await sql<{ id: string; name: string; scopes: string[]; expires_at: string | null }>`
        UPDATE public.api_keys
        SET name = ${body.name}
        WHERE id = ${id}::uuid AND organization_id = ${tenantId}::uuid AND revoked_at IS NULL
        RETURNING id, name, scopes, expires_at
      `
    } else if (body.scopes) {
      result = await sql<{ id: string; name: string; scopes: string[]; expires_at: string | null }>`
        UPDATE public.api_keys
        SET scopes = ${`{${body.scopes.join(',')}}`}::text[]
        WHERE id = ${id}::uuid AND organization_id = ${tenantId}::uuid AND revoked_at IS NULL
        RETURNING id, name, scopes, expires_at
      `
    } else {
      result = await sql<{ id: string; name: string; scopes: string[]; expires_at: string | null }>`
        UPDATE public.api_keys
        SET expires_at = ${body.expiresAt ?? null}
        WHERE id = ${id}::uuid AND organization_id = ${tenantId}::uuid AND revoked_at IS NULL
        RETURNING id, name, scopes, expires_at
      `
    }

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 })
    }

    return NextResponse.json({ apiKey: result.rows[0] })
  } catch (error) {
    logger.error(
      'Error updating API key:',
      error instanceof Error ? error : new Error(String(error))
    )
    return NextResponse.json({ error: 'Failed to update API key' }, { status: 500 })
  }
}
