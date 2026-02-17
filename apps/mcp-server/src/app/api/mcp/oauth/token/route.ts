/**
 * MCP OAuth Token Endpoint
 *
 * Implements OAuth 2.0 Token Exchange for Claude Connector.
 * Exchanges authorization codes for access tokens with PKCE verification.
 *
 * @route POST /api/mcp/oauth/token
 *
 * Supported grant types:
 * - authorization_code: Exchange auth code for tokens (with PKCE)
 * - refresh_token: Refresh an expired access token
 */

import { NextResponse } from 'next/server'
import { sql } from '@cgk-platform/db'
import * as jose from 'jose'

// =============================================================================
// Edge Runtime Configuration
// =============================================================================

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

// =============================================================================
// Types
// =============================================================================

interface TokenRequest {
  grant_type: string
  code?: string
  redirect_uri?: string
  client_id?: string
  client_secret?: string
  code_verifier?: string
  refresh_token?: string
  scope?: string
}

interface TokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token: string
  scope?: string
}

// =============================================================================
// Constants
// =============================================================================

const ACCESS_TOKEN_EXPIRY_SECONDS = 3600 // 1 hour
const REFRESH_TOKEN_EXPIRY_SECONDS = 30 * 24 * 3600 // 30 days
const VALID_GRANT_TYPES = ['authorization_code', 'refresh_token']

// JWT secret for signing MCP access tokens
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'development-secret-change-in-production'
)

// =============================================================================
// Helpers
// =============================================================================

/**
 * Generate a secure random refresh token
 */
function generateRefreshToken(): string {
  const bytes = new Uint8Array(48)
  crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

/**
 * Compute SHA-256 hash and return base64url encoded
 */
async function sha256Base64Url(input: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const base64 = btoa(String.fromCharCode(...hashArray))
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

/**
 * Verify PKCE code_verifier against stored code_challenge
 */
async function verifyPKCE(
  codeVerifier: string,
  codeChallenge: string,
  codeChallengeMethod: string
): Promise<boolean> {
  if (codeChallengeMethod !== 'S256') {
    return false
  }

  const computed = await sha256Base64Url(codeVerifier)
  return computed === codeChallenge
}

/**
 * Validate client credentials
 */
async function validateClientCredentials(
  clientId: string,
  clientSecret?: string
): Promise<{ valid: boolean; error?: string; organizationId?: string }> {
  try {
    const result = await sql`
      SELECT
        id,
        organization_id,
        client_secret_hash,
        is_public,
        is_active
      FROM public.oauth_clients
      WHERE client_id = ${clientId}
    `

    const client = result.rows[0] as
      | {
          id: string
          organization_id: string
          client_secret_hash: string | null
          is_public: boolean
          is_active: boolean
        }
      | undefined

    if (!client) {
      return { valid: false, error: 'invalid_client' }
    }

    if (!client.is_active) {
      return { valid: false, error: 'invalid_client' }
    }

    // For confidential clients, verify client_secret
    if (!client.is_public) {
      if (!clientSecret) {
        return { valid: false, error: 'invalid_client' }
      }

      // Hash the provided secret and compare
      const secretHash = await sha256Base64Url(clientSecret)
      if (secretHash !== client.client_secret_hash) {
        return { valid: false, error: 'invalid_client' }
      }
    }

    return { valid: true, organizationId: client.organization_id }
  } catch (error) {
    console.error('Client validation error:', error)
    return { valid: false, error: 'server_error' }
  }
}

/**
 * Create OAuth error response
 */
function createErrorResponse(
  error: string,
  errorDescription: string,
  status = 400
): NextResponse {
  return NextResponse.json(
    {
      error,
      error_description: errorDescription,
    },
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        Pragma: 'no-cache',
      },
    }
  )
}

/**
 * Create successful token response
 */
function createTokenResponse(tokenResponse: TokenResponse): NextResponse {
  return NextResponse.json(tokenResponse, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      Pragma: 'no-cache',
    },
  })
}

// =============================================================================
// Grant Type Handlers
// =============================================================================

/**
 * Handle authorization_code grant type
 */
