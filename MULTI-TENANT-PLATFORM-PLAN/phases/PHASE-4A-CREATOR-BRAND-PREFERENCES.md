# PHASE-4A-BRAND: Creator Brand Preferences

**Duration**: 0.5 weeks (integrated with Week 16)
**Depends On**: PHASE-4A (creator portal foundation)
**Parallel With**: PHASE-4A core tasks
**Blocks**: None

---

## Goal

Enable creators to manage per-brand preferences and settings when working with multiple brands. Creators should be able to view and configure brand-specific settings, manage their relationship with each brand, and understand their terms per brand.

---

## Success Criteria

- [ ] Brand relationship list showing all active brands
- [ ] Per-brand preference editing
- [ ] Brand-specific notification preferences (optional)
- [ ] Discount code display per brand
- [ ] Commission rate visibility per brand
- [ ] Brand-specific sample product address (if different)

---

## Deliverables

### Brand Relationships Page

Dedicated page at `/creator/brands` or integrated into settings.

**Brand List:**
- Grid or list of all brand memberships
- Each brand shows:
  - Brand logo and name
  - Status (Active, Paused, Inactive)
  - Commission rate
  - Discount code (copyable)
  - Active projects count
  - Total earned from this brand

**API Routes:**
- `GET /api/creator/brands` - List brand memberships with stats

### Brand Detail View

Per-brand detail at `/creator/brands/[brandId]` or modal.

**Brand Info:**
- Brand name and logo
- Joined date
- Status indicator
- Coordinator contact (if assigned)

**Earnings from Brand:**
- Total earned (all time)
- Current balance (available)
- Pending balance
- YTD earnings

**Creator Terms:**
- Commission percentage
- Discount code (copyable with share link)
- Payment terms (net 30, etc.)
- Sample product entitlement (if applicable)

**Projects with Brand:**
- List of past and active projects
- Quick link to projects filtered by brand

**API Routes:**
- `GET /api/creator/brands/[id]` - Brand detail with earnings

### Brand-Specific Settings

Per-brand configuration options.

**Notification Preferences (Per-Brand):**
- Override global notification settings for specific brands
- Example: "Mute all notifications from Brand X"
- Notification types: project updates, messages, payments

**Sample Shipping Address (Per-Brand):**
- Override default shipping for this brand's samples
- Useful if creator has multiple locations

**Communication Preferences:**
- Preferred contact method for this brand
- Preferred project coordinator (if multiple)

**Database:**
- `public.creator_brand_preferences`: creator_id, brand_id, notification_overrides (JSONB), sample_address (JSONB), preferences (JSONB)

**API Routes:**
- `GET /api/creator/brands/[id]/preferences` - Get brand preferences
- `PATCH /api/creator/brands/[id]/preferences` - Update preferences

### Discount Code Sharing

Enhanced discount code display with sharing features.

**Features:**
- Copyable discount code with click-to-copy
- Share link with OG preview (`/d/{CODE}`)
- QR code generation for physical sharing
- Tracking: uses count, revenue attributed

**UI Component:**
- Code display with copy button
- "Share" button opening share options
- QR code download button

---

## Database

**New Table: `public.creator_brand_preferences`**

```sql
CREATE TABLE public.creator_brand_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES creators(id),
  brand_id UUID NOT NULL REFERENCES organizations(id),
  notification_overrides JSONB DEFAULT '{}',
  sample_address JSONB,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(creator_id, brand_id)
);

CREATE INDEX idx_cbp_creator ON creator_brand_preferences(creator_id);
```

**notification_overrides schema:**
```json
{
  "mute_all": false,
  "project_assigned": { "email": true, "sms": false },
  "message_received": { "email": false, "sms": false }
}
```

---

## Constraints

- Creators can only see brands they have a membership with
- Commission rates are read-only (set by admin)
- Discount codes are read-only (assigned by admin)
- Brand preferences don't affect admin-side settings
- Per-brand notifications merge with global (per-brand overrides)

---

## Pattern References

**RAWDOG code to reference:**
- `src/app/creator/dashboard/page.tsx` - Brand earnings cards
- `src/lib/creator-portal/types.ts` - BrandMembership interface

---

## Frontend Design Skill Integration

**1. Brand Relationships Page:**
```
/frontend-design

Building brand relationships page for PHASE-4A-BRAND.

Requirements:
- Brand cards grid:
  - Logo, name, status badge
  - Commission rate display
  - Discount code with copy button
  - Earnings from brand
  - Active projects count
- "View Details" link on each card
- Empty state if no brands

Design:
- Card grid layout (2-3 columns)
- Brand logo prominent
- Status clearly indicated
- Discount code easily copyable
```

**2. Brand Detail Modal/Page:**
```
/frontend-design

Building brand detail view for PHASE-4A-BRAND.

Requirements:
- Header: Brand logo, name, status
- Stats grid:
  - Total Earned, Available, Pending, YTD
- Terms section:
  - Commission %, Discount Code, Payment terms
- Projects list (recent 5)
- Settings section:
  - Notification override toggles
  - Sample address override

Design:
- Modal or full page
- Clear section dividers
- Settings collapsible
- Action buttons at bottom
```

**3. Discount Code Share:**
```
/frontend-design

Building discount code share component for PHASE-4A-BRAND.

Requirements:
- Code display: Large, monospace text
- Copy button with feedback
- Share button opening menu:
  - Copy link
  - Download QR code
  - Share to social (optional)
- Usage stats: Uses count, Revenue

Design:
- Card format
- Click-to-copy interaction
- QR code preview
- Stats below code
```

---

## Tasks

### [PARALLEL] Brand list API
- [ ] Create `GET /api/creator/brands` - List memberships with stats
- [ ] Include: commission, discount code, projects count, earnings

### [PARALLEL] Brand detail API
- [ ] Create `GET /api/creator/brands/[id]` - Full brand detail
- [ ] Include: coordinator, terms, earnings breakdown

### [PARALLEL] Brand preferences API
- [ ] Create migration for `creator_brand_preferences` table
- [ ] Create `GET /api/creator/brands/[id]/preferences`
- [ ] Create `PATCH /api/creator/brands/[id]/preferences`

### [PARALLEL] Brand relationships UI
- [ ] Build brands list page at `/creator/brands`
- [ ] Build brand cards with stats
- [ ] Build brand detail modal or page
- [ ] Build discount code share component

### [PARALLEL] Brand settings UI
- [ ] Build per-brand notification overrides
- [ ] Build sample address override form
- [ ] Integrate with brand detail view

---

## Definition of Done

- [ ] Creator can view all brand relationships
- [ ] Brand detail shows earnings and terms
- [ ] Discount code is copyable with share options
- [ ] Per-brand preferences save correctly
- [ ] Notification overrides apply correctly
- [ ] `npx tsc --noEmit` passes
