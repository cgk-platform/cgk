/**
 * Permission middleware for route protection
 *
 * Use in API routes to enforce permission requirements
 */

import { hasAllPermissions, hasAnyPermission, hasPermission } from './checker'
import { getUserPermissions } from './user-permissions'

/**
 * Permission denied error
 */
export class PermissionDeniedError extends Error {
  public readonly requiredPermission: string | string[]

  constructor(message: string, requiredPermission: string | string[]) {
    super(message)
    this.name = 'PermissionDeniedError'
    this.requiredPermission = requiredPermission
  }
}

/**
 * Create a permission check function for a specific permission
 *
 * @example
 * const checkOrdersView = requirePermission('orders.view')
 * await checkOrdersView(userId, tenantId) // throws if denied
 */
export function requirePermission(permission: string) {
  return async function checkPermission(
    userId: string,
    tenantId: string
  ): Promise<void> {
    const userPermissions = await getUserPermissions(userId, tenantId)

    if (!hasPermission(userPermissions, permission)) {
      throw new PermissionDeniedError(
        `Permission denied: ${permission} required`,
        permission
      )
    }
  }
}

/**
 * Create a permission check function requiring ANY of the specified permissions
 *
 * @example
 * const checkCreatorAccess = requireAnyPermission('creators.view', 'creators.manage')
 * await checkCreatorAccess(userId, tenantId)
 */
export function requireAnyPermission(...permissions: string[]) {
  return async function checkPermission(
    userId: string,
    tenantId: string
  ): Promise<void> {
    const userPermissions = await getUserPermissions(userId, tenantId)

    if (!hasAnyPermission(userPermissions, permissions)) {
      throw new PermissionDeniedError(
        `Permission denied: one of [${permissions.join(', ')}] required`,
        permissions
      )
    }
  }
}

/**
 * Create a permission check function requiring ALL of the specified permissions
 *
 * @example
 * const checkFinanceAdmin = requireAllPermissions('payouts.process', 'treasury.approve')
 * await checkFinanceAdmin(userId, tenantId)
 */
export function requireAllPermissions(...permissions: string[]) {
  return async function checkPermission(
    userId: string,
    tenantId: string
  ): Promise<void> {
    const userPermissions = await getUserPermissions(userId, tenantId)

    if (!hasAllPermissions(userPermissions, permissions)) {
      throw new PermissionDeniedError(
        `Permission denied: all of [${permissions.join(', ')}] required`,
        permissions
      )
    }
  }
}

/**
 * Check permission and return Response if denied
 *
 * For use in API routes:
 * @example
 * const denied = await checkPermissionOrRespond(userId, tenantId, 'orders.view')
 * if (denied) return denied
 */
export async function checkPermissionOrRespond(
  userId: string,
  tenantId: string,
  permission: string
): Promise<Response | null> {
  const userPermissions = await getUserPermissions(userId, tenantId)

  if (!hasPermission(userPermissions, permission)) {
    return Response.json(
      {
        error: 'Permission denied',
        message: `You do not have the required permission: ${permission}`,
        required: permission,
      },
      { status: 403 }
    )
  }

  return null
}

/**
 * Check any permission and return Response if denied
 */
export async function checkAnyPermissionOrRespond(
  userId: string,
  tenantId: string,
  permissions: string[]
): Promise<Response | null> {
  const userPermissions = await getUserPermissions(userId, tenantId)

  if (!hasAnyPermission(userPermissions, permissions)) {
    return Response.json(
      {
        error: 'Permission denied',
        message: `You need one of the following permissions: ${permissions.join(', ')}`,
        required: permissions,
      },
      { status: 403 }
    )
  }

  return null
}

/**
 * Check all permissions and return Response if denied
 */
export async function checkAllPermissionsOrRespond(
  userId: string,
  tenantId: string,
  permissions: string[]
): Promise<Response | null> {
  const userPermissions = await getUserPermissions(userId, tenantId)

  if (!hasAllPermissions(userPermissions, permissions)) {
    return Response.json(
      {
        error: 'Permission denied',
        message: `You need all of the following permissions: ${permissions.join(', ')}`,
        required: permissions,
      },
      { status: 403 }
    )
  }

  return null
}

/**
 * Create a higher-order function that wraps an API handler with permission checks
 *
 * @example
 * export const GET = withPermissionCheck('orders.view', async (req, context) => {
 *   // Handler code - only runs if user has permission
 * })
 */
export function withPermissionCheck(
  permission: string,
  handler: (
    req: Request,
    context: { userId: string; tenantId: string; permissions: string[] }
  ) => Promise<Response>
) {
  return async function wrappedHandler(req: Request): Promise<Response> {
    // Extract context from headers (set by middleware)
    const userId = req.headers.get('x-user-id')
    const tenantId = req.headers.get('x-tenant-id')

    if (!userId || !tenantId) {
      return Response.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const userPermissions = await getUserPermissions(userId, tenantId)

    if (!hasPermission(userPermissions, permission)) {
      return Response.json(
        {
          error: 'Permission denied',
          message: `You do not have the required permission: ${permission}`,
          required: permission,
        },
        { status: 403 }
      )
    }

    return handler(req, { userId, tenantId, permissions: userPermissions })
  }
}
