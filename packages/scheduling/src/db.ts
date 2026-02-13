/**
 * Scheduling database operations
 *
 * @ai-pattern tenant-isolation
 * @ai-required Always use withTenant() wrapper for all operations
 */

import { sql, withTenant } from '@cgk-platform/db'

import type {
  Availability,
  BlockedDate,
  Booking,
  BookingFilters,
  BookingStatus,
  CreateBlockedDateInput,
  CreateBookingInput,
  CreateEventTypeInput,
  CreateSchedulingUserInput,
  EventType,
  LocationConfig,
  ReminderTiming,
  SchedulingChangelog,
  SchedulingUser,
  UpdateEventTypeInput,
  UpdateSchedulingUserInput,
  WeeklySchedule,
} from './types.js'

const DEFAULT_WEEKLY_SCHEDULE: WeeklySchedule = {
  monday: [{ start: '09:00', end: '17:00' }],
  tuesday: [{ start: '09:00', end: '17:00' }],
  wednesday: [{ start: '09:00', end: '17:00' }],
  thursday: [{ start: '09:00', end: '17:00' }],
  friday: [{ start: '09:00', end: '17:00' }],
  saturday: [],
  sunday: [],
}

// ============================================================================
// Scheduling Users
// ============================================================================

export async function getSchedulingUser(
  tenantId: string,
  userId: string
): Promise<SchedulingUser | null> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT
        id, tenant_id as "tenantId", user_id as "userId",
        username, display_name as "displayName", email, timezone,
        avatar_url as "avatarUrl", is_active as "isActive",
        minimum_notice_hours as "minimumNoticeHours",
        booking_window_days as "bookingWindowDays",
        buffer_before_mins as "bufferBeforeMins",
        buffer_after_mins as "bufferAfterMins",
        daily_limit as "dailyLimit",
        default_duration as "defaultDuration",
        google_tokens_encrypted as "googleTokensEncrypted",
        google_calendar_id as "googleCalendarId",
        created_at as "createdAt", updated_at as "updatedAt"
      FROM scheduling_users
      WHERE user_id = ${userId}
    `
    return (result.rows[0] as SchedulingUser) || null
  })
}

export async function getSchedulingUserByUsername(
  tenantId: string,
  username: string
): Promise<SchedulingUser | null> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT
        id, tenant_id as "tenantId", user_id as "userId",
        username, display_name as "displayName", email, timezone,
        avatar_url as "avatarUrl", is_active as "isActive",
        minimum_notice_hours as "minimumNoticeHours",
        booking_window_days as "bookingWindowDays",
        buffer_before_mins as "bufferBeforeMins",
        buffer_after_mins as "bufferAfterMins",
        daily_limit as "dailyLimit",
        default_duration as "defaultDuration",
        google_tokens_encrypted as "googleTokensEncrypted",
        google_calendar_id as "googleCalendarId",
        created_at as "createdAt", updated_at as "updatedAt"
      FROM scheduling_users
      WHERE username = ${username} AND is_active = true
    `
    return (result.rows[0] as SchedulingUser) || null
  })
}

