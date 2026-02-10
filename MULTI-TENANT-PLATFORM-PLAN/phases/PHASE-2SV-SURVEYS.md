# PHASE-2SV: Surveys & Post-Purchase Attribution

**Duration**: 2 weeks (Week 13-14)
**Depends On**: PHASE-2CM (email notifications), PHASE-2H-WORKFLOWS (automation engine), PHASE-5A-JOBS-SETUP (background jobs)
**Parallel With**: PHASE-3A-STOREFRONT (no dependencies)
**Blocks**: Attribution integration (Prompt 22)

---

## MANDATORY: Tenant Isolation

**READ FIRST**: [TENANT-ISOLATION.md](../TENANT-ISOLATION.md)

All survey data is tenant-scoped. Surveys, questions, and responses from Tenant A must NEVER be visible to Tenant B.

---

## Goal

Build a comprehensive survey system including:
1. **Post-purchase surveys** via Shopify App Extension (order confirmation page)
2. **Attribution data collection** ("How did you hear about us?")
3. **Survey builder** for tenant admins with multiple question types
4. **Response analytics** with charts and exports
5. **Slack integration** for real-time response notifications

**CRITICAL**: Build our OWN survey system - DO NOT integrate with Fairing or other third-party survey tools.

---

## Context: Shopify App Extension for Post-Purchase Surveys

Post-purchase surveys appear on the **order status page** (thank you page) via Shopify's Order Status Extensions. This is implemented as a **Shopify App Extension** in the `/shopify-app/` directory.

**Reference Shopify documentation:**
- Order Status UI Extensions
- Post-purchase checkout extensions
- Customer account extensions (for logged-in surveys)

**Extension Target**: `customer-account.order-status.block.render` or `Checkout::ThankYou::Block`

---

## Success Criteria

- [ ] Tenant admins can create, edit, and delete surveys
- [ ] Surveys support multiple question types (single-select, multi-select, text, rating, NPS)
- [ ] Conditional logic shows/hides questions based on previous answers
- [ ] Post-purchase survey displays on Shopify order confirmation page
- [ ] Attribution questions capture "How did you hear about us?" data
- [ ] Survey responses stored per-tenant with full isolation
- [ ] Response analytics show answer distribution, trends, and conversion
- [ ] Slack notifications fire for new survey responses
- [ ] Attribution data flows to attribution system (Prompt 22)
- [ ] Survey widget is mobile-optimized and respects tenant branding

---

## Deliverables

### Database Schema (in tenant schema)

