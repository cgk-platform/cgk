# PHASE-2G: Multi-Tenant Context Switching

**Duration**: 0.5 weeks (Week 9)
**Depends On**: PHASE-1C (Auth), PHASE-2E (Team Management)
**Parallel With**: PHASE-2F-RBAC
**Blocks**: None (enhances existing functionality)

---

## Goal

Implement the complete multi-tenant context switching system that allows users to seamlessly switch between organizations they belong to, with proper session management, UI indicators, and security controls. This enables creators, contractors, and team members to work across multiple brands from a single account.

---

## User Scenarios

### Scenario 1: Agency Team Member
A marketing team member works with 3 different brands:
- Switch between brand dashboards without re-logging
- See which brand is currently active
- Quick access to switch between brands

### Scenario 2: Creator Working with Multiple Brands
A content creator has partnerships with 5 brands:
- Access creator portal for each brand
- View earnings per brand
- Submit content to different brands

### Scenario 3: Contractor Serving Multiple Clients
A contractor provides services to multiple tenants:
- View projects from each client
- Submit invoices per client
- Track payments across clients

---

## Success Criteria

- [ ] Users can switch between tenants without logout/login
- [ ] Current tenant is clearly visible in UI
- [ ] Tenant switcher shows all accessible tenants
- [ ] JWT is reissued with new tenant context on switch
- [ ] Default tenant is remembered per user
- [ ] URL structure supports tenant context (optional)
- [ ] API requests respect current tenant context

---

## Deliverables

### Tenant Switcher UI Component (`packages/ui/src/tenant-switcher.tsx`)

```typescript
interface TenantSwitcherProps {
  currentTenant: TenantContext
  availableTenants: TenantContext[]
  onSwitch: (tenantSlug: string) => Promise<void>
  variant?: 'dropdown' | 'modal' | 'sidebar'
}

interface TenantContext {
  id: string
  slug: string
  name: string
  logoUrl: string | null
  role: string
}
```

### Context Switching Service (`packages/auth/src/tenant-context.ts`)

```typescript
// Switch current tenant context
export async function switchTenantContext(
  userId: string,
  targetTenantSlug: string,
  currentSessionId: string
): Promise<{ newToken: string; tenant: TenantContext }>

// Get all accessible tenants for user
export async function getUserTenants(userId: string): Promise<TenantContext[]>

// Set user's default tenant
export async function setDefaultTenant(
  userId: string,
  tenantId: string
): Promise<void>

// Get user's default tenant
export async function getDefaultTenant(userId: string): Promise<TenantContext | null>
```

### React Context (`packages/ui/src/tenant-provider.tsx`)

```typescript
interface TenantContextValue {
  currentTenant: TenantContext
  availableTenants: TenantContext[]
  isLoading: boolean
  switchTenant: (slug: string) => Promise<void>
  setDefaultTenant: (tenantId: string) => Promise<void>
}

export const TenantProvider: React.FC<{ children: React.ReactNode }>
export function useTenant(): TenantContextValue
```

### URL-Based Context (Optional Enhancement)

Support two patterns:
1. **Subdomain-based**: `rawdog.admin.platform.com`, `clientx.admin.platform.com`
2. **Path-based**: `/admin/rawdog/...`, `/admin/clientx/...`

---

## Constraints

- Tenant switch must validate user has access to target tenant
- New JWT must be issued on switch (cannot just change headers)
- Old session remains valid (user can have multiple browser tabs)
- Tenant switch is logged in activity log
- Default tenant is stored in user_memberships (is_default flag)
- Only one default per user
- Cannot switch to disabled/suspended tenants

---

## Pattern References

**Skills to invoke:**
- `/frontend-design` - For tenant switcher UI

**RAWDOG code to reference:**
- N/A (new feature)

**Spec documents:**
- `PHASE-1C-AUTH.md` - JWT claims with tenant context
- `TENANT-ISOLATION.md` - Tenant context enforcement

---

## API Routes

```
/api/auth/context/
  route.ts                     # GET current user + tenant context
  tenants/route.ts             # GET user's accessible tenants
  switch/route.ts              # POST switch to different tenant
  default/route.ts             # POST set default tenant
```

---

## JWT Claims After Switch

```typescript
interface JWTPayload {
  sub: string           // userId (unchanged)
  sid: string           // NEW sessionId (or same if allowing)

  // Current tenant context (CHANGED)
  org: string           // NEW tenant slug
  orgId: string         // NEW tenant ID
  role: string          // Role in NEW tenant

  // All accessible tenants (unchanged)
  orgs: Array<{
    id: string
    slug: string
    role: string
  }>

  iat: number           // NEW issued at
  exp: number           // NEW expiration
}
```

---

## Frontend Design Prompts

### Tenant Switcher Dropdown

