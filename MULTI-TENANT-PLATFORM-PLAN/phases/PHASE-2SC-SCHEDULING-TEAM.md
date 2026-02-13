# PHASE-2SC-TEAM: Scheduling & Booking - Team Features

> **STATUS**: ✅ COMPLETE (2026-02-13)

**Status**: COMPLETE
**Completed**: 2026-02-10

> **Phase**: 2SC-TEAM (Scheduling Team Features)
> **Duration**: 1 week
> **Dependencies**: PHASE-2SC-SCHEDULING-CORE
> **Can Parallel With**: PHASE-2PO-* (Platform Ops)
> **Last Updated**: 2025-02-10

---

## Goal

Extend the core scheduling system with team-based features including round-robin scheduling, collective availability, and team booking analytics. Teams allow multiple hosts to share availability and automatically assign meetings fairly.

---

## Success Criteria

- [ ] Tenant admins can create scheduling teams with multiple members
- [ ] Team event types support round-robin host assignment
- [ ] Round-robin distributes bookings fairly across team members
- [ ] Collective scheduling requires all team members available
- [ ] Team booking analytics show distribution across members
- [ ] Public booking pages work for team events

---

## Deliverables

### 1. Additional Database Schema

```sql
-- Scheduling teams
CREATE TABLE scheduling_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  slug TEXT NOT NULL, -- URL-friendly (unique per tenant)
  description TEXT,

  -- Settings (JSONB: {roundRobin: true, showMemberProfiles: true})
  settings JSONB NOT NULL DEFAULT '{"roundRobin": true, "showMemberProfiles": true}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(tenant_id, slug)
);

-- Team members (many-to-many)
CREATE TABLE scheduling_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES scheduling_teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES scheduling_users(id) ON DELETE CASCADE,
  is_admin BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(team_id, user_id)
);

-- Team event types (shared event types for teams)
CREATE TABLE scheduling_team_event_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES scheduling_teams(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  duration INTEGER NOT NULL,
  color TEXT NOT NULL DEFAULT 'blue',
  location JSONB NOT NULL DEFAULT '{"type": "google_meet"}',
  custom_questions JSONB NOT NULL DEFAULT '[]',
  reminder_settings JSONB NOT NULL DEFAULT '{"enabled": true, "reminders": [{"timing": "24h", "sendToHost": true, "sendToInvitee": true}]}',

  -- Scheduling type: 'round_robin' | 'collective' | 'individual'
  scheduling_type TEXT NOT NULL DEFAULT 'round_robin',

  -- Host user IDs for this event type (subset of team members)
  host_user_ids UUID[] NOT NULL,

  is_active BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(tenant_id, team_id, slug)
);

-- Round-robin counter (tracks next host index)
CREATE TABLE scheduling_round_robin_counters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  team_event_type_id UUID NOT NULL REFERENCES scheduling_team_event_types(id) ON DELETE CASCADE,

  current_index INTEGER NOT NULL DEFAULT 0,

  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(team_event_type_id)
);

-- Team bookings link to team event type
ALTER TABLE scheduling_bookings
ADD COLUMN team_event_type_id UUID REFERENCES scheduling_team_event_types(id);

-- Indexes
CREATE INDEX idx_scheduling_teams_tenant ON scheduling_teams(tenant_id);
CREATE INDEX idx_scheduling_team_members_team ON scheduling_team_members(team_id);
CREATE INDEX idx_scheduling_team_members_user ON scheduling_team_members(user_id);
CREATE INDEX idx_scheduling_team_event_types_team ON scheduling_team_event_types(team_id);
CREATE INDEX idx_scheduling_bookings_team_event ON scheduling_bookings(team_event_type_id);
```

### 2. API Routes

```
/api/admin/scheduling/teams/
├── route.ts                        # GET list, POST create team
├── [id]/
│   ├── route.ts                    # GET, PUT, DELETE team
│   ├── members/route.ts            # GET, POST, DELETE members
│   └── event-types/
│       ├── route.ts                # GET list, POST create
│       └── [eventId]/route.ts      # GET, PUT, DELETE

/api/public/scheduling/
├── [tenantSlug]/
│   └── teams/
│       └── [teamSlug]/
│           ├── route.ts            # GET team profile
│           └── [eventSlug]/
│               ├── route.ts        # GET event type
│               ├── slots/route.ts  # GET available slots (aggregated)
│               └── book/route.ts   # POST create team booking
```

**Route Count**: 10+ additional routes

### 3. Admin UI Pages

```
/admin/scheduling/teams/
├── page.tsx                        # Teams list
├── new/page.tsx                    # Create team
└── [id]/
    ├── page.tsx                    # Team overview
    ├── members/page.tsx            # Manage team members
    └── event-types/
        ├── page.tsx                # Team event types
        ├── new/page.tsx            # Create team event type
        └── [eventId]/page.tsx      # Edit team event type
```