export async function getSchedulingUsers(tenantId: string): Promise<SchedulingUser[]> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT
        id, tenant_id as "tenantId", user_id as "userId",
        username, display_name as "displayName", email, timezone,
        avatar_url as "avatarUrl", is_active as "isActive",
        minimum_notice_hours as "minimumNoticeHours",
        booking_window_days as "bookingWindowDays",
        buffer_before_mins as "bufferBeforeMins",
        buffer_after_mins as "bufferAfterMins",
        daily_limit as "dailyLimit",
        default_duration as "defaultDuration",
        google_calendar_id as "googleCalendarId",
        created_at as "createdAt", updated_at as "updatedAt"
      FROM scheduling_users
      WHERE is_active = true
      ORDER BY display_name ASC
    `
    return result.rows as SchedulingUser[]
  })
}

export async function createSchedulingUser(
  tenantId: string,
  input: CreateSchedulingUserInput
): Promise<SchedulingUser> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      INSERT INTO scheduling_users (
        tenant_id, user_id, username, display_name, email, timezone, avatar_url
      ) VALUES (
        ${tenantId}, ${input.userId}, ${input.username}, ${input.displayName},
        ${input.email}, ${input.timezone || 'America/New_York'}, ${input.avatarUrl || null}
      )
      RETURNING
        id, tenant_id as "tenantId", user_id as "userId",
        username, display_name as "displayName", email, timezone,
        avatar_url as "avatarUrl", is_active as "isActive",
        minimum_notice_hours as "minimumNoticeHours",
        booking_window_days as "bookingWindowDays",
        buffer_before_mins as "bufferBeforeMins",
        buffer_after_mins as "bufferAfterMins",
        daily_limit as "dailyLimit",
        default_duration as "defaultDuration",
        google_calendar_id as "googleCalendarId",
        created_at as "createdAt", updated_at as "updatedAt"
    `

    const user = result.rows[0] as SchedulingUser

    // Create default availability
    await sql`
      INSERT INTO scheduling_availability (tenant_id, user_id, timezone, weekly_schedule)
      VALUES (${tenantId}, ${user.id}, ${user.timezone}, ${JSON.stringify(DEFAULT_WEEKLY_SCHEDULE)})
    `

    await logChange(tenantId, 'scheduling_user', user.id, 'created', input.userId, { input })

    return user
  })
}

export async function updateSchedulingUser(
  tenantId: string,
  userId: string,
  input: UpdateSchedulingUserInput
): Promise<SchedulingUser | null> {
  return withTenant(tenantId, async () => {
    const user = await getSchedulingUser(tenantId, userId)
    if (!user) return null

    const result = await sql`
      UPDATE scheduling_users SET
        username = COALESCE(${input.username}, username),
        display_name = COALESCE(${input.displayName}, display_name),
        email = COALESCE(${input.email}, email),
        timezone = COALESCE(${input.timezone}, timezone),
        avatar_url = COALESCE(${input.avatarUrl}, avatar_url),
        minimum_notice_hours = COALESCE(${input.minimumNoticeHours}, minimum_notice_hours),
        booking_window_days = COALESCE(${input.bookingWindowDays}, booking_window_days),
        buffer_before_mins = COALESCE(${input.bufferBeforeMins}, buffer_before_mins),
        buffer_after_mins = COALESCE(${input.bufferAfterMins}, buffer_after_mins),
        daily_limit = COALESCE(${input.dailyLimit}, daily_limit),
        default_duration = COALESCE(${input.defaultDuration}, default_duration),
        google_calendar_id = COALESCE(${input.googleCalendarId}, google_calendar_id),
        updated_at = NOW()
      WHERE user_id = ${userId}
      RETURNING
        id, tenant_id as "tenantId", user_id as "userId",
        username, display_name as "displayName", email, timezone,
        avatar_url as "avatarUrl", is_active as "isActive",
        minimum_notice_hours as "minimumNoticeHours",
        booking_window_days as "bookingWindowDays",
        buffer_before_mins as "bufferBeforeMins",
        buffer_after_mins as "bufferAfterMins",
        daily_limit as "dailyLimit",
        default_duration as "defaultDuration",
        google_calendar_id as "googleCalendarId",
        created_at as "createdAt", updated_at as "updatedAt"
    `

    await logChange(tenantId, 'scheduling_user', user.id, 'updated', userId, { input })

    return (result.rows[0] as SchedulingUser) || null
  })
}

// ============================================================================
// Event Types
// ============================================================================

export async function getEventType(
  tenantId: string,
  eventTypeId: string
): Promise<EventType | null> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT
        id, tenant_id as "tenantId", user_id as "userId",
        name, slug, description, duration, color,
        location, custom_questions as "customQuestions",
        reminder_settings as "reminderSettings",
        setting_overrides as "settingOverrides",
        is_active as "isActive", archived_at as "archivedAt",
        created_at as "createdAt", updated_at as "updatedAt"
      FROM scheduling_event_types
      WHERE id = ${eventTypeId}
    `
    return (result.rows[0] as EventType) || null
  })
}

export async function getEventTypeBySlug(
  tenantId: string,
  userId: string,
  slug: string
): Promise<EventType | null> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT
        id, tenant_id as "tenantId", user_id as "userId",
        name, slug, description, duration, color,
        location, custom_questions as "customQuestions",
        reminder_settings as "reminderSettings",
        setting_overrides as "settingOverrides",
        is_active as "isActive", archived_at as "archivedAt",
        created_at as "createdAt", updated_at as "updatedAt"
      FROM scheduling_event_types
      WHERE user_id = ${userId} AND slug = ${slug} AND is_active = true
    `
    return (result.rows[0] as EventType) || null
  })
}

