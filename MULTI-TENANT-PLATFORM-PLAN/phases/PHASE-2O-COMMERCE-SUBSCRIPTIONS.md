# PHASE-2O: Commerce - Subscriptions Complete System

**Duration**: 1 week (after PHASE-2B)
**Depends On**: PHASE-2B-ADMIN-COMMERCE (base subscription list)
**Parallel With**: PHASE-2O-COMMERCE-REVIEWS, PHASE-2O-COMMERCE-ANALYTICS

---

## ⚠️ MANDATORY: Tenant Isolation

**READ FIRST**: [TENANT-ISOLATION.md](../TENANT-ISOLATION.md)

Subscription data includes revenue metrics and customer payment information - highly sensitive.
- ALL subscription queries use `withTenant(tenantId, ...)`
- Subscription provider credentials stored per-tenant
- Email templates are tenant-customizable
- Retention flows configured per-tenant

---

## Goal

Document and specify the complete subscription management system including all 10 sub-pages: list, detail, analytics, cutover, emails, migration, save-flows, selling-plans, settings, and validation.

---

## Success Criteria

- [ ] All 10 subscription admin pages fully specified
- [ ] Provider abstraction (Loop vs Custom) documented
- [ ] Email template system with queue integration
- [ ] Retention flows (save flows) fully specified
- [ ] Migration tools for provider switching
- [ ] Validation tools for data integrity
- [ ] All APIs tenant-isolated

---

## Complete Page Specifications

### 1. `/admin/subscriptions` - Dashboard

**Purpose**: Main subscription overview with KPIs and quick navigation

**Key Features**:
- MRR/ARR metrics display
- Active/Paused/Cancelled counts
- 30-day net change (new - churned)
- Upcoming orders calendar (next 30 days)
- Churn rate trend
- System status indicator (Loop vs Custom vs Hybrid)

**Quick Links**:
- View All Subscriptions
- Paused subscriptions
- Cancelled subscriptions
- Settings

---

### 2. `/admin/subscriptions/list` - Subscription List

**Purpose**: Full list view with filters and bulk actions

**Key Features**:
- DataTable with columns: ID, Customer, Product, Status, Frequency, Next Billing, Amount, Actions
- Filters: Status (active/paused/cancelled), Product, Date range, Search
- Bulk actions: Pause, Resume, Cancel (with reason)
- Tab navigation: All, Active, Paused, Cancelled
- Export to CSV

**Actions per subscription**:
- View details
- Pause (with reason)
- Resume
- Skip next order
- Cancel (with reason selection)
- Update payment method (redirect)
- Update shipping address

---

### 3. `/admin/subscriptions/[id]` - Subscription Detail

**Purpose**: Complete subscription information and lifecycle management

**Sections**:
1. **Header**: Status badge, customer name, subscription ID, created date
2. **Customer Info**: Name, email, phone, shipping address, billing address
3. **Product Info**: Product name, variant, quantity, frequency, price
4. **Billing Info**: Next billing date, payment method (last 4), total orders, lifetime value
5. **Order History**: Table of past orders with date, amount, status
6. **Activity Log**: Timeline of all subscription events

**Actions**:
- Pause/Resume
- Skip next order
- Cancel with reason
- Edit frequency
- Update quantity
- Apply discount
- Add one-time addon
- Send notification email

---

### 4. `/admin/subscriptions/analytics` - Subscription Analytics

**Purpose**: Deep analytics on subscription program health

**Dashboard Sections**:
1. **Overview KPIs**:
   - MRR/ARR
   - Net MRR change (expansion - contraction - churn)
   - Customer count
   - ARPU (Average Revenue Per User)

2. **Cohort Analysis**:
   - Retention by signup month
   - LTV by cohort
   - Churn by cohort

3. **Churn Analysis**:
   - Churn rate trend (line chart)
   - Churn by reason (pie chart)
   - Churn by product
   - At-risk subscribers (predictive)

4. **Growth Metrics**:
   - New vs churned subscribers
   - Net subscriber growth
   - Subscription velocity

5. **Product Breakdown**:
   - Subscribers by product
   - Revenue by product
   - Conversion from trial

**Date Range Filter**: Last 7d, 30d, 90d, 1y, All time, Custom

---

### 5. `/admin/subscriptions/cutover` - Data Cutover Tools

**Purpose**: Tools for migrating subscription data between providers

**Features**:
1. **Source/Target Selection**:
   - Source: Loop, Recharge, Bold, Custom DB, CSV Import
   - Target: Custom System, Loop, Recharge

2. **Data Mapping**:
   - Field mapping interface
   - Status mapping (provider-specific statuses)
   - Frequency mapping
   - Product ID mapping

3. **Validation Pre-Check**:
   - Validate source data before migration
   - Identify missing fields
   - Flag data inconsistencies
   - Estimate migration time

