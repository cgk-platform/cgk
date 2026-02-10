# PHASE-2CM-TEMPLATE-LIBRARY: Central Email Template Library

**Duration**: Week 10 (2 days)
**Depends On**: PHASE-2CM-TEMPLATES (per-function template editors)
**Parallel With**: PHASE-2CM-INBOUND-EMAIL
**Blocks**: None (nice-to-have convenience feature)

---

## Goal

Implement a **central template library UI** at `/admin/templates` that provides a unified view of ALL email templates across the platform. This is a convenience feature that aggregates templates from all functions (reviews, creators, e-sign, subscriptions, treasury, etc.) into a single dashboard.

**IMPORTANT**: This is NOT a marketing platform. The template library shows **notification templates only** - no campaign templates, drip sequences, or marketing email builders.

---

## Success Criteria

- [ ] Template library shows all notification templates grouped by function
- [ ] Each template links to its per-function editor
- [ ] Usage statistics shown per template (sends, opens, clicks if tracked)
- [ ] Search and filter across all templates
- [ ] Quick status indicators (custom vs default, last edited)
- [ ] Analytics page shows aggregate template performance

---

## Deliverables

### Admin Pages

```
/admin/templates/
├── page.tsx                    # Template library dashboard
├── analytics/
│   └── page.tsx                # Template performance analytics
└── [slug]/
    └── page.tsx                # Redirect to per-function editor
```

### Template Library Dashboard (`/admin/templates`)

**Purpose**: Single view of all notification templates across the platform.

**Layout**:
```
┌─────────────────────────────────────────────────────────────────┐
│ Template Library                              [Search] [Filter] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌─ Review Templates (6) ──────────────────────────────────────┐ │
│ │ review_request         ● Custom    Last edit: 2 days ago   │ │
│ │ review_request_incent  ○ Default   Never edited            │ │
│ │ review_reminder        ● Custom    Last edit: 1 week ago   │ │
│ │ review_thank_you       ○ Default   Never edited            │ │
│ │ review_verification    ○ Default   Never edited            │ │
│ │ [View all →]                                                │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─ Creator Templates (12) ────────────────────────────────────┐ │
│ │ application_approved   ● Custom    Last edit: 3 days ago   │ │
│ │ reminder_first         ● Custom    Last edit: 1 week ago   │ │
│ │ project_assigned       ○ Default   Never edited            │ │
│ │ payment_available      ● Custom    Last edit: 5 days ago   │ │
│ │ [View all →]                                                │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─ E-Sign Templates (5) ──────────────────────────────────────┐ │
│ │ signing_request        ○ Default   Never edited            │ │
│ │ signing_complete       ○ Default   Never edited            │ │
│ │ [View all →]                                                │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─ Subscription Templates (8) ────────────────────────────────┐ │
│ │ subscription_created   ● Custom    Last edit: 1 month ago  │ │
│ │ payment_failed         ● Custom    Last edit: 2 weeks ago  │ │
│ │ [View all →]                                                │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─ Treasury Templates (4) ────────────────────────────────────┐ │
│ │ approval_request       ○ Default   Never edited            │ │
│ │ [View all →]                                                │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─ Team Templates (2) ────────────────────────────────────────┐ │
│ │ team_invitation        ○ Default   Never edited            │ │
│ │ [View all →]                                                │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Template Card Information**:
- Template name (notification_type.template_key)
- Status indicator: ● Custom (tenant has edited) | ○ Default (using system default)
- Last edited date (if customized)
- Click to navigate to per-function editor

**Filter Options**:
- All | Custom Only | Default Only
- By Function: Reviews, Creators, E-Sign, Subscriptions, Treasury, Team
- Search by template name or content

### Template Categories

All templates grouped by function:

| Category | Count | Per-Function Editor Location |
|----------|-------|------------------------------|
| **Reviews** | 6 | `/admin/reviews/settings → Templates` |
| **Creators** | 12 | `/admin/creators/communications/templates` |
| **E-Sign** | 5 | `/admin/esign/templates → Email` |
| **Subscriptions** | 8 | `/admin/subscriptions/emails` |
| **Treasury** | 4 | `/admin/treasury/settings → Email` |
| **Team** | 2 | `/admin/settings/team → Email` |
| **Contractors** | 6 | `/admin/settings/notifications` |
| **Vendors** | 4 | `/admin/settings/notifications` |
| **System** | 3 | `/admin/settings/notifications` |

**Total**: ~50 notification templates

### Template Analytics Page (`/admin/templates/analytics`)

**Purpose**: Aggregate performance metrics across all templates.

**Metrics** (if email tracking enabled):

| Metric | Description |
|--------|-------------|
| **Total Sends** | Emails sent per template in time period |
| **Open Rate** | % of sent emails opened (if pixel tracking) |
| **Click Rate** | % of opened emails with link clicks |
| **Bounce Rate** | Failed delivery rate |
| **Unsubscribe Rate** | Opt-out rate after email |

**Views**:

1. **Summary Dashboard**
   - Total sends across all templates (last 7/30/90 days)
   - Top 5 templates by send volume
   - Bottom 5 templates by open rate
   - Templates with high bounce rates

2. **Per-Template Table**
   ```
   Template               | Sends | Open Rate | Click Rate | Bounce
   -----------------------|-------|-----------|------------|-------
   review_request         | 1,234 | 42%       | 18%        | 0.5%
   creator_payment_avail  |   456 | 68%       | 45%        | 0.2%
   subscription_created   |   890 | 55%       | 32%        | 0.3%
   ```

3. **Trend Charts**
   - Send volume over time (line chart)
   - Open rate trends (line chart)
   - Filter by template category

**Data Source**: Resend webhook events (email.opened, email.clicked, email.bounced)

### API Routes

```
/api/admin/templates/
├── route.ts                    # GET aggregated template list
├── analytics/
│   └── route.ts                # GET template analytics
└── [slug]/
    └── route.ts                # GET redirect info to per-function editor
