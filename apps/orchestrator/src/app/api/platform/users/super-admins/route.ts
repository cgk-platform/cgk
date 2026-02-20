import {
  getSuperAdminUser,
  getUserByEmail,
  logAuditAction,
} from '@cgk-platform/auth'
import { sql } from '@cgk-platform/db'

export const dynamic = 'force-dynamic'

/**
 * Helper to get request context from headers (set by middleware)
 */
function getRequestContext(request: Request): {
  userId: string
  sessionId: string
  isSuperAdmin: boolean
  mfaVerified: boolean
} {
  return {
    userId: request.headers.get('x-user-id') || '',
    sessionId: request.headers.get('x-session-id') || '',
    isSuperAdmin: request.headers.get('x-is-super-admin') === 'true',
    mfaVerified: request.headers.get('x-mfa-verified') === 'true',
  }
}

/**
 * GET /api/platform/users/super-admins
 *
 * List all super admin users.
 * Requires: Super admin with canManageSuperAdmins permission
 */
export async function GET(request: Request) {
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'

  try {
    const { userId, isSuperAdmin, mfaVerified } = getRequestContext(request)

    if (!isSuperAdmin) {
      return Response.json(
        { error: 'Super admin access required' },
        { status: 403 }
      )
    }

    if (!mfaVerified) {
      return Response.json(
        { error: 'MFA verification required' },
        { status: 403 }
      )
    }

    // Check if user can manage super admins
    const currentSuperAdmin = await getSuperAdminUser(userId)
    if (!currentSuperAdmin?.canManageSuperAdmins) {
      return Response.json(
        { error: 'Permission denied. Cannot manage super admins.' },
        { status: 403 }
      )
    }

    // Get all super admins with user details
    const result = await sql`
      SELECT
        sau.user_id,
        sau.granted_at,
        sau.granted_by,
        sau.notes,
        sau.can_access_all_tenants,
        sau.can_impersonate,
        sau.can_manage_super_admins,
        sau.mfa_enabled,
        sau.last_access_at,
        sau.is_active,
        u.email,
        u.name,
        granter.email as granted_by_email
      FROM public.super_admin_users sau
      JOIN public.users u ON u.id = sau.user_id
      LEFT JOIN public.users granter ON granter.id = sau.granted_by
      ORDER BY sau.granted_at DESC
    `

    const superAdmins = result.rows.map((row) => {
      const r = row as Record<string, unknown>
      return {
        userId: r.user_id,
        email: r.email,
        name: r.name,
        grantedAt: r.granted_at,
        grantedBy: r.granted_by,
        grantedByEmail: r.granted_by_email,
        notes: r.notes,
        permissions: {
          canAccessAllTenants: r.can_access_all_tenants,
          canImpersonate: r.can_impersonate,
          canManageSuperAdmins: r.can_manage_super_admins,
        },
        mfaEnabled: r.mfa_enabled,
        lastAccessAt: r.last_access_at,
        isActive: r.is_active,
      }
    })

    // Log the access
    await logAuditAction({
      userId,
      action: 'view_audit_log',
      resourceType: 'super_admin',
      ipAddress: clientIp,
      userAgent: request.headers.get('user-agent') || null,
      metadata: { action: 'list_super_admins', count: superAdmins.length },
    })

    return Response.json({
      superAdmins,
      total: superAdmins.length,
    })
  } catch (error) {
    console.error('List super admins error:', error)
    return Response.json(
      { error: 'Failed to list super admins' },
      { status: 500 }
    )
  }
}

interface CreateSuperAdminBody {
  email: string
  notes?: string
  canAccessAllTenants?: boolean
  canImpersonate?: boolean
  canManageSuperAdmins?: boolean
}

/**
 * POST /api/platform/users/super-admins
 *
 * Grant super admin access to a user.
 * Requires: Super admin with canManageSuperAdmins permission
 */
