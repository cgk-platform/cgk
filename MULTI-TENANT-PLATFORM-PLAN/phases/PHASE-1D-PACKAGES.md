# PHASE-1D: Shared Packages & Testing

> **STATUS**: ✅ COMPLETE (2026-02-13)

**Duration**: 1 week (Week 4)
**Depends On**: PHASE-1A (monorepo), PHASE-1B (db package), PHASE-1C (auth package)
**Parallel With**: None
**Blocks**: PHASE-2A (admin needs UI), PHASE-3A (storefront needs commerce)
**Status**: ✅ COMPLETE (2026-02-11)

---

## Goal

Build out the shared packages with real implementations: UI component library, Shopify API clients, Commerce Provider abstraction layer, and establish the testing infrastructure with vitest.

---

## Success Criteria

- [x] UI package exports core components (Button, Card, Input, etc.)
- [x] Shopify package connects to Admin and Storefront APIs
- [x] Commerce Provider abstraction defines all interfaces
- [x] Shopify provider implements Commerce Provider interface
- [x] Vitest configured and running for all packages
- [x] All packages have >80% test coverage on core functions

---

## Deliverables

### UI Package (`packages/ui`)
- Core components: Button, Card, Input, Label, Select, Textarea
- Layout components: Container, Grid, Stack
- Feedback components: Alert, Badge, Spinner, Toast
- Utility: `cn()` classname merge function
- All components use Tailwind CSS with CVA variants

### Shopify Package (`packages/shopify`)
- `createShopifyAdminClient(credentials)` - Admin API client
- `createShopifyStorefrontClient(credentials)` - Storefront API client
- Common GraphQL queries: products, orders, customers
- Type definitions for Shopify responses

### Commerce Package (`packages/commerce`)
- `CommerceProvider` interface with all operations
- `createCommerceProvider(tenantId, config)` factory function
- Shopify provider implementation
- Placeholder for Custom provider (future)
- Operation interfaces: Products, Cart, Checkout, Orders, Customers, Discounts

### Testing Infrastructure
- `vitest.config.ts` at workspace root
- Per-package test configuration
- Test utilities and fixtures
- CI integration for test runs

---

## Constraints

- UI components MUST be unstyled/headless OR use Tailwind only (no CSS-in-JS)
- MUST use `class-variance-authority` (cva) for component variants
- Shopify API version MUST be 2024-01 or later
- Commerce Provider MUST support feature flag for provider switching
- All packages MUST have TypeScript strict mode enabled
- Tests MUST run in Node environment (not jsdom) unless testing React

---

## Pattern References

**Skills to invoke:**
- Context7 MCP: "class-variance-authority component" - for CVA patterns
- Shopify Dev MCP: Admin API and Storefront API queries

**MCPs to consult:**
- Shopify Dev MCP: Use for all Shopify GraphQL queries
- Context7 MCP: Search "vitest monorepo configuration"

**RAWDOG code to reference:**
- `/src/components/ui/` - Existing UI component patterns
- `/src/lib/shopify/` - Current Shopify client implementation
- `/docs/MULTI-TENANT-PLATFORM-PLAN/COMMERCE-PROVIDER-SPEC-2025-02-10.md` - Full Commerce Provider spec

**Spec documents:**
- `COMMERCE-PROVIDER-SPEC-2025-02-10.md` - Complete interface definitions

---

## AI Discretion Areas

The implementing agent should determine the best approach for:
1. Which UI components to prioritize (start with most-used)
2. Radix UI primitives vs fully custom components
3. Shopify API error handling strategy
4. Commerce Provider caching layer design
5. Test mocking strategy for external APIs
6. Whether to use React Testing Library or just unit tests

---

## Tasks

### [PARALLEL] UI Package - Core Components
- [x] Implement `Button` with variants (default, outline, ghost, destructive)
- [x] Implement `Card` with CardHeader, CardContent, CardFooter
- [x] Implement `Input` with label and error states
- [x] Implement `Label` component
- [x] Implement `Select` with options
- [x] Implement `Textarea` component

### [PARALLEL] UI Package - Supporting
- [x] Implement `cn()` utility (clsx + tailwind-merge)
- [x] Implement `Alert` with variants (info, success, warning, error)
- [x] Implement `Badge` with variants
- [x] Implement `Spinner` loading indicator
- [x] Export all from `packages/ui/src/index.ts`