export async function getEventTypesByUser(
  tenantId: string,
  userId: string,
  includeInactive = false
): Promise<EventType[]> {
  return withTenant(tenantId, async () => {
    const result = includeInactive
      ? await sql`
          SELECT
            id, tenant_id as "tenantId", user_id as "userId",
            name, slug, description, duration, color,
            location, custom_questions as "customQuestions",
            reminder_settings as "reminderSettings",
            setting_overrides as "settingOverrides",
            is_active as "isActive", archived_at as "archivedAt",
            created_at as "createdAt", updated_at as "updatedAt"
          FROM scheduling_event_types
          WHERE user_id = ${userId} AND archived_at IS NULL
          ORDER BY created_at DESC
        `
      : await sql`
          SELECT
            id, tenant_id as "tenantId", user_id as "userId",
            name, slug, description, duration, color,
            location, custom_questions as "customQuestions",
            reminder_settings as "reminderSettings",
            setting_overrides as "settingOverrides",
            is_active as "isActive", archived_at as "archivedAt",
            created_at as "createdAt", updated_at as "updatedAt"
          FROM scheduling_event_types
          WHERE user_id = ${userId} AND is_active = true AND archived_at IS NULL
          ORDER BY created_at DESC
        `
    return result.rows as EventType[]
  })
}

export async function createEventType(
  tenantId: string,
  input: CreateEventTypeInput
): Promise<EventType> {
  return withTenant(tenantId, async () => {
    const defaultLocation: LocationConfig = { type: 'google_meet' }
    const defaultReminderSettings = {
      enabled: true,
      reminders: [{ timing: '24h' as const, sendToHost: true, sendToInvitee: true }],
    }

    const result = await sql`
      INSERT INTO scheduling_event_types (
        tenant_id, user_id, name, slug, description, duration, color,
        location, custom_questions, reminder_settings, setting_overrides
      ) VALUES (
        ${tenantId}, ${input.userId}, ${input.name}, ${input.slug},
        ${input.description || null}, ${input.duration}, ${input.color || 'blue'},
        ${JSON.stringify(input.location || defaultLocation)},
        ${JSON.stringify(input.customQuestions || [])},
        ${JSON.stringify(input.reminderSettings || defaultReminderSettings)},
        ${input.settingOverrides ? JSON.stringify(input.settingOverrides) : null}
      )
      RETURNING
        id, tenant_id as "tenantId", user_id as "userId",
        name, slug, description, duration, color,
        location, custom_questions as "customQuestions",
        reminder_settings as "reminderSettings",
        setting_overrides as "settingOverrides",
        is_active as "isActive", archived_at as "archivedAt",
        created_at as "createdAt", updated_at as "updatedAt"
    `

    const eventType = result.rows[0] as EventType
    await logChange(tenantId, 'event_type', eventType.id, 'created', input.userId, { input })

    return eventType
  })
}

