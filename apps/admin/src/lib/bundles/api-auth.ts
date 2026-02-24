import { checkPermissionOrRespond, requireAuth, type AuthContext } from '@cgk-platform/auth'
import { getTenantFromRequest } from '@cgk-platform/db'
import { timingSafeEqual } from 'crypto'
import { NextResponse } from 'next/server'

interface AuthSuccess {
  ok: true
  tenantId: string
  tenantSlug: string
  userId: string | null
  isApiKey: boolean
}

interface AuthFailure {
  ok: false
  response: NextResponse
}

/**
 * Authenticate a bundle API request.
 *
 * Supports two auth paths:
 * 1. Bearer token — trusted API key from Shopify app (no permission check)
 * 2. Session auth — admin UI user (full permission check)
 *
 * Tenant is resolved from request headers via getTenantFromRequest(),
 * which supports x-tenant-id, x-tenant-slug, or subdomain.
 */
export async function authenticateBundleRequest(
  request: Request,
  permission?: string,
): Promise<AuthSuccess | AuthFailure> {
  // 1. Resolve tenant from headers
  const tenant = await getTenantFromRequest(request)
  if (!tenant) {
    return { ok: false, response: NextResponse.json({ error: 'Tenant not found' }, { status: 400 }) }
  }

  // 2. Check for Bearer token (API key from Shopify app)
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    const expected = process.env.CGK_PLATFORM_API_KEY
    if (
      !expected ||
      token.length !== expected.length ||
      !timingSafeEqual(Buffer.from(token), Buffer.from(expected))
    ) {
      return { ok: false, response: NextResponse.json({ error: 'Invalid API key' }, { status: 401 }) }
    }
    return { ok: true, tenantId: tenant.id, tenantSlug: tenant.slug, userId: null, isApiKey: true }
  }

  // 3. Fall back to session auth (admin UI)
  let auth: AuthContext
  try {
    auth = await requireAuth(request)
  } catch {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  if (auth.tenantId && auth.tenantId !== tenant.id) {
    return { ok: false, response: NextResponse.json({ error: 'Tenant mismatch' }, { status: 403 }) }
  }

  if (permission) {
    const denied = await checkPermissionOrRespond(auth.userId, tenant.id, permission)
    if (denied) return { ok: false, response: denied as NextResponse }
  }

  return { ok: true, tenantId: tenant.id, tenantSlug: tenant.slug, userId: auth.userId, isApiKey: false }
}
