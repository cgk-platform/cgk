# PHASE-2D-PL: P&L Configuration & Cost Management

**Duration**: 1 week (Week 7-8, parallel with Phase 2D)
**Depends On**: Phase 2A (Admin Shell), Phase 2D (Admin Finance)
**Parallel With**: Phase 2D (Admin Finance), Phase 2H (Treasury)
**Blocks**: Phase 5D (Analytics Jobs)

---

## Goal

Implement fully customizable P&L (Profit & Loss) configuration per tenant, including COGS source management, variable cost settings, and flexible formula customization. This enables each brand to accurately calculate profitability based on their unique cost structure.

---

## Success Criteria

- [ ] Per-tenant variable costs configuration (payment processing, pick/pack, packaging, etc.)
- [ ] COGS source toggle: Shopify sync vs manual product-level entry
- [ ] Product COGS management UI for manual COGS entry
- [ ] Flexible P&L formula configuration with line item visibility controls
- [ ] Per-tenant expense category customization
- [ ] P&L settings audit trail
- [ ] All configurations tenant-isolated

---

## Problem Statement

Different brands have vastly different cost structures:

| Brand Type | Payment Processing | Pick/Pack | COGS Source |
|------------|-------------------|-----------|-------------|
| Shopify-native | Shopify Payments (2.9% + $0.30) | 3PL invoice | Shopify product cost |
| Self-checkout | Stripe (2.4% + $0.30) | Own warehouse | Manual entry |
| High-volume | Negotiated rates (1.9% + $0.15) | Per-item fee | ERP sync |
| Hybrid | Multiple processors | Variable | Mix |

**The platform MUST support:**
1. Fully customizable variable costs per tenant
2. Two COGS sources: Shopify (automatic) vs Internal (manual per-product)
3. Custom expense categories per tenant
4. Flexible P&L formula with toggleable line items
5. Per-order vs per-item cost calculations

---

## Deliverables

### 1. Variable Costs Configuration

**Location**: `/admin/settings/costs`

**Configurable Settings per Tenant:**

```typescript
interface TenantCostConfig {
  // Payment Processing
  paymentProcessing: {
    primaryProcessor: 'shopify_payments' | 'stripe' | 'paypal' | 'custom'
    percentageRate: number          // e.g., 0.029 (2.9%)
    fixedFeeCents: number           // e.g., 30 ($0.30)
    // Optional: multiple processors with weighted average
    additionalProcessors?: Array<{
      name: string
      percentageRate: number
      fixedFeeCents: number
      volumePercent: number          // % of orders through this processor
    }>
  }

  // Fulfillment Costs
  fulfillment: {
    costModel: 'per_order' | 'per_item' | 'weight_based' | 'manual'
    pickPackFeeCents: number         // Per order pick/pack fee
    pickPackPerItemCents?: number    // Additional per item (if per_item model)
    packagingCostCents: number       // Per order packaging materials
    handlingFeeCents: number         // General handling fee
    // Weight-based (for some 3PLs)
    weightTiers?: Array<{
      minOunces: number
      maxOunces: number
      feeCents: number
    }>
  }

  // Shipping Costs (if not tracked separately)
  shipping: {
    trackingMethod: 'actual_expense' | 'estimated_percentage' | 'flat_rate'
    estimatedPercent?: number        // % of order total
    flatRateCents?: number           // Flat per-order estimate
  }

  // Other Variable Costs
  otherVariableCosts: Array<{
    id: string
    name: string
    amountCents: number
    calculationType: 'per_order' | 'per_item' | 'percentage_of_revenue'
    percentageRate?: number          // If percentage-based
    isActive: boolean
    createdAt: Date
  }>

  // Configuration Metadata
  updatedAt: Date
  updatedBy: string
  version: number                    // For audit trail
}
```

**UI Components:**

1. **Payment Processing Card**
   - Processor dropdown (Shopify Payments, Stripe, PayPal, Custom)
   - Percentage rate input (with % symbol)
   - Fixed fee input (with $ symbol)
   - "Add processor" for multi-processor setups
   - Volume split % for weighted average calculation

2. **Fulfillment Costs Card**
   - Cost model selector (per order, per item, weight-based)
   - Pick/pack fee input
   - Packaging cost input
   - Handling fee input
   - Weight tier table (if weight-based)

3. **Shipping Costs Card**
   - Tracking method toggle
   - Actual = "Tracked via Treasury operating expenses"
   - Estimated = percentage or flat rate inputs

4. **Other Variable Costs Card**
   - Dynamic list of custom cost items
   - Add/edit/remove custom costs
   - Per-order vs per-item vs percentage toggle each