async function handleAuthorizationCodeGrant(
  params: TokenRequest
): Promise<NextResponse> {
  const { code, redirect_uri, client_id, code_verifier } = params

  // Validate required parameters
  if (!code) {
    return createErrorResponse('invalid_request', 'Missing required parameter: code')
  }

  if (!redirect_uri) {
    return createErrorResponse('invalid_request', 'Missing required parameter: redirect_uri')
  }

  if (!client_id) {
    return createErrorResponse('invalid_request', 'Missing required parameter: client_id')
  }

  if (!code_verifier) {
    return createErrorResponse('invalid_request', 'Missing required parameter: code_verifier (PKCE is required)')
  }

  // Retrieve the authorization code
  const result = await sql`
    SELECT
      code,
      client_id,
      redirect_uri,
      scope,
      code_challenge,
      code_challenge_method,
      user_id,
      tenant_id,
      expires_at,
      used_at
    FROM public.oauth_authorization_codes
    WHERE code = ${code}
  `

  const authCode = result.rows[0] as
    | {
        code: string
        client_id: string
        redirect_uri: string
        scope: string
        code_challenge: string
        code_challenge_method: string
        user_id: string | null
        tenant_id: string
        expires_at: Date
        used_at: Date | null
      }
    | undefined

  if (!authCode) {
    return createErrorResponse('invalid_grant', 'Invalid authorization code')
  }

  // Check if code was already used (prevent replay attacks)
  if (authCode.used_at) {
    // Revoke all tokens issued with this code (security measure)
    await sql`
      UPDATE public.oauth_refresh_tokens
      SET revoked_at = NOW()
      WHERE authorization_code = ${code}
    `
    return createErrorResponse('invalid_grant', 'Authorization code has already been used')
  }

  // Check expiration
  if (new Date(authCode.expires_at) < new Date()) {
    return createErrorResponse('invalid_grant', 'Authorization code has expired')
  }

  // Validate client_id matches
  if (authCode.client_id !== client_id) {
    return createErrorResponse('invalid_grant', 'client_id does not match authorization request')
  }

  // Validate redirect_uri matches exactly
  if (authCode.redirect_uri !== redirect_uri) {
    return createErrorResponse('invalid_grant', 'redirect_uri does not match authorization request')
  }

  // Validate user was authenticated
  if (!authCode.user_id) {
    return createErrorResponse('invalid_grant', 'Authorization was not completed by user')
  }

  // Verify PKCE code_verifier
  const pkceValid = await verifyPKCE(
    code_verifier,
    authCode.code_challenge,
    authCode.code_challenge_method
  )

  if (!pkceValid) {
    return createErrorResponse('invalid_grant', 'PKCE verification failed')
  }

  // Mark authorization code as used
  await sql`
    UPDATE public.oauth_authorization_codes
    SET used_at = NOW()
    WHERE code = ${code}
  `

  // Generate access token with MCP-specific claims
  const accessToken = await new jose.SignJWT({
    sub: authCode.user_id,
    orgId: authCode.tenant_id,
    scope: authCode.scope,
    type: 'mcp_access',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_EXPIRY_SECONDS}s`)
    .sign(JWT_SECRET)

  const refreshToken = generateRefreshToken()
  const refreshExpiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_SECONDS * 1000)

  // Store refresh token
  await sql`
    INSERT INTO public.oauth_refresh_tokens (
      token_hash,
      client_id,
      user_id,
      tenant_id,
      scope,
      authorization_code,
      expires_at,
      created_at
    ) VALUES (
      ${await sha256Base64Url(refreshToken)},
      ${client_id},
      ${authCode.user_id},
      ${authCode.tenant_id},
      ${authCode.scope},
      ${code},
      ${refreshExpiresAt.toISOString()},
      NOW()
    )
  `

  const response: TokenResponse = {
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: ACCESS_TOKEN_EXPIRY_SECONDS,
    refresh_token: refreshToken,
  }

  if (authCode.scope) {
    response.scope = authCode.scope
  }

  return createTokenResponse(response)
}

/**
 * Handle refresh_token grant type
 */
async function handleRefreshTokenGrant(params: TokenRequest): Promise<NextResponse> {
  const { refresh_token, client_id, scope } = params

  if (!refresh_token) {
    return createErrorResponse('invalid_request', 'Missing required parameter: refresh_token')
  }

  if (!client_id) {
    return createErrorResponse('invalid_request', 'Missing required parameter: client_id')
  }

  // Hash the token for lookup
  const tokenHash = await sha256Base64Url(refresh_token)

  // Retrieve the refresh token
  const result = await sql`
    SELECT
      id,
      token_hash,
      client_id,
      user_id,
      tenant_id,
      scope,
      expires_at,
      revoked_at
    FROM public.oauth_refresh_tokens
    WHERE token_hash = ${tokenHash}
  `

  const storedToken = result.rows[0] as
    | {
        id: string
        token_hash: string
        client_id: string
        user_id: string
        tenant_id: string
        scope: string
        expires_at: Date
        revoked_at: Date | null
      }
    | undefined

  if (!storedToken) {
    return createErrorResponse('invalid_grant', 'Invalid refresh token')
  }

  // Check if revoked
  if (storedToken.revoked_at) {
    return createErrorResponse('invalid_grant', 'Refresh token has been revoked')
  }

  // Check expiration
  if (new Date(storedToken.expires_at) < new Date()) {
    return createErrorResponse('invalid_grant', 'Refresh token has expired')
  }

  // Validate client_id matches
  if (storedToken.client_id !== client_id) {
    return createErrorResponse('invalid_grant', 'client_id does not match token')
  }

  // Handle scope downgrade (can only request same or fewer scopes)
  let newScope = storedToken.scope
  if (scope) {
    const originalScopes = new Set(storedToken.scope.split(' ').filter(Boolean))
    const requestedScopes = scope.split(' ').filter(Boolean)

    // Verify all requested scopes were in original grant
    for (const requestedScope of requestedScopes) {
      if (!originalScopes.has(requestedScope)) {
        return createErrorResponse('invalid_scope', `Scope "${requestedScope}" was not in original grant`)
      }
    }

    newScope = requestedScopes.join(' ')
  }

  // Generate new access token with MCP-specific claims
  const accessToken = await new jose.SignJWT({
    sub: storedToken.user_id,
    orgId: storedToken.tenant_id,
    scope: newScope,
    type: 'mcp_access',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_EXPIRY_SECONDS}s`)
    .sign(JWT_SECRET)

  // Optionally rotate refresh token (security best practice)
  const newRefreshToken = generateRefreshToken()
  const refreshExpiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_SECONDS * 1000)

  // Revoke old token and create new one
  await sql`
    UPDATE public.oauth_refresh_tokens
    SET revoked_at = NOW()
    WHERE id = ${storedToken.id}
  `

  await sql`
    INSERT INTO public.oauth_refresh_tokens (
      token_hash,
      client_id,
      user_id,
      tenant_id,
      scope,
      expires_at,
      created_at
    ) VALUES (
      ${await sha256Base64Url(newRefreshToken)},
      ${client_id},
      ${storedToken.user_id},
      ${storedToken.tenant_id},
      ${newScope},
      ${refreshExpiresAt.toISOString()},
      NOW()
    )
  `

  const response: TokenResponse = {
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: ACCESS_TOKEN_EXPIRY_SECONDS,
    refresh_token: newRefreshToken,
  }

  if (newScope) {
    response.scope = newScope
  }

  return createTokenResponse(response)
}

