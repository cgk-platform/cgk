# Gap Remediation: Shopify App - Complete Platform App

> **Execution**: 🟢 PARALLEL - Run with other parallel prompts (after sequential 37, 35)
> **Priority**: CRITICAL
> **Estimated Phases**: 2-3 focused phase docs
> **IMPORTANT**: This is the central Shopify App for the multi-tenant platform - scope for ALL possible features

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

## Your Task

### 1. Explore RAWDOG Shopify App

Use the Explore agent or read these source files:
```
/shopify-app/                    # Shopify App directory
/shopify-app/shopify.app.toml    # App configuration with scopes
/shopify-app/extensions/         # Function extensions
/src/app/api/webhooks/shopify/   # Shopify webhooks
/src/lib/shopify/                # Shopify utilities
```

### 2. Update Master Documents

**PLAN.md** - Add comprehensive section for:
- Shopify App architecture
- All 42+ scopes and their purposes
- Extension types (current + future)
- Multi-tenant app installation

**PROMPT.md** - Add patterns for:
- Shopify Function implementation
- Webhook handling patterns
- OAuth flow for tenants

### 3. Create Phase Docs

Create 2-3 phase docs in `/docs/MULTI-TENANT-PLATFORM-PLAN/`:
- `PHASE-XX-SHOPIFY-APP-CORE.md`
- `PHASE-XX-SHOPIFY-EXTENSIONS.md`
- `PHASE-XX-SHOPIFY-WEBHOOKS.md`

---

## Context

The multi-tenant platform needs a comprehensive Shopify App that tenants install on their stores. This app handles checkout customizations, post-purchase surveys, session stitching, and more. The app must be scoped for ALL possible roles to be future-proof.

---

## Current State (RAWDOG)

The existing `/shopify-app/` directory has:
- **shipping-ab-test-rust**: Delivery customization function (Rust/WASM)
- **ga4-session-stitching**: Web pixel extension for GA4 + Meta CAPI

Current scopes (42): Orders, customers, products, discounts, fulfillments, inventory, gift cards, content, themes, shipping, analytics, etc.

---

## Complete Shopify App Scope - WHAT We Need

### All Available Scope Categories (Future-Proof)

**Core Commerce:**
- `read_orders`, `write_orders` - Order management
- `read_draft_orders`, `write_draft_orders` - Draft orders
- `read_checkouts`, `write_checkouts` - Checkout access
- `read_customers`, `write_customers` - Customer data
- `read_customer_payment_methods` - Saved payment methods

**Products & Inventory:**
- `read_products`, `write_products` - Product management
- `read_inventory`, `write_inventory` - Inventory control
- `read_product_listings` - Product listings
- `read_publications` - Channel publications
- `read_product_feeds`, `write_product_feeds` - Product feeds

**Fulfillment:**
- `read_fulfillments`, `write_fulfillments` - Fulfillment management
- `read_shipping`, `write_shipping` - Shipping settings
- `read_locations` - Store locations
- `read_merchant_managed_fulfillment_orders`, `write_merchant_managed_fulfillment_orders`
- `read_third_party_fulfillment_orders`, `write_third_party_fulfillment_orders`
- `read_assigned_fulfillment_orders`, `write_assigned_fulfillment_orders`

**Marketing & Discounts:**
- `read_discounts`, `write_discounts` - Discount management
- `read_price_rules`, `write_price_rules` - Price rules
- `read_marketing_events`, `write_marketing_events` - Marketing events

**Gift Cards:**
- `read_gift_cards`, `write_gift_cards` - Gift card management

**Content & Themes:**
- `read_content`, `write_content` - Metafields and metaobjects
- `read_themes`, `write_themes` - Theme access
- `read_locales` - Store locales

**Customer Events & Pixels:**
- `write_pixels`, `read_customer_events` - Pixel and event tracking

**Analytics & Reports:**
- `read_analytics` - Store analytics
- `read_reports` - Report access

**Markets & International:**
- `read_markets`, `write_markets` - Markets configuration

**Subscriptions:**
- `read_own_subscription_contracts`, `write_own_subscription_contracts`
- `read_customer_merge` - Customer merge operations

**Files & Storage:**
- `read_files`, `write_files` - File management