5. **Live Formula Preview Sidebar**
   - Shows calculated contribution margin for sample $100 order
   - Updates in real-time as settings change
   - Displays effective total variable cost per order

---

### 2. COGS Source Configuration

**Location**: `/admin/settings/cogs`

**Feature Flag Controlled**: `commerce.cogs_source`

**Two Modes:**

#### Mode 1: Shopify Sync (Default when `commerce.provider` = 'shopify')

```typescript
interface ShopifyCOGSConfig {
  source: 'shopify'
  syncEnabled: boolean
  lastSyncAt: Date
  syncFrequency: 'realtime' | 'hourly' | 'daily'
  // Shopify provides cost per variant
  costField: 'cost' | 'cost_per_item' | 'inventory_item_cost'
  // Fallback for products without cost
  fallbackBehavior: 'zero' | 'skip_pnl' | 'use_default'
  defaultCogsCents?: number
}
```

**UI**:
- "COGS Source: Shopify" badge
- Last sync timestamp
- Sync frequency dropdown
- Fallback behavior for missing costs
- "Sync Now" button

#### Mode 2: Internal/Manual (When `commerce.provider` = 'custom' or explicitly set)

```typescript
interface InternalCOGSConfig {
  source: 'internal'
  // Products without COGS entry
  fallbackBehavior: 'zero' | 'skip_pnl' | 'percentage_of_price'
  fallbackPercent?: number           // If percentage-based fallback
  // Allow bulk import
  lastImportAt?: Date
  importSource?: 'csv' | 'manual' | 'erp'
}
```

**UI**:
- "COGS Source: Manual Entry" badge
- Link to "Manage Product Costs" page
- CSV import button
- Fallback behavior configuration

---

### 3. Product COGS Management

**Location**: `/admin/products/costs`

**Only shown when**: `cogs_source` = 'internal'

**Features:**

1. **Product Cost Table**
   - List all products with columns: Product, Variant, SKU, COGS, Margin %
   - Inline editing for COGS amounts
   - Bulk select and edit
   - Search and filter by product/collection

2. **Bulk Actions**
   - Set fixed COGS for selected products
   - Set COGS as % of price for selected
   - Clear COGS (revert to fallback)
   - Export current COGS as CSV

3. **CSV Import**
   - Template download
   - Upload CSV with columns: `sku`, `variant_id`, `cogs_cents`
   - Preview changes before applying
   - Dry-run validation

4. **Margin Calculator**
   - Real-time margin calculation as COGS is edited
   - Warnings for negative margins
   - Suggested COGS based on target margin %

**Database Schema:**

```sql
CREATE TABLE tenant_product_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  product_id TEXT NOT NULL,          -- Shopify product ID or internal ID
  variant_id TEXT,                   -- Shopify variant ID or null for base product
  sku TEXT,
  cogs_cents INTEGER NOT NULL,
  source TEXT DEFAULT 'manual',      -- 'manual', 'csv_import', 'erp_sync'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT,
  UNIQUE(tenant_id, product_id, variant_id)
);

CREATE INDEX idx_product_costs_tenant ON tenant_product_costs(tenant_id);
CREATE INDEX idx_product_costs_sku ON tenant_product_costs(tenant_id, sku);
```

---

### 4. P&L Formula Configuration

**Location**: `/admin/settings/pnl`

**Enables tenants to customize their P&L structure:**

```typescript
interface PLFormulaConfig {
  // Revenue Section
  revenue: {
    includeShippingRevenue: boolean    // Include shipping collected in revenue?
    includeTaxCollected: boolean       // Include tax in gross revenue? (usually no)
    showGrossSales: boolean            // Show line item or start from net
    showDiscounts: boolean             // Separate discounts line
    showReturns: boolean               // Separate returns line
  }

  // COGS Section
  cogs: {
    label: string                       // "COGS", "Cost of Goods Sold", "Product Cost"
    includeFreeSamples: boolean         // Include COGS for $0 orders (UGC samples)
    showAsPercentage: boolean           // Show COGS % next to amount
  }

  // Variable Costs Section
  variableCosts: {
    label: string                       // "Variable Costs", "Direct Costs"
    showPaymentProcessing: boolean
    showFulfillment: boolean
    showPackaging: boolean
    showShipping: boolean               // If estimated or flat-rate
    customCostVisibility: Record<string, boolean>  // Per custom cost toggle
    groupFulfillmentCosts: boolean      // Combine pick/pack/packaging into one line
  }

  // Contribution Margin
  contributionMargin: {
    label: string                       // "Contribution Margin", "Gross Contribution"
    showAsPercentage: boolean
    highlightNegative: boolean          // Red highlight if negative
  }

  // Marketing Section
  marketing: {
    label: string                       // "Marketing", "Customer Acquisition"
    showAdSpendByPlatform: boolean      // Expand ad spend by platform
    showCreatorPayouts: boolean         // Show creator commissions
    showInfluencerFees: boolean         // Show influencer payments
    combineAdSpendAndPayouts: boolean   // Single "Marketing" line
  }

  // Operating Expenses Section
  operatingExpenses: {
    label: string
    showByCategory: boolean             // Expand by expense category
    includeVendorPayouts: boolean       // Include vendor payments
    includeContractorPayouts: boolean   // Include contractor payments
    categoriesOrder: string[]           // Custom category ordering
  }

  // Final Sections
  showOperatingIncome: boolean          // Show EBIT line
  showOtherIncomeExpense: boolean       // Interest, one-time items
  netProfitLabel: string                // "Net Profit", "Net Income", "Bottom Line"
}
```

