# Phase 2SC Handoff Document

## Phase: Scheduling Core
## Status: COMPLETE
## Date: 2026-02-10

---

## Summary

Implemented a multi-tenant scheduling and booking system (Calendly-style) with event types, availability management, slot calculation, and double-booking prevention.

---

## What Was Done

### 1. New Package: `@cgk/scheduling`
Location: `/packages/scheduling/`

**Created Files:**
- `package.json` - Package configuration with dependencies
- `tsconfig.json` - TypeScript configuration
- `CLAUDE.md` - AI development guide
- `src/types.ts` - Complete type definitions (371 lines)
- `src/db.ts` - Tenant-isolated database operations (883 lines)
- `src/slots.ts` - Slot calculation algorithm (420 lines)
- `src/lock.ts` - Distributed locking and rate limiting
- `src/index.ts` - Public exports

### 2. Database Migration
Location: `/packages/db/src/migrations/tenant/009_scheduling.sql`

**Tables Created:**
- `scheduling_users` - Per-tenant scheduling profiles
- `scheduling_event_types` - Meeting templates
- `scheduling_availability` - Weekly schedules
- `scheduling_blocked_dates` - PTO and holidays
- `scheduling_bookings` - Confirmed meetings
- `scheduling_changelog` - Audit trail

**Indexes:** Full set for optimal query performance

### 3. Admin API Routes
Location: `/apps/admin/src/app/api/admin/scheduling/`

**Endpoints:**
- `users/` - GET (list), POST (create)
- `users/[id]/` - GET, PUT
- `event-types/` - GET, POST
- `event-types/[id]/` - GET, PUT, DELETE
- `availability/` - GET, PUT
- `blocked-dates/` - GET, POST
- `blocked-dates/[id]/` - DELETE
- `bookings/` - GET
- `bookings/[id]/` - GET
- `bookings/[id]/cancel/` - POST
- `analytics/` - GET

### 4. Public API Routes
Location: `/apps/admin/src/app/api/public/scheduling/`

**Endpoints:**
- `[tenantSlug]/users/[username]/` - GET (public profile)
- `[tenantSlug]/users/[username]/[eventSlug]/` - GET (event details)
- `[tenantSlug]/users/[username]/[eventSlug]/slots/` - GET (available slots)
- `[tenantSlug]/bookings/` - POST (create booking)
- `[tenantSlug]/bookings/[id]/cancel/` - POST (cancel by invitee)

### 5. Admin UI Pages
Location: `/apps/admin/src/app/admin/scheduling/`

**Pages:**
- `page.tsx` - Dashboard with stats, upcoming, quick actions
- `event-types/page.tsx` - List all event types
- `event-types/new/page.tsx` - Create event type form
- `event-types/[id]/page.tsx` - Edit event type form
- `availability/page.tsx` - Weekly schedule editor + blocked dates
- `bookings/page.tsx` - Bookings list with filters
- `analytics/page.tsx` - Booking analytics dashboard
- `settings/page.tsx` - Profile and preferences

### 6. Configuration Updates

**Navigation (`/apps/admin/src/lib/navigation.ts`):**
- Added Scheduling section with Calendar icon
- Feature flag: `scheduling`

**Tenant Features (`/apps/admin/src/lib/tenant.ts`):**
- Added `scheduling: boolean` to TenantFeatures
- Default: `true`

**Dependencies:**
- Added `@cgk/scheduling` to admin app
- Added `date-fns` to admin app for slot API routes

---

## Key Implementation Patterns

### Tenant Isolation
All database operations use `withTenant()`:
```typescript
const bookings = await withTenant(tenantId, async () => {
  return sql`SELECT * FROM scheduling_bookings WHERE host_user_id = ${userId}`
})
```

### Double-Booking Prevention
Distributed lock pattern with Redis/cache:
```typescript
const lock = await acquireBookingLock(tenantId, hostUserId, startTime)
if (lock.acquired) {
  try {
    // Verify slot and create booking
  } finally {
    await releaseBookingLock(tenantId, lock.lockKey)
  }
}
```

### Slot Calculation
Considers all constraints:
- Weekly availability schedule
- Blocked dates (full day or partial)
- Existing bookings + buffers
- User settings (notice, window, limit)
- Optional Google Calendar busy times

### Timezone Handling
- All times stored as UTC
- User timezone stored for display
- Invitee timezone captured at booking

---

## Files Modified (Existing)

1. `/apps/admin/package.json` - Added dependencies
2. `/apps/admin/src/lib/navigation.ts` - Added scheduling nav
3. `/apps/admin/src/lib/tenant.ts` - Added scheduling feature flag

---

## Files Created

### Package (13 files)
- `/packages/scheduling/package.json`
- `/packages/scheduling/tsconfig.json`
- `/packages/scheduling/CLAUDE.md`
- `/packages/scheduling/src/index.ts`
- `/packages/scheduling/src/types.ts`
- `/packages/scheduling/src/db.ts`
- `/packages/scheduling/src/slots.ts`
- `/packages/scheduling/src/lock.ts`

### Migration (1 file)
- `/packages/db/src/migrations/tenant/009_scheduling.sql`

### API Routes (14 files)
- All routes under `/apps/admin/src/app/api/admin/scheduling/`
- All routes under `/apps/admin/src/app/api/public/scheduling/`

### Admin UI Pages (8 files)
- All pages under `/apps/admin/src/app/admin/scheduling/`

---

## Not Yet Implemented (Future Phases)

1. **Google Calendar Integration** (PHASE-2SC-GOOGLE)
   - OAuth flow for calendar connection
   - Create/update/delete calendar events
   - Import busy times for slot calculation
   - Meet link generation

2. **Email Notifications** (PHASE-2CM)
   - Booking confirmation emails
   - Reminder emails (24h, 1h before)
   - Cancellation/reschedule notifications

3. **Public Booking Pages** (PHASE-2SF-BOOKING)
   - Storefront booking UI at `/book/[tenant]/[user]/[event]`
   - Date picker and slot selection
   - Custom question forms
   - Confirmation and ICS download

4. **Reschedule Flow**
   - Admin rescheduling
   - Invitee self-reschedule

5. **ICS File Generation**
   - Calendar file downloads for bookings

---

## Type Check Status

```bash
pnpm turbo typecheck --filter=@cgk/scheduling
# Result: Success (3 tasks, 0 errors)
```

The scheduling package passes type checking. The admin app has pre-existing type errors in other features (communications, attribution) that are unrelated to this phase.

---

## Testing Recommendations

1. Run migration on tenant schemas
2. Create scheduling profile via settings page
3. Create event types with various configurations
4. Set availability and blocked dates
5. Test public slot API for date/time accuracy
6. Test booking flow with rate limiting
7. Verify double-booking prevention with concurrent requests
8. Check timezone conversions in slot calculation

---

## Next Steps

1. Complete PHASE-2SC-GOOGLE for calendar integration
2. Integrate with PHASE-2CM for email notifications
3. Build public booking UI in storefront app
4. Add E2E tests for booking flow
