# PHASE-2F: Role-Based Access Control (RBAC)

**Duration**: 1.5 weeks (Week 8-9)
**Depends On**: PHASE-2E (Team Management), PHASE-1C (Auth)
**Parallel With**: PHASE-2PO-HEALTH
**Blocks**: All subsequent phases (permissions enforced everywhere)

---

## ⚠️ MANDATORY: Tenant Isolation

**READ FIRST**: [TENANT-ISOLATION.md](../TENANT-ISOLATION.md)

Custom roles are tenant-scoped. Predefined roles are platform-wide.

---

## Goal

Implement a comprehensive Role-Based Access Control (RBAC) system with predefined roles, custom role creation, granular permissions, and enforcement throughout the application. This enables tenant admins to fine-tune access for their team members.

---

## Permission Model

### Permission Categories

```typescript
const PERMISSION_CATEGORIES = {
  TENANT: {
    'tenant.settings.view': 'View tenant settings',
    'tenant.settings.edit': 'Edit tenant settings',
    'tenant.billing.view': 'View billing information',
    'tenant.billing.manage': 'Manage billing and subscriptions',
  },

  TEAM: {
    'team.view': 'View team members',
    'team.invite': 'Invite new team members',
    'team.manage': 'Edit and remove team members',
    'team.roles.manage': 'Create and edit custom roles',
  },

  CREATORS: {
    'creators.view': 'View creators list',
    'creators.manage': 'Approve, reject, edit creators',
    'creators.contracts.view': 'View contracts',
    'creators.contracts.sign': 'Sign contracts on behalf of brand',
    'creators.payments.view': 'View payment history',
    'creators.payments.approve': 'Approve payouts and withdrawals',
  },

  COMMERCE: {
    'orders.view': 'View orders',
    'orders.manage': 'Edit orders, process refunds',
    'subscriptions.view': 'View subscriptions',
    'subscriptions.manage': 'Cancel, pause, modify subscriptions',
    'reviews.view': 'View product reviews',
    'reviews.manage': 'Approve, reject, respond to reviews',
    'products.view': 'View products',
    'products.sync': 'Trigger product sync from Shopify',
  },

  FINANCE: {
    'payouts.view': 'View payout history',
    'payouts.process': 'Process pending payouts',
    'treasury.view': 'View treasury dashboard',
    'treasury.approve': 'Approve treasury transactions',
    'expenses.view': 'View operating expenses',
    'expenses.manage': 'Add, edit, categorize expenses',
  },

  CONTENT: {
    'content.view': 'View blog posts and landing pages',
    'content.edit': 'Create and edit content',
    'content.publish': 'Publish content to live site',
    'dam.view': 'View digital asset library',
    'dam.manage': 'Upload, organize, delete assets',
  },

  INTEGRATIONS: {
    'integrations.view': 'View connected integrations',
    'integrations.manage': 'Connect, disconnect integrations',
  },

  ANALYTICS: {
    'analytics.view': 'View analytics dashboards',
    'attribution.view': 'View marketing attribution',
    'reports.export': 'Export reports and data',
  },
} as const
```

### Predefined Roles

```typescript
const PREDEFINED_ROLES = {
  TENANT_ADMIN: {
    name: 'Tenant Admin',
    description: 'Full access to all tenant features',
    permissions: ['*'],  // Wildcard = all permissions
    isPredefined: true,
    canDelete: false,
  },

  MANAGER: {
    name: 'Manager',
    description: 'Manage operations without billing access',
    permissions: [
      'tenant.settings.view',
      'team.*',
      'creators.*',
      'commerce.*',
      'content.*',
      'integrations.*',
      'analytics.*',
      // Excludes: tenant.billing.*, finance.treasury.approve
    ],
    isPredefined: true,
    canDelete: false,
  },

  FINANCE: {
    name: 'Finance',
    description: 'Financial operations and reporting',
    permissions: [
      'orders.view',
      'subscriptions.view',
      'creators.payments.*',
      'finance.*',
      'analytics.view',
      'reports.export',
    ],
    isPredefined: true,
    canDelete: false,
  },

  CREATOR_MANAGER: {
    name: 'Creator Manager',
    description: 'Manage creator relationships and projects',
    permissions: [
      'creators.*',
      'content.view',
      'dam.*',
      'analytics.view',
    ],
    isPredefined: true,
    canDelete: false,
  },

  CONTENT_MANAGER: {
    name: 'Content Manager',
    description: 'Manage content and reviews',
    permissions: [
      'reviews.*',
      'content.*',
      'dam.*',
      'products.view',
    ],
    isPredefined: true,
    canDelete: false,
  },

  SUPPORT: {
    name: 'Support',
    description: 'View-only access with support tools',
    permissions: [
      'orders.view',
      'subscriptions.view',
      'creators.view',
      'reviews.view',
      'content.view',
    ],
    isPredefined: true,
    canDelete: false,
  },

  VIEWER: {
    name: 'Viewer',
    description: 'Read-only access to dashboards',
    permissions: [
      '*.view',  // All view permissions only
    ],
    isPredefined: true,
    canDelete: false,
  },
} as const
```

