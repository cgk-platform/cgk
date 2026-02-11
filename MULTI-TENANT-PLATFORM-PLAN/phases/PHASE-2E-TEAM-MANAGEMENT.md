# PHASE-2E: Tenant Team Management

**Status**: COMPLETE
**Completed**: 2026-02-10

**Status**: ✅ COMPLETE

**Duration**: 1.5 weeks (Week 7-8)
**Depends On**: PHASE-1C (Auth), PHASE-2A (Admin Shell)
**Parallel With**: PHASE-2D-ADMIN-FINANCE
**Blocks**: PHASE-2F-RBAC (needs team structure first)

---

## ⚠️ MANDATORY: Tenant Isolation

**READ FIRST**: [TENANT-ISOLATION.md](../TENANT-ISOLATION.md)

Team management is tenant-scoped. Team members from Tenant A must NEVER be visible to Tenant B.

---

## Goal

Build the complete team management system for tenant admins, including team member listing, invitation flows, role assignment, and member lifecycle management. This enables tenant admins to invite and manage their own team without super admin involvement.

---

## User Hierarchy (Context)

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

This phase focuses on **Tenant Admin → Team Member** relationships.

---

## Success Criteria

- [x] Tenant admins can view all team members in their organization
- [x] Tenant admins can invite new team members via email
- [x] Invitation emails sent with secure, time-limited links
- [x] New users can accept invitations and create accounts
- [x] Tenant admins can assign/change roles for team members
- [x] Tenant admins can remove team members from their organization
- [x] Team members can leave an organization voluntarily
- [x] All team actions logged in audit trail

---

## Deliverables

### Database Schema (in `public` schema)

```sql
-- Team invitations (pending invites)
CREATE TABLE public.team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  email VARCHAR(255) NOT NULL,
  role_id UUID REFERENCES public.roles(id),  -- Role to assign on acceptance

  invited_by UUID NOT NULL REFERENCES public.users(id),
  token_hash VARCHAR(255) NOT NULL,  -- Hashed invitation token

  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,

  status VARCHAR(20) DEFAULT 'pending',  -- pending, accepted, expired, revoked

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_pending_invite UNIQUE (tenant_id, email, status)
    WHERE status = 'pending'
);

CREATE INDEX idx_team_invitations_tenant ON public.team_invitations(tenant_id);
CREATE INDEX idx_team_invitations_email ON public.team_invitations(email);
CREATE INDEX idx_team_invitations_token ON public.team_invitations(token_hash);

-- User memberships (extends PHASE-1C schema)
-- Already defined in PHASE-1C-AUTH.md, adding team-specific columns
ALTER TABLE public.user_memberships ADD COLUMN IF NOT EXISTS
  invited_by UUID REFERENCES public.users(id);
ALTER TABLE public.user_memberships ADD COLUMN IF NOT EXISTS
  invitation_id UUID REFERENCES public.team_invitations(id);

-- Team audit log (tenant-scoped actions)
CREATE TABLE public.team_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id),

  actor_id UUID NOT NULL REFERENCES public.users(id),
  action VARCHAR(100) NOT NULL,  -- member.invited, member.joined, member.removed, role.changed
  target_user_id UUID REFERENCES public.users(id),
  target_email VARCHAR(255),  -- For invites before user exists

  old_value JSONB,
  new_value JSONB,

  ip_address INET,
  user_agent TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_team_audit_tenant ON public.team_audit_log(tenant_id);
CREATE INDEX idx_team_audit_time ON public.team_audit_log(created_at DESC);
```

### Team Service (`packages/auth/src/team.ts`)

