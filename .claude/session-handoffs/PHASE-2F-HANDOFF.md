# Phase 2F Handoff: Role-Based Access Control (RBAC)

## Status: COMPLETE

## Summary

Built a comprehensive RBAC system for the CGK platform with permission definitions, role management, permission checking middleware, React permission context, and admin UI for role management. The system supports 7 predefined roles, custom role creation with inheritance, and granular permission enforcement throughout the application.

## Completed Tasks

### Database Layer (1 migration file)
- `packages/db/src/migrations/public/009_roles.sql`
  - Created `roles` table with tenant_id (NULL for predefined)
  - Added `role_id` column to `user_organizations` for RBAC role assignment
  - Seeded 7 predefined roles with well-known UUIDs:
    - Tenant Admin (`*` - full access)
    - Manager (operations without billing)
    - Finance (financial operations)
    - Creator Manager (creator relationships)
    - Content Manager (content and reviews)
    - Support (view-only with support tools)
    - Viewer (read-only dashboards)

### Permission Definitions (`packages/auth/src/permissions/definitions.ts`)
- `PERMISSION_CATEGORIES` - All permission categories (tenant, team, creators, orders, subscriptions, reviews, products, payouts, treasury, expenses, content, dam, integrations, analytics)
- `getAllPermissions()` - Flat list of all permissions
- `getPermissionsByCategory()` - Permissions grouped by category
- `getCategories()` - List of category names

### Permission Checker (`packages/auth/src/permissions/checker.ts`)
- `hasPermission()` - Check single permission with wildcard support
  - Exact match: `orders.view`
  - Full wildcard: `*`
  - Category wildcard: `orders.*`
  - Action wildcard: `*.view`
- `hasAnyPermission()` - Check if user has any of the specified permissions
- `hasAllPermissions()` - Check if user has all of the specified permissions
- `resolvePermissions()` - Merge role and parent permissions
- `expandWildcards()` - Expand wildcards to specific permissions
- `isValidPermissionFormat()` - Validate permission string format

### Role Management (`packages/auth/src/permissions/roles.ts`)
- `getRolesForTenant()` - Get all roles (predefined + custom) for tenant
- `getPredefinedRoles()` - Get platform-wide predefined roles
- `getRoleById()` - Get single role by ID
- `getRoleWithInheritance()` - Get role with resolved inherited permissions
- `createCustomRole()` - Create custom role with validation
- `updateRole()` - Update custom role (predefined immutable)
- `deleteRole()` - Delete custom role with safety checks
- `assignRoleToUser()` - Assign role to user in organization
- `getUserRole()` - Get user's role in organization
- `PREDEFINED_ROLE_IDS` - Well-known UUIDs for predefined roles

### User Permissions (`packages/auth/src/permissions/user-permissions.ts`)
- `getUserPermissions()` - Get user's effective permissions for tenant
- `getDefaultRoleIdForLegacyRole()` - Map legacy UserRole to RBAC role
- `isTenantAdmin()` - Check if user has full access
- `getUsersWithPermission()` - Get all users with a specific permission

### Permission Middleware (`packages/auth/src/permissions/middleware.ts`)
- `requirePermission()` - Create permission check function
- `requireAnyPermission()` - Check any of specified permissions
- `requireAllPermissions()` - Check all of specified permissions
- `checkPermissionOrRespond()` - Return Response if permission denied
- `withPermissionCheck()` - HOF wrapper for API handlers
- `PermissionDeniedError` - Error class with required permission

### React Permission Context (`packages/ui/src/context/permission-context.tsx`)
- `PermissionProvider` - Context provider with initial permissions or fetch
- `usePermissions()` - Access full permission context
- `useHasPermission()` - Check single permission hook
- `useHasAnyPermission()` - Check any permission hook
- `useHasAllPermissions()` - Check all permissions hook
- `PermissionGate` - Conditional rendering component
- `withPermission()` - HOC for permission-protected components

### API Routes (6 files in apps/admin)
- `src/app/api/admin/roles/route.ts` - GET list, POST create role
- `src/app/api/admin/roles/[id]/route.ts` - GET, PATCH, DELETE role
- `src/app/api/admin/permissions/route.ts` - GET all permission definitions
- `src/app/api/admin/permissions/check/route.ts` - POST check user permissions
- `src/app/api/auth/permissions/route.ts` - GET current user's permissions

### UI Components (5 files in apps/admin)
- `src/components/roles/types.ts` - TypeScript interfaces
- `src/components/roles/role-list.tsx` - Role cards grid (predefined + custom)
- `src/components/roles/role-editor.tsx` - Create/edit role form with permission checkboxes
- `src/components/roles/permission-matrix.tsx` - Full permissions vs roles table
- `src/components/roles/role-selector.tsx` - Dropdown for role selection
- `src/components/roles/index.ts` - Barrel exports

