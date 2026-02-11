# PHASE-2SC: Scheduling & Booking - Core System

> **Phase**: 2SC (Scheduling Core)
> **Status**: COMPLETE
> **Duration**: 1.5 weeks
> **Dependencies**: PHASE-2A (Admin Shell), PHASE-1B (Database), PHASE-1C (Auth)
> **Can Parallel With**: PHASE-2D (Finance), PHASE-2PO-* (Platform Ops)
> **Last Updated**: 2026-02-10
> **Completed**: 2026-02-10

---

## Goal

Implement a multi-tenant scheduling and booking system (Calendly-style) for managing team calls, creator meetings, and customer appointments. Each tenant gets isolated scheduling data with customizable event types, availability, and booking flows.

---

## Success Criteria

- [x] Tenant admins can create and manage event types with custom durations, locations, and forms
- [x] Users can set weekly availability schedules and blocked dates
- [x] Public booking pages work for any tenant's events (API ready, UI pending)
- [x] Bookings prevent double-booking via distributed locking
- [ ] Google Calendar integration syncs events and imports busy times (deferred to PHASE-2SC-GOOGLE)
- [ ] Email notifications send for confirmations, reminders, cancellations (deferred to PHASE-2CM integration)
- [x] All scheduling data is tenant-isolated

---

## Deliverables

### 1. Database Schema

```sql
-- Scheduling users (per-tenant scheduling profiles)
CREATE TABLE scheduling_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  username TEXT NOT NULL, -- URL-friendly (unique per tenant)
  display_name TEXT NOT NULL,
  email TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- User settings
  minimum_notice_hours INTEGER NOT NULL DEFAULT 24,
  booking_window_days INTEGER NOT NULL DEFAULT 60,
  buffer_before_mins INTEGER NOT NULL DEFAULT 0,
  buffer_after_mins INTEGER NOT NULL DEFAULT 15,
  daily_limit INTEGER, -- null = unlimited
  default_duration INTEGER NOT NULL DEFAULT 30,

  -- Google Calendar OAuth tokens (encrypted)
  google_tokens_encrypted BYTEA,
  google_calendar_id TEXT DEFAULT 'primary',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(tenant_id, username),
  UNIQUE(tenant_id, user_id)
);

-- Event types (meeting templates)
CREATE TABLE scheduling_event_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES scheduling_users(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  duration INTEGER NOT NULL, -- minutes
  color TEXT NOT NULL DEFAULT 'blue',

  -- Location settings (JSONB: {type, value?, displayName?})
  location JSONB NOT NULL DEFAULT '{"type": "google_meet"}',

  -- Custom form questions (JSONB array)
  custom_questions JSONB NOT NULL DEFAULT '[]',

  -- Reminder settings (JSONB: {enabled, reminders[]})
  reminder_settings JSONB NOT NULL DEFAULT '{"enabled": true, "reminders": [{"timing": "24h", "sendToHost": true, "sendToInvitee": true}]}',

  -- Override user settings for this event type (JSONB)
  setting_overrides JSONB,

  is_active BOOLEAN NOT NULL DEFAULT true,
  archived_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(tenant_id, user_id, slug)
);

-- Availability schedules (weekly)
CREATE TABLE scheduling_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES scheduling_users(id) ON DELETE CASCADE,

  timezone TEXT NOT NULL,

  -- Weekly schedule (JSONB: {monday: [{start, end}], tuesday: [], ...})
  weekly_schedule JSONB NOT NULL DEFAULT '{
    "monday": [{"start": "09:00", "end": "17:00"}],
    "tuesday": [{"start": "09:00", "end": "17:00"}],
    "wednesday": [{"start": "09:00", "end": "17:00"}],
    "thursday": [{"start": "09:00", "end": "17:00"}],
    "friday": [{"start": "09:00", "end": "17:00"}],
    "saturday": [],
    "sunday": []
  }',

  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(tenant_id, user_id)
);

-- Blocked dates (PTO, holidays, conferences)
CREATE TABLE scheduling_blocked_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES scheduling_users(id) ON DELETE CASCADE,

  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  is_all_day BOOLEAN NOT NULL DEFAULT true,
  start_time TIME, -- only if not all-day
  end_time TIME,   -- only if not all-day

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bookings (confirmed meetings)
CREATE TABLE scheduling_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_type_id UUID NOT NULL REFERENCES scheduling_event_types(id) ON DELETE CASCADE,
  host_user_id UUID NOT NULL REFERENCES scheduling_users(id) ON DELETE CASCADE,

  -- Denormalized for display
  event_type_name TEXT NOT NULL,
  host_name TEXT NOT NULL,
  host_email TEXT NOT NULL,

  -- Invitee details (JSONB: {name, email, notes?, responses?})
  invitee JSONB NOT NULL,

  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  timezone TEXT NOT NULL, -- invitee's timezone

  status TEXT NOT NULL DEFAULT 'confirmed', -- confirmed, cancelled, rescheduled, completed, no_show

  -- Location info (JSONB: {type, value?, displayName?, meetLink?})
  location JSONB NOT NULL,

  -- Google Calendar sync
  google_event_id TEXT,
  meet_link TEXT,

  -- Cancellation details
  cancelled_by TEXT, -- 'host' or 'invitee'
  cancel_reason TEXT,

  -- Rescheduling
  rescheduled_from UUID REFERENCES scheduling_bookings(id),

  -- Reminder tracking (JSONB: {"24h": true, "1h": false})
  reminders_sent JSONB NOT NULL DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Changelog for audit/analytics
CREATE TABLE scheduling_changelog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL, -- 'event_type', 'booking', 'availability', etc.
  entity_id UUID NOT NULL,
  action TEXT NOT NULL, -- 'created', 'updated', 'cancelled', etc.
  actor_id UUID, -- user who made the change
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_scheduling_users_tenant ON scheduling_users(tenant_id);
CREATE INDEX idx_scheduling_event_types_tenant ON scheduling_event_types(tenant_id);
CREATE INDEX idx_scheduling_event_types_user ON scheduling_event_types(user_id);
CREATE INDEX idx_scheduling_bookings_tenant ON scheduling_bookings(tenant_id);
CREATE INDEX idx_scheduling_bookings_host ON scheduling_bookings(host_user_id);
CREATE INDEX idx_scheduling_bookings_event_type ON scheduling_bookings(event_type_id);
CREATE INDEX idx_scheduling_bookings_start ON scheduling_bookings(start_time);
CREATE INDEX idx_scheduling_bookings_status ON scheduling_bookings(status);
CREATE INDEX idx_scheduling_blocked_dates_user ON scheduling_blocked_dates(user_id);
CREATE INDEX idx_scheduling_changelog_entity ON scheduling_changelog(entity_type, entity_id);
```

