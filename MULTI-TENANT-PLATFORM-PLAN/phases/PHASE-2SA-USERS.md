# PHASE-2SA-USERS: Super Admin User Management

**Duration**: 1 week (Week 7)
**Depends On**: PHASE-2SA-ACCESS, PHASE-2SA-DASHBOARD
**Parallel With**: PHASE-2SA-ADVANCED
**Blocks**: None
**Status**: COMPLETE

---

## Goal

Build the super admin user management interface for viewing and managing all users across the platform, including cross-tenant visibility, impersonation preparation, user activity tracking, and platform-wide user search. This enables platform operators to support users and manage access across all tenants.

---

## Success Criteria

- [x] Super admin can view all users across all tenants
- [x] Super admin can search users by email, name, or tenant
- [x] User detail page shows all tenant memberships
- [x] Super admin can grant/revoke super admin access
- [x] User activity log shows recent actions
- [x] Super admin can disable user accounts
- [x] Cross-tenant user view respects data boundaries

---

## Deliverables

### Database Schema Additions

```sql
-- User status tracking (extends public.users)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
-- Values: active, disabled, pending_verification

-- User activity log (platform-wide)
CREATE TABLE public.user_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id),
  tenant_id UUID REFERENCES public.organizations(id),  -- NULL for platform-level actions

  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id VARCHAR(255),

  metadata JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_activity_user ON public.user_activity_log(user_id);
CREATE INDEX idx_user_activity_tenant ON public.user_activity_log(tenant_id);
CREATE INDEX idx_user_activity_time ON public.user_activity_log(created_at DESC);
CREATE INDEX idx_user_activity_action ON public.user_activity_log(action);

-- Partition by month for performance
-- CREATE TABLE public.user_activity_log_2025_02 PARTITION OF public.user_activity_log
--   FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
```

### User Management Service (`packages/auth/src/user-admin.ts`)

```typescript
// Platform-wide user queries (super admin only)
export async function getAllUsers(options: UserQueryOptions): Promise<PaginatedUsers>
export async function searchUsers(query: string, options?: SearchOptions): Promise<User[]>
export async function getUserWithMemberships(userId: string): Promise<UserWithMemberships>
export async function getUserActivityLog(userId: string, options?: PaginationOptions): Promise<ActivityEntry[]>

// User management
export async function disableUser(userId: string, reason: string): Promise<void>
export async function enableUser(userId: string): Promise<void>
export async function grantSuperAdmin(userId: string, grantedBy: string): Promise<void>
export async function revokeSuperAdmin(userId: string): Promise<void>

// Activity logging
export async function logUserActivity(entry: ActivityLogEntry): Promise<void>
```

### UI Components

- `PlatformUserList` - Paginated table of all platform users
- `UserSearchBar` - Global user search with filters
- `UserDetailCard` - User info with memberships list
- `UserMembershipsTable` - All tenants user belongs to
- `UserActivityFeed` - Recent user actions
- `SuperAdminBadge` - Visual indicator for super admins
- `DisableUserModal` - Confirmation with reason input

### Super Admin Pages

```
/users                         # All platform users list
/users/search                  # Advanced user search
/users/[id]                    # User detail with memberships
/users/[id]/activity           # User activity log
/users/super-admins            # Super admin registry
```

---

## Constraints

- Super admin user list queries must be efficient (indexed, paginated)
- User activity logs must not expose sensitive data (no passwords, tokens)
- Disabling a user must immediately invalidate all their sessions
- Super admin grant/revoke requires MFA verification
- Cannot disable the last super admin
- User searches are logged in super_admin_audit_log

---

## Pattern References

**Skills to invoke:**
- `/frontend-design` - For user list and detail UI
- Context7 MCP: "Admin user management dashboard patterns"

**RAWDOG code to reference:**
- `src/app/admin/settings/permissions/page.tsx` - User list UI patterns
- `src/lib/auth/permissions.ts` - User querying patterns

**Spec documents:**
- `SUPER-ADMIN-ARCHITECTURE-2025-02-10.md` - Super admin user management section
- `PHASE-2SA-ACCESS.md` - Super admin authentication

---

## API Routes

```
/api/platform/users/
  route.ts                     # GET list (paginated, filterable)
  search/route.ts              # GET search results
  [id]/route.ts                # GET user details with memberships
  [id]/activity/route.ts       # GET activity log
  [id]/disable/route.ts        # POST disable user
  [id]/enable/route.ts         # POST enable user

/api/platform/users/super-admins/
  route.ts                     # GET list, POST add super admin
  [id]/route.ts                # DELETE revoke super admin
```

---

## Frontend Design Prompts

### Platform User List

```
/frontend-design

Building Platform User List for super admin (PHASE-2SA-USERS).

Requirements:
- Full-page table showing all users across all tenants
- Columns:
  1. Avatar + Name
  2. Email
  3. Status badge (active/disabled/pending)
  4. Tenant count (e.g., "3 tenants")
  5. Super Admin badge (if applicable)
  6. Last Active (relative time)
  7. Actions (View, Disable)

Filters:
- Status dropdown (All, Active, Disabled, Pending)
- Has Super Admin (Yes/No)
- Tenant filter (search tenants, show users from that tenant)
- Date range (joined after, joined before)

Search:
- Global search bar for email or name
- Instant search with debounce

Pagination:
- 50 users per page
- Page numbers + Previous/Next

Bulk actions:
- Select multiple users
- Disable selected

Design:
- Dense, data-rich table
- Super admins visually distinguished (star icon or badge)
- Quick-glance status indicators
```

### User Detail Page