```sql
-- Survey definitions
CREATE TABLE {tenant_schema}.surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Metadata
  name TEXT NOT NULL,
  description TEXT,
  slug TEXT NOT NULL UNIQUE,

  -- Type and trigger
  survey_type TEXT NOT NULL DEFAULT 'post_purchase',
    -- post_purchase, post_delivery, nps, custom
  trigger_config JSONB,
    -- { timing: 'immediate' | 'delay_hours', delay_hours?: number }

  -- Display settings
  title TEXT NOT NULL,
  subtitle TEXT,
  thank_you_message TEXT,
  redirect_url TEXT,

  -- Branding (inherits tenant theme by default)
  branding_config JSONB DEFAULT '{}',
    -- { primaryColor, backgroundColor, fontFamily }

  -- Status
  status TEXT DEFAULT 'draft', -- draft, active, paused, archived

  -- Targeting
  target_config JSONB DEFAULT '{}',
    -- { minOrderValue, productTags[], customerTags[], firstTimeOnly }

  -- Limits
  response_limit INTEGER, -- Max responses (null = unlimited)
  expires_at TIMESTAMPTZ,

  -- Multi-language
  locale TEXT DEFAULT 'en',
  translations JSONB DEFAULT '{}',

  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_surveys_status ON {tenant_schema}.surveys(status);
CREATE INDEX idx_surveys_type ON {tenant_schema}.surveys(survey_type);
CREATE UNIQUE INDEX idx_surveys_slug ON {tenant_schema}.surveys(slug);

-- Survey questions
CREATE TABLE {tenant_schema}.survey_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES {tenant_schema}.surveys(id) ON DELETE CASCADE,

  -- Question content
  question_text TEXT NOT NULL,
  help_text TEXT,

  -- Type
  question_type TEXT NOT NULL,
    -- single_select, multi_select, text, textarea, rating, nps, email, phone

  -- Options (for select types)
  options JSONB DEFAULT '[]',
    -- [{ id: string, label: string, value: string, isOther?: boolean }]

  -- Validation
  required BOOLEAN DEFAULT FALSE,
  validation_config JSONB DEFAULT '{}',
    -- { minLength, maxLength, pattern, min, max }

  -- Conditional logic
  show_when JSONB,
    -- { questionId: string, operator: 'equals'|'contains', value: string|string[] }

  -- Attribution flag
  is_attribution_question BOOLEAN DEFAULT FALSE,
    -- Marks this as the "How did you hear about us?" question

  -- Ordering
  display_order INTEGER NOT NULL DEFAULT 0,

  -- Multi-language
  translations JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_survey_questions_survey ON {tenant_schema}.survey_questions(survey_id, display_order);
CREATE INDEX idx_survey_questions_attribution ON {tenant_schema}.survey_questions(is_attribution_question)
  WHERE is_attribution_question = TRUE;

-- Attribution options (predefined + custom)
CREATE TABLE {tenant_schema}.attribution_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Display
  label TEXT NOT NULL,
  value TEXT NOT NULL UNIQUE,
  icon TEXT, -- Emoji or icon identifier

  -- Categorization
  category TEXT,
    -- social, search, referral, ads, offline, other

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_system BOOLEAN DEFAULT FALSE, -- System defaults cannot be deleted

  -- Ordering
  display_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_attribution_options_active ON {tenant_schema}.attribution_options(is_active, display_order);

-- Survey responses
CREATE TABLE {tenant_schema}.survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES {tenant_schema}.surveys(id) ON DELETE CASCADE,

  -- Context
  order_id TEXT, -- Shopify order ID (for post-purchase)
  customer_id TEXT, -- Shopify customer ID
  customer_email TEXT,

  -- Response metadata
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  is_complete BOOLEAN DEFAULT FALSE,

  -- Device/context
  user_agent TEXT,
  ip_address TEXT,
  locale TEXT,

  -- Calculated fields
  nps_score INTEGER, -- If NPS question included
  attribution_source TEXT, -- Extracted attribution answer

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_survey_responses_survey ON {tenant_schema}.survey_responses(survey_id, created_at DESC);
CREATE INDEX idx_survey_responses_order ON {tenant_schema}.survey_responses(order_id);
CREATE INDEX idx_survey_responses_customer ON {tenant_schema}.survey_responses(customer_id);
CREATE INDEX idx_survey_responses_complete ON {tenant_schema}.survey_responses(is_complete);
CREATE INDEX idx_survey_responses_attribution ON {tenant_schema}.survey_responses(attribution_source);

-- Individual question answers
CREATE TABLE {tenant_schema}.survey_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id UUID NOT NULL REFERENCES {tenant_schema}.survey_responses(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES {tenant_schema}.survey_questions(id) ON DELETE CASCADE,

  -- Answer data
  answer_value TEXT, -- Text answer or selected option value
  answer_values TEXT[], -- For multi-select
  answer_numeric DECIMAL, -- For rating/NPS
  answer_json JSONB, -- For complex answers

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(response_id, question_id)
);

CREATE INDEX idx_survey_answers_response ON {tenant_schema}.survey_answers(response_id);
CREATE INDEX idx_survey_answers_question ON {tenant_schema}.survey_answers(question_id);

-- Slack notification config
CREATE TABLE {tenant_schema}.survey_slack_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID REFERENCES {tenant_schema}.surveys(id) ON DELETE CASCADE,

  -- NULL survey_id = global config for all surveys

  -- Slack settings
  webhook_url TEXT NOT NULL, -- Encrypted
  channel_name TEXT,

  -- Notification settings
  notify_on_complete BOOLEAN DEFAULT TRUE,
  notify_on_nps_low BOOLEAN DEFAULT TRUE, -- NPS <= 6
  nps_low_threshold INTEGER DEFAULT 6,

  -- Digest settings
  daily_digest BOOLEAN DEFAULT FALSE,
  weekly_digest BOOLEAN DEFAULT FALSE,
  digest_day INTEGER DEFAULT 1, -- Monday
  digest_hour INTEGER DEFAULT 9,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_survey_slack_survey ON {tenant_schema}.survey_slack_config(survey_id);
```

### Default Attribution Options

These are seeded for each new tenant:

```typescript
const DEFAULT_ATTRIBUTION_OPTIONS = [
  // Social
  { category: 'social', label: 'TikTok', value: 'tiktok', icon: '🎵', isSystem: true },
  { category: 'social', label: 'Instagram', value: 'instagram', icon: '📸', isSystem: true },
  { category: 'social', label: 'Facebook', value: 'facebook', icon: '👍', isSystem: true },
  { category: 'social', label: 'YouTube', value: 'youtube', icon: '📺', isSystem: true },
  { category: 'social', label: 'Twitter/X', value: 'twitter', icon: '🐦', isSystem: true },

  // Search
  { category: 'search', label: 'Google Search', value: 'google_search', icon: '🔍', isSystem: true },
  { category: 'search', label: 'Bing Search', value: 'bing_search', icon: '🔎', isSystem: true },

  // Ads
  { category: 'ads', label: 'Facebook/Instagram Ad', value: 'meta_ads', icon: '📣', isSystem: true },
  { category: 'ads', label: 'TikTok Ad', value: 'tiktok_ads', icon: '🎯', isSystem: true },
  { category: 'ads', label: 'Google Ad', value: 'google_ads', icon: '💰', isSystem: true },

  // Referral
  { category: 'referral', label: 'Friend or Family', value: 'friend_family', icon: '👥', isSystem: true },
  { category: 'referral', label: 'Influencer/Creator', value: 'influencer', icon: '⭐', isSystem: true },
  { category: 'referral', label: 'Podcast', value: 'podcast', icon: '🎙️', isSystem: true },
  { category: 'referral', label: 'Blog/Article', value: 'blog', icon: '📝', isSystem: true },

  // Offline
  { category: 'offline', label: 'Retail Store', value: 'retail', icon: '🏪', isSystem: true },
  { category: 'offline', label: 'Event/Conference', value: 'event', icon: '🎪', isSystem: true },
  { category: 'offline', label: 'Print Ad/Mailer', value: 'print', icon: '📰', isSystem: true },

  // Other
  { category: 'other', label: 'Other (please specify)', value: 'other', icon: '✏️', isSystem: true },
]
```

### Shopify App Extension

**Location**: `/shopify-app/extensions/post-purchase-survey/`

```
post-purchase-survey/
├── src/
│   ├── index.tsx              # Extension entry point
│   ├── Survey.tsx             # Main survey component
│   ├── Question.tsx           # Question renderer by type
│   ├── ProgressBar.tsx        # Multi-step progress
│   ├── ThankYou.tsx           # Completion screen
│   ├── hooks/
│   │   ├── useSurvey.ts       # Survey data fetching
│   │   ├── useSubmit.ts       # Response submission
│   │   └── useBranding.ts     # Tenant branding
│   └── api.ts                 # API calls to platform
├── shopify.extension.toml
├── locales/
│   ├── en.default.json
│   └── es.json
└── package.json
```

**Extension Configuration** (`shopify.extension.toml`):

```toml
name = "Post-Purchase Survey"
type = "customer_account_ui_extension"
handle = "post-purchase-survey"

[[extensions.targeting]]
module = "./src/index.tsx"
target = "customer-account.order-status.block.render"

[extensions.capabilities]
api_access = true
network_access = true

[extensions.settings]
  [[extensions.settings.fields]]
    key = "survey_id"
    type = "single_line_text_field"
    name = "Survey ID"
    description = "The survey to display (leave empty for default post-purchase survey)"
```

**Extension Entry Point** (`src/index.tsx`):

```typescript
import { reactExtension, useApi, Banner, BlockStack } from '@shopify/ui-extensions-react/customer-account'
import { Survey } from './Survey'
import { useSurvey } from './hooks/useSurvey'

export default reactExtension(
  'customer-account.order-status.block.render',
  () => <PostPurchaseSurvey />
)

function PostPurchaseSurvey() {
  const { orderId, settings, sessionToken } = useApi()
  const surveyId = settings.current?.survey_id

  const { survey, loading, error } = useSurvey({
    surveyId,
    orderId,
    sessionToken,
  })

  if (loading) return null
  if (error || !survey) return null

  // Check if already completed
  if (survey.alreadyCompleted) return null

  return (
    <BlockStack spacing="base">
      <Survey
        survey={survey}
        orderId={orderId}
        sessionToken={sessionToken}
      />
    </BlockStack>
  )
}
```

### Survey Service (`packages/admin-core/src/lib/surveys/`)