export async function POST(request: Request) {
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'

  try {
    const { userId, isSuperAdmin, mfaVerified } = getRequestContext(request)

    if (!isSuperAdmin) {
      return Response.json(
        { error: 'Super admin access required' },
        { status: 403 }
      )
    }

    if (!mfaVerified) {
      return Response.json(
        { error: 'MFA verification required' },
        { status: 403 }
      )
    }

    // Check if user can manage super admins
    const currentSuperAdmin = await getSuperAdminUser(userId)
    if (!currentSuperAdmin?.canManageSuperAdmins) {
      return Response.json(
        { error: 'Permission denied. Cannot manage super admins.' },
        { status: 403 }
      )
    }

    const body = (await request.json()) as CreateSuperAdminBody

    if (!body.email) {
      return Response.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const email = body.email.toLowerCase().trim()

    // Find the user
    const targetUser = await getUserByEmail(email)
    if (!targetUser) {
      return Response.json(
        { error: 'User not found. The user must have an account first.' },
        { status: 404 }
      )
    }

    // Check if already a super admin
    const existingSuperAdmin = await getSuperAdminUser(targetUser.id)
    if (existingSuperAdmin) {
      return Response.json(
        { error: 'User is already a super admin' },
        { status: 409 }
      )
    }

    // Create super admin record
    const result = await sql`
      INSERT INTO public.super_admin_users (
        user_id,
        granted_by,
        notes,
        can_access_all_tenants,
        can_impersonate,
        can_manage_super_admins
      )
      VALUES (
        ${targetUser.id},
        ${userId},
        ${body.notes || null},
        ${body.canAccessAllTenants !== false},
        ${body.canImpersonate !== false},
        ${body.canManageSuperAdmins === true}
      )
      RETURNING *
    `

    // Log the action
    await logAuditAction({
      userId,
      action: 'grant_super_admin',
      resourceType: 'super_admin',
      resourceId: targetUser.id,
      ipAddress: clientIp,
      userAgent: request.headers.get('user-agent') || null,
      newValue: {
        email,
        notes: body.notes,
        canAccessAllTenants: body.canAccessAllTenants !== false,
        canImpersonate: body.canImpersonate !== false,
        canManageSuperAdmins: body.canManageSuperAdmins === true,
      },
    })

    const row = result.rows[0] as Record<string, unknown>

    return Response.json({
      success: true,
      superAdmin: {
        userId: row.user_id,
        email,
        name: targetUser.name,
        grantedAt: row.granted_at,
        grantedBy: userId,
        notes: row.notes,
        permissions: {
          canAccessAllTenants: row.can_access_all_tenants,
          canImpersonate: row.can_impersonate,
          canManageSuperAdmins: row.can_manage_super_admins,
        },
        mfaEnabled: row.mfa_enabled,
        isActive: row.is_active,
      },
    })
  } catch (error) {
    console.error('Create super admin error:', error)
    return Response.json(
      { error: 'Failed to create super admin' },
      { status: 500 }
    )
  }
}

interface UpdateSuperAdminBody {
  userId: string
  notes?: string
  canAccessAllTenants?: boolean
  canImpersonate?: boolean
  canManageSuperAdmins?: boolean
  isActive?: boolean
}

/**
 * PATCH /api/platform/users/super-admins
 *
 * Update super admin permissions.
 * Requires: Super admin with canManageSuperAdmins permission
 */
export async function PATCH(request: Request) {
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'

  try {
    const { userId, isSuperAdmin, mfaVerified } = getRequestContext(request)

    if (!isSuperAdmin) {
      return Response.json(
        { error: 'Super admin access required' },
        { status: 403 }
      )
    }

    if (!mfaVerified) {
      return Response.json(
        { error: 'MFA verification required' },
        { status: 403 }
      )
    }

    // Check if user can manage super admins
    const currentSuperAdmin = await getSuperAdminUser(userId)
    if (!currentSuperAdmin?.canManageSuperAdmins) {
      return Response.json(
        { error: 'Permission denied. Cannot manage super admins.' },
        { status: 403 }
      )
    }

    const body = (await request.json()) as UpdateSuperAdminBody

    if (!body.userId) {
      return Response.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    // Prevent self-modification of canManageSuperAdmins
    if (body.userId === userId && body.canManageSuperAdmins === false) {
      return Response.json(
        { error: 'Cannot remove your own canManageSuperAdmins permission' },
        { status: 400 }
      )
    }

    // Prevent self-deactivation
    if (body.userId === userId && body.isActive === false) {
      return Response.json(
        { error: 'Cannot deactivate your own super admin access' },
        { status: 400 }
      )
    }

    // Get current state for audit log
    const currentResult = await sql`
      SELECT * FROM public.super_admin_users WHERE user_id = ${body.userId}
    `

    if (currentResult.rows.length === 0) {
      return Response.json(
        { error: 'Super admin not found' },
        { status: 404 }
      )
    }

    const currentState = currentResult.rows[0] as Record<string, unknown>

    // Determine what values to update (use current values as defaults)
    const notes = body.notes !== undefined ? body.notes : currentState.notes as string | null
    const canAccessAllTenants = body.canAccessAllTenants !== undefined
      ? body.canAccessAllTenants
      : currentState.can_access_all_tenants as boolean
    const canImpersonate = body.canImpersonate !== undefined
      ? body.canImpersonate
      : currentState.can_impersonate as boolean
    const canManageSuperAdmins = body.canManageSuperAdmins !== undefined
      ? body.canManageSuperAdmins
      : currentState.can_manage_super_admins as boolean
    const isActive = body.isActive !== undefined
      ? body.isActive
      : currentState.is_active as boolean

    // Check if anything actually changed
    if (
      notes === currentState.notes &&
      canAccessAllTenants === currentState.can_access_all_tenants &&
      canImpersonate === currentState.can_impersonate &&
      canManageSuperAdmins === currentState.can_manage_super_admins &&
      isActive === currentState.is_active
    ) {
      return Response.json(
        { error: 'No changes detected' },
        { status: 400 }
      )
    }

    // Update the record with explicit parameters
    let result
    if (body.isActive === false) {
      // Deactivation - also set deactivated_at and deactivated_by
      result = await sql`
        UPDATE public.super_admin_users
        SET
          notes = ${notes},
          can_access_all_tenants = ${canAccessAllTenants},
          can_impersonate = ${canImpersonate},
          can_manage_super_admins = ${canManageSuperAdmins},
          is_active = ${isActive},
          deactivated_at = NOW(),
          deactivated_by = ${userId},
          updated_at = NOW()
        WHERE user_id = ${body.userId}
        RETURNING *
      `
    } else {
      result = await sql`
        UPDATE public.super_admin_users
        SET
          notes = ${notes},
          can_access_all_tenants = ${canAccessAllTenants},
          can_impersonate = ${canImpersonate},
          can_manage_super_admins = ${canManageSuperAdmins},
          is_active = ${isActive},
          updated_at = NOW()
        WHERE user_id = ${body.userId}
        RETURNING *
      `
    }

    const newState = result.rows[0] as Record<string, unknown>

    // Log the action
    await logAuditAction({
      userId,
      action: body.isActive === false ? 'revoke_super_admin' : 'grant_super_admin',
      resourceType: 'super_admin',
      resourceId: body.userId,
      ipAddress: clientIp,
      userAgent: request.headers.get('user-agent') || null,
      oldValue: {
        notes: currentState.notes,
        canAccessAllTenants: currentState.can_access_all_tenants,
        canImpersonate: currentState.can_impersonate,
        canManageSuperAdmins: currentState.can_manage_super_admins,
        isActive: currentState.is_active,
      },
      newValue: {
        notes: newState.notes,
        canAccessAllTenants: newState.can_access_all_tenants,
        canImpersonate: newState.can_impersonate,
        canManageSuperAdmins: newState.can_manage_super_admins,
        isActive: newState.is_active,
      },
    })

    return Response.json({
      success: true,
      superAdmin: {
        userId: newState.user_id,
        notes: newState.notes,
        permissions: {
          canAccessAllTenants: newState.can_access_all_tenants,
          canImpersonate: newState.can_impersonate,
          canManageSuperAdmins: newState.can_manage_super_admins,
        },
        mfaEnabled: newState.mfa_enabled,
        isActive: newState.is_active,
      },
    })
  } catch (error) {
    console.error('Update super admin error:', error)
    return Response.json(
      { error: 'Failed to update super admin' },
      { status: 500 }
    )
  }
}
