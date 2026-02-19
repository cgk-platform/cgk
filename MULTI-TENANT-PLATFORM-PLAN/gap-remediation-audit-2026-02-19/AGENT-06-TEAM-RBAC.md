# AGENT-06: Team Management, RBAC & Context Switching Audit

**Audit Date**: 2026-02-19  
**Agent**: cgk-audit-agent-06  
**Phases Audited**: PHASE-2E (Team Management), PHASE-2F (RBAC), PHASE-2G (Context Switching)  
**Code Paths**: `packages/auth/src/`, `apps/admin/src/`, `packages/core/src/`, `packages/ui/src/`

---

## Executive Summary

All three phases are substantially implemented and production-ready for core flows. The service layer, API routes, and DB migrations are solid. The most significant gap is **PermissionProvider is never mounted in the admin layout**, meaning all client-side RBAC hooks (`useHasPermission`, `PermissionGate`, `withPermission`) are currently dead code. Additionally, the MultiTenantWelcomeModal is built but never triggered. Role changes via the team management UI use legacy role strings only and do not write to the RBAC `role_id` column.

---

## PHASE-2E: Tenant Team Management

**Phase doc status**: ✅ COMPLETE (marked 2026-02-13)  
**Audit verdict**: ✅ DONE with minor gaps

### Feature Classification

| Feature | Status | Evidence |
|---|---|---|
| DB: `team_invitations` table | ✅ DONE | `packages/db/src/migrations/public/008_team_management.sql` |
| DB: `team_audit_log` table | ✅ DONE | Same migration |
| DB: `user_organizations` additions (`invited_by`, `invitation_id`) | ✅ DONE | Same migration |
| `createInvitation()` with token generation | ✅ DONE | `packages/auth/src/team.ts` |
| `acceptInvitation()` with membership creation | ✅ DONE | `packages/auth/src/team.ts:481` |
| `getTeamMembers()` with pagination | ✅ DONE | `packages/auth/src/team.ts` |
| `getInvitations()` / `getInvitation()` | ✅ DONE | `packages/auth/src/team.ts` |
| `updateMemberRole()` | ⚠️ PARTIAL | Updates legacy `role` only, not `role_id` |
| `removeMember()` | ✅ DONE | `packages/auth/src/team.ts` |
| `resendInvitation()` | ✅ DONE | `packages/auth/src/team.ts` |
| `revokeInvitation()` | ✅ DONE | `packages/auth/src/team.ts` |
| `getInvitationCountToday()` | ✅ DONE | `packages/auth/src/team.ts` |
| `getTeamAuditLog()` | ✅ DONE | `packages/auth/src/team.ts` |
| `canUserLeaveOrganization()` | ✅ DONE | `packages/auth/src/team.ts` |
| `leaveOrganization()` | ✅ DONE | `packages/auth/src/team.ts` |
| Invitation expiry checking | ✅ DONE | `acceptInvitation()` checks `expires_at` |
| Rate limiting (50 invitations/day) | ✅ DONE | `apps/admin/src/app/api/admin/team/invitations/route.ts` |
| Permission checks on all team API routes | ✅ DONE | `team.view`, `team.invite`, `team.manage` per route |
| Non-owners cannot invite owners (guard) | ✅ DONE | `invitations/route.ts` POST handler |
| Cannot remove/change role of self | ✅ DONE | `[id]/route.ts` PATCH and DELETE |
| Audit logging on all team actions | ✅ DONE | `logTeamAction()` called in all mutations |
| Invitation email via Resend | ✅ DONE | Inline `sendTeamInvitationEmail()` in invitations route |
| Invitation accepted notification to inviter | ✅ DONE | `notifyInviterOfAcceptance()` in accept-invite route |
| Member removed notification email | ❌ NOT DONE | Phase doc marks as "deferred - not critical" |
| `GET /api/admin/team` (members list + rate limit) | ✅ DONE | `apps/admin/src/app/api/admin/team/route.ts` |
| `PATCH /api/admin/team/[id]` (change role) | ✅ DONE | `apps/admin/src/app/api/admin/team/[id]/route.ts` |
| `DELETE /api/admin/team/[id]` (remove member) | ✅ DONE | Same route |
| `GET /api/admin/team/invitations` | ✅ DONE | Invitations route |
| `POST /api/admin/team/invitations` (send invite) | ✅ DONE | Invitations route |
| `DELETE /api/admin/team/invitations/[id]` (revoke) | ✅ DONE | Invitation [id] route |
| `POST /api/admin/team/invitations/[id]/resend` | ✅ DONE | Resend route |
| `POST /api/auth/accept-invite` | ✅ DONE | Accept-invite route |
| `TeamMemberList` component | ✅ DONE | `apps/admin/src/components/team/team-member-list.tsx` |
| `InviteMemberModal` component | ✅ DONE | `apps/admin/src/components/team/invite-member-modal.tsx` |
| `PendingInvitationsTable` component | ✅ DONE | `apps/admin/src/components/team/pending-invitations-table.tsx` |
| `RoleSelector` component | ✅ DONE | `apps/admin/src/components/roles/role-selector.tsx` |
| `/admin/settings/team` page | ✅ DONE | `apps/admin/src/app/admin/settings/team/page.tsx` |
| `/join` invitation acceptance page | ✅ DONE | `apps/admin/src/app/join/page.tsx` |
| `/admin/team/[id]` member profile page | ❌ NOT DONE | Phase doc explicitly deferred |
| Unit tests for team service functions | ❌ NOT DONE | Phase doc explicitly deferred |
| Integration tests for invitation flow | ❌ NOT DONE | Phase doc explicitly deferred |
| Tenant isolation tests | ❌ NOT DONE | Phase doc explicitly deferred |
| Bulk invite CSV upload | ❌ NOT DONE | AI discretion - not built |

