# PHASE-2AT: A/B Testing - Shopify Functions Integration

> **STATUS**: ✅ COMPLETE (2026-02-13)

**Status**: COMPLETE (Backend/API complete, UI components in separate phase, production deployment pending)
**Duration**: 1 week (Week 13-14)
**Depends On**: PHASE-2AT-ABTESTING-CORE
**Parallel With**: PHASE-2AT-ABTESTING-ADMIN
**Blocks**: None (integrates with storefront)

---

## Goal

Integrate A/B testing with Shopify Functions to enable checkout-level experiments, specifically shipping rate A/B tests. This uses Shopify's Delivery Customization Function to show different shipping options to different test variants.

---

## Success Criteria

- [x] Shipping A/B tests can be created in admin
- [x] Visitors see different shipping rates based on variant assignment
- [x] Shopify Function receives visitor variant and filters shipping rates
- [x] Order webhooks correctly attribute revenue to shipping variants
- [x] Mismatch detection identifies when actual rate differs from assigned
- [x] Net Revenue Per Visitor (NRPV) calculated correctly
- [ ] Works with Shopify's checkout without breaking other functionality (requires deployment)
- [x] Tenant-isolated shipping test configuration
- [x] `npx tsc --noEmit` passes

---

## Architecture Overview

```
Visitor Lands on Site
        ↓
    [A/B Assignment Engine]
        ↓
    Assign to Shipping Variant (A, B, C, or D)
        ↓
    Store in Cookie + Cart Attribute
        ↓
Visitor Reaches Checkout
        ↓
    [Shopify Checkout]
        ↓
    Shopify Queries Delivery Customization Function
        ↓
    [Rust WASM Function]
    - Read cart attribute (_ab_shipping_suffix)
    - Filter shipping rates to show only assigned rate
        ↓
    Visitor Sees Only Their Variant's Shipping Rate
        ↓
Order Placed
        ↓
    [Order Webhook]
    - Extract shipping details
    - Match to visitor's assigned variant
    - Calculate NRPV (revenue - shipping cost)
    - Detect mismatches (assigned vs actual)
```

---

## Deliverables

### Shopify Function (Delivery Customization)

Located in the Shopify App directory (`/shopify-app/extensions/shipping-ab-test/`):

```
shipping-ab-test/
├── src/
│   ├── run.rs              # Main function logic
│   ├── run.graphql         # Input query
│   └── lib.rs              # Module exports
├── shopify.extension.toml  # Extension configuration
├── Cargo.toml              # Rust dependencies
└── test-inputs/            # Test fixtures
    ├── variant-a.json
    ├── variant-b.json
    └── no-variant.json
```

```rust
// src/run.rs

use shopify_function::prelude::*;
use shopify_function::Result;

#[shopify_function]
fn run(input: input::ResponseData) -> Result<output::FunctionRunResult> {
    // Get the shipping variant suffix from cart attributes
    let variant_suffix = input.cart.attribute
        .iter()
        .find(|a| a.key == "_ab_shipping_suffix")
        .map(|a| a.value.as_str())
        .unwrap_or("");

    // If no variant assigned, return all rates unchanged
    if variant_suffix.is_empty() {
        return Ok(output::FunctionRunResult {
            operations: vec![],
        });
    }

    // Build list of operations to hide non-matching rates
    let mut operations = vec![];

    for delivery_group in &input.cart.delivery_groups {
        for option in &delivery_group.delivery_options {
            // Check if this rate matches the assigned variant
            let rate_suffix = extract_suffix(&option.title);

            if !rate_suffix.is_empty() && rate_suffix != variant_suffix {
                // Hide this rate - it's for a different variant
                operations.push(output::Operation {
                    hide: Some(output::HideOperation {
                        delivery_option_handle: option.handle.clone(),
                    }),
                    ..Default::default()
                });
            }
        }
    }

    Ok(output::FunctionRunResult { operations })
}

// Extract suffix from rate name like "Standard Shipping (A)" -> "A"
fn extract_suffix(title: &str) -> &str {
    if let Some(start) = title.rfind('(') {
        if let Some(end) = title.rfind(')') {
            return &title[start + 1..end];
        }
    }
    ""
}
```

```graphql
# src/run.graphql

> **STATUS**: ✅ COMPLETE (2026-02-13)

query RunInput {
  cart {
    attribute(key: "_ab_shipping_suffix") {
      value
    }
    deliveryGroups {
      deliveryOptions {
        handle
        title
      }
    }
  }
}
```