```typescript
// surveys/index.ts
export * from './crud'
export * from './questions'
export * from './responses'
export * from './analytics'
export * from './slack'

// surveys/crud.ts
export async function getSurveys(tenantId: string, filters?: SurveyFilters): Promise<Survey[]>
export async function getSurvey(tenantId: string, surveyId: string): Promise<Survey | null>
export async function getSurveyBySlug(tenantId: string, slug: string): Promise<Survey | null>
export async function createSurvey(tenantId: string, data: CreateSurveyInput): Promise<Survey>
export async function updateSurvey(tenantId: string, surveyId: string, data: UpdateSurveyInput): Promise<Survey>
export async function deleteSurvey(tenantId: string, surveyId: string): Promise<void>
export async function duplicateSurvey(tenantId: string, surveyId: string): Promise<Survey>

// surveys/questions.ts
export async function getQuestions(tenantId: string, surveyId: string): Promise<SurveyQuestion[]>
export async function createQuestion(tenantId: string, surveyId: string, data: CreateQuestionInput): Promise<SurveyQuestion>
export async function updateQuestion(tenantId: string, questionId: string, data: UpdateQuestionInput): Promise<SurveyQuestion>
export async function deleteQuestion(tenantId: string, questionId: string): Promise<void>
export async function reorderQuestions(tenantId: string, surveyId: string, orderMap: Record<string, number>): Promise<void>

// surveys/responses.ts
export async function getResponses(tenantId: string, surveyId: string, options?: {
  startDate?: Date
  endDate?: Date
  isComplete?: boolean
  limit?: number
  offset?: number
}): Promise<{ responses: SurveyResponse[], total: number }>
export async function getResponse(tenantId: string, responseId: string): Promise<SurveyResponse | null>
export async function submitResponse(tenantId: string, data: SubmitResponseInput): Promise<SurveyResponse>
export async function exportResponses(tenantId: string, surveyId: string, format: 'csv' | 'xlsx'): Promise<Buffer>

// surveys/analytics.ts
export async function getSurveyStats(tenantId: string, surveyId: string, options?: {
  startDate?: Date
  endDate?: Date
}): Promise<SurveyStats>
export async function getQuestionStats(tenantId: string, questionId: string): Promise<QuestionStats>
export async function getAttributionBreakdown(tenantId: string, options?: {
  startDate?: Date
  endDate?: Date
}): Promise<AttributionBreakdown[]>
export async function getNpsOverTime(tenantId: string, options?: {
  surveyId?: string
  startDate?: Date
  endDate?: Date
  groupBy?: 'day' | 'week' | 'month'
}): Promise<NpsTrendData[]>

// surveys/slack.ts
export async function sendSurveyResponseNotification(tenantId: string, response: SurveyResponse): Promise<void>
export async function sendNpsAlertNotification(tenantId: string, response: SurveyResponse): Promise<void>
export async function sendDailyDigest(tenantId: string, surveyId?: string): Promise<void>
export async function sendWeeklyDigest(tenantId: string, surveyId?: string): Promise<void>
```

### Analytics Types

```typescript
interface SurveyStats {
  surveyId: string
  totalResponses: number
  completedResponses: number
  completionRate: number // percentage
  avgCompletionTime: number // seconds
  responsesByDay: Array<{
    date: string
    count: number
  }>
  questionStats: Array<{
    questionId: string
    questionText: string
    answerCounts: Record<string, number>
  }>
}

interface QuestionStats {
  questionId: string
  questionText: string
  questionType: string
  totalAnswers: number

  // For select questions
  optionBreakdown?: Array<{
    optionId: string
    optionLabel: string
    count: number
    percentage: number
  }>

  // For rating/NPS questions
  averageScore?: number
  scoreDistribution?: Record<number, number>

  // For text questions
  commonKeywords?: Array<{
    keyword: string
    count: number
  }>
}

interface AttributionBreakdown {
  source: string
  category: string
  count: number
  percentage: number
  revenue: number // Total order value from this source
  avgOrderValue: number
}

interface NpsTrendData {
  period: string
  promoters: number // 9-10
  passives: number // 7-8
  detractors: number // 0-6
  npsScore: number // (promoters - detractors) / total * 100
  responseCount: number
}
```

### UI Components

