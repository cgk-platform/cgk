/**
 * Team scheduling database operations
 *
 * @ai-pattern tenant-isolation
 * @ai-required Always use withTenant() wrapper for all operations
 */

import { sql, withTenant } from '@cgk/db'

import type {
  AddTeamMemberInput,
  CreateTeamBookingInput,
  CreateTeamEventTypeInput,
  CreateTeamInput,
  RoundRobinCounter,
  SchedulingTeam,
  SchedulingTeamMember,
  TeamBooking,
  TeamEventType,
  TeamMemberStats,
  TeamMemberWithDetails,
  TeamSettings,
  TeamWithCounts,
  UpdateTeamEventTypeInput,
  UpdateTeamInput,
} from './types.js'
import type { LocationConfig, SchedulingUser } from '../types.js'

const DEFAULT_TEAM_SETTINGS: TeamSettings = {
  roundRobin: true,
  showMemberProfiles: true,
}

const DEFAULT_REMINDER_SETTINGS = {
  enabled: true,
  reminders: [{ timing: '24h' as const, sendToHost: true, sendToInvitee: true }],
}

// ============================================================================
// Teams CRUD
// ============================================================================

/**
 * Get all teams for a tenant
 */
export async function getTeams(tenantId: string): Promise<TeamWithCounts[]> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT
        t.id, t.tenant_id as "tenantId", t.name, t.slug, t.description,
        t.settings, t.created_at as "createdAt", t.updated_at as "updatedAt",
        (SELECT COUNT(*) FROM scheduling_team_members WHERE team_id = t.id) as "memberCount",
        (SELECT COUNT(*) FROM scheduling_team_event_types WHERE team_id = t.id) as "eventTypeCount"
      FROM scheduling_teams t
      WHERE t.tenant_id = ${tenantId}
      ORDER BY t.name ASC
    `
    return result.rows.map((row) => ({
      ...row,
      memberCount: Number(row.memberCount),
      eventTypeCount: Number(row.eventTypeCount),
    })) as TeamWithCounts[]
  })
}

/**
 * Get a single team by ID
 */
export async function getTeam(tenantId: string, teamId: string): Promise<SchedulingTeam | null> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT
        id, tenant_id as "tenantId", name, slug, description,
        settings, created_at as "createdAt", updated_at as "updatedAt"
      FROM scheduling_teams
      WHERE id = ${teamId} AND tenant_id = ${tenantId}
    `
    return (result.rows[0] as SchedulingTeam) || null
  })
}

/**
 * Get a team by slug
 */
export async function getTeamBySlug(
  tenantId: string,
  slug: string
): Promise<SchedulingTeam | null> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT
        id, tenant_id as "tenantId", name, slug, description,
        settings, created_at as "createdAt", updated_at as "updatedAt"
      FROM scheduling_teams
      WHERE slug = ${slug} AND tenant_id = ${tenantId}
    `
    return (result.rows[0] as SchedulingTeam) || null
  })
}

/**
 * Create a new team
 */
export async function createTeam(tenantId: string, input: CreateTeamInput): Promise<SchedulingTeam> {
  return withTenant(tenantId, async () => {
    const settings = { ...DEFAULT_TEAM_SETTINGS, ...input.settings }

    const result = await sql`
      INSERT INTO scheduling_teams (tenant_id, name, slug, description, settings)
      VALUES (
        ${tenantId}, ${input.name}, ${input.slug},
        ${input.description || null}, ${JSON.stringify(settings)}::jsonb
      )
      RETURNING
        id, tenant_id as "tenantId", name, slug, description,
        settings, created_at as "createdAt", updated_at as "updatedAt"
    `

    return result.rows[0] as SchedulingTeam
  })
}

/**
 * Update a team
 */
export async function updateTeam(
  tenantId: string,
  teamId: string,
  input: UpdateTeamInput
): Promise<SchedulingTeam | null> {
  return withTenant(tenantId, async () => {
    const existing = await getTeam(tenantId, teamId)
    if (!existing) return null

    const newSettings = input.settings
      ? { ...existing.settings, ...input.settings }
      : existing.settings

    const result = await sql`
      UPDATE scheduling_teams SET
        name = COALESCE(${input.name}, name),
        slug = COALESCE(${input.slug}, slug),
        description = COALESCE(${input.description}, description),
        settings = ${JSON.stringify(newSettings)}::jsonb,
        updated_at = NOW()
      WHERE id = ${teamId} AND tenant_id = ${tenantId}
      RETURNING
        id, tenant_id as "tenantId", name, slug, description,
        settings, created_at as "createdAt", updated_at as "updatedAt"
    `

    return (result.rows[0] as SchedulingTeam) || null
  })
}

/**
 * Delete a team
 */
export async function deleteTeam(tenantId: string, teamId: string): Promise<boolean> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      DELETE FROM scheduling_teams
      WHERE id = ${teamId} AND tenant_id = ${tenantId}
    `
    return (result.rowCount ?? 0) > 0
  })
}