### 4. Public Booking Pages

```
/book/[tenantSlug]/team/[teamSlug]/
├── page.tsx                        # Team landing (show members if configured)
└── [eventSlug]/
    └── page.tsx                    # Team booking flow
```

---

## Scheduling Types

### 1. Round-Robin
**Default mode**. Automatically assigns next available host in rotation.

```typescript
interface RoundRobinConfig {
  type: 'round_robin'
  // Uses round_robin_counters table to track next host
}

async function getNextRoundRobinHost(
  tenantId: string,
  teamEventTypeId: string
): Promise<string> {
  return await withTenant(tenantId, async () => {
    // Get current index
    const counter = await sql`
      SELECT current_index FROM scheduling_round_robin_counters
      WHERE team_event_type_id = ${teamEventTypeId}
      FOR UPDATE  -- Lock to prevent race conditions
    `

    // Get event type with hosts
    const eventType = await sql`
      SELECT host_user_ids FROM scheduling_team_event_types
      WHERE id = ${teamEventTypeId}
    `

    const hostIds = eventType.rows[0].host_user_ids
    const currentIndex = counter.rows[0]?.current_index || 0

    // Find next available host starting from current index
    for (let i = 0; i < hostIds.length; i++) {
      const hostIndex = (currentIndex + i) % hostIds.length
      const hostId = hostIds[hostIndex]

      // Check if host is available
      if (await isHostAvailable(tenantId, hostId, startTime, duration)) {
        // Update counter for next booking
        await sql`
          UPDATE scheduling_round_robin_counters
          SET current_index = ${(hostIndex + 1) % hostIds.length}
          WHERE team_event_type_id = ${teamEventTypeId}
        `
        return hostId
      }
    }

    // No hosts available
    throw new Error('No team members available for this time slot')
  })
}
```

### 2. Collective
**All hosts required**. Only shows slots where ALL team members are available.

```typescript
interface CollectiveConfig {
  type: 'collective'
  // Intersection of all host availabilities
}

async function getCollectiveSlots(
  tenantId: string,
  teamEventTypeId: string,
  date: string,
  timezone: string
): Promise<AvailableSlot[]> {
  const eventType = await getTeamEventType(tenantId, teamEventTypeId)
  const hostIds = eventType.hostUserIds

  // Get slots for each host
  const slotsByHost = await Promise.all(
    hostIds.map(hostId =>
      getUserAvailableSlots(tenantId, hostId, eventType.duration, date, timezone)
    )
  )

  // Find intersection (slots where ALL hosts are free)
  return intersectSlots(slotsByHost)
}
```

### 3. Individual
**Host selection**. Invitee picks which team member to book with.

```typescript
interface IndividualConfig {
  type: 'individual'
  showMemberProfiles: boolean
}

// Public page shows team members with their profiles
// Invitee selects a member, then books as normal individual booking
```

---

## Implementation Tasks

### [PARALLEL] Teams CRUD
- [ ] Create team (name, slug, description)
- [ ] Update team settings
- [ ] Delete team (cascade bookings?)
- [ ] Team list with member counts

### [PARALLEL] Team Members Management
- [ ] Add members to team
- [ ] Remove members from team
- [ ] Assign team admins
- [ ] Member availability aggregation

### [SEQUENTIAL after Teams] Team Event Types
- [ ] Create team event type with host selection
- [ ] Scheduling type selection (round-robin, collective, individual)
- [ ] Custom questions and reminder settings
- [ ] Active/inactive toggle

### [SEQUENTIAL after Event Types] Round-Robin Logic
- [ ] Round-robin counter initialization
- [ ] Next host selection with availability check
- [ ] Counter update on booking
- [ ] Skip unavailable hosts gracefully

### [SEQUENTIAL after Round-Robin] Collective Availability
- [ ] Slot intersection algorithm
- [ ] Performance optimization (cache aggregated availability)
- [ ] Handle edge cases (no common slots)

### [PARALLEL] Team Booking Flow (Public)
- [ ] Team landing page (show members if configured)
- [ ] Team event type selection
- [ ] Slot picker (aggregated or individual based on type)
- [ ] Booking creation with auto-assigned host
- [ ] Confirmation with assigned host details

### [PARALLEL] Team Analytics
- [ ] Bookings per team member (fairness tracking)
- [ ] Team vs individual booking counts
- [ ] Average response time per member
- [ ] No-show rates by member

### [PARALLEL] Admin UI
- [ ] Team management pages
- [ ] Member management with drag-reorder
- [ ] Team event type form
- [ ] Team analytics dashboard

---

## Pattern References

