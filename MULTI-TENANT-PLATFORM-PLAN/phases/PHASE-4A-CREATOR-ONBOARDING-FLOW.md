# PHASE-4A-CREATOR-ONBOARDING-FLOW: Creator Application & Onboarding Tools

**Duration**: 1 week (runs parallel with PHASE-4A-CREATOR-PORTAL)
**Depends On**: PHASE-1D (packages), PHASE-2SC (scheduling system)
**Parallel With**: PHASE-4A-CREATOR-PORTAL
**Blocks**: PHASE-4C (projects require onboarded creators)

---

## ⚠️ MANDATORY: Tenant Isolation

**READ FIRST**: [TENANT-ISOLATION.md](../TENANT-ISOLATION.md)

Creator onboarding is tenant-specific:
- Each tenant has their own onboarding settings and survey questions
- Application drafts are stored per-tenant
- Welcome call scheduling uses tenant's scheduling configuration
- Public creator profiles are scoped to tenant

---

## Goal

Implement the complete creator onboarding experience from public application form through welcome call scheduling, including specialized creator tools like the teleprompter.

---

## Success Criteria

- [ ] 4-step application form with auto-save draft functionality
- [ ] Resume incomplete applications via unique URL
- [ ] Configurable survey questions from admin
- [ ] Welcome call scheduling (internal or external Cal.com)
- [ ] Teleprompter tool with script management and playback
- [ ] Application success page with next steps
- [ ] Admin can view pending applications

---

## Features Overview

### 1. Multi-Step Application Form (`/creator/join`)

Public-facing application form for new creators.

**Steps**:
| Step | Name | Fields | Validation |
|------|------|--------|------------|
| 1 | Basic Info | First name*, Last name*, Email*, Phone* | All required |
| 2 | Social Media | Instagram, TikTok, YouTube, Portfolio URL | Optional |
| 3 | Shipping Address | Street*, City*, State*, ZIP*, Country | All required |
| 4 | Content Interests | Checkboxes + configurable survey questions | Conditional (TikTok Shop requires TikTok handle) |

**Form Fields**:
```typescript
interface CreatorApplicationForm {
  // Step 1: Basic Info
  firstName: string
  lastName: string
  email: string
  phone: string

  // Step 2: Social Media
  instagram: string           // Handle without @
  tiktok: string              // Handle without @
  youtube: string             // Full channel URL
  portfolioUrl: string

  // Step 3: Shipping Address
  addressLine1: string
  addressLine2: string
  city: string
  state: string               // Two-letter code (US)
  postalCode: string
  country: string             // Default: 'US'

  // Step 4: Content Interests
  interestedInReviews: boolean
  interestedInPromotion: boolean
  tiktokShopCreator: boolean
  willingToPostTiktokShop: boolean  // Shown conditionally
  openToCollabPosts: boolean
  surveyResponses: Record<string, string | string[]>  // Dynamic survey answers
}
```

**Auto-Save Draft Pattern**:
```typescript
// Save draft after 1.5s of inactivity
useEffect(() => {
  if (formData.email && !initialLoading) {
    const timer = setTimeout(() => saveDraft(formData, step), 1500)
    return () => clearTimeout(timer)
  }
}, [formData, step])

// Draft API
POST /api/creator/onboarding/draft
  { email, draftData, step }

GET /api/creator/onboarding/draft?email=...
```

**Resume Application Pattern**:
```typescript
// URL-based resume
/creator/join?resume={applicationId}
/creator/join?email={email}

// Resume API
GET /api/creator/onboarding/resume?id={applicationId}
PATCH /api/creator/onboarding/resume
  { applicationId, step, formData }
```

**Configurable Survey Questions**:
```typescript
interface SurveyQuestion {
  id: string
  question: string
  type: 'text' | 'textarea' | 'select' | 'multiselect'
  options?: string[]        // For select/multiselect
  placeholder?: string
  required?: boolean
}

// Survey questions fetched from tenant config
const SURVEY_QUESTIONS: SurveyQuestion[] = await getTenantSurveyQuestions(tenantId)
```