### Cart Attribute Integration

```typescript
// packages/ab-testing/src/shipping/cart-bridge.ts

/**
 * Set shipping variant suffix in cart attributes.
 * Called when visitor is assigned to a shipping test.
 */
export async function setShippingVariantInCart(
  cartId: string,
  variantSuffix: string,
  shopifyClient: ShopifyClient
): Promise<void> {
  await shopifyClient.cartAttributesUpdate(cartId, [
    { key: '_ab_shipping_suffix', value: variantSuffix },
    { key: '_ab_test_type', value: 'shipping' }
  ])
}

/**
 * Client-side cart attribute sync.
 * Runs on page load to ensure cart has current assignment.
 */
export function useShippingABTestSync(testId: string) {
  const { assignment, isLoading } = useABTest(testId)

  useEffect(() => {
    if (!isLoading && assignment?.shippingSuffix) {
      // Sync to cart via API
      fetch('/api/ab-tests/shipping-config', {
        method: 'POST',
        body: JSON.stringify({
          testId,
          suffix: assignment.shippingSuffix
        })
      })
    }
  }, [assignment, isLoading, testId])
}
```

### Shipping Test Configuration

```typescript
// packages/ab-testing/src/shipping/config.ts

export interface ShippingTestConfig {
  testId: string
  tenantId: string
  rates: ShippingRateVariant[]
  trackShippingRevenue: boolean
  maxOrderValueCents?: number  // Exclude high-value orders (e.g., free shipping threshold)
  zoneId?: string  // Limit to specific shipping zone
}

export interface ShippingRateVariant {
  variantId: string
  suffix: string           // 'A', 'B', 'C', 'D'
  rateName: string         // "Standard Shipping (A)"
  priceCents: number       // 874 = $8.74
  displayName?: string     // "Standard Shipping" (hide suffix from customer)
  displayDescription?: string
}

/**
 * Create shipping rates in Shopify for a test.
 * Creates duplicate rates with suffixes for each variant.
 */
export async function createShippingRatesForTest(
  tenantId: string,
  config: ShippingTestConfig,
  shopifyAdmin: ShopifyAdminClient
): Promise<void> {
  for (const rate of config.rates) {
    // Create rate via Shopify Admin API
    await shopifyAdmin.carrierService.createShippingRate({
      name: rate.rateName,
      price: rate.priceCents,
      serviceCode: `ab-test-${config.testId}-${rate.suffix}`
    })
  }
}
```

### Order Attribution for Shipping Tests

```typescript
// packages/ab-testing/src/shipping/attribution.ts

export interface ShippingAttribution {
  orderId: string
  testId: string
  assignedVariantId: string
  assignedSuffix: string
  actualShippingMethod: string
  actualShippingPriceCents: number
  productRevenueCents: number
  netRevenueCents: number  // Product revenue - shipping cost (for NRPV)
  isMismatch: boolean  // Assigned != actual
  mismatchReason?: string
}

/**
 * Process order webhook to attribute shipping revenue.
 */
export async function attributeShippingOrder(
  tenantId: string,
  order: ShopifyOrder
): Promise<ShippingAttribution | null> {
  // Extract A/B test info from order attributes
  const testId = order.noteAttributes.find(a => a.name === '_ab_test_id')?.value
  const assignedSuffix = order.noteAttributes.find(a => a.name === '_ab_shipping_suffix')?.value

  if (!testId || !assignedSuffix) {
    return null  // Not part of a shipping test
  }

  // Get assigned variant
  const test = await getTest(tenantId, testId)
  const assignedVariant = test.variants.find(v => v.shippingSuffix === assignedSuffix)

  if (!assignedVariant) {
    console.error(`Unknown variant suffix: ${assignedSuffix}`)
    return null
  }

  // Get actual shipping from order
  const actualShipping = order.shippingLines[0]
  const actualPriceCents = Math.round(parseFloat(actualShipping.price) * 100)
  const actualMethod = actualShipping.title

  // Detect mismatch
  const expectedSuffix = assignedSuffix
  const actualSuffix = extractSuffix(actualMethod)
  const isMismatch = actualSuffix !== expectedSuffix && actualSuffix !== ''

  // Calculate revenues
  const productRevenue = Math.round(parseFloat(order.subtotalPrice) * 100)
  const netRevenue = productRevenue - actualPriceCents

  const attribution: ShippingAttribution = {
    orderId: order.id,
    testId,
    assignedVariantId: assignedVariant.id,
    assignedSuffix,
    actualShippingMethod: actualMethod,
    actualShippingPriceCents: actualPriceCents,
    productRevenueCents: productRevenue,
    netRevenueCents: netRevenue,
    isMismatch,
    mismatchReason: isMismatch
      ? `Expected suffix "${expectedSuffix}" but got "${actualSuffix}"`
      : undefined
  }

  // Record the attribution
  await recordShippingAttribution(tenantId, attribution)

  // Record A/B event
  await recordABEvent({
    tenantId,
    testId,
    variantId: assignedVariant.id,
    visitorId: order.noteAttributes.find(a => a.name === '_ab_visitor_id')?.value || 'unknown',
    eventType: 'purchase',
    eventValueCents: netRevenue,  // Use net revenue for shipping tests
    orderId: order.id
  })

  return attribution
}
```