// =============================================================================
// POST Handler - Token Request
// =============================================================================

/**
 * Handle OAuth token requests
 *
 * Supports:
 * - Authorization Code exchange (with PKCE)
 * - Refresh Token exchange
 *
 * Request body (application/x-www-form-urlencoded or application/json):
 * - grant_type: "authorization_code" or "refresh_token"
 * - For authorization_code: code, redirect_uri, client_id, code_verifier
 * - For refresh_token: refresh_token, client_id, scope (optional)
 */
export async function POST(request: Request): Promise<Response> {
  try {
    // Parse request body (support both form-urlencoded and JSON)
    let params: TokenRequest
    const contentType = request.headers.get('content-type') || ''

    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData()
      params = {
        grant_type: formData.get('grant_type')?.toString() || '',
        code: formData.get('code')?.toString(),
        redirect_uri: formData.get('redirect_uri')?.toString(),
        client_id: formData.get('client_id')?.toString(),
        client_secret: formData.get('client_secret')?.toString(),
        code_verifier: formData.get('code_verifier')?.toString(),
        refresh_token: formData.get('refresh_token')?.toString(),
        scope: formData.get('scope')?.toString(),
      }
    } else if (contentType.includes('application/json')) {
      const body = await request.json()
      params = body as TokenRequest
    } else {
      // Try to parse as form data by default
      const text = await request.text()
      const urlParams = new URLSearchParams(text)
      params = {
        grant_type: urlParams.get('grant_type') || '',
        code: urlParams.get('code') || undefined,
        redirect_uri: urlParams.get('redirect_uri') || undefined,
        client_id: urlParams.get('client_id') || undefined,
        client_secret: urlParams.get('client_secret') || undefined,
        code_verifier: urlParams.get('code_verifier') || undefined,
        refresh_token: urlParams.get('refresh_token') || undefined,
        scope: urlParams.get('scope') || undefined,
      }
    }

    // Check for client credentials in Authorization header
    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Basic ')) {
      try {
        const base64Credentials = authHeader.slice(6)
        const credentials = atob(base64Credentials)
        const [clientId, clientSecret] = credentials.split(':')
        if (clientId && !params.client_id) {
          params.client_id = clientId
        }
        if (clientSecret && !params.client_secret) {
          params.client_secret = clientSecret
        }
      } catch {
        return createErrorResponse('invalid_request', 'Invalid Authorization header format')
      }
    }

    // Validate grant_type
    if (!params.grant_type) {
      return createErrorResponse('invalid_request', 'Missing required parameter: grant_type')
    }

    if (!VALID_GRANT_TYPES.includes(params.grant_type)) {
      return createErrorResponse(
        'unsupported_grant_type',
        `Unsupported grant_type: ${params.grant_type}`
      )
    }

    // Validate client credentials for confidential clients
    if (params.client_id && params.client_secret) {
      const clientValidation = await validateClientCredentials(
        params.client_id,
        params.client_secret
      )

      if (!clientValidation.valid) {
        return createErrorResponse('invalid_client', 'Client authentication failed', 401)
      }
    }

    // Route to appropriate handler
    switch (params.grant_type) {
      case 'authorization_code':
        return handleAuthorizationCodeGrant(params)

      case 'refresh_token':
        return handleRefreshTokenGrant(params)

      default:
        return createErrorResponse('unsupported_grant_type', `Unknown grant type: ${params.grant_type}`)
    }
  } catch (error) {
    console.error('OAuth token error:', error)
    return createErrorResponse('server_error', 'Internal server error', 500)
  }
}

// =============================================================================
// OPTIONS Handler - CORS Preflight
// =============================================================================

export async function OPTIONS(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  })
}