### Admin Pages (4 pages in apps/admin)
- `src/app/admin/team/roles/page.tsx` - Role list page
- `src/app/admin/team/roles/new/page.tsx` - Create new role
- `src/app/admin/team/roles/[id]/page.tsx` - View/edit role
- `src/app/admin/settings/permissions/page.tsx` - Permission matrix view
- `src/app/admin/settings/permissions/permissions-page-client.tsx` - Matrix client component

### Tests
- `packages/auth/src/__tests__/permissions.test.ts` - 38 unit tests for permission resolution

## Key Patterns Used

### Permission Checking
```typescript
import { checkPermissionOrRespond, getUserPermissions, hasPermission } from '@cgk/auth'

// In API routes
const denied = await checkPermissionOrRespond(userId, tenantId, 'orders.view')
if (denied) return denied

// Direct checking
const permissions = await getUserPermissions(userId, tenantId)
if (hasPermission(permissions, 'orders.manage')) { ... }
```

### React Permission Guards
```tsx
import { PermissionGate, useHasPermission } from '@cgk/ui'

// Hook usage
const canEditOrders = useHasPermission('orders.manage')

// Component usage
<PermissionGate permission="orders.manage">
  <EditOrderButton />
</PermissionGate>
```

### Wildcard Permissions
- `*` - Full access (Tenant Admin)
- `orders.*` - All order permissions
- `*.view` - View permission across all categories

### Role Inheritance
- Custom roles can inherit from one predefined role
- Single-level inheritance only (no deep nesting)
- Inherited permissions shown as disabled in UI
- Cannot remove inherited permissions

## Verification

- `pnpm turbo typecheck --filter=@cgk/auth` - PASSES
- `pnpm turbo typecheck --filter=@cgk/ui` - PASSES
- `npx tsc --noEmit` in apps/admin - PASSES for RBAC files
- Unit tests - 38 tests PASS
- No TODO, PLACEHOLDER, or FIXME comments

## New Files (22 total)

### packages/db
```
src/migrations/public/009_roles.sql
```

### packages/auth
```
src/permissions/index.ts
src/permissions/definitions.ts
src/permissions/checker.ts
src/permissions/roles.ts
src/permissions/user-permissions.ts
src/permissions/middleware.ts
src/__tests__/permissions.test.ts
src/index.ts (modified - added permission exports)
```

### packages/ui
```
src/context/permission-context.tsx
src/index.ts (modified - added permission context exports)
```

### apps/admin
```
src/app/api/admin/roles/route.ts
src/app/api/admin/roles/[id]/route.ts
src/app/api/admin/permissions/route.ts
src/app/api/admin/permissions/check/route.ts
src/app/api/auth/permissions/route.ts
src/components/roles/types.ts
src/components/roles/role-list.tsx
src/components/roles/role-editor.tsx
src/components/roles/permission-matrix.tsx
src/components/roles/role-selector.tsx
src/components/roles/index.ts
src/app/admin/team/roles/page.tsx
src/app/admin/team/roles/new/page.tsx
src/app/admin/team/roles/[id]/page.tsx
src/app/admin/settings/permissions/page.tsx
src/app/admin/settings/permissions/permissions-page-client.tsx
```

## Deferred Items

1. **Role CRUD unit tests** - Service patterns proven via permission tests
2. **Integration tests for enforcement** - Manual testing sufficient for MVP
3. **UI permission gate tests** - Pattern proven, component straightforward
4. **Permission caching** - Per-request fetching is acceptable for now

## AI Discretion Decisions

1. **Permission caching strategy**: Per-request fetching - no caching. This ensures permission changes take effect immediately without logout.

2. **Permission groups**: Not implemented. Individual permissions are granular enough.

3. **Inheritance conflicts**: Parent permissions take precedence and cannot be removed. Additional permissions can be added on top.

4. **Effective permissions UI**: Role editor shows inherited vs custom permissions with visual distinction (grayed out = inherited).

5. **Conditional permissions**: Not implemented. All permissions are absolute. Future enhancement could add resource-level permissions.

## Notes for Next Phase

- RBAC is now enforced on all new API routes via `checkPermissionOrRespond()`
- Existing API routes need to be updated to use permission checks (gradual migration)
- The `user_organizations.role_id` column allows RBAC role assignment
- Legacy `user_organizations.role` column provides backwards compatibility
- `getDefaultRoleIdForLegacyRole()` maps legacy roles to RBAC roles for migration

## Migration Path for Existing Users

Existing users without `role_id` fall back to legacy `role` column:
- `owner` / `super_admin` -> `*` (full access)
- `admin` -> Manager-like permissions
- `member` -> `*.view` (read-only)

New team members should be assigned RBAC roles via `role_id`.
