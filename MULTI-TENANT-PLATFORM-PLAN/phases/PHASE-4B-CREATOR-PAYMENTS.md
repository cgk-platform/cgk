# PHASE-4B: Creator Payments & Payouts

**Status**: ✅ COMPLETE
**Duration**: 1.5 weeks (Week 16-17)
**Depends On**: PHASE-4A (creator portal foundation)
**Parallel With**: None
**Blocks**: PHASE-4C, PHASE-4D

---

## Goal

Implement hybrid payment system supporting both Stripe Connect (US domestic) and Wise Business API (international). Build unified balance tracking, withdrawal request system, detailed earnings analytics UI, payout method settings UI, and store credit integration.

---

## Success Criteria

- [x] Stripe Connect Express integration working for US creators
- [x] `createAccount` and `createPayout` methods functional
- [x] Wise Business API integration working for international creators
- [x] `createQuote`, `createRecipient`, `createTransfer` methods functional
- [x] Payment provider selection logic (`selectProvider`) routes correctly
- [x] `WISE_SUPPORTED_COUNTRIES` list defined and used
- [x] Unified balance system aggregates across brands
- [x] `getCreatorBalance` function returns pending/available/withdrawn
- [x] `creator_balance_transactions` table tracks all movements
- [x] Withdrawal request flow working (`requestWithdrawal`)
- [x] `withdrawal_requests` table created
- [x] Inngest event `payout/requested` fires on withdrawal
- [x] **Payout methods settings UI with Stripe Connect setup flow**
- [x] **Payments page with detailed earnings breakdown**
- [x] **Transaction history with filtering and pagination**
- [x] **Withdrawal timeline showing request progress**
- [x] **Store credit integration with 10% bonus option**
- [x] **W-9 requirement blocking for US creators**
- [x] **Contract blocking for unsigned documents**

---

## Deliverables

### Payment Provider Abstraction

- `PayoutProvider` interface: name, createAccount, createPayout
- `PayoutRequest` type: amountCents, currency, country, recipientId, referenceId
- `PayoutResult` type: success, provider, transferId, estimatedArrival, error

### Stripe Connect Provider

- `StripeConnect` class implementing `PayoutProvider`
- `createAccount(creator)` - Creates Express account
- `createPayout(request)` - Creates transfer to connected account
- Account capabilities: transfers requested

### Wise Business Provider

- `WiseBusiness` class implementing `PayoutProvider`
- `createQuote(request)` - Gets exchange rate quote
- `createRecipient(creatorId)` - Creates/gets bank recipient
- `createTransfer(quote, recipient)` - Initiates transfer
- `fundTransfer(transferId)` - Funds from balance
- API URL: `https://api.wise.com/v1`

### Provider Selection

- `selectProvider(request)` function
- Logic: US -> Stripe, International (supported) -> Wise, Fallback -> Stripe Custom
- `WISE_SUPPORTED_COUNTRIES` constant array

### Balance System

- `getCreatorBalance(creatorId, brandId?)` function
- Returns: pending, available, withdrawn, byBrand breakdown
- Database table: `public.creator_balance_transactions`
- Transaction types: commission_pending, commission_available, project_payment, bonus, withdrawal

### Withdrawal Requests

- `requestWithdrawal(creatorId, amountCents, paymentMethodId)` function
- Balance validation before request
- Pending withdrawal check (only one active at a time)
- Database table: `public.withdrawal_requests`
- Inngest event: `payout/requested` with requestId, creatorId

### Payout Methods Settings UI

Full-featured payout method management page at `/creator/settings/payout-methods`.

**Features:**
- **Bank Account (Stripe Connect)** - Primary recommended method
  - Connect button starts Stripe onboarding flow
  - Status indicator: Active, Setup Required
  - "Complete Setup" for incomplete onboarding
  - Country-specific handling (Brazil uses Standard accounts via OAuth)
- **Legacy Methods** - Display only if previously configured
  - PayPal, Venmo, Check support
  - Set as default, Remove actions
  - Verification status badges
- **Help Text** - How payouts work, timing, minimum amounts

**Stripe Connect Setup Flow:**
- Self-hosted setup form at `/creator/settings/payout-methods/stripe-setup`
- Country detection and appropriate account type selection
- Express accounts for most countries
- Standard accounts (OAuth) for Brazil and unsupported regions
- Bank account collection via Stripe's hosted UI
- Onboarding completion callback handling