**UI: P&L Builder**

Visual drag-and-drop builder with:
- Toggleable sections (show/hide line items)
- Label customization for each section
- Preview panel showing sample P&L
- "Reset to Default" button
- Export format preferences (PDF styling)

---

### 5. Expense Category Customization

**Location**: `/admin/settings/expense-categories`

**Default Categories (per tenant, can customize):**

```typescript
const DEFAULT_EXPENSE_CATEGORIES = [
  // COGS (usually auto-calculated)
  { id: 'cogs_product', name: 'Product Cost', type: 'cogs', isSystem: true },

  // Variable (per-order)
  { id: 'var_payment', name: 'Payment Processing', type: 'variable', isSystem: true },
  { id: 'var_fulfillment', name: 'Fulfillment', type: 'variable', isSystem: true },
  { id: 'var_shipping', name: 'Shipping', type: 'variable', isSystem: true },
  { id: 'var_packaging', name: 'Packaging', type: 'variable', isSystem: true },

  // Marketing
  { id: 'mkt_meta', name: 'Meta Ads', type: 'marketing', isSystem: true },
  { id: 'mkt_google', name: 'Google Ads', type: 'marketing', isSystem: true },
  { id: 'mkt_tiktok', name: 'TikTok Ads', type: 'marketing', isSystem: true },
  { id: 'mkt_creator', name: 'Creator Commissions', type: 'marketing', isSystem: true },
  { id: 'mkt_influencer', name: 'Influencer Fees', type: 'marketing', isSystem: true },

  // Operating
  { id: 'op_salaries', name: 'Salaries & Wages', type: 'operating', isSystem: false },
  { id: 'op_rent', name: 'Rent & Facilities', type: 'operating', isSystem: false },
  { id: 'op_software', name: 'Software & Tools', type: 'operating', isSystem: false },
  { id: 'op_professional', name: 'Professional Services', type: 'operating', isSystem: false },
  { id: 'op_insurance', name: 'Insurance', type: 'operating', isSystem: false },
  { id: 'op_vendors', name: 'Vendor Payments', type: 'operating', isSystem: true },
  { id: 'op_contractors', name: 'Contractor Payments', type: 'operating', isSystem: true },

  // Other
  { id: 'other_misc', name: 'Miscellaneous', type: 'other', isSystem: false },
]
```

**Features:**
- Add custom categories (tenant-specific)
- Rename default category labels
- Change category types (e.g., move a cost from operating to marketing)
- Disable categories not used by this tenant
- Set display order
- Cannot delete system categories (can only hide)

---

### 6. P&L Settings Audit Trail

**All configuration changes logged:**

```sql
CREATE TABLE pl_config_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  config_type TEXT NOT NULL,          -- 'variable_costs', 'cogs_source', 'formula', 'categories'
  action TEXT NOT NULL,               -- 'create', 'update', 'delete'
  field_changed TEXT,                 -- Specific field that changed
  old_value JSONB,
  new_value JSONB,
  changed_by TEXT NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT
);

CREATE INDEX idx_pl_audit_tenant ON pl_config_audit_log(tenant_id, changed_at DESC);
```

**Viewable at**: `/admin/settings/costs/history`

---

## API Routes

### Variable Costs
- `GET /api/admin/settings/costs` - Get tenant cost configuration
- `PUT /api/admin/settings/costs` - Update cost configuration
- `DELETE /api/admin/settings/costs` - Reset to defaults

### COGS Source
- `GET /api/admin/settings/cogs` - Get COGS source configuration
- `PUT /api/admin/settings/cogs` - Update COGS source
- `POST /api/admin/settings/cogs/sync` - Trigger Shopify COGS sync

