import type { AuthContext } from './types'

/**
 * Get tenant context from request
 *
 * @ai-pattern tenant-context
 * @ai-required Call this at the start of every API route
 */
export async function getTenantContext(
  req: Request
): Promise<{ tenantId: string | null; userId: string | null }> {
  // Tenant ID from headers, subdomain, or JWT
  const tenantId =
    req.headers.get('x-tenant-id') ||
    extractTenantFromSubdomain(req) ||
    null

  // User ID from JWT or session
  const userId = req.headers.get('x-user-id') || null

  return { tenantId, userId }
}

/**
 * Require authentication - throws if not authenticated
 */
export async function requireAuth(req: Request): Promise<AuthContext> {
  const { tenantId, userId } = await getTenantContext(req)

  if (!tenantId || !userId) {
    throw new Error('Authentication required')
  }

  // TODO: Fetch full context from database
  return {
    tenantId,
    tenantSlug: tenantId, // Will be resolved from DB
    userId,
    email: '', // Will be fetched from DB
    role: 'member', // Will be fetched from DB
  }
}

function extractTenantFromSubdomain(req: Request): string | null {
  try {
    const url = new URL(req.url)
    const parts = url.hostname.split('.')
    if (parts.length > 2 && parts[0]) {
      return parts[0]
    }
  } catch {
    // Invalid URL
  }
  return null
}
