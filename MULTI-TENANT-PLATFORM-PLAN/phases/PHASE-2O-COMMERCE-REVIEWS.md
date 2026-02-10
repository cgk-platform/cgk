# PHASE-2O: Commerce - Reviews Complete System

**Duration**: 1 week (after PHASE-2B)
**Depends On**: PHASE-2B-ADMIN-COMMERCE (base reviews list)
**Parallel With**: PHASE-2O-COMMERCE-SUBSCRIPTIONS, PHASE-2O-COMMERCE-ANALYTICS

---

## ⚠️ MANDATORY: Tenant Isolation

**READ FIRST**: [TENANT-ISOLATION.md](../TENANT-ISOLATION.md)

Reviews contain customer UGC and purchase verification data - must be tenant-isolated.
- ALL review queries use `withTenant(tenantId, ...)`
- Review email templates customizable per-tenant
- Provider toggle (Yotpo/Internal) per-tenant
- Incentive codes scoped to tenant

---

## Goal

Document and specify the complete review management system including all 13 sub-pages: main list, pending queue, email queue, email logs, email stats, emails templates, bulk send, bulk send templates, analytics, incentive codes, questions (Q&A), settings, and migration.

---

## Success Criteria

- [ ] All 13 review admin pages fully specified
- [ ] Provider abstraction (Yotpo vs Internal) documented
- [ ] Email request system with queue and templates
- [ ] Bulk send campaigns fully specified
- [ ] Incentive code management
- [ ] Q&A moderation system
- [ ] Analytics with actionable insights
- [ ] Migration tools for provider switching

---

## Complete Page Specifications

### 1. `/admin/reviews` - Main Review List

**Purpose**: Central review management with moderation tools

**Key Features**:
- DataTable with columns: Checkbox, Review (author + content preview), Product, Rating (stars), Status, Date, Actions
- Status tabs: All, Pending, Approved, Rejected
- Filters: Product, Rating, Search, Date range
- Bulk actions: Approve, Reject, Mark Verified, Unmark Verified, Delete

**Per Review Actions**:
- Approve / Reject
- Reply to review
- Toggle verified purchase status
- Expand full review content
- View attached media (lightbox)

**Review Card Display**:
- Author name with verified badge toggle
- Star rating (visual)
- Title and content (expandable)
- Product name
- Media attachments (thumbnails)
- Response indicator if replied

---

### 2. `/admin/reviews/pending` - Moderation Queue

**Purpose**: Focused view for pending reviews requiring moderation

**Key Features**:
- Card-based layout (not table)
- Reviews sorted by oldest first (FIFO)
- Quick approve/reject buttons
- Full review content visible
- Media preview inline
- Batch keyboard shortcuts (j/k for navigation, a for approve, r for reject)

**Queue Management**:
- Count of pending reviews
- Estimated time to clear queue
- Auto-refresh every 30 seconds
- Filter by product
- Priority indicators (high-value customers)

---

### 3. `/admin/reviews/email-queue` - Email Request Queue

**Purpose**: View and manage review request emails

**Key Features**:
- Queue status: Pending, Sent, Failed, Bounced
- Columns: Customer, Email, Order #, Product, Status, Scheduled, Sent At, Actions
- Filters: Status, Date range, Product
- Bulk actions: Cancel pending, Retry failed

**Per Email Actions**:
- View email content
- Cancel (if pending)
- Retry (if failed)
- Resend (if sent)
- View delivery status

**Queue Stats**:
- Total in queue
- Sent today/this week
- Delivery rate
- Open rate
- Click rate

---

### 4. `/admin/reviews/email-logs` - Email Delivery Logs

**Purpose**: Detailed logs of all review-related email activity

**Log Entry Fields**:
- Timestamp
- Email type (request, reminder, thank you)
- Recipient email
- Order ID
- Product
- Status (sent, delivered, opened, clicked, bounced, failed)
- Error message (if failed)

**Features**:
- Searchable by email, order ID
- Date range filter
- Status filter
- Export to CSV
- Detailed view with full email content

---

### 5. `/admin/reviews/email-stats` - Email Analytics

**Purpose**: Analytics on review email performance

**Dashboard Sections**:
1. **Overview Metrics**:
   - Emails sent (period)
   - Delivery rate
   - Open rate
   - Click rate
   - Review submission rate

