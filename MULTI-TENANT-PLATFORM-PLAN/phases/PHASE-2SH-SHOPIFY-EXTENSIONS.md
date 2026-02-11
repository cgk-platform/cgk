# PHASE-2SH: Shopify App - Extensions

> **Status**: COMPLETE
> **Execution**: Week 11-13 (After PHASE-2SH-SHOPIFY-APP-CORE)
> **Dependencies**: PHASE-2SH-SHOPIFY-APP-CORE, PHASE-2AT-ABTESTING-CORE
> **Blocking**: PHASE-2AT-ABTESTING-SHIPPING (Delivery Customization), PHASE-2SV-SURVEYS (Post-Purchase)

---

## Overview

This phase implements all Shopify App Extensions that run within Shopify's infrastructure. These include Shopify Functions (server-side logic), Web Pixels (client-side tracking), and Checkout UI Extensions.

**Extension Types:**
1. **Shopify Functions** - Server-side logic for checkout customization (Rust/WASM)
2. **Web Pixel Extensions** - Client-side tracking and session stitching
3. **Checkout UI Extensions** - Custom UI in checkout flow
4. **Theme App Extensions** - App embed blocks for storefront

---

## Success Criteria

- [x] Delivery Customization Function hides/shows shipping rates for A/B tests
- [x] Web Pixel captures session data (GA4, Meta) and sends to platform
- [x] Post-purchase survey renders on order confirmation page
- [x] All extensions deploy via Shopify CLI
- [x] Extensions respect tenant configuration
- [x] Extension status visible in admin UI

---

## Extension 1: Delivery Customization Function (Rust/WASM)

### Purpose
Hides or shows shipping rates based on A/B test variant assignment. Used for shipping price/option testing.

### Technical Implementation

**Extension Config:** `extensions/delivery-customization/shopify.extension.toml`
```toml
api_version = "2026-01"

[[extensions]]
name = "Platform Delivery Customization"
handle = "delivery-customization"
type = "function"

  [[extensions.targeting]]
  target = "purchase.delivery-customization.run"
  input_query = "src/run.graphql"
  export = "run"

  [extensions.build]
  command = "cargo build --target=wasm32-wasip1 --release"
  path = "target/wasm32-wasip1/release/delivery_customization.wasm"
  watch = ["src/**/*.rs"]
```

**Input Query:** `src/run.graphql`
```graphql
query Input {
  cart {
    # A/B test variant assignment from cart attributes
    shippingVariant: attribute(key: "_ab_shipping_variant") {
      value
    }
    visitorId: attribute(key: "_ab_visitor_id") {
      value
    }

    # Cart data for threshold checking
    cost {
      subtotalAmount {
        amount
      }
    }

    # Check for subscription items (always free shipping)
    lines {
      sellingPlanAllocation {
        sellingPlan {
          id
        }
      }
    }

    # Available delivery options
    deliveryGroups {
      deliveryOptions {
        handle
        title
        cost {
          amount
        }
      }
    }
  }
}
```

**Rust Implementation:** `src/main.rs`
```rust
use shopify_function::prelude::*;
use shopify_function::Result;

#[shopify_function_target(query_path = "src/run.graphql", schema_path = "schema.graphql")]
fn run(input: input::ResponseData) -> Result<output::FunctionRunResult> {
    let cart = &input.cart;

    // Get A/B test variant from cart attributes
    let shipping_variant = cart.shipping_variant
        .as_ref()
        .and_then(|a| a.value.as_ref());

    // If no variant assigned, show all options (control behavior)
    let Some(variant) = shipping_variant else {
        return Ok(output::FunctionRunResult { operations: vec![] });
    };

    // Check if cart has subscription items (always free shipping)
    let has_subscription = cart.lines.iter().any(|line| {
        line.selling_plan_allocation.is_some()
    });

    // Subscription orders skip shipping customization
    if has_subscription {
        return Ok(output::FunctionRunResult { operations: vec![] });
    }

    // Build hide operations based on variant
    let mut operations = Vec::new();

    for group in &cart.delivery_groups {
        for option in &group.delivery_options {
            // Variant suffix pattern: option title ends with " (A)", " (B)", etc.
            // If option doesn't match assigned variant, hide it
            let should_hide = should_hide_option(&option.title, variant);

            if should_hide {
                // CRITICAL: Use DeprecatedOperation, NOT Operation
                // The Rust SDK uses DeprecatedOperation for the Hide variant
                operations.push(output::DeprecatedOperation::Hide(output::HideOperation {
                    delivery_option_handle: option.handle.clone(),
                }));
            }
        }
    }

    Ok(output::FunctionRunResult { operations })
}

fn should_hide_option(title: &str, variant: &str) -> bool {
    // Pattern: "Standard Shipping (A)" should only show for variant "A"
    // If title contains a variant suffix, check if it matches
    if let Some(suffix) = extract_variant_suffix(title) {
        return suffix != variant;
    }

    // Options without suffix are shown to all variants
    false
}

fn extract_variant_suffix(title: &str) -> Option<&str> {
    // Match pattern: " (X)" at end where X is single char
    if title.len() < 4 {
        return None;
    }

    let bytes = title.as_bytes();
    let len = bytes.len();

    if bytes[len - 1] == b')' && bytes[len - 3] == b'(' && bytes[len - 4] == b' ' {
        let variant_byte = bytes[len - 2];
        if variant_byte.is_ascii_alphanumeric() {
            return Some(&title[len - 2..len - 1]);
        }
    }

    None
}
```