```
/frontend-design

Building User Detail Page for super admin (PHASE-2SA-USERS).

Requirements:
- Header section:
  - Large avatar
  - Name + Email
  - Status badge (active/disabled)
  - Super Admin badge (if applicable)
  - Account created date
  - Last active timestamp

- Tenant Memberships section:
  - Table of all tenants user belongs to
  - Columns: Tenant Name, Role, Joined Date, Status
  - Click tenant to navigate to /brands/[id]

- Activity Log section:
  - Recent actions (last 50)
  - Columns: Timestamp, Tenant, Action, Details
  - "View All Activity" link

- Actions section:
  - If not super admin: "Grant Super Admin Access" button
  - If super admin: "Revoke Super Admin Access" button
  - "Disable Account" button (red, confirmation required)
  - "Reset Password" link

Layout:
- Two-column on desktop (info left, activity right)
- Single column on mobile

Design:
- Clear hierarchy of information
- Activity log scrollable within fixed height
- Destructive actions require confirmation
```

### Super Admin Registry

```
/frontend-design

Building Super Admin Registry for super admin (PHASE-2SA-USERS).

Requirements:
- List of all super admin users
- Columns:
  1. Avatar + Name
  2. Email
  3. Granted By (who gave them access)
  4. Granted At
  5. Actions (Revoke)

Add Super Admin:
- Search input to find existing users
- Confirmation modal: "Grant super admin access to [name]?"

Revoke:
- Cannot revoke own super admin access
- Cannot revoke last super admin
- Confirmation modal with MFA challenge

History:
- Log of all super admin grants/revokes

Design:
- Simple, focused list
- Clear distinction between "you" and other admins
- Warning for destructive actions
```

---

## AI Discretion Areas

The implementing agent should determine the best approach for:
1. How much user activity to log (all actions vs key actions only)
2. Activity log retention policy (30 days? 90 days?)
3. Whether to support user impersonation from this page (or separate flow)
4. Whether to show users without any tenant memberships

---

## Tasks

### [PARALLEL] Database & Service Layer
- [x] Add `status` column to users table
- [x] Create `user_activity_log` table with indexes
- [x] Implement `getAllUsers()` with pagination and filters
- [x] Implement `searchUsers()` with full-text search
- [x] Implement `getUserWithMemberships()` joining across tables
- [x] Implement `logUserActivity()` for activity tracking

### [PARALLEL] User Management Operations
- [x] Implement `disableUser()` with session invalidation
- [x] Implement `enableUser()`
- [x] Implement `grantSuperAdmin()` with MFA requirement
- [x] Implement `revokeSuperAdmin()` with protections

### [SEQUENTIAL after Service Layer] API Routes
- [x] Create user list route with filters
- [x] Create user search route
- [x] Create user detail route
- [x] Create user activity route
- [x] Create disable/enable routes
- [x] Create super admin grant/revoke routes

### [SEQUENTIAL after API Routes] UI Components
- [x] Invoke `/frontend-design` for PlatformUserList
- [x] Invoke `/frontend-design` for UserDetailPage
- [x] Build PlatformUserList component
- [x] Build UserSearchBar component
- [x] Build UserDetailCard component
- [x] Build UserMembershipsTable component
- [x] Build UserActivityFeed component

### [SEQUENTIAL after Components] Pages
- [x] Create `/users` page (orchestrator app)
- [x] Create `/users/[id]` page
- [x] Create `/users/super-admins` page

### [SEQUENTIAL after All] Testing
- [x] Unit tests for user queries
- [x] Unit tests for disable/enable flow
- [x] Integration tests for super admin grant/revoke
- [x] Tests for activity logging

---

## Interfaces

### UserWithMemberships

```typescript
interface UserWithMemberships {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
  status: 'active' | 'disabled' | 'pending_verification'
  isSuperAdmin: boolean
  superAdminGrantedBy: string | null
  superAdminGrantedAt: Date | null
  createdAt: Date
  lastActiveAt: Date | null

  memberships: Array<{
    tenantId: string
    tenantName: string
    tenantSlug: string
    tenantLogoUrl: string | null
    role: string
    joinedAt: Date
    isDefault: boolean
  }>
}
```

### UserActivityEntry

```typescript
interface UserActivityEntry {
  id: string
  userId: string
  tenantId: string | null
  tenantName: string | null
  action: string
  resourceType: string | null
  resourceId: string | null
  metadata: Record<string, unknown>
  ipAddress: string | null
  createdAt: Date
}
```

### UserQueryOptions

```typescript
interface UserQueryOptions {
  page?: number
  limit?: number
  status?: 'active' | 'disabled' | 'pending_verification' | 'all'
  isSuperAdmin?: boolean
  tenantId?: string
  search?: string
  sortBy?: 'name' | 'email' | 'createdAt' | 'lastActiveAt'
  sortOrder?: 'asc' | 'desc'
}
```

---

## Activity Log Actions to Track

```typescript
const TRACKED_ACTIONS = [
  // Auth
  'user.login',
  'user.logout',
  'user.password_reset',
  'user.mfa_enabled',

  // Tenant actions
  'tenant.switched',
  'tenant.joined',
  'tenant.left',

  // Admin actions
  'team.member_invited',
  'team.member_removed',
  'role.changed',

  // Super admin actions
  'super_admin.granted',
  'super_admin.revoked',
  'user.disabled',
  'user.enabled',
  'user.impersonated',
] as const
```

---

## Definition of Done

- [x] All platform users visible to super admin
- [x] User search returns accurate results
- [x] User detail page shows all memberships
- [x] Activity log captures key user actions
- [x] Super admin grant/revoke works with MFA
- [x] User disable immediately invalidates sessions
- [x] Cannot disable last super admin
- [x] Proper loading states and error handling
- [x] `npx tsc --noEmit` passes
- [x] Unit and integration tests pass
