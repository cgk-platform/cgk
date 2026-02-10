# RAWDOG Admin Dashboard Features
**Generated**: 2025-02-10
**Coverage**: 60+ sections across 8 navigation groups

---

## Source Codebase Path

**Admin Pages**: `/Users/holdenthemic/Documents/rawdog-web/src/app/admin/`
**Admin Components**: `/Users/holdenthemic/Documents/rawdog-web/src/components/admin/`

All route and file paths in this document are relative to the RAWDOG codebase. Use full paths when referencing from the new project.

---

## Navigation Structure

The admin sidebar has 8 collapsible section groups plus utility items:

### 1. CONTENT
**Route Prefix**: `/admin/content/`

| Section | Route | Purpose |
|---------|-------|---------|
| Blog | `/admin/blog` | Blog posts, authors, categories |
| Topic Clusters | `/admin/blog/clusters` | SEO topic clustering |
| Link Health | `/admin/blog/link-health` | Internal link validation |
| SEO | `/admin/seo` | Keywords, redirects, schema |
| Landing Pages | `/admin/landing-pages` | Page builder with 70+ block types |
| Brand Context | `/admin/brand-context` | Brand guidelines |

### 2. DAM (Digital Asset Management)
**Route Prefix**: `/admin/dam/`

| Section | Route | Purpose |
|---------|-------|---------|
| Asset Library | `/admin/dam` | Search, filter, manage assets |
| Import Queue | `/admin/dam/import-queue` | Bulk import from Google Drive |
| Collections | `/admin/dam/collections` | Organize assets |
| Ad Projects | `/admin/dam/ads` | Ad creative management |
| Rights | `/admin/dam/rights` | Usage rights & licensing |
| Analytics | `/admin/dam/analytics` | Asset usage tracking |
| Google Drive | `/admin/dam/settings/google-drive` | Drive sync config |
| Trash | `/admin/dam/trash` | Recovery/deletion |

### 3. COMMERCE
**Route Prefix**: Various

| Section | Route | Purpose |
|---------|-------|---------|
| Orders | `/admin/orders` | Order management with 14+ filters |
| Customers | `/admin/customers` | Customer directory with LTV |
| Subscriptions | `/admin/subscriptions` | Subscription analytics |
| Reviews | `/admin/reviews` | Review collection |
| Analytics | `/admin/analytics` | Commerce KPIs |
| A/B Tests | `/admin/ab-tests` | Conversion testing |
| Surveys | `/admin/surveys` | Customer feedback |
| Promotions | `/admin/promotions` | Campaign calendar |
| Promo Codes | `/admin/promo-codes` | Discount codes |
| Abandoned Carts | `/admin/abandoned-checkouts` | Cart recovery |
| Gift Cards | `/admin/gift-cards` | Gift card management |
| Google Feed | `/admin/google-feed` | Google Shopping feed |

### 4. ATTRIBUTION
**Route Prefix**: `/admin/attribution/`

| Section | Route | Purpose |
|---------|-------|---------|
| Overview | `/admin/attribution` | Blended ROAS, MER |
| Channels | `/admin/attribution/channels` | Channel performance |
| Creatives | `/admin/attribution/creatives` | Ad creative tracking |
| Journeys | `/admin/attribution/journeys` | Customer journey viz |
| Model Comparison | `/admin/attribution/model-comparison` | Compare models |
| Cohorts | `/admin/attribution/cohorts` | Cohort analysis |
| MMM | `/admin/attribution/mmm` | Marketing mix modeling |
| AI Insights | `/admin/attribution/ai-insights` | Automated insights |
| Influencers | `/admin/attribution/influencers` | Influencer tracking |
| Pixels | `/admin/attribution/pixels` | Conversion pixels |
| Data Quality | `/admin/attribution/data-quality` | Data validation |
| Settings | `/admin/attribution/settings` | Attribution config |

### 5. CREATORS
**Route Prefix**: `/admin/creators/`
**Badge**: Shows pending applications + withdrawals

| Section | Route | Purpose |
|---------|-------|---------|
| Directory | `/admin/creators` | Creator CRUD |
| Applications | `/admin/creators/applications` | Onboarding review |
| Communications | `/admin/creators/communications` | Bulk messaging |
| Pipeline | `/admin/creator-pipeline` | Recruitment pipeline |
| Messaging | `/admin/messaging` | Direct messaging |
| Onboarding Metrics | `/admin/onboarding-metrics` | Completion tracking |
| Commissions | `/admin/commissions` | Commission approval |
| E-Signatures | `/admin/esign` | Digital signatures |
| Samples | `/admin/samples` | Sample distribution |

### 6. FINANCE
**Route Prefix**: `/admin/finance/`, `/admin/creator-payments/`, `/admin/tax/`
**Badge**: Shows pending payout requests

