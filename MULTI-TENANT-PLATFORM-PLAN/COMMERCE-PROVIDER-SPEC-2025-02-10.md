# Commerce Provider Abstraction Specification

**Created**: 2025-02-10
**Status**: Design Complete
**Purpose**: Dual checkout system - Shopify Headless (default) with optional self-hosted Stripe checkout

---

## Overview

The platform supports two commerce provider modes, controlled via feature flag:

| Mode | Provider | Products | Cart | Checkout | Payments |
|------|----------|----------|------|----------|----------|
| **Default** | Shopify Headless | Shopify Products | Shopify Cart | Shopify Checkout | Shopify Payments |
| **Self-Hosted** | Custom + Stripe | Local Products DB | Local Cart | Custom Checkout | Stripe Direct |

Both modes share the same storefront components and admin UI through a unified **Commerce Provider** abstraction.

---

## Why This Architecture

### Business Flexibility
- **Start with Shopify**: Quick setup, proven checkout, built-in payments
- **Migrate when ready**: Full control over checkout, lower transaction fees
- **Per-tenant choice**: Some brands stay Shopify, others go custom
- **Gradual rollout**: A/B test checkout providers per tenant

### Technical Benefits
- **Single codebase**: Same components work with both providers
- **Feature flag controlled**: Switch providers without code changes
- **Consistent API**: Storefront doesn't care which provider is active
- **Data portability**: Export from Shopify, import to custom

---

## Feature Flag

```typescript
// Platform flag key
'commerce.provider': {
  name: 'Commerce Provider',
  description: 'Choose commerce backend: shopify (default) or custom',
  type: 'variant',
  defaultValue: 'shopify',
  variants: [
    { key: 'shopify', weight: 100 },  // Default
    { key: 'custom', weight: 0 }       // Opt-in
  ],
  category: 'commerce',
}
```

### Per-Tenant Override

Tenants can be switched via the feature flag override system:

```sql
-- Enable custom checkout for specific tenant
INSERT INTO public.feature_flag_overrides (flag_id, tenant_id, value, reason)
VALUES (
  (SELECT id FROM public.feature_flags WHERE key = 'commerce.provider'),
  'tenant_uuid_here',
  '"custom"',
  'Migrated to self-hosted checkout 2025-02-10'
);
```

---

## Commerce Provider Interface

### Core Interface

```typescript
// packages/commerce/src/types.ts
export interface CommerceProvider {
  readonly name: 'shopify' | 'custom'

  // Product Operations
  products: {
    getByHandle(handle: string): Promise<Product>
    getByIds(ids: string[]): Promise<Product[]>
    list(options: ListOptions): Promise<PaginatedProducts>
    search(query: string): Promise<Product[]>
  }

  // Cart Operations
  cart: {
    create(): Promise<Cart>
    get(cartId: string): Promise<Cart | null>
    addLine(cartId: string, line: CartLineInput): Promise<Cart>
    updateLine(cartId: string, lineId: string, quantity: number): Promise<Cart>
    removeLine(cartId: string, lineId: string): Promise<Cart>
    setAttributes(cartId: string, attributes: CartAttribute[]): Promise<Cart>
    setDiscountCodes(cartId: string, codes: string[]): Promise<Cart>
  }

  // Checkout Operations
  checkout: {
    create(cartId: string, customer?: CustomerInput): Promise<CheckoutSession>
    getUrl(checkoutId: string): Promise<string>
    complete(checkoutId: string, paymentInfo: PaymentInput): Promise<Order>
    getStatus(checkoutId: string): Promise<CheckoutStatus>
  }

  // Order Operations
  orders: {
    get(orderId: string): Promise<Order>
    list(options: OrderListOptions): Promise<PaginatedOrders>
    cancel(orderId: string, reason?: string): Promise<Order>
    refund(orderId: string, amount: number, reason?: string): Promise<Refund>
  }

  // Customer Operations
  customers: {
    get(customerId: string): Promise<Customer>
    getByEmail(email: string): Promise<Customer | null>
    create(input: CustomerInput): Promise<Customer>
    update(customerId: string, input: Partial<CustomerInput>): Promise<Customer>
  }

  // Subscription Operations (optional)
  subscriptions?: {
    create(input: SubscriptionInput): Promise<Subscription>
    get(subscriptionId: string): Promise<Subscription>
    update(subscriptionId: string, input: SubscriptionUpdate): Promise<Subscription>
    cancel(subscriptionId: string): Promise<Subscription>
    pause(subscriptionId: string): Promise<Subscription>
    resume(subscriptionId: string): Promise<Subscription>
  }

  // Discount Operations
  discounts: {
    validate(code: string, cart: Cart): Promise<DiscountValidation>
    apply(code: string, cart: Cart): Promise<Cart>
    remove(code: string, cart: Cart): Promise<Cart>
  }

  // Webhook Handling
  webhooks: {
    verify(request: Request): Promise<boolean>
    process(event: WebhookEvent): Promise<void>
  }
}
```

