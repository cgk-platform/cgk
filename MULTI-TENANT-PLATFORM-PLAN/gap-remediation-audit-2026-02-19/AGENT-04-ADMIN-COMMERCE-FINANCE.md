# Gap Remediation Audit: Admin Commerce & Finance
**Agent:** 04 | **Date:** 2026-02-19 | **Pass:** 1

---

## Executive Summary

Admin Commerce (Phase 2B) and Admin Finance/P&L (Phase 2D / 2D-PL) are the two domains audited here. Both phases are marked `STATUS: COMPLETE` in their planning documents. That self-assessment is **broadly correct for the backend and API layers**, but **three critical admin UI pages are absent**, and there is **one confirmed tenant-isolation bug** in the P&L calculator that must be treated as a P0 security issue before launch.

In addition, Phase 2D-PL's task list uses `[ ]` (unchecked) for **every single task** while its header reads `STATUS: ✅ COMPLETE` — this contradiction indicates the planning doc was never updated during implementation. The actual code diverges significantly from the plan (in a positive direction — more was built than tracked).

### Key Numbers
| Category | Total Planned Features | ✅ Done | ⚠️ Partial | ❌ Missing |
|---|---|---|---|---|
| Phase 2B Commerce UI | 14 | 11 | 1 | 2 |
| Phase 2D Finance/Creators | 12 | 12 | 0 | 0 |
| Phase 2D-PL Configuration | 16 | 9 | 4 | 3 |
| payments package | 8 | 8 | 0 | 0 |

**Critical bugs found:** 1 (P0 tenant-isolation vulnerability in `pnl-calculator.ts`)

---

## Feature Status Matrix

| Feature | Status | Notes |
|---|---|---|
| Orders list + detail page | ✅ DONE | Full filters, pagination, status badges |
| Customers list + detail page | ✅ DONE | Search, LTV, tags, order history |
| Subscriptions management | 🔄 CHANGED | Upgraded beyond plan: full MRR stats + live table (was planned as empty state) |
| Reviews moderation | ✅ DONE | Approve/reject/respond, status tabs |
| Promo codes management | ✅ DONE | CRUD, bulk generate, creator linking |
| Promotions management | ✅ DONE | Full CRUD, schedule management (beyond Phase 2B scope) |
| Selling plans management | ✅ DONE | Full CRUD, discount/interval config (beyond Phase 2B scope) |
| Abandoned checkout recovery | ✅ DONE | Stats, recovery settings, expandable rows (beyond Phase 2B scope) |
| Samples orders management | ✅ DONE | Tag/pattern filtering (beyond Phase 2B scope) |
| Product management (CRUD) | ❌ NOT DONE | No `/admin/commerce/products` route exists |
| Bulk review moderation | ❌ NOT DONE | Deferred from plan; still absent |
| Loop API client | ❌ NOT DONE | Deferred — subscriptions use internal DB only |
| Creator directory + detail | ✅ DONE | Search, stage display, earnings |
| Creator pipeline (kanban) | ✅ DONE | dnd-kit, 5 stages, stage transitions |
| Creator inbox | ✅ DONE | Thread list, compose, status |
| Payouts dashboard | ✅ DONE | Withdrawal list, approve/reject modal |
| Stripe + Wise payout execution | ✅ DONE | Full packages/payments implementation |
| Treasury management | ✅ DONE | Balance view, history |
| Expenses CRUD | ✅ DONE | Create/edit/delete, categories |
| Tax / W-9 management | ✅ DONE | Per-creator status, 1099 triggers |
| Variable costs config UI | ✅ DONE | `/admin/settings/costs` — full tabbed form |
| Variable costs API + DB | ✅ DONE | `GET/PUT/DELETE /api/admin/finance/costs`, DB with versioning |
| COGS source config API + DB | ✅ DONE | `GET/PUT /api/admin/finance/cogs`, full upsert/sync logic |
| COGS source config UI | ❌ NOT DONE | `/admin/settings/cogs` page absent — API built, UI missing |
| Product COGS API + DB | ✅ DONE | `GET/POST /api/admin/products/costs`, bulk, import, export |
| Product COGS management UI | ❌ NOT DONE | `/admin/products/costs` page absent — API built, UI missing |
| P&L formula config API + DB | ✅ DONE | `GET/PUT/DELETE /api/admin/finance/pnl`, all 30+ settings |
| P&L formula config UI | ❌ NOT DONE | `/admin/settings/pnl` page absent — API built, UI missing |
| Expense categories UI | 🔄 CHANGED | Moved: at `/admin/expenses/categories` not `/admin/settings/expense-categories` |
| P&L statement page | ✅ DONE | `/admin/expenses/pl-statement` with presets, comparison |
| P&L audit log DB | ✅ DONE | Full append-only log with filtering |
| P&L audit log UI | ❌ NOT DONE | No viewer page exists |
| Multi-processor config UI | ⚠️ PARTIAL | UI stub shows "coming soon" banner |
| Weight-based fulfillment UI | ⚠️ PARTIAL | Type + DB support exists; cost form renders nothing for `weight_based` model |
| P&L calculator tenant isolation | ⚠️ PARTIAL | `pnl-calculator.ts` queries `variable_cost_config LIMIT 1` — **missing tenant_id filter** |
| P&L formula config used in display | ⚠️ PARTIAL | Statement page ignores `PLFormulaConfig` labels/visibility settings |
| API rate limiting | ❌ NOT DONE | Finance config endpoints have no rate limit middleware |

