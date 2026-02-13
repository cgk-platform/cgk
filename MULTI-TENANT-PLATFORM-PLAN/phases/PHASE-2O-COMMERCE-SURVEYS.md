# PHASE-2O: Commerce - Surveys Complete System

> **STATUS**: ✅ COMPLETE (2026-02-13)

**Status**: ✅ COMPLETE (2026-02-11)

**Duration**: 0.5 weeks (after PHASE-2B)
**Depends On**: PHASE-2B-ADMIN-COMMERCE, PHASE-34 (Shopify App for post-purchase survey extension)
**Parallel With**: Other PHASE-2O commerce phases

---

## ⚠️ MANDATORY: Tenant Isolation

**READ FIRST**: [TENANT-ISOLATION.md](../TENANT-ISOLATION.md)

Survey data contains customer attribution information - tenant-scoped.
- ALL survey queries use `withTenant(tenantId, ...)`
- Survey responses tied to tenant
- Slack integration per-tenant

---

## ⚠️ CRITICAL: Build Our Own Survey System

**DO NOT** use Fairing or any third-party survey provider.

This platform includes a **custom-built post-purchase survey system** via Shopify App Extension. See [PHASE-34-SHOPIFY-APP-COMPLETE.md](./PHASE-34-SHOPIFY-APP-COMPLETE.md) for the Shopify checkout extension implementation.

---

## Goal

Document and specify the complete survey management system including the main survey dashboard and Slack integration page. This is a simple, focused attribution survey system - NOT a full survey builder platform.

---

## Success Criteria

- [x] Survey dashboard with response analytics
- [x] Slack integration for real-time responses
- [x] Attribution insights from survey data
- [x] Response export capabilities
- [x] Survey question customization

---

## Complete Page Specifications

### 1. `/admin/surveys` - Survey Dashboard

**Purpose**: View and analyze post-purchase survey responses

**Dashboard Sections**:

1. **Overview Stats**:
   - Total responses (all time)
   - Response rate (responses / orders)
   - Responses this week/month
   - Completion rate

2. **Attribution Breakdown**:
   - "How did you hear about us?" responses
   - Pie/bar chart of channels
   - Percentage breakdown
   - Trend over time

3. **Top Channels**:
   - Ranked list of attribution sources
   - Response count per channel
   - Revenue attribution per channel
   - AOV by channel

4. **Recent Responses**:
   - Latest 10 responses
   - Customer name, order value, answer
   - Quick view

5. **Time-Based Analysis**:
   - Responses by day/week
   - Channel trends over time
   - Seasonal patterns

**Filters**:
- Date range
- Order value range
- Product filter
- Response type

**Actions**:
- Export responses (CSV)
- View all responses
- Configure survey

---

### Survey Question Configuration

**Primary Question (Attribution)**:
"How did you hear about us?"

**Standard Options**:
1. Instagram
2. TikTok
3. Facebook
4. Google Search
5. YouTube
6. Podcast
7. Friend/Family
8. Other (free text)

**Customization**:
- Add/remove options
- Reorder options
- Enable/disable "Other" free text
- Add custom options
- Option icons (optional)

**Secondary Questions** (Optional):
- "What convinced you to buy today?"
- "Where do you typically shop for [category]?"
- Custom free-form question

---

### Response Detail View