4. **Cutover Actions**:
   - Dry run (preview only)
   - Full cutover
   - Partial cutover (by status, date range)
   - Rollback capability

5. **Progress Tracking**:
   - Real-time progress bar
   - Error log
   - Success/failure counts
   - Post-cutover validation report

---

### 6. `/admin/subscriptions/emails` - Email Templates

**Purpose**: Manage all subscription-related email templates

**Template Types**:
- Order confirmation
- Upcoming renewal reminder
- Payment failed (retry 1, 2, 3)
- Payment method expiring
- Subscription paused
- Subscription resumed
- Subscription cancelled
- Skip confirmation
- Frequency change confirmation

**Per Template**:
- Subject line (with variables)
- Preview text
- Body content (WYSIWYG editor)
- Available variables list
- Preview with sample data
- Test send
- Enable/disable toggle

**Email Queue Integration**:
- Link to email queue for sent emails
- Delivery status tracking
- Resend failed emails

---

### 7. `/admin/subscriptions/emails/[id]` - Email Detail

**Purpose**: View and edit individual email template

**Features**:
- Template metadata (name, type, last modified)
- Subject line editor with variable insertion
- Body editor (WYSIWYG with variable insertion)
- Plain text fallback editor
- Preview pane with sample data
- Test send to specific email
- Version history
- Reset to default

---

### 8. `/admin/subscriptions/migration` - Migration Tools

**Purpose**: Provider migration and data sync tools

**Sections**:
1. **Current Provider Status**:
   - Backend provider (Loop/Custom)
   - Billing engine (Loop/Custom)
   - Last sync time
   - Sync status

2. **Migration Wizard**:
   - Step 1: Select target provider
   - Step 2: Configure credentials
   - Step 3: Map products/plans
   - Step 4: Validate data
   - Step 5: Execute migration
   - Step 6: Verify and switch

3. **Sync Tools**:
   - Manual sync trigger
   - Sync log viewer
   - Conflict resolution
   - Delta sync (changes only)

4. **Rollback**:
   - Rollback to previous provider
   - Data restoration

---

### 9. `/admin/subscriptions/save-flows` - Retention Flows

**Purpose**: Configure cancellation prevention and win-back flows

**Flow Types**:

1. **Cancellation Prevention**:
   - Trigger: Customer clicks cancel
   - Steps: Show reasons → Offer alternatives → Confirm
   - Offers: Discount, Pause, Skip, Frequency change

2. **Win-Back Campaigns**:
   - Trigger: X days after cancellation
   - Segments: By reason, by tenure, by LTV
   - Offers: Comeback discount, free shipping, gift

3. **At-Risk Intervention**:
   - Trigger: Payment failed, no engagement
   - Actions: Email sequence, SMS, personalized offer

**Per Flow**:
- Enable/disable toggle
- Trigger conditions
- Step builder (drag-drop)
- Offer configuration
- Success metrics tracking

**Analytics**:
- Save rate by flow
- Revenue saved
- Offer acceptance rate
- Best performing offers

---

### 10. `/admin/subscriptions/selling-plans` - Selling Plan Configuration

**Purpose**: Configure Shopify selling plans (subscription intervals and pricing)

**Features**:
1. **Selling Plan Groups**:
   - List of selling plan groups
   - Create/edit/delete groups
   - Product association

2. **Per Selling Plan**:
   - Name and description
   - Billing frequency (weekly, monthly, etc.)
   - Delivery frequency
   - Discount type (percentage, fixed)
   - Discount amount
   - Trial period (optional)
   - Minimum commitment (optional)

3. **Pricing Preview**:
   - Show price calculations
   - Compare with one-time price

4. **Shopify Sync**:
   - Push changes to Shopify
   - Sync status indicator
   - Error handling

---

### 11. `/admin/subscriptions/settings` - Settings

**Purpose**: Global subscription settings and provider configuration

**Sections**:
1. **Provider Configuration**:
   - Backend provider selection (Loop/Custom)
   - Billing engine selection
   - API credentials
   - Webhook URLs

2. **Default Behaviors**:
   - Default pause duration
   - Maximum pause duration
   - Auto-resume after pause
   - Skip limits per year
   - Cancellation grace period

3. **Notifications**:
   - Days before renewal reminder
   - Payment retry attempts
   - Payment retry interval
   - Failed payment notification timing

4. **Feature Toggles**:
   - Allow customer self-cancel
   - Allow customer self-pause
   - Allow frequency changes
   - Allow quantity changes
   - Allow skip orders

5. **Integration Settings**:
   - Shopify sync enabled
   - Loop webhook secret
   - Custom webhook endpoints

---

### 12. `/admin/subscriptions/validation` - Data Validation

**Purpose**: Validate subscription data integrity and fix issues

**Validation Checks**:
1. **Data Integrity**:
   - Orphaned subscriptions (no customer)
   - Missing product references
   - Invalid payment methods
   - Duplicate subscriptions