**Store Settings:**
- `read_shop`, `write_shop` - Shop settings
- `read_legal_policies` - Legal policies

---

## App Extensions - WHAT We Need

### 1. Post-Purchase Survey Extension (Checkout UI Extension)

**Where it appears:** Order status page (thank you page)

**Outcomes:**
- Survey widget renders on order confirmation
- Tenant-configurable questions from admin
- Responses POST to platform API
- Attribution data captured ("How did you hear about us?")
- Branded per tenant (colors, logo)
- Mobile-responsive design

### 2. Delivery Customization Function (Shipping A/B Tests)

**Where it runs:** Checkout shipping rate selection

**Outcomes:**
- Hide/show shipping rates based on A/B test assignment
- Visitor assignment persists across sessions
- Supports multiple concurrent tests
- No latency impact (Rust/WASM, <5ms execution)

### 3. Web Pixel Extension (Session Stitching)

**Where it runs:** All storefront pages

**Outcomes:**
- Captures session data (fbp, fbc, ga_session_id)
- Stitches anonymous sessions to customers
- Sends server-side events to GA4 and Meta CAPI
- Respects consent preferences
- Handles checkout events

### 4. Discount Function (Future)

**Where it runs:** Cart and checkout

**Outcomes:**
- Custom discount logic (bundle discounts, tiered pricing)
- Creator discount codes validation
- Subscription discount application

### 5. Payment Customization Function (Future)

**Where it runs:** Checkout payment selection

**Outcomes:**
- Hide/show payment methods based on conditions
- A/B test payment method display order

### 6. Cart Transform Function (Future)

**Where it runs:** Cart operations

**Outcomes:**
- Automatic bundle creation
- Free gift with purchase
- Subscription upsell injection

### 7. Checkout UI Extensions (Future)

**Where they run:** Checkout pages

**Outcomes:**
- Trust badges display
- Subscription benefits callout
- Gift message field
- Delivery date picker
- Order notes field

### 8. Order Routing Function (Future)

**Where it runs:** Order fulfillment

**Outcomes:**
- Route orders to optimal fulfillment location
- Split shipments logic

---

## Admin UI for Shopify App (/admin/integrations/shopify-app)

**Outcomes:**
- Installation status and connection health
- Installed scopes verification
- Extension status (enabled/disabled per extension)
- Webhook configuration and health
- App embed block status
- Reconnect/reinstall flow
- Per-tenant app configuration

---

## Multi-Tenant Architecture

**Per-Tenant Isolation:**
- Each tenant has their own Shopify store connection
- OAuth tokens stored encrypted per tenant
- App extensions configured per tenant
- Webhook routing based on shop domain → tenant mapping

**Platform-Level:**
- Single app installation per tenant store
- Centralized app management
- Cross-tenant analytics (super admin only)

---

## Non-Negotiable Requirements

**Scopes:**
- ALL read/write scopes for orders, customers, products, fulfillments, discounts
- Pixel and customer event scopes
- Content and theme scopes
- Analytics and reports scopes
- Subscription contract scopes
- Markets and international scopes

**Extensions (Current):**
- Post-purchase survey (Checkout UI Extension)
- Delivery customization (shipping A/B tests)
- Web pixel (session stitching for GA4 + Meta CAPI)

**Extensions (Future-Ready):**
- Discount functions
- Payment customization
- Cart transform
- Checkout UI extensions
- Order routing

**Admin:**
- Full app management UI in tenant admin
- Installation and connection status
- Extension configuration per tenant

---

## Definition of Done

- [ ] App has comprehensive scopes covering all current and future needs
- [ ] Post-purchase survey extension renders on order confirmation
- [ ] Survey responses flow to platform survey system
- [ ] Delivery customization function supports A/B tests
- [ ] Web pixel captures session data for attribution
- [ ] Admin UI shows installation status and extension health
- [ ] OAuth tokens are encrypted and tenant-isolated
- [ ] Webhooks route correctly to tenant context

---

## Output Checklist

- [ ] PLAN.md updated with Shopify App architecture section
- [ ] All scopes documented with justification
- [ ] Each extension has outcome specification
- [ ] Multi-tenant credential handling documented
- [ ] Admin UI for app management specified
- [ ] Future extension roadmap included