export async function updateEventType(
  tenantId: string,
  eventTypeId: string,
  input: UpdateEventTypeInput,
  actorId?: string
): Promise<EventType | null> {
  return withTenant(tenantId, async () => {
    const existing = await getEventType(tenantId, eventTypeId)
    if (!existing) return null

    const result = await sql`
      UPDATE scheduling_event_types SET
        name = COALESCE(${input.name}, name),
        slug = COALESCE(${input.slug}, slug),
        description = COALESCE(${input.description}, description),
        duration = COALESCE(${input.duration}, duration),
        color = COALESCE(${input.color}, color),
        location = COALESCE(${input.location ? JSON.stringify(input.location) : null}::jsonb, location),
        custom_questions = COALESCE(${input.customQuestions ? JSON.stringify(input.customQuestions) : null}::jsonb, custom_questions),
        reminder_settings = COALESCE(${input.reminderSettings ? JSON.stringify(input.reminderSettings) : null}::jsonb, reminder_settings),
        setting_overrides = COALESCE(${input.settingOverrides ? JSON.stringify(input.settingOverrides) : null}::jsonb, setting_overrides),
        is_active = COALESCE(${input.isActive}, is_active),
        updated_at = NOW()
      WHERE id = ${eventTypeId}
      RETURNING
        id, tenant_id as "tenantId", user_id as "userId",
        name, slug, description, duration, color,
        location, custom_questions as "customQuestions",
        reminder_settings as "reminderSettings",
        setting_overrides as "settingOverrides",
        is_active as "isActive", archived_at as "archivedAt",
        created_at as "createdAt", updated_at as "updatedAt"
    `

    await logChange(tenantId, 'event_type', eventTypeId, 'updated', actorId || null, { input })

    return (result.rows[0] as EventType) || null
  })
}

export async function archiveEventType(
  tenantId: string,
  eventTypeId: string,
  actorId?: string
): Promise<boolean> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      UPDATE scheduling_event_types
      SET archived_at = NOW(), is_active = false, updated_at = NOW()
      WHERE id = ${eventTypeId}
    `

    if (result.rowCount && result.rowCount > 0) {
      await logChange(tenantId, 'event_type', eventTypeId, 'archived', actorId || null, null)
      return true
    }
    return false
  })
}

// ============================================================================
// Availability
// ============================================================================

export async function getAvailability(
  tenantId: string,
  userId: string
): Promise<Availability | null> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT
        id, tenant_id as "tenantId", user_id as "userId",
        timezone, weekly_schedule as "weeklySchedule",
        updated_at as "updatedAt"
      FROM scheduling_availability
      WHERE user_id = ${userId}
    `
    return (result.rows[0] as Availability) || null
  })
}

export async function updateAvailability(
  tenantId: string,
  userId: string,
  schedule: WeeklySchedule,
  timezone?: string
): Promise<Availability | null> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      UPDATE scheduling_availability SET
        weekly_schedule = ${JSON.stringify(schedule)}::jsonb,
        timezone = COALESCE(${timezone}, timezone),
        updated_at = NOW()
      WHERE user_id = ${userId}
      RETURNING
        id, tenant_id as "tenantId", user_id as "userId",
        timezone, weekly_schedule as "weeklySchedule",
        updated_at as "updatedAt"
    `

    await logChange(tenantId, 'availability', userId, 'updated', userId, { schedule, timezone })

    return (result.rows[0] as Availability) || null
  })
}

// ============================================================================
// Blocked Dates
// ============================================================================

export async function getBlockedDates(
  tenantId: string,
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<BlockedDate[]> {
  return withTenant(tenantId, async () => {
    if (startDate && endDate) {
      const result = await sql`
        SELECT
          id, tenant_id as "tenantId", user_id as "userId",
          start_date as "startDate", end_date as "endDate",
          reason, is_all_day as "isAllDay",
          start_time as "startTime", end_time as "endTime",
          created_at as "createdAt"
        FROM scheduling_blocked_dates
        WHERE user_id = ${userId}
          AND start_date <= ${endDate}::date
          AND end_date >= ${startDate}::date
        ORDER BY start_date ASC
      `
      return result.rows as BlockedDate[]
    }

    const result = await sql`
      SELECT
        id, tenant_id as "tenantId", user_id as "userId",
        start_date as "startDate", end_date as "endDate",
        reason, is_all_day as "isAllDay",
        start_time as "startTime", end_time as "endTime",
        created_at as "createdAt"
      FROM scheduling_blocked_dates
      WHERE user_id = ${userId}
      ORDER BY start_date ASC
    `
    return result.rows as BlockedDate[]
  })
}

export async function createBlockedDate(
  tenantId: string,
  input: CreateBlockedDateInput
): Promise<BlockedDate> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      INSERT INTO scheduling_blocked_dates (
        tenant_id, user_id, start_date, end_date, reason,
        is_all_day, start_time, end_time
      ) VALUES (
        ${tenantId}, ${input.userId}, ${input.startDate}::date, ${input.endDate}::date,
        ${input.reason || null}, ${input.isAllDay !== false},
        ${input.startTime || null}, ${input.endTime || null}
      )
      RETURNING
        id, tenant_id as "tenantId", user_id as "userId",
        start_date as "startDate", end_date as "endDate",
        reason, is_all_day as "isAllDay",
        start_time as "startTime", end_time as "endTime",
        created_at as "createdAt"
    `

    const blockedDate = result.rows[0] as BlockedDate
    await logChange(tenantId, 'blocked_date', blockedDate.id, 'created', input.userId, { input })

    return blockedDate
  })
}