### Unified Data Types

```typescript
// packages/commerce/src/types.ts

export interface Product {
  id: string
  handle: string
  title: string
  description: string
  descriptionHtml: string
  vendor: string
  productType: string
  tags: string[]
  status: 'active' | 'draft' | 'archived'
  variants: ProductVariant[]
  images: ProductImage[]
  options: ProductOption[]
  seo: {
    title?: string
    description?: string
  }
  metafields: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface ProductVariant {
  id: string
  title: string
  sku: string
  barcode?: string
  price: Money
  compareAtPrice?: Money
  inventoryQuantity: number
  inventoryPolicy: 'deny' | 'continue'
  requiresShipping: boolean
  weight?: number
  weightUnit?: 'KILOGRAMS' | 'GRAMS' | 'POUNDS' | 'OUNCES'
  selectedOptions: { name: string; value: string }[]
  image?: ProductImage
  available: boolean
}

export interface Cart {
  id: string
  lines: CartLine[]
  attributes: CartAttribute[]
  discountCodes: string[]
  discountAllocations: DiscountAllocation[]
  estimatedCost: {
    subtotalAmount: Money
    totalDiscountAmount: Money
    totalTaxAmount: Money
    totalAmount: Money
  }
  buyerIdentity?: {
    email?: string
    phone?: string
    customerId?: string
    countryCode?: string
  }
  checkoutUrl?: string
  createdAt: string
  updatedAt: string
}

export interface CartLine {
  id: string
  productId: string
  variantId: string
  quantity: number
  product: Pick<Product, 'id' | 'title' | 'handle' | 'images'>
  variant: Pick<ProductVariant, 'id' | 'title' | 'sku' | 'price' | 'image' | 'selectedOptions'>
  attributes: CartAttribute[]
  cost: {
    subtotalAmount: Money
    totalAmount: Money
    perItemAmount: Money
  }
}

export interface Order {
  id: string
  orderNumber: string
  email: string
  phone?: string
  customer?: Customer
  lineItems: OrderLineItem[]
  shippingAddress?: Address
  billingAddress?: Address
  shippingLine?: ShippingLine
  financialStatus: OrderFinancialStatus
  fulfillmentStatus: OrderFulfillmentStatus
  subtotalPrice: Money
  totalDiscounts: Money
  totalShipping: Money
  totalTax: Money
  totalPrice: Money
  discountCodes: string[]
  note?: string
  noteAttributes: CartAttribute[]
  tags: string[]
  paymentDetails?: PaymentDetails
  createdAt: string
  updatedAt: string
  cancelledAt?: string
  cancelReason?: string
}

export interface Money {
  amount: number       // In cents
  currencyCode: string // ISO 4217
}

export type OrderFinancialStatus =
  | 'pending'
  | 'authorized'
  | 'partially_paid'
  | 'paid'
  | 'partially_refunded'
  | 'refunded'
  | 'voided'

export type OrderFulfillmentStatus =
  | 'unfulfilled'
  | 'partial'
  | 'fulfilled'
```

---

## Shopify Provider Implementation

### Structure

```
packages/commerce/src/providers/shopify/
├── index.ts              # Exports ShopifyProvider
├── client.ts             # Shopify GraphQL client
├── products.ts           # Product operations
├── cart.ts               # Cart operations
├── checkout.ts           # Checkout operations
├── orders.ts             # Order operations
├── customers.ts          # Customer operations
├── subscriptions.ts      # Loop integration for subscriptions
├── discounts.ts          # Discount operations
├── webhooks.ts           # Webhook handling
├── mappers.ts            # Shopify → Unified type mappers
└── queries/
    ├── products.ts       # GraphQL queries
    ├── cart.ts
    └── orders.ts
```