### Product COGS (Manual Mode)
- `GET /api/admin/products/costs` - List product costs (paginated)
- `GET /api/admin/products/costs/[id]` - Get single product cost
- `PUT /api/admin/products/costs/[id]` - Update product cost
- `PUT /api/admin/products/costs/bulk` - Bulk update costs
- `POST /api/admin/products/costs/import` - CSV import
- `GET /api/admin/products/costs/export` - CSV export

### P&L Formula
- `GET /api/admin/settings/pnl` - Get formula configuration
- `PUT /api/admin/settings/pnl` - Update formula configuration
- `DELETE /api/admin/settings/pnl` - Reset to defaults

### Expense Categories
- `GET /api/admin/settings/expense-categories` - List categories
- `POST /api/admin/settings/expense-categories` - Create category
- `PUT /api/admin/settings/expense-categories/[id]` - Update category
- `PUT /api/admin/settings/expense-categories/order` - Reorder categories

### Audit Log
- `GET /api/admin/settings/costs/history` - Get audit log

---

## Integration with P&L Generation

**The P&L statement generation (`generatePLStatement`) MUST:**

1. **Load tenant config** at the start of generation:
   ```typescript
   const costConfig = await getTenantCostConfig(tenantId)
   const cogsConfig = await getTenantCOGSConfig(tenantId)
   const formulaConfig = await getTenantPLFormulaConfig(tenantId)
   ```

2. **Calculate payment processing** using tenant's configured rates:
   ```typescript
   const paymentProcessingCents = Math.round(
     netRevenueCents * costConfig.paymentProcessing.percentageRate
   ) + (orderCount * costConfig.paymentProcessing.fixedFeeCents)
   ```

3. **Get COGS** from appropriate source:
   ```typescript
   const cogsCents = cogsConfig.source === 'shopify'
     ? await getShopifyCOGS(tenantId, startDate, endDate)
     : await getInternalCOGS(tenantId, startDate, endDate)
   ```

4. **Apply fulfillment cost model**:
   ```typescript
   let fulfillmentCents = 0
   if (costConfig.fulfillment.costModel === 'per_order') {
     fulfillmentCents = orderCount * costConfig.fulfillment.pickPackFeeCents
   } else if (costConfig.fulfillment.costModel === 'per_item') {
     fulfillmentCents =
       orderCount * costConfig.fulfillment.pickPackFeeCents +
       itemCount * costConfig.fulfillment.pickPackPerItemCents
   }
   ```

5. **Format output** based on formula config:
   ```typescript
   const plStatement = formatPLStatement(rawData, formulaConfig)
   // Respects visibility toggles, custom labels, grouping preferences
   ```

---

## Constraints

- All configurations MUST be tenant-isolated (use `withTenant()`)
- System expense categories cannot be deleted, only hidden
- COGS source changes require confirmation (affects historical calculations)
- Audit log is append-only
- Variable cost changes apply to FUTURE P&L calculations only (no retroactive)
- CSV imports limited to 10,000 rows per upload
- Rate limiting on config save endpoints (10/minute)

---

## Pattern References

**Skills to invoke:**
- `/frontend-design` - For settings forms and formula builder UI
- Context7 MCP: "React form state management" - Complex nested forms
- Context7 MCP: "CSV parsing in JavaScript" - For bulk import

**RAWDOG code to reference:**
- `src/app/admin/analytics/settings/page.tsx` - Existing variable costs UI (PORT THIS)
- `src/lib/expenses/types.ts` - Existing type definitions
- `src/lib/expenses/pl-statement.ts` - P&L generation (ENHANCE for tenant config)
- `src/lib/expenses/db.ts` - Database operations

---

## AI Discretion Areas

The implementing agent should determine the best approach for:
1. Multi-processor weighted average calculation (simple average vs transaction-weighted)
2. CSV import preview UI (modal vs inline table)
3. Formula builder interaction pattern (drag-drop vs toggles)
4. Audit log retention policy (30 days vs indefinite)
5. Default values for new tenants (copy from template vs hardcoded)

---

## Tasks

### [PARALLEL] Database Schema
- [ ] Create `tenant_cost_configs` table
- [ ] Create `tenant_cogs_configs` table
- [ ] Create `tenant_pl_formula_configs` table
- [ ] Create `tenant_product_costs` table
- [ ] Create `tenant_expense_categories` table (extend existing)
- [ ] Create `pl_config_audit_log` table
- [ ] Create database functions in `apps/admin/src/lib/costs/db.ts`