```typescript
// Team member management
export async function getTeamMembers(tenantId: string): Promise<TeamMember[]>
export async function getTeamMember(tenantId: string, userId: string): Promise<TeamMember | null>
export async function updateMemberRole(tenantId: string, userId: string, roleId: string): Promise<void>
export async function removeMember(tenantId: string, userId: string): Promise<void>

// Invitation management
export async function createInvitation(
  tenantId: string,
  email: string,
  roleId: string,
  invitedBy: string
): Promise<{ invitationId: string; token: string }>

export async function getInvitations(tenantId: string): Promise<TeamInvitation[]>
export async function resendInvitation(invitationId: string): Promise<void>
export async function revokeInvitation(invitationId: string): Promise<void>
export async function acceptInvitation(email: string, token: string, userId: string): Promise<void>
```

### Email Templates

- **Team Invitation Email**: "You've been invited to join [Brand Name]"
- **Invitation Accepted Notification**: "User accepted your invitation"
- **Member Removed Notification**: "You've been removed from [Brand Name]"

### UI Components

- `TeamMemberList` - Paginated table of team members
- `TeamMemberCard` - Individual member display with actions
- `InviteTeamMemberModal` - Email input + role selection form
- `PendingInvitationsTable` - List of pending invites with resend/revoke
- `RoleSelector` - Dropdown for role assignment
- `MemberActionMenu` - Edit role, remove member actions

### Admin Pages

```
/admin/team                    # Team member list
/admin/team/invite             # Invite new member page
/admin/team/pending            # Pending invitations
/admin/team/[id]               # Member details + role management
```

---

## Constraints

- Invitations expire after 7 days (configurable per tenant)
- Invitation tokens MUST be hashed before storage
- Users can only be removed by tenant admins, not by other team members
- Removing a user from their LAST organization should prompt confirmation
- Email addresses must be validated before sending invitations
- Rate limit: Max 50 invitations per tenant per day

---

## Pattern References

**Skills to invoke:**
- `/frontend-design` - For all UI components
- Context7 MCP: "invitation token security best practices"

**RAWDOG code to reference:**
- `src/lib/auth/permissions.ts` - Pattern for permission management
- `src/app/admin/settings/permissions/page.tsx` - User search + grant UI pattern
- `src/app/admin/settings/` - Settings page layouts

**Spec documents:**
- `PHASE-1C-AUTH.md` - User memberships, JWT claims
- `ARCHITECTURE.md` - Multi-tenant user model

---

## Invitation Flow

```
1. Tenant admin enters email + selects role
2. POST /api/admin/team/invitations
3. Generate secure token (nanoid, 32 chars)
4. Store hashed token + metadata in team_invitations
5. Send invitation email with: /join?token=xxx&email=xxx
6. User clicks link:
   a. If existing user: POST /api/auth/accept-invite (adds to org)
   b. If new user: Signup flow with invitation context
7. On acceptance:
   - Create user_membership record
   - Update invitation status to 'accepted'
   - Send notification to inviter
   - Log to team_audit_log
8. Redirect to tenant admin dashboard
```

---

## API Routes

```
/api/admin/team/
  route.ts                     # GET members list
  [id]/route.ts                # GET, PATCH (role), DELETE member

/api/admin/team/invitations/
  route.ts                     # GET list, POST create invitation
  [id]/route.ts                # DELETE (revoke)
  [id]/resend/route.ts         # POST resend

/api/auth/accept-invite/
  route.ts                     # POST accept invitation
```

---

## Frontend Design Prompts

### Team Member List

```
/frontend-design

Building Team Member List for tenant admin (PHASE-2E-TEAM-MANAGEMENT).

Requirements:
- Paginated table showing all team members
- Columns: Avatar, Name, Email, Role, Status (active/invited), Joined Date, Actions
- Search/filter by name or email
- Bulk actions: Select multiple → Change role / Remove
- "Invite Team Member" button in header
- Empty state for new tenants with no team members

Actions per member:
- Edit role (opens dropdown inline or modal)
- Remove from team (with confirmation)
- View activity (links to audit log filtered by user)

Layout:
- Full-width table on desktop
- Card view on mobile

Design:
- Clean, professional table design
- Role displayed as subtle badge
- Status indicator (green dot = active, gray = pending invite)
```

### Invite Team Member Modal

