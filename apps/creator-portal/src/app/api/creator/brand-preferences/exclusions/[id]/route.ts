/**
 * Creator Brand Exclusion by ID API Route
 *
 * DELETE /api/creator/brand-preferences/exclusions/[id] - Remove brand from exclusion list
 * PATCH /api/creator/brand-preferences/exclusions/[id] - Update exclusion reason
 */

import { sql } from '@cgk/db'

import { requireCreatorAuth, type CreatorAuthContext } from '@/lib/auth'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * Remove a brand from the exclusion list
 */
export async function DELETE(req: Request, { params }: RouteParams): Promise<Response> {
  let context: CreatorAuthContext

  try {
    context = await requireCreatorAuth(req)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authentication required'
    return Response.json({ error: message }, { status: 401 })
  }

  const { id } = await params

  if (!id) {
    return Response.json({ error: 'Exclusion ID is required' }, { status: 400 })
  }

  try {
    // Verify ownership and delete
    const result = await sql`
      DELETE FROM creator_brand_exclusions
      WHERE id = ${id}
        AND creator_id = ${context.creatorId}
      RETURNING id
    `

    if (result.rows.length === 0) {
      return Response.json({ error: 'Exclusion not found' }, { status: 404 })
    }

    return Response.json({
      success: true,
      message: 'Brand removed from exclusion list',
    })
  } catch (error) {
    console.error('Error removing brand exclusion:', error)
    return Response.json({ error: 'Failed to remove exclusion' }, { status: 500 })
  }
}

/**
 * Update an exclusion's reason
 */
export async function PATCH(req: Request, { params }: RouteParams): Promise<Response> {
  let context: CreatorAuthContext

  try {
    context = await requireCreatorAuth(req)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authentication required'
    return Response.json({ error: message }, { status: 401 })
  }

  const { id } = await params

  if (!id) {
    return Response.json({ error: 'Exclusion ID is required' }, { status: 400 })
  }

  let body: { reason?: string | null }

  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  try {
    const reason = body.reason?.trim() || null

    // Verify ownership and update
    const result = await sql`
      UPDATE creator_brand_exclusions
      SET reason = ${reason}
      WHERE id = ${id}
        AND creator_id = ${context.creatorId}
      RETURNING id
    `

    if (result.rows.length === 0) {
      return Response.json({ error: 'Exclusion not found' }, { status: 404 })
    }

    return Response.json({
      success: true,
      message: 'Exclusion updated',
    })
  } catch (error) {
    console.error('Error updating brand exclusion:', error)
    return Response.json({ error: 'Failed to update exclusion' }, { status: 500 })
  }
}
