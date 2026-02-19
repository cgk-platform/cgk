export const dynamic = 'force-dynamic'

import { randomBytes } from 'crypto'

import { sql, withTenant } from '@cgk-platform/db'
import { headers } from 'next/headers'

/**
 * POST /api/auth/signin
 * Customer login - validates email/password, creates session
 */
export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return Response.json({ error: 'Store not found' }, { status: 400 })
  }

  let body: { email?: string; password?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { email, password } = body
  if (!email || !password) {
    return Response.json({ error: 'Email and password are required' }, { status: 400 })
  }

  try {
    // Look up customer by email
    const customerResult = await withTenant(tenantSlug, async () => {
      return sql`
        SELECT id, email, first_name, last_name, password_hash
        FROM customers
        WHERE email = ${email.toLowerCase().trim()}
      `
    })

    const customer = customerResult.rows[0]
    if (!customer) {
      return Response.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    if (!customer.password_hash) {
      return Response.json(
        { error: 'Password login is not enabled for this account' },
        { status: 401 }
      )
    }

    // Verify password using bcrypt-compatible check
    const { verifyPassword } = await import('@cgk-platform/auth')
    const isValid = await verifyPassword(password, customer.password_hash as string)
    if (!isValid) {
      return Response.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    // Create session token (stored as-is to match getCustomerSession lookup)
    const sessionToken = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

    await withTenant(tenantSlug, async () => {
      return sql`
        INSERT INTO customer_sessions (customer_id, session_token, expires_at)
        VALUES (${customer.id}, ${sessionToken}, ${expiresAt.toISOString()})
      `
    })

    // Set session cookie
    const isProduction = process.env.NODE_ENV === 'production'
    const cookieParts = [
      `cgk_session_id=${sessionToken}`,
      'Path=/',
      `Max-Age=${30 * 24 * 60 * 60}`,
      'HttpOnly',
      'SameSite=Lax',
    ]
    if (isProduction) {
      cookieParts.push('Secure')
    }

    return Response.json(
      {
        success: true,
        customer: {
          id: customer.id,
          email: customer.email,
          firstName: customer.first_name,
          lastName: customer.last_name,
        },
      },
      {
        headers: {
          'Set-Cookie': cookieParts.join('; '),
        },
      }
    )
  } catch (error) {
    console.error('Signin error:', error)
    return Response.json({ error: 'Sign in failed' }, { status: 500 })
  }
}
