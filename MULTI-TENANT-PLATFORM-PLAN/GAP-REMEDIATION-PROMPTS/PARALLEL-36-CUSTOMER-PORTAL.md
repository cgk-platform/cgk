# Gap Remediation: Customer Portal (White-Label, Customizable)

> **Execution**: 🟢 PARALLEL - Run with other parallel prompts (after sequential 37, 35)
> **Priority**: CRITICAL
> **Estimated Phases**: 3-4 focused phase docs
> **IMPORTANT**: This is a PORTABLE platform - ALL portal UI, text, icons, and theming must be customizable per tenant

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

### 1. Explore RAWDOG Customer Portal

Use the Explore agent or read these source files:
```
/src/app/account/                # Customer portal pages
/src/lib/customer-auth/          # Customer authentication
/src/lib/customer-queries.ts     # Shopify Customer API queries
/src/lib/subscriptions/customer-api.ts  # Subscription management
/src/components/ui/AccountIcons.tsx     # Portal icons
```

### 2. Update Master Documents

**PLAN.md** - Add comprehensive section for:
- Customer portal architecture
- Portal customization system
- Subscription lifecycle management
- White-label theming

**PROMPT.md** - Add patterns for:
- Portal theming database schema
- Custom domain routing
- Feature toggle implementation

### 3. Create Phase Docs

Create 3-4 phase docs in `/docs/MULTI-TENANT-PLATFORM-PLAN/`:
- `PHASE-XX-CUSTOMER-PORTAL-PAGES.md`
- `PHASE-XX-PORTAL-THEMING-CUSTOMIZATION.md`
- `PHASE-XX-PORTAL-ADMIN-PAGES.md`
- `PHASE-XX-SUBSCRIPTION-PROVIDER-INTEGRATION.md`

---

## Context

RAWDOG has a comprehensive customer portal for order history, subscription management, address book, profile, and store credit. For the multi-tenant platform:

- Each tenant gets their own branded customer portal
- Portal UI is fully customizable (colors, fonts, icons, text)
- Feature toggles allow tenants to enable/disable portal sections
- Works with tenant's Shopify store (Customer Account API)
- Subscription management integrates with tenant's subscription provider

---

## Customer Portal Architecture - WHAT We Need

### 1. Portal Pages & Routes

```
/{tenant-slug}/account (or custom domain)
├── (dashboard)                    # Main account dashboard
├── /login                         # Customer login (OAuth)
├── /callback                      # OAuth callback handler
├── /orders                        # Order history list
├── /orders/[id]                   # Order details with tracking
├── /subscriptions                 # Subscription list
├── /subscriptions/[id]            # Subscription management
├── /addresses                     # Address book
├── /profile                       # Personal information
├── /store-credit                  # Balance and transactions
├── /rewards                       # Loyalty points (if enabled)
├── /referrals                     # Referral program (if enabled)
└── /settings                      # Communication preferences
```

---

### 2. Portal Dashboard (/account)

**Outcomes:**
- Personalized welcome with customer name
- Quick stats (active subscriptions, pending orders, credit balance)
- Quick access cards to all enabled portal sections
- Feature cards only show for sections tenant has enabled
- Fully customizable card icons and labels

**Customizable Elements:**
- Welcome message text
- Section card icons (upload custom or choose from library)
- Section card labels (e.g., "My Orders" vs "Order History")
- Card order/arrangement
- Colors and styling

---

### 3. Authentication Flow

**Outcomes:**
- OAuth with tenant's Shopify store (Customer Account API)
- PKCE security flow for token exchange
- Secure token storage (HTTP-only cookies)
- Post-login redirect to original destination
- Session management with refresh tokens

**Customizable Elements:**
- Login page branding (logo, colors, background)
- "Sign In" button text
- Benefits list shown on login page
- Terms/Privacy policy links
- "New customer?" call-to-action text

---

### 4. Order History (/account/orders)

**Outcomes:**
- Paginated list of all customer orders
- Each order shows: number, date, products, status, total
- Color-coded status badges (pending, processing, shipped, delivered)
- Subscription order badge for recurring orders
- Click through to order details
- Empty state with shop call-to-action

**Customizable Elements:**
- Status badge colors and labels
- Date/time format
- "View Order" button text
- Empty state message and CTA

---

### 5. Order Details (/account/orders/[id])

**Outcomes:**
- Complete order information display
- Line items with images, titles, variants, quantities, prices
- Order tracking with carrier links
- Price breakdown (subtotal, shipping, tax, discounts, total)
- Shipping address shown
- Support contact link

**Customizable Elements:**
- Section labels
- Support contact link text/destination
- Price display format
- Tracking link behavior (new tab vs same tab)

---

### 6. Subscription Management (/account/subscriptions)