export async function deleteBlockedDate(
  tenantId: string,
  blockedDateId: string,
  actorId?: string
): Promise<boolean> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      DELETE FROM scheduling_blocked_dates WHERE id = ${blockedDateId}
    `

    if (result.rowCount && result.rowCount > 0) {
      await logChange(tenantId, 'blocked_date', blockedDateId, 'deleted', actorId || null, null)
      return true
    }
    return false
  })
}

// ============================================================================
// Bookings
// ============================================================================

export async function getBooking(tenantId: string, bookingId: string): Promise<Booking | null> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT
        id, tenant_id as "tenantId", event_type_id as "eventTypeId",
        host_user_id as "hostUserId", event_type_name as "eventTypeName",
        host_name as "hostName", host_email as "hostEmail",
        invitee, start_time as "startTime", end_time as "endTime",
        timezone, status, location,
        google_event_id as "googleEventId", meet_link as "meetLink",
        cancelled_by as "cancelledBy", cancel_reason as "cancelReason",
        rescheduled_from as "rescheduledFrom",
        reminders_sent as "remindersSent",
        created_at as "createdAt", updated_at as "updatedAt"
      FROM scheduling_bookings
      WHERE id = ${bookingId}
    `
    return (result.rows[0] as Booking) || null
  })
}

