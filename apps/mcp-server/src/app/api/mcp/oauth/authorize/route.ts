/**
 * MCP OAuth Authorization Endpoint
 *
 * Implements OAuth 2.0 Authorization Code flow with PKCE for Claude Connector.
 * This endpoint handles the authorization request and redirects to the login page.
 *
 * @route GET /api/mcp/oauth/authorize
 *
 * OAuth 2.0 Authorization Code Flow with PKCE:
 * 1. Claude sends user here with code_challenge (S256)
 * 2. User authenticates via our login page
 * 3. We redirect back to Claude with authorization code
 * 4. Claude exchanges code for tokens at /oauth/token
 */

import { NextResponse } from 'next/server'
import { sql } from '@cgk-platform/db'

// =============================================================================
// Edge Runtime Configuration
// =============================================================================

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

// =============================================================================
// Types
// =============================================================================

interface AuthorizeParams {
  response_type: string
  client_id: string
  redirect_uri: string
  scope?: string
  state: string
  code_challenge: string
  code_challenge_method: string
}

// =============================================================================
// Constants
// =============================================================================

const VALID_RESPONSE_TYPES = ['code']
const VALID_CODE_CHALLENGE_METHODS = ['S256']
const AUTH_CODE_EXPIRY_MS = 10 * 60 * 1000 // 10 minutes
const MAX_STATE_LENGTH = 512
const MAX_SCOPE_LENGTH = 1024

// =============================================================================
// Helpers
// =============================================================================

/**
 * Generate a secure random authorization code
 */
