# Gap Remediation: Scheduling & Booking System

> **Execution**: Can run in parallel with all other prompts
> **Priority**: Critical
> **Estimated Phases**: 1-2 new phase docs

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

## Context

RAWDOG has a complete scheduling and booking system that is **not mentioned at all** in the current multi-tenant platform plan. This is a critical business feature for managing creator calls, team availability, and customer appointments.

### Current RAWDOG Implementation

**Source files to reference:**
```
/Users/holdenthemic/Documents/rawdog-web/src/app/admin/scheduling/
/Users/holdenthemic/Documents/rawdog-web/src/app/api/scheduling/
/Users/holdenthemic/Documents/rawdog-web/src/components/scheduling/
/Users/holdenthemic/Documents/rawdog-web/src/lib/scheduling/
```

**Features that must be documented:**
- Calendar management and visualization
- Event types configuration (call types, durations, buffers)
- Availability management (working hours, time zones)
- Team scheduling and round-robin assignment
- Blocked dates and holidays
- Booking confirmation and reminders
- Booking analytics
- Integration with Google Calendar
- Integration with video conferencing (Meet, Zoom)

---

## Your Task

### 1. Explore the RAWDOG Implementation

Understand:
- How event types are configured
- How availability is calculated
- How team scheduling works
- Database schema for bookings
- Integration with calendar providers

### 2. Update Master Documents

**PLAN.md updates:**
- Add Scheduling to the Admin Features section
- Determine which phase it belongs to (likely Phase 2 Admin or new Phase 2D)
- Update Timeline if adding new phase

**PROMPT.md updates:**
- Add patterns for calendar/scheduling development
- Add timezone handling patterns

### 3. Create Phase Documents

Suggested structure:

```
PHASE-2D-SCHEDULING-CORE.md
- Event types CRUD
- Availability management
- Booking flow
- Confirmation emails

PHASE-2D-SCHEDULING-TEAM.md (if complex enough)
- Team availability aggregation
- Round-robin assignment
- Team booking analytics
```

Or combine into single focused doc if simpler.

---

## Open-Ended Areas (Your Discretion)

- **Phase placement**: Could fit in Phase 2 Admin or be its own phase
- **Calendar provider**: Google Calendar is current, but architecture should support others
- **Booking widget**: How the public booking interface works
- **Multi-tenant approach**: Per-tenant calendars vs shared infrastructure

---

## Non-Negotiable Requirements

You MUST preserve:
- Event type configuration
- Availability management
- Team scheduling
- Blocked dates
- Booking confirmations
- Calendar integration (at minimum Google)
- Analytics on bookings

---

## Validation

- [ ] All scheduling features documented
- [ ] Database schema specified
- [ ] API endpoints listed (10+ from RAWDOG)
- [ ] Admin UI pages specified
- [ ] Timezone handling addressed
- [ ] Multi-tenant isolation for calendars

---

## Skills & Tools to Use

- **Context7 MCP**: Look up calendar API best practices
- **Explore agent**: Navigate RAWDOG scheduling code

---

## Output Checklist

- [ ] PLAN.md updated
- [ ] PROMPT.md updated with scheduling patterns
- [ ] 1-2 phase docs created