2. **Funnel Visualization**:
   - Sent → Delivered → Opened → Clicked → Reviewed

3. **Performance by Product**:
   - Response rate per product
   - Best/worst performing products

4. **Time Analysis**:
   - Best send times (day of week, time of day)
   - Response time distribution

5. **Trend Charts**:
   - Submissions over time
   - Rate trends

**Date Range**: Last 7d, 30d, 90d, Custom

---

### 6. `/admin/reviews/emails` - Email Templates

**Purpose**: Manage review request email templates

**Template Types**:
- Initial review request
- First reminder (X days after request)
- Second reminder (X days after first)
- Photo request (after text review)
- Thank you (after submission)
- Incentive delivery (with discount code)

**Per Template**:
- Subject line with variables
- Body content (WYSIWYG)
- Available variables:
  - {{customer_name}}
  - {{product_name}}
  - {{order_number}}
  - {{review_link}}
  - {{incentive_code}}
  - {{brand_name}}
- Preview with sample data
- Test send
- Enable/disable toggle
- Delay configuration (days after trigger)

---

### 7. `/admin/reviews/bulk-send` - Bulk Send Tool

**Purpose**: Send review requests to past customers in bulk

**Workflow**:
1. **Customer Selection**:
   - Date range (order date)
   - Product filter
   - Already reviewed filter (exclude)
   - Already requested filter (exclude)
   - Minimum order value

2. **Preview**:
   - Count of customers to send
   - Sample customer list
   - Estimated completion time

3. **Template Selection**:
   - Choose from bulk send templates
   - Preview with sample data

4. **Scheduling**:
   - Send immediately
   - Schedule for specific date/time
   - Drip send (X per hour/day)

5. **Execution**:
   - Progress bar
   - Real-time sent count
   - Error logging

---

### 8. `/admin/reviews/bulk-send-templates` - Bulk Send Templates

**Purpose**: Manage templates specifically for bulk campaigns

**Template Features**:
- Name and description
- Subject line
- Body content (WYSIWYG)
- Incentive integration (optional code)
- A/B test variants (optional)

**Template Management**:
- Create/Edit/Delete
- Duplicate template
- Performance history per template
- Archive unused templates

---

### 9. `/admin/reviews/analytics` - Review Analytics

**Purpose**: Comprehensive analytics on reviews and products

**Dashboard Sections**:
1. **Review Volume**:
   - Total reviews (all time)
   - Reviews this month
   - Reviews trend (chart)
   - Reviews by status breakdown

2. **Rating Analysis**:
   - Average rating (overall)
   - Rating distribution (histogram)
   - Rating trend over time
   - Ratings by product

3. **Product Performance**:
   - Average rating per product
   - Review count per product
   - Products needing reviews
   - Top reviewed products

4. **Sentiment Analysis** (if enabled):
   - Positive/Negative/Neutral breakdown
   - Common themes
   - Word cloud

5. **Response Metrics**:
   - Response rate
   - Average response time
   - Impact of responses on rating

6. **Media Analytics**:
   - Reviews with photos
   - Photo submission rate
   - Impact of photos on conversion

**Export**: PDF report, CSV data

---

### 10. `/admin/reviews/incentive-codes` - Incentive Code Management

**Purpose**: Manage discount codes offered for reviews

**Features**:
1. **Active Incentive Program**:
   - Enable/disable toggle
   - Discount type (percentage, fixed amount)
   - Discount value
   - Minimum review requirements (rating, word count, photo)
   - Expiration days

2. **Code Generation**:
   - Auto-generated unique codes
   - Bulk generate codes
   - Code prefix configuration

3. **Code Tracking**:
   - Codes issued
   - Codes redeemed
   - Redemption rate
   - Revenue from incentivized purchases

4. **Code List**:
   - Code, Customer, Review ID, Issued Date, Status (active, redeemed, expired)
   - Filter by status
   - Export to CSV

---

### 11. `/admin/reviews/questions` - Q&A Management

**Purpose**: Manage product questions and answers (separate from reviews)

**Features**:
1. **Question List**:
   - Product, Question, Asked by, Status, Date
   - Filters: Product, Status (unanswered, answered)
   - Search

2. **Question Detail**:
   - Full question text
   - Customer info
   - Product info
   - Answer input
   - Mark as answered

3. **Answer Templates**:
   - Common answer templates
   - Quick insert

