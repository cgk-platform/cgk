/**
 * MCP Server Authentication
 *
 * Handles per-request authentication for MCP endpoints.
 * Supports multiple authentication methods:
 * 1. Bearer token in Authorization header (JWT)
 * 2. API key in X-API-Key header
 * 3. Session cookie (for browser-based clients)
 */

import { verifyJWT } from '@cgk-platform/auth'
import { sql } from '@cgk-platform/db'
import { JSONRPCErrorCodes, type JSONRPCError } from '@cgk-platform/mcp'

// =============================================================================
// Types
// =============================================================================

/**
 * Authentication result
 */
export interface AuthResult {
  tenantId: string
  userId: string
  email: string
  sessionId?: string
}

/**
 * Authentication error
 */
export class MCPAuthError extends Error {
  readonly code: number
  readonly httpStatus: number

  constructor(message: string, code: number, httpStatus = 401) {
    super(message)
    this.name = 'MCPAuthError'
    this.code = code
    this.httpStatus = httpStatus
  }

  toJSONRPCError(): JSONRPCError {
    return {
      code: this.code,
      message: this.message,
    }
  }
}

// =============================================================================
// Authentication Functions
// =============================================================================

/**
 * Authenticate an MCP request
 *
 * Extracts and validates authentication from request headers.
 * Returns tenant and user context for the MCP handler.
 *
 * @param request - The incoming request
 * @returns Authentication result with tenant and user IDs
 * @throws MCPAuthError if authentication fails
 */
export async function authenticateRequest(request: Request): Promise<AuthResult> {
  // Try Bearer token first
  const authHeader = request.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    return authenticateJWT(token)
  }

  // Try API key
  const apiKey = request.headers.get('X-API-Key')
  if (apiKey) {
    return authenticateAPIKey(apiKey)
  }

  // Try session cookie
  const cookieHeader = request.headers.get('Cookie')
  if (cookieHeader) {
    const token = extractAuthCookie(cookieHeader)
    if (token) {
      return authenticateJWT(token)
    }
  }

  throw new MCPAuthError(
    'Authentication required. Provide a Bearer token, API key, or session cookie.',
    JSONRPCErrorCodes.AUTHENTICATION_REQUIRED
  )
}

/**
 * Authenticate using JWT
 */
async function authenticateJWT(token: string): Promise<AuthResult> {
  try {
    const payload = await verifyJWT(token)

    // Validate required claims
    if (!payload.sub) {
      throw new MCPAuthError(
        'Invalid token: missing user ID',
        JSONRPCErrorCodes.AUTHENTICATION_REQUIRED
      )
    }

    if (!payload.orgId) {
      throw new MCPAuthError(
        'Invalid token: missing tenant ID. MCP requests require a tenant context.',
        JSONRPCErrorCodes.AUTHENTICATION_REQUIRED
      )
    }

    return {
      tenantId: payload.orgId,
      userId: payload.sub,
      email: payload.email,
      sessionId: payload.sid,
    }
  } catch (error) {
    if (error instanceof MCPAuthError) {
      throw error
    }
    throw new MCPAuthError(
      'Invalid or expired token',
      JSONRPCErrorCodes.AUTHENTICATION_REQUIRED
    )
  }
}

/**
 * Hash a string using SHA-256 (Edge-compatible)
 *
 * @param input - String to hash
 * @returns Hex-encoded SHA-256 hash
 */
async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Authenticate using API key
 *
 * API keys are scoped to a tenant and optionally a user.
 * Format: cgk_{tenant_slug}_{key_id}_{secret}
 *
 * The key_id is the UUID of the API key record in the database.
 * The secret is hashed with SHA-256 and compared against the stored key_hash.
 */