**API Routes:**
- `GET /api/creator/payments/methods` - List payment methods
- `PATCH /api/creator/payments/methods` - Set default method
- `DELETE /api/creator/payments/methods` - Remove method
- `GET /api/creator/payments/connect/onboard` - Stripe status
- `POST /api/creator/payments/connect/onboard` - Start Stripe onboarding
- `GET /api/creator/payments/connect/oauth` - OAuth for Standard accounts
- `GET /api/creator/payments/connect/oauth/callback` - OAuth callback
- `POST /api/creator/payments/connect/update` - Update account info
- `POST /api/creator/payments/connect/bank-account` - Add bank account
- `GET /api/creator/payments/connect/countries` - Supported countries

### Payments Page UI

Comprehensive earnings and payments dashboard at `/creator/payments`.

**Balance Cards (Grid):**
- **Available Balance** - Ready for withdrawal, green styling
  - Request Withdrawal button (disabled if below minimum)
  - W-9 requirement link if applicable
  - Contract blocking message if unsigned contracts exist
- **Pending Balance** - In 30-day hold, amber styling
- **Total Paid** - All-time earnings paid out

**Payout Method Alert:**
- Shown if no payment method configured or Stripe incomplete
- Link to `/creator/settings/payout-methods`
- "Complete Stripe Setup" or "Set Up Payout Method" CTA

**W-9 Requirement Alert:**
- Shown for US-based creators without W-9
- Red styling, blocking withdrawal
- Link to `/creator/settings/tax`

**Contract Blocking Alert:**
- Shown if unsigned contracts exist
- Red styling, lists contract count
- Link to `/creator/contracts`

**Earnings Summary Breakdown:**
- Grid showing earnings by type:
  - Commissions (from sales)
  - Project Payments (flat rate work)
  - Bonuses (extra rewards)
  - Adjustments (manual credits)
- Total Earned aggregate

**Upcoming Funds Release:**
- List of pending commissions maturing soon
- Date, count, and amount per day
- Shows next 5 upcoming releases

**30-Day Hold Explainer:**
- Educational banner explaining why commissions are held
- Project payments available immediately message

**Transaction History:**
- Filterable list (All, Commission Pending, Commission Available, Project Payment, Withdrawal, Bonus, Adjustment)
- Each row: Type badge, description, timestamp, amount (+/-), balance after
- Pagination controls (20 per page)
- Empty state for new creators

**Store Credit Integration:**
- Store credit balance card (if configured)
- Transaction history for store credit
- Shop link for using credit

### Withdrawal Modal & Timeline

**Withdrawal Request Modal:**
- Available balance display
- Amount input with minimum validation ($25)
- Payout type toggle: Cash vs Store Credit (+10% bonus)
- Payment method selection (for cash)
- Store credit bonus preview
- Submit button with loading state
- Success/error feedback

**Withdrawal Timeline Component:**
- Visual timeline for active withdrawals
- States: Pending → Processing → Completed (or Rejected/Failed)
- International: Pending → Pending Topup → Processing → Completed
- Estimated completion date
- Status-specific messaging and icons

**Completed Withdrawals History:**
- List of past completed withdrawals
- Date, amount, type (Cash/Store Credit)
- Store credit shows base + bonus breakdown
- Payout reference for tracking
- Creator note from admin if applicable

### Store Credit System

**Features:**
- 10% bonus for store credit withdrawals
- Shopify customer account linking
- Real-time balance from Shopify
- Transaction history from Shopify
- Shop at justrawdogit.com link

**API Routes:**
- `GET /api/creator/payments/store-credit` - Get store credit data
- Store credit applied via Shopify Customer API on withdrawal completion

---

## Constraints

- Stripe API key from `process.env.STRIPE_SECRET_KEY`
- Wise API key from `process.env.WISE_API_KEY`
- Wise profile ID from `process.env.WISE_PROFILE_ID`
- US creators default to Stripe (faster, simpler)
- International creators use Wise (better FX rates)
- Only one pending/processing withdrawal allowed per creator
- Rejected/failed withdrawals don't block new requests
- All amounts stored in cents
- **Minimum withdrawal: $25 (2500 cents)**
- **W-9 required for US-based creators before withdrawal**
- **Unsigned contracts block withdrawals**
- **Store credit bonus: 10%**

---

## Pattern References

**Skills to invoke:**
- `/frontend-design` - Withdrawal request form, payment method selection, earnings dashboard
- `obra/superpowers@test-driven-development` - TDD for payout flows (critical)

**MCPs to consult:**
- Context7 MCP: "Stripe Connect Express accounts"
- Context7 MCP: "Wise Business API transfers"
- Context7 MCP: "Inngest event sending"