### Implementation Pattern

```typescript
// packages/commerce/src/providers/shopify/index.ts
import type { CommerceProvider } from '../../types'
import { ShopifyStorefrontClient } from './client'
import { createProductOperations } from './products'
import { createCartOperations } from './cart'
import { createCheckoutOperations } from './checkout'
import { createOrderOperations } from './orders'
import { createCustomerOperations } from './customers'
import { createDiscountOperations } from './discounts'
import { createWebhookHandler } from './webhooks'

export interface ShopifyProviderConfig {
  storeDomain: string
  storefrontToken: string
  adminToken?: string
  apiVersion?: string
}

export function createShopifyProvider(config: ShopifyProviderConfig): CommerceProvider {
  const client = new ShopifyStorefrontClient(config)

  return {
    name: 'shopify' as const,
    products: createProductOperations(client),
    cart: createCartOperations(client),
    checkout: createCheckoutOperations(client),
    orders: createOrderOperations(client),
    customers: createCustomerOperations(client),
    discounts: createDiscountOperations(client),
    webhooks: createWebhookHandler(config),
  }
}
```

### Checkout Flow (Shopify)

```
1. Cart created via Storefront API
2. User clicks checkout → redirected to Shopify Checkout
3. Shopify handles:
   - Payment collection
   - Shipping selection
   - Tax calculation
   - Order creation
4. Webhook fires → platform receives order
5. Platform syncs order to local database
```

---

## Custom Provider Implementation

### Structure

```
packages/commerce/src/providers/custom/
├── index.ts              # Exports CustomProvider
├── products.ts           # Local DB product operations
├── cart.ts               # Redis/DB cart operations
├── checkout.ts           # Custom checkout flow
├── orders.ts             # Local order operations
├── customers.ts          # Local customer operations
├── subscriptions.ts      # Stripe subscriptions
├── discounts.ts          # Local discount validation
├── webhooks.ts           # Stripe webhook handling
├── stripe.ts             # Stripe integration
└── shipping/
    ├── rates.ts          # Shipping rate calculation
    └── providers/        # Carrier integrations
```

### Database Schema (Custom Mode)

When using custom provider, these tables exist in tenant schema:

```sql
-- Products (managed locally instead of Shopify)
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handle VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  description_html TEXT,
  vendor VARCHAR(255),
  product_type VARCHAR(255),
  tags TEXT[] DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'draft',
  seo JSONB DEFAULT '{}',
  metafields JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  sku VARCHAR(255),
  barcode VARCHAR(255),
  price_cents INTEGER NOT NULL,
  compare_at_price_cents INTEGER,
  currency_code VARCHAR(3) DEFAULT 'USD',
  inventory_quantity INTEGER DEFAULT 0,
  inventory_policy VARCHAR(20) DEFAULT 'deny',
  requires_shipping BOOLEAN DEFAULT true,
  weight_grams INTEGER,
  selected_options JSONB DEFAULT '[]',
  image_url TEXT,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  alt_text TEXT,
  position INTEGER DEFAULT 0,
  width INTEGER,
  height INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Carts (can use Redis for performance, DB for persistence)
CREATE TABLE carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_email VARCHAR(255),
  buyer_phone VARCHAR(50),
  customer_id UUID REFERENCES customers(id),
  lines JSONB DEFAULT '[]',
  attributes JSONB DEFAULT '[]',
  discount_codes TEXT[] DEFAULT '{}',
  shipping_address JSONB,
  billing_address JSONB,
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Checkout Sessions
CREATE TABLE checkout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL REFERENCES carts(id),
  customer_id UUID REFERENCES customers(id),
  stripe_payment_intent_id VARCHAR(255),
  stripe_checkout_session_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending',
  shipping_rate JSONB,
  tax_calculation JSONB,
  totals JSONB NOT NULL,
  metadata JSONB DEFAULT '{}',
  expires_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Discounts (custom discount rules)
CREATE TABLE discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(100) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL,  -- 'percentage', 'fixed_amount', 'free_shipping', 'buy_x_get_y'
  value JSONB NOT NULL,       -- Discount configuration
  applies_to JSONB DEFAULT '{}',  -- Product/collection targeting
  minimum_requirements JSONB,     -- Min subtotal, min quantity
  customer_eligibility JSONB,     -- All, specific, tags
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  one_per_customer BOOLEAN DEFAULT false,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shipping Rates
CREATE TABLE shipping_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  carrier VARCHAR(100),
  service_code VARCHAR(100),
  price_cents INTEGER NOT NULL,
  currency_code VARCHAR(3) DEFAULT 'USD',
  conditions JSONB DEFAULT '{}',  -- Weight, price, zone conditions
  estimated_days_min INTEGER,
  estimated_days_max INTEGER,
  position INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Stripe Integration

```typescript
// packages/commerce/src/providers/custom/stripe.ts
import Stripe from 'stripe'

