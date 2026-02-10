# Gap Remediation: User Provisioning & Multi-Tenant Access

> **Execution**: 🔴 SEQUENTIAL - Run FIRST (before all other prompts)
> **Priority**: CRITICAL
> **Estimated Phases**: 3-4 focused phase docs
> **IMPORTANT**: This is foundational for all multi-tenant operations

---

## ⚠️ CRITICAL: Read vs Write Locations

| Action | Location | Notes |
|--------|----------|-------|
| **READ FIRST** | `PLAN.md` and `PROMPT.md` in the plan folder | Understand existing architecture |
| **READ** | `/Users/holdenthemic/Documents/rawdog-web/src/` | RAWDOG source - DO NOT MODIFY |
| **WRITE** | `/Users/holdenthemic/Documents/cgk/MULTI-TENANT-PLATFORM-PLAN/` | Plan docs ONLY |

**Before writing, read existing docs to ensure your additions fit the planned architecture.**

**Files to update:**
- `PLAN.md` - Add feature section (must align with existing structure)
- `PROMPT.md` - Add implementation patterns
- `PHASE-XX-*.md` - Create new phase docs

**⛔ DO NOT modify any code files or anything outside MULTI-TENANT-PLATFORM-PLAN folder.**

---

## Your Task

### 1. Explore RAWDOG Permission Patterns

Use the Explore agent or read these source files:
```
/src/lib/auth/permissions.ts     # Current permission service
/src/lib/auth/admin.ts           # Admin authorization
/src/lib/auth/debug.ts           # Debug auth bypass
/src/app/admin/settings/permissions/  # Permission admin UI
/src/app/api/admin/permissions/  # Permission API routes
```

### 2. Update Master Documents

**PLAN.md** - Add comprehensive section for:
- User provisioning architecture
- Multi-tenant access model
- RBAC implementation
- Super admin vs tenant admin

**PROMPT.md** - Add patterns for:
- Permission check middleware
- Tenant context handling
- Role-based route protection

### 3. Create Phase Docs

Create 3-4 phase docs in `/docs/MULTI-TENANT-PLATFORM-PLAN/`:
- `PHASE-XX-SUPER-ADMIN-DASHBOARD.md`
- `PHASE-XX-TENANT-TEAM-MANAGEMENT.md`
- `PHASE-XX-RBAC-IMPLEMENTATION.md`
- `PHASE-XX-MULTI-TENANT-CONTEXT.md`

---

## Context

RAWDOG has minimal user management (single permission type for payouts). For the multi-tenant platform:

- Users may belong to multiple tenants/brands
- Each tenant has its own roles and permissions
- Users need context switching between tenants
- Super admins manage the entire platform
- Tenant admins manage their own organization
- Team members have role-based access within tenants

---

## User Provisioning Architecture - WHAT We Need

### 1. User Hierarchy

```
Super Admin (Platform Owner)
    └── Tenant (Brand/Organization)
            ├── Tenant Admin (full tenant access)
            ├── Team Member (role-based access)
            └── External Users
                    ├── Creators (creator portal)
                    ├── Contractors (contractor portal)
                    └── Vendors (vendor portal)
```

---

### 2. Super Admin Capabilities

**Super Admin Dashboard** (`/super-admin`)

**Outcomes:**
- Manage all tenants on the platform
- Create/suspend/delete tenants
- View platform-wide analytics
- Access ops dashboard (logs, errors, health)
- Impersonate tenant admins for support
- Manage platform settings

**Super Admin Only Pages:**
- `/super-admin/tenants` - Tenant list and management
- `/super-admin/tenants/[id]` - Individual tenant details
- `/super-admin/users` - All users across tenants
- `/super-admin/analytics` - Platform analytics
- `/super-admin/ops` - Operations dashboard (from prompt 29)
- `/super-admin/settings` - Platform configuration

---

### 3. Tenant Admin Capabilities

**Tenant Admin Dashboard** (`/admin`)

**Outcomes:**
- Full access to their tenant's admin panel
- Invite and manage team members
- Assign roles to team members
- Configure tenant settings
- Cannot see other tenants' data
- Cannot access super admin pages

**Tenant Management Pages:**
- `/admin/team` - Team member list
- `/admin/team/invite` - Invite new members
- `/admin/team/[id]` - Member details and role assignment
- `/admin/team/roles` - View/create custom roles
- `/admin/settings/permissions` - Permission configuration

---

### 4. Role-Based Access Control (RBAC)

**Outcomes:**
- Predefined roles with sensible defaults
- Custom role creation per tenant
- Granular permissions per role
- Role inheritance (child roles inherit from parent)

**Predefined Roles:**

| Role | Description | Access Level |
|------|-------------|--------------|
| **Tenant Admin** | Full tenant access | All permissions |
| **Manager** | Manage operations | Most permissions, no billing |
| **Finance** | Financial operations | Payouts, treasury, reports |
| **Creator Manager** | Creator operations | Creators, projects, contracts |
| **Content Manager** | Content operations | Reviews, content, SEO |
| **Support** | Customer support | View-only + support tools |
| **Viewer** | Read-only access | View dashboards, no edits |