**Survey Builder:**
- `SurveyList` - List of all surveys with status, response count
- `SurveyEditor` - Create/edit survey with questions
- `QuestionList` - Drag-and-drop question ordering
- `QuestionEditor` - Configure question type, options, validation
- `ConditionBuilder` - Visual conditional logic builder
- `AttributionOptionsManager` - Add/edit attribution options
- `SurveyPreview` - Preview survey as customer sees it
- `BrandingEditor` - Customize survey colors/fonts

**Response Analytics:**
- `ResponseList` - Paginated response list with filters
- `ResponseDetail` - Individual response view with all answers
- `AnswerDistributionChart` - Pie/bar chart for select questions
- `NpsGaugeChart` - NPS score visualization
- `AttributionBreakdown` - Attribution source breakdown
- `TrendLineChart` - Response/NPS trends over time
- `ExportButton` - Export to CSV/Excel

**Slack Configuration:**
- `SlackIntegrationCard` - Connect/disconnect Slack
- `NotificationSettings` - Configure when to notify
- `DigestSettings` - Configure daily/weekly digests
- `TestNotificationButton` - Send test message

### Admin Pages

```
/admin/surveys                       # Survey list
/admin/surveys/new                   # Create new survey
/admin/surveys/[id]                  # Edit survey
/admin/surveys/[id]/questions        # Manage questions
/admin/surveys/[id]/responses        # Response list
/admin/surveys/[id]/analytics        # Analytics dashboard
/admin/surveys/[id]/settings         # Survey settings
/admin/surveys/attribution           # Attribution options management
/admin/surveys/slack                 # Slack integration settings
```

### API Routes

```
/api/admin/surveys/
  route.ts                           # GET list, POST create
  [id]/route.ts                      # GET, PATCH, DELETE survey
  [id]/duplicate/route.ts            # POST duplicate survey
  [id]/questions/route.ts            # GET questions, POST create
  [id]/questions/reorder/route.ts    # POST reorder questions
  [id]/responses/route.ts            # GET responses
  [id]/responses/export/route.ts     # GET export
  [id]/analytics/route.ts            # GET analytics
  [id]/stats/route.ts                # GET quick stats

  questions/
    [id]/route.ts                    # PATCH, DELETE question

  attribution-options/
    route.ts                         # GET list, POST create
    [id]/route.ts                    # PATCH, DELETE option

  slack/
    route.ts                         # GET config, POST update
    test/route.ts                    # POST send test

# Public API (for Shopify extension)
/api/public/surveys/
  [tenant]/[slug]/route.ts           # GET survey for display
  [tenant]/responses/route.ts        # POST submit response
  [tenant]/check/route.ts            # POST check if already completed
```

### Background Jobs

```typescript
// Process survey completion
export const processSurveyResponse = task({
  id: 'survey.process-response',
  run: async ({ tenantId, responseId }) => {
    // 1. Mark response as complete
    // 2. Extract attribution source if present
    // 3. Calculate NPS score if present
    // 4. Send Slack notification if configured
    // 5. Sync to attribution system
    // 6. Update survey stats cache
  }
})

// Daily survey digest
export const surveyDailyDigest = task({
  id: 'survey.daily-digest',
  // Cron: 0 9 * * *
  run: async ({ tenantId }) => {
    const configs = await getSlackConfigsWithDailyDigest(tenantId)
    for (const config of configs) {
      await sendDailyDigest(tenantId, config.surveyId)
    }
  }
})

// Weekly survey digest
export const surveyWeeklyDigest = task({
  id: 'survey.weekly-digest',
  // Cron: 0 9 * * 1 (Monday 9am)
  run: async ({ tenantId }) => {
    const configs = await getSlackConfigsWithWeeklyDigest(tenantId)
    for (const config of configs) {
      await sendWeeklyDigest(tenantId, config.surveyId)
    }
  }
})
```

---

## Shopify Extension Deployment

### Deployment Flow

1. Tenant configures survey in admin portal
2. Survey is synced to Shopify via Admin API metafields
3. Shopify extension reads survey config from metafields
4. Extension renders survey on order status page
5. Responses submitted to platform API
6. Platform processes and stores responses

### Metafield Structure

```typescript
// Stored on shop level
const surveyMetafield = {
  namespace: 'cgk_surveys',
  key: 'post_purchase_config',
  type: 'json',
  value: JSON.stringify({
    surveyId: 'uuid',
    enabled: true,
    targeting: {
      minOrderValue: 50,
      excludeTags: ['sample'],
    },
  }),
}
```