export async function getBookings(
  tenantId: string,
  filters: BookingFilters
): Promise<{ bookings: Booking[]; total: number }> {
  return withTenant(tenantId, async () => {
    const conditions: string[] = []
    const values: unknown[] = []
    let paramIndex = 0

    if (filters.status) {
      paramIndex++
      conditions.push(`status = $${paramIndex}`)
      values.push(filters.status)
    }

    if (filters.eventTypeId) {
      paramIndex++
      conditions.push(`event_type_id = $${paramIndex}`)
      values.push(filters.eventTypeId)
    }

    if (filters.hostUserId) {
      paramIndex++
      conditions.push(`host_user_id = $${paramIndex}`)
      values.push(filters.hostUserId)
    }

    if (filters.dateFrom) {
      paramIndex++
      conditions.push(`start_time >= $${paramIndex}::timestamptz`)
      values.push(filters.dateFrom)
    }

    if (filters.dateTo) {
      paramIndex++
      conditions.push(`start_time <= $${paramIndex}::timestamptz`)
      values.push(filters.dateTo)
    }

    if (filters.search) {
      paramIndex++
      conditions.push(
        `(event_type_name ILIKE $${paramIndex} OR invitee->>'name' ILIKE $${paramIndex} OR invitee->>'email' ILIKE $${paramIndex})`
      )
      values.push(`%${filters.search}%`)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const limit = filters.limit || 20
    const offset = ((filters.page || 1) - 1) * limit

    paramIndex++
    const limitParam = paramIndex
    paramIndex++
    const offsetParam = paramIndex
    values.push(limit, offset)

    const dataResult = await sql.query(
      `SELECT
        id, tenant_id as "tenantId", event_type_id as "eventTypeId",
        host_user_id as "hostUserId", event_type_name as "eventTypeName",
        host_name as "hostName", host_email as "hostEmail",
        invitee, start_time as "startTime", end_time as "endTime",
        timezone, status, location,
        google_event_id as "googleEventId", meet_link as "meetLink",
        cancelled_by as "cancelledBy", cancel_reason as "cancelReason",
        rescheduled_from as "rescheduledFrom",
        reminders_sent as "remindersSent",
        created_at as "createdAt", updated_at as "updatedAt"
      FROM scheduling_bookings ${whereClause}
      ORDER BY start_time DESC
      LIMIT $${limitParam} OFFSET $${offsetParam}`,
      values
    )

    const countValues = values.slice(0, -2)
    const countResult = await sql.query(
      `SELECT COUNT(*) as count FROM scheduling_bookings ${whereClause}`,
      countValues
    )

    return {
      bookings: dataResult.rows as Booking[],
      total: Number(countResult.rows[0]?.count || 0),
    }
  })
}

export async function getBookingsForHost(
  tenantId: string,
  hostUserId: string,
  startDate: string,
  endDate: string
): Promise<Booking[]> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT
        id, tenant_id as "tenantId", event_type_id as "eventTypeId",
        host_user_id as "hostUserId", event_type_name as "eventTypeName",
        host_name as "hostName", host_email as "hostEmail",
        invitee, start_time as "startTime", end_time as "endTime",
        timezone, status, location,
        google_event_id as "googleEventId", meet_link as "meetLink",
        cancelled_by as "cancelledBy", cancel_reason as "cancelReason",
        rescheduled_from as "rescheduledFrom",
        reminders_sent as "remindersSent",
        created_at as "createdAt", updated_at as "updatedAt"
      FROM scheduling_bookings
      WHERE host_user_id = ${hostUserId}
        AND start_time >= ${startDate}::timestamptz
        AND start_time <= ${endDate}::timestamptz
        AND status IN ('confirmed', 'rescheduled')
      ORDER BY start_time ASC
    `
    return result.rows as Booking[]
  })
}

export async function createBooking(
  tenantId: string,
  input: CreateBookingInput,
  eventType: EventType,
  host: SchedulingUser
): Promise<Booking> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      INSERT INTO scheduling_bookings (
        tenant_id, event_type_id, host_user_id,
        event_type_name, host_name, host_email,
        invitee, start_time, end_time, timezone,
        status, location, reminders_sent
      ) VALUES (
        ${tenantId}, ${input.eventTypeId}, ${input.hostUserId},
        ${eventType.name}, ${host.displayName}, ${host.email},
        ${JSON.stringify(input.invitee)}::jsonb,
        ${input.startTime}::timestamptz, ${input.endTime}::timestamptz,
        ${input.timezone}, 'confirmed',
        ${JSON.stringify(input.location)}::jsonb,
        '{}'::jsonb
      )
      RETURNING
        id, tenant_id as "tenantId", event_type_id as "eventTypeId",
        host_user_id as "hostUserId", event_type_name as "eventTypeName",
        host_name as "hostName", host_email as "hostEmail",
        invitee, start_time as "startTime", end_time as "endTime",
        timezone, status, location,
        google_event_id as "googleEventId", meet_link as "meetLink",
        cancelled_by as "cancelledBy", cancel_reason as "cancelReason",
        rescheduled_from as "rescheduledFrom",
        reminders_sent as "remindersSent",
        created_at as "createdAt", updated_at as "updatedAt"
    `

    const booking = result.rows[0] as Booking
    await logChange(tenantId, 'booking', booking.id, 'created', null, {
      invitee: input.invitee,
      startTime: input.startTime,
    })

    return booking
  })
}