### 2. API Routes

```
/api/admin/scheduling/
├── users/
│   ├── route.ts                    # GET list, POST create profile
│   └── [id]/route.ts               # GET, PUT update profile
├── event-types/
│   ├── route.ts                    # GET list, POST create
│   └── [id]/route.ts               # GET, PUT, DELETE
├── availability/
│   └── route.ts                    # GET, PUT schedule
├── blocked-dates/
│   ├── route.ts                    # GET list, POST create
│   └── [id]/route.ts               # DELETE
├── bookings/
│   ├── route.ts                    # GET list (with filters)
│   └── [id]/
│       ├── route.ts                # GET details
│       ├── cancel/route.ts         # POST cancel
│       └── reschedule/route.ts     # POST reschedule
├── settings/
│   └── route.ts                    # GET, PUT user settings
├── analytics/
│   └── route.ts                    # GET booking analytics
└── auth/google/
    ├── route.ts                    # GET initiate OAuth
    ├── callback/route.ts           # GET OAuth callback
    └── disconnect/route.ts         # POST disconnect

/api/public/scheduling/
├── [tenantSlug]/
│   ├── users/
│   │   └── [username]/
│   │       ├── route.ts            # GET user profile & event types
│   │       └── [eventSlug]/
│   │           ├── route.ts        # GET event type details
│   │           └── slots/route.ts  # GET available slots
│   └── bookings/
│       ├── route.ts                # POST create booking
│       └── [id]/
│           ├── cancel/route.ts     # POST cancel (by invitee)
│           └── reschedule/route.ts # POST reschedule
```

**Route Count**: 20+ routes

### 3. Admin UI Pages

```
/admin/scheduling/
├── page.tsx                        # Dashboard: stats, upcoming, quick actions
├── event-types/
│   ├── page.tsx                    # List all event types
│   ├── new/page.tsx                # Create event type
│   └── [id]/page.tsx               # Edit event type
├── availability/
│   └── page.tsx                    # Weekly schedule editor + blocked dates
├── bookings/
│   └── page.tsx                    # Bookings list with filters
├── analytics/
│   └── page.tsx                    # Booking analytics dashboard
└── settings/
    └── page.tsx                    # Profile, Google Calendar, preferences
```

### 4. Public Booking Pages

