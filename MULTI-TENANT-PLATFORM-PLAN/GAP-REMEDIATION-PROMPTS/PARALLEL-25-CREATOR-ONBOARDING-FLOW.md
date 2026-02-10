# Gap Remediation: Creator Onboarding Flow & Special Features

> **Execution**: Can run in parallel with other prompts
> **Priority**: HIGH
> **Estimated Phases**: 1-2 focused phase docs

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

The Creator Portal has several **special onboarding and content creation features** that are not fully documented in the plan:

1. **Multi-step application form** (/creator/join)
2. **Teleprompter** (/creator/teleprompter)
3. **Welcome Call scheduling** (/creator/welcome-call)
4. **Public Creator Profile** (/creator/[id])

---

## Creator Application Form (/creator/join)

**Source files:**
```
/Users/holdenthemic/Documents/rawdog-web/src/app/creator/join/
/Users/holdenthemic/Documents/rawdog-web/src/components/creator-portal/onboarding/
```

**Multi-step form with auto-save:**

```
Step 1: Basic Info
- First name, Last name
- Email, Phone

Step 2: Social Media
- Instagram handle
- TikTok handle
- YouTube channel
- Portfolio URL

Step 3: Shipping Address
- Address Line 1, Line 2
- City, State, Postal Code, Country

Step 4: Content Interests
- Interested in reviews (checkbox)
- Interested in promotion (checkbox)
- TikTok Shop creator (checkbox)
- Willing to post to TikTok Shop (checkbox)
- Open to collab posts (checkbox)

Step 5: Survey Questions
- Dynamic configurable questions from admin
```

**Features:**
- Resume incomplete applications via URL
- Auto-save draft progress
- Success page (/creator/join/success)

---

## Teleprompter (/creator/teleprompter)

**Source files:**
```
/Users/holdenthemic/Documents/rawdog-web/src/app/creator/teleprompter/
```

**Features:**
- Script display for video recording
- Scroll speed control
- Font size adjustment
- Pause/resume
- Mirror mode
- Full-screen mode

---

## Welcome Call (/creator/welcome-call)

**Source files:**
```
/Users/holdenthemic/Documents/rawdog-web/src/app/creator/welcome-call/
```

**Features:**
- Cal.com integration for scheduling
- Available time slots
- Onboarding call booking
- Calendar sync

---

## Public Creator Profile (/creator/[id])

**Features:**
- Public-facing profile page
- Creator bio and photo
- Social links
- Portfolio/content showcase

---

## Your Task

### 1. Explore Each Feature in RAWDOG

Document:
- Complete implementation details
- Database schema for applications
- Integration points

### 2. Create Phase Document

```
PHASE-4A-CREATOR-ONBOARDING-FLOW.md

## Application Form
- 5-step wizard implementation
- Form field specifications
- Auto-save mechanism
- Application status tracking
- Admin review workflow integration

## Teleprompter Tool
- Script management
- Playback controls
- Display settings
- Integration with projects

## Welcome Call Scheduling
- Cal.com integration
- Available slot configuration
- Booking confirmation flow
- Calendar sync

## Public Profile
- Profile page structure
- Visibility settings
- Portfolio showcase
- Social links display
```

---

## Non-Negotiable Requirements

- Multi-step application form with auto-save
- Teleprompter with playback controls
- Cal.com integration for welcome calls
- Public creator profiles

---

## Output Checklist

- [ ] PLAN.md updated
- [ ] Application form fully documented
- [ ] Teleprompter feature documented
- [ ] Welcome call integration documented
- [ ] Public profile documented