### [PARALLEL] Type Definitions
- [ ] Create `apps/admin/src/lib/costs/types.ts` with all config interfaces
- [ ] Create validation schemas (Zod) for all config types
- [ ] Create default config generators

### [SEQUENTIAL after Schema] API Routes
- [ ] Create all variable costs API routes
- [ ] Create all COGS source API routes
- [ ] Create all product COGS API routes
- [ ] Create all P&L formula API routes
- [ ] Create expense category management routes
- [ ] Create audit log routes
- [ ] Add rate limiting middleware

### [SEQUENTIAL after API] Variable Costs UI
- [ ] Create `/admin/settings/costs/page.tsx`
- [ ] Build PaymentProcessingCard component
- [ ] Build FulfillmentCostsCard component
- [ ] Build ShippingCostsCard component
- [ ] Build OtherCostsCard component (dynamic list)
- [ ] Build FormulaPreviewSidebar component
- [ ] Implement save/reset functionality

### [SEQUENTIAL after API] COGS Source UI
- [ ] Create `/admin/settings/cogs/page.tsx`
- [ ] Build source toggle component
- [ ] Build Shopify sync status component
- [ ] Build fallback configuration component

### [SEQUENTIAL after API] Product COGS UI
- [ ] Create `/admin/products/costs/page.tsx`
- [ ] Build product cost table with inline editing
- [ ] Build bulk action toolbar
- [ ] Build CSV import modal with preview
- [ ] Build margin calculator component

### [SEQUENTIAL after API] P&L Formula UI
- [ ] Create `/admin/settings/pnl/page.tsx`
- [ ] Build formula section toggles
- [ ] Build label customization inputs
- [ ] Build preview panel
- [ ] Build reset to defaults

### [SEQUENTIAL after API] Expense Categories UI
- [ ] Create `/admin/settings/expense-categories/page.tsx`
- [ ] Build category list with inline editing
- [ ] Build add category modal
- [ ] Build drag-and-drop reordering

### [SEQUENTIAL after UI] P&L Integration
- [ ] Update `generatePLStatement()` to use tenant configs
- [ ] Update P&L page to respect formula config
- [ ] Add tenant config loading to P&L API routes
- [ ] Test with different tenant configurations

### [SEQUENTIAL after Integration] Audit Trail
- [ ] Create audit log viewer page
- [ ] Implement audit log writing on all config changes
- [ ] Add filtering by date, config type, user

---

## Definition of Done

- [ ] Variable costs fully configurable per tenant (payment %, flat fee, pick/pack, etc.)
- [ ] COGS source toggle works (Shopify sync vs manual)
- [ ] Product COGS can be set manually with CSV import
- [ ] P&L formula respects tenant visibility/label preferences
- [ ] Expense categories are customizable per tenant
- [ ] All config changes logged in audit trail
- [ ] Settings UI has live preview of formula impact
- [ ] P&L statement generation uses tenant-specific config
- [ ] `npx tsc --noEmit` passes
- [ ] All endpoints respect tenant isolation

---

## Example Tenant Configurations

### Tenant A: Shopify-Native DTC Brand
```json
{
  "paymentProcessing": {
    "primaryProcessor": "shopify_payments",
    "percentageRate": 0.029,
    "fixedFeeCents": 30
  },
  "fulfillment": {
    "costModel": "per_order",
    "pickPackFeeCents": 200,
    "packagingCostCents": 75
  },
  "cogsSource": "shopify"
}
```

### Tenant B: Self-Checkout with 3PL
```json
{
  "paymentProcessing": {
    "primaryProcessor": "stripe",
    "percentageRate": 0.024,
    "fixedFeeCents": 30,
    "additionalProcessors": [
      { "name": "PayPal", "percentageRate": 0.0349, "fixedFeeCents": 49, "volumePercent": 15 }
    ]
  },
  "fulfillment": {
    "costModel": "per_item",
    "pickPackFeeCents": 100,
    "pickPackPerItemCents": 25,
    "packagingCostCents": 50
  },
  "cogsSource": "internal"
}
```

### Tenant C: High-Volume with Negotiated Rates
```json
{
  "paymentProcessing": {
    "primaryProcessor": "stripe",
    "percentageRate": 0.019,
    "fixedFeeCents": 15
  },
  "fulfillment": {
    "costModel": "weight_based",
    "weightTiers": [
      { "minOunces": 0, "maxOunces": 16, "feeCents": 150 },
      { "minOunces": 16, "maxOunces": 32, "feeCents": 200 },
      { "minOunces": 32, "maxOunces": 999, "feeCents": 300 }
    ]
  },
  "cogsSource": "shopify"
}
```