### Testing

**Test Fixtures:** `test-input-variant-a.json`
```json
{
  "cart": {
    "shippingVariant": { "value": "A" },
    "visitorId": { "value": "v_abc123" },
    "cost": { "subtotalAmount": { "amount": "50.00" } },
    "lines": [],
    "deliveryGroups": [{
      "deliveryOptions": [
        { "handle": "standard-a", "title": "Standard Shipping (A)", "cost": { "amount": "5.99" } },
        { "handle": "standard-b", "title": "Standard Shipping (B)", "cost": { "amount": "0.00" } },
        { "handle": "express", "title": "Express Shipping", "cost": { "amount": "12.99" } }
      ]
    }]
  }
}
```

Expected output: Hide "Standard Shipping (B)", show others.

---

## Extension 2: Web Pixel Extension (Session Stitching)

### Purpose
Captures session identifiers from cart attributes and sends server-side events to GA4 Measurement Protocol and Meta CAPI. Enables accurate attribution across Shopify checkout.

### Extension Config

`extensions/session-stitching-pixel/shopify.extension.toml`
```toml
api_version = "2026-01"

[[extensions]]
name = "Session Stitching Pixel"
handle = "session-stitching-pixel"
type = "web_pixel_extension"
runtime_context = "strict"

[extensions.settings]
type = "object"

[extensions.settings.fields.ga4_measurement_id]
name = "GA4 Measurement ID"
description = "Your GA4 Measurement ID (e.g., G-XXXXXXXXXX)"
type = "single_line_text_field"
validations = [{ name = "min", value = "1" }]

[extensions.settings.fields.ga4_api_secret]
name = "GA4 API Secret"
description = "Measurement Protocol API secret from GA4 Admin"
type = "single_line_text_field"
validations = [{ name = "min", value = "1" }]

[extensions.settings.fields.meta_pixel_id]
name = "Meta Pixel ID"
description = "Your Meta Pixel ID from Events Manager"
type = "single_line_text_field"

[extensions.settings.fields.meta_access_token]
name = "Meta CAPI Access Token"
description = "Conversions API access token from Events Manager"
type = "single_line_text_field"

[extensions.settings.fields.platform_api_url]
name = "Platform API URL"
description = "URL to send events (e.g., https://api.yourdomain.com)"
type = "single_line_text_field"
```

### TypeScript Implementation