export interface StripeConfig {
  secretKey: string
  webhookSecret: string
  publishableKey: string
}

export function createStripeClient(config: StripeConfig) {
  const stripe = new Stripe(config.secretKey, {
    apiVersion: '2024-12-18.acacia',
  })

  return {
    // Payment Intents
    async createPaymentIntent(params: {
      amount: number
      currency: string
      customerId?: string
      metadata?: Record<string, string>
    }) {
      return stripe.paymentIntents.create({
        amount: params.amount,
        currency: params.currency,
        customer: params.customerId,
        metadata: params.metadata,
        automatic_payment_methods: { enabled: true },
      })
    },

    // Checkout Sessions (optional hosted checkout)
    async createCheckoutSession(params: {
      lineItems: Stripe.Checkout.SessionCreateParams.LineItem[]
      successUrl: string
      cancelUrl: string
      customerId?: string
      metadata?: Record<string, string>
    }) {
      return stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: params.lineItems,
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        customer: params.customerId,
        metadata: params.metadata,
      })
    },

    // Subscriptions
    async createSubscription(params: {
      customerId: string
      priceId: string
      metadata?: Record<string, string>
    }) {
      return stripe.subscriptions.create({
        customer: params.customerId,
        items: [{ price: params.priceId }],
        metadata: params.metadata,
      })
    },

    // Webhook verification
    constructEvent(body: string, signature: string) {
      return stripe.webhooks.constructEvent(
        body,
        signature,
        config.webhookSecret
      )
    },
  }
}
```

### Checkout Flow (Custom)

```
1. Cart created and stored in Redis/DB
2. User clicks checkout
3. Custom checkout page renders:
   a. Cart summary (from local data)
   b. Shipping address form
   c. Shipping rate selection (calculated locally or via carrier APIs)
   d. Tax calculation (TaxJar, Avalara, or custom rules)
   e. Stripe Payment Element
4. User submits payment
5. Platform:
   a. Creates Stripe PaymentIntent
   b. Confirms payment
   c. Creates order in local DB
   d. Triggers fulfillment workflows
6. Stripe webhook confirms payment → order status updated
```

---

## Provider Factory

```typescript
// packages/commerce/src/factory.ts
import type { CommerceProvider } from './types'
import { createShopifyProvider, ShopifyProviderConfig } from './providers/shopify'
import { createCustomProvider, CustomProviderConfig } from './providers/custom'
import { evaluateFlag } from '@cgk/feature-flags'

export type CommerceProviderConfig =
  | { type: 'shopify'; config: ShopifyProviderConfig }
  | { type: 'custom'; config: CustomProviderConfig }
  | { type: 'auto'; shopifyConfig: ShopifyProviderConfig; customConfig: CustomProviderConfig }

export async function createCommerceProvider(
  tenantId: string,
  providerConfig: CommerceProviderConfig
): Promise<CommerceProvider> {

  // Auto mode: check feature flag
  if (providerConfig.type === 'auto') {
    const { value: providerType } = await evaluateFlag('commerce.provider', { tenantId })

    if (providerType === 'custom') {
      return createCustomProvider(providerConfig.customConfig)
    }
    return createShopifyProvider(providerConfig.shopifyConfig)
  }

  // Explicit mode
  if (providerConfig.type === 'custom') {
    return createCustomProvider(providerConfig.config)
  }

  return createShopifyProvider(providerConfig.config)
}