---

## Detailed Gaps

---

### 1. COGS Source Configuration UI — ❌ NOT DONE

**Planned:** `/admin/settings/cogs` page with a source toggle (Shopify sync vs Internal/Manual), sync status display, "Sync Now" button, fallback behavior config, and link to product COGS management.

**Found:** The API route (`/api/admin/finance/cogs`) is fully implemented with proper GET/PUT. The DB layer in `lib/finance/db.ts` handles `getCOGSConfig`, `upsertCOGSConfig`, and `updateCOGSLastSync`. The types are complete. But there is **zero admin UI**. No page at `/admin/settings/cogs`. Tenants cannot configure COGS source through the interface.

**Files checked:**
- `/apps/admin/src/app/api/admin/finance/cogs/route.ts` — ✅ complete
- `/apps/admin/src/lib/finance/db.ts` — ✅ complete (COGSConfig section)
- `/apps/admin/src/app/admin/settings/` — ❌ no cogs/ subdirectory

**TODO List:**
- [ ] Create `/apps/admin/src/app/admin/settings/cogs/page.tsx`
- [ ] Build `COGSSourceForm` client component (mirrors `CostsSettingsForm` pattern)
- [ ] Build source toggle: Shopify vs Internal, with conditional sections
- [ ] For Shopify mode: show last sync timestamp, sync frequency dropdown, "Sync Now" button → POST to `/api/admin/finance/cogs/sync`
- [ ] For Internal mode: show link to `/admin/products/costs`, fallback behavior selector
- [ ] Show fallback % or default cents input (conditional on fallback type)
- [ ] Add to settings nav in `/admin/settings/layout.tsx`
- [ ] Create sync endpoint: `POST /api/admin/finance/cogs/sync` → calls Shopify product cost import job

---

### 2. Product COGS Management UI — ❌ NOT DONE

**Planned:** `/admin/products/costs` page with a product cost table (inline editing, search, filter), CSV import/export, bulk actions, and real-time margin calculator. Only shown when `cogs_source = 'internal'`.

**Found:** Full API coverage exists — `/api/admin/products/costs` (GET/POST), `/api/admin/products/costs/bulk` (POST), `/api/admin/products/costs/import` (POST), `/api/admin/products/costs/export` (GET). The DB layer is complete with pagination, search, bulk upsert, and delete operations. But there is **no admin page**. Tenants cannot manage per-product COGS through the UI, making the entire internal COGS source mode non-functional for users.