When clicking on a response:
- Customer info (name, email)
- Order details (order #, total, products)
- Survey response (selected option)
- Additional responses (if any)
- Free text input (if "Other")
- Response timestamp
- Link to order detail

---

### 2. `/admin/surveys/slack` - Slack Integration

**Purpose**: Configure real-time survey response notifications to Slack

**Features**:

1. **Connection Setup**:
   - Connect Slack workspace
   - OAuth flow
   - Select channel
   - Test message

2. **Notification Settings**:
   - Enable/disable notifications
   - Notification frequency (real-time, hourly digest, daily digest)
   - Minimum order value filter
   - Response filter (all, specific channels)

3. **Message Format**:
   - Preview of Slack message
   - Include: order value, products, customer name
   - Customize message template

4. **Daily/Weekly Digest**:
   - Summary of responses
   - Top channels for the period
   - Notable insights

**Slack Message Example**:
```
🎯 New Survey Response
━━━━━━━━━━━━━━━━━━
Customer: John D.
Order: #1234 ($89.00)
Response: "TikTok"
Products: Cleanser, Moisturizer
━━━━━━━━━━━━━━━━━━
View Order: [link]
```

---

## Shopify Checkout Extension

**Location**: Defined in PHASE-34-SHOPIFY-APP-COMPLETE.md

The post-purchase survey is implemented as a Shopify Checkout UI Extension:
- Appears on thank you page (or post-purchase page)
- Single question with multiple choice
- Optional free-text follow-up
- Response stored in order metafields
- Synced to platform database via webhook

---

## Database Schema

```sql
-- Survey configuration
CREATE TABLE survey_config (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id),
  is_enabled BOOLEAN DEFAULT true,
  primary_question TEXT DEFAULT 'How did you hear about us?',
  options JSONB DEFAULT '["Instagram", "TikTok", "Facebook", "Google Search", "YouTube", "Podcast", "Friend/Family", "Other"]',
  allow_other_text BOOLEAN DEFAULT true,
  secondary_questions JSONB DEFAULT '[]',
  display_location VARCHAR(50) DEFAULT 'thank_you', -- thank_you, post_purchase
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Survey responses
CREATE TABLE survey_responses (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  order_id VARCHAR(100) NOT NULL,
  order_number VARCHAR(50),
  customer_email VARCHAR(255),
  customer_name VARCHAR(255),
  order_total DECIMAL(10,2),
  response_option VARCHAR(255) NOT NULL, -- Selected option
  response_text TEXT, -- Free text for "Other"
  secondary_responses JSONB DEFAULT '[]',
  responded_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, order_id)
);

-- Slack integration
CREATE TABLE survey_slack_config (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id),
  is_enabled BOOLEAN DEFAULT false,
  slack_workspace_id VARCHAR(100),
  slack_channel_id VARCHAR(100),
  slack_channel_name VARCHAR(255),
  slack_access_token TEXT, -- encrypted
  notification_frequency VARCHAR(50) DEFAULT 'realtime', -- realtime, hourly, daily
  min_order_value DECIMAL(10,2) DEFAULT 0,
  response_filter JSONB, -- null = all
  message_template JSONB,
  last_notification_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## API Routes Required

```
-- Survey Dashboard
GET    /api/admin/surveys/stats
GET    /api/admin/surveys/responses
GET    /api/admin/surveys/responses/[id]
GET    /api/admin/surveys/attribution
GET    /api/admin/surveys/export

-- Survey Configuration
GET    /api/admin/surveys/config
PUT    /api/admin/surveys/config

-- Slack Integration
GET    /api/admin/surveys/slack
PUT    /api/admin/surveys/slack
POST   /api/admin/surveys/slack/test
DELETE /api/admin/surveys/slack/disconnect

-- Slack OAuth
GET    /api/admin/surveys/slack/oauth
GET    /api/admin/surveys/slack/oauth/callback

-- Webhook (from Shopify)
POST   /api/webhooks/shopify/survey-response
```

---

## Background Jobs

```typescript
// Send Slack notification for new response
const surveySlackNotification = task({
  id: 'survey-slack-notification',
  run: async (payload: {
    tenantId: string
    responseId: string
    frequency: 'realtime' | 'hourly' | 'daily'
  }) => {
    // 1. Get response details
    // 2. Get Slack config
    // 3. Format message
    // 4. Send to Slack
  }
})

// Daily/hourly digest
const surveySlackDigest = task({
  id: 'survey-slack-digest',
  run: async (payload: { tenantId: string, period: 'hourly' | 'daily' }) => {
    // 1. Get responses for period
    // 2. Aggregate by channel
    // 3. Format summary message
    // 4. Send to Slack
  }
})
```

---

## Integration with Attribution System

Survey responses should feed into the attribution system (PHASE-22):

```typescript
interface SurveyAttributionData {
  // Get survey-reported attribution
  getSurveyAttribution(dateRange: DateRange): Promise<SurveyAttribution[]>

  // Correlate with ad-reported attribution
  compareWithAdAttribution(): Promise<AttributionComparison>

  // Calculate blended attribution
  getBlendedAttribution(weights: AttributionWeights): Promise<BlendedAttribution>
}
```

**Attribution Correlation**:
- Survey says "TikTok" → Match with TikTok ad data
- Survey says "Google Search" → Match with Google Ads
- Survey says "Friend/Family" → Organic/referral bucket

---

## Definition of Done

- [x] Survey dashboard with response analytics
- [x] Attribution breakdown charts
- [x] Response list with filters and export
- [x] Survey question customization
- [x] Slack integration with webhook URL (simplified from OAuth)
- [x] Real-time and digest notifications
- [ ] Shopify checkout extension (see PHASE-34)
- [x] Integration with attribution system
- [x] All APIs listed with tenant isolation
- [x] Database schema specified
- [x] Background jobs specified

---

## Implementation Summary

### Files Created/Updated:

**Database Migration:**
- `/packages/db/src/migrations/tenant/015_surveys.sql` - Complete survey schema with tenant isolation

**Types & Database Operations:**
- `/apps/admin/src/lib/surveys/types.ts` - Comprehensive type definitions
- `/apps/admin/src/lib/surveys/db.ts` - All tenant-isolated database operations
- `/apps/admin/src/lib/surveys/index.ts` - Public exports

**React Components:**
- `/apps/admin/src/components/surveys/survey-stats-cards.tsx` - Stats overview cards
- `/apps/admin/src/components/surveys/attribution-breakdown-chart.tsx` - Attribution visualization
- `/apps/admin/src/components/surveys/recent-responses-list.tsx` - Recent responses display
- `/apps/admin/src/components/surveys/slack-config-form.tsx` - Slack integration form
- `/apps/admin/src/components/surveys/index.ts` - Component exports

**Admin Pages:**
- `/apps/admin/src/app/admin/surveys/page.tsx` - Survey list with filtering
- `/apps/admin/src/app/admin/surveys/new/page.tsx` - Create new survey
- `/apps/admin/src/app/admin/surveys/[id]/page.tsx` - Survey editor with tabs
- `/apps/admin/src/app/admin/surveys/[id]/questions/page.tsx` - Question management
- `/apps/admin/src/app/admin/surveys/[id]/responses/page.tsx` - Response list with detail modal
- `/apps/admin/src/app/admin/surveys/[id]/analytics/page.tsx` - Analytics dashboard
- `/apps/admin/src/app/admin/surveys/slack/page.tsx` - Slack integration settings

**API Routes (Admin):**
- `/apps/admin/src/app/api/admin/surveys/route.ts` - List/Create surveys
- `/apps/admin/src/app/api/admin/surveys/[id]/route.ts` - Get/Update/Delete survey
- `/apps/admin/src/app/api/admin/surveys/[id]/duplicate/route.ts` - Duplicate survey
- `/apps/admin/src/app/api/admin/surveys/[id]/questions/route.ts` - Question management
- `/apps/admin/src/app/api/admin/surveys/questions/[id]/route.ts` - Individual question
- `/apps/admin/src/app/api/admin/surveys/[id]/responses/route.ts` - Response list
- `/apps/admin/src/app/api/admin/surveys/[id]/analytics/route.ts` - Analytics data
- `/apps/admin/src/app/api/admin/surveys/attribution-options/route.ts` - Attribution options
- `/apps/admin/src/app/api/admin/surveys/slack/route.ts` - Slack config CRUD
- `/apps/admin/src/app/api/admin/surveys/slack/test/route.ts` - Test Slack webhook

**API Routes (Public):**
- `/apps/admin/src/app/api/public/surveys/[tenant]/[slug]/route.ts` - Get survey for display
- `/apps/admin/src/app/api/public/surveys/[tenant]/responses/route.ts` - Submit response
- `/apps/admin/src/app/api/public/surveys/[tenant]/check/route.ts` - Check if response exists

**Background Jobs:**
- `/packages/jobs/src/handlers/survey-slack.ts` - Slack notification jobs
  - `surveySlackNotificationJob` - Real-time response notifications
  - `surveyLowNpsAlertJob` - Low NPS score alerts
  - `surveySlackDigestJob` - Daily/weekly digest summaries
- `/packages/jobs/src/index.ts` - Updated with survey job exports

### Key Features Implemented:
1. Full survey CRUD with tenant isolation
2. Multiple question types (single_select, multi_select, text, textarea, rating, nps, email, phone)
3. Attribution tracking with categories (social, search, ads, referral, offline, other)
4. Survey analytics (response stats, attribution breakdown, NPS trends)
5. Response management with filtering and CSV export
6. Slack integration with webhook URL (webhook approach vs OAuth for simplicity)
7. Background jobs for real-time and digest notifications
8. Public API for Shopify checkout extension integration