function generateAuthCode(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

/**
 * Validate the client_id exists and redirect_uri is allowed
 */
async function validateClient(
  clientId: string,
  redirectUri: string
): Promise<{ valid: boolean; error?: string; tenantId?: string }> {
  try {
    // Query oauth_clients table to verify client exists and redirect_uri is allowed
    const result = await sql`
      SELECT
        oc.id,
        oc.name,
        oc.allowed_redirect_uris,
        oc.is_active,
        o.slug as tenant_slug
      FROM public.oauth_clients oc
      JOIN public.organizations o ON oc.organization_id = o.id
      WHERE oc.client_id = ${clientId}
    `

    const client = result.rows[0] as
      | {
          id: string
          name: string
          allowed_redirect_uris: string[]
          is_active: boolean
          tenant_slug: string
        }
      | undefined

    if (!client) {
      return { valid: false, error: 'invalid_client' }
    }

    if (!client.is_active) {
      return { valid: false, error: 'invalid_client' }
    }

    // Check if redirect_uri matches any allowed patterns
    const allowedUris = client.allowed_redirect_uris || []
    const isRedirectAllowed = allowedUris.some((pattern) => {
      // Exact match
      if (pattern === redirectUri) return true
      // Pattern with wildcard (e.g., https://*.claude.ai/callback)
      if (pattern.includes('*')) {
        const regex = new RegExp('^' + pattern.replace(/\*/g, '[^/]+') + '$')
        return regex.test(redirectUri)
      }
      return false
    })

    if (!isRedirectAllowed) {
      return { valid: false, error: 'invalid_redirect_uri' }
    }

    return { valid: true, tenantId: client.tenant_slug }
  } catch (error) {
    console.error('OAuth client validation error:', error)
    return { valid: false, error: 'server_error' }
  }
}

/**
 * Store authorization request for later verification
 */
async function storeAuthRequest(params: {
  code: string
  clientId: string
  redirectUri: string
  scope: string
  state: string
  codeChallenge: string
  codeChallengeMethod: string
  tenantId: string
  expiresAt: Date
}): Promise<boolean> {
  try {
    await sql`
      INSERT INTO public.oauth_authorization_codes (
        code,
        client_id,
        redirect_uri,
        scope,
        state,
        code_challenge,
        code_challenge_method,
        tenant_id,
        expires_at,
        created_at
      ) VALUES (
        ${params.code},
        ${params.clientId},
        ${params.redirectUri},
        ${params.scope},
        ${params.state},
        ${params.codeChallenge},
        ${params.codeChallengeMethod},
        ${params.tenantId},
        ${params.expiresAt.toISOString()},
        NOW()
      )
    `
    return true
  } catch (error) {
    console.error('Failed to store auth request:', error)
    return false
  }
}

/**
 * Create an OAuth error redirect URL
 */
function createErrorRedirect(
  redirectUri: string,
  error: string,
  errorDescription: string,
  state?: string
): string {
  const url = new URL(redirectUri)
  url.searchParams.set('error', error)
  url.searchParams.set('error_description', errorDescription)
  if (state) {
    url.searchParams.set('state', state)
  }
  return url.toString()
}

// =============================================================================
// GET Handler - Authorization Request
// =============================================================================

/**
 * Handle OAuth authorization requests
 *
 * Required parameters:
 * - response_type: Must be "code"
 * - client_id: The OAuth client identifier
 * - redirect_uri: Where to redirect after authorization
 * - state: CSRF protection token
 * - code_challenge: PKCE challenge (S256 hash of code_verifier)
 * - code_challenge_method: Must be "S256"
 *
 * Optional parameters:
 * - scope: Space-separated list of requested scopes
 */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const params: AuthorizeParams = {
    response_type: url.searchParams.get('response_type') || '',
    client_id: url.searchParams.get('client_id') || '',
    redirect_uri: url.searchParams.get('redirect_uri') || '',
    scope: url.searchParams.get('scope') || '',
    state: url.searchParams.get('state') || '',
    code_challenge: url.searchParams.get('code_challenge') || '',
    code_challenge_method: url.searchParams.get('code_challenge_method') || '',
  }

  // ==========================================================================
  // Validate required parameters
  // ==========================================================================

  // Validate response_type
  if (!params.response_type) {
    return NextResponse.json(
      {
        error: 'invalid_request',
        error_description: 'Missing required parameter: response_type',
      },
      { status: 400 }
    )
  }

  if (!VALID_RESPONSE_TYPES.includes(params.response_type)) {
    return NextResponse.json(
      {
        error: 'unsupported_response_type',
        error_description: `Unsupported response_type: ${params.response_type}. Use "code".`,
      },
      { status: 400 }
    )
  }

  // Validate client_id
  if (!params.client_id) {
    return NextResponse.json(
      {
        error: 'invalid_request',
        error_description: 'Missing required parameter: client_id',
      },
      { status: 400 }
    )
  }

  // Validate redirect_uri
  if (!params.redirect_uri) {
    return NextResponse.json(
      {
        error: 'invalid_request',
        error_description: 'Missing required parameter: redirect_uri',
      },
      { status: 400 }
    )
  }

  // Basic URL validation for redirect_uri
  try {
    new URL(params.redirect_uri)
  } catch {
    return NextResponse.json(
      {
        error: 'invalid_request',
        error_description: 'Invalid redirect_uri format',
      },
      { status: 400 }
    )
  }

  // Validate state (required for CSRF protection)
  if (!params.state) {
    return NextResponse.json(
      {
        error: 'invalid_request',
        error_description: 'Missing required parameter: state',
      },
      { status: 400 }
    )
  }

  if (params.state.length > MAX_STATE_LENGTH) {
    return NextResponse.json(
      {
        error: 'invalid_request',
        error_description: 'state parameter exceeds maximum length',
      },
      { status: 400 }
    )
  }

  // Validate PKCE parameters (required for security)
  if (!params.code_challenge) {
    return NextResponse.json(
      {
        error: 'invalid_request',
        error_description: 'Missing required parameter: code_challenge (PKCE is required)',
      },
      { status: 400 }
    )
  }

  if (!params.code_challenge_method) {
    return NextResponse.json(
      {
        error: 'invalid_request',
        error_description: 'Missing required parameter: code_challenge_method',
      },
      { status: 400 }
    )
  }

  if (!VALID_CODE_CHALLENGE_METHODS.includes(params.code_challenge_method)) {
    return NextResponse.json(
      {
        error: 'invalid_request',
        error_description: `Unsupported code_challenge_method: ${params.code_challenge_method}. Use "S256".`,
      },
      { status: 400 }
    )
  }

  // Validate code_challenge format (base64url encoded SHA-256, 43 chars)
  if (!/^[A-Za-z0-9_-]{43}$/.test(params.code_challenge)) {
    return NextResponse.json(
      {
        error: 'invalid_request',
        error_description: 'Invalid code_challenge format. Must be base64url-encoded SHA-256 hash.',
      },
      { status: 400 }
    )
  }

  // Validate scope length
  if (params.scope && params.scope.length > MAX_SCOPE_LENGTH) {
    return NextResponse.json(
      {
        error: 'invalid_request',
        error_description: 'scope parameter exceeds maximum length',
      },
      { status: 400 }
    )
  }

  // ==========================================================================
  // Validate client and redirect_uri
  // ==========================================================================

  const clientValidation = await validateClient(params.client_id, params.redirect_uri)

  if (!clientValidation.valid) {
    // For invalid client or redirect_uri, we cannot safely redirect
    // Return error directly
    if (clientValidation.error === 'invalid_redirect_uri') {
      return NextResponse.json(
        {
          error: 'invalid_request',
          error_description: 'redirect_uri is not registered for this client',
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'invalid_client',
        error_description: 'Unknown or inactive client_id',
      },
      { status: 401 }
    )
  }

  // ==========================================================================
  // Generate authorization code and store request
  // ==========================================================================

  const authCode = generateAuthCode()
  const expiresAt = new Date(Date.now() + AUTH_CODE_EXPIRY_MS)

  const stored = await storeAuthRequest({
    code: authCode,
    clientId: params.client_id,
    redirectUri: params.redirect_uri,
    scope: params.scope || '',
    state: params.state,
    codeChallenge: params.code_challenge,
    codeChallengeMethod: params.code_challenge_method,
    tenantId: clientValidation.tenantId!,
    expiresAt,
  })

  if (!stored) {
    return NextResponse.redirect(
      createErrorRedirect(
        params.redirect_uri,
        'server_error',
        'Failed to process authorization request',
        params.state
      )
    )
  }

  // ==========================================================================
  // Redirect to login page
  // ==========================================================================

  // Build login URL with the authorization code embedded
  // The login page will complete authentication and redirect back
  const baseUrl = new URL(request.url).origin
  const loginUrl = new URL('/auth/oauth/login', baseUrl)
  loginUrl.searchParams.set('auth_code', authCode)
  loginUrl.searchParams.set('client_id', params.client_id)
  loginUrl.searchParams.set('redirect_uri', params.redirect_uri)
  loginUrl.searchParams.set('state', params.state)
  if (params.scope) {
    loginUrl.searchParams.set('scope', params.scope)
  }

  return NextResponse.redirect(loginUrl.toString())
}

// =============================================================================
// POST Handler - Direct Authorization (for API clients)
// =============================================================================

/**
 * Handle direct authorization for already-authenticated users
 *
 * This endpoint is called by the login page after user authentication
 * to complete the OAuth flow and redirect back to the client.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json()
    const { auth_code, user_id, tenant_id, approved } = body as {
      auth_code?: string
      user_id?: string
      tenant_id?: string
      approved?: boolean
    }

    if (!auth_code) {
      return NextResponse.json(
        { error: 'invalid_request', error_description: 'Missing auth_code' },
        { status: 400 }
      )
    }

    // Retrieve the authorization request
    const result = await sql`
      SELECT
        code,
        client_id,
        redirect_uri,
        scope,
        state,
        code_challenge,
        code_challenge_method,
        tenant_id,
        expires_at,
        user_id as existing_user_id
      FROM public.oauth_authorization_codes
      WHERE code = ${auth_code}
        AND used_at IS NULL
    `

    const authRequest = result.rows[0] as
      | {
          code: string
          client_id: string
          redirect_uri: string
          scope: string
          state: string
          code_challenge: string
          code_challenge_method: string
          tenant_id: string
          expires_at: Date
          existing_user_id: string | null
        }
      | undefined

    if (!authRequest) {
      return NextResponse.json(
        { error: 'invalid_request', error_description: 'Invalid or expired authorization code' },
        { status: 400 }
      )
    }

    // Check expiration
    if (new Date(authRequest.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'invalid_request', error_description: 'Authorization code has expired' },
        { status: 400 }
      )
    }

    // If user denied authorization
    if (approved === false) {
      const errorRedirect = createErrorRedirect(
        authRequest.redirect_uri,
        'access_denied',
        'User denied the authorization request',
        authRequest.state
      )
      return NextResponse.json({ redirect_uri: errorRedirect })
    }

    // Update the authorization code with user info
    if (user_id && tenant_id) {
      await sql`
        UPDATE public.oauth_authorization_codes
        SET user_id = ${user_id}, tenant_id = ${tenant_id}
        WHERE code = ${auth_code}
      `
    }

    // Build success redirect URL with authorization code
    const redirectUrl = new URL(authRequest.redirect_uri)
    redirectUrl.searchParams.set('code', auth_code)
    redirectUrl.searchParams.set('state', authRequest.state)

    return NextResponse.json({ redirect_uri: redirectUrl.toString() })
  } catch (error) {
    console.error('OAuth authorize POST error:', error)
    return NextResponse.json(
      { error: 'server_error', error_description: 'Internal server error' },
      { status: 500 }
    )
  }
}