```

#### GET `/api/admin/templates`

Returns all templates for tenant with metadata:

```typescript
interface TemplateListResponse {
  categories: {
    name: string
    slug: string
    editorPath: string // Path to per-function editor
    templates: {
      notificationType: string
      templateKey: string
      displayName: string
      isCustom: boolean
      lastEditedAt: string | null
      lastEditedBy: string | null
      sendCount?: number // Last 30 days
    }[]
  }[]
  totals: {
    total: number
    custom: number
    default: number
  }
}
```

#### GET `/api/admin/templates/analytics`

Returns aggregate analytics:

```typescript
interface TemplateAnalyticsResponse {
  period: '7d' | '30d' | '90d'
  summary: {
    totalSends: number
    avgOpenRate: number
    avgClickRate: number
    avgBounceRate: number
  }
  byTemplate: {
    notificationType: string
    templateKey: string
    displayName: string
    sends: number
    openRate: number
    clickRate: number
    bounceRate: number
  }[]
  trends: {
    date: string
    sends: number
    opens: number
    clicks: number
  }[]
}
```

### Database Requirements

No new tables required. Analytics query existing tables:

```sql
-- Get template usage stats
SELECT
  t.notification_type,
  t.template_key,
  t.is_default,
  t.last_edited_at,
  u.name as last_edited_by_name,
  (
    SELECT COUNT(*)
    FROM email_logs l
    WHERE l.tenant_id = t.tenant_id
      AND l.template_type = t.notification_type
      AND l.created_at > NOW() - INTERVAL '30 days'
  ) as send_count_30d
FROM tenant_email_templates t
LEFT JOIN users u ON t.last_edited_by = u.id
WHERE t.tenant_id = $1
ORDER BY t.notification_type, t.template_key;
```

---

## UI Components

### TemplateCategoryCard

```typescript
interface TemplateCategoryCardProps {
  category: {
    name: string
    slug: string
    editorPath: string
    templates: TemplateInfo[]
  }
  collapsed?: boolean
  showMax?: number // Default 4, show "View all" link if more
}

// Shows category header with count, list of templates, expand/collapse
```

### TemplateRow

```typescript
interface TemplateRowProps {
  template: TemplateInfo
  onClick: () => void // Navigate to editor
}

// Shows: Name, status badge (Custom/Default), last edited, click handler
```

### TemplateAnalyticsChart

```typescript
interface TemplateAnalyticsChartProps {
  data: TrendData[]
  metric: 'sends' | 'opens' | 'clicks'
  period: '7d' | '30d' | '90d'
}

// Line chart showing metric over time
```

---

## Constraints

- Template library is **read-only aggregation** - actual editing happens in per-function editors
- Clicking a template navigates to its per-function editor (not a duplicate editor)
- Analytics require Resend webhook integration for open/click tracking
- If tracking disabled, analytics page shows send counts only
- No marketing campaign templates - platform notifications only

---

## Pattern References

**RAWDOG code to reference:**
- No direct equivalent (new feature for multi-tenant platform)
- Similar pattern: Admin dashboard aggregating data from multiple sources

**Phase docs to reference:**
- PHASE-2CM-TEMPLATES.md - Template data structures and per-function editors
- PHASE-2CM-EMAIL-QUEUE.md - Email logs table structure

---

## AI Discretion Areas

The implementing agent should determine:
1. Whether to implement analytics if Resend tracking not configured (skip or show "Enable tracking" message)
2. Card vs table layout for template list
3. Whether "View all" expands inline or navigates to per-function page
4. Export functionality for template analytics (CSV/PDF)

---

## Tasks

### [PARALLEL] API Routes
- [ ] Implement GET `/api/admin/templates` with category aggregation
- [ ] Implement GET `/api/admin/templates/analytics` with metrics
- [ ] Add template category mapping (notification_type → editor path)

### [PARALLEL] UI Components
- [ ] Build TemplateCategoryCard component
- [ ] Build TemplateRow component
- [ ] Build search/filter functionality
- [ ] Build analytics charts (if tracking enabled)

### [SEQUENTIAL after components] Pages
- [ ] Build `/admin/templates/page.tsx` library dashboard
- [ ] Build `/admin/templates/analytics/page.tsx` analytics page
- [ ] Add navigation links to main admin sidebar

### [SEQUENTIAL after pages] Integration
- [ ] Add "Template Library" link to admin sidebar
- [ ] Ensure click-through to per-function editors works
- [ ] Add analytics data collection from Resend webhooks

---

## What This Phase Does NOT Include

**Explicitly OUT OF SCOPE:**
- Marketing campaign templates
- Drip sequence builders
- Email campaign scheduling
- Segment-based email targeting
- A/B testing of marketing emails
- Newsletter functionality

These features are NOT part of the platform. See PARALLEL-31 gap remediation prompt for clarification.

---

## Definition of Done

- [ ] Template library page shows all ~50 templates grouped by function
- [ ] Templates indicate Custom vs Default status
- [ ] Search filters templates by name
- [ ] Filter by category works
- [ ] Click navigates to per-function editor
- [ ] Analytics page shows send counts per template
- [ ] Analytics page shows open/click rates (if tracking enabled)
- [ ] No marketing campaign UI present
- [ ] `npx tsc --noEmit` passes