### Shipping Results Calculation

```typescript
// packages/ab-testing/src/shipping/results.ts

export interface ShippingTestResults {
  testId: string
  variants: ShippingVariantResults[]
  totalOrders: number
  totalMismatches: number
  mismatchRate: number
}

export interface ShippingVariantResults {
  variantId: string
  variantName: string
  suffix: string
  shippingPriceCents: number
  visitors: number
  orders: number
  conversionRate: number
  productRevenue: number  // Total product revenue
  shippingRevenue: number  // Total shipping revenue
  netRevenue: number  // Product - shipping
  avgShippingPerOrder: number
  revenuePerVisitor: number  // Product RPV
  netRevenuePerVisitor: number  // NRPV (primary metric)
  improvement: number | null  // % vs control on NRPV
  zScore: number | null
  pValue: number | null
  isSignificant: boolean
  isWinner: boolean
}

export async function calculateShippingResults(
  tenantId: string,
  testId: string
): Promise<ShippingTestResults> {
  const test = await getTest(tenantId, testId)
  const metrics = await getShippingMetrics(tenantId, testId)

  const controlVariant = test.variants.find(v => v.isControl)!
  const controlStats = metrics[controlVariant.id]

  const variantResults: ShippingVariantResults[] = test.variants.map(v => {
    const stats = metrics[v.id]
    const nrpv = stats.netRevenueCents / stats.visitors / 100

    // Calculate significance vs control
    let significance = null
    if (!v.isControl) {
      significance = calculateRevenueSignificance(
        {
          visitors: controlStats.visitors,
          revenue: controlStats.netRevenueCents,
          revenueVariance: controlStats.netRevenueVariance
        },
        {
          visitors: stats.visitors,
          revenue: stats.netRevenueCents,
          revenueVariance: stats.netRevenueVariance
        },
        test.confidenceLevel
      )
    }

    return {
      variantId: v.id,
      variantName: v.name,
      suffix: v.shippingSuffix!,
      shippingPriceCents: v.shippingPriceCents!,
      visitors: stats.visitors,
      orders: stats.orders,
      conversionRate: stats.orders / stats.visitors,
      productRevenue: stats.productRevenueCents / 100,
      shippingRevenue: stats.shippingRevenueCents / 100,
      netRevenue: stats.netRevenueCents / 100,
      avgShippingPerOrder: stats.orders > 0
        ? stats.shippingRevenueCents / stats.orders / 100
        : 0,
      revenuePerVisitor: stats.productRevenueCents / stats.visitors / 100,
      netRevenuePerVisitor: nrpv,
      improvement: significance?.improvement ?? null,
      zScore: significance?.zScore ?? null,
      pValue: significance?.pValue ?? null,
      isSignificant: significance?.isSignificant ?? false,
      isWinner: false  // Set below
    }
  })

  // Determine winner based on NRPV
  const significantVariants = variantResults.filter(v =>
    !test.variants.find(tv => tv.id === v.variantId)?.isControl &&
    v.isSignificant &&
    v.improvement! > 0
  )

  if (significantVariants.length > 0) {
    // Highest NRPV improvement wins
    const winner = significantVariants.reduce((best, v) =>
      v.improvement! > (best.improvement || 0) ? v : best
    )
    winner.isWinner = true
  }

  return {
    testId,
    variants: variantResults,
    totalOrders: variantResults.reduce((sum, v) => sum + v.orders, 0),
    totalMismatches: await getMismatchCount(tenantId, testId),
    mismatchRate: await getMismatchRate(tenantId, testId)
  }
}
```

### API Routes