---

## Success Criteria

- [ ] All predefined roles available to all tenants
- [ ] Tenant admins can create custom roles with selected permissions
- [ ] Role assignment changes take effect immediately (no logout required)
- [ ] Permission checks work in API routes, middleware, and UI
- [ ] UI elements hidden based on permissions (buttons, menu items)
- [ ] Permission denied errors are user-friendly
- [ ] Custom roles can inherit from predefined roles

---

## Deliverables

### Database Schema

```sql
-- Roles table (predefined + custom)
CREATE TABLE public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.organizations(id),  -- NULL for predefined roles

  name VARCHAR(100) NOT NULL,
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '[]',  -- Array of permission strings

  is_predefined BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT true,
  parent_role_id UUID REFERENCES public.roles(id),  -- For inheritance

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_role_name_per_tenant UNIQUE (tenant_id, name)
);

CREATE INDEX idx_roles_tenant ON public.roles(tenant_id);
CREATE INDEX idx_roles_predefined ON public.roles(is_predefined) WHERE is_predefined = true;

-- Seed predefined roles
INSERT INTO public.roles (id, name, description, permissions, is_predefined, can_delete)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Tenant Admin', 'Full access', '["*"]', true, false),
  ('00000000-0000-0000-0000-000000000002', 'Manager', 'Operations management', '["team.*", "creators.*", "commerce.*", "content.*"]', true, false),
  ('00000000-0000-0000-0000-000000000003', 'Finance', 'Financial operations', '["finance.*", "orders.view"]', true, false),
  ('00000000-0000-0000-0000-000000000004', 'Creator Manager', 'Creator management', '["creators.*", "dam.*"]', true, false),
  ('00000000-0000-0000-0000-000000000005', 'Content Manager', 'Content management', '["content.*", "reviews.*", "dam.*"]', true, false),
  ('00000000-0000-0000-0000-000000000006', 'Support', 'Support access', '["*.view"]', true, false),
  ('00000000-0000-0000-0000-000000000007', 'Viewer', 'Read-only access', '["*.view"]', true, false);
```

### Permission Service (`packages/auth/src/permissions.ts`)

```typescript
// Permission checking
export function hasPermission(
  userPermissions: string[],
  requiredPermission: string
): boolean

export function hasAnyPermission(
  userPermissions: string[],
  requiredPermissions: string[]
): boolean

export function hasAllPermissions(
  userPermissions: string[],
  requiredPermissions: string[]
): boolean

// Permission resolution (handles wildcards and inheritance)
export function resolvePermissions(
  rolePermissions: string[],
  parentPermissions?: string[]
): string[]

// Role management
export async function getRolesForTenant(tenantId: string): Promise<Role[]>
export async function createCustomRole(
  tenantId: string,
  data: CreateRoleInput
): Promise<Role>
export async function updateRole(roleId: string, data: UpdateRoleInput): Promise<Role>
export async function deleteRole(roleId: string): Promise<void>

// User permission helpers
export async function getUserPermissions(
  userId: string,
  tenantId: string
): Promise<string[]>
```

### Permission Middleware (`packages/auth/src/permission-middleware.ts`)

