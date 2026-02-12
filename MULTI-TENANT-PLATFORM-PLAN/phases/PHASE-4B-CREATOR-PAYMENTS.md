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

- [ ] Stripe Connect Express integration working for US creators
- [ ] `createAccount` and `createPayout` methods functional
- [ ] Wise Business API integration working for international creators
- [ ] `createQuote`, `createRecipient`, `createTransfer` methods functional
- [ ] Payment provider selection logic (`selectProvider`) routes correctly
- [ ] `WISE_SUPPORTED_COUNTRIES` list defined and used
- [ ] Unified balance system aggregates across brands
- [ ] `getCreatorBalance` function returns pending/available/withdrawn
- [ ] `creator_balance_transactions` table tracks all movements
- [ ] Withdrawal request flow working (`requestWithdrawal`)
- [ ] `withdrawal_requests` table created
- [ ] Inngest event `payout/requested` fires on withdrawal
- [ ] **Payout methods settings UI with Stripe Connect setup flow**
- [ ] **Payments page with detailed earnings breakdown**
- [ ] **Transaction history with filtering and pagination**
- [ ] **Withdrawal timeline showing request progress**
- [ ] **Store credit integration with 10% bonus option**
- [ ] **W-9 requirement blocking for US creators**
- [ ] **Contract blocking for unsigned documents**

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
- [ ] Create `packages/payments/src/providers/stripe.ts`
- [ ] Implement StripeConnect class with createAccount, createPayout
- [ ] Create `packages/payments/src/providers/wise.ts`
- [ ] Implement WiseBusiness class with createQuote, createRecipient, createTransfer, fundTransfer

### [PARALLEL with providers] Database tables
- [ ] Create migration for `public.creator_balance_transactions`
- [ ] Create migration for `public.withdrawal_requests`
- [ ] Create migration for `public.creator_payment_methods`
- [ ] Add indexes for creatorId, brandId, type, created_at

### [SEQUENTIAL after providers] Provider selection
- [ ] Create `packages/payments/src/payout.ts`
- [ ] Define `WISE_SUPPORTED_COUNTRIES` array
- [ ] Implement `selectProvider(request)` function
- [ ] Implement `executePayout(request)` orchestrator

### [SEQUENTIAL after database] Balance system
- [ ] Implement `getCreatorBalance(creatorId, brandId?)` in creator-portal
- [ ] Handle aggregation across brands
- [ ] Handle byBrand breakdown
- [ ] Calculate upcoming maturations (pending → available dates)
- [ ] Calculate earnings breakdown by type

### [SEQUENTIAL after balance] Withdrawal flow
- [ ] Implement `requestWithdrawal(creatorId, amountCents, paymentMethodId, payoutType)`
- [ ] Add balance validation
- [ ] Add pending withdrawal check
- [ ] Add W-9 requirement validation for US creators
- [ ] Add unsigned contract blocking
- [ ] Implement Inngest event sending for `payout/requested`
- [ ] Create withdrawal request API route

### [PARALLEL] Payout methods settings UI
- [ ] Create `GET /api/creator/payments/methods` route
- [ ] Create `PATCH /api/creator/payments/methods` route
- [ ] Create `DELETE /api/creator/payments/methods` route
- [ ] Create Stripe Connect onboarding routes
- [ ] Create OAuth flow for Standard accounts (Brazil)
- [ ] Build payout methods page at `/creator/settings/payout-methods`
- [ ] Build Stripe setup form at `/creator/settings/payout-methods/stripe-setup`
- [ ] Implement country detection for account type selection
- [ ] Handle OAuth callback and token exchange

### [PARALLEL] Payments page UI
- [ ] Create `GET /api/creator/payments/balance` route
- [ ] Create `GET /api/creator/payments/transactions` route
- [ ] Create `GET /api/creator/payments/withdraw` route (list)
- [ ] Create `POST /api/creator/payments/withdraw` route (create)
- [ ] Create `GET /api/creator/payments/store-credit` route
- [ ] Build payments page at `/creator/payments`
- [ ] Build balance cards grid (Available, Pending, Paid)
- [ ] Build payout method setup alert
- [ ] Build W-9 requirement alert
- [ ] Build contract blocking alert
- [ ] Build earnings summary breakdown
- [ ] Build upcoming funds release section
- [ ] Build 30-day hold explainer
- [ ] Build transaction history with filtering and pagination
- [ ] Build store credit balance card

### [PARALLEL] Withdrawal UI
- [ ] Build withdrawal request modal
- [ ] Build amount input with minimum validation
- [ ] Build payout type toggle (Cash vs Store Credit)
- [ ] Build payment method selector
- [ ] Build store credit bonus preview
- [ ] Build `WithdrawalTimeline` component
- [ ] Build completed withdrawals history list
- [ ] Implement withdrawal success/error feedback

### [PARALLEL] Contract status integration
- [ ] Create `GET /api/creator/contract-status` route
- [ ] Implement blocking check for unsigned contracts
- [ ] Build contract blocking UI in payments page

### [PARALLEL] Store credit integration
- [ ] Implement Shopify customer linking on store credit withdrawal
- [ ] Implement 10% bonus calculation
- [ ] Build store credit history display
- [ ] Create store credit API integration

---

## Definition of Done

- [ ] Stripe test payout succeeds to test account
- [ ] Wise test transfer succeeds (sandbox)
- [ ] Balance correctly calculated from transactions
- [ ] Withdrawal request creates pending record
- [ ] Inngest event fires on withdrawal request
- [ ] Provider selection routes US to Stripe, international to Wise
- [ ] **Payout methods settings page fully functional**
- [ ] **Stripe Connect setup flow works end-to-end**
- [ ] **Payments page shows all balance cards**
- [ ] **Transaction history filters and paginates correctly**
- [ ] **Withdrawal modal submits successfully**
- [ ] **Withdrawal timeline shows correct progress**
- [ ] **Store credit withdrawal applies 10% bonus**
- [ ] **W-9 blocking works for US creators**
- [ ] **Contract blocking prevents unauthorized withdrawals**
- [ ] `npx tsc --noEmit` passes
- [ ] Unit tests pass for payout flows