---

### 2. Teleprompter Tool (`/creator/teleprompter`)

Full-screen teleprompter for script reading during video recording.

**Features**:
| Feature | Description |
|---------|-------------|
| **Script Editor** | Text input with hint to write sentences on separate lines |
| **Auto-Scroll** | Configurable speed (1-5), ~60fps smooth scrolling |
| **Font Size** | Adjustable 16-72px, persisted to localStorage |
| **Mirror Mode** | Horizontal flip for reflection recording setups |
| **Shot Markers** | Visual markers: `[SHOT: B-ROLL]`, `[SHOT: TALKING HEAD]`, etc. |
| **Click-to-Seek** | Click any word to jump to that position |
| **Mobile Gestures** | Tap: play/pause, Swipe up/down: speed adjustment |
| **Keyboard Shortcuts** | Space: play/pause, ↑↓: speed, R: reset, M: mirror, +/-: font size |

**Shot Types**:
```typescript
const SHOT_TYPES = {
  'B-ROLL': { color: '#3b82f6', icon: '🎬', label: 'B-Roll' },
  'TALKING HEAD': { color: '#22c55e', icon: '🗣️', label: 'Talking Head' },
  'PRODUCT SHOT': { color: '#f59e0b', icon: '📦', label: 'Product Shot' },
  'CTA': { color: '#ef4444', icon: '🎯', label: 'Call to Action' },
}
```

**Script Parsing**:
```typescript
// Parse shot markers: [SHOT: TYPE]
function parseScript(script: string): ScriptSegment[] {
  const shotRegex = /\[SHOT:\s*(B-ROLL|TALKING HEAD|PRODUCT SHOT|CTA)\]/gi
  // Returns array of { type: 'text' | 'shot', content, shotType?, wordIndex? }
}
```

**localStorage Persistence**:
- `teleprompter_speed`: Scroll speed (1-5)
- `teleprompter_font_size`: Font size in pixels

---

### 3. Welcome Call Scheduling (`/creator/welcome-call`)

Optional onboarding step to schedule an introductory call with the team.

**Configuration Modes**:
| Mode | Behavior |
|------|----------|
| `internal` | Uses platform's built-in scheduling system (PHASE-2SC) |
| `external` | Uses third-party calendar (Cal.com, Calendly) |
| `disabled` | Skips welcome call step entirely |

**External URL Behavior**:
| Behavior | Action |
|----------|--------|
| `redirect` | Redirects user to external URL (window.location.href) |
| `embed` | Embeds calendar in iframe on the page |

**Admin Configuration**:
```typescript
interface OnboardingSettings {
  welcomeCall: {
    enabled: boolean
    mode: 'internal' | 'external'
    isConfigured: boolean
    externalUrl?: string              // e.g., "https://calendly.com/brand/welcome"
    externalUrlBehavior?: 'redirect' | 'embed'
  }
}

// API
GET /api/creator/onboarding-settings
```

**Internal Scheduling Flow**:
1. User selects a date from next 5 weekdays
2. Timezone selector (auto-detected from browser)
3. Available time slots fetched from internal scheduling API
4. Slot selection shows host name
5. Booking confirmation creates calendar event

**Scheduling API**:
```typescript
// Fetch available slots
GET /api/creator/scheduling/welcome-call?date={YYYY-MM-DD}&timezone={tz}
Response: { slots: TimeSlot[] }

interface TimeSlot {
  start: string        // ISO timestamp
  end: string
  hostId: string
  hostName: string
  eventTypeId: string
}

// Book a slot
POST /api/creator/scheduling/welcome-call
Body: { slotStart, hostId, eventTypeId, timezone }
Response: { bookingId }
```

**Skip Handling**:
```typescript
// Store in localStorage
localStorage.setItem('creator-welcome-call-booked', bookingId)
localStorage.setItem('creator-welcome-call-skipped', 'true')
```

---

### 4. Application Success Page (`/creator/join/success`)

Confirmation page after application submission.

