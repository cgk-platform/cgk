# PHASE-3G: Gift Cards & Store Credit

**Duration**: 1 week (Week 14-15)
**Depends On**: Phase 3A (Storefront Foundation), Phase 3B (Cart/Checkout)
**Parallel With**: Phase 3D (Theming - late)
**Blocks**: None

---

## Goal

Implement a gift card/store credit system that allows customers to earn store credit through promotions (e.g., Bundle Builder free gift) and redeem it at checkout. This includes Shopify gift card product sync, transaction tracking, email notifications, and admin management.

---

## Success Criteria

- [ ] Gift card products sync from Shopify
- [ ] Store credit issued automatically on qualifying orders
- [ ] Transaction tracking with status (pending, credited, failed)
- [ ] Email queue for gift card notifications
- [ ] Customer receives store credit in their Shopify account
- [ ] Admin dashboard with stats and management
- [ ] Configurable settings per tenant
- [ ] Transaction history with filters

---

## Deliverables

### Gift Card Products

Gift cards are created as Shopify products with special handling:

**Product Properties:**
- Shopify product ID and variant ID
- Title and SKU
- Amount in cents (store credit value)
- Status (active/archived)
- Minimum order subtotal threshold (optional)
- Product image from Shopify

**Sync Flow:**
1. Admin creates gift card product in Shopify (or via admin)
2. System syncs product data to local cache
3. Products available for Bundle Builder/promotion config
4. Variant ID used to detect gift card in orders

**Database Schema:**
```sql
CREATE TABLE gift_card_products (
  id TEXT PRIMARY KEY, -- Shopify product GID
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  variant_id TEXT NOT NULL, -- Shopify variant GID
  variant_id_numeric TEXT NOT NULL, -- Numeric ID for cart ops
  title TEXT NOT NULL,
  sku TEXT,
  amount_cents INTEGER NOT NULL,
  min_order_subtotal_cents INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  shopify_status TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  synced_at TIMESTAMPTZ DEFAULT now()
);
```

### Transaction Processing

When a qualifying order is placed:

1. **Order Detection** - Webhook receives order with gift card variant
2. **Validation** - Check order subtotal meets minimum threshold
3. **Transaction Creation** - Create pending transaction record
4. **Shopify Credit** - Issue store credit via Shopify Customer API
5. **Status Update** - Mark transaction as credited or failed
6. **Email Queue** - Queue notification email

**Transaction States:**
- `pending` - Transaction created, credit not yet issued
- `credited` - Store credit successfully issued to customer
- `failed` - Credit issuance failed (with error message)

**Transaction Sources:**
- `bundle_builder` - From Bundle Builder promotion
- `manual` - Manually issued by admin
- `promotion` - Other promotional campaigns

**Database Schema:**
```sql
CREATE TABLE gift_card_transactions (
  id TEXT PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  shopify_order_id TEXT NOT NULL,
  shopify_order_name TEXT NOT NULL,
  shopify_customer_id TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  gift_card_product_id TEXT,
  gift_card_variant_id TEXT,
  gift_card_sku TEXT,
  amount_cents INTEGER NOT NULL,
  source TEXT NOT NULL DEFAULT 'bundle_builder',
  source_page_slug TEXT,
  source_config JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  shopify_transaction_id TEXT,
  credited_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, shopify_order_id, gift_card_variant_id)
);
```

### Email Notifications

Queue-based email system for gift card notifications:

**Email Types:**
- Gift card credit confirmation
- Admin notification (optional)

**Email Queue Features:**
- Scheduled sending (e.g., delay after order)
- Retry on failure with backoff
- Status tracking (pending, sent, failed, skipped)
- Attempt count and timestamps

