# PHASE-3CP-A: Customer Portal Core Pages

> **STATUS**: ✅ COMPLETE (2026-02-11)
> **Completed By**: Wave 2 Agents

**Duration**: 1.5 weeks
**Depends On**: PHASE-3A-STOREFRONT-FOUNDATION
**Parallel With**: PHASE-3CP-B, PHASE-3CP-C, PHASE-3CP-D
**Blocks**: None (Customer Portal phases are parallel)

---

## Goal

Create the core customer portal pages that allow end customers to view and manage their orders, subscriptions, addresses, profile, and store credit. Each page must be tenant-isolated and use the content customization system for all text strings.

---

## Success Criteria

- [ ] Dashboard page displays customer overview with navigation cards
- [ ] Orders page lists order history with details and tracking
- [ ] Subscriptions page shows active/paused/cancelled subscriptions
- [ ] Addresses page enables CRUD for shipping addresses
- [ ] Profile page allows updating customer information
- [ ] Store Credit page displays balance and transaction history
- [ ] All pages use Shopify Customer Account API
- [ ] All pages use content customization system (no hardcoded strings)
- [ ] All pages respect tenant feature flags
- [ ] OAuth PKCE flow handles customer authentication
- [ ] `npx tsc --noEmit` passes

---

## Reference Implementation

**RAWDOG Source Files (read for patterns):**
- `/src/app/account/page.tsx` - Dashboard layout and navigation cards
- `/src/app/account/orders/page.tsx` - Order history
- `/src/app/account/subscriptions/[id]/page.tsx` - Subscription management
- `/src/app/account/addresses/page.tsx` - Address book
- `/src/app/account/profile/page.tsx` - Profile editor
- `/src/app/account/store-credit/page.tsx` - Store credit balance
- `/src/lib/customer-auth/` - OAuth implementation
- `/src/lib/subscriptions/customer-api.ts` - Subscription API wrapper
- `/src/components/ui/AccountIcons.tsx` - Portal icons (stroke-based SVGs)

---

## Deliverables

### 1. OAuth Authentication Module

```
packages/portal/src/auth/
├── oauth.ts           # initiateShopifyLogin(), handleCallback()
├── session.ts         # Customer session management
├── middleware.ts      # Auth middleware for portal routes
└── types.ts           # OAuth types
```

**Key Functions:**
- `initiateShopifyLogin(tenantId, redirectAfterLogin)` - Starts OAuth PKCE flow
- `handleShopifyCallback(code, state)` - Exchanges code for tokens
- `getCustomerSession(req)` - Retrieves current customer session
- `refreshCustomerToken(tenantId, customerId)` - Refreshes expired tokens
- `logout(tenantId)` - Clears customer session

**OAuth Configuration (per tenant):**
```typescript
interface ShopifyOAuthConfig {
  tenantId: string
  shopId: string
  clientId: string
  clientSecretEncrypted: string
  redirectUri: string
  scopes: string[] // ['openid', 'email', 'customer-account-api:full']
}
```

### 2. Customer Query Module

```
packages/portal/src/api/
├── customer.ts        # GraphQL queries for customer data
├── orders.ts          # Order history queries
├── subscriptions.ts   # Subscription queries (provider abstraction)
├── addresses.ts       # Address CRUD
└── store-credit.ts    # Store credit queries
```

