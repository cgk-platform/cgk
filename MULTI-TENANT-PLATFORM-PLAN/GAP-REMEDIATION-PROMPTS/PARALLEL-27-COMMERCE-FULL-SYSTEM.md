# Gap Remediation: Commerce Admin - Complete System

> **Execution**: Can run in parallel with other prompts
> **Priority**: HIGH
> **Estimated Phases**: 2-3 focused phase docs

---
## ⚠️ CRITICAL: Read vs Write Locations

| Action | Location | Notes |
|--------|----------|-------|
| **READ FIRST** | `PLAN.md` and `PROMPT.md` in the plan folder | Understand existing architecture |
| **READ** | `/Users/holdenthemic/Documents/rawdog-web/src/` | RAWDOG source - DO NOT MODIFY |
| **WRITE** | `/Users/holdenthemic/Documents/cgk/MULTI-TENANT-PLATFORM-PLAN/` | Plan docs ONLY |

**Before writing, read existing docs to ensure your additions fit the planned architecture.**

**Files to update:**
- `PLAN.md` - Add feature section (must align with existing structure)
- `PROMPT.md` - Add implementation patterns
- `PHASE-XX-*.md` - Create new phase docs

**⛔ DO NOT modify any code files or anything outside MULTI-TENANT-PLATFORM-PLAN folder.**

---

## Context

The Commerce section has many sub-pages that need complete documentation. Some are covered in other prompts, but this ensures comprehensive coverage.

---

## Complete Commerce Admin Pages

```
/admin/orders
├── (list)                       # Order list
└── /[id]                        # Order detail

/admin/customers
├── (list)                       # Customer list
└── /[id]                        # Customer detail

/admin/subscriptions
├── (list)                       # Subscription list
├── /[id]                        # Subscription detail
├── /analytics                   # Subscription analytics
├── /cutover                     # Data cutover tools
├── /emails                      # Email templates
├── /emails/[id]                 # Email detail
├── /migration                   # Migration tools
├── /save-flows                  # Retention flows
├── /selling-plans               # Selling plan config
├── /settings                    # Settings
└── /validation                  # Data validation

/admin/reviews
├── (list)                       # Review list
├── /pending                     # Moderation queue
├── /email-queue                 # Email request queue
├── /email-logs                  # Delivery logs
├── /email-stats                 # Email analytics
├── /emails                      # Email templates
├── /bulk-send                   # Bulk send tool
├── /bulk-send-templates         # Bulk templates
├── /analytics                   # Review analytics
├── /incentive-codes             # Discount codes
├── /questions                   # Q&A management
├── /settings                    # Provider config
└── /migration                   # Migration tools

/admin/analytics
├── (dashboard)                  # Main analytics
├── /bri                         # BRI analytics
├── /pipeline                    # Sales pipeline
├── /pl-breakdown                # P&L breakdown
├── /reports                     # Custom reports
└── /settings                    # Settings

Tabs on analytics page:
- Unit Economics
- Spend Sensitivity
- Geography
- Burn Rate
- Platform Data
- Slack Notifications

/admin/surveys
└── /slack                       # Slack integration

/admin/promotions                # Promotion calendar

/admin/promo-codes               # Promo code builder

/admin/abandoned-checkouts       # Recovery campaigns

/admin/gift-cards
├── (list)                       # Gift card list
├── /emails                      # Email templates
├── /products                    # GC products
├── /settings                    # Settings
└── /transactions                # Transaction log

/admin/google-feed
├── (overview)                   # Feed overview
├── /images                      # Image feed
├── /preview                     # Feed preview
├── /products                    # Product list
├── /products/[handle]           # Product detail
└── /settings                    # Feed settings
```

---

## Your Task

### 1. Verify Coverage Across Existing Prompts

Check which pages are already covered by:
- Prompt 10 (E-Commerce Ops)
- Prompt 07 (Financial Ops - Gift Cards)
- Other prompts

### 2. Document Any Gaps

For any pages NOT covered elsewhere, create specifications:

```
PHASE-2O-COMMERCE-ORDERS.md
- Order list with filters
- Order detail page
- Order actions (refund, cancel, etc.)
- Fulfillment tracking

PHASE-2O-COMMERCE-CUSTOMERS.md
- Customer list with search
- Customer detail with history
- Customer segments
- Lifetime value display

PHASE-2O-COMMERCE-SUBSCRIPTIONS.md
- Subscription management
- Analytics dashboard
- Email templates
- Retention flows (save flows)
- Selling plan configuration
- Migration tools

PHASE-2O-COMMERCE-REVIEWS.md
- Review moderation queue
- Email request system
- Bulk send campaigns
- Incentive codes
- Provider toggle (Yotpo/Internal)
- Q&A management

PHASE-2O-COMMERCE-ANALYTICS.md
- Main dashboard tabs
- P&L breakdown
- Sales pipeline
- Custom reports
- BRI analytics integration
```

---

## Non-Negotiable Requirements

ALL Commerce pages must be documented:
- Orders with detail views
- Customers with detail views
- Subscriptions with all sub-pages
- Reviews with all features
- Analytics with all tabs
- Gift cards complete
- Google Feed complete
- Abandoned checkouts
- Promotions and promo codes

---

## Output Checklist

- [ ] All commerce pages documented
- [ ] No duplicate coverage with other prompts
- [ ] Integration between pages noted
- [ ] Multi-tenant isolation addressed