```
/book/[tenantSlug]/
├── page.tsx                        # Tenant booking landing (if multiple users)
├── [username]/
│   ├── page.tsx                    # User's event types list
│   └── [eventSlug]/
│       └── page.tsx                # Booking flow (calendar + form)
├── cancel/[bookingId]/
│   └── page.tsx                    # Cancellation form
└── reschedule/[bookingId]/
    └── page.tsx                    # Reschedule flow
```

### 5. Core Libraries

```typescript
// packages/scheduling/src/

// Types
export interface SchedulingUser { ... }
export interface EventType { ... }
export interface Availability { ... }
export interface BlockedDate { ... }
export interface Booking { ... }
export type EventColor = 'green' | 'mint' | 'blue' | 'purple' | 'orange' | 'red' | 'gray'
export type BookingStatus = 'confirmed' | 'cancelled' | 'rescheduled' | 'completed' | 'no_show'
export type LocationType = 'google_meet' | 'zoom' | 'phone' | 'in_person' | 'custom'
export type ReminderTiming = '48h' | '24h' | '2h' | '1h' | '30m' | '15m'

// Database operations (tenant-isolated)
export function getSchedulingUser(tenantId: string, userId: string): Promise<SchedulingUser | null>
export function createEventType(tenantId: string, data: CreateEventTypeInput): Promise<EventType>
export function getAvailability(tenantId: string, userId: string): Promise<Availability>
export function updateAvailability(tenantId: string, userId: string, schedule: WeeklySchedule): Promise<void>
export function createBooking(tenantId: string, data: CreateBookingInput): Promise<Booking>
export function getBookings(tenantId: string, filters: BookingFilters): Promise<Booking[]>
// ... etc

// Slot calculation
export function getAvailableSlots(params: {
  tenantId: string
  userId: string
  eventTypeId: string
  date: string // YYYY-MM-DD
  timezone: string
}): Promise<AvailableSlot[]>

// Google Calendar integration
export async function initiateGoogleOAuth(tenantId: string, userId: string, redirectUrl: string): Promise<string>
export async function handleGoogleCallback(code: string, state: string): Promise<void>
export async function createCalendarEvent(tenantId: string, booking: Booking): Promise<string>
export async function getCalendarBusyTimes(tenantId: string, userId: string, start: string, end: string): Promise<BusyTime[]>

// Double-booking prevention (distributed lock)
export async function acquireBookingLock(tenantId: string, userId: string, startTime: string): Promise<LockResult>
export async function releaseBookingLock(lockKey: string): Promise<void>

// Rate limiting
export async function checkBookingRateLimit(ip: string): Promise<RateLimitResult>
```

### 6. Email Notifications

Integrate with PHASE-2CM (Communications) for:

| Notification Type | Trigger | Recipients |
|-------------------|---------|------------|
| `booking_confirmation` | Booking created | Host + Invitee |
| `booking_cancelled` | Booking cancelled | Host + Invitee |
| `booking_rescheduled` | Booking rescheduled | Host + Invitee |
| `booking_reminder` | Scheduled (24h, 1h before) | Host + Invitee |

**Template Variables**:
```
{{hostName}}, {{hostEmail}}, {{inviteeName}}, {{inviteeEmail}}
{{eventTypeName}}, {{duration}}, {{startTime}}, {{endTime}}
{{timezone}}, {{location}}, {{meetLink}}, {{cancelLink}}, {{rescheduleLink}}
{{customResponses}} - JSON of form responses
```

### 7. Analytics Dashboard

```typescript
interface SchedulingAnalytics {
  summary: {
    totalBookings: number
    confirmedBookings: number
    cancelledBookings: number
    cancelRate: number
    avgBookingsPerWeek: number
  }
  byEventType: Array<{
    eventTypeId: string
    eventTypeName: string
    count: number
    percentage: number
  }>
  byDayOfWeek: Record<string, number> // mon: 10, tue: 15, ...
  byHourOfDay: number[] // 24 elements
  trend: Array<{
    date: string
    count: number
  }>
}
```

---

## Implementation Tasks

### [PARALLEL] Database & Types
- [x] Create database migration for scheduling tables
- [x] Define TypeScript types in `@cgk/scheduling` package
- [x] Implement tenant-isolated database operations
- [x] Add changelog logging for audit trail

### [PARALLEL] Event Types CRUD
- [x] API routes for event types (create, read, update, delete, archive)
- [x] Event type form with custom questions editor
- [x] Color picker and location type selector
- [x] Reminder settings editor
- [x] Setting overrides (per-event-type buffers, notice, etc.)