**RAWDOG code to reference:**
- `src/lib/payments/` - Existing payment patterns
- `src/lib/payments/payee-stripe-country-specs.ts` - Country handling
- `src/app/creator/settings/payout-methods/` - **Full payout methods UI**
- `src/app/creator/settings/payout-methods/stripe-setup/` - **Stripe setup flow**
- `src/app/creator/payments/` - **Complete payments page**
- `src/components/creator-portal/WithdrawalTimeline.tsx` - **Withdrawal timeline component**

**Spec documents:**
- `ARCHITECTURE.md` - Event-driven patterns

---

## Frontend Design Skill Integration

**1. Payout Methods Settings:**
```
/frontend-design

Building payout methods settings page for PHASE-4B-CREATOR-PAYMENTS.

Requirements:
- Bank Account section (primary, recommended):
  - Stripe Connect status display
  - "Connect Bank Account" button if not connected
  - "Complete Setup" button if onboarding incomplete
  - Status badge: Active, Setup Required
  - Default indicator if set
- Legacy Methods section (if any exist):
  - List of PayPal, Venmo, Check methods
  - Status badges (Verified, Pending, Failed)
  - Set Default / Remove actions
- Brazil special handling:
  - Info banner explaining Stripe Dashboard payout control
  - Link to Stripe Dashboard for payout settings
- Help section:
  - How payouts work
  - Payout timing explanation

Design:
- Card-based sections
- Primary action for Stripe prominent
- Legacy methods less prominent
- Clear status indicators
```

**2. Payments Dashboard:**
```
/frontend-design

Building payments page for PHASE-4B-CREATOR-PAYMENTS.

Requirements:
- Balance Cards Grid (3 columns on desktop):
  - Available Balance: Green accent, "Request Withdrawal" button
  - Pending Balance: Amber accent, "In 30-day hold" subtext
  - Total Paid: Neutral, "All-time earnings" subtext
- Alerts stack (conditionally shown):
  - Payout method setup alert (amber)
  - W-9 requirement alert (red)
  - Contract blocking alert (red)
- Earnings Summary section:
  - Grid of earning types (Commissions, Projects, Bonuses, Adjustments)
  - Each with amount and description
  - Total at bottom
- Upcoming Funds Release:
  - List of pending → available transitions
  - Date, count, amount per entry
- Transaction History:
  - Filter dropdown (All, type filters)
  - List with type badge, description, timestamp, amount, balance after
  - Pagination controls

Design:
- Clear visual hierarchy
- Balance cards most prominent
- Alerts attention-grabbing but not overwhelming
- Transaction history scrollable/paginated
```

**3. Withdrawal Modal:**
```
/frontend-design

Building withdrawal request modal for PHASE-4B-CREATOR-PAYMENTS.

Requirements:
- Header with close button
- Available balance display (large, prominent)
- Amount input:
  - Dollar prefix
  - Number input with min/max
  - Helper text showing minimum
- Payout Type selection:
  - Toggle buttons: Cash | Store Credit (+10%)
  - Store credit shows bonus preview
- Payment Method selection (for Cash):
  - Radio list of configured methods
  - Default indicator
  - Warning if none configured
- Store Credit Bonus preview:
  - Green banner showing calculated amount with bonus
- Submit button with loading state
- Error/success feedback

Design:
- Modal overlay with centered card
- Clean form layout
- Clear payout type distinction
- Store credit bonus visually highlighted
```

**4. Withdrawal Timeline:**
```
/frontend-design

Building withdrawal timeline component for PHASE-4B-CREATOR-PAYMENTS.

Requirements:
- Active withdrawal tracking (one at a time)
- Timeline states:
  - Pending: "Review in progress" message
  - Pending Topup: "Funding in progress" (international)
  - Processing: "Transfer initiated"
  - Completed: "Paid successfully"
  - Rejected/Failed: Error state with reason
- Each step shows:
  - Icon (checkmark, spinner, or error)
  - Status label
  - Timestamp if completed
- Estimated completion date display
- Amount and payout type visible

Design:
- Horizontal or vertical timeline
- Progress indication between steps
- Clear current step highlighting
- Error state visually distinct
```

---

## AI Discretion Areas

The implementing agent should determine the best approach for:
1. Stripe account type (Express vs Custom) for edge cases
2. Wise recipient caching strategy
3. Balance calculation query optimization (materialized view vs on-demand)
4. Withdrawal approval workflow (auto-approve vs manual review threshold)
5. Transaction history pagination size (20 vs 50 per page)
6. Polling interval for withdrawal status updates

---

## Tasks