**Content**:
- Success icon and confirmation message
- "What happens next?" with 3 steps:
  1. Team reviews within 48 hours
  2. Email with portal login if approved
  3. Schedule first project call
- CTA buttons: Return to Homepage, Check Out Products
- Contact email for questions

---

### 5. Public Creator Profile (Future Enhancement)

**Note**: Currently, public booking pages exist for team scheduling (`/book/[username]`). Extend this pattern for public creator profiles.

**Proposed Structure**:
```
/creators/[handle]              # Public creator profile
├── Bio and photo
├── Social media links
├── Content portfolio/showcase
└── Commission/discount code (optional)
```

---

## Database Schema

### `creator_applications` Table
```sql
CREATE TABLE {tenant_schema}.creator_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
    -- pending, approved, rejected, invited
  form_data JSONB NOT NULL,
  step INTEGER NOT NULL DEFAULT 1,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  referrer TEXT,
  meta_event_id TEXT,            -- For Meta CAPI deduplication
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID,              -- Admin user ID
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, email)
);

CREATE INDEX idx_creator_applications_status ON creator_applications(tenant_id, status);
CREATE INDEX idx_creator_applications_email ON creator_applications(email);
```

### `creator_application_drafts` Table
```sql
CREATE TABLE {tenant_schema}.creator_application_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  email TEXT NOT NULL,
  draft_data JSONB NOT NULL,
  step INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, email)
);

CREATE INDEX idx_drafts_email ON creator_application_drafts(tenant_id, email);
```

### `tenant_onboarding_settings` Table
```sql
CREATE TABLE public.tenant_onboarding_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  welcome_call_enabled BOOLEAN DEFAULT true,
  welcome_call_mode TEXT DEFAULT 'internal',
    -- internal, external, disabled
  welcome_call_external_url TEXT,
  welcome_call_external_behavior TEXT DEFAULT 'embed',
    -- redirect, embed
  survey_questions JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id)
);
```

---

## API Routes

### Application Routes
```
POST /api/creator/onboarding          # Submit application
GET  /api/creator/onboarding/draft    # Get draft by email
POST /api/creator/onboarding/draft    # Save draft
GET  /api/creator/onboarding/resume   # Get application by ID
PATCH /api/creator/onboarding/resume  # Update application progress
```

### Scheduling Routes
```
GET  /api/creator/scheduling/welcome-call  # Get available slots
POST /api/creator/scheduling/welcome-call  # Book slot
GET  /api/creator/onboarding-settings      # Get tenant settings
```

### Admin Routes
```
GET  /api/admin/creator-applications          # List pending applications
GET  /api/admin/creator-applications/[id]     # Get application details
POST /api/admin/creator-applications/[id]/approve
POST /api/admin/creator-applications/[id]/reject
PUT  /api/admin/settings/onboarding           # Update onboarding settings
```

---

## Component Inventory

### Application Form Components
```
src/components/creator-portal/OnboardingForm.tsx        # Main 4-step form
src/components/creator-portal/onboarding/
├── index.ts
├── GuidedTour.tsx              # First-time user tour
├── TourProgress.tsx            # Tour step indicator
├── TourTooltip.tsx             # Tooltip component
├── PaymentSetupStep.tsx        # Payment method setup
└── ScheduleCallStep.tsx        # Welcome call scheduling
```

### Teleprompter Components
```
src/components/creator-portal/Teleprompter.tsx
  Features:
  - parseScript() for shot marker detection
  - Speed slider (1-5)
  - Font size controls
  - Mirror toggle
  - Play/pause with center button
  - Word click-to-seek
  - Auto-hide controls during playback
```

---

## Frontend Design Skill Prompts

### Application Form
```
/frontend-design

Building Creator Application Form for PHASE-4A-CREATOR-ONBOARDING-FLOW.

Requirements:
- 4-step wizard with progress bar
- Step indicators showing completed/current/upcoming
- Form validation per step
- Auto-save indicator ("Saving progress...")
- Resume banner for returning users
- Mobile-friendly layout

Layout:
- Desktop: 2-column (marketing content left, form right)
- Mobile: Single column with form only

User context:
- New creators applying to join the program
- May abandon and return later
- Need clear indication of progress and requirements
```