**Database Schema:**
```sql
CREATE TABLE gift_card_emails (
  id TEXT PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  transaction_id TEXT NOT NULL,
  to_email TEXT NOT NULL,
  to_name TEXT,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  resend_message_id TEXT,
  scheduled_for TIMESTAMPTZ DEFAULT now(),
  sent_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_message TEXT,
  attempt_count INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Admin Dashboard

**Dashboard Features:**
- Stats overview (total issued, credited, pending, failed)
- Active products list with quick links
- Email status summary
- Quick navigation to sub-pages

**Sub-Pages:**
- `/admin/gift-cards/products` - Product management
- `/admin/gift-cards/transactions` - Transaction list with filters
- `/admin/gift-cards/emails` - Email queue view
- `/admin/gift-cards/settings` - System configuration

### Products Management

**Features:**
- List products with status badges
- Sync from Shopify button
- Create new product (creates in Shopify + local)
- Edit product settings
- Archive/activate products

### Transactions View

**Features:**
- Transaction list with columns:
  - Order # with link
  - Customer email
  - Amount
  - Source (badge)
  - Status (badge)
  - Credited date
  - Actions
- Status filters (all, pending, credited, failed)
- Date range filter
- Search by order/email
- Retry failed transactions
- Manual credit issuance

### Email Queue View

**Features:**
- Email list with status
- Filters by status
- Manual send/retry
- View email content in modal
- Bulk retry failed

### Settings

**Configurable Settings:**
- System enabled toggle
- Email enabled toggle
- Default store credit amount
- From email address
- Admin notification toggle
- Notification email address
- Email template customization:
  - Subject
  - Headline
  - Greeting
  - Body text
  - CTA button text and URL
  - How-to-use text
  - Footer text

---

## Constraints

- Gift cards must integrate with Shopify's native gift card/store credit system
- Transaction idempotency: one credit per order+variant combination
- Email sending through tenant's Resend configuration
- Products must exist in Shopify before local caching
- All amounts stored as cents for precision
- Failed transactions should not block order processing

---

## Pattern References

**Skills to invoke:**
- `/frontend-design` - For dashboard cards, transaction table, email queue

**Shopify Dev MCP:**
- Use `mcp__shopify-dev-mcp__learn_shopify_api(api: "admin")` for Customer API
- Query: "giftCard" and "customer" for credit operations

**RAWDOG code to reference:**
- `src/app/admin/gift-cards/page.tsx` - Dashboard
- `src/app/admin/gift-cards/products/page.tsx` - Product management
- `src/app/admin/gift-cards/transactions/page.tsx` - Transactions
- `src/app/admin/gift-cards/emails/page.tsx` - Email queue
- `src/app/admin/gift-cards/settings/page.tsx` - Settings
- `src/lib/gift-card/` - All gift card logic
  - `types.ts` - Type definitions
  - `settings.ts` - Settings management
  - `process-reward.ts` - Order processing
  - `shopify-products.ts` - Shopify API calls
  - `db/` - Database operations
  - `emails/` - Email handling

---

## AI Discretion Areas

The implementing agent should determine:
1. Shopify Customer API vs Gift Card API for credits
2. Email template editor component design
3. Transaction retry strategy and limits
4. Product sync frequency
5. Dashboard chart/visualization for credit trends

---

## Tasks

### [PARALLEL] Database Layer

- [ ] Create `apps/admin/src/lib/gift-card/types.ts`
- [ ] Create `apps/admin/src/lib/gift-card/db/schema.ts`
- [ ] Create `apps/admin/src/lib/gift-card/db/products.ts`
- [ ] Create `apps/admin/src/lib/gift-card/db/transactions.ts`
- [ ] Create `apps/admin/src/lib/gift-card/db/emails.ts`
- [ ] Create `apps/admin/src/lib/gift-card/db/index.ts` (stats, etc.)

### [PARALLEL] Core Logic

- [ ] Create `apps/admin/src/lib/gift-card/settings.ts`
- [ ] Create `apps/admin/src/lib/gift-card/shopify-products.ts`
- [ ] Create `apps/admin/src/lib/gift-card/process-reward.ts`
- [ ] Create `apps/admin/src/lib/gift-card/emails/send.ts`
- [ ] Create `apps/admin/src/lib/gift-card/emails/index.ts`

### [PARALLEL] API Routes

- [ ] Create `apps/admin/src/app/api/admin/gift-cards/route.ts` (stats)
- [ ] Create `apps/admin/src/app/api/admin/gift-cards/products/route.ts`
- [ ] Create `apps/admin/src/app/api/admin/gift-cards/products/sync/route.ts`
- [ ] Create `apps/admin/src/app/api/admin/gift-cards/transactions/route.ts`
- [ ] Create `apps/admin/src/app/api/admin/gift-cards/transactions/[id]/retry/route.ts`
- [ ] Create `apps/admin/src/app/api/admin/gift-cards/emails/route.ts`
- [ ] Create `apps/admin/src/app/api/admin/gift-cards/emails/[id]/send/route.ts`
- [ ] Create `apps/admin/src/app/api/admin/gift-cards/settings/route.ts`

### [SEQUENTIAL after API] Admin UI

- [ ] Create `apps/admin/src/app/admin/gift-cards/page.tsx` (dashboard)
- [ ] Create `apps/admin/src/app/admin/gift-cards/products/page.tsx`
- [ ] Create `apps/admin/src/app/admin/gift-cards/transactions/page.tsx`
- [ ] Create `apps/admin/src/app/admin/gift-cards/emails/page.tsx`
- [ ] Create `apps/admin/src/app/admin/gift-cards/settings/page.tsx`
- [ ] Create `apps/admin/src/components/admin/gift-cards/StatCard.tsx`
- [ ] Create `apps/admin/src/components/admin/gift-cards/ProductForm.tsx`
- [ ] Create `apps/admin/src/components/admin/gift-cards/EmailTemplateEditor.tsx`

### [SEQUENTIAL after UI] Order Processing Integration

- [ ] Add gift card detection to order webhook handler
- [ ] Create job: `gift-card/process-order`
- [ ] Create job: `gift-card/send-email-queue`
- [ ] Create job: `gift-card/retry-failed-credits`
- [ ] Create job: `gift-card/sync-products`

---

## API Endpoints Specification

### GET /api/admin/gift-cards
**Returns:** stats with totalIssued, creditedCount, pendingCount, failedCount, etc.

### GET /api/admin/gift-cards/products
**Returns:** products[] with Shopify data and local settings

### POST /api/admin/gift-cards/products/sync
**Returns:** syncedCount, products[]

### GET /api/admin/gift-cards/transactions
**Query params:** status, startDate, endDate, search
**Returns:** transactions[] with pagination

### POST /api/admin/gift-cards/transactions/[id]/retry
**Returns:** transaction with updated status

### GET /api/admin/gift-cards/settings
**Returns:** GiftCardSettings object

### PUT /api/admin/gift-cards/settings
**Body:** Partial<GiftCardSettings>
**Returns:** Updated settings

---

## Definition of Done

- [ ] Products can be synced from Shopify
- [ ] Products can be created/edited in admin
- [ ] Orders with gift card variants trigger credit
- [ ] Store credit appears in customer's Shopify account
- [ ] Transactions list shows all credits
- [ ] Failed transactions can be retried
- [ ] Email queue processes notifications
- [ ] Email template is customizable
- [ ] Settings are configurable per tenant
- [ ] Dashboard shows accurate stats
- [ ] All data properly tenant-isolated
- [ ] `npx tsc --noEmit` passes