### [PARALLEL] Provider implementations
- [x] Create `packages/payments/src/providers/stripe.ts`
- [x] Implement StripeConnect class with createAccount, createPayout
- [x] Create `packages/payments/src/providers/wise.ts`
- [x] Implement WiseBusiness class with createQuote, createRecipient, createTransfer, fundTransfer

### [PARALLEL with providers] Database tables
- [x] Create migration for `public.creator_balance_transactions`
- [x] Create migration for `public.withdrawal_requests`
- [x] Create migration for `public.creator_payment_methods`
- [x] Add indexes for creatorId, brandId, type, created_at

### [SEQUENTIAL after providers] Provider selection
- [x] Create `packages/payments/src/payout.ts`
- [x] Define `WISE_SUPPORTED_COUNTRIES` array
- [x] Implement `selectProvider(request)` function
- [x] Implement `executePayout(request)` orchestrator

### [SEQUENTIAL after database] Balance system
- [x] Implement `getCreatorBalance(creatorId, brandId?)` in creator-portal
- [x] Handle aggregation across brands
- [x] Handle byBrand breakdown
- [x] Calculate upcoming maturations (pending → available dates)
- [x] Calculate earnings breakdown by type

### [SEQUENTIAL after balance] Withdrawal flow
- [x] Implement `requestWithdrawal(creatorId, amountCents, paymentMethodId, payoutType)`
- [x] Add balance validation
- [x] Add pending withdrawal check
- [x] Add W-9 requirement validation for US creators
- [x] Add unsigned contract blocking
- [x] Implement Inngest event sending for `payout/requested`
- [x] Create withdrawal request API route

### [PARALLEL] Payout methods settings UI
- [x] Create `GET /api/creator/payments/methods` route
- [x] Create `PATCH /api/creator/payments/methods` route
- [x] Create `DELETE /api/creator/payments/methods` route
- [x] Create Stripe Connect onboarding routes
- [x] Create OAuth flow for Standard accounts (Brazil)
- [x] Build payout methods page at `/creator/settings/payout-methods`
- [x] Build Stripe setup form at `/creator/settings/payout-methods/stripe-setup`
- [x] Implement country detection for account type selection
- [x] Handle OAuth callback and token exchange

### [PARALLEL] Payments page UI
- [x] Create `GET /api/creator/payments/balance` route
- [x] Create `GET /api/creator/payments/transactions` route
- [x] Create `GET /api/creator/payments/withdraw` route (list)
- [x] Create `POST /api/creator/payments/withdraw` route (create)
- [x] Create `GET /api/creator/payments/store-credit` route
- [x] Build payments page at `/creator/payments`
- [x] Build balance cards grid (Available, Pending, Paid)
- [x] Build payout method setup alert
- [x] Build W-9 requirement alert
- [x] Build contract blocking alert
- [x] Build earnings summary breakdown
- [x] Build upcoming funds release section
- [x] Build 30-day hold explainer
- [x] Build transaction history with filtering and pagination
- [x] Build store credit balance card

### [PARALLEL] Withdrawal UI
- [x] Build withdrawal request modal
- [x] Build amount input with minimum validation
- [x] Build payout type toggle (Cash vs Store Credit)
- [x] Build payment method selector
- [x] Build store credit bonus preview
- [x] Build `WithdrawalTimeline` component
- [x] Build completed withdrawals history list
- [x] Implement withdrawal success/error feedback

### [PARALLEL] Contract status integration
- [x] Create `GET /api/creator/contract-status` route
- [x] Implement blocking check for unsigned contracts
- [x] Build contract blocking UI in payments page

### [PARALLEL] Store credit integration
- [x] Implement Shopify customer linking on store credit withdrawal
- [x] Implement 10% bonus calculation
- [x] Build store credit history display
- [x] Create store credit API integration

---

## Definition of Done

- [x] Stripe test payout succeeds to test account
- [x] Wise test transfer succeeds (sandbox)
- [x] Balance correctly calculated from transactions
- [x] Withdrawal request creates pending record
- [x] Inngest event fires on withdrawal request
- [x] Provider selection routes US to Stripe, international to Wise
- [x] **Payout methods settings page fully functional**
- [x] **Stripe Connect setup flow works end-to-end**
- [x] **Payments page shows all balance cards**
- [x] **Transaction history filters and paginates correctly**
- [x] **Withdrawal modal submits successfully**
- [x] **Withdrawal timeline shows correct progress**
- [x] **Store credit withdrawal applies 10% bonus**
- [x] **W-9 blocking works for US creators**
- [x] **Contract blocking prevents unauthorized withdrawals**
- [x] `npx tsc --noEmit` passes
- [x] Unit tests pass for payout flows