```typescript
// Route protection
export function requirePermission(permission: string) {
  return async function middleware(req: NextRequest) {
    const { userId, tenantId } = await getTenantContext(req)
    const permissions = await getUserPermissions(userId, tenantId)

    if (!hasPermission(permissions, permission)) {
      return NextResponse.json(
        { error: 'Permission denied', required: permission },
        { status: 403 }
      )
    }

    return NextResponse.next()
  }
}

// Composable permission checks
export function requireAnyPermission(...permissions: string[])
export function requireAllPermissions(...permissions: string[])
```

### React Permission Context (`packages/ui/src/permission-context.tsx`)

```typescript
// Context provider
export const PermissionProvider: React.FC<{ children: React.ReactNode }>

// Hooks
export function usePermissions(): string[]
export function useHasPermission(permission: string): boolean
export function useHasAnyPermission(permissions: string[]): boolean

// Component guards
export function PermissionGate({
  permission,
  fallback?,
  children
}: PermissionGateProps): JSX.Element

// Higher-order component
export function withPermission(
  permission: string,
  Fallback?: React.ComponentType
): <P>(Component: React.ComponentType<P>) => React.ComponentType<P>
```

### UI Components

- `RoleList` - All available roles for tenant
- `RoleEditor` - Create/edit role with permission checkboxes
- `PermissionMatrix` - Visual grid of permissions vs roles
- `RoleSelector` - Dropdown for selecting role (used in team management)

### Admin Pages

```
/admin/team/roles              # Role list (predefined + custom)
/admin/team/roles/new          # Create custom role
/admin/team/roles/[id]         # Edit role permissions
/admin/settings/permissions    # Permission matrix view
```

---

## Constraints

- Predefined roles cannot be modified or deleted
- Custom roles can only be created by users with `team.roles.manage` permission
- At least one Tenant Admin must exist (cannot remove last admin)
- Permission changes propagate immediately (no caching of user permissions)
- Wildcard permissions (`*`) only allowed in predefined roles
- Role inheritance is single-level only (no deep nesting)

---

## Pattern References

**Skills to invoke:**
- `/frontend-design` - For permission matrix UI
- Context7 MCP: "RBAC best practices JavaScript"

**RAWDOG code to reference:**
- `src/lib/auth/permissions.ts` - Current (minimal) permission system
- `src/app/admin/settings/permissions/` - Existing permissions UI

**Spec documents:**
- `ARCHITECTURE.md` - Role-based permissions section
- `PHASE-2E-TEAM-MANAGEMENT.md` - Role assignment in team context

---

## Permission Resolution Algorithm

```typescript
function hasPermission(userPermissions: string[], required: string): boolean {
  // 1. Exact match
  if (userPermissions.includes(required)) return true

  // 2. Wildcard match: '*' grants everything
  if (userPermissions.includes('*')) return true

  // 3. Category wildcard: 'creators.*' grants 'creators.view'
  const [category, action] = required.split('.')
  if (userPermissions.includes(`${category}.*`)) return true

  // 4. Action wildcard: '*.view' grants 'creators.view'
  if (userPermissions.includes(`*.${action}`)) return true

  return false
}
```

---

## API Routes

```
/api/admin/roles/
  route.ts                     # GET list, POST create
  [id]/route.ts                # GET, PATCH, DELETE

/api/admin/permissions/
  route.ts                     # GET all permission definitions
  check/route.ts               # POST check if user has permission

/api/auth/permissions/
  route.ts                     # GET current user's permissions
```

---

## Frontend Design Prompts

### Role Editor

```
/frontend-design

Building Role Editor for tenant admin (PHASE-2F-RBAC).

Requirements:
- Page/modal for creating or editing a custom role
- Form fields:
  1. Role name (text input, required)
  2. Description (text area, optional)
  3. Inherit from (dropdown to inherit from predefined role, optional)
  4. Permissions (grouped checkboxes)

Permission groups:
- Tenant: Settings, Billing
- Team: View, Invite, Manage, Roles
- Creators: View, Manage, Contracts, Payments
- Commerce: Orders, Subscriptions, Reviews, Products
- Finance: Payouts, Treasury, Expenses
- Content: View, Edit, Publish, DAM
- Integrations: View, Manage
- Analytics: View, Attribution, Export

Behavior:
- When inheriting, inherited permissions are shown but disabled (can't uncheck)
- "Select all" per category
- Changes preview: "This role grants access to: [summary]"

Design:
- Clear visual grouping of permissions
- Inherited vs custom permission distinction
- Disable editing for predefined roles (view-only)
```