4. **Moderation**:
   - Approve/reject questions
   - Flag inappropriate content
   - Auto-moderation rules

5. **Analytics**:
   - Questions by product
   - Response time
   - Unanswered queue size

---

### 12. `/admin/reviews/settings` - Review Settings

**Purpose**: Configure review system behavior and provider

**Sections**:
1. **Provider Configuration**:
   - Provider selection: Internal / Yotpo
   - Yotpo API credentials (if selected)
   - Sync settings

2. **Collection Settings**:
   - Days after order to send request
   - Number of reminders
   - Days between reminders
   - Order status trigger (delivered, fulfilled)

3. **Moderation Settings**:
   - Auto-approve reviews (yes/no)
   - Auto-approve criteria (rating threshold, verified only)
   - Profanity filter
   - Spam detection

4. **Display Settings**:
   - Show verified purchase badge
   - Allow media attachments
   - Maximum media per review
   - Allow star ratings only
   - Minimum review length

5. **Incentive Settings**:
   - Enable incentives
   - Incentive configuration
   - Photo bonus

6. **Integration Settings**:
   - Shopify sync
   - Klaviyo sync
   - Widget embed code

---

### 13. `/admin/reviews/migration` - Review Migration

**Purpose**: Migrate reviews between providers

**Features**:
1. **Import**:
   - Source: Yotpo, Judge.me, Stamped, Loox, CSV
   - Field mapping
   - Validation preview
   - Import execution

2. **Export**:
   - Export all reviews
   - Export by product
   - Export by date range
   - Format: CSV, JSON

3. **Provider Switch**:
   - Migrate from Yotpo to Internal
   - Migrate from Internal to Yotpo
   - Sync verification

4. **Migration History**:
   - Past migrations
   - Status, counts, errors

---

## Provider Abstraction Layer

```typescript
interface ReviewProvider {
  // Reviews
  getReviews(filters: ReviewFilters): Promise<PaginatedResult<Review>>
  getReview(id: string): Promise<Review>
  createReview(data: CreateReviewData): Promise<Review>
  updateReview(id: string, data: UpdateReviewData): Promise<Review>
  moderateReview(id: string, action: 'approve' | 'reject'): Promise<void>

  // Responses
  respondToReview(reviewId: string, response: string): Promise<ReviewResponse>
  updateResponse(responseId: string, content: string): Promise<ReviewResponse>
  deleteResponse(responseId: string): Promise<void>

  // Q&A
  getQuestions(filters: QuestionFilters): Promise<PaginatedResult<Question>>
  answerQuestion(questionId: string, answer: string): Promise<Answer>

  // Sync
  syncFromProvider(): Promise<SyncResult>
  pushToProvider(review: Review): Promise<void>

  // Widget
  getWidgetConfig(): WidgetConfig
}

class InternalReviewProvider implements ReviewProvider { ... }
class YotpoReviewProvider implements ReviewProvider { ... }
```

---

## Database Schema Additions