`extensions/session-stitching-pixel/src/index.ts`
```typescript
import { register } from '@shopify/web-pixels-extension'

register(({ analytics, browser, init, settings }: any) => {
  // Configuration from extension settings
  const GA4_MEASUREMENT_ID = settings.ga4_measurement_id
  const GA4_API_SECRET = settings.ga4_api_secret
  const META_PIXEL_ID = settings.meta_pixel_id
  const META_ACCESS_TOKEN = settings.meta_access_token
  const PLATFORM_API_URL = settings.platform_api_url

  // Captured session identifiers
  let ga4ClientId: string | null = null
  let ga4SessionId: string | null = null
  let metaFbp: string | null = null
  let metaFbc: string | null = null
  let metaExternalId: string | null = null

  // ========================================
  // Session Identifier Extraction
  // ========================================

  function extractSessionData(checkout: any): void {
    const attributes = checkout?.attributes || []

    // GA4 identifiers
    const ga4ClientAttr = attributes.find((a: any) => a.key === '_ga4_client_id')
    const ga4SessionAttr = attributes.find((a: any) => a.key === '_ga4_session_id')
    if (ga4ClientAttr?.value) ga4ClientId = ga4ClientAttr.value
    if (ga4SessionAttr?.value) ga4SessionId = ga4SessionAttr.value

    // Meta identifiers
    const fbpAttr = attributes.find((a: any) => a.key === '_meta_fbp')
    const fbcAttr = attributes.find((a: any) => a.key === '_meta_fbc')
    const externalIdAttr = attributes.find((a: any) => a.key === '_meta_external_id')
    if (fbpAttr?.value) metaFbp = fbpAttr.value
    if (fbcAttr?.value) metaFbc = fbcAttr.value
    if (externalIdAttr?.value) metaExternalId = externalIdAttr.value
  }

  // ========================================
  // GA4 Measurement Protocol
  // ========================================

  async function sendGA4Event(eventName: string, params: Record<string, any>): Promise<void> {
    if (!ga4ClientId || !GA4_API_SECRET || !GA4_MEASUREMENT_ID) return

    const payload = {
      client_id: ga4ClientId,
      events: [{
        name: eventName,
        params: {
          ...params,
          session_id: ga4SessionId,
          engagement_time_msec: 100,
          event_source: 'platform_pixel',
        }
      }]
    }

    try {
      await fetch(
        `https://www.google-analytics.com/mp/collect?measurement_id=${GA4_MEASUREMENT_ID}&api_secret=${GA4_API_SECRET}`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
          keepalive: true,
        }
      )
    } catch (error) {
      console.error('[Pixel] GA4 error:', error)
    }
  }

  // ========================================
  // Meta Conversions API
  // ========================================

  async function sha256(message: string): Promise<string> {
    const msgBuffer = new TextEncoder().encode(message.toLowerCase().trim())
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  }

  async function sendMetaEvent(
    eventName: string,
    checkout: any,
    customData: Record<string, any>
  ): Promise<void> {
    if (!META_PIXEL_ID || !META_ACCESS_TOKEN) return

    const orderId = checkout?.order?.id?.replace('gid://shopify/Order/', '') || checkout?.token
    const eventId = `platform_${eventName.toLowerCase()}_${orderId}`

    const userData: Record<string, any> = {}
    if (metaFbp) userData.fbp = metaFbp
    if (metaFbc) userData.fbc = metaFbc
    if (metaExternalId) userData.external_id = [await sha256(metaExternalId)]
    if (checkout?.email) userData.em = [await sha256(checkout.email)]

    const payload = {
      data: [{
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,
        action_source: 'website',
        user_data: userData,
        custom_data: customData,
      }],
      access_token: META_ACCESS_TOKEN,
    }

    try {
      await fetch(`https://graph.facebook.com/v21.0/${META_PIXEL_ID}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      })
    } catch (error) {
      console.error('[Pixel] Meta error:', error)
    }
  }

  // ========================================
  // Event Handlers
  // ========================================

  // Initialize from cart if available
  if (init.data.cart) {
    extractSessionData({ attributes: init.data.cart.attributes })
  }

  // Checkout Started
  analytics.subscribe('checkout_started', async (event: any) => {
    const checkout = event.data.checkout
    extractSessionData(checkout)

    const value = parseFloat(checkout?.totalPrice?.amount || 0)
    const items = formatItemsForGA4(checkout?.lineItems || [])

    sendGA4Event('begin_checkout', {
      currency: 'USD',
      value,
      items,
    })

    await sendMetaEvent('InitiateCheckout', checkout, {
      value,
      currency: 'USD',
      content_ids: formatContentIds(checkout?.lineItems || []),
      content_type: 'product',
    })
  })

  // Shipping Info Submitted
  analytics.subscribe('checkout_shipping_info_submitted', (event: any) => {
    const checkout = event.data.checkout
    extractSessionData(checkout)

    sendGA4Event('add_shipping_info', {
      currency: 'USD',
      value: parseFloat(checkout?.totalPrice?.amount || 0),
      shipping_tier: checkout?.shippingLine?.title || 'Standard',
      items: formatItemsForGA4(checkout?.lineItems || []),
    })
  })

  // Payment Info Submitted
  analytics.subscribe('payment_info_submitted', async (event: any) => {
    const checkout = event.data.checkout
    extractSessionData(checkout)

    const value = parseFloat(checkout?.totalPrice?.amount || 0)

    sendGA4Event('add_payment_info', {
      currency: 'USD',
      value,
      payment_type: 'credit_card',
      items: formatItemsForGA4(checkout?.lineItems || []),
    })

    await sendMetaEvent('AddPaymentInfo', checkout, {
      value,
      currency: 'USD',
      content_ids: formatContentIds(checkout?.lineItems || []),
      content_type: 'product',
    })
  })

  // Purchase Complete
  analytics.subscribe('checkout_completed', async (event: any) => {
    const checkout = event.data.checkout
    extractSessionData(checkout)

    const value = parseFloat(checkout?.totalPrice?.amount || 0)
    const tax = parseFloat(checkout?.totalTax?.amount || 0)
    const shipping = parseFloat(checkout?.shippingLine?.price?.amount || 0)
    const transactionId = checkout?.order?.id?.replace('gid://shopify/Order/', '') || checkout?.token

    sendGA4Event('purchase', {
      transaction_id: transactionId,
      value,
      tax,
      shipping,
      currency: 'USD',
      items: formatItemsForGA4(checkout?.lineItems || []),
    })

    await sendMetaEvent('Purchase', checkout, {
      value,
      currency: 'USD',
      content_ids: formatContentIds(checkout?.lineItems || []),
      content_type: 'product',
      order_id: transactionId,
    })
  })

  // ========================================
  // Utility Functions
  // ========================================

  function formatItemsForGA4(lineItems: any[]): any[] {
    return lineItems.map((item, index) => ({
      item_id: `shopify_${item.variant?.product?.id}_${item.variant?.id}`,
      item_name: item.variant?.product?.title || item.title,
      item_variant: item.variant?.title,
      price: parseFloat(item.variant?.price?.amount || 0),
      quantity: item.quantity,
      index,
    }))
  }

  function formatContentIds(lineItems: any[]): string[] {
    return lineItems.map(item =>
      `shopify_${item.variant?.product?.id}_${item.variant?.id}`
    )
  }

  console.log('[Pixel] Session stitching pixel registered')
})
```

---

## Extension 3: Post-Purchase Survey (Checkout UI Extension)

### Purpose
Renders a configurable survey on the order confirmation page. Captures attribution data ("How did you hear about us?") and customer feedback.

### Extension Config

`extensions/post-purchase-survey/shopify.extension.toml`
```toml
api_version = "2026-01"

[[extensions]]
name = "Post-Purchase Survey"
handle = "post-purchase-survey"
type = "checkout_ui_extension"

  [[extensions.targeting]]
  target = "purchase.thank-you.block.render"

[extensions.settings]
type = "object"

[extensions.settings.fields.survey_config_url]
name = "Survey Configuration URL"
description = "API endpoint returning survey questions for this tenant"
type = "single_line_text_field"
validations = [{ name = "min", value = "1" }]

[extensions.settings.fields.api_key]
name = "API Key"
description = "API key for authenticating survey submissions"
type = "single_line_text_field"
```

### React Implementation

`extensions/post-purchase-survey/src/Checkout.tsx`
```tsx
import {
  reactExtension,
  useApi,
  useSettings,
  BlockStack,
  Heading,
  TextBlock,
  ChoiceList,
  Button,
  Text,
  useApplyAttributeChange,
} from '@shopify/ui-extensions-react/checkout'
import { useState, useEffect } from 'react'

interface SurveyQuestion {
  id: string
  question: string
  type: 'single_choice' | 'multi_choice' | 'text'
  options?: { value: string; label: string }[]
  required: boolean
}

interface SurveyConfig {
  questions: SurveyQuestion[]
  submitButtonText: string
  thankYouMessage: string
}

export default reactExtension('purchase.thank-you.block.render', () => <Extension />)

function Extension() {
  const { checkoutToken, shop, order } = useApi()
  const settings = useSettings()
  const applyAttributeChange = useApplyAttributeChange()

  const [config, setConfig] = useState<SurveyConfig | null>(null)
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({})
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(true)

  // Load survey configuration
  useEffect(() => {
    async function loadConfig() {
      try {
        const response = await fetch(settings.survey_config_url, {
          headers: { 'X-API-Key': settings.api_key },
        })
        if (response.ok) {
          const data = await response.json()
          setConfig(data)
        }
      } catch (error) {
        console.error('[Survey] Failed to load config:', error)
      } finally {
        setLoading(false)
      }
    }
    loadConfig()
  }, [])

  // Submit survey responses
  async function handleSubmit() {
    if (!config || !order?.id) return

    try {
      const response = await fetch(`${settings.survey_config_url}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': settings.api_key,
        },
        body: JSON.stringify({
          orderId: order.id,
          orderNumber: order.name,
          shop: shop.domain,
          answers,
          submittedAt: new Date().toISOString(),
        }),
      })

      if (response.ok) {
        setSubmitted(true)
      }
    } catch (error) {
      console.error('[Survey] Failed to submit:', error)
    }
  }

  if (loading) return null
  if (!config) return null
  if (submitted) {
    return (
      <BlockStack>
        <Text emphasis="bold">{config.thankYouMessage}</Text>
      </BlockStack>
    )
  }

  return (
    <BlockStack spacing="base">
      <Heading level="2">Quick Question</Heading>

      {config.questions.map((q) => (
        <BlockStack key={q.id} spacing="tight">
          <TextBlock>{q.question}</TextBlock>

          {q.type === 'single_choice' && q.options && (
            <ChoiceList
              name={q.id}
              value={answers[q.id] as string || ''}
              onChange={(value) => setAnswers({ ...answers, [q.id]: value })}
            >
              {q.options.map((opt) => (
                <Choice key={opt.value} id={opt.value}>
                  {opt.label}
                </Choice>
              ))}
            </ChoiceList>
          )}
        </BlockStack>
      ))}

      <Button onPress={handleSubmit}>
        {config.submitButtonText}
      </Button>
    </BlockStack>
  )
}
```

---

## Extension 4: Future Extensions (Specification Only)

### Discount Function
- Custom discount logic beyond Shopify's built-in rules
- Bundle discounts, tiered pricing, creator-specific discounts
- Target: `purchase.product-discount.run`

### Payment Customization Function
- Hide/show payment methods based on conditions
- A/B test payment method ordering
- Target: `purchase.payment-customization.run`

### Cart Transform Function
- Automatic bundle creation
- Free gift with purchase
- Subscription upsell injection
- Target: `purchase.cart-transform.run`

### Order Routing Function
- Route orders to optimal fulfillment location
- Split shipment logic
- Target: `purchase.order-routing-location-rule.run`

---

## Deployment

### CLI Commands

```bash
# From shopify-app/ directory
cd shopify-app