```
/frontend-design

Building Tenant Switcher Dropdown (PHASE-2G-CONTEXT-SWITCHING).

Requirements:
- Compact dropdown in admin header
- Current tenant shown as trigger:
  - Tenant logo (small)
  - Tenant name
  - Chevron down icon

- Dropdown content:
  - List of all accessible tenants
  - Each item: Logo + Name + Role badge
  - Current tenant has checkmark
  - Search input if > 5 tenants

- Footer:
  - "Set as default" option for non-default tenant
  - Star icon on default tenant

Behavior:
- Click to open dropdown
- Click tenant to switch
- Loading state while switching
- Smooth transition on switch
- Close on outside click

Design:
- Subtle dropdown that doesn't distract
- Clear current selection
- Role badges: Admin (purple), Member (gray), Creator (green)
```

### Multi-Tenant Welcome Modal

```
/frontend-design

Building Multi-Tenant Welcome Modal (PHASE-2G-CONTEXT-SWITCHING).

Requirements:
- Shows on first login for users with multiple tenants
- Purpose: Help user choose which tenant to start with

Content:
- "Welcome back, [Name]!"
- "You have access to [N] organizations. Which would you like to start with?"
- Grid of tenant cards (2 columns)
- Each card: Logo, Name, Role, "Last active: [date]"
- "Remember my choice" checkbox
- "Continue" button

Behavior:
- Select a tenant card
- Optionally check "Remember my choice"
- Click Continue to proceed

Design:
- Friendly, onboarding-style modal
- Not blocking (can dismiss with X)
- Cards have subtle hover effect
- Selected card has border highlight
```

---

## Switch Flow

```
1. User clicks tenant in switcher
2. POST /api/auth/context/switch { targetTenantSlug }
3. Server validates:
   - User exists
   - User has membership in target tenant
   - Target tenant is active
4. Server issues new JWT with:
   - Same userId
   - New orgId, org, role
   - Same orgs array
   - New iat, exp
5. Server sets new auth-token cookie
6. Server logs tenant switch in activity log
7. Client receives success response
8. Client navigates to target tenant's dashboard
   (or reloads current page with new context)
```

---

## AI Discretion Areas

The implementing agent should determine the best approach for:
1. Whether to invalidate old JWT on switch (security vs convenience)
2. How to handle in-flight requests during switch
3. Whether to support URL-based context (`/admin/[tenant]/...`)
4. How to handle switch when user has unsaved changes
5. Animation/transition during switch

---

## Tasks

### [PARALLEL] Service Layer
- [ ] Implement `switchTenantContext()` with JWT reissue
- [ ] Implement `getUserTenants()` query
- [ ] Implement `setDefaultTenant()` and `getDefaultTenant()`
- [ ] Add tenant switch to activity logging

### [PARALLEL] API Routes
- [ ] Create context endpoint (current user + tenant)
- [ ] Create tenants list endpoint
- [ ] Create switch endpoint with validation
- [ ] Create default tenant endpoint

### [SEQUENTIAL after Service] React Integration
- [ ] Create `TenantProvider` context
- [ ] Implement `useTenant()` hook
- [ ] Handle cookie update on switch
- [ ] Add loading state during switch

### [SEQUENTIAL after React] UI Components
- [ ] Invoke `/frontend-design` for TenantSwitcher
- [ ] Build TenantSwitcher component (dropdown variant)
- [ ] Build TenantSwitcher component (modal variant - for mobile)
- [ ] Build MultiTenantWelcome modal

### [SEQUENTIAL after UI] Integration
- [ ] Add TenantSwitcher to admin header
- [ ] Add TenantSwitcher to creator portal header
- [ ] Add TenantProvider to app layout
- [ ] Handle welcome modal on multi-tenant login

### [SEQUENTIAL after All] Testing
- [ ] Unit tests for switch logic
- [ ] Unit tests for validation
- [ ] Integration tests for full switch flow
- [ ] Tests for default tenant persistence

---

## Interfaces

### TenantContext

```typescript
interface TenantContext {
  id: string
  slug: string
  name: string
  logoUrl: string | null
  role: string
  isDefault: boolean
  lastActiveAt: Date | null
}
```

### SwitchResponse

```typescript
interface SwitchResponse {
  success: boolean
  tenant: TenantContext
  // New token is set via cookie, not returned in body
}
```

---

## Database Updates

```sql
-- Track last active timestamp per membership
ALTER TABLE public.user_memberships
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;

-- Update last_active_at on each request
-- (handled by middleware, not separate query)
```

---

## Middleware Updates

```typescript
// In packages/auth/src/middleware.ts
export async function withTenantMiddleware(req: NextRequest) {
  // ... existing validation ...

  // Update last_active_at for current membership
  // (async, don't block the request)
  updateMembershipActivity(userId, tenantId).catch(console.error)

  return NextResponse.next({ request: { headers } })
}
```

---

## Definition of Done

- [ ] Users can switch tenants via dropdown
- [ ] JWT is reissued with new tenant context
- [ ] Switch validates user access to target tenant
- [ ] Default tenant is remembered and used on login
- [ ] Multi-tenant welcome modal shows for new multi-tenant users
- [ ] Last active timestamp updates per tenant
- [ ] Tenant switch logged in activity log
- [ ] Loading state shown during switch
- [ ] `npx tsc --noEmit` passes
- [ ] Unit and integration tests pass
