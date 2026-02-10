# PHASE-2O: Commerce - Surveys Complete System

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

- [ ] Survey dashboard with response analytics
- [ ] Slack integration for real-time responses
- [ ] Attribution insights from survey data
- [ ] Response export capabilities
- [ ] Survey question customization

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

- [ ] Survey dashboard with response analytics
- [ ] Attribution breakdown charts
- [ ] Response list with filters and export
- [ ] Survey question customization
- [ ] Slack integration with OAuth
- [ ] Real-time and digest notifications
- [ ] Shopify checkout extension (see PHASE-34)
- [ ] Integration with attribution system
- [ ] All APIs listed with tenant isolation
- [ ] Database schema specified
- [ ] Background jobs specified
