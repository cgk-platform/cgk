export const dynamic = 'force-dynamic'

import { sql, withTenant } from '@cgk-platform/db'

import { getTenantBySlug } from '@/lib/auth/authenticate'
import { getSetCookieHeader } from '@/lib/auth/cookies'
import { signContractorJWT } from '@/lib/auth/jwt'
import { hashPassword } from '@/lib/auth/password'
import { createContractorSession } from '@/lib/auth/session'

/**
 * GET /api/auth/invite?token=xxx&tenant=slug
 * Invitation redemption - validates token, activates contractor, creates session
 */
export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const token = url.searchParams.get('token')
  const tenantSlug = url.searchParams.get('tenant') || process.env.TENANT_SLUG

  if (!token) {
    return Response.json({ error: 'Invitation token is required' }, { status: 400 })
  }

  if (!tenantSlug) {
    return Response.json({ error: 'Tenant context is required' }, { status: 400 })
  }

  try {
    // Validate tenant
    const tenant = await getTenantBySlug(tenantSlug)
    if (!tenant) {
      return Response.json({ error: 'Organization not found' }, { status: 400 })
    }

    // Look up invitation token in tenant schema
    const inviteResult = await withTenant(tenantSlug, async () => {
      return sql`
        SELECT ci.contractor_id, ci.expires_at, ci.redeemed_at,
               c.email, c.name, c.status
        FROM contractor_invitations ci
        JOIN contractors c ON c.id = ci.contractor_id
        WHERE ci.token = ${token}
      `
    })

    const invite = inviteResult.rows[0]
    if (!invite) {
      return Response.json({ error: 'Invalid invitation token' }, { status: 400 })
    }

    if (invite.redeemed_at) {
      return Response.json({ error: 'This invitation has already been used' }, { status: 400 })
    }

    const expiresAt = new Date(invite.expires_at as string)
    if (expiresAt < new Date()) {
      return Response.json({ error: 'This invitation has expired' }, { status: 400 })
    }

    const contractorId = invite.contractor_id as string

    // Mark invitation as redeemed and activate contractor
    await withTenant(tenantSlug, async () => {
      await sql`
        UPDATE contractor_invitations
        SET redeemed_at = NOW()
        WHERE token = ${token}
      `
      await sql`
        UPDATE contractors
        SET status = 'active', updated_at = NOW()
        WHERE id = ${contractorId}
          AND status = 'pending'
      `
    })

    // Create session
    const { session } = await createContractorSession(
      contractorId,
      tenant.id,
      tenantSlug,
      req
    )

    // Sign JWT
    const jwt = await signContractorJWT({
      contractorId,
      sessionId: session.id,
      email: invite.email as string,
      name: invite.name as string,
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
    })

    // Set auth cookie and redirect to password setup
    const setCookieHeader = getSetCookieHeader(jwt)
    const portalUrl = process.env.CONTRACTOR_PORTAL_URL || ''
    const redirectUrl = `${portalUrl}/settings/security?setup=true`

    return new Response(null, {
      status: 302,
      headers: {
        Location: redirectUrl,
        'Set-Cookie': setCookieHeader,
      },
    })
  } catch (error) {
    console.error('Invitation redemption error:', error)
    return Response.json({ error: 'Failed to redeem invitation' }, { status: 500 })
  }
}

/**
 * POST /api/auth/invite
 * Complete invitation with password setup
 * Body: { token, tenantSlug, password }
 */
export async function POST(req: Request): Promise<Response> {
  let body: { token?: string; tenantSlug?: string; password?: string }

  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { token, password } = body
  const tenantSlug = body.tenantSlug || process.env.TENANT_SLUG

  if (!token || !password || !tenantSlug) {
    return Response.json(
      { error: 'Token, password, and tenant slug are required' },
      { status: 400 }
    )
  }

  if (password.length < 8) {
    return Response.json(
      { error: 'Password must be at least 8 characters' },
      { status: 400 }
    )
  }

  try {
    const tenant = await getTenantBySlug(tenantSlug)
    if (!tenant) {
      return Response.json({ error: 'Organization not found' }, { status: 400 })
    }

    // Look up invitation
    const inviteResult = await withTenant(tenantSlug, async () => {
      return sql`
        SELECT ci.contractor_id, ci.expires_at, ci.redeemed_at,
               c.email, c.name
        FROM contractor_invitations ci
        JOIN contractors c ON c.id = ci.contractor_id
        WHERE ci.token = ${token}
      `
    })

    const invite = inviteResult.rows[0]
    if (!invite) {
      return Response.json({ error: 'Invalid invitation token' }, { status: 400 })
    }

    const expiresAt = new Date(invite.expires_at as string)
    if (expiresAt < new Date()) {
      return Response.json({ error: 'This invitation has expired' }, { status: 400 })
    }

    const contractorId = invite.contractor_id as string
    const passwordHash = await hashPassword(password)

    // Activate contractor and set password
    await withTenant(tenantSlug, async () => {
      await sql`
        UPDATE contractors
        SET password_hash = ${passwordHash},
            status = 'active',
            updated_at = NOW()
        WHERE id = ${contractorId}
      `
      await sql`
        UPDATE contractor_invitations
        SET redeemed_at = NOW()
        WHERE token = ${token}
          AND redeemed_at IS NULL
      `
    })

    // Create session
    const { session } = await createContractorSession(
      contractorId,
      tenant.id,
      tenantSlug,
      req
    )

    // Sign JWT
    const jwt = await signContractorJWT({
      contractorId,
      sessionId: session.id,
      email: invite.email as string,
      name: invite.name as string,
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
    })

    const setCookieHeader = getSetCookieHeader(jwt)

    return Response.json(
      {
        success: true,
        contractor: {
          id: contractorId,
          email: invite.email,
          name: invite.name,
        },
      },
      {
        headers: {
          'Set-Cookie': setCookieHeader,
        },
      }
    )
  } catch (error) {
    console.error('Invitation completion error:', error)
    return Response.json({ error: 'Failed to complete invitation' }, { status: 500 })
  }
}