2. **Provider Sync**:
   - Compare local DB with Loop/provider
   - Identify mismatches
   - Flag sync failures

3. **Status Validation**:
   - Active with no next billing date
   - Cancelled with pending orders
   - Paused beyond max duration

**Actions**:
- Run full validation
- Fix selected issues
- Export validation report
- Schedule regular validation

**Dashboard**:
- Validation status (last run, next scheduled)
- Issue counts by category
- Resolution history

---

## Provider Abstraction Layer

All subscription operations must use the provider abstraction:

```typescript
interface SubscriptionProvider {
  // Core CRUD
  getSubscription(id: string): Promise<Subscription>
  listSubscriptions(filters: SubscriptionFilters): Promise<PaginatedResult<Subscription>>

  // Lifecycle
  pauseSubscription(id: string, reason: string, resumeDate?: Date): Promise<void>
  resumeSubscription(id: string): Promise<void>
  cancelSubscription(id: string, reason: string): Promise<void>
  skipNextOrder(id: string): Promise<void>

  // Updates
  updateFrequency(id: string, frequency: SubscriptionFrequency): Promise<void>
  updateQuantity(id: string, quantity: number): Promise<void>
  updatePaymentMethod(id: string, paymentMethodId: string): Promise<void>

  // Sync
  syncFromProvider(): Promise<SyncResult>
  pushToProvider(subscription: Subscription): Promise<void>
}

// Implementations
class LoopSubscriptionProvider implements SubscriptionProvider { ... }
class CustomSubscriptionProvider implements SubscriptionProvider { ... }
```

---

## Database Schema Additions

```sql
-- Retention flows
CREATE TABLE subscription_save_flows (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name VARCHAR(255) NOT NULL,
  flow_type VARCHAR(50) NOT NULL, -- 'cancellation', 'winback', 'at_risk'
  trigger_conditions JSONB NOT NULL,
  steps JSONB NOT NULL, -- array of step configs
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Save flow analytics
CREATE TABLE subscription_save_attempts (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id),
  flow_id UUID NOT NULL REFERENCES subscription_save_flows(id),
  outcome VARCHAR(50) NOT NULL, -- 'saved', 'cancelled', 'pending'
  offer_accepted VARCHAR(100), -- which offer was accepted
  revenue_saved DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Data validation results
CREATE TABLE subscription_validations (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  run_at TIMESTAMPTZ DEFAULT NOW(),
  total_checked INTEGER,
  issues_found INTEGER,
  issues_fixed INTEGER,
  results JSONB NOT NULL
);
```

---

## API Routes Required

```
GET    /api/admin/subscriptions
GET    /api/admin/subscriptions/[id]
PATCH  /api/admin/subscriptions/[id]
POST   /api/admin/subscriptions/[id]/pause
POST   /api/admin/subscriptions/[id]/resume
POST   /api/admin/subscriptions/[id]/cancel
POST   /api/admin/subscriptions/[id]/skip

GET    /api/admin/subscriptions/analytics
GET    /api/admin/subscriptions/analytics/cohorts
GET    /api/admin/subscriptions/analytics/churn

GET    /api/admin/subscriptions/emails
GET    /api/admin/subscriptions/emails/[id]
PUT    /api/admin/subscriptions/emails/[id]
POST   /api/admin/subscriptions/emails/[id]/test

GET    /api/admin/subscriptions/save-flows
POST   /api/admin/subscriptions/save-flows
PUT    /api/admin/subscriptions/save-flows/[id]
DELETE /api/admin/subscriptions/save-flows/[id]
GET    /api/admin/subscriptions/save-flows/analytics

GET    /api/admin/subscriptions/selling-plans
POST   /api/admin/subscriptions/selling-plans
PUT    /api/admin/subscriptions/selling-plans/[id]
POST   /api/admin/subscriptions/selling-plans/sync

GET    /api/admin/subscriptions/settings
PUT    /api/admin/subscriptions/settings

POST   /api/admin/subscriptions/validation/run
GET    /api/admin/subscriptions/validation/results
POST   /api/admin/subscriptions/validation/fix

POST   /api/admin/subscriptions/cutover/validate
POST   /api/admin/subscriptions/cutover/execute
POST   /api/admin/subscriptions/cutover/rollback

POST   /api/admin/subscriptions/migration/sync
GET    /api/admin/subscriptions/migration/status
POST   /api/admin/subscriptions/migration/switch-provider
```

---

## Definition of Done

- [ ] All 10+ subscription pages documented with full specifications
- [ ] Provider abstraction layer defined
- [ ] Save flows (retention) fully specified with analytics
- [ ] Email templates with queue integration
- [ ] Migration and cutover tools complete
- [ ] Validation tools with auto-fix capability
- [ ] All APIs listed with tenant isolation
- [ ] Database schema additions specified
- [ ] Multi-tenant isolation verified at every level