async function authenticateAPIKey(apiKey: string): Promise<AuthResult> {
  // Validate API key format
  if (!apiKey.startsWith('cgk_')) {
    throw new MCPAuthError(
      'Invalid API key format',
      JSONRPCErrorCodes.AUTHENTICATION_REQUIRED
    )
  }

  // Parse API key parts: cgk_{tenant_slug}_{key_id}_{secret}
  const parts = apiKey.split('_')
  if (parts.length < 4) {
    throw new MCPAuthError(
      'Invalid API key format',
      JSONRPCErrorCodes.AUTHENTICATION_REQUIRED
    )
  }

  const tenantSlug = parts[1]
  const keyId = parts[2]
  // The secret is everything after the third underscore (in case secret contains underscores)
  const secret = parts.slice(3).join('_')

  if (!tenantSlug || tenantSlug.length < 1) {
    throw new MCPAuthError(
      'Invalid API key: tenant slug not found',
      JSONRPCErrorCodes.AUTHENTICATION_REQUIRED
    )
  }

  if (!keyId || !secret) {
    throw new MCPAuthError(
      'Invalid API key format',
      JSONRPCErrorCodes.AUTHENTICATION_REQUIRED
    )
  }

  // Hash the full API key for comparison
  const keyHash = await sha256(apiKey)

  // Query the api_keys table joined with organizations to verify:
  // 1. Key exists and matches hash
  // 2. Key is not revoked
  // 3. Key is not expired
  // 4. Organization slug matches
  const result = await sql`
    SELECT
      ak.id,
      ak.name,
      ak.scopes,
      ak.expires_at,
      ak.revoked_at,
      o.slug as tenant_slug,
      o.id as organization_id
    FROM public.api_keys ak
    JOIN public.organizations o ON ak.organization_id = o.id
    WHERE ak.id = ${keyId}::uuid
      AND ak.key_hash = ${keyHash}
      AND o.slug = ${tenantSlug}
  `

  const keyRecord = result.rows[0] as
    | {
        id: string
        name: string
        scopes: string[]
        expires_at: string | null
        revoked_at: string | null
        tenant_slug: string
        organization_id: string
      }
    | undefined

  if (!keyRecord) {
    throw new MCPAuthError(
      'Invalid API key',
      JSONRPCErrorCodes.AUTHENTICATION_REQUIRED
    )
  }

  // Check if the key has been revoked
  if (keyRecord.revoked_at) {
    throw new MCPAuthError(
      'API key has been revoked',
      JSONRPCErrorCodes.AUTHENTICATION_REQUIRED
    )
  }

  // Check if the key has expired
  if (keyRecord.expires_at && new Date(keyRecord.expires_at) < new Date()) {
    throw new MCPAuthError(
      'API key has expired',
      JSONRPCErrorCodes.AUTHENTICATION_REQUIRED
    )
  }

  // Update last_used_at timestamp (fire and forget - don't await to avoid latency)
  sql`
    UPDATE public.api_keys
    SET last_used_at = NOW()
    WHERE id = ${keyId}::uuid
  `.catch(() => {
    // Silently ignore update errors - logging is not critical for auth flow
  })

  // Return auth result with tenant context
  // API keys are organization-scoped, so we use a synthetic user ID based on the key
  return {
    tenantId: keyRecord.tenant_slug,
    userId: `api_key:${keyRecord.id}`,
    email: `api-key-${keyRecord.name.toLowerCase().replace(/\s+/g, '-')}@${keyRecord.tenant_slug}.cgk.local`,
  }
}

/**
 * Extract auth token from cookie header
 */
function extractAuthCookie(cookieHeader: string): string | null {
  const cookies = cookieHeader.split(';').map((c) => c.trim())

  for (const cookie of cookies) {
    // Check for cgk-auth cookie (matches AUTH_COOKIE_NAME from @cgk-platform/auth)
    if (cookie.startsWith('cgk-auth=')) {
      return cookie.slice(9)
    }
    // Also check for auth-token for backward compatibility
    if (cookie.startsWith('auth-token=')) {
      return cookie.slice(11)
    }
  }

  return null
}

// =============================================================================
// Authorization Helpers
// =============================================================================

/**
 * Validate tenant access for a user
 *
 * Ensures the authenticated user has access to the specified tenant.
 * This is called after authentication to verify cross-tenant access.
 */
export async function validateTenantAccess(
  _userId: string,
  _tenantId: string
): Promise<boolean> {
  // In a full implementation, this would:
  // 1. Check user_organizations table for membership
  // 2. Verify the user's role allows MCP access
  // 3. Check any IP restrictions or time-based access rules
  //
  // For now, we trust the JWT claims which include org membership
  // Parameters intentionally unused - will be implemented in future phase
  return true
}

/**
 * Check if user has permission for MCP operations
 *
 * MCP access requires specific permissions based on the operation:
 * - tools/call requires the specific tool's permission
 * - resources/read requires resource access
 */
export function checkMCPPermission(
  userRole: string,
  operation: string
): boolean {
  // Super admins and owners can do anything
  if (userRole === 'super_admin' || userRole === 'owner') {
    return true
  }

  // Admins can use MCP
  if (userRole === 'admin') {
    return true
  }

  // Members have limited access
  if (userRole === 'member') {
    // Members can list and read, but some tools may be restricted
    const allowedForMembers = [
      'initialize',
      'tools/list',
      'resources/list',
      'resources/read',
      'prompts/list',
      'prompts/get',
    ]
    return allowedForMembers.includes(operation)
  }

  return false
}

// =============================================================================
// Response Helpers
// =============================================================================

/**
 * Create an authentication error response
 */
export function createAuthErrorResponse(error: MCPAuthError): Response {
  const body = JSON.stringify({
    jsonrpc: '2.0',
    id: null,
    error: error.toJSONRPCError(),
  })

  return new Response(body, {
    status: error.httpStatus,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

/**
 * Create CORS headers for MCP responses
 *
 * MCP requests may come from various origins (Claude Desktop, web apps, etc.)
 */
export function createCORSHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('Origin') || '*'

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
    'Access-Control-Max-Age': '86400',
  }
}