### Teleprompter
```
/frontend-design

Building Teleprompter for PHASE-4A-CREATOR-ONBOARDING-FLOW.

Requirements:
- Full-screen dark mode interface
- Large, scrollable script text
- Center line indicator (where to read)
- Controls panel (auto-hide during playback):
  - Play/pause (large center button)
  - Speed slider (1-5)
  - Font size +/-
  - Reset button
  - Mirror toggle
- Shot markers as visual dividers
- Mobile gestures: tap to pause, swipe for speed

Design:
- Dark background (#000) for camera recording
- High contrast text (white)
- Green accent for brand (#374d42)
- Touch-friendly controls
```

### Welcome Call Scheduler
```
/frontend-design

Building Welcome Call Scheduler for PHASE-4A-CREATOR-ONBOARDING-FLOW.

Requirements:
- Date picker showing next 5 weekdays
- Timezone dropdown with common US timezones
- Time slot grid (2 columns)
- Selected slot confirmation summary
- Skip option for users who prefer not to schedule

Layout:
- Centered card on light background
- Clear date/time display
- Host name shown on each slot

User context:
- New creators completing onboarding
- Want to quickly schedule or skip
- May be on mobile
```

---

## Constraints

- Application form must work without authentication
- Draft data stored with email as key (no user ID yet)
- Survey questions are tenant-configurable
- Welcome call scheduling integrates with PHASE-2SC system
- Meta Pixel Lead event for marketing attribution

---

## Pattern References

**Skills to invoke:**
- `/frontend-design` - REQUIRED for all UI components

**MCPs to consult:**
- Context7 MCP: "React multi-step form patterns"
- Context7 MCP: "Auto-save form draft implementation"

**RAWDOG code to reference:**
- `src/components/creator-portal/OnboardingForm.tsx` - Form implementation
- `src/components/creator-portal/Teleprompter.tsx` - Teleprompter component
- `src/components/creator-portal/onboarding/ScheduleCallStep.tsx` - Scheduling UI
- `src/app/creator/join/page.tsx` - Application page layout
- `src/lib/creator-portal/types.ts` - Type definitions

---

## Tasks

### [PARALLEL] Database and Types
- [ ] Create `creator_applications` table migration
- [ ] Create `creator_application_drafts` table migration
- [ ] Create `tenant_onboarding_settings` table migration
- [ ] Define TypeScript interfaces for form data

### [PARALLEL with above] Application Form
- [ ] Build OnboardingForm component with 4 steps
- [ ] Implement step validation logic
- [ ] Add auto-save draft functionality
- [ ] Add resume application via URL parameter
- [ ] Build success page

### [PARALLEL with above] API Routes
- [ ] Create application submission endpoint
- [ ] Create draft save/load endpoints
- [ ] Create resume endpoint
- [ ] Create admin application list endpoint

### [SEQUENTIAL after APIs] Welcome Call Integration
- [ ] Add welcome call settings to tenant config
- [ ] Build ScheduleCallStep component
- [ ] Integrate with internal scheduling (PHASE-2SC)
- [ ] Support external calendar embed/redirect

### [PARALLEL] Teleprompter
- [ ] Build Teleprompter component
- [ ] Implement shot marker parsing
- [ ] Add keyboard shortcuts
- [ ] Add mobile gesture support
- [ ] Persist preferences to localStorage

### [SEQUENTIAL after all] Admin UI
- [ ] Build pending applications list in admin
- [ ] Add approve/reject actions
- [ ] Add onboarding settings configuration page

---

## Definition of Done

- [ ] 4-step application form working with validation
- [ ] Auto-save drafts after 1.5s of inactivity
- [ ] Resume application via URL parameter
- [ ] Welcome call scheduling (internal or external)
- [ ] Teleprompter with all playback controls
- [ ] Success page displays after submission
- [ ] Admin can view and manage applications
- [ ] `npx tsc --noEmit` passes
- [ ] Manual testing: full application flow works
