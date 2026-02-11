# @cgk/scheduling - AI Development Guide

> **Package Version**: 0.0.0
> **Last Updated**: 2026-02-10

---

## Purpose

Scheduling and booking system for the CGK platform. Provides a Calendly-style booking experience with event types, availability management, slot calculation, and double-booking prevention.

---

## Quick Reference

```typescript
import {
  getEventType,
  calculateAvailableSlots,
  createBooking,
  acquireBookingLock,
  releaseBookingLock,
} from '@cgk/scheduling'

// Get available slots for a date
const slots = calculateAvailableSlots('2026-02-15', {
  user,
  eventType,
  availability,
  blockedDates,
  existingBookings,
  inviteeTimezone: 'America/New_York',
})

// Create booking with distributed lock
const lock = await acquireBookingLock(tenantId, hostUserId, startTime)
if (lock.acquired) {
  try {
    const booking = await createBooking(tenantId, input, eventType, host)
  } finally {
    await releaseBookingLock(tenantId, lock.lockKey)
  }
}
```

---

## Key Patterns

### Pattern 1: Tenant-Isolated Database Operations

All database operations are tenant-isolated using `withTenant()`:

```typescript
import { getEventTypesByUser, createBooking } from '@cgk/scheduling'

// All operations require tenantId as first parameter
const eventTypes = await getEventTypesByUser(tenantId, userId)
const booking = await createBooking(tenantId, input, eventType, host)
```

### Pattern 2: Slot Calculation

Calculate available time slots considering all constraints:

```typescript
import { calculateAvailableSlots, getAvailability, getBlockedDates, getBookingsForHost } from '@cgk/scheduling'

// Gather context
const availability = await getAvailability(tenantId, userId)
const blockedDates = await getBlockedDates(tenantId, userId, startDate, endDate)
const existingBookings = await getBookingsForHost(tenantId, userId, startDate, endDate)

// Calculate slots
const slots = calculateAvailableSlots('2026-02-15', {
  user,
  eventType,
  availability,
  blockedDates,
  existingBookings,
  inviteeTimezone: 'America/New_York',
})
```

### Pattern 3: Double-Booking Prevention

Use distributed locks to prevent race conditions:

```typescript
import { acquireBookingLock, releaseBookingLock, isSlotAvailable } from '@cgk/scheduling'

const lock = await acquireBookingLock(tenantId, hostUserId, startTime)

if (!lock.acquired) {
  return Response.json({ error: 'Slot no longer available' }, { status: 409 })
}

try {
  // Verify slot still available
  const available = isSlotAvailable(startTime, endTime, context)
  if (!available) {
    return Response.json({ error: 'Slot no longer available' }, { status: 409 })
  }

  // Create booking
  const booking = await createBooking(tenantId, input, eventType, host)
} finally {
  await releaseBookingLock(tenantId, lock.lockKey)
}
```

### Pattern 4: Rate Limiting

Protect public endpoints from abuse:

```typescript
import { checkBookingRateLimit } from '@cgk/scheduling'

const rateLimit = await checkBookingRateLimit(tenantId, clientIP)

if (!rateLimit.allowed) {
  return Response.json(
    { error: 'Too many requests' },
    { status: 429, headers: { 'Retry-After': rateLimit.retryAfter.toString() } }
  )
}
```

---

## File Map

| File | Purpose | Key Exports |
|------|---------|-------------|
| `index.ts` | Public exports | All types, db operations, utilities |
| `types.ts` | Type definitions | `EventType`, `Booking`, `Availability`, etc. |
| `db.ts` | Database operations | CRUD for all scheduling entities |
| `slots.ts` | Slot calculation | `calculateAvailableSlots`, `isSlotAvailable` |
| `lock.ts` | Locking & rate limiting | `acquireBookingLock`, `checkBookingRateLimit` |

---

## Type Reference

### Main Types

```typescript
interface SchedulingUser {
  id: string
  tenantId: string
  userId: string
  username: string
  displayName: string
  email: string
  timezone: string
  // Settings
  minimumNoticeHours: number
  bookingWindowDays: number
  bufferBeforeMins: number
  bufferAfterMins: number
  dailyLimit: number | null
  defaultDuration: number
}

interface EventType {
  id: string
  tenantId: string
  userId: string
  name: string
  slug: string
  description: string | null
  duration: number
  color: EventColor
  location: LocationConfig
  customQuestions: CustomQuestion[]
  reminderSettings: ReminderSettings
  isActive: boolean
}

interface Booking {
  id: string
  tenantId: string
  eventTypeId: string
  hostUserId: string
  invitee: Invitee
  startTime: Date
  endTime: Date
  timezone: string
  status: BookingStatus
  location: LocationConfig
}
```

### Enums

```typescript
type EventColor = 'green' | 'mint' | 'blue' | 'purple' | 'orange' | 'red' | 'gray'
type BookingStatus = 'confirmed' | 'cancelled' | 'rescheduled' | 'completed' | 'no_show'
type LocationType = 'google_meet' | 'zoom' | 'phone' | 'in_person' | 'custom'
```

---

## Common Gotchas

### 1. Always use UTC for time storage

```typescript
// CORRECT - Store as UTC
const booking = await createBooking(tenantId, {
  startTime: new Date(selectedSlot).toISOString(), // UTC
  timezone: inviteeTimezone, // For display only
})

// WRONG - Don't store local times
startTime: '2026-02-15T09:00:00-05:00' // Ambiguous!
```

### 2. Always release locks in finally block

```typescript
const lock = await acquireBookingLock(tenantId, hostUserId, startTime)
try {
  // ... booking logic
} finally {
  await releaseBookingLock(tenantId, lock.lockKey) // Always release!
}
```

### 3. Slot calculation needs full context

```typescript
// Don't forget any of these:
const slots = calculateAvailableSlots(date, {
  user,           // Host's settings
  eventType,      // Duration, overrides
  availability,   // Weekly schedule
  blockedDates,   // PTO, holidays
  existingBookings, // Already booked slots
  googleBusyTimes,  // Optional: external calendar
  inviteeTimezone,  // For display conversion
})
```

---

## Dependencies

| Dependency | Why |
|------------|-----|
| `@cgk/db` | Database access and tenant isolation |
| `@cgk/core` | Shared types |
| `date-fns` | Date manipulation |
| `date-fns-tz` | Timezone handling |

---

## Integration Points

### Used by:
- `apps/admin` - Admin scheduling UI
- `apps/storefront` - Public booking pages (future)

### Uses:
- `@cgk/db` - Database and cache
- `@cgk/auth` - User context (via API routes)