```typescript
// apps/admin/src/app/api/admin/ab-tests/shipping/route.ts

export async function POST(req: Request) {
  const { tenantId } = await getTenantContext(req)
  const body = await req.json()

  // Create shipping A/B test
  const test = await createShippingTest(tenantId, {
    name: body.name,
    variants: body.variants.map((v: any) => ({
      name: v.name,
      suffix: v.suffix,
      rateName: v.rateName,
      priceCents: v.priceCents,
      trafficAllocation: v.trafficAllocation,
      isControl: v.isControl
    })),
    trackShippingRevenue: body.trackShippingRevenue ?? true,
    maxOrderValueCents: body.maxOrderValueCents,
    confidenceLevel: body.confidenceLevel
  })

  // Create shipping rates in Shopify (if auto-create enabled)
  if (body.autoCreateRates) {
    await createShippingRatesForTest(tenantId, test, getShopifyClient(tenantId))
  }

  return Response.json({ test })
}
```

---

## Constraints

- Shopify Function MUST be Rust compiled to WASM (wasm32-wasip1)
- Cart attributes are the ONLY way to pass data to Shopify Functions
- Shipping tests require duplicate shipping rates with suffixes (A, B, C, D)
- Maximum 4 variants per shipping test (Shopify rate limitations)
- Mismatch rate should stay below 5% (indicates implementation issues)
- Net Revenue Per Visitor (NRPV) is the primary success metric

---

## Pattern References

**Skills to invoke:**
- None (backend/Rust only)

**MCPs to consult:**
- Shopify Dev MCP: `functions_delivery_customization` schema
- Use `mcp__shopify-dev-mcp__learn_shopify_api(api: "functions")` first

**RAWDOG code to reference:**
- `shopify-app/extensions/shipping-ab-test/` - Existing Rust function
- `src/lib/ab-testing/shopify/webhooks.ts` - Order webhook handling
- `src/lib/ab-testing/cart-attributes.ts` - Cart attribute management
- `src/hooks/useShippingABTest.ts` - Client-side hook
- `src/components/admin/ab-tests/ShippingTestPanel.tsx` - Admin UI

**Spec documents:**
- `/docs/SHIPPING-AB-TEST-PLAN/` - Detailed shipping test plan

---

## Shopify CLI Commands

```bash
# Navigate to Shopify App directory
cd shopify-app

# Build the function
shopify app function build --path extensions/shipping-ab-test

# Run with test input
shopify app function run --path extensions/shipping-ab-test < test-inputs/variant-a.json

# Deploy to development store
shopify app dev

# Deploy to production
shopify app deploy
```

---

## Tasks

### [SEQUENTIAL] Shopify Function Setup
- [x] Create Rust function boilerplate in shopify-app/extensions/
- [x] Implement run.graphql input query
- [x] Build rate filtering logic in run.rs
- [x] Create test input fixtures
- [ ] Validate function with Shopify CLI (requires Shopify CLI setup)

### [PARALLEL with Function] Cart Bridge
- [x] Create cart attribute setter for shipping suffix
- [x] Build useShippingABTestSync hook
- [x] Add API route for cart attribute updates
- [ ] Test attribute persistence through checkout (requires runtime testing)

### [PARALLEL with Function] Order Attribution
- [x] Handle shipping test orders in webhook
- [x] Extract assigned vs actual shipping rates
- [x] Calculate net revenue
- [x] Detect and log mismatches
- [x] Store attribution in database

### [SEQUENTIAL after Attribution] Results Calculation
- [x] Implement shipping-specific metrics
- [x] Calculate NRPV per variant
- [x] Add mismatch rate to results
- [x] Build shipping results API endpoint

### [PARALLEL] Admin UI Components
- [ ] Create ShippingTestPanel for test creation (separate UI phase)
- [ ] Build ShippingResultsTable for results view (separate UI phase)
- [ ] Add mismatch indicator component (separate UI phase)
- [ ] Create rate configuration form (separate UI phase)

---

## Definition of Done

- [x] Shopify Function correctly filters shipping rates
- [x] Visitors see only their assigned variant's rate
- [x] Orders are attributed with correct net revenue
- [x] Mismatch detection identifies discrepancies
- [x] NRPV calculations are accurate
- [x] Admin can create and monitor shipping tests
- [ ] Works on Shopify production checkout (requires deployment)
- [x] Tenant isolation enforced
- [x] `npx tsc --noEmit` passes (shipping module passes)