// ============================================================================
// Team Members
// ============================================================================

/**
 * Get team members with user details
 */
export async function getTeamMembers(
  tenantId: string,
  teamId: string
): Promise<TeamMemberWithDetails[]> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT
        tm.id, tm.tenant_id as "tenantId", tm.team_id as "teamId",
        tm.user_id as "userId", tm.is_admin as "isAdmin", tm.created_at as "createdAt",
        su.display_name as "displayName", su.email, su.avatar_url as "avatarUrl",
        su.timezone, su.username
      FROM scheduling_team_members tm
      JOIN scheduling_users su ON tm.user_id = su.id
      WHERE tm.team_id = ${teamId} AND tm.tenant_id = ${tenantId}
      ORDER BY tm.is_admin DESC, su.display_name ASC
    `
    return result.rows as TeamMemberWithDetails[]
  })
}

/**
 * Get a single team member
 */
export async function getTeamMember(
  tenantId: string,
  teamId: string,
  userId: string
): Promise<SchedulingTeamMember | null> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT
        id, tenant_id as "tenantId", team_id as "teamId",
        user_id as "userId", is_admin as "isAdmin", created_at as "createdAt"
      FROM scheduling_team_members
      WHERE team_id = ${teamId} AND user_id = ${userId} AND tenant_id = ${tenantId}
    `
    return (result.rows[0] as SchedulingTeamMember) || null
  })
}

/**
 * Add a member to a team
 */
export async function addTeamMember(
  tenantId: string,
  input: AddTeamMemberInput
): Promise<SchedulingTeamMember> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      INSERT INTO scheduling_team_members (tenant_id, team_id, user_id, is_admin)
      VALUES (${tenantId}, ${input.teamId}, ${input.userId}, ${input.isAdmin || false})
      ON CONFLICT (team_id, user_id) DO UPDATE SET
        is_admin = COALESCE(${input.isAdmin}, scheduling_team_members.is_admin)
      RETURNING
        id, tenant_id as "tenantId", team_id as "teamId",
        user_id as "userId", is_admin as "isAdmin", created_at as "createdAt"
    `
    return result.rows[0] as SchedulingTeamMember
  })
}

/**
 * Remove a member from a team
 */
export async function removeTeamMember(
  tenantId: string,
  teamId: string,
  userId: string
): Promise<boolean> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      DELETE FROM scheduling_team_members
      WHERE team_id = ${teamId} AND user_id = ${userId} AND tenant_id = ${tenantId}
    `
    return (result.rowCount ?? 0) > 0
  })
}

/**
 * Update member admin status
 */
