# Phase 1: Customer Portal API Routes

> **Priority**: P0 - Critical
> **Blocking**: Customer portal is non-functional without these APIs
> **Estimated Time**: 2-3 hours

---

## Problem Statement

The customer portal frontend at `/apps/storefront/src/app/account/` calls API endpoints at `/api/account/*` that do not exist. The frontend code in `/apps/storefront/src/lib/account/api.ts` expects these endpoints.

---

## Files to Create

All files go in: `/Users/holdenthemic/Documents/cgk/apps/storefront/src/app/api/account/`

### 1. Orders API

**`orders/route.ts`**
```typescript
// GET - List customer orders with filters
// Query params: status, page, limit, search
// Returns: { orders: Order[], total: number, hasMore: boolean }
```

**`orders/[id]/route.ts`**
```typescript
// GET - Get single order details
// POST /cancel - Cancel order
// POST /return - Request return
```

### 2. Addresses API

**`addresses/route.ts`**
```typescript
// GET - List customer addresses
// POST - Create new address
```

**`addresses/[id]/route.ts`**
```typescript
// PATCH - Update address
// DELETE - Remove address
// POST /default - Set as default
```

### 3. Profile API

**`profile/route.ts`**
```typescript
// GET - Get customer profile
// PATCH - Update profile (name, email, phone, marketing prefs)
```

### 4. Wishlist API

**`wishlists/route.ts`**
```typescript
// GET - Get wishlist items
// POST - Add item to wishlist
```

**`wishlists/[id]/route.ts`**
```typescript
// DELETE - Remove from wishlist
// POST /share - Generate shareable link
```

### 5. Store Credit API

**`store-credit/route.ts`**
```typescript
// GET - Get balance and transaction history
```

### 6. Features API

**`features/route.ts`**
```typescript
// GET - Get enabled customer portal features for this tenant
// (referrals, rewards, subscriptions, etc.)
```

---

## Implementation Details

### Authentication Pattern

Customer portal uses a different auth flow than admin. Check for customer session:

```typescript
export async function GET(request: Request) {
  const tenantSlug = request.headers.get('x-tenant-slug')
  const customerId = request.headers.get('x-customer-id')

  if (!tenantSlug || !customerId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Query with tenant isolation
  const data = await withTenant(tenantSlug, async () => {
    return sql`SELECT * FROM customers WHERE id = ${customerId}`
  })

  // ...
}
```

### Database Tables to Query

| API | Tables |
|-----|--------|
| Orders | `orders`, `order_line_items`, `order_fulfillments` |
| Addresses | `customer_addresses` |
| Profile | `customers` |
| Wishlist | `wishlists`, `wishlist_items`, `products` |
| Store Credit | `store_credit_transactions` |
| Features | `tenant_features` or `feature_flags` |

### Error Response Format

```typescript
// Success
return NextResponse.json({ data: result })

// Error
return NextResponse.json({ error: 'Message' }, { status: 400 })
```

---

## Reference Files

Look at these existing patterns:
- `/apps/storefront/src/lib/account/api.ts` - What the frontend expects
- `/apps/admin/src/app/api/admin/` - Admin API patterns
- `/apps/creator-portal/src/app/api/creator/` - Creator API patterns

---

## Verification

```bash
cd /Users/holdenthemic/Documents/cgk/apps/storefront
npx tsc --noEmit
```

---

## Completion Checklist

- [x] `orders/route.ts` created with GET
- [x] `orders/[id]/route.ts` created with GET
- [x] `orders/[id]/cancel/route.ts` created with POST
- [x] `orders/[id]/return/route.ts` created with POST
- [x] `orders/[id]/returns/[returnId]/route.ts` created with GET
- [x] `addresses/route.ts` created with GET, POST
- [x] `addresses/[id]/route.ts` created with PATCH, DELETE
- [x] `addresses/[id]/default/route.ts` created with POST
- [x] `profile/route.ts` created with GET, PATCH
- [x] `profile/password-reset/route.ts` created with POST
- [x] `wishlists/route.ts` created with GET, POST
- [x] `wishlists/default/route.ts` created with GET
- [x] `wishlists/[id]/route.ts` created with GET, DELETE
- [x] `wishlists/[id]/items/route.ts` created with POST
- [x] `wishlists/[id]/items/[itemId]/route.ts` created with DELETE
- [x] `wishlists/[id]/items/[itemId]/move-to-cart/route.ts` created with POST
- [x] `wishlists/[id]/share/route.ts` created with POST
- [x] `store-credit/route.ts` created with GET
- [x] `features/route.ts` created with GET
- [x] TypeScript check passes (no errors in /api/account routes)
- [x] All routes use `withTenant()` for DB queries

**Completed**: 2026-02-16 by Claude Opus 4.5