### Permission Matrix

```
/frontend-design

Building Permission Matrix for tenant admin (PHASE-2F-RBAC).

Requirements:
- Full-page view showing all roles vs all permissions
- Rows: Permissions (grouped by category)
- Columns: Roles (predefined + custom)
- Cells: Checkmark if role has permission, empty if not
- Clicking cell toggles permission (for custom roles only)

Features:
- Sticky header row (role names always visible)
- Sticky first column (permission names always visible)
- Filter by category
- Search permissions
- Hover to see permission description

Visual:
- Checkmark: Green ✓
- Inherited: Gray ✓ (from parent role)
- Denied: Empty cell
- Predefined roles: Column header has badge

Design:
- Dense but readable table
- Color coding by permission category
- Quick visual comparison across roles
```

---

## AI Discretion Areas

The implementing agent should determine the best approach for:
1. Permission caching strategy (per-request vs short TTL)
2. Whether to support permission groups (grant multiple at once)
3. How to handle permission conflicts in inheritance
4. UI for viewing "effective permissions" after inheritance
5. Whether to support conditional permissions (e.g., "only own orders")

---

## Tasks

### [PARALLEL] Database & Core Service
- [ ] Create `roles` table with predefined role seeds
- [ ] Implement `hasPermission()` with wildcard support
- [ ] Implement `resolvePermissions()` for inheritance
- [ ] Implement `getUserPermissions()` with role lookup
- [ ] Create role CRUD functions

### [PARALLEL] Middleware & Enforcement
- [ ] Implement `requirePermission()` middleware
- [ ] Add permission checks to existing API routes
- [ ] Create permission check API endpoint

### [SEQUENTIAL after Core Service] React Integration
- [ ] Create `PermissionProvider` context
- [ ] Implement `useHasPermission()` hook
- [ ] Implement `PermissionGate` component
- [ ] Add permission guards to admin UI

### [SEQUENTIAL after React Integration] UI Components
- [ ] Invoke `/frontend-design` for RoleEditor
- [ ] Invoke `/frontend-design` for PermissionMatrix
- [ ] Build RoleList component
- [ ] Build RoleEditor component
- [ ] Build PermissionMatrix component

### [SEQUENTIAL after Components] Pages
- [ ] Create `/admin/team/roles` page
- [ ] Create `/admin/team/roles/new` page
- [ ] Create `/admin/team/roles/[id]` page
- [ ] Create `/admin/settings/permissions` page

### [SEQUENTIAL after All] Testing
- [ ] Unit tests for permission resolution (wildcards, inheritance)
- [ ] Unit tests for role CRUD
- [ ] Integration tests for permission enforcement
- [ ] Tests for UI permission gates

---

## Interfaces

### Role

```typescript
interface Role {
  id: string
  tenantId: string | null  // null for predefined
  name: string
  description: string | null
  permissions: string[]
  isPredefined: boolean
  canDelete: boolean
  parentRoleId: string | null
  createdAt: Date
  updatedAt: Date
}
```

### PermissionDefinition

```typescript
interface PermissionDefinition {
  key: string        // e.g., 'creators.payments.approve'
  category: string   // e.g., 'creators'
  name: string       // e.g., 'Approve Payments'
  description: string
}
```

---

## Definition of Done

- [ ] All 7 predefined roles seeded and available
- [ ] Custom roles can be created with selected permissions
- [ ] Permission checks work in API routes
- [ ] Permission checks work in React UI
- [ ] Wildcard permissions resolve correctly
- [ ] Role inheritance works
- [ ] Permission matrix displays correctly
- [ ] Users without permission see appropriate errors
- [ ] UI elements hide based on permissions
- [ ] `npx tsc --noEmit` passes
- [ ] Unit and integration tests pass