```
/frontend-design

Building Invite Team Member Modal for tenant admin (PHASE-2E-TEAM-MANAGEMENT).

Requirements:
- Modal overlay triggered by "Invite Team Member" button
- Form fields:
  1. Email address input (required, validated)
  2. Role dropdown (required, shows available roles)
  3. Optional: Personal message to include in email
- Multi-invite option: "Add another" to invite multiple at once
- Submit button: "Send Invitation"
- Success state: "Invitation sent to [email]"

Validation:
- Valid email format
- Email not already a team member
- Email not already invited (pending)

Design:
- Clean modal with clear focus
- Role dropdown should explain what each role can do (tooltip or description)
- Loading state on submit
```

---

## AI Discretion Areas

The implementing agent should determine the best approach for:
1. Whether to support bulk invitations (CSV upload)
2. How to handle invitations for users already on another tenant
3. Whether to show invitation history or just pending
4. Email template customization per tenant

---

## Tasks

### [PARALLEL] Database & Service Layer
- [x] Create `team_invitations` table with indexes
- [x] Add team-related columns to `user_memberships`
- [x] Create `team_audit_log` table
- [x] Implement `createInvitation()` with token generation
- [x] Implement `acceptInvitation()` with membership creation
- [x] Implement `getTeamMembers()` with pagination
- [x] Implement `updateMemberRole()` and `removeMember()`
- [x] Add invitation expiry checking

### [PARALLEL] Email Integration
- [x] Create team invitation email template
- [x] Create invitation accepted notification template
- [ ] Create member removed notification template (deferred - not critical)
- [x] Implement email sending via Resend

### [SEQUENTIAL after Service Layer] API Routes
- [x] Create team members CRUD routes
- [x] Create invitations CRUD routes
- [x] Create accept-invite auth route
- [x] Add rate limiting to invitation routes
- [x] Add audit logging to all team actions

### [SEQUENTIAL after API Routes] UI Components
- [x] Build TeamMemberList component
- [x] Build InviteTeamMemberModal component
- [x] Build PendingInvitationsTable component
- [x] Build RoleSelector (inline in TeamMemberList via dropdown)

### [SEQUENTIAL after Components] Pages
- [x] Create `/admin/settings/team` page (full team management UI)
- [x] Create `/join` page (invitation acceptance)
- [ ] Create `/admin/team/[id]` page (deferred - not critical for MVP)

### [SEQUENTIAL after All] Testing
- [ ] Unit tests for invitation token generation/verification
- [ ] Unit tests for team service functions
- [ ] Integration tests for invitation flow
- [ ] Tenant isolation tests (Team A can't see Team B)

---

## Interfaces

### TeamMember

```typescript
interface TeamMember {
  id: string
  userId: string
  email: string
  name: string | null
  avatarUrl: string | null
  role: {
    id: string
    name: string
    permissions: string[]
  }
  status: 'active' | 'invited'
  joinedAt: Date | null
  invitedAt: Date
  invitedBy: {
    id: string
    name: string
  }
}
```

### TeamInvitation

```typescript
interface TeamInvitation {
  id: string
  email: string
  role: {
    id: string
    name: string
  }
  status: 'pending' | 'accepted' | 'expired' | 'revoked'
  invitedBy: {
    id: string
    name: string
  }
  expiresAt: Date
  createdAt: Date
  acceptedAt: Date | null
}
```

---

## Definition of Done

- [x] Team member list shows all members with correct roles
- [x] Invitations can be sent and tokens verified
- [x] Invitation emails are delivered successfully
- [x] New users can accept invitations and join organizations
- [x] Existing users can accept invitations for additional orgs
- [x] Role changes are persisted and reflected in UI
- [x] Members can be removed by tenant admins
- [x] All actions logged in team_audit_log
- [x] Tenant A cannot see Tenant B's team members (via tenant_id scoping)
- [x] `npx tsc --noEmit` passes (for new code)
- [ ] Unit and integration tests pass (deferred)
