import {
  getAuthCookie,
  getSuperAdminUser,
  validateSuperAdminSessionById,
  verifyJWT,
} from '@cgk-platform/auth'
import { sql } from '@cgk-platform/db'

export const dynamic = 'force-dynamic'

// =============================================================================
// Helper: Validate super admin session
// =============================================================================

async function validateSuperAdmin(request: Request): Promise<{ userId: string } | Response> {
  const token = getAuthCookie(request)

  if (!token) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 })
  }

  let payload
  try {
    payload = await verifyJWT(token)
  } catch {
    return Response.json({ error: 'Invalid session' }, { status: 401 })
  }

  const session = await validateSuperAdminSessionById(payload.sid)
  if (!session) {
    return Response.json({ error: 'Session expired or revoked' }, { status: 401 })
  }

  const superAdmin = await getSuperAdminUser(payload.sub)
  if (!superAdmin || !superAdmin.isActive) {
    return Response.json({ error: 'Super admin access required' }, { status: 403 })
  }

  return { userId: payload.sub }
}

// =============================================================================
// Helper: Log audit
// =============================================================================

async function logAudit(
  userId: string,
  action: string,
  resourceType: string,
  resourceId: string | null,
  request: Request,
  metadata?: Record<string, unknown>
) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
             request.headers.get('x-real-ip') ||
             'unknown'
  const userAgent = request.headers.get('user-agent') || 'unknown'
  const metadataJson = metadata ? JSON.stringify(metadata) : null

  await sql`
    INSERT INTO public.super_admin_audit_log (
      user_id,
      action,
      resource_type,
      resource_id,
      ip_address,
      user_agent,
      metadata
    ) VALUES (
      ${userId}::uuid,
      ${action},
      ${resourceType},
      ${resourceId}::uuid,
      ${ip}::inet,
      ${userAgent},
      ${metadataJson}::jsonb
    )
  `
}

// =============================================================================
// PATCH /api/platform/settings/ip-allowlist/[id]
// =============================================================================

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await validateSuperAdmin(request)
    if (authResult instanceof Response) {
      return authResult
    }
    const { userId } = authResult

    const { id } = await params
    const body = await request.json() as {
      isActive?: boolean
      description?: string | null
    }

    // Check if the entry exists
    const existingResult = await sql`
      SELECT id, ip_address, is_active FROM public.super_admin_ip_allowlist
      WHERE id = ${id}::uuid
    `

    if (existingResult.rows.length === 0) {
      return Response.json(
        { error: 'IP allowlist entry not found' },
        { status: 404 }
      )
    }

    const existingRow = existingResult.rows[0] as {
      id: string
      ip_address: string
      is_active: boolean
    }

    // Update the entry
    if (body.isActive !== undefined) {
      await sql`
        UPDATE public.super_admin_ip_allowlist
        SET is_active = ${body.isActive}, updated_at = NOW()
        WHERE id = ${id}::uuid
      `

      await logAudit(
        userId,
        body.isActive ? 'enable_ip_allowlist' : 'disable_ip_allowlist',
        'ip_allowlist',
        id,
        request,
        { ipAddress: existingRow.ip_address }
      )
    }

    if (body.description !== undefined) {
      await sql`
        UPDATE public.super_admin_ip_allowlist
        SET description = ${body.description}, updated_at = NOW()
        WHERE id = ${id}::uuid
      `
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error('Failed to update IP allowlist entry:', error)
    return Response.json(
      { error: 'Failed to update IP allowlist entry' },
      { status: 500 }
    )
  }
}

// =============================================================================
// DELETE /api/platform/settings/ip-allowlist/[id]
// =============================================================================

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await validateSuperAdmin(request)
    if (authResult instanceof Response) {
      return authResult
    }
    const { userId } = authResult

    const { id } = await params

    // Check if the entry exists
    const existingResult = await sql`
      SELECT id, ip_address FROM public.super_admin_ip_allowlist
      WHERE id = ${id}::uuid
    `

    if (existingResult.rows.length === 0) {
      return Response.json(
        { error: 'IP allowlist entry not found' },
        { status: 404 }
      )
    }

    const existingRow = existingResult.rows[0] as {
      id: string
      ip_address: string
    }

    // Delete the entry
    await sql`
      DELETE FROM public.super_admin_ip_allowlist
      WHERE id = ${id}::uuid
    `

    // Log audit
    await logAudit(
      userId,
      'remove_ip_allowlist',
      'ip_allowlist',
      id,
      request,
      { ipAddress: existingRow.ip_address }
    )

    return Response.json({ success: true })
  } catch (error) {
    console.error('Failed to delete IP allowlist entry:', error)
    return Response.json(
      { error: 'Failed to delete IP allowlist entry' },
      { status: 500 }
    )
  }
}