**Customer Query Pattern:**
```typescript
// ✅ CORRECT - Use accessToken from session
export async function customerQuery<T>(
  tenantId: string,
  accessToken: string,
  { query, variables }: GraphQLRequest
): Promise<GraphQLResponse<T>> {
  const config = await getShopifyConfig(tenantId)

  const response = await fetch(
    `https://shopify.com/${config.shopId}/account/customer/api/2025-01/graphql`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': accessToken,
      },
      body: JSON.stringify({ query, variables }),
    }
  )

  return response.json()
}
```

### 3. Dashboard Page

**Route:** `/account`

**Components:**
- Welcome header with customer name
- Sign out button
- Navigation cards (Orders, Subscriptions, Addresses, Profile, Store Credit)
- Store credit balance display (if enabled)
- Quick stats (total orders, active subscriptions)

**Feature Flags Checked:**
- `orders` - Show orders card
- `subscriptions` - Show subscriptions card
- `addresses` - Show addresses card
- `profile` - Show profile card
- `store_credit` - Show store credit card
- `rewards` - Show rewards card (optional)
- `referrals` - Show referrals card (optional)

### 4. Orders Page

**Route:** `/account/orders`

**Components:**
- Order list with pagination
- Order status badges (Confirmed, Shipped, Delivered, Cancelled)
- Order details expansion/modal
- Tracking link integration
- Line items display

**GraphQL Query:**
```graphql
query GetOrders($first: Int!, $after: String) {
  customer {
    orders(first: $first, after: $after, sortKey: PROCESSED_AT, reverse: true) {
      nodes {
        id
        name
        processedAt
        fulfillmentStatus
        financialStatus
        currentTotalPrice { amount currencyCode }
        lineItems(first: 10) {
          nodes {
            title
            quantity
            image { url altText }
          }
        }
        shippingAddress { address1 city province zip country }
        fulfillments { trackingCompany trackingNumber trackingUrl }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
}
```

### 5. Subscriptions Page

**Route:** `/account/subscriptions`

**Components:**
- Subscription list
- Status badges (Active, Paused, Cancelled)
- Next delivery date
- Subscription frequency display
- Quick actions (if feature flags enabled)

**Subscription Detail Route:** `/account/subscriptions/[id]`

**Detail Components:**
- Subscription overview (product, frequency, price)
- Next order info with date
- Action buttons (controlled by feature flags):
  - Pause/Resume button (`subscription_pause`)
  - Skip next order button (`subscription_skip`)
  - Cancel button (`subscription_cancel_self_serve`)
  - Reschedule button (`subscription_reschedule`)
  - Update payment button (`subscription_payment_update`)
  - Update address button (`subscription_address_update`)
- Order history within subscription
- Cancel modal with reason selection
- Pause duration modal
- Reschedule date picker modal

### 6. Addresses Page

**Route:** `/account/addresses`

**Components:**
- Address list with default indicator
- Add new address button
- Edit address modal
- Delete address confirmation
- Set as default option

**GraphQL Mutations:**
```graphql
mutation CreateAddress($input: AddressInput!) {
  customerAddressCreate(address: $input) {
    address { id address1 address2 city province zip country phone }
    userErrors { field message }
  }
}

mutation UpdateAddress($id: ID!, $input: AddressInput!) {
  customerAddressUpdate(addressId: $id, address: $input) {
    address { id address1 address2 city province zip country phone }
    userErrors { field message }
  }
}

mutation DeleteAddress($id: ID!) {
  customerAddressDelete(addressId: $id) {
    deletedAddressId
    userErrors { field message }
  }
}
```

### 7. Profile Page

**Route:** `/account/profile`

**Components:**
- First name / Last name fields
- Email display (read-only or with email change flow)
- Phone number field
- Save button
- Password change link (redirects to Shopify)

### 8. Store Credit Page

**Route:** `/account/store-credit`

**Components:**
- Current balance display (prominently styled)
- Transaction history table
- Transaction types (Credit added, Used at checkout, Expired, Refund)
- Date and amount for each transaction

**GraphQL Query:**
```graphql
query GetStoreCredit {
  customer {
    storeCreditAccounts(first: 5) {
      nodes {
        id
        balance { amount currencyCode }
      }
    }
  }
}
```

---

## File Structure

```
apps/portal/
├── src/
│   ├── app/
│   │   ├── layout.tsx                    # Portal layout with theme injection
│   │   ├── page.tsx                      # Redirect to /account
│   │   ├── login/
│   │   │   └── page.tsx                  # Login page
│   │   ├── callback/
│   │   │   └── route.ts                  # OAuth callback
│   │   └── account/
│   │       ├── page.tsx                  # Dashboard
│   │       ├── orders/
│   │       │   ├── page.tsx              # Order list
│   │       │   └── [id]/page.tsx         # Order detail
│   │       ├── subscriptions/
│   │       │   ├── page.tsx              # Subscription list
│   │       │   └── [id]/page.tsx         # Subscription detail
│   │       ├── addresses/
│   │       │   └── page.tsx              # Address book
│   │       ├── profile/
│   │       │   └── page.tsx              # Profile editor
│   │       └── store-credit/
│   │           └── page.tsx              # Store credit
│   ├── components/
│   │   ├── layout/
│   │   │   ├── PortalHeader.tsx
│   │   │   └── PortalFooter.tsx
│   │   ├── cards/
│   │   │   ├── NavigationCard.tsx        # Dashboard nav cards
│   │   │   ├── OrderCard.tsx
│   │   │   └── SubscriptionCard.tsx
│   │   ├── modals/
│   │   │   ├── CancelModal.tsx
│   │   │   ├── PauseModal.tsx
│   │   │   ├── RescheduleModal.tsx
│   │   │   ├── AddressModal.tsx
│   │   │   └── PaymentModal.tsx
│   │   └── icons/
│   │       └── PortalIcons.tsx           # Icon component using icon system
│   └── lib/
│       └── hooks/
│           ├── useCustomer.ts            # Customer data hook
│           ├── useOrders.ts              # Orders hook
│           ├── useSubscriptions.ts       # Subscriptions hook
│           └── useContent.ts             # Content strings hook

packages/portal/
├── src/
│   ├── auth/                             # OAuth module (detailed above)
│   ├── api/                              # API query module (detailed above)
│   ├── content/
│   │   ├── getContent.ts                 # Content string retrieval
│   │   └── defaults.ts                   # Default content strings
│   └── features/
│       └── isEnabled.ts                  # Feature flag checks
```

---

## Anti-Patterns

```typescript
// ❌ NEVER - Hardcode text strings
<h1>My Account</h1>
<button>Pause Subscription</button>

// ✅ ALWAYS - Use content system
<h1>{content['dashboard.title']}</h1>
<button>{content['subscriptions.pause']}</button>

// ❌ NEVER - Show features without checking flags
<button onClick={handleCancel}>Cancel</button>

// ✅ ALWAYS - Check feature flags
{features.subscription_cancel_self_serve && (
  <button onClick={handleCancel}>{content['subscriptions.cancel']}</button>
)}

// ❌ NEVER - Query without tenant context
const orders = await customerQuery({ query: GET_ORDERS })

// ✅ ALWAYS - Include tenant context for config lookup
const orders = await customerQuery(tenantId, accessToken, { query: GET_ORDERS })

// ❌ NEVER - Store OAuth tokens in localStorage
localStorage.setItem('accessToken', token)

// ✅ ALWAYS - Use HTTP-only cookies or server session
await setCustomerSession(tenantId, customerId, tokens)
```

---

## Definition of Done

- [ ] All 6 core portal pages functional
- [ ] OAuth PKCE flow authenticates customers
- [ ] All text uses content customization system
- [ ] All features respect feature flags
- [ ] Subscription actions use provider abstraction
- [ ] Icons use icon system with tenant fallback
- [ ] `npx tsc --noEmit` passes
- [ ] No hardcoded strings or styles in components
