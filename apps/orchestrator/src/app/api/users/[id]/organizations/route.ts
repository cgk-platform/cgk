import { requireAuth } from '@cgk-platform/auth'
import { sql } from '@vercel/postgres'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/users/[id]/organizations - Add user to organization (tenant)
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request)

    if (auth.role !== 'super_admin') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 })
    }

    const { id: userId } = await params
    const body = await request.json()
    const { organizationId, role = 'viewer' } = body

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
    }

    // Check if user exists
    const userCheck = await sql`
      SELECT id FROM public.users WHERE id = ${userId}
    `
    if (userCheck.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if organization exists
    const orgCheck = await sql`
      SELECT id, name FROM public.organizations WHERE id = ${organizationId}
    `
    if (orgCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Check if membership already exists
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

    // Create membership
    await sql`
      INSERT INTO public.team_memberships (user_id, organization_id, role)
      VALUES (${userId}, ${organizationId}, ${role})
    `

    return NextResponse.json({
      success: true,
      message: `User added to ${orgCheck.rows[0]?.name}`,
    })
  } catch (error) {
    console.error('Failed to add user to organization:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add user to organization' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/users/[id]/organizations - Remove user from organization
 * Expects organizationId as query parameter
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request)

    if (auth.role !== 'super_admin') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 })
    }

    const { id: userId } = await params
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
    }

    // Remove membership
    const result = await sql`
      DELETE FROM public.team_memberships
      WHERE user_id = ${userId} AND organization_id = ${organizationId}
      RETURNING id
    `

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Membership not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'User removed from organization',
    })
  } catch (error) {
    console.error('Failed to remove user from organization:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to remove user from organization' },
      { status: 500 }
    )
  }
}