export async function updateTeamMemberAdmin(
  tenantId: string,
  teamId: string,
  userId: string,
  isAdmin: boolean
): Promise<SchedulingTeamMember | null> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      UPDATE scheduling_team_members SET
        is_admin = ${isAdmin}
      WHERE team_id = ${teamId} AND user_id = ${userId} AND tenant_id = ${tenantId}
      RETURNING
        id, tenant_id as "tenantId", team_id as "teamId",
        user_id as "userId", is_admin as "isAdmin", created_at as "createdAt"
    `
    return (result.rows[0] as SchedulingTeamMember) || null
  })
}

/**
 * Get teams a user is a member of
 */
export async function getTeamsForUser(
  tenantId: string,
  userId: string
): Promise<TeamWithCounts[]> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT
        t.id, t.tenant_id as "tenantId", t.name, t.slug, t.description,
        t.settings, t.created_at as "createdAt", t.updated_at as "updatedAt",
        (SELECT COUNT(*) FROM scheduling_team_members WHERE team_id = t.id) as "memberCount",
        (SELECT COUNT(*) FROM scheduling_team_event_types WHERE team_id = t.id) as "eventTypeCount"
      FROM scheduling_teams t
      JOIN scheduling_team_members tm ON tm.team_id = t.id
      WHERE tm.user_id = ${userId} AND t.tenant_id = ${tenantId}
      ORDER BY t.name ASC
    `
    return result.rows.map((row) => ({
      ...row,
      memberCount: Number(row.memberCount),
      eventTypeCount: Number(row.eventTypeCount),
    })) as TeamWithCounts[]
  })
}

// ============================================================================
// Team Event Types
// ============================================================================

/**
 * Get team event types
 */
export async function getTeamEventTypes(
  tenantId: string,
  teamId: string,
  includeInactive = false
): Promise<TeamEventType[]> {
  return withTenant(tenantId, async () => {
    const result = includeInactive
      ? await sql`
          SELECT
            id, tenant_id as "tenantId", team_id as "teamId",
            name, slug, description, duration, color, location,
            custom_questions as "customQuestions",
            reminder_settings as "reminderSettings",
            scheduling_type as "schedulingType",
            host_user_ids as "hostUserIds",
            is_active as "isActive",
            created_at as "createdAt", updated_at as "updatedAt"
          FROM scheduling_team_event_types
          WHERE team_id = ${teamId} AND tenant_id = ${tenantId}
          ORDER BY created_at DESC
        `
      : await sql`
          SELECT
            id, tenant_id as "tenantId", team_id as "teamId",
            name, slug, description, duration, color, location,
            custom_questions as "customQuestions",
            reminder_settings as "reminderSettings",
            scheduling_type as "schedulingType",
            host_user_ids as "hostUserIds",
            is_active as "isActive",
            created_at as "createdAt", updated_at as "updatedAt"
          FROM scheduling_team_event_types
          WHERE team_id = ${teamId} AND tenant_id = ${tenantId} AND is_active = true
          ORDER BY created_at DESC
        `
    return result.rows as TeamEventType[]
  })
}

/**
 * Get a team event type by ID
 */
export async function getTeamEventType(
  tenantId: string,
  eventTypeId: string
): Promise<TeamEventType | null> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT
        id, tenant_id as "tenantId", team_id as "teamId",
        name, slug, description, duration, color, location,
        custom_questions as "customQuestions",
        reminder_settings as "reminderSettings",
        scheduling_type as "schedulingType",
        host_user_ids as "hostUserIds",
        is_active as "isActive",
        created_at as "createdAt", updated_at as "updatedAt"
      FROM scheduling_team_event_types
      WHERE id = ${eventTypeId}
    `
    return (result.rows[0] as TeamEventType) || null
  })
}

/**
 * Get a team event type by slug
 */
export async function getTeamEventTypeBySlug(
  tenantId: string,
  teamId: string,
  slug: string
): Promise<TeamEventType | null> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT
        id, tenant_id as "tenantId", team_id as "teamId",
        name, slug, description, duration, color, location,
        custom_questions as "customQuestions",
        reminder_settings as "reminderSettings",
        scheduling_type as "schedulingType",
        host_user_ids as "hostUserIds",
        is_active as "isActive",
        created_at as "createdAt", updated_at as "updatedAt"
      FROM scheduling_team_event_types
      WHERE team_id = ${teamId} AND slug = ${slug} AND is_active = true
    `
    return (result.rows[0] as TeamEventType) || null
  })
}

/**
 * Create a team event type
 */