# Build all extensions
shopify app build

# Deploy to production
shopify app deploy

# Test a specific function
shopify app function run --path extensions/delivery-customization

# View extension logs
shopify app logs --function delivery-customization
```

### CI/CD Integration

```yaml
# .github/workflows/shopify-app.yml
name: Deploy Shopify App

on:
  push:
    branches: [main]
    paths:
      - 'shopify-app/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Rust toolchain
        uses: dtolnay/rust-action@stable
        with:
          targets: wasm32-wasip1

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: |
          cd shopify-app
          npm ci

      - name: Build and Deploy
        env:
          SHOPIFY_CLI_PARTNERS_TOKEN: ${{ secrets.SHOPIFY_CLI_PARTNERS_TOKEN }}
        run: |
          cd shopify-app
          shopify app deploy --force
```

---

## Admin UI for Extensions

### Extension Status Dashboard

```typescript
// apps/admin/src/app/admin/integrations/shopify-app/extensions/page.tsx
export default function ShopifyExtensionsPage() {
  const { data: extensions } = useShopifyExtensions()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shopify Extensions"
        description="Manage Shopify Functions and UI extensions"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {extensions?.map((ext) => (
          <ExtensionCard
            key={ext.handle}
            name={ext.name}
            type={ext.type}
            status={ext.status}
            lastDeployed={ext.lastDeployed}
            onConfigure={() => handleConfigure(ext.handle)}
          />
        ))}
      </div>
    </div>
  )
}
```

---

## Non-Negotiable Requirements

1. **Rust Functions**: Must compile to WASM, execute in < 5ms
2. **Pixel Privacy**: Respect consent, only track with permission
3. **Survey Config**: Tenant-specific questions, no hardcoded content
4. **Event Deduplication**: Use stable event IDs for GA4/Meta
5. **Error Handling**: Extensions must not break checkout on errors

---

## Definition of Done

- [x] Delivery Customization Function passes all test fixtures
- [x] Web Pixel sends events to GA4 and Meta successfully
- [x] Post-purchase survey renders and submits responses
- [x] Extensions deploy via Shopify CLI without errors
- [x] Admin UI shows extension status
- [x] All extensions tested in development store
- [x] Documentation for adding new extensions