### Gaps & Issues — Phase 2E

#### ⚠️ GAP-2E-01: `updateMemberRole()` Does Not Write RBAC `role_id`

**Severity**: Medium  
**File**: `packages/auth/src/team.ts:207`

`updateMemberRole()` only updates the legacy `role` column (e.g., `'admin'`, `'member'`) in `user_organizations`. It does not update `role_id`. If a user has an RBAC role assigned via `assignRoleToUser()`, a role change through the team management UI won't affect their `role_id`. The next permission check will still use the old RBAC role (since `getUserPermissions()` prefers `role_id` over the legacy column).

**Current code:**
```sql
UPDATE user_organizations
SET role = ${newRole}::user_role, updated_at = NOW()
WHERE organization_id = ${tenantId} AND user_id = ${userId}
```

**TODO:**
```typescript
// In updateMemberRole(), also clear or remap role_id:
// Option A: Clear role_id so it falls back to legacy role
await sql`
  UPDATE user_organizations
  SET role = ${newRole}::user_role,
      role_id = ${getDefaultRoleIdForLegacyRole(newRole)},
      updated_at = NOW()
  WHERE organization_id = ${tenantId} AND user_id = ${userId}
`
// Option B: Map legacy role to RBAC role_id and update both.
// This is the recommended approach for consistency.
```

---

#### ⚠️ GAP-2E-02: `acceptInvitation()` Does Not Set RBAC `role_id`

**Severity**: Medium  
**File**: `packages/auth/src/team.ts:523`

New members accepted via invitation are inserted into `user_organizations` with only the legacy `role` column. The `role_id` (RBAC) column is left NULL. This means new members rely entirely on the legacy role fallback path in `getUserPermissions()`.

**Current code:**
```sql
INSERT INTO user_organizations (user_id, organization_id, role, invited_by, invitation_id)
VALUES (...)
```

**TODO:**
```typescript
// Map the legacy role to a predefined RBAC role_id and include it in the INSERT.
import { getDefaultRoleIdForLegacyRole } from './permissions/user-permissions'

const roleId = getDefaultRoleIdForLegacyRole(role)
await sql`
  INSERT INTO user_organizations
    (user_id, organization_id, role, role_id, invited_by, invitation_id)
  VALUES
    (${userId}, ${tenantId}, ${role}::user_role, ${roleId}, ${invitedBy}, ${invitationId})
  ON CONFLICT (user_id, organization_id) DO UPDATE
    SET role = ${role}::user_role,
        role_id = ${roleId},
        invited_by = ${invitedBy},
        invitation_id = ${invitationId}
`
```

---

#### ⚠️ GAP-2E-03: Team Settings Page Uses Legacy Role Check Instead of RBAC

**Severity**: Low-Medium  
**File**: `apps/admin/src/app/admin/settings/team/page.tsx:38`

The server component uses a hard-coded legacy role check:
```typescript
if (!['owner', 'admin', 'super_admin'].includes(auth.role)) {
  return <AccessDeniedCard />
}
```

This bypasses RBAC. A user with an RBAC role having `team.view` permission but legacy `role = 'member'` will be denied the page even though the underlying API routes correctly use `checkPermissionOrRespond`. The pattern is inconsistent.

**TODO:**
```typescript
// Replace legacy role check with RBAC permission check:
import { getUserPermissions, hasPermission } from '@cgk-platform/auth'

const permissions = await getUserPermissions(auth.userId, auth.tenantId || '')
if (!hasPermission(permissions, 'team.view')) {
  return <AccessDeniedCard />
}
```

---

#### ❌ GAP-2E-04: Deferred Deliverables (Acknowledged)

These are explicitly marked deferred in the phase doc. Documenting for completeness:

1. **`/admin/team/[id]` member profile page** — No route exists. Directory `/admin/team/` only has `roles/` subdirectory.
2. **Member removed notification email** — Inviter is notified when invite is accepted, but no email is sent when a member is removed.
3. **Unit tests for team service functions** — `packages/auth/src/__tests__/` has no `team.test.ts`.
4. **Integration tests for invitation flow** — No E2E coverage.
5. **Tenant isolation tests** — No tests verifying cross-tenant data leakage prevention.
6. **CSV bulk invite** — Not implemented (AI discretion area).

---

## PHASE-2F: Role-Based Access Control (RBAC)

**Phase doc status**: ✅ COMPLETE (marked 2026-02-13)  
**Audit verdict**: ⚠️ PARTIAL — critical gap: PermissionProvider not mounted

### Feature Classification

| Feature | Status | Evidence |
|---|---|---|
| DB: `roles` table | ✅ DONE | `packages/db/src/migrations/public/009_roles.sql` |
| DB: 7 predefined roles seeded | ✅ DONE | Same migration (UUIDs 001-007) |
| DB: `user_organizations.role_id` column | ✅ DONE | Same migration |
| `hasPermission()` — exact match | ✅ DONE | `packages/auth/src/permissions/checker.ts` |
| `hasPermission()` — full wildcard `*` | ✅ DONE | Same |
| `hasPermission()` — category wildcard `orders.*` | ✅ DONE | Same |
| `hasPermission()` — action wildcard `*.view` | ✅ DONE | Same |
| `hasPermission()` — nested `creators.*` matches `creators.payments.approve` | ✅ DONE | Same |
| `hasAnyPermission()` | ✅ DONE | Same |
| `hasAllPermissions()` | ✅ DONE | Same |
| `resolvePermissions()` (inheritance, dedup) | ✅ DONE | Same |
| `expandWildcards()` | ✅ DONE | Same |
| `isValidPermissionFormat()` | ✅ DONE | Same |
| `isWildcardPermission()` | ✅ DONE | Same |
| `getUserPermissions()` (role_id + legacy fallback) | ✅ DONE | `packages/auth/src/permissions/user-permissions.ts` |
| `isTenantAdmin()` | ✅ DONE | Same |
| `getUsersWithPermission()` | ✅ DONE | Same |
| `getDefaultRoleIdForLegacyRole()` | ✅ DONE | Same |
| `PERMISSION_CATEGORIES` definitions | ✅ DONE | `packages/auth/src/permissions/definitions.ts` |
| `getAllPermissions()`, `getPermissionsByCategory()` | ✅ DONE | Same |
| `getCategories()`, `getCategoryFromPermission()` | ✅ DONE | Same |
| Role CRUD: `createCustomRole()` | ✅ DONE | `packages/auth/src/permissions/roles.ts` |
| Role CRUD: `updateRole()` | ✅ DONE | Same |
| Role CRUD: `deleteRole()` | ✅ DONE | Same |
| Role CRUD: `getRolesForTenant()` | ✅ DONE | Same |
| Role CRUD: `getPredefinedRoles()` | ✅ DONE | Same |
| Role CRUD: `getRoleById()` | ✅ DONE | Same |
| Role CRUD: `getRoleWithInheritance()` (effective perms) | ✅ DONE | Same |
| Role CRUD: `getUserRole()` | ✅ DONE | Same |
| Role CRUD: `assignRoleToUser()` | ✅ DONE | Implemented, but **never called** from any route |
| `PREDEFINED_ROLE_IDS` constants | ✅ DONE | Same |
| `requirePermission()` middleware | ✅ DONE | `packages/auth/src/permissions/middleware.ts` |
| `requireAnyPermission()` middleware | ✅ DONE | Same |
| `requireAllPermissions()` middleware | ✅ DONE | Same |
| `checkPermissionOrRespond()` | ✅ DONE | Same |
| `checkAnyPermissionOrRespond()` | ✅ DONE | Same |
| `checkAllPermissionsOrRespond()` | ✅ DONE | Same |
| `withPermissionCheck()` HOF | ✅ DONE | Same |
| `PermissionDeniedError` | ✅ DONE | Same |
| `PermissionProvider` React context (defined) | ✅ DONE | `packages/ui/src/context/permission-context.tsx` |
| `PermissionProvider` wired into admin layout | ❌ NOT DONE | `apps/admin/src/app/admin/layout.tsx` — not present |
| `usePermissions()` hook | ✅ DONE | permission-context.tsx |
| `useHasPermission()` hook | ✅ DONE | Same (throws if no provider) |
| `useHasAnyPermission()` hook | ✅ DONE | Same |
| `useHasAllPermissions()` hook | ✅ DONE | Same |
| `PermissionGate` component | ✅ DONE | Same (throws if no provider) |
| `withPermission` HOC | ✅ DONE | Same (throws if no provider) |
| `GET /api/admin/roles` | ✅ DONE | `apps/admin/src/app/api/admin/roles/route.ts` |
| `POST /api/admin/roles` | ✅ DONE | Same |
| `GET /api/admin/roles/[id]` | ✅ DONE | `apps/admin/src/app/api/admin/roles/[id]/route.ts` |
| `PATCH /api/admin/roles/[id]` | ✅ DONE | Same |
| `DELETE /api/admin/roles/[id]` | ✅ DONE | Same |
| `GET /api/admin/permissions` | ✅ DONE | `apps/admin/src/app/api/admin/permissions/route.ts` |
| `POST /api/admin/permissions/check` | ✅ DONE | `apps/admin/src/app/api/admin/permissions/check/route.ts` |
| `GET /api/auth/permissions` | ✅ DONE | `apps/admin/src/app/api/auth/permissions/route.ts` |
| `/admin/team/roles` page | ✅ DONE | `apps/admin/src/app/admin/team/roles/page.tsx` |
| `/admin/team/roles/new` page | ✅ DONE | `apps/admin/src/app/admin/team/roles/new/page.tsx` |
| `/admin/team/roles/[id]` page | ✅ DONE | `apps/admin/src/app/admin/team/roles/[id]/page.tsx` |
| `/admin/settings/permissions` permission matrix | ✅ DONE | `apps/admin/src/app/admin/settings/permissions/page.tsx` |
| `RoleList` component | ✅ DONE | `apps/admin/src/components/roles/role-list.tsx` |
| `RoleEditor` component | ✅ DONE | `apps/admin/src/components/roles/role-editor.tsx` |
| `PermissionMatrix` component | ✅ DONE | `apps/admin/src/components/roles/permission-matrix.tsx` |
| `RoleSelector` component | ✅ DONE | `apps/admin/src/components/roles/role-selector.tsx` |
| Unit tests: permission resolution (38 tests) | ✅ DONE | `packages/auth/src/__tests__/permissions.test.ts` |
| Unit tests: role CRUD | ❌ NOT DONE | Deferred in phase doc |
| Integration tests: permission enforcement | ❌ NOT DONE | Deferred |
| UI permission gate tests | ❌ NOT DONE | Deferred |

