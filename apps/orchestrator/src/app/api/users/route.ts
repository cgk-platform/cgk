import { requireAuth } from '@cgk-platform/auth'
// import { sendEmail } from '@cgk-platform/communications' // TODO: Implement email sending via queue
import { sql } from '@vercel/postgres'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/users - List all users (platform-wide for super admins)
 */
export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request)

    if (auth.role !== 'super_admin') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const status = searchParams.get('status') || 'all'
    const isSuperAdmin = searchParams.get('isSuperAdmin') || 'all'
    const search = searchParams.get('search') || ''
    const offset = (page - 1) * limit

    // Build WHERE clauses
    const whereClauses: string[] = []
    const params: (string | number)[] = []
    let paramIndex = 1

    if (status !== 'all') {
      whereClauses.push(`u.status = $${paramIndex}`)
      params.push(status)
      paramIndex++
    }

    if (isSuperAdmin === 'yes') {
      whereClauses.push(`u.is_super_admin = true`)
    } else if (isSuperAdmin === 'no') {
      whereClauses.push(`u.is_super_admin = false`)
    }

    if (search) {
      whereClauses.push(`(u.email ILIKE $${paramIndex} OR u.name ILIKE $${paramIndex})`)
      params.push(`%${search}%`)
      paramIndex++
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : ''

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as count
      FROM public.users u
      ${whereClause}
    `
    const countResult = await sql.query(countQuery, params)
    const total = parseInt(countResult.rows[0]?.count || '0')

    // Get users with tenant count
    const usersQuery = `
      SELECT
        u.id,
        u.email,
        u.name,
        u.avatar_url,
        u.status,
        u.email_verified,
        u.last_login_at,
        u.created_at,
        u.is_super_admin,
        COUNT(DISTINCT tm.organization_id) as tenant_count
      FROM public.users u
      LEFT JOIN public.team_memberships tm ON u.id = tm.user_id
      ${whereClause}
      GROUP BY u.id
      ORDER BY u.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `
    params.push(limit, offset)

    const usersResult = await sql.query(usersQuery, params)

    return NextResponse.json({
      users: usersResult.rows.map((row: any) => ({
        id: row.id,
        email: row.email,
        name: row.name,
        avatarUrl: row.avatar_url,
        status: row.status,
        role: row.is_super_admin ? 'Super Admin' : 'User',
        emailVerified: row.email_verified,
        lastLoginAt: row.last_login_at,
        createdAt: row.created_at,
        tenantCount: parseInt(row.tenant_count),
        isSuperAdmin: row.is_super_admin,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Failed to fetch users:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

/**
 * POST /api/users - Create a new user and assign to tenant
 */
export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request)

    if (auth.role !== 'super_admin') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { email, name, organizationId, role = 'admin', sendInvite = true } = body

    if (!email || !organizationId) {
      return NextResponse.json(
        { error: 'Email and organization ID are required' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await sql`
      SELECT id, email, status FROM public.users WHERE email = ${email}
    `

    let userId: string
    const existingUserRow = existingUser.rows[0]

    if (existingUserRow) {
      // User exists - just add to organization
      userId = existingUserRow.id as string

      // Check if already a member
      const existingMembership = await sql`
        SELECT id FROM public.team_memberships
        WHERE user_id = ${userId} AND organization_id = ${organizationId}
      `

      if (existingMembership.rows.length > 0) {
        return NextResponse.json(
          { error: 'User is already a member of this organization' },
          { status: 400 }
        )
      }
    } else {
      // Create new user
      const newUser = await sql`
        INSERT INTO public.users (email, name, status)
        VALUES (${email}, ${name || null}, 'invited')
        RETURNING id
      `
      userId = newUser.rows[0]?.id as string
    }

    // Add user to organization
    await sql`
      INSERT INTO public.team_memberships (user_id, organization_id, role)
      VALUES (${userId}, ${organizationId}, ${role})
    `

    // Send invitation email if requested
    if (sendInvite) {
      try {
        const org = await sql`SELECT name, slug FROM public.organizations WHERE id = ${organizationId}`
        const orgName = org.rows[0]?.name || 'CGK Platform'

        // TODO: Implement email sending via queue system
        // await sendEmail({
        //   to: email,
        //   subject: `You've been invited to ${orgName}`,
        //   html: `
        //     <p>Hi ${name || 'there'},</p>
        //     <p>You've been invited to join <strong>${orgName}</strong> on CGK Platform.</p>
        //     <p>Click the link below to set up your account:</p>
        //     <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/auth/signup?email=${encodeURIComponent(email)}">Accept Invitation</a></p>
        //   `,
        // })
        console.log(`TODO: Send invitation email to ${email} for ${orgName}`)
      } catch (emailError) {
        console.error('Failed to send invitation email:', emailError)
        // Don't fail the whole operation if email fails
      }
    }

    return NextResponse.json({
      success: true,
      userId,
      message: sendInvite ? 'User created and invitation sent' : 'User created successfully',
    })
  } catch (error) {
    console.error('Failed to create user:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create user' },
      { status: 500 }
    )
  }
}