**Permission Categories:**

```
PERMISSIONS:
├── TENANT
│   ├── tenant.settings.view
│   ├── tenant.settings.edit
│   ├── tenant.billing.view
│   └── tenant.billing.manage
├── TEAM
│   ├── team.view
│   ├── team.invite
│   ├── team.manage
│   └── team.roles.manage
├── CREATORS
│   ├── creators.view
│   ├── creators.manage
│   ├── creators.contracts.sign
│   └── creators.payments.approve
├── COMMERCE
│   ├── orders.view
│   ├── orders.manage
│   ├── subscriptions.view
│   ├── subscriptions.manage
│   ├── reviews.view
│   └── reviews.manage
├── FINANCE
│   ├── payouts.view
│   ├── payouts.process
│   ├── treasury.view
│   ├── treasury.approve
│   ├── expenses.view
│   └── expenses.manage
├── CONTENT
│   ├── content.view
│   ├── content.edit
│   ├── dam.view
│   └── dam.manage
├── INTEGRATIONS
│   ├── integrations.view
│   └── integrations.manage
└── ANALYTICS
    ├── analytics.view
    ├── attribution.view
    └── reports.export
```

---

### 5. Multi-Tenant User Access

**Users Belonging to Multiple Tenants**

**Outcomes:**
- Single login, multiple tenant access
- Tenant context switcher in UI
- Different roles per tenant
- Separate permissions per tenant
- Session maintains current tenant context
- API routes respect tenant context

**Tenant Switcher UI:**
- Dropdown in header showing current tenant
- List of accessible tenants with logos/names
- Quick switch without re-authentication
- Visual indicator of current tenant context
- Last-used tenant remembered

**Context Switching:**
- URL-based context: `/admin/[tenant-slug]/...` or subdomain
- Session stores current tenant ID
- API requests include tenant context header
- Database queries scoped to current tenant
- Audit logs track tenant context

---

### 6. Team Member Invitation Flow

**Invite New Team Member** (`/admin/team/invite`)

**Outcomes:**
- Enter email address(es)
- Select role(s) to assign
- Optional: Add to specific teams/groups
- Invitation email sent with secure link
- Pending invites visible in team list
- Resend/revoke invite options

**Invite States:**
- Pending (sent, not accepted)
- Accepted (account created)
- Expired (link timeout)
- Revoked (cancelled by admin)

**Acceptance Flow:**
1. Recipient clicks invite link
2. Creates account or links existing account
3. Automatically added to tenant with assigned role
4. Redirected to tenant dashboard

---

### 7. User Profile & Settings

**User Profile** (`/settings/profile`)

**Outcomes:**
- Personal information (name, email, avatar)
- Security settings (password, 2FA)
- Notification preferences
- Connected accounts (OAuth providers)
- Active sessions list

**Multi-Tenant User Settings:**
- View all tenants user belongs to
- Per-tenant notification preferences
- Leave tenant option (with confirmation)
- Default tenant selection

---

### 8. Audit & Activity Logging

**Outcomes:**
- All permission changes logged
- User actions tracked with tenant context
- Login/logout events recorded
- Failed access attempts logged
- Export audit logs

**Audit Log Entry:**
- Timestamp
- User ID and email
- Tenant context
- Action type
- Resource affected
- Old/new values
- IP address
- User agent

---

### 9. Session & Authentication

**Session Management:**
- JWT or session-based auth
- Tenant context in session/token
- Token refresh without re-login
- Concurrent sessions allowed
- Session timeout configurable per tenant

**Authentication Options:**
- Email/password
- Magic link
- OAuth providers (Google, Microsoft, etc.)
- SSO/SAML for enterprise tenants (future)

---

## Admin Pages - WHAT Gets Built

### Super Admin Pages
```
/super-admin
├── /tenants                       # All tenants list
├── /tenants/new                   # Create tenant
├── /tenants/[id]                  # Tenant details
├── /tenants/[id]/settings         # Tenant config
├── /tenants/[id]/team             # Tenant's team
├── /users                         # All platform users
├── /users/[id]                    # User details (all tenants)
├── /analytics                     # Platform analytics
├── /ops                           # Operations (from prompt 29)
└── /settings                      # Platform settings
```

### Tenant Admin Pages
```
/admin
├── /team                          # Team member list
├── /team/invite                   # Invite new member
├── /team/[id]                     # Member details
├── /team/roles                    # Role management
├── /team/roles/new                # Create custom role
├── /team/roles/[id]               # Edit role
├── /settings/permissions          # Permission matrix view
└── /settings/security             # Security settings
```

---

## Database Architecture - WHAT Gets Stored

**Users Table:**
- user_id (primary)
- email (unique)
- name, avatar_url
- auth_provider
- created_at, last_login_at
- is_super_admin (boolean)

**Tenants Table:**
- tenant_id (primary)
- slug (unique)
- name, logo_url
- status (active, suspended, deleted)
- settings (JSON)
- created_at

**Tenant Memberships Table:**
- membership_id (primary)
- user_id (FK to users)
- tenant_id (FK to tenants)
- role_id (FK to roles)
- invited_by, invited_at
- accepted_at
- status (pending, active, suspended, removed)

