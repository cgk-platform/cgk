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
    INSERT INTO super_admin_audit_log (
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
// Helper: Validate IP address or CIDR
// =============================================================================

function isValidIpOrCidr(value: string): boolean {
  // IPv4 pattern
  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/
  // IPv6 pattern (simplified)
  const ipv6Pattern = /^([0-9a-fA-F]{0,4}:){1,7}[0-9a-fA-F]{0,4}(\/\d{1,3})?$/

  if (ipv4Pattern.test(value)) {
    const parts = value.split('/')
    const ipPart = parts[0]
    if (!ipPart) return false
    const ipParts = ipPart.split('.')
    for (const part of ipParts) {
      const num = parseInt(part, 10)
      if (num < 0 || num > 255) return false
    }
    if (parts[1]) {
      const cidr = parseInt(parts[1], 10)
      if (cidr < 0 || cidr > 32) return false
    }
    return true
  }

  if (ipv6Pattern.test(value)) {
    return true
  }

  return false
}

// =============================================================================
// POST /api/platform/settings/ip-allowlist
// =============================================================================

export async function POST(request: Request) {
  try {
    const authResult = await validateSuperAdmin(request)
    if (authResult instanceof Response) {
      return authResult
    }
    const { userId } = authResult

    const body = await request.json() as {
      ipAddress: string
      description?: string | null
    }

    if (!body.ipAddress) {
      return Response.json(
        { error: 'IP address is required' },
        { status: 400 }
      )
    }

    // Validate IP address format
    if (!isValidIpOrCidr(body.ipAddress)) {
      return Response.json(
        { error: 'Invalid IP address or CIDR format' },
        { status: 400 }
      )
    }

    // Check for duplicates
    const existingResult = await sql`
      SELECT id FROM super_admin_ip_allowlist
      WHERE ip_address = ${body.ipAddress}::inet
    `

    if (existingResult.rows.length > 0) {
      return Response.json(
        { error: 'This IP address is already in the allowlist' },
        { status: 400 }
      )
    }

    // Insert the new IP
    const result = await sql`
      INSERT INTO super_admin_ip_allowlist (
        ip_address,
        description,
        added_by,
        is_active
      ) VALUES (
        ${body.ipAddress}::inet,
        ${body.description || null},
        ${userId}::uuid,
        TRUE
      )
      RETURNING id, ip_address, description, added_by, is_active, created_at
    `

    const row = result.rows[0] as {
      id: string
      ip_address: string
      description: string | null
      added_by: string | null
      is_active: boolean
      created_at: Date
    }

    // Get the user's email for the response
    const userResult = await sql`
      SELECT email FROM users WHERE id = ${userId}::uuid
    `
    const addedByEmail = userResult.rows[0]
      ? (userResult.rows[0] as { email: string }).email
      : null

    // Log audit
    await logAudit(
      userId,
      'add_ip_allowlist',
      'ip_allowlist',
      row.id,
      request,
      { ipAddress: body.ipAddress }
    )

    return Response.json({
      entry: {
        id: row.id,
        ipAddress: row.ip_address,
        description: row.description,
        addedBy: row.added_by,
        addedByEmail,
        isActive: row.is_active,
        createdAt: row.created_at.toISOString(),
      },
    })
  } catch (error) {
    console.error('Failed to add IP to allowlist:', error)
    return Response.json(
      { error: 'Failed to add IP to allowlist' },
      { status: 500 }
    )
  }
}