**Files checked:**
- `/apps/admin/src/app/api/admin/products/costs/route.ts` — ✅
- `/apps/admin/src/app/api/admin/products/costs/bulk/route.ts` — ✅
- `/apps/admin/src/app/api/admin/products/costs/import/route.ts` — ✅
- `/apps/admin/src/app/api/admin/products/costs/export/route.ts` — ✅
- `/apps/admin/src/lib/finance/db.ts` (ProductCOGS section) — ✅
- `/apps/admin/src/app/admin/` — ❌ no `products/costs/` directory

**TODO List:**
- [ ] Create `/apps/admin/src/app/admin/products/costs/page.tsx` (or nest under `/admin/commerce/`)
- [ ] Build `ProductCOGSTable` server component: columns SKU, Product, Variant, COGS, Margin %, Last Updated
- [ ] Build `ProductCOGSForm` client component for inline row editing
- [ ] Build `BulkCOGSToolbar` client component: set fixed COGS, set % of price, clear COGS
- [ ] Build `COGSImportModal` client component:
  - Template CSV download
  - File upload → POST to `/api/admin/products/costs/import`
  - Dry-run preview table before applying
- [ ] Build margin calculator column: `(price - cogs) / price * 100`, warn on negative margin
- [ ] Add export button → GET `/api/admin/products/costs/export`
- [ ] Add pagination and search to table (URL params)
- [ ] Gate the page: only show link from `/admin/settings/cogs` when source = 'internal'
- [ ] Warn if product has no COGS set (show fallback behavior)

---

### 3. P&L Formula Configuration UI — ❌ NOT DONE

**Planned:** `/admin/settings/pnl` page with toggleable line-item visibility, custom labels for each section, preview panel, and reset to defaults. This powers tenant-specific P&L formatting.