// Convenience hook for React
export function useCommerceProvider(): CommerceProvider {
  const tenant = useTenant()
  const provider = useMemo(() => {
    return createCommerceProvider(tenant.id, tenant.commerceConfig)
  }, [tenant.id, tenant.commerceConfig])

  return provider
}
```

---

## Storefront Usage

Components use the provider abstraction, unaware of which backend is active:

```typescript
// apps/storefront/src/components/product-page.tsx
import { useCommerceProvider } from '@cgk/commerce'
import { useCart } from '@cgk/commerce-hooks'

export function ProductPage({ handle }: { handle: string }) {
  const commerce = useCommerceProvider()
  const { cart, addToCart } = useCart()
  const [product, setProduct] = useState<Product | null>(null)

  useEffect(() => {
    commerce.products.getByHandle(handle).then(setProduct)
  }, [handle])

  async function handleAddToCart(variantId: string) {
    await addToCart({
      variantId,
      quantity: 1,
    })
  }

  // Same component works with Shopify or Custom provider
  return (
    <div>
      <h1>{product?.title}</h1>
      <button onClick={() => handleAddToCart(product?.variants[0].id)}>
        Add to Cart
      </button>
    </div>
  )
}
```

### Checkout Component

```typescript
// apps/storefront/src/components/checkout.tsx
import { useCommerceProvider } from '@cgk/commerce'
import { useCart } from '@cgk/commerce-hooks'
import { useFlag } from '@cgk/feature-flags/react'

export function Checkout() {
  const provider = useCommerceProvider()
  const { cart } = useCart()
  const isCustomCheckout = useFlag('commerce.provider') === 'custom'

  // For Shopify: redirect to Shopify checkout
  if (!isCustomCheckout) {
    return (
      <Button onClick={() => window.location.href = cart.checkoutUrl}>
        Proceed to Checkout
      </Button>
    )
  }

  // For Custom: render embedded checkout
  return <CustomCheckoutForm cart={cart} />
}

function CustomCheckoutForm({ cart }: { cart: Cart }) {
  const commerce = useCommerceProvider()
  const [step, setStep] = useState<'shipping' | 'payment' | 'review'>('shipping')

  return (
    <div>
      {step === 'shipping' && <ShippingForm onComplete={() => setStep('payment')} />}
      {step === 'payment' && <PaymentForm onComplete={() => setStep('review')} />}
      {step === 'review' && <OrderReview onConfirm={handleConfirm} />}
    </div>
  )
}
```

---

## Admin UI for Provider Selection

```typescript
// apps/admin/src/app/admin/settings/commerce/page.tsx
export default async function CommerceSettingsPage() {
  const tenant = await getTenantContext()
  const currentProvider = await evaluateFlag('commerce.provider', { tenantId: tenant.id })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Commerce Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Commerce Provider</CardTitle>
          <CardDescription>
            Choose how products, cart, and checkout are managed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup value={currentProvider.value} onValueChange={handleProviderChange}>
            <div className="flex items-start space-x-3 p-4 border rounded-lg">
              <RadioGroupItem value="shopify" id="shopify" />
              <div>
                <Label htmlFor="shopify" className="font-medium">
                  Shopify Headless
                </Label>
                <p className="text-sm text-muted-foreground">
                  Products and checkout managed by Shopify. Best for quick setup and
                  proven checkout experience.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-4 border rounded-lg">
              <RadioGroupItem value="custom" id="custom" />
              <div>
                <Label htmlFor="custom" className="font-medium">
                  Self-Hosted (Stripe)
                </Label>
                <p className="text-sm text-muted-foreground">
                  Products managed locally, checkout via Stripe. Full control over
                  checkout flow and lower transaction fees.
                </p>
              </div>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Provider-specific configuration */}
      {currentProvider.value === 'shopify' && <ShopifySettings tenant={tenant} />}
      {currentProvider.value === 'custom' && <StripeSettings tenant={tenant} />}
    </div>
  )
}
```

---

## Migration Path: Shopify → Custom

### Data Migration Tool

```typescript
// packages/cli/src/commands/migrate-commerce.ts
export async function migrateToCustomProvider(tenantId: string) {
  console.log('🔄 Starting commerce provider migration...')

  // Step 1: Export products from Shopify
  const shopify = createShopifyProvider(await getTenantShopifyConfig(tenantId))
  const products = await exportAllProducts(shopify)
  console.log(`📦 Exported ${products.length} products from Shopify`)

  // Step 2: Create local product records
  await withTenant(tenantId, async () => {
    for (const product of products) {
      await importProduct(product)
    }
  })
  console.log('✅ Products imported to local database')

  // Step 3: Export customers
  const customers = await exportAllCustomers(shopify)
  await withTenant(tenantId, async () => {
    for (const customer of customers) {
      await importCustomer(customer)
    }
  })
  console.log(`👥 Imported ${customers.length} customers`)

  // Step 4: Configure Stripe
  console.log('⚙️ Configure Stripe settings in admin UI')

  // Step 5: Update feature flag
  await updateFlagOverride('commerce.provider', tenantId, 'custom')
  console.log('🎉 Migration complete! Provider switched to custom.')
}
```

---

## Webhook Handling

Both providers receive webhooks through a unified handler:

```typescript
// apps/storefront/src/app/api/webhooks/commerce/route.ts
import { getCommerceProvider } from '@cgk/commerce'