**Outcomes:**
- List all customer subscriptions with status
- Status display: ACTIVE, PAUSED, CANCELLED, EXPIRED
- Next delivery date for active subscriptions
- Frequency display (e.g., "Every 2 weeks")
- Quick stats per subscription
- Click through to management page

**Customizable Elements:**
- Status badge colors and labels
- Frequency display format
- Section heading
- Empty state message

---

### 7. Subscription Details (/account/subscriptions/[id])

**Outcomes:**
- Full subscription information
- Subscribed products with images, variants, quantities
- Applied discounts displayed
- Order history for this subscription
- Next order preview with pricing

**Management Actions (based on status):**

For ACTIVE subscriptions:
- Pause subscription
- Skip next order
- Reschedule next order (date picker)
- Order now (immediate charge)

For PAUSED subscriptions:
- Resume subscription

For ACTIVE or PAUSED:
- Cancel subscription (with reason selection)
- Update payment method
- Update shipping address
- Contact support

For CANCELLED:
- Reactivate option
- Cancellation date and reason shown

For EXPIRED:
- Start new subscription link

**Modals:**
- Cancel modal with reason selection
- Reschedule modal with date picker
- Payment method modal with existing methods
- Skip/pause confirmation modals

**Customizable Elements:**
- Action button labels and colors
- Cancellation reasons list
- Modal text and styling
- Support contact info

---

### 8. Address Management (/account/addresses)

**Outcomes:**
- Grid display of saved addresses
- Default address badge
- Add new address form
- Edit existing address
- Delete address (if not only one)
- Set address as default
- State/province dropdown for form

**Form Fields:**
- First Name, Last Name (required)
- Company (optional)
- Address Line 1 (required)
- Address Line 2 (optional)
- City (required)
- State/Province (dropdown)
- Postal Code (required)
- Phone (optional)
- "Set as default" checkbox

**Customizable Elements:**
- Form field labels
- Validation messages
- Default badge text
- Country/state dropdown options
- Required field indicators

---

### 9. Profile Management (/account/profile)

**Outcomes:**
- View and edit personal information
- First name, last name editable
- Email display (change requires support)
- Phone display (change requires support)
- Quick links to other portal sections

**Customizable Elements:**
- Section labels
- "Contact support to update" messaging
- Quick link labels
- Form styling

---

### 10. Store Credit (/account/store-credit)

**Outcomes:**
- Balance display in prominent box
- Transaction history list
- Transaction types: Credit Added, Credit Used, Expired, Refunded
- Date and amount per transaction
- Running balance shown
- FAQ section

**Customizable Elements:**
- Balance display format
- Transaction type labels
- FAQ content
- Empty state message

---

### 11. Optional Portal Sections

**Rewards/Loyalty (/account/rewards)** - If tenant has loyalty program

**Outcomes:**
- Points balance display
- Points history
- Available rewards to redeem
- Points earning rules
- Tier status (if tiered program)

**Referrals (/account/referrals)** - If tenant has referral program

**Outcomes:**
- Unique referral code/link
- Referral stats (invited, converted, earned)
- Share buttons (email, social)
- Referral rewards history

**Communication Preferences (/account/settings)**

**Outcomes:**
- Email notification toggles
- SMS opt-in/out (if enabled)
- Marketing preferences
- Order update preferences

---

## Portal Theming & Customization - WHAT Tenants Configure

### 1. Theme Settings (/admin/portal/theme)

**Outcomes:**
- Visual theme editor for customer portal
- Live preview of changes
- Changes apply to all portal pages

**Customizable Theme Elements:**

**Colors:**
- Primary color (buttons, links, accents)
- Secondary color (hover states, badges)
- Background color
- Card background color
- Text color
- Border color
- Status colors (success, warning, error, info)

**Typography:**
- Font family (upload custom or choose from library)
- Heading font family
- Base font size
- Line height
- Font weights

**Branding:**
- Logo upload (header, login page)
- Favicon
- Portal title/name

**Layout:**
- Max content width
- Card border radius
- Button border radius
- Spacing scale

---

### 2. Icon Customization (/admin/portal/icons)

**Outcomes:**
- Replace default portal icons with custom
- Upload SVG icons or choose from library
- Icons for: Orders, Subscriptions, Addresses, Profile, Store Credit, Rewards, Referrals

**Icon Library:**
- 50+ pre-built icons to choose from
- Categories: Commerce, Account, Navigation, Status
- Consistent sizing and styling

---

### 3. Content Customization (/admin/portal/content)

**Outcomes:**
- Edit all portal text strings
- Section-by-section content editor
- Variables for dynamic content (customer name, etc.)

**Editable Content:**
- Page titles and headings
- Button labels
- Empty state messages
- FAQ content
- Legal links (terms, privacy)
- Support contact info
- Welcome messages
- Error messages

---

### 4. Feature Toggles (/admin/portal/features)

**Outcomes:**
- Enable/disable portal sections per tenant
- Core features (orders, subscriptions) always enabled
- Optional features toggled individually