**Roles Table:**
- role_id (primary)
- tenant_id (FK, null for predefined)
- name, description
- permissions (JSON array)
- is_predefined (boolean)
- parent_role_id (for inheritance)

**Invitations Table:**
- invite_id (primary)
- tenant_id (FK)
- email
- role_id (FK)
- invited_by (FK to users)
- token (secure random)
- expires_at
- accepted_at
- status

**Audit Logs Table:**
- log_id (primary)
- user_id (FK)
- tenant_id (FK, nullable for super admin actions)
- action
- resource_type, resource_id
- old_values, new_values (JSON)
- ip_address, user_agent
- created_at

---

## API Architecture - WHAT Gets Built

### Super Admin APIs
```
/api/super-admin/tenants
├── GET /                          # List all tenants
├── POST /                         # Create tenant
├── GET /[id]                      # Get tenant details
├── PATCH /[id]                    # Update tenant
├── DELETE /[id]                   # Delete tenant
└── POST /[id]/impersonate         # Impersonate tenant admin

/api/super-admin/users
├── GET /                          # List all users
├── GET /[id]                      # User details
└── GET /[id]/tenants              # User's tenants
```

### Tenant Admin APIs
```
/api/admin/team
├── GET /                          # List team members
├── GET /[id]                      # Member details
├── PATCH /[id]                    # Update member
└── DELETE /[id]                   # Remove member

/api/admin/team/invites
├── GET /                          # List pending invites
├── POST /                         # Send invite
├── DELETE /[id]                   # Revoke invite
└── POST /[id]/resend              # Resend invite

/api/admin/team/roles
├── GET /                          # List roles
├── POST /                         # Create role
├── GET /[id]                      # Role details
├── PATCH /[id]                    # Update role
└── DELETE /[id]                   # Delete role
```

### Context APIs
```
/api/auth/context
├── GET /                          # Current user & tenant context
├── POST /switch                   # Switch tenant context
└── GET /tenants                   # User's accessible tenants
```

---

## Local Development & Testing

### Debug Auth Bypass (Existing Pattern)

The platform supports localhost debugging with auth bypass:

**Environment Variables:**
```bash
DEBUG_BYPASS_AUTH=true
NEXT_PUBLIC_DEBUG_MODE=true
```

**How It Works:**
- Middleware bypasses auth on localhost
- API routes return mock user ID: `debug_local_user_bypass`
- Visual "D" badge shows debug mode active

**For Multi-Tenant:**
- Debug mode includes default test tenant context
- Mock user has super admin access in debug mode
- Can switch tenant context for testing

### Test Tenant

**Outcomes:**
- Platform ships with a "Test Brand" tenant
- Used for AI agent testing and development
- Pre-configured with sample data
- Reset endpoint to restore initial state

**Test Tenant Details:**
```
Tenant ID: test_tenant_default
Tenant Slug: test-brand
Tenant Name: Test Brand
```

**Test Users:**
```
Super Admin:
  ID: debug_super_admin
  Email: super@test.local

Tenant Admin:
  ID: debug_tenant_admin
  Email: admin@test-brand.local

Team Member:
  ID: debug_team_member
  Email: member@test-brand.local
```

---

## Integration Points

- **Prompt 29 (Operations)**: Super admin ops dashboard
- **Prompt 35 (Communications)**: Tenant-scoped email configuration
- **Prompt 36 (Customer Portal)**: Tenant-scoped portal theming
- **All Admin Prompts**: Respect tenant context and permissions

---

## Non-Negotiable Requirements

**User Management:**
- Super admin can manage all tenants
- Tenant admins can manage their team
- Users can belong to multiple tenants
- Role-based access control

**Multi-Tenant:**
- Tenant context switcher in UI
- All data scoped to current tenant
- API routes respect tenant context
- No cross-tenant data leakage

**Permissions:**
- Predefined roles available
- Custom role creation
- Granular permission system
- Permission inheritance

**Audit:**
- All permission changes logged
- User actions tracked
- Tenant context in logs

**Testing:**
- Debug auth bypass on localhost
- Test tenant for development
- Mock users for testing

---

## Definition of Done

- [ ] Super admin dashboard works
- [ ] Tenant admin can invite team members
- [ ] Role-based access control enforced
- [ ] Users can belong to multiple tenants
- [ ] Tenant switcher works correctly
- [ ] All API routes respect tenant context
- [ ] Predefined roles available
- [ ] Custom roles can be created
- [ ] Permission checks work throughout app
- [ ] Audit logs capture all changes
- [ ] Debug auth bypass works on localhost
- [ ] Test tenant exists with sample data
- [ ] No cross-tenant data leakage

---

## Output Checklist

- [ ] PLAN.md updated with user provisioning section
- [ ] Phase doc for super admin capabilities
- [ ] Phase doc for tenant admin and team management
- [ ] Phase doc for RBAC implementation
- [ ] Phase doc for multi-tenant context switching
- [ ] PROMPT.md updated with permission patterns
- [ ] CLAUDE.md updated with testing patterns