```sql
-- Review email queue
CREATE TABLE review_email_queue (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  customer_email VARCHAR(255) NOT NULL,
  customer_name VARCHAR(255),
  order_id VARCHAR(100) NOT NULL,
  product_id VARCHAR(100) NOT NULL,
  template_id UUID REFERENCES review_email_templates(id),
  status VARCHAR(50) DEFAULT 'pending', -- pending, sent, delivered, opened, clicked, bounced, failed
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  error_message TEXT,
  resend_id VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Review email templates
CREATE TABLE review_email_templates (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  type VARCHAR(50) NOT NULL, -- request, reminder_1, reminder_2, photo_request, thank_you, incentive
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  is_enabled BOOLEAN DEFAULT true,
  delay_days INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bulk send campaigns
CREATE TABLE review_bulk_campaigns (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name VARCHAR(255) NOT NULL,
  template_id UUID REFERENCES review_email_templates(id),
  filters JSONB NOT NULL,
  total_recipients INTEGER,
  sent_count INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'draft', -- draft, scheduled, in_progress, completed, cancelled
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Incentive codes
CREATE TABLE review_incentive_codes (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  code VARCHAR(100) UNIQUE NOT NULL,
  review_id UUID REFERENCES reviews(id),
  customer_email VARCHAR(255),
  discount_type VARCHAR(50) NOT NULL, -- percentage, fixed
  discount_value DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'active', -- active, redeemed, expired
  expires_at TIMESTAMPTZ,
  redeemed_at TIMESTAMPTZ,
  redeemed_order_id VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Q&A
CREATE TABLE product_questions (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  product_id VARCHAR(100) NOT NULL,
  customer_email VARCHAR(255),
  customer_name VARCHAR(255),
  question TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- pending, answered, rejected
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE product_answers (
  id UUID PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES product_questions(id),
  answer TEXT NOT NULL,
  answered_by VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Review settings
CREATE TABLE review_settings (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id),
  provider VARCHAR(50) DEFAULT 'internal', -- internal, yotpo
  provider_credentials JSONB,
  request_delay_days INTEGER DEFAULT 7,
  reminder_count INTEGER DEFAULT 2,
  reminder_interval_days INTEGER DEFAULT 3,
  auto_approve BOOLEAN DEFAULT false,
  auto_approve_min_rating INTEGER,
  profanity_filter BOOLEAN DEFAULT true,
  allow_media BOOLEAN DEFAULT true,
  max_media_count INTEGER DEFAULT 5,
  incentive_enabled BOOLEAN DEFAULT false,
  incentive_discount_type VARCHAR(50),
  incentive_discount_value DECIMAL(10,2),
  incentive_expiry_days INTEGER DEFAULT 30,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## API Routes Required

```
-- Reviews
GET    /api/admin/reviews
GET    /api/admin/reviews/[id]
POST   /api/admin/reviews/[id]/approve
POST   /api/admin/reviews/[id]/reject
POST   /api/admin/reviews/[id]/respond
DELETE /api/admin/reviews/[id]
POST   /api/admin/reviews/bulk (action: approve, reject, delete, verify)

-- Review Responses
PUT    /api/admin/reviews/responses/[id]
DELETE /api/admin/reviews/responses/[id]

-- Email Queue
GET    /api/admin/reviews/email-queue
POST   /api/admin/reviews/email-queue/cancel
POST   /api/admin/reviews/email-queue/retry
GET    /api/admin/reviews/email-logs
GET    /api/admin/reviews/email-stats

-- Email Templates
GET    /api/admin/reviews/emails
GET    /api/admin/reviews/emails/[id]
PUT    /api/admin/reviews/emails/[id]
POST   /api/admin/reviews/emails/[id]/test

-- Bulk Send
GET    /api/admin/reviews/bulk-send/campaigns
POST   /api/admin/reviews/bulk-send/campaigns
POST   /api/admin/reviews/bulk-send/campaigns/[id]/execute
DELETE /api/admin/reviews/bulk-send/campaigns/[id]
GET    /api/admin/reviews/bulk-send/preview

-- Bulk Send Templates
GET    /api/admin/reviews/bulk-send-templates
POST   /api/admin/reviews/bulk-send-templates
PUT    /api/admin/reviews/bulk-send-templates/[id]
DELETE /api/admin/reviews/bulk-send-templates/[id]

-- Incentive Codes
GET    /api/admin/reviews/incentive-codes
POST   /api/admin/reviews/incentive-codes/generate
GET    /api/admin/reviews/incentive-codes/stats

-- Q&A
GET    /api/admin/reviews/questions
GET    /api/admin/reviews/questions/[id]
POST   /api/admin/reviews/questions/[id]/answer
POST   /api/admin/reviews/questions/[id]/reject

-- Analytics
GET    /api/admin/reviews/analytics
GET    /api/admin/reviews/analytics/products
GET    /api/admin/reviews/analytics/trends

-- Settings
GET    /api/admin/reviews/settings
PUT    /api/admin/reviews/settings

-- Migration
POST   /api/admin/reviews/migration/import
POST   /api/admin/reviews/migration/export
GET    /api/admin/reviews/migration/history
```

---

## Definition of Done

- [ ] All 13 review pages documented with full specifications
- [ ] Provider abstraction layer (Internal vs Yotpo) defined
- [ ] Email queue with full lifecycle tracking
- [ ] Bulk send campaigns with scheduling
- [ ] Incentive code management with tracking
- [ ] Q&A system separate from reviews
- [ ] Analytics dashboard with actionable insights
- [ ] Migration tools for provider switching
- [ ] All APIs listed with tenant isolation
- [ ] Database schema additions specified