export async function POST(req: Request) {
  const tenantId = req.headers.get('x-tenant-id')
  if (!tenantId) {
    return new Response('Missing tenant', { status: 400 })
  }

  const provider = await getCommerceProvider(tenantId)

  // Verify webhook signature (provider-specific)
  const isValid = await provider.webhooks.verify(req)
  if (!isValid) {
    return new Response('Invalid signature', { status: 401 })
  }

  // Process event
  const event = await req.json()
  await provider.webhooks.process(event)

  return new Response('OK')
}
```

---

## Testing Strategy

### Provider Tests

```typescript
// packages/commerce/src/__tests__/providers.test.ts
import { describe, it, expect } from 'vitest'
import { createShopifyProvider } from '../providers/shopify'
import { createCustomProvider } from '../providers/custom'

describe('Commerce Provider Interface', () => {
  const providers = [
    { name: 'shopify', create: () => createShopifyProvider(mockShopifyConfig) },
    { name: 'custom', create: () => createCustomProvider(mockCustomConfig) },
  ]

  providers.forEach(({ name, create }) => {
    describe(`${name} provider`, () => {
      it('implements all required operations', async () => {
        const provider = create()

        expect(provider.products).toBeDefined()
        expect(provider.cart).toBeDefined()
        expect(provider.checkout).toBeDefined()
        expect(provider.orders).toBeDefined()
        expect(provider.customers).toBeDefined()
        expect(provider.discounts).toBeDefined()
        expect(provider.webhooks).toBeDefined()
      })

      it('returns consistent product shape', async () => {
        const provider = create()
        const product = await provider.products.getByHandle('test-product')

        expect(product).toMatchObject({
          id: expect.any(String),
          handle: expect.any(String),
          title: expect.any(String),
          variants: expect.any(Array),
        })
      })
    })
  })
})
```

---

## Success Criteria

- [ ] Commerce provider interface fully defined
- [ ] Shopify provider implements all operations
- [ ] Custom provider implements all operations
- [ ] Feature flag controls provider selection
- [ ] Storefront components work with both providers
- [ ] Admin UI for provider configuration
- [ ] Webhook handling for both providers
- [ ] Migration tool for Shopify → Custom
- [ ] E2E tests for both checkout flows
- [ ] Documentation for provider switching

---

## Dependencies

- Phase 1: Database, Auth, Core packages
- Phase 2B: Feature flags system
- Stripe account for custom provider
- Shopify store for Shopify provider

---

## Implementation Timeline

| Task | Phase | Effort |
|------|-------|--------|
| Commerce provider interface | Phase 1 | 2 days |
| Shopify provider (full) | Phase 3 | 1 week |
| Custom provider (basic) | Phase 3 | 3 days |
| Custom provider (checkout) | Future | 1 week |
| Admin configuration UI | Phase 3 | 2 days |
| Migration tooling | Future | 2 days |

**Note**: Full custom checkout implementation is deferred. The interface and piping are established in Phase 1/3, with custom provider fully buildable later.
