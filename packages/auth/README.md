# @cgk-platform/auth

Authentication utilities for the CGK platform - JWT, sessions, middleware, RBAC, and tenant context management.

## Installation

```bash
pnpm add @cgk-platform/auth
```

## Features

- **Session Management** - Secure session creation and validation
- **JWT Utilities** - Token signing and verification
- **Magic Links** - Passwordless authentication
- **Password Hashing** - Secure bcrypt-based hashing
- **Cookie Management** - HTTP-only secure cookies
- **Middleware** - Auth guards for Next.js routes
- **RBAC** - Role-based access control with permissions
- **Tenant Context** - Multi-tenant user context
- **Super Admin** - Platform-level admin utilities
- **Team Management** - Team invitations and member roles
- **Impersonation** - Support user impersonation with audit trail
- **Feature Flags** - Tenant-level feature enforcement

## Quick Start

### Authentication Middleware

```typescript
import { authMiddleware, requireAuth } from '@cgk-platform/auth'

// Protect API routes
export const GET = authMiddleware(async (request, context) => {
  const user = context.user
  return Response.json({ user })
})

// Get authenticated user
export async function getServerSideProps({ req, res }) {
  const { user, tenant } = await requireAuth(req, res)
  return { props: { user, tenant } }
}
```

### Get Tenant Context

```typescript
import { getTenantContext } from '@cgk-platform/auth'

export async function POST(request: Request) {
  const { user, tenant } = await getTenantContext(request)
  
  // Use tenant ID in queries
  const data = await db.query.products.findMany({
    where: eq(products.tenantId, tenant.id),
  })
  
  return Response.json(data)
}
```

### Session Management

```typescript
import { createSession, validateSession } from '@cgk-platform/auth'

// Create session on login
const session = await createSession({
  userId: user.id,
  tenantId: tenant.id,
  userAgent: request.headers.get('user-agent'),
  ipAddress: request.headers.get('x-forwarded-for'),
})

// Validate session
const validSession = await validateSession(sessionToken)
if (!validSession) {
  throw new AuthenticationError('Invalid session')
}
```

### Magic Links

```typescript
import {
  createMagicLink,
  sendMagicLinkEmail,
  verifyMagicLink,
} from '@cgk-platform/auth'

// Create and send magic link
const magicLink = await createMagicLink({
  email: 'user@example.com',
  purpose: 'login',
})

await sendMagicLinkEmail(magicLink)

// Verify magic link
const result = await verifyMagicLink(token)
if (result.valid) {
  // Create session for user
}
```

### Role-Based Access Control

```typescript
import {
  requirePermission,
  hasPermission,
  getUserPermissions,
} from '@cgk-platform/auth'

// Check permission
const canEdit = await hasPermission(userId, tenantId, 'products:write')

// Require permission (throws if denied)
await requirePermission(userId, tenantId, 'orders:refund')

// Get all user permissions
const permissions = await getUserPermissions(userId, tenantId)
console.log(permissions) // ['products:read', 'products:write', ...]

// Middleware-based permission check
export const POST = requirePermission('products:write')(
  async (request, context) => {
    // User has permission
  }
)
```

### Team Management

```typescript
import {
  createInvitation,
  acceptInvitation,
  updateMemberRole,
} from '@cgk-platform/auth'

// Invite team member
const invitation = await createInvitation({
  tenantId: tenant.id,
  email: 'teammate@example.com',
  role: 'member',
  invitedBy: user.id,
})

// Accept invitation
await acceptInvitation(invitation.token, userId)

// Update member role
await updateMemberRole({
  tenantId: tenant.id,
  userId: memberId,
  role: 'admin',
})
```

### Tenant Context Switching

```typescript
import { switchTenantContext, getUserTenants } from '@cgk-platform/auth'

// Get user's tenants
const tenants = await getUserTenants(userId)

// Switch active tenant
const result = await switchTenantContext({
  userId,
  targetTenantId: 'tenant_456',
  currentSessionToken: sessionToken,
})

// New session with updated tenant context
const newSession = result.session
```

### Super Admin

```typescript
import {
  isSuperAdmin,
  createSuperAdminSession,
  logAuditAction,
} from '@cgk-platform/auth'

// Check super admin status
if (await isSuperAdmin(userId)) {
  // Platform-level access
}

// Create super admin session
const session = await createSuperAdminSession({
  userId,
  ipAddress: req.ip,
  userAgent: req.headers['user-agent'],
})

// Log audit action
await logAuditAction({
  userId,
  action: 'tenant:suspend',
  resourceType: 'tenant',
  resourceId: tenantId,
  metadata: { reason: 'payment_failed' },
})
```

## Key Exports

### Session
- `createSession()`, `validateSession()`, `revokeSession()`
- `getUserSessions()`, `revokeAllSessions()`

### JWT
- `signJWT()`, `verifyJWT()`, `decodeJWT()`

### Password
- `hashPassword()`, `verifyPassword()`

### Magic Links
- `createMagicLink()`, `sendMagicLinkEmail()`, `verifyMagicLink()`

### Middleware
- `authMiddleware()`, `requireAuth()`, `requireRole()`
- `hasRole()`, `composeMiddleware()`

### Context
- `getTenantContext()` - Get authenticated user and tenant
- `requireAuth()` - Throw if not authenticated
- `createUser()`, `getUserByEmail()`, `getUserById()`

### Permissions
- `hasPermission()`, `hasAnyPermission()`, `hasAllPermissions()`
- `requirePermission()`, `requireAnyPermission()`, `requireAllPermissions()`
- `getUserPermissions()`, `assignRoleToUser()`, `createCustomRole()`

### Team
- `createInvitation()`, `acceptInvitation()`, `revokeInvitation()`
- `getTeamMembers()`, `updateMemberRole()`, `removeMember()`

### Tenant Context
- `switchTenantContext()`, `getUserTenants()`, `setDefaultTenant()`

### Impersonation
- `startImpersonation()`, `endImpersonation()`
- `validateImpersonationSession()`, `getImpersonationHistory()`

### Feature Flags
- `isFeatureEnabled()`, `requireFeature()`, `setTenantFeature()`

## License

MIT