### RAWDOG Implementation
```
/Users/holdenthemic/Documents/rawdog-web/src/lib/scheduling/redis/teams.ts
  - createTeam(), updateTeam(), deleteTeam()
  - addTeamMember(), removeTeamMember()
  - getNextRoundRobinHost()
  - getTeamBookingAnalytics()

/Users/holdenthemic/Documents/rawdog-web/src/app/admin/scheduling/teams/
  - TeamManagement.tsx
  - TeamDetailManager.tsx

/Users/holdenthemic/Documents/rawdog-web/src/app/book/team/
  - TeamBookingFlow.tsx
```

### Tenant Isolation (Teams)
```typescript
// Always scope team queries to tenant
export async function getTeams(tenantId: string): Promise<Team[]> {
  return await withTenant(tenantId, async () => {
    return sql`
      SELECT t.*,
        (SELECT COUNT(*) FROM scheduling_team_members WHERE team_id = t.id) as member_count,
        (SELECT COUNT(*) FROM scheduling_team_event_types WHERE team_id = t.id) as event_type_count
      FROM scheduling_teams t
      WHERE t.tenant_id = ${tenantId}
      ORDER BY t.name ASC
    `
  })
}
```

### Round-Robin Fairness
```typescript
// Track distribution for analytics
interface TeamMemberStats {
  userId: string
  userName: string
  bookingsCount: number
  percentageOfTeam: number
  lastBookingAt: string | null
}

async function getTeamDistribution(
  tenantId: string,
  teamId: string,
  period: '7d' | '30d' | '90d'
): Promise<TeamMemberStats[]> {
  return await withTenant(tenantId, async () => {
    return sql`
      SELECT
        su.id as user_id,
        su.display_name as user_name,
        COUNT(sb.id) as bookings_count,
        MAX(sb.created_at) as last_booking_at
      FROM scheduling_team_members stm
      JOIN scheduling_users su ON stm.user_id = su.id
      LEFT JOIN scheduling_bookings sb ON sb.host_user_id = su.id
        AND sb.team_event_type_id IN (
          SELECT id FROM scheduling_team_event_types WHERE team_id = ${teamId}
        )
        AND sb.created_at > NOW() - ${period}::interval
      WHERE stm.team_id = ${teamId}
      GROUP BY su.id, su.display_name
      ORDER BY bookings_count DESC
    `
  })
}
```

---

## UI Components

### Admin Components
| Component | Purpose |
|-----------|---------|
| `TeamCard` | Team display with member avatars |
| `TeamForm` | Create/edit team form |
| `TeamMemberList` | Manage team members with roles |
| `TeamMemberPicker` | Add members to team |
| `TeamEventTypeForm` | Team event type with scheduling type |
| `SchedulingTypeSelector` | Round-robin/collective/individual picker |
| `TeamDistributionChart` | Fairness visualization |

### Public Booking Components
| Component | Purpose |
|-----------|---------|
| `TeamMemberCards` | Grid of team members (for individual type) |
| `TeamBookingFlow` | Team-specific booking flow |
| `AssignedHostDisplay` | Show which host was assigned |

---

## Edge Cases

1. **All hosts unavailable**: Show "no available times" message
2. **Host removed from team**: Don't cancel existing bookings
3. **Team deleted**: Archive bookings, prevent new bookings
4. **Round-robin with 1 host**: Works like individual booking
5. **Collective with 10+ hosts**: Performance optimization needed
6. **Host leaves mid-booking**: Lock acquired by another request

---

## Testing Checklist

- [ ] Team CRUD operations
- [ ] Member add/remove with constraints
- [ ] Round-robin distributes fairly over 10+ bookings
- [ ] Round-robin skips unavailable hosts
- [ ] Collective shows only intersection slots
- [ ] Individual type shows member selection
- [ ] Team booking creates with correct host
- [ ] Team analytics aggregate correctly
- [ ] Public team booking flow end-to-end
- [ ] Tenant isolation for all team operations

---

## Integration Points

### With PHASE-2SC-SCHEDULING-CORE
- Uses same booking table (with team_event_type_id)
- Shares slot calculation logic
- Shares notification system

### With PHASE-2CM (Communications)
- Team booking notifications include assigned host
- Team member notifications for new bookings

### With PHASE-2F (RBAC)
- Team admin role for team management
- Permissions: `scheduling.teams.view`, `scheduling.teams.manage`

---

## Agent Checklist

- [ ] Read RAWDOG teams implementation (`src/lib/scheduling/redis/teams.ts`)
- [ ] Create database migration for team tables
- [ ] Implement round-robin algorithm
- [ ] Implement collective availability
- [ ] Build admin team management UI
- [ ] Build public team booking pages
- [ ] Add team analytics
- [ ] Write tests for fairness distribution
- [ ] `npx tsc --noEmit` passes
