export const dynamic = 'force-dynamic'

import { randomBytes } from 'crypto'

import { sql, withTenant } from '@cgk-platform/db'
import { headers } from 'next/headers'

/**
 * POST /api/auth/signup
 * Customer registration - creates account and session
 */
export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return Response.json({ error: 'Store not found' }, { status: 400 })
  }

  let body: { email?: string; password?: string; firstName?: string; lastName?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { email, password, firstName, lastName } = body
  if (!email || !password) {
    return Response.json({ error: 'Email and password are required' }, { status: 400 })
  }

  if (password.length < 8) {
    return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  const normalizedEmail = email.toLowerCase().trim()

  try {
    // Check if email already exists
    const existing = await withTenant(tenantSlug, async () => {
      return sql`SELECT id FROM customers WHERE email = ${normalizedEmail}`
    })

    if (existing.rows.length > 0) {
      return Response.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      )
    }

    // Hash password
    const { hashPassword } = await import('@cgk-platform/auth')
    const passwordHash = await hashPassword(password)

    // Create customer
    const customerResult = await withTenant(tenantSlug, async () => {
      return sql`
        INSERT INTO customers (email, first_name, last_name, password_hash, accepts_marketing)
        VALUES (${normalizedEmail}, ${firstName || null}, ${lastName || null}, ${passwordHash}, false)
        RETURNING id, email, first_name, last_name
      `
    })

    const customer = customerResult.rows[0]
    if (!customer) {
      return Response.json({ error: 'Failed to create account' }, { status: 500 })
    }

    // Create session (stored as-is to match getCustomerSession lookup)
    const sessionToken = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

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
        status: 201,
        headers: {
          'Set-Cookie': cookieParts.join('; '),
        },
      }
    )
  } catch (error) {
    console.error('Signup error:', error)
    return Response.json({ error: 'Registration failed' }, { status: 500 })
  }
}