export async function createTeamEventType(
  tenantId: string,
  input: CreateTeamEventTypeInput
): Promise<TeamEventType> {
  return withTenant(tenantId, async () => {
    const defaultLocation: LocationConfig = { type: 'google_meet' }

    const result = await sql`
      INSERT INTO scheduling_team_event_types (
        tenant_id, team_id, name, slug, description, duration, color,
        location, custom_questions, reminder_settings, scheduling_type, host_user_ids
      ) VALUES (
        ${tenantId}, ${input.teamId}, ${input.name}, ${input.slug},
        ${input.description || null}, ${input.duration}, ${input.color || 'blue'},
        ${JSON.stringify(input.location || defaultLocation)}::jsonb,
        ${JSON.stringify(input.customQuestions || [])}::jsonb,
        ${JSON.stringify(input.reminderSettings || DEFAULT_REMINDER_SETTINGS)}::jsonb,
        ${input.schedulingType || 'round_robin'},
        ${input.hostUserIds}::uuid[]
      )
      RETURNING
        id, tenant_id as "tenantId", team_id as "teamId",
        name, slug, description, duration, color, location,
        custom_questions as "customQuestions",
        reminder_settings as "reminderSettings",
        scheduling_type as "schedulingType",
        host_user_ids as "hostUserIds",
        is_active as "isActive",
        created_at as "createdAt", updated_at as "updatedAt"
    `

    const eventType = result.rows[0] as TeamEventType

    // Initialize round-robin counter
    await sql`
      INSERT INTO scheduling_round_robin_counters (tenant_id, team_event_type_id, current_index)
      VALUES (${tenantId}, ${eventType.id}, 0)
    `

    return eventType
  })
}

/**
 * Update a team event type
 */
export async function updateTeamEventType(
  tenantId: string,
  eventTypeId: string,
  input: UpdateTeamEventTypeInput
): Promise<TeamEventType | null> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      UPDATE scheduling_team_event_types SET
        name = COALESCE(${input.name}, name),
        slug = COALESCE(${input.slug}, slug),
        description = COALESCE(${input.description}, description),
        duration = COALESCE(${input.duration}, duration),
        color = COALESCE(${input.color}, color),
        location = COALESCE(${input.location ? JSON.stringify(input.location) : null}::jsonb, location),
        custom_questions = COALESCE(${input.customQuestions ? JSON.stringify(input.customQuestions) : null}::jsonb, custom_questions),
        reminder_settings = COALESCE(${input.reminderSettings ? JSON.stringify(input.reminderSettings) : null}::jsonb, reminder_settings),
        scheduling_type = COALESCE(${input.schedulingType}, scheduling_type),
        host_user_ids = COALESCE(${input.hostUserIds}::uuid[], host_user_ids),
        is_active = COALESCE(${input.isActive}, is_active),
        updated_at = NOW()
      WHERE id = ${eventTypeId} AND tenant_id = ${tenantId}
      RETURNING
        id, tenant_id as "tenantId", team_id as "teamId",
        name, slug, description, duration, color, location,
        custom_questions as "customQuestions",
        reminder_settings as "reminderSettings",
        scheduling_type as "schedulingType",
        host_user_ids as "hostUserIds",
        is_active as "isActive",
        created_at as "createdAt", updated_at as "updatedAt"
    `

    return (result.rows[0] as TeamEventType) || null
  })
}

/**
 * Delete a team event type
 */
export async function deleteTeamEventType(
  tenantId: string,
  eventTypeId: string
): Promise<boolean> {
  return withTenant(tenantId, async () => {
    // Delete the counter first
    await sql`
      DELETE FROM scheduling_round_robin_counters
      WHERE team_event_type_id = ${eventTypeId}
    `

    const result = await sql`
      DELETE FROM scheduling_team_event_types
      WHERE id = ${eventTypeId} AND tenant_id = ${tenantId}
    `
    return (result.rowCount ?? 0) > 0
  })
}

// ============================================================================
// Round-Robin Counter
// ============================================================================

/**
 * Get round-robin counter for a team event type
 */
export async function getRoundRobinCounter(
  tenantId: string,
  teamEventTypeId: string
): Promise<RoundRobinCounter | null> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT
        id, tenant_id as "tenantId",
        team_event_type_id as "teamEventTypeId",
        current_index as "currentIndex",
        updated_at as "updatedAt"
      FROM scheduling_round_robin_counters
      WHERE team_event_type_id = ${teamEventTypeId}
    `
    return (result.rows[0] as RoundRobinCounter) || null
  })
}