### Extension API Authentication

The Shopify extension authenticates to the platform using:
1. Session token from Shopify (verifies customer session)
2. Tenant identification from shop domain
3. HMAC signature verification

```typescript
// api.ts in extension
export async function submitSurveyResponse(data: ResponseData) {
  const sessionToken = await getSessionToken()

  const response = await fetch(`${PLATFORM_API_URL}/api/public/surveys/${tenantSlug}/responses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Session-Token': sessionToken,
      'X-Shop-Domain': shopDomain,
    },
    body: JSON.stringify(data),
  })

  return response.json()
}
```

---

## Integration with Attribution System

Survey responses with attribution data flow to the attribution system (Prompt 22):

```typescript
// After processing survey response
async function syncToAttribution(tenantId: string, response: SurveyResponse) {
  if (!response.attributionSource) return

  // Get order details from Shopify
  const order = await getShopifyOrder(tenantId, response.orderId)

  // Create attribution record
  await createAttributionRecord(tenantId, {
    source: 'survey',
    channel: response.attributionSource,
    orderId: response.orderId,
    customerId: response.customerId,
    orderValue: order.totalPrice,
    surveyResponseId: response.id,
    collectedAt: response.completedAt,
  })
}
```

---

## Constraints

- Survey responses are immutable after submission
- One response per order per survey (prevent duplicates)
- Extension must work offline (graceful degradation)
- Slack webhooks are encrypted at rest
- Attribution options: system defaults cannot be deleted, only hidden
- NPS calculation follows standard formula: (Promoters - Detractors) / Total * 100
- Survey must load in < 500ms on mobile

---

## Pattern References

**Skills to invoke:**
- `/frontend-design` - For survey builder, analytics UI
- Context7 MCP: "Shopify UI Extensions best practices"
- Shopify Dev MCP: Learn customer-account extensions

**Shopify documentation:**
- Customer Account UI Extensions
- Order Status Extensions
- App Extensions

**RAWDOG code to reference (if exists):**
- Check for any existing survey patterns

---

## Frontend Design Prompts

### Survey Builder

```
/frontend-design

Building Survey Builder for tenant admin (PHASE-2SV-SURVEYS).

Requirements:
- Multi-section form: Settings, Questions, Targeting, Branding
- Settings: Name, title, subtitle, thank you message
- Questions section:
  - Add question button
  - Question list with drag-to-reorder
  - Each question: Type selector, text input, options builder
  - Conditional logic builder (show if previous answer is X)
  - Required toggle, validation settings
- Targeting: Min order value, product tags, first-time only toggle
- Branding: Color pickers, font selector, preview

Layout:
- Left panel: Section tabs
- Center: Form for current section
- Right panel: Live preview showing survey as customer sees it

Design:
- Clean, form-heavy interface
- Question cards with type icons
- Drag handles for reordering
- Conditional logic shows as small badge on question
```

### Attribution Analytics

```
/frontend-design

Building Attribution Analytics Dashboard for PHASE-2SV-SURVEYS.

Requirements:
- Stats bar: Total responses, completion rate, avg NPS, top source
- Main chart: Attribution source breakdown (horizontal bar)
- Secondary chart: NPS trend over time (line)
- Table: Attribution sources with count, revenue, AOV
- Filters: Date range, survey selector

Layout:
- Full-width stats bar at top
- Two-column grid: Left = attribution breakdown, Right = NPS trend
- Full-width table below

