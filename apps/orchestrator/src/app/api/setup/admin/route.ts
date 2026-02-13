import { hashPassword } from '@cgk-platform/auth'
import { sql } from '@cgk-platform/db'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/setup/admin
 *
 * Creates the first super admin user for the platform.
 * Only works during initial setup (no existing super admins).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, email, password } = body

    // Validate input
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: 'Name must be at least 2 characters' },
        { status: 400 }
      )
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'Valid email is required' },
        { status: 400 }
      )
    }

    if (!password || typeof password !== 'string' || password.length < 12) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 12 characters' },
        { status: 400 }
      )
    }

    // Check if a super admin already exists
    const existingResult = await sql`
      SELECT COUNT(*)::int as count FROM public.users
      WHERE role = 'super_admin' AND status = 'active'
    `

    if ((existingResult.rows[0]?.count || 0) > 0) {
      return NextResponse.json(
        { success: false, error: 'A super admin already exists. Please log in.' },
        { status: 400 }
      )
    }

    // Check if email is already in use
    const emailResult = await sql`
      SELECT id FROM public.users WHERE email = ${email.toLowerCase().trim()}
    `

    if (emailResult.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Email is already in use' },
        { status: 400 }
      )
    }

    // Hash the password
    const passwordHash = await hashPassword(password)

    // Create the super admin user
    const result = await sql`
      INSERT INTO public.users (
        id,
        email,
        password_hash,
        name,
        role,
        status,
        email_verified_at,
        created_at,
        updated_at
      )
      VALUES (
        gen_random_uuid(),
        ${email.toLowerCase().trim()},
        ${passwordHash},
        ${name.trim()},
        'super_admin',
        'active',
        NOW(),
        NOW(),
        NOW()
      )
      RETURNING id, email, name
    `

    const user = result.rows[0]

    if (!user) {
      throw new Error('Failed to create user')
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    })
  } catch (error) {
    console.error('Failed to create admin:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create admin user',
      },
      { status: 500 }
    )
  }
}