/**
 * Update round-robin counter
 */
export async function updateRoundRobinCounter(
  tenantId: string,
  teamEventTypeId: string,
  newIndex: number
): Promise<void> {
  await withTenant(tenantId, async () => {
    await sql`
      UPDATE scheduling_round_robin_counters SET
        current_index = ${newIndex},
        updated_at = NOW()
      WHERE team_event_type_id = ${teamEventTypeId}
    `
  })
}

// ============================================================================
// Team Bookings
// ============================================================================

/**
 * Create a team booking
 */
export async function createTeamBooking(
  tenantId: string,
  input: CreateTeamBookingInput,
  eventType: TeamEventType,
  host: SchedulingUser
): Promise<TeamBooking> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      INSERT INTO scheduling_bookings (
        tenant_id, event_type_id, team_event_type_id, host_user_id,
        event_type_name, host_name, host_email,
        invitee, start_time, end_time, timezone,
        status, location, reminders_sent
      ) VALUES (
        ${tenantId}, NULL, ${input.teamEventTypeId}, ${host.id},
        ${eventType.name}, ${host.displayName}, ${host.email},
        ${JSON.stringify(input.invitee)}::jsonb,
        ${input.startTime}::timestamptz, ${input.endTime}::timestamptz,
        ${input.timezone}, 'confirmed',
        ${JSON.stringify(input.location)}::jsonb,
        '{}'::jsonb
      )
      RETURNING
        id, tenant_id as "tenantId",
        team_event_type_id as "teamEventTypeId",
        host_user_id as "hostUserId", event_type_name as "eventTypeName",
        host_name as "hostName", host_email as "hostEmail",
        invitee, start_time as "startTime", end_time as "endTime",
        timezone, status, location,
        google_event_id as "googleEventId", meet_link as "meetLink",
        cancelled_by as "cancelledBy", cancel_reason as "cancelReason",
        rescheduled_from as "rescheduledFrom",
        created_at as "createdAt", updated_at as "updatedAt"
    `

    return result.rows[0] as TeamBooking
  })
}

/**
 * Get team bookings
 */
export async function getTeamBookings(
  tenantId: string,
  teamId: string,
  options?: {
    status?: string
    dateFrom?: string
    dateTo?: string
    limit?: number
    offset?: number
  }
): Promise<TeamBooking[]> {
  return withTenant(tenantId, async () => {
    // Get all team event type IDs for this team
    const eventTypesResult = await sql`
      SELECT id FROM scheduling_team_event_types WHERE team_id = ${teamId}
    `
    const eventTypeIds = eventTypesResult.rows.map((r) => r.id)

    if (eventTypeIds.length === 0) {
      return []
    }

    const limit = options?.limit || 50
    const offset = options?.offset || 0

    // Build query based on filters
    let statusFilter = sql``
    if (options?.status) {
      statusFilter = sql`AND status = ${options.status}`
    }

    let dateFilter = sql``
    if (options?.dateFrom) {
      dateFilter = sql`${dateFilter} AND start_time >= ${options.dateFrom}::timestamptz`
    }
    if (options?.dateTo) {
      dateFilter = sql`${dateFilter} AND start_time <= ${options.dateTo}::timestamptz`
    }

    const result = await sql`
      SELECT
        id, tenant_id as "tenantId",
        team_event_type_id as "teamEventTypeId",
        host_user_id as "hostUserId", event_type_name as "eventTypeName",
        host_name as "hostName", host_email as "hostEmail",
        invitee, start_time as "startTime", end_time as "endTime",
        timezone, status, location,
        google_event_id as "googleEventId", meet_link as "meetLink",
        cancelled_by as "cancelledBy", cancel_reason as "cancelReason",
        rescheduled_from as "rescheduledFrom",
        created_at as "createdAt", updated_at as "updatedAt"
      FROM scheduling_bookings
      WHERE team_event_type_id = ANY(${eventTypeIds}::uuid[])
        ${statusFilter}
        ${dateFilter}
      ORDER BY start_time DESC
      LIMIT ${limit} OFFSET ${offset}
    `

    return result.rows as TeamBooking[]
  })
}

// ============================================================================
// Team Analytics
// ============================================================================

/**
 * Get booking distribution across team members
 */
export async function getTeamDistribution(
  tenantId: string,
  teamId: string,
  period: '7d' | '30d' | '90d' = '30d'
): Promise<TeamMemberStats[]> {
  return withTenant(tenantId, async () => {
    const intervalMap = { '7d': '7 days', '30d': '30 days', '90d': '90 days' }
    const interval = intervalMap[period]

    const result = await sql.query(
      `
      SELECT
        su.id as user_id,
        su.display_name as user_name,
        COUNT(sb.id) as bookings_count,
        MAX(sb.created_at) as last_booking_at
      FROM scheduling_team_members stm
      JOIN scheduling_users su ON stm.user_id = su.id
      LEFT JOIN scheduling_bookings sb ON sb.host_user_id = su.id
        AND sb.team_event_type_id IN (
          SELECT id FROM scheduling_team_event_types WHERE team_id = $1
        )
        AND sb.created_at > NOW() - INTERVAL '${interval}'
      WHERE stm.team_id = $1
      GROUP BY su.id, su.display_name
      ORDER BY bookings_count DESC
    `,
      [teamId]
    )

    const totalBookings = result.rows.reduce(
      (sum, row) => sum + Number(row.bookings_count || 0),
      0
    )

    return result.rows.map((row) => ({
      userId: row.user_id,
      userName: row.user_name,
      bookingsCount: Number(row.bookings_count || 0),
      percentageOfTeam:
        totalBookings > 0
          ? Math.round((Number(row.bookings_count || 0) / totalBookings) * 100)
          : 0,
      lastBookingAt: row.last_booking_at?.toISOString() || null,
    })) as TeamMemberStats[]
  })
}

/**
 * Get team analytics
 */
export async function getTeamAnalytics(
  tenantId: string,
  teamId: string,
  days = 30
): Promise<{
  totalBookings: number
  confirmedBookings: number
  cancelledBookings: number
  byEventType: Array<{ eventTypeId: string; eventTypeName: string; count: number }>
}> {
  return withTenant(tenantId, async () => {
    // Get team event type IDs
    const eventTypesResult = await sql`
      SELECT id, name FROM scheduling_team_event_types WHERE team_id = ${teamId}
    `
    const eventTypeIds = eventTypesResult.rows.map((r) => r.id)

    if (eventTypeIds.length === 0) {
      return {
        totalBookings: 0,
        confirmedBookings: 0,
        cancelledBookings: 0,
        byEventType: [],
      }
    }

    const summaryResult = await sql.query(
      `
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled
      FROM scheduling_bookings
      WHERE team_event_type_id = ANY($1::uuid[])
        AND created_at >= NOW() - INTERVAL '${days} days'
    `,
      [eventTypeIds]
    )

    const byTypeResult = await sql`
      SELECT
        team_event_type_id as "eventTypeId",
        event_type_name as "eventTypeName",
        COUNT(*) as count
      FROM scheduling_bookings
      WHERE team_event_type_id = ANY(${eventTypeIds}::uuid[])
        AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY team_event_type_id, event_type_name
      ORDER BY count DESC
    `

    const summary = summaryResult.rows[0] || { total: 0, confirmed: 0, cancelled: 0 }

    return {
      totalBookings: Number(summary.total),
      confirmedBookings: Number(summary.confirmed),
      cancelledBookings: Number(summary.cancelled),
      byEventType: byTypeResult.rows as Array<{
        eventTypeId: string
        eventTypeName: string
        count: number
      }>,
    }
  })
}
