/**
 * MCP Server Authentication
 *
 * Handles per-request authentication for MCP endpoints.
 * Supports multiple authentication methods:
 * 1. Bearer token in Authorization header (JWT)
 * 2. API key in X-API-Key header
 * 3. Session cookie (for browser-based clients)
 */

import { verifyJWT } from '@cgk/auth'
import { JSONRPCErrorCodes, type JSONRPCError } from '@cgk/mcp'

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
 * Authenticate using API key
 *
 * API keys are scoped to a tenant and optionally a user.
 * Format: cgk_{tenant_id}_{key_id}_{secret}
 */
async function authenticateAPIKey(apiKey: string): Promise<AuthResult> {
  // Validate API key format
  if (!apiKey.startsWith('cgk_')) {
    throw new MCPAuthError(
      'Invalid API key format',
      JSONRPCErrorCodes.AUTHENTICATION_REQUIRED
    )
  }

  // Parse API key parts
  const parts = apiKey.split('_')
  if (parts.length < 4) {
    throw new MCPAuthError(
      'Invalid API key format',
      JSONRPCErrorCodes.AUTHENTICATION_REQUIRED
    )
  }

  const tenantId = parts[1]

  // In a real implementation, we would:
  // 1. Look up the API key in the database
  // 2. Verify it's not revoked
  // 3. Check rate limits
  // 4. Get the associated user ID
  //
  // For now, we'll validate the format and return a placeholder
  // This will be replaced with actual database lookup in a future phase

  // Placeholder: API key validation would happen here
  // For development, accept any well-formed key
  if (!tenantId || tenantId.length < 3) {
    throw new MCPAuthError(
      'Invalid API key: tenant ID not found',
      JSONRPCErrorCodes.AUTHENTICATION_REQUIRED
    )
  }

  // Return placeholder auth result
  // In production, this would come from database lookup
  return {
    tenantId,
    userId: `api_${parts[2]}`, // Key ID becomes user context
    email: `api-key@${tenantId}.cgk.local`,
  }
}

/**
 * Extract auth token from cookie header
 */
function extractAuthCookie(cookieHeader: string): string | null {
  const cookies = cookieHeader.split(';').map((c) => c.trim())

  for (const cookie of cookies) {
    // Check for cgk-auth cookie (matches AUTH_COOKIE_NAME from @cgk/auth)
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