export async function updateBookingStatus(
  tenantId: string,
  bookingId: string,
  status: BookingStatus,
  details?: { cancelledBy?: 'host' | 'invitee'; cancelReason?: string },
  actorId?: string
): Promise<Booking | null> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      UPDATE scheduling_bookings SET
        status = ${status},
        cancelled_by = COALESCE(${details?.cancelledBy || null}, cancelled_by),
        cancel_reason = COALESCE(${details?.cancelReason || null}, cancel_reason),
        updated_at = NOW()
      WHERE id = ${bookingId}
      RETURNING
        id, tenant_id as "tenantId", event_type_id as "eventTypeId",
        host_user_id as "hostUserId", event_type_name as "eventTypeName",
        host_name as "hostName", host_email as "hostEmail",
        invitee, start_time as "startTime", end_time as "endTime",
        timezone, status, location,
        google_event_id as "googleEventId", meet_link as "meetLink",
        cancelled_by as "cancelledBy", cancel_reason as "cancelReason",
        rescheduled_from as "rescheduledFrom",
        reminders_sent as "remindersSent",
        created_at as "createdAt", updated_at as "updatedAt"
    `

    const action = status === 'cancelled' ? 'cancelled' : 'updated'
    await logChange(tenantId, 'booking', bookingId, action, actorId || null, { status, ...details })

    return (result.rows[0] as Booking) || null
  })
}

export async function updateBookingGoogleEvent(
  tenantId: string,
  bookingId: string,
  googleEventId: string,
  meetLink?: string
): Promise<void> {
  await withTenant(tenantId, async () => {
    await sql`
      UPDATE scheduling_bookings SET
        google_event_id = ${googleEventId},
        meet_link = COALESCE(${meetLink || null}, meet_link),
        updated_at = NOW()
      WHERE id = ${bookingId}
    `
  })
}

export async function markReminderSent(
  tenantId: string,
  bookingId: string,
  timing: ReminderTiming
): Promise<void> {
  await withTenant(tenantId, async () => {
    await sql`
      UPDATE scheduling_bookings SET
        reminders_sent = reminders_sent || ${JSON.stringify({ [timing]: true })}::jsonb,
        updated_at = NOW()
      WHERE id = ${bookingId}
    `
  })
}

// ============================================================================
// Changelog
// ============================================================================

async function logChange(
  tenantId: string,
  entityType: SchedulingChangelog['entityType'],
  entityId: string,
  action: SchedulingChangelog['action'],
  actorId: string | null,
  details: Record<string, unknown> | null
): Promise<void> {
  await sql`
    INSERT INTO scheduling_changelog (tenant_id, entity_type, entity_id, action, actor_id, details)
    VALUES (${tenantId}, ${entityType}, ${entityId}, ${action}, ${actorId}, ${details ? JSON.stringify(details) : null}::jsonb)
  `
}

export async function getChangelog(
  tenantId: string,
  entityType: SchedulingChangelog['entityType'],
  entityId: string
): Promise<SchedulingChangelog[]> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT
        id, tenant_id as "tenantId", entity_type as "entityType",
        entity_id as "entityId", action, actor_id as "actorId",
        details, created_at as "createdAt"
      FROM scheduling_changelog
      WHERE entity_type = ${entityType} AND entity_id = ${entityId}
      ORDER BY created_at DESC
      LIMIT 50
    `
    return result.rows as SchedulingChangelog[]
  })
}

// ============================================================================
// Analytics
// ============================================================================

export async function getSchedulingAnalytics(
  tenantId: string,
  hostUserId?: string,
  days = 30
): Promise<{
  totalBookings: number
  confirmedBookings: number
  cancelledBookings: number
  byEventType: Array<{ eventTypeId: string; eventTypeName: string; count: number }>
  byDayOfWeek: Record<string, number>
}> {
  return withTenant(tenantId, async () => {
    const hostFilter = hostUserId ? `AND host_user_id = '${hostUserId}'` : ''

    const summaryResult = await sql.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled
      FROM scheduling_bookings
      WHERE created_at >= NOW() - INTERVAL '${days} days' ${hostFilter}
    `)

    const byTypeResult = await sql.query(`
      SELECT event_type_id as "eventTypeId", event_type_name as "eventTypeName", COUNT(*) as count
      FROM scheduling_bookings
      WHERE created_at >= NOW() - INTERVAL '${days} days' ${hostFilter}
      GROUP BY event_type_id, event_type_name
      ORDER BY count DESC
    `)

    const byDayResult = await sql.query(`
      SELECT EXTRACT(DOW FROM start_time) as day_num, COUNT(*) as count
      FROM scheduling_bookings
      WHERE created_at >= NOW() - INTERVAL '${days} days'
        AND status IN ('confirmed', 'completed') ${hostFilter}
      GROUP BY day_num
      ORDER BY day_num
    `)

    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const byDayOfWeek: Record<string, number> = {}
    for (const row of byDayResult.rows) {
      const dayIndex = Number(row.day_num)
      const dayName = dayNames[dayIndex]
      if (dayName) {
        byDayOfWeek[dayName] = Number(row.count)
      }
    }

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
      byDayOfWeek,
    }
  })
}