### [PARALLEL] Shopify Package
- [x] Implement `createShopifyAdminClient()` with GraphQL fetch
- [x] Implement `createShopifyStorefrontClient()` with GraphQL fetch
- [x] Add products query (list, single)
- [x] Add orders query (list, single)
- [x] Add customers query (list, single)
- [x] Define TypeScript types for all responses

### [PARALLEL] Commerce Package - Interfaces
- [x] Define `CommerceProvider` main interface
- [x] Define `ProductOperations` interface
- [x] Define `CartOperations` interface
- [x] Define `CheckoutOperations` interface
- [x] Define `OrderOperations` interface
- [x] Define `CustomerOperations` interface
- [x] Define `DiscountOperations` interface
- [x] Define `WebhookHandler` interface

### [SEQUENTIAL after Interfaces] Commerce Package - Shopify Provider
- [x] Implement `createShopifyProvider()` factory
- [x] Implement Shopify ProductOperations
- [x] Implement Shopify CartOperations (Storefront API)
- [x] Implement Shopify CheckoutOperations
- [x] Implement Shopify OrderOperations (Admin API)
- [x] Export `createCommerceProvider()` factory

### [PARALLEL] Testing Infrastructure
- [x] Create `vitest.config.ts` at workspace root
- [x] Configure test scripts in root `package.json`
- [x] Create test utilities (`packages/test-utils/`)
- [x] Add vitest to all packages

### [SEQUENTIAL after Testing Infra] Package Tests
- [x] Write UI component tests (render, interaction)
- [x] Write Shopify client tests (mocked API calls)
- [x] Write Commerce Provider tests (interface compliance)
- [x] Write db package tenant isolation tests (existed from Phase 1B)
- [x] Write auth package JWT and session tests (existed from Phase 1C)

---

## Commerce Provider Interface Overview

```typescript
interface CommerceProvider {
  readonly name: 'shopify' | 'custom'

  products: {
    list(params: ListParams): Promise<Product[]>
    get(id: string): Promise<Product>
    search(query: string): Promise<Product[]>
  }

  cart: {
    create(): Promise<Cart>
    get(id: string): Promise<Cart>
    addItem(cartId: string, item: CartItem): Promise<Cart>
    updateItem(cartId: string, itemId: string, quantity: number): Promise<Cart>
    removeItem(cartId: string, itemId: string): Promise<Cart>
    setAttributes(cartId: string, attributes: CartAttribute[]): Promise<Cart>
  }

  checkout: {
    create(cartId: string): Promise<Checkout>
    getUrl(checkoutId: string): Promise<string>
    applyDiscount(checkoutId: string, code: string): Promise<Checkout>
  }

  orders: {
    list(params: ListParams): Promise<Order[]>
    get(id: string): Promise<Order>
    cancel(id: string, reason?: string): Promise<Order>
    refund(id: string, amount: number): Promise<Order>
  }

  customers: {
    list(params: ListParams): Promise<Customer[]>
    get(id: string): Promise<Customer>
    getOrders(customerId: string): Promise<Order[]>
  }

  discounts: {
    validate(code: string): Promise<Discount | null>
    getActive(): Promise<Discount[]>
  }

  webhooks: {
    handleOrderCreated(payload: unknown): Promise<void>
    handleOrderUpdated(payload: unknown): Promise<void>
    handleRefund(payload: unknown): Promise<void>
  }
}
```

---

## UI Component Structure

```typescript
// Example: Button with CVA
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from './utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground',
        outline: 'border border-input bg-background hover:bg-accent',
        secondary: 'bg-secondary text-secondary-foreground',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  )
)
```

---

## Definition of Done

- [x] UI package exports all core components
- [x] Shopify package connects to Admin and Storefront APIs
- [x] Commerce Provider abstraction fully defined
- [x] Shopify provider implements Commerce interface
- [x] Vitest runs on all packages via `pnpm turbo test`
- [x] All packages have passing tests
- [x] `npx tsc --noEmit` passes for all packages
- [ ] CI runs tests on every PR (GitHub Actions - deferred to infrastructure task)