**Toggleable Features:**
- Store Credit section
- Rewards/Loyalty section
- Referrals section
- Communication preferences
- Order tracking integration
- Subscription self-service actions (pause, skip, cancel)

**Action Toggles (per action):**
- Allow customers to pause subscriptions
- Allow customers to skip orders
- Allow customers to cancel (or require support)
- Allow customers to reschedule
- Allow customers to reactivate cancelled

---

### 5. Domain Configuration (/admin/portal/domain)

**Outcomes:**
- Custom domain for customer portal
- SSL certificate provisioning
- DNS setup instructions

**Options:**
- Use platform subdomain: `{tenant}.platform.com/account`
- Use tenant domain path: `{tenant-domain}/account`
- Use custom portal domain: `account.{tenant-domain}`

---

## Portal Admin Pages - WHAT Tenants See

```
/admin/portal
├── /theme                         # Colors, fonts, layout
├── /icons                         # Icon customization
├── /content                       # Text strings and labels
├── /features                      # Feature toggles
├── /domain                        # Custom domain setup
├── /analytics                     # Portal usage analytics
└── /preview                       # Live preview as customer
```

---

## Integration Points

**Shopify:**
- Customer Account API for auth, orders, addresses
- Customer data sync via webhooks
- Order tracking from Shopify

**Subscription Provider:**
- Loop, Recharge, Bold, or custom
- Subscription CRUD operations
- Payment method management
- Billing and delivery scheduling

**Store Credit:**
- Platform store credit system
- Balance and transaction queries
- Automatic application at checkout

**Loyalty/Rewards:**
- Integration with tenant's loyalty provider
- Or platform-native loyalty system

---

## Database Architecture - WHAT Gets Stored

**Portal Theme Settings:**
- tenant_id
- colors (JSON: primary, secondary, background, etc.)
- typography (JSON: fontFamily, headingFont, sizes)
- branding (JSON: logoUrl, faviconUrl, portalTitle)
- layout (JSON: maxWidth, borderRadius, spacing)
- updated_at

**Portal Icons:**
- tenant_id
- icon_key (orders, subscriptions, addresses, etc.)
- icon_type (library, custom)
- icon_value (library ID or custom SVG URL)

**Portal Content:**
- tenant_id
- content_key (hierarchical: pages.orders.title, pages.orders.empty_state, etc.)
- content_value (text with optional variables)
- updated_at

**Portal Feature Flags:**
- tenant_id
- feature_key
- is_enabled
- config (JSON for feature-specific settings)

**Portal Domain:**
- tenant_id
- domain_type (platform, tenant_path, custom)
- custom_domain
- ssl_status (pending, active, failed)
- dns_verified

---

## Multi-Tenant Considerations

**Per-Tenant Isolation:**
- Each tenant has completely separate portal configuration
- No cross-tenant data visibility
- Separate OAuth credentials per tenant's Shopify store

**Theming:**
- Theme changes don't affect other tenants
- CSS isolation between tenant portals
- Custom fonts uploaded per tenant

**Domain Routing:**
- Platform routes to correct tenant based on domain/path
- Custom domains verified per tenant
- SSL managed per custom domain

---

## Non-Negotiable Requirements

**Portal Pages:**
- All pages in RAWDOG portal must be available
- Orders with history and details
- Subscriptions with full lifecycle management
- Address book with CRUD
- Profile with editable fields
- Store credit with transactions

**Customization:**
- Theme editor with colors, fonts, layout
- Icon customization (upload or library)
- All text strings editable
- Feature toggles for optional sections
- Custom domain support

**Authentication:**
- Shopify Customer Account API OAuth
- PKCE security flow
- Secure token management
- Session refresh

**Multi-Tenant:**
- Complete tenant isolation
- Per-tenant theming
- Per-tenant feature flags
- Per-tenant content

---

## Definition of Done

- [ ] Customer portal works with tenant's Shopify store
- [ ] OAuth authentication flow works correctly
- [ ] All portal pages render with tenant's theme
- [ ] Theme editor allows color, font, layout customization
- [ ] Icons can be customized (upload or library)
- [ ] All text strings are editable in admin
- [ ] Feature toggles work for optional sections
- [ ] Subscription management actions work (pause, skip, cancel, reschedule)
- [ ] Address CRUD works with subscription sync
- [ ] Store credit displays balance and history
- [ ] Custom domain configuration works
- [ ] Multi-tenant isolation verified
- [ ] No hardcoded branding or text
- [ ] Portal preview mode works for admins

---

## Output Checklist

- [ ] PLAN.md updated with customer portal section
- [ ] Phase doc for portal pages and authentication
- [ ] Phase doc for portal theming and customization
- [ ] Phase doc for portal admin pages
- [ ] Phase doc for subscription provider integration
- [ ] PROMPT.md updated with portal customization patterns