Design:
- Chart colors match attribution categories (social = blue, ads = purple, etc.)
- NPS chart shows colored zones (red = detractor, yellow = passive, green = promoter)
- Source icons in table rows
```

---

## AI Discretion Areas

The implementing agent should determine the best approach for:

1. **Conditional logic complexity**: Simple "show if X" vs. nested AND/OR conditions
2. **Offline handling**: How the extension behaves if API is unreachable
3. **Response caching**: Whether to cache analytics or compute on-demand
4. **Multi-language**: Whether to build full i18n or start with English only
5. **NPS follow-up**: Whether to add automated follow-up for detractors

---

## Tasks

### [PARALLEL] Database & Schema
- [ ] Create `surveys` table with indexes
- [ ] Create `survey_questions` table with indexes
- [ ] Create `attribution_options` table with indexes
- [ ] Create `survey_responses` table with indexes
- [ ] Create `survey_answers` table with indexes
- [ ] Create `survey_slack_config` table with indexes
- [ ] Add schema migration scripts
- [ ] Seed default attribution options

### [PARALLEL] Core Services
- [ ] Implement survey CRUD operations
- [ ] Implement question CRUD operations
- [ ] Implement response submission logic
- [ ] Implement duplicate prevention
- [ ] Implement conditional logic evaluator
- [ ] Implement attribution extraction

### [PARALLEL] Analytics Services
- [ ] Implement survey stats calculation
- [ ] Implement question breakdown stats
- [ ] Implement attribution breakdown
- [ ] Implement NPS trend calculation
- [ ] Implement CSV/Excel export

### [PARALLEL] Slack Integration
- [ ] Implement Slack webhook config
- [ ] Implement response notification
- [ ] Implement low NPS alerts
- [ ] Implement daily digest
- [ ] Implement weekly digest
- [ ] Implement test notification

### [SEQUENTIAL after Core] API Routes
- [ ] Create survey CRUD routes
- [ ] Create question routes
- [ ] Create response routes
- [ ] Create analytics routes
- [ ] Create attribution options routes
- [ ] Create Slack config routes
- [ ] Create public survey routes (for extension)
- [ ] Add cache-busting headers

### [SEQUENTIAL after API] Shopify Extension
- [ ] Scaffold extension in `/shopify-app/`
- [ ] Build Survey component
- [ ] Build Question renderers for each type
- [ ] Build response submission hook
- [ ] Implement tenant branding
- [ ] Build thank you screen
- [ ] Test on dev store

### [SEQUENTIAL after API] UI - Survey Builder
- [ ] Invoke `/frontend-design` for SurveyBuilder
- [ ] Build SurveyList component
- [ ] Build SurveyEditor component
- [ ] Build QuestionList component
- [ ] Build QuestionEditor component
- [ ] Build ConditionBuilder component
- [ ] Build AttributionOptionsManager component
- [ ] Build SurveyPreview component

### [SEQUENTIAL after API] UI - Analytics
- [ ] Invoke `/frontend-design` for AnalyticsDashboard
- [ ] Build ResponseList component
- [ ] Build ResponseDetail component
- [ ] Build AnswerDistributionChart component
- [ ] Build NpsGaugeChart component
- [ ] Build AttributionBreakdown component
- [ ] Build TrendLineChart component

### [SEQUENTIAL after API] UI - Slack
- [ ] Build SlackIntegrationCard component
- [ ] Build NotificationSettings component
- [ ] Build DigestSettings component
- [ ] Build TestNotificationButton component

### [SEQUENTIAL after Components] Pages
- [ ] Create `/admin/surveys` page
- [ ] Create `/admin/surveys/new` page
- [ ] Create `/admin/surveys/[id]` page
- [ ] Create `/admin/surveys/[id]/questions` page
- [ ] Create `/admin/surveys/[id]/responses` page
- [ ] Create `/admin/surveys/[id]/analytics` page
- [ ] Create `/admin/surveys/attribution` page
- [ ] Create `/admin/surveys/slack` page

### [SEQUENTIAL after Pages] Background Jobs
- [ ] Create job: Process survey response
- [ ] Create job: Daily survey digest
- [ ] Create job: Weekly survey digest
- [ ] Create job: Sync attribution to external system

### [SEQUENTIAL after All] Integration & Testing
- [ ] Integrate with attribution system (Prompt 22)
- [ ] Deploy extension to Shopify dev store
- [ ] Test survey display on order status page
- [ ] Test response submission flow
- [ ] Test Slack notifications
- [ ] Tenant isolation tests
- [ ] Unit tests for analytics calculations

---

## Definition of Done

- [ ] Tenant can create surveys with multiple question types
- [ ] Conditional logic correctly shows/hides questions
- [ ] Post-purchase survey appears on Shopify order confirmation
- [ ] Survey respects tenant branding
- [ ] Responses are stored and correctly attributed
- [ ] Attribution data shows in analytics
- [ ] NPS score calculated and displayed
- [ ] Slack receives real-time notifications for new responses
- [ ] Daily/weekly digests sent on schedule
- [ ] Attribution data syncs to attribution system
- [ ] CSV/Excel export works correctly
- [ ] Tenant A cannot see Tenant B's surveys or responses
- [ ] Extension works on mobile devices
- [ ] `npx tsc --noEmit` passes
- [ ] Unit and integration tests pass