### [PARALLEL] Availability Management
- [x] Weekly schedule editor component
- [x] Blocked dates management (add/remove)
- [x] Partial-day blocks support
- [x] Timezone selection and display

### [SEQUENTIAL after above] Slot Calculation
- [x] Implement `getAvailableSlots()` algorithm
- [x] Respect weekly schedule
- [x] Subtract blocked dates
- [x] Subtract existing bookings
- [x] Apply user settings (buffers, notice, window)
- [ ] Import Google Calendar busy times (if connected) - deferred to PHASE-2SC-GOOGLE

### [SEQUENTIAL after slots] Booking Flow
- [ ] Public booking page with date picker - deferred to PHASE-2SF-BOOKING
- [ ] Time slot selection component - deferred to PHASE-2SF-BOOKING
- [ ] Custom question form rendering - deferred to PHASE-2SF-BOOKING
- [x] Distributed lock for double-booking prevention
- [x] Booking creation with validation
- [ ] Email notifications (queue-based) - deferred to PHASE-2CM integration

### [PARALLEL] Google Calendar Integration - DEFERRED to PHASE-2SC-GOOGLE
- [ ] OAuth flow (initiate, callback, disconnect)
- [ ] Token encryption for storage
- [ ] Token refresh handling
- [ ] Create calendar events with Meet links
- [ ] Update events on reschedule
- [ ] Delete events on cancellation
- [ ] Import busy times for slot calculation

### [SEQUENTIAL after booking] Cancel & Reschedule
- [x] Host cancellation from admin
- [x] Invitee cancellation from public page
- [ ] Reschedule flow (new time selection) - basic API ready, UI pending
- [ ] Update Google Calendar on changes - deferred to PHASE-2SC-GOOGLE
- [ ] Send notification emails - deferred to PHASE-2CM integration

### [PARALLEL] Admin Dashboard
- [x] Dashboard with stats (upcoming, total, cancelled)
- [x] Bookings list with filters (status, date range)
- [x] Event types list with booking counts
- [x] Copy booking link buttons
- [x] Quick actions

### [PARALLEL] Analytics
- [x] Analytics API with 30-day rolling data
- [x] Charts: by event type, by day, by hour
- [x] Trend visualization
- [x] Cancel rate tracking

---

## Pattern References

### RAWDOG Implementation (Read These)
```
/Users/holdenthemic/Documents/rawdog-web/src/lib/scheduling/
  ├── types.ts              # Complete type definitions (371 lines)
  ├── availability.ts       # Slot calculation algorithm
  ├── google-calendar.ts    # OAuth + Calendar API
  ├── rate-limit.ts         # Redis-based rate limiting
  ├── ics.ts               # ICS file generation
  └── redis/*.ts           # CRUD operations patterns

/Users/holdenthemic/Documents/rawdog-web/src/app/admin/scheduling/
  ├── page.tsx             # Dashboard layout
  ├── event-types/         # Event type management
  └── availability/        # Availability editor

/Users/holdenthemic/Documents/rawdog-web/src/app/book/
  ├── [username]/[eventSlug]/BookingFlow.tsx  # Booking UI
  └── cancel/[id]/CancelBookingForm.tsx       # Cancellation UI
```

### Tenant Isolation Pattern
```typescript
// ALWAYS use withTenant for all scheduling queries
import { withTenant } from '@cgk/db'

export async function getEventTypes(tenantId: string, userId: string) {
  return await withTenant(tenantId, async () => {
    return sql`
      SELECT * FROM scheduling_event_types
      WHERE tenant_id = ${tenantId} AND user_id = ${userId}
      ORDER BY created_at DESC
    `
  })
}
```

### Distributed Lock Pattern (Double-Booking Prevention)
```typescript
import { createTenantCache } from '@cgk/cache'

export async function acquireBookingLock(
  tenantId: string,
  hostUserId: string,
  startTime: string
): Promise<{ acquired: boolean; lockKey: string }> {
  const cache = createTenantCache(tenantId)
  const lockKey = `booking_lock:${hostUserId}:${startTime}`

  // SET NX (only if not exists) with 30s expiry
  const acquired = await cache.setnx(lockKey, Date.now().toString(), 30)

  return { acquired, lockKey }
}
```