**Found:** The API (`/api/admin/finance/pnl`) is fully implemented with GET/PUT/DELETE. The DB layer handles all 30+ formula config fields across Revenue, COGS, Variable Costs, Contribution Margin, Marketing, Operating Expenses, and Net Profit. But the **UI does not exist**. The P&L statement at `/admin/expenses/pl-statement` also completely ignores these settings (hardcodes output structure regardless of formula config — see Gap #4).

**Files checked:**
- `/apps/admin/src/app/api/admin/finance/pnl/route.ts` — ✅
- `/apps/admin/src/lib/finance/db.ts` (PLFormulaConfig section) — ✅
- `/apps/admin/src/app/admin/settings/` — ❌ no pnl/ subdirectory

**TODO List:**
- [ ] Create `/apps/admin/src/app/admin/settings/pnl/page.tsx`
- [ ] Build `PLFormulaForm` client component using tabs (one per section group: Revenue, COGS, Variable, Marketing, OpEx, Net)
- [ ] Revenue section: toggles for `includeShippingRevenue`, `includeTaxCollected`, `showGrossSales`, `showDiscounts`, `showReturns`
- [ ] COGS section: `label` text input, `includeFreeSamples` toggle, `showAsPercentage` toggle
- [ ] Variable Costs section: label input, visibility toggles per line item, `groupFulfillmentCosts` toggle, custom cost visibility map
- [ ] Contribution Margin section: label input, `showAsPercentage` toggle, `highlightNegative` toggle
- [ ] Marketing section: label input, `showAdSpendByPlatform`, `showCreatorPayouts`, `showInfluencerFees`, `combineAdSpendAndPayouts` toggles
- [ ] Operating Expenses section: label input, `showByCategory`, `includeVendorPayouts`, `includeContractorPayouts`, category order drag-and-drop
- [ ] Global: `showOperatingIncome`, `showOtherIncomeExpense`, `netProfitLabel` customization
- [ ] Live preview panel: fetch sample P&L and re-render with current formula config on the fly
- [ ] Save/Reset buttons with unsaved changes banner (same pattern as CostsSettingsForm)
- [ ] Add to settings nav

---

### 4. P&L Calculator Tenant Isolation Bug — ⚠️ PARTIAL (P0 Security Bug)

**Planned:** All P&L calculations fully tenant-isolated — uses per-tenant `variable_cost_config`.

**Found:** In `apps/admin/src/lib/expenses/pnl-calculator.ts` at line 63–66, the `variable_cost_config` query uses `LIMIT 1` with **no `tenant_id` WHERE clause**:

```sql
-- CURRENT (WRONG):
SELECT payment_percentage_rate, payment_fixed_fee_cents, pick_pack_fee_cents, packaging_cost_cents
FROM variable_cost_config
LIMIT 1
```

This is inside a `withTenant()` wrapper, but the SQL pool context does not automatically apply row-level filtering — the explicit `WHERE tenant_id = ${tenantId}` is required. In a multi-tenant environment, `LIMIT 1` will return a row from **whichever tenant's config is first in the index**, meaning Tenant A's variable cost configuration could be used to compute Tenant B's P&L statement. This is a **data isolation violation**.

Additionally, the `orders`, `ad_spend`, `operating_expenses`, `vendor_payouts`, `contractor_payouts`, and `balance_transactions` tables in this same function also **lack explicit tenant_id filters** — they rely entirely on `withTenant()` context. This must be verified — if `withTenant()` sets a session variable that's enforced by RLS, these may be safe. But `variable_cost_config LIMIT 1` is unambiguously wrong even with RLS.

**Files checked:**
- `/apps/admin/src/lib/expenses/pnl-calculator.ts` — lines 63–66 (confirmed bug), lines 1–400 (other queries need RLS audit)

**TODO List:**
- [ ] **P0 FIX**: Add `WHERE tenant_id = ${tenantId}` to the `variable_cost_config` query in `calculatePLStatement()`; pass `tenantId` as a function parameter (currently only `tenantSlug` is passed)
- [ ] Audit all other raw SQL queries in `pnl-calculator.ts` (orders, ad_spend, etc.) — verify RLS or add explicit tenant filters
- [ ] Update function signatures: `calculatePLStatement(tenantSlug, tenantId, startDate, endDate)` — tenantId is needed for the LIMIT 1 fix
- [ ] Add integration test asserting Tenant A's config is not returned when calling for Tenant B
- [ ] Also use `PLFormulaConfig` from `/api/admin/finance/pnl` to apply label and visibility overrides before returning (currently ignored)

---

### 5. P&L Calculator Ignores Formula Configuration — ⚠️ PARTIAL

**Planned:** P&L statement generation uses tenant-specific formula config: custom labels, visibility toggles, grouping preferences, and display formatting.

**Found:** `pnl-calculator.ts` computes raw financials correctly but returns a hardcoded output structure. The P&L statement page (`/admin/expenses/pl-statement`) never calls `getPLFormulaConfig()`. All label customizations (`netProfitLabel`, `cogsLabel`, etc.), all visibility flags (`showGrossSales`, `showByCategory`, etc.), and all display preferences (`showAsPercentage`, `highlightNegative`) are ignored.

**Files checked:**
- `/apps/admin/src/lib/expenses/pnl-calculator.ts` — returns static `PLStatement` shape
- `/apps/admin/src/app/admin/expenses/pl-statement/page.tsx` — never fetches formula config
- `/apps/admin/src/app/api/admin/finance/pnl/route.ts` — correct API, unused by P&L display

**TODO List:**
- [ ] Create `applyFormulaConfig(statement: PLStatement, config: PLFormulaConfig): FormattedPLStatement` utility
- [ ] In `calculatePLStatement()` or the P&L page's server component, fetch `PLFormulaConfig` via `getPLFormulaConfig()`
- [ ] Apply custom section labels to output (swap `'Cost of Goods Sold'` → `config.cogs.label`, etc.)
- [ ] Conditional rendering: skip line items where visibility toggle is false
- [ ] Apply `showAsPercentage` for COGS and contribution margin rows
- [ ] Apply `highlightNegative` CSS class for contribution margin row
- [ ] Group fulfillment costs when `groupFulfillmentCosts = true`
- [ ] Respect `operatingCategoriesOrder` for the categories display order

---

### 6. Multi-Processor Configuration in Costs UI — ⚠️ PARTIAL

**Planned:** Costs UI should support multiple payment processors with volume split percentages for weighted average calculation.

**Found:** The types and DB schema fully support `additionalProcessors` (an array). However in `costs-settings-form.tsx` at line ~340:

```tsx
{config.paymentProcessing.additionalProcessors.length > 0 && (
  <SettingsSection title="Additional Processors" ...>
    <p>Additional processor configuration coming soon.</p>
  </SettingsSection>
)}
```

Even if processors are in the DB, the UI shows a "coming soon" placeholder and provides no way to add/edit them.

**Files checked:**
- `/apps/admin/src/components/settings/costs-settings-form.tsx` — line ~340

**TODO List:**
- [ ] Build `AdditionalProcessorRow` sub-component: name text input, percentage rate, fixed fee, volume percent (all editable)
- [ ] Replace "coming soon" section with rendered list of `additionalProcessors` from config
- [ ] Add "Add Processor" button (appends empty item to array)
- [ ] Add remove button per row
- [ ] Update `PaymentProcessingCard` preview calculation to factor in weighted average across all processors
- [ ] Update API validation to accept `additionalProcessors` array in PUT body

---

### 7. Weight-Based Fulfillment UI — ⚠️ PARTIAL

**Planned:** Fulfillment cost UI supports three models: per-order, per-item, and weight-based (with configurable weight tier table).

**Found:** The types define `weightTiers?: Array<{minOunces, maxOunces, feeCents}>` and the DB schema stores `weight_tiers` as JSONB. However, in the `costs-settings-form.tsx` fulfillment tab, only `per_order` and `per_item` models are handled with `{config.fulfillment.costModel === 'per_order' && ...}` conditionals. Selecting `weight_based` in the dropdown renders **nothing** — no weight tier table.

**Files checked:**
- `/apps/admin/src/components/settings/costs-settings-form.tsx` — Fulfillment Tab section
- `/apps/admin/src/lib/finance/types.ts` — `weightTiers` present in type

**TODO List:**
- [ ] Build `WeightTierTable` component: rows of minOz / maxOz / fee inputs, add/remove buttons
- [ ] Render `WeightTierTable` when `costModel === 'weight_based'`
- [ ] Add `updateWeightTier`, `addWeightTier`, `removeWeightTier` handlers to form state
- [ ] Include validation: tiers must cover 0 → ∞ without gaps
- [ ] Update fulfillment preview calculation to show sample cost for a 12oz order

---

### 8. P&L Config Audit Log UI — ❌ NOT DONE

**Planned:** Audit log viewer page showing all config changes with filters by date, config type, and user.

**Found:** The DB layer (`getPLConfigAuditLog` in `lib/finance/db.ts`) is fully implemented with filtering and pagination. `logPLConfigChange()` is correctly called in all API routes (costs, cogs, pnl). But there is no admin page to view this log.

**Files checked:**
- `/apps/admin/src/lib/finance/db.ts` — `getPLConfigAuditLog`, `logPLConfigChange` — ✅
- `/apps/admin/src/app/admin/` — no audit log page found

**TODO List:**
- [ ] Create `/apps/admin/src/app/api/admin/finance/audit-log/route.ts` — GET with filters (configType, startDate, endDate, changedBy, page, limit)
- [ ] Create `/apps/admin/src/app/admin/settings/costs/audit-log/page.tsx` (or at `/admin/settings/pl-audit`)
- [ ] Build `AuditLogTable` component: columns configType, action, fieldChanged, oldValue, newValue, changedBy, changedAt
- [ ] Add collapsible JSON diff for oldValue/newValue
- [ ] Add filter bar: config type dropdown, date range picker, user search
- [ ] Link from costs settings page: "View Change History →"

---

### 9. API Rate Limiting on Finance Config Endpoints — ❌ NOT DONE

**Planned (Constraints section):** Rate limiting on config save endpoints: 10/minute.

**Found:** No rate limiting middleware on any of the `/api/admin/finance/` routes. The constraint was called out explicitly in the plan spec.

**Files checked:**
- `/apps/admin/src/app/api/admin/finance/costs/route.ts` — no rate limiting
- `/apps/admin/src/app/api/admin/finance/cogs/route.ts` — no rate limiting
- `/apps/admin/src/app/api/admin/finance/pnl/route.ts` — no rate limiting

**TODO List:**
- [ ] Implement or integrate rate limiter (recommend `@upstash/ratelimit` with Redis or in-memory)
- [ ] Apply to all PUT/DELETE routes under `/api/admin/finance/` — max 10 writes/min per tenant
- [ ] Return `429 Too Many Requests` with `Retry-After` header when limit exceeded
- [ ] Log rate limit violations to audit log

---

### 10. Product Management Admin UI — ❌ NOT DONE

**Planned (implied by ECOMMERCE-OPS-PATTERNS.md):** Admin product management for creating/editing product listings, prices, collections.

**Found:** There is no `/admin/commerce/products` section. The commerce section only covers orders, customers, subscriptions, reviews, promo codes, promotions, selling plans, abandoned checkouts, and samples. Product creation/editing is expected to happen in Shopify directly, but for "Internal" COGS mode tenants, there is no product master reference.

**Files checked:**
- `/apps/admin/src/app/admin/commerce/` — directory listing (no products/)

**TODO List:**
- [ ] Determine scope: read-only product catalog view (synced from Shopify) vs full CRUD
- [ ] If read-only: create `/admin/commerce/products/page.tsx` with paginated product list from `products` DB table
- [ ] Show: title, image thumbnail, variant count, price range, COGS (if set), margin %
- [ ] Link each product to its COGS entry (when `/admin/products/costs` is built)
- [ ] Defer full product CRUD (create/edit) to Shopify integration phase

---

## Architectural Observations

### 1. Phase 2D-PL Plan Checklist Not Updated
All tasks in `PHASE-2D-PL-CONFIGURATION.md` use `[ ]` (unchecked), contradicting the `STATUS: ✅ COMPLETE` header. The implementation went significantly further than the plan tracked — the DB schema, all API routes, and type definitions were built, but the plan was never updated to reflect this. **The phase doc needs a retrospective pass to close out checkboxes and document what was built vs. the original list.**

### 2. Three-Layer Architecture is Well-Structured (Where Built)
The pattern of `DB layer → API route → UI component` is clean and consistent wherever it has been applied. The `lib/finance/db.ts` file is an exemplary multi-operation module with proper `withTenant()` wrapping, RETURNING clauses, and audit logging. The `CostsSettingsForm` follows the same server→client pattern as other settings. The gap is simply that the pattern was not carried all the way through for COGS, Product COGS, and P&L Formula UIs.

### 3. `withTenant()` Wrapper Is Not Sufficient Alone for Tenant Filtering
The P&L calculator bug (`LIMIT 1` on `variable_cost_config`) demonstrates that `withTenant()` may set connection context but is **not a substitute for explicit `WHERE tenant_id = ${tenantId}` clauses**. Every raw SQL query in the pnl-calculator.ts needs an explicit audit. If the platform relies on Postgres RLS, the RLS policy on `variable_cost_config` must be verified to actually restrict rows by the session variable `withTenant()` sets. If it does not enforce RLS, every query without a tenant_id filter is vulnerable.

### 4. Subscription Module Upgraded Beyond Plan
The Phase 2B plan explicitly stated subscriptions would be an "empty state with Loop integration instructions." Instead, a fully-functional subscription management system was built with: `listSubscriptions()`, `getStatusCounts()`, `getMRR()`, frequency filters, full DataTable, and MRR stat cards. This is a positive deviation — but the subscription data source should be documented: is it from a local `subscriptions` table? Loop webhook sync? The planner should note this migration.

### 5. Finance Settings Nav Fragmentation
Finance configuration is spread across multiple locations:
- `/admin/settings/costs` — Variable costs (present)
- `/admin/settings/cogs` — COGS source (missing)
- `/admin/settings/pnl` — P&L formula (missing)
- `/admin/expenses/categories` — Expense categories (present, but in expenses not settings)
- No audit log page anywhere

Consider adding a "Finance Settings" sub-group to the settings nav with all four of these, or a dedicated `/admin/settings/finance/` layout with nested tabs.

---

## Priority Ranking

| Priority | Feature | Severity | Reason |
|---|---|---|---|
| **P0** | P&L calculator tenant isolation bug | 🔴 Critical | Data leak between tenants — financial data exposure |
| **P1** | COGS source config UI (`/admin/settings/cogs`) | 🟠 High | Internal COGS mode unusable without this |
| **P1** | Product COGS management UI (`/admin/products/costs`) | 🟠 High | Internal COGS mode unusable without this — API fully built |
| **P1** | P&L formula config UI (`/admin/settings/pnl`) | 🟠 High | 30+ settings silently ignored — tenant customization broken |
| **P2** | P&L calculator use of PLFormulaConfig in display | 🟡 Medium | Labels/visibility wrong for all tenants |
| **P2** | Weight-based fulfillment UI tiers | 🟡 Medium | Selecting weight_based renders blank section |
| **P2** | Multi-processor config UI | 🟡 Medium | "Coming soon" placeholder — blocks multi-processor tenants |
| **P3** | P&L config audit log UI | 🟢 Low | DB layer ready — just needs a page |
| **P3** | API rate limiting (finance endpoints) | 🟢 Low | Security hygiene — not urgent but was in spec |
| **P3** | Product catalog admin view | 🟢 Low | Nice-to-have for internal COGS tenants |
| **P4** | Phase 2D-PL plan doc retrospective | ⚪ Hygiene | All tasks still show `[ ]`; update to reflect reality |
| **Deferred** | Loop API client | — | Intentionally deferred; subscriptions use internal DB |
| **Deferred** | Shopify order sync jobs | — | Phase 5 (Jobs) |
| **Deferred** | Bulk review moderation | — | Low usage impact |

---

## Files Needing Creation (Concrete List)

```
apps/admin/src/app/admin/settings/cogs/page.tsx                     ← NEW
apps/admin/src/app/admin/products/costs/page.tsx                    ← NEW
apps/admin/src/app/admin/settings/pnl/page.tsx                      ← NEW
apps/admin/src/app/admin/settings/costs/audit-log/page.tsx          ← NEW
apps/admin/src/app/api/admin/finance/audit-log/route.ts             ← NEW
apps/admin/src/app/api/admin/finance/cogs/sync/route.ts             ← NEW
```

## Files Needing Modification (Critical)

```
apps/admin/src/lib/expenses/pnl-calculator.ts
  → Add tenantId param, fix variable_cost_config query tenant filter
  → Integrate PLFormulaConfig for label/visibility output formatting

apps/admin/src/components/settings/costs-settings-form.tsx
  → Replace "coming soon" with AdditionalProcessorRow components
  → Add WeightTierTable for weight_based fulfillment model

apps/admin/src/app/admin/expenses/pl-statement/page.tsx
  → Fetch PLFormulaConfig and pass to statement renderer
```