| Section | Route | Purpose |
|---------|-------|---------|
| Payouts | `/admin/creator-payments` | ACH transfers |
| Treasury | `/admin/treasury` | Cash management |
| Receipts | `/admin/treasury?tab=receipts` | Expense tracking |
| Expenses | `/admin/expenses` | Operating expenses |
| Tax / 1099 | `/admin/tax` | 1099 filing |
| Vendors | `/admin/vendors` | Vendor payments |
| Contractors | `/admin/contractors` | Contractor management |
| Payee Invites | `/admin/payees` | Onboarding invites |

### 7. COMMUNICATE
**Route Prefix**: Various

| Section | Route | Purpose |
|---------|-------|---------|
| Bri AI Agent | `/admin/bri` | AI agent config |
| Creator Inbox | `/admin/creators/inbox` | Message viewer |
| Productivity | `/admin/productivity` | Task management |
| Campaigns | `/admin/campaigns` | Marketing campaigns |
| Templates | `/admin/templates` | Email templates |
| Calendar | `/admin/scheduling` | Event scheduling |
| Videos | `/admin/videos` | Video processing |
| Recorder | `/admin/recorder` | Screen recording |

### 8. OPERATIONS
**Route Prefix**: `/admin/ops/`

| Section | Route | Purpose |
|---------|-------|---------|
| Dashboard | `/admin/ops` | System overview |
| Errors | `/admin/ops/errors` | Error tracking |
| Logs | `/admin/ops/logs` | Log analysis |
| Health | `/admin/ops/health` | Uptime monitoring |
| Alerts | `/admin/ops/alerts` | System alerts |
| Settings | `/admin/ops/settings` | Ops config |

---

## Utility Items (Bottom of Sidebar)

| Section | Route | Purpose |
|---------|-------|---------|
| Config | `/admin/config` | Site-wide config (pricing, banners) |
| Automations | `/admin/automations` | Workflow rules |
| Settings | `/admin/settings` | Permissions, integrations |

---

## Integrations Section

| Section | Route | Purpose |
|---------|-------|---------|
| Overview | `/admin/integrations` | Integration status |
| SMS/Voice | `/admin/integrations/sms` | Retell integration |
| MCP Server | `/admin/mcp` | Custom tools |
| MCP Analytics | `/admin/mcp/analytics` | Tool usage |
| Slack | `/admin/integrations/slack` | Slack config |
| Shopify App | `/admin/integrations/shopify-app` | Shopify OAuth |
| Meta Ads | `/admin/meta-ads` | Meta integration |
| Google Ads | `/admin/google-ads` | Google Ads |
| TikTok Ads | `/admin/integrations/tiktok-ads` | TikTok |
| Klaviyo | `/admin/integrations/klaviyo` | Email marketing |
| Yotpo | `/admin/integrations/yotpo` | Reviews/UGC |

---

## Dashboard (Admin Home)

**Route**: `/admin`

### Components
1. **Status Cards** (3 cards):
   - Sale status (active/evergreen)
   - Subscription discounts
   - Last updated timestamp

2. **Quick Actions** (4 buttons):
   - Edit Site Config
   - Promotion Calendar
   - Revert to Evergreen
   - View Live Site

3. **Management Links** (6 buttons):
   - Creators, Promo Codes, Commissions
   - Blog, E-Signatures

4. **Banner Preview**: Live scrolling banner

5. **Activity Log**: Changelog

---

## Key Features by Section

### Orders Page
**14+ Filters:**
- Date range (start/end)
- Financial status (paid, pending, refunded)
- Fulfillment status (fulfilled, unfulfilled, partial)
- Attribution (has_creator, no_creator)
- Commission status (pending, approved, paid)
- Subscription type (subscription, one_time)
- Search (order #, email, discount code)

**Features:**
- Real-time stats (today's revenue, pending fulfillment)
- Commission tracking with approval workflow
- Order tagging system
- Line item expansion
- Creator attribution

### Landing Page Builder
**70+ Block Types:**
- **PDP Blocks**: hero, trust badges, science, usage guide, ready-to-buy
- **Promo Blocks**: bundle builder, feature cards, text banner
- **Core Blocks**: hero, benefits, reviews, CTA banner, markdown

### A/B Testing
- Multivariate tests
- Statistical significance (bootstrap, CUPED, SRM)
- Real-time monitoring
- Data quality validation

### Attribution
- 7-day and 30-day windows
- Models: Time decay, Linear, Last-click, First-click
- Platform comparison (Meta vs Google vs attributed)
- Export capabilities

---

## Technical Patterns

### Navigation Badges
- **Escalations**: Red badge with count
- **Creator Applications**: Green badge
- **Payout Requests**: Green badge
- **Auto-refresh**: Every 60 seconds

### Data Fetching
- Client-side with `'use client'`
- Debounced search (300ms)
- Pagination (50 items/page)
- Force-dynamic routes

### Export/Download
- CSV exports
- Date range selection
- Filter preservation

---

## Key Files

- `/src/app/admin/layout.tsx` - Main layout
- `/src/components/admin/AdminNav.tsx` - Sidebar (1,185 lines)
- `/src/app/admin/page.tsx` - Dashboard home
- `/src/app/admin/blog/page.tsx` - Blog (686 lines)
- `/src/app/admin/landing-pages/page.tsx` - LP builder (27K lines)