### Gaps & Issues — Phase 2F

#### ❌ GAP-2F-01: `PermissionProvider` Not Mounted in Admin Layout [CRITICAL]

**Severity**: High  
**File**: `apps/admin/src/app/admin/admin-providers.tsx` (missing), `apps/admin/src/app/admin/layout.tsx`

`PermissionProvider` is defined in `packages/ui/src/context/permission-context.tsx` and exported from `@cgk-platform/ui`. It is **never mounted** in the admin application's React tree. `AdminProviders` only wraps `TenantProvider`:

```tsx
// apps/admin/src/app/admin/admin-providers.tsx — CURRENT
export function AdminProviders({ initialTenant, initialTenants, children }) {
  return (
    <TenantProvider ...>
      {children}
    </TenantProvider>
  )
}
```

**Consequence**: Any call to `useHasPermission()`, `usePermissions()`, `PermissionGate`, or `withPermission()` will throw:
```
Error: usePermissions must be used within a PermissionProvider
```

The `/api/auth/permissions` endpoint exists to feed permissions to the provider but is never consumed on the client side. All client-side RBAC UI gating is **effectively dead code** until this is fixed.

**TODO:**
```tsx
// apps/admin/src/app/admin/admin-providers.tsx
import { PermissionProvider, TenantProvider, type TenantInfo } from '@cgk-platform/ui'

interface AdminProvidersProps {
  initialTenant: TenantInfo | null
  initialTenants: TenantInfo[]
  initialPermissions?: string[]  // Add this prop
  children: React.ReactNode
}

export function AdminProviders({
  initialTenant,
  initialTenants,
  initialPermissions = [],
  children,
}: AdminProvidersProps) {
  return (
    <TenantProvider
      initialTenant={initialTenant}
      initialTenants={initialTenants}
      tenantsUrl="/api/auth/context/tenants"
      switchUrl="/api/auth/context/switch"
      defaultUrl="/api/auth/context/default"
    >
      <PermissionProvider
        initialPermissions={initialPermissions}
        fetchUrl="/api/auth/permissions"
      >
        {children}
      </PermissionProvider>
    </TenantProvider>
  )
}
```

```tsx
// apps/admin/src/app/admin/layout.tsx — add permission fetching
import { getUserPermissions } from '@cgk-platform/auth'

// In AdminLayout:
let userPermissions: string[] = []
if (userId && tenantId) {
  userPermissions = await getUserPermissions(userId, tenantId)
}

return (
  <>
    <style dangerouslySetInnerHTML={{ __html: themeCSS }} />
    <AdminProviders
      initialTenant={currentTenantContext}
      initialTenants={userTenants}
      initialPermissions={userPermissions}  // Pass permissions SSR
    >
      <AdminShell ...>
        {children}
      </AdminShell>
    </AdminProviders>
  </>
)
```