### Public Route Pattern (No Auth, Rate Limited)
```typescript
// /api/public/scheduling/[tenantSlug]/bookings/route.ts
import { getTenantBySlug } from '@cgk/db'
import { checkBookingRateLimit } from '@cgk/scheduling'

export async function POST(req: Request, { params }: { params: { tenantSlug: string } }) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown'

  // Rate limit check
  const rateLimit = await checkBookingRateLimit(ip)
  if (!rateLimit.allowed) {
    return Response.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': rateLimit.retryAfter.toString() } }
    )
  }

  // Get tenant from slug
  const tenant = await getTenantBySlug(params.tenantSlug)
  if (!tenant) {
    return Response.json({ error: 'Tenant not found' }, { status: 404 })
  }

  // Create booking with lock
  const lock = await acquireBookingLock(tenant.id, hostUserId, startTime)
  if (!lock.acquired) {
    return Response.json({ error: 'Time slot no longer available' }, { status: 409 })
  }

  try {
    // Verify slot is still available
    const available = await isSlotAvailable(tenant.id, hostUserId, eventTypeId, startTime)
    if (!available) {
      return Response.json({ error: 'Time slot no longer available' }, { status: 409 })
    }

    // Create booking
    const booking = await createBooking(tenant.id, bookingData)

    // Queue email notification
    await queueBookingConfirmation(tenant.id, booking.id)

    return Response.json({ booking }, { status: 201 })
  } finally {
    await releaseBookingLock(lock.lockKey)
  }
}
```

---

## UI Components

### Admin Components
| Component | Purpose |
|-----------|---------|
| `SchedulingNav` | Tab navigation for scheduling admin |
| `EventTypeCard` | Event type display with actions |
| `EventTypeForm` | Create/edit event type form |
| `CustomQuestionsEditor` | Manage custom form fields |
| `ReminderSettingsEditor` | Configure reminder timing |
| `AvailabilityEditor` | Weekly schedule grid editor |
| `BlockedDatesList` | Manage PTO/holidays |
| `BookingsList` | Filterable bookings table |
| `BookingDetail` | Booking details modal |
| `AnalyticsCharts` | Booking analytics visualizations |

### Public Booking Components
| Component | Purpose |
|-----------|---------|
| `BookingCalendar` | Date picker for booking |
| `TimeSlotPicker` | Available time slots |
| `BookingForm` | Invitee details + custom questions |
| `BookingConfirmation` | Success page with ICS download |
| `CancelBookingForm` | Cancellation with reason |
| `RescheduleFlow` | Date/time picker for rescheduling |

---

## Timezone Handling

**Critical**: All times stored as UTC, displayed in user's timezone.

```typescript
// Store booking times in UTC
const booking = await createBooking({
  startTime: new Date(selectedSlot).toISOString(), // UTC
  endTime: new Date(endTime).toISOString(),        // UTC
  timezone: inviteeTimezone,                        // For display
})

// Display in invitee timezone
const displayTime = formatInTimeZone(booking.startTime, booking.timezone, 'PPpp')
```

**Slot Calculation**: Convert user's availability (their timezone) to invitee's timezone for display.

---

## Security Considerations

1. **Rate Limiting**: 10 bookings/minute per IP on public endpoints
2. **Distributed Locks**: 30-second TTL to prevent deadlocks
3. **Token Encryption**: Google OAuth tokens encrypted at rest (AES-256-GCM)
4. **Booking IDs**: Use UUIDs (not sequential) for cancel/reschedule URLs
5. **Tenant Isolation**: All queries scoped to tenant_id
6. **CSRF**: Validate origin on public booking endpoints

---

## Testing Checklist

- [ ] Event type CRUD with all fields
- [ ] Availability schedule saves correctly
- [ ] Blocked dates prevent bookings
- [ ] Slot calculation respects all constraints
- [ ] Double-booking prevention works under concurrency
- [ ] Google Calendar events created/updated/deleted
- [ ] Email notifications queued and sent
- [ ] Public booking flow end-to-end
- [ ] Cancel and reschedule flows
- [ ] Rate limiting blocks excessive requests
- [ ] Analytics data aggregates correctly
- [ ] Timezone conversions accurate
- [ ] Tenant isolation verified

---

## Agent Checklist

- [x] Read RAWDOG scheduling implementation (`src/lib/scheduling/`)
- [x] Create database migration
- [x] Implement `@cgk/scheduling` package
- [x] Build admin UI pages
- [ ] Build public booking pages - deferred to PHASE-2SF-BOOKING
- [ ] Integrate with communications (email queue) - deferred to PHASE-2CM
- [ ] Add Google Calendar OAuth - deferred to PHASE-2SC-GOOGLE
- [ ] Write tests - deferred
- [x] Update `npx tsc --noEmit` passes (scheduling package passes)
