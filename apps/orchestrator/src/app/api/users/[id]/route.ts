import { requireAuth } from '@cgk-platform/auth'
import { sql } from '@vercel/postgres'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/users/[id] - Get user details
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request)

    if (auth.role !== 'super_admin') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 })
    }

    const { id } = await params

    // Get user with memberships
    const userResult = await sql`
      SELECT
        u.id,
        u.email,
        u.name,
        u.avatar_url,
        u.status,
        u.email_verified,
        u.last_login_at,
        u.created_at,
        u.is_super_admin
      FROM public.users u
      WHERE u.id = ${id}
    `

    const user = userResult.rows[0]

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get memberships
    const membershipsResult = await sql`
      SELECT
        tm.id,
        tm.role,
        tm.created_at,
        o.id as organization_id,
        o.name as organization_name,
        o.slug as organization_slug
      FROM public.team_memberships tm
      JOIN public.organizations o ON tm.organization_id = o.id
      WHERE tm.user_id = ${id}
      ORDER BY o.name ASC
    `

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatar_url,
      status: user.status,
      emailVerified: user.email_verified,
      lastLoginAt: user.last_login_at,
      createdAt: user.created_at,
      isSuperAdmin: user.is_super_admin,
      memberships: membershipsResult.rows.map((m: any) => ({
        id: m.id,
        role: m.role,
        createdAt: m.created_at,
        organization: {
          id: m.organization_id,
          name: m.organization_name,
          slug: m.organization_slug,
        },
      })),
    })
  } catch (error) {
    console.error('Failed to fetch user:', error)
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 })
  }
}

/**
 * PATCH /api/users/[id] - Update user
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request)

    if (auth.role !== 'super_admin') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { name, status, isSuperAdmin } = body

    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (name !== undefined) {
      updates.push(`name = $${paramIndex}`)
      values.push(name)
      paramIndex++
    }

    if (status !== undefined) {
      updates.push(`status = $${paramIndex}`)
      values.push(status)
      paramIndex++
    }

    if (isSuperAdmin !== undefined) {
      updates.push(`is_super_admin = $${paramIndex}`)
      values.push(isSuperAdmin)
      paramIndex++
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 })
    }

    updates.push(`updated_at = NOW()`)
    values.push(id) // For WHERE clause

    const query = `
      UPDATE public.users
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, email, name, status, is_super_admin
    `

    const result = await sql.query(query, values)

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      user: result.rows[0],
    })
  } catch (error) {
    console.error('Failed to update user:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update user' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/users/[id] - Delete user
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request)

    if (auth.role !== 'super_admin') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 })
    }

    const { id } = await params

    // Soft delete - set status to deleted
    const result = await sql`
      UPDATE public.users
      SET status = 'deleted', updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, email
    `

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Also remove all team memberships
    await sql`
      DELETE FROM public.team_memberships
      WHERE user_id = ${id}
    `

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
    })
  } catch (error) {
    console.error('Failed to delete user:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete user' },
      { status: 500 }
    )
  }
}