Note: After a tenant switch, the page reloads (handled by TenantSwitcher), so permissions will be re-fetched from `/api/auth/permissions` automatically via the provider's `useEffect`.

---

#### ⚠️ GAP-2F-02: `assignRoleToUser()` Is Never Called From Any Route

**Severity**: Medium  
**File**: `packages/auth/src/permissions/roles.ts`

`assignRoleToUser()` is implemented and exported but never invoked anywhere in the codebase. Team member role changes (PATCH `/api/admin/team/[id]`) call `updateMemberRole()` which only updates the legacy `role` column. There is no way for a tenant admin to currently assign custom RBAC roles (role_id) to team members through the UI.

**TODO:**
1. Update the PATCH `/api/admin/team/[id]` route to accept either a legacy role string OR an RBAC `roleId`.
2. In `updateMemberRole()` or a new `updateMemberRbacRole()` function, call `assignRoleToUser()` when a `roleId` is provided.
3. Update the `TeamMemberList` and `RoleSelector` UI components to allow selecting custom roles (currently only shows owner/admin/member).

---

#### ⚠️ GAP-2F-03: `/api/admin/permissions` GET Has No Permission Guard

**Severity**: Low  
**File**: `apps/admin/src/app/api/admin/permissions/route.ts`

The permissions definitions endpoint only validates that `x-tenant-id` and `x-user-id` headers exist (set by middleware = authenticated). It does not require any specific permission. Any authenticated tenant member can read the full permission catalog. This is probably intentional (definitions aren't sensitive), but differs from the phase spec and team view pattern.

**TODO (optional):** Add `team.view` permission check if you want to restrict permission discovery to team managers:
```typescript
const denied = await checkPermissionOrRespond(userId, tenantId, 'team.view')
if (denied) return denied
```

---

#### ⚠️ GAP-2F-04: Permission Category Naming Divergence from Spec

**Severity**: Low (design decision)  
**File**: `packages/auth/src/permissions/definitions.ts`

Phase 2F spec defines a `COMMERCE` category containing orders, subscriptions, reviews, products. The implementation uses separate top-level categories: `orders`, `subscriptions`, `reviews`, `products`. Similarly the spec uses `finance.*` wildcards in the Finance role, but the implementation uses explicit `payouts.*`, `treasury.*`, `expenses.*`. This is a valid implementation decision but diverges from spec.

The predefined Manager role in the spec includes `'commerce.*'` but implementation uses individual permissions. **No functional issue** — the implementation is arguably cleaner — but worth documenting for future permission expansion planning.

---

## PHASE-2G: Multi-Tenant Context Switching

**Phase doc status**: ✅ COMPLETE (marked 2026-02-13)  
**Audit verdict**: ⚠️ PARTIAL — welcome modal never triggered

### Feature Classification

| Feature | Status | Evidence |
|---|---|---|
| DB: `user_organizations.is_default` column | ✅ DONE | `packages/db/src/migrations/public/012_context_switching.sql` |
| DB: `user_organizations.last_active_at` column | ✅ DONE | Same |
| DB: Partial unique index (one default per user) | ✅ DONE | `idx_user_organizations_unique_default` |
| `switchTenantContext()` — validates membership | ✅ DONE | `packages/auth/src/tenant-context.ts` |
| `switchTenantContext()` — rejects suspended tenants | ✅ DONE | Checks `status !== 'active'` |
| `switchTenantContext()` — issues new JWT | ✅ DONE | `signJWT()` called with new org context |
| `switchTenantContext()` — logs activity | ✅ DONE | `logUserActivity('tenant.switched')` |
| `switchTenantContext()` — updates session org | ✅ DONE | `updateSessionOrganization()` called |
| `switchTenantContext()` — updates `last_active_at` | ✅ DONE | SQL UPDATE in function |
| `getUserTenants()` | ✅ DONE | Same file |
| `setDefaultTenant()` — validates access first | ✅ DONE | Same file |
| `setDefaultTenant()` — clears existing default | ✅ DONE | Two-step UPDATE |
| `getDefaultTenant()` | ✅ DONE | Same file |
| `updateMembershipActivity()` | ✅ DONE | Same file |
| `shouldShowWelcomeModal()` (defined) | ✅ DONE | Same file |
| `shouldShowWelcomeModal()` (called anywhere) | ❌ NOT DONE | Never invoked from any page/layout |
| `TenantProvider` React context | ✅ DONE | `packages/ui/src/context/tenant-context.tsx` |
| `useTenant()` hook | ✅ DONE | Same |
| `useTenantOptional()` hook | ✅ DONE | Same |
| `useCurrentTenant()` hook | ✅ DONE | Same |
| `useAvailableTenants()` hook | ✅ DONE | Same |
| `useHasMultipleTenants()` hook | ✅ DONE | Same |
| `TenantSwitcher` component (dropdown) | ✅ DONE | `packages/ui/src/components/tenant-switcher.tsx` |
| TenantSwitcher — page reload on switch | ✅ DONE | `window.location.reload()` in `handleSwitch()` |
| TenantSwitcher — search when > 5 tenants | ✅ DONE | `searchThreshold` prop with filter |
| TenantSwitcher — set default (star icon) | ✅ DONE | `handleSetDefault()` |
| TenantSwitcher — hidden if single tenant | ✅ DONE | `if (!hasMultipleTenants)` returns null |
| `MultiTenantWelcomeModal` component (built) | ✅ DONE | `packages/ui/src/components/multi-tenant-welcome-modal.tsx` |
| `MultiTenantWelcomeModal` shown in admin | ❌ NOT DONE | Not mounted anywhere in admin app |
| `GET /api/auth/context` | ✅ DONE | `apps/admin/src/app/api/auth/context/route.ts` |
| `GET /api/auth/context/tenants` | ✅ DONE | `apps/admin/src/app/api/auth/context/tenants/route.ts` |
| `POST /api/auth/context/switch` | ✅ DONE | `apps/admin/src/app/api/auth/context/switch/route.ts` |
| `POST /api/auth/context/default` | ✅ DONE | `apps/admin/src/app/api/auth/context/default/route.ts` |
| TenantProvider wired into admin layout | ✅ DONE | `AdminProviders` wraps layout |
| TenantSwitcher in admin header | ✅ DONE | `apps/admin/src/components/admin/header.tsx:53` |
| TenantSwitcher for creator portal | ❌ NOT DONE | Explicitly deferred |
| URL-based tenant context (`/admin/[tenant]/...`) | ❌ NOT DONE | Explicitly deferred |
| Unit tests: `switchTenantContext()` | ✅ DONE | `packages/auth/src/__tests__/tenant-context.test.ts` |
| Unit tests: `setDefaultTenant()` | ✅ DONE | Same |
| Unit tests: `getDefaultTenant()` | ✅ DONE | Same |
| Unit tests: `shouldShowWelcomeModal()` | ✅ DONE | Same |
| E2E integration tests for full switch flow | ❌ NOT DONE | Explicitly deferred |

### Gaps & Issues — Phase 2G

#### ❌ GAP-2G-01: `MultiTenantWelcomeModal` Built But Never Shown [MEDIUM]

**Severity**: Medium (degraded UX for multi-tenant users)  
**File**: `packages/ui/src/components/multi-tenant-welcome-modal.tsx` (built)  
**Missing from**: `apps/admin/src/app/admin/layout.tsx` and `admin-providers.tsx`

The `MultiTenantWelcomeModal` component is complete, exported from `@cgk-platform/ui`, and `shouldShowWelcomeModal()` is implemented in `packages/auth/src/tenant-context.ts`. However, nothing in the admin application calls `shouldShowWelcomeModal()` or renders the modal. Multi-tenant users see no tenant selection prompt on first login.

**TODO:**

**Option A: Server-side check in admin layout (recommended)**
```tsx
// apps/admin/src/app/admin/layout.tsx
import { shouldShowWelcomeModal } from '@cgk-platform/auth'

// Inside AdminLayout:
let showWelcomeModal = false
if (userId) {
  showWelcomeModal = await shouldShowWelcomeModal(userId)
}

// Pass to AdminProviders:
<AdminProviders
  initialTenant={currentTenantContext}
  initialTenants={userTenants}
  initialPermissions={userPermissions}
  showWelcomeModal={showWelcomeModal}  // New prop
>
```

**Option B: Add welcome modal to AdminShell or a client wrapper:**
```tsx
// apps/admin/src/app/admin/admin-shell.tsx
import { MultiTenantWelcomeModal, useTenant } from '@cgk-platform/ui'

// In AdminShell client component:
const { availableTenants, switchTenant } = useTenant()
const [showWelcome, setShowWelcome] = React.useState(props.showWelcomeModal)

return (
  <>
    <MultiTenantWelcomeModal
      isOpen={showWelcome}
      onClose={() => setShowWelcome(false)}
      onSelect={async (tenant) => {
        await switchTenant(tenant.slug)
        setShowWelcome(false)
      }}
      allowDismiss={true}
    />
    {/* ... existing shell */}
  </>
)
```

---

#### ⚠️ GAP-2G-02: Context Switch Does Not Invalidate Other Tabs' Tenant Context

**Severity**: Low (accepted trade-off, noted in phase doc)  
**File**: `packages/auth/src/tenant-context.ts`, `apps/admin/src/middleware.ts`

`switchTenantContext()` calls `updateSessionOrganization(sessionId, tenantId)` but the session `id` in the old tab's JWT remains valid. In a multi-tab scenario, switching tenant in Tab A leaves Tab B's JWT pointing to the old tenant. API requests from Tab B will still use the old tenant context from the JWT until that tab's page is refreshed.

This is documented as an intentional design decision ("old sessions remain valid"). No action required but worth noting for future security hardening.

---

#### ⚠️ GAP-2G-03: Permission State Not Refreshed After Tenant Switch

**Severity**: Medium (consequence of GAP-2F-01)  
**Related**: GAP-2F-01

When a tenant switch occurs, `window.location.reload()` is called by the `TenantSwitcher` component. The page reload will re-execute the admin layout server component, which fetches the new tenant's permissions server-side and passes `initialPermissions` to `AdminProviders` → `PermissionProvider`. This design is correct **but only works once GAP-2F-01 is fixed** (PermissionProvider is mounted). Until then, client-side permissions are always the empty array, independent of which tenant is active.

---

## Cross-Cutting Issues

### ⚠️ CROSS-01: RBAC and Legacy Role System Are Partially Disconnected

The system has two parallel role assignment mechanisms:
1. **Legacy**: `user_organizations.role` (enum: `owner`, `admin`, `member`, `super_admin`)
2. **RBAC**: `user_organizations.role_id` (FK to `roles` table)

`getUserPermissions()` correctly prefers `role_id` when present, falling back to legacy. However:
- The invitation acceptance flow sets only legacy `role`
- The role update flow sets only legacy `role`
- `assignRoleToUser()` sets only `role_id`
- No flow currently sets both consistently

Until all flows write both columns coherently (or migrate to RBAC-only), the system will have inconsistent permission resolution depending on which column was last written.

**Recommended migration path:**
1. Fix GAP-2E-02: Have `acceptInvitation()` also set `role_id` using `getDefaultRoleIdForLegacyRole()`
2. Fix GAP-2E-01: Have `updateMemberRole()` also update `role_id`
3. Fix GAP-2F-02: Wire up `assignRoleToUser()` for custom role assignment
4. (Future) Run a migration to backfill `role_id` for all existing `user_organizations` rows where `role_id IS NULL`

### ⚠️ CROSS-02: `permission-context` Not Exported from Right Location

The `PermissionProvider`, `useHasPermission`, `PermissionGate`, etc. are exported from `packages/ui/src/index.ts` (confirmed via grep). The admin layout correctly imports from `@cgk-platform/ui`. No action needed here, just confirming the export chain is intact.

---

## Summary TODO List by Priority

### 🔴 Priority 1 — Fix Before Client-Side RBAC Works

**GAP-2F-01: Mount `PermissionProvider` in admin layout**
- Edit `apps/admin/src/app/admin/admin-providers.tsx` to wrap children in `<PermissionProvider>`
- Edit `apps/admin/src/app/admin/layout.tsx` to fetch `getUserPermissions()` server-side and pass as `initialPermissions`
- Estimated effort: 30 minutes

### 🟡 Priority 2 — Fix for RBAC Coherence

**GAP-2E-01: `updateMemberRole()` — also update `role_id`**
- Edit `packages/auth/src/team.ts:207` to also call `getDefaultRoleIdForLegacyRole(newRole)` and update `role_id`
- Estimated effort: 15 minutes

**GAP-2E-02: `acceptInvitation()` — also set `role_id`**
- Edit `packages/auth/src/team.ts:523` INSERT to include `role_id`
- Estimated effort: 15 minutes

**GAP-2F-02: Wire `assignRoleToUser()` into PATCH `/api/admin/team/[id]`**
- Update `[id]/route.ts` to accept `roleId` in addition to `role`
- Update `updateMemberRole()` or add new service method to call `assignRoleToUser()`
- Update `TeamMemberList` / `RoleSelector` UI to expose custom role selection
- Estimated effort: 2-3 hours

### 🟡 Priority 3 — UX Completeness

**GAP-2G-01: Wire `MultiTenantWelcomeModal` into admin layout**
- Call `shouldShowWelcomeModal(userId)` in admin layout
- Pass result to `AdminProviders`/`AdminShell` to conditionally render modal
- Estimated effort: 1 hour

**GAP-2E-03: Replace legacy role check in team settings page**
- Edit `apps/admin/src/app/admin/settings/team/page.tsx:38`
- Replace `auth.role in ['owner', 'admin', 'super_admin']` with `hasPermission(permissions, 'team.view')`
- Estimated effort: 10 minutes

### 🟢 Priority 4 — Backfill & Test Coverage (Deferred by Phase Doc)

- Run SQL migration to backfill `role_id` for existing `user_organizations` rows
- Write `packages/auth/src/__tests__/team.test.ts` (unit tests for invitation/member flows)
- Write integration tests for invitation flow (end-to-end)
- Write tenant isolation tests (cross-tenant data leakage prevention)
- Build `/admin/team/[id]` member profile page
- Build member removed notification email
- Consider `GAP-2F-03` (optional permission guard on permissions definitions endpoint)

---

## File Reference Index

| File | Phase | Role |
|---|---|---|
| `packages/auth/src/team.ts` | 2E | Team service (invitations, members, audit) |
| `packages/auth/src/permissions/checker.ts` | 2F | Permission resolution logic |
| `packages/auth/src/permissions/roles.ts` | 2F | Role CRUD service |
| `packages/auth/src/permissions/definitions.ts` | 2F | Permission category definitions |
| `packages/auth/src/permissions/middleware.ts` | 2F | requirePermission() middleware |
| `packages/auth/src/permissions/user-permissions.ts` | 2F | getUserPermissions() + legacy fallback |
| `packages/auth/src/permissions/index.ts` | 2F | Barrel export |
| `packages/auth/src/tenant-context.ts` | 2G | Context switching service |
| `packages/auth/src/__tests__/permissions.test.ts` | 2F | 38 unit tests ✅ |
| `packages/auth/src/__tests__/tenant-context.test.ts` | 2G | 6 unit test suites ✅ |
| `packages/db/src/migrations/public/008_team_management.sql` | 2E | Team invitations + audit schema |
| `packages/db/src/migrations/public/009_roles.sql` | 2F | Roles table + 7 predefined seeds |
| `packages/db/src/migrations/public/012_context_switching.sql` | 2G | is_default, last_active_at |
| `packages/ui/src/context/permission-context.tsx` | 2F | PermissionProvider (not mounted!) |
| `packages/ui/src/context/tenant-context.tsx` | 2G | TenantProvider (mounted ✅) |
| `packages/ui/src/components/tenant-switcher.tsx` | 2G | TenantSwitcher UI (in header ✅) |
| `packages/ui/src/components/multi-tenant-welcome-modal.tsx` | 2G | Welcome modal (not mounted ❌) |
| `apps/admin/src/app/api/admin/team/route.ts` | 2E | GET team members |
| `apps/admin/src/app/api/admin/team/[id]/route.ts` | 2E | GET/PATCH/DELETE team member |
| `apps/admin/src/app/api/admin/team/invitations/route.ts` | 2E | GET/POST invitations |
| `apps/admin/src/app/api/admin/team/invitations/[id]/route.ts` | 2E | GET/DELETE invitation |
| `apps/admin/src/app/api/admin/team/invitations/[id]/resend/route.ts` | 2E | POST resend |
| `apps/admin/src/app/api/auth/accept-invite/route.ts` | 2E | POST accept invitation |
| `apps/admin/src/app/api/admin/roles/route.ts` | 2F | GET/POST roles |
| `apps/admin/src/app/api/admin/roles/[id]/route.ts` | 2F | GET/PATCH/DELETE role |
| `apps/admin/src/app/api/admin/permissions/route.ts` | 2F | GET permission definitions |
| `apps/admin/src/app/api/admin/permissions/check/route.ts` | 2F | POST permission check |
| `apps/admin/src/app/api/auth/permissions/route.ts` | 2F | GET current user permissions |
| `apps/admin/src/app/api/auth/context/route.ts` | 2G | GET current user+tenant context |
| `apps/admin/src/app/api/auth/context/tenants/route.ts` | 2G | GET accessible tenants |
| `apps/admin/src/app/api/auth/context/switch/route.ts` | 2G | POST switch tenant |
| `apps/admin/src/app/api/auth/context/default/route.ts` | 2G | POST set default tenant |
| `apps/admin/src/app/admin/layout.tsx` | 2G | Admin layout (TenantProvider ✅, PermissionProvider ❌) |
| `apps/admin/src/app/admin/admin-providers.tsx` | 2G | Client providers wrapper |
| `apps/admin/src/app/admin/settings/team/page.tsx` | 2E | Team management UI page |
| `apps/admin/src/app/admin/settings/permissions/page.tsx` | 2F | Permission matrix page |
| `apps/admin/src/app/admin/team/roles/page.tsx` | 2F | Roles list page |
| `apps/admin/src/app/admin/team/roles/new/page.tsx` | 2F | Create role page |
| `apps/admin/src/app/admin/team/roles/[id]/page.tsx` | 2F | Edit role page |
| `apps/admin/src/app/join/page.tsx` | 2E | Invitation acceptance page |
| `apps/admin/src/components/team/` | 2E | Team UI components (3 components) |
| `apps/admin/src/components/roles/` | 2F | Role UI components (4 components) |
| `apps/admin/src/middleware.ts` | 2G | Tenant resolution + activity tracking |
