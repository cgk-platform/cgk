# Bundle Builder Full Audit — v3 (Post-Fix)

You are auditing the **Bundle Builder** system in the CGK Platform monorepo at `~/Documents/cgk-platform/`. This system was recently overhauled (deployed as `cgk-platform-2-7`). Your job is to do a thorough audit across all layers: security, logic correctness, type safety, Shopify Function compliance, and integration consistency.

## What Changed (context for the auditor)

A deep audit found and fixed 10 issues across 3 phases:
- **Phase 1 (Security)**: Auth added to all 7 bundle API endpoints, XSS fix in notification rendering, input validation on create/update, pagination bounds
- **Phase 2 (Logic)**: Fixed discount multiplication bug in Rust (now proportional distribution), cart transform percentage capped at 100%, free gift race condition fix
- **Phase 3 (Quality)**: Tier label support in admin form, dead GraphQL fields removed, runtime validation in parseBundleConfig

## Files to Audit

### Admin API Routes
1. `apps/admin/src/app/api/admin/bundles/route.ts` — GET (list) + POST (create)
2. `apps/admin/src/app/api/admin/bundles/[id]/route.ts` — GET + PATCH + DELETE
3. `apps/admin/src/app/api/admin/bundles/[id]/orders/route.ts` — GET + POST (dual auth: Bearer for webhooks, session for UI)

### Admin Types & Validation
4. `apps/admin/src/lib/bundles/types.ts` — TypeScript interfaces
5. `apps/admin/src/lib/bundles/validation.ts` — Create/update validation logic

### Admin Frontend
6. `apps/admin/src/app/admin/commerce/bundles/page.tsx` — Bundle list page
7. `apps/admin/src/app/admin/commerce/bundles/[id]/page.tsx` — Bundle detail page
8. `apps/admin/src/app/admin/commerce/bundles/bundle-status-filter.tsx` — Status filter component

### Shopify Functions (Rust/WASM)
9. `apps/shopify-app/extensions/bundle-order-discount/src/cart_lines_discounts_generate_run.rs` — Order discount function
10. `apps/shopify-app/extensions/bundle-order-discount/src/cart_lines_discounts_generate_run.graphql` — Input query
11. `apps/shopify-app/extensions/bundle-order-discount/shopify.extension.toml` — Extension config
12. `apps/shopify-app/extensions/bundle-cart-transform/src/run.rs` — Cart transform function
13. `apps/shopify-app/extensions/bundle-cart-transform/src/run.graphql` — Input query
14. `apps/shopify-app/extensions/bundle-cart-transform/shopify.extension.toml` — Extension config

### Shopify App (Remix)
15. `apps/shopify-app/app/lib/bundle-config.server.ts` — Server-side bundle config helpers
16. `apps/shopify-app/app/routes/app.bundles.$id.tsx` — Bundle editor UI

### Theme Extension (Vanilla JS)
17. `apps/shopify-app/extensions/bundle-builder/assets/bundle-builder.js` — Storefront bundle builder

### Test Fixtures
18. `apps/shopify-app/extensions/bundle-order-discount/tests/` — All JSON fixtures
19. `apps/shopify-app/extensions/bundle-cart-transform/tests/` — All JSON fixtures

### Design Doc
20. `apps/shopify-app/MULTI-TENANT-DESIGN.md` — Multi-tenant evolution plan

---

## Audit Checklist

### A. Security Audit

- [ ] **Auth on every endpoint**: All 7 handlers (3 files) must call `requireAuth()` + `checkPermissionOrRespond()`. Verify the signature is `checkPermissionOrRespond(userId, tenantId, permission)` — exactly 3 args.
- [ ] **Dual auth on orders POST**: Must accept both Bearer token (Shopify webhook) and session auth. Bearer must use `crypto.timingSafeEqual` with length pre-check.
- [ ] **Permissions**: GET uses `products.view`, POST/PATCH/DELETE use `products.sync`. Verify these exist in `packages/auth/src/permissions/definitions.ts`.
- [ ] **Tenant isolation**: Every DB query must run inside `withTenant(tenantSlug, ...)`. No raw `sql` calls outside tenant context.
- [ ] **XSS in bundle-builder.js**: `showTierNotification` must NOT use `innerHTML`. Should use `document.createElement` + `textContent`/`createTextNode`.
- [ ] **Input validation**: POST and PATCH must call `validateCreateBundle`/`validateUpdateBundle` and return 422 on failure.
- [ ] **Pagination bounds**: `limit` clamped to [1, 500], `offset` >= 0. No unbounded queries.
- [ ] **No SQL injection vectors**: All values passed through `sql` template tag (parameterized), never string concatenation.

### B. Rust / Shopify Functions Audit

- [ ] **Fixed discount distribution**: In `cart_lines_discounts_generate_run.rs`, fixed discounts must be distributed proportionally across qualifying lines (by `line_subtotal / bundle_subtotal`), NOT applied to every line independently. Last line must absorb rounding remainder.
- [ ] **Fixed discount capped at bundle subtotal**: `total_discount = total_discount.min(bundle_subtotal)`.
- [ ] **Percentage cap at 100%**: In `run.rs` (cart transform), percentage must be capped: `if pct > 100.0 { 100.0 } else { pct }`.
- [ ] **Free gift handling**: Lines with `_bundle_free_gift = "true"` get 100% discount, excluded from tier matching count.
- [ ] **Tier matching logic**: Filter tiers where `count >= qualifying_items`, pick the one with the highest `count`. Verify edge cases: no matching tier returns no discount.
- [ ] **Cart transform merge**: Only merges when 2+ lines share the same `_bundle_id`. Single-line bundles should not merge.
- [ ] **Test coverage**: Run `cargo test` in both extensions. All tests must pass. Check that test fixtures match the expected behavior.

**USE THE SHOPIFY DEV MCP TOOLS for GraphQL validation:**
- Use `mcp__shopify-dev-mcp__validate_graphql_codeblocks` to validate both `.graphql` files against Shopify's Function schemas
- Use `mcp__shopify-dev-mcp__introspect_graphql_schema` with `functions_product_discounts` and `functions_cart_transform` to check field availability
- Use `mcp__shopify-dev-mcp__learn_shopify_api` to verify Cart Transform and Product Discount Function APIs are used correctly
- Flag any `discount` vs `discountNode` discrepancies — this was flagged in a prior session as a potential API version mismatch

### C. Logic & Math Audit

- [ ] **Tier matching consistency**: Admin validation (`validation.ts`) requires tier counts >= 1 and unique. Verify Rust code handles duplicate counts gracefully (shouldn't happen if validation works, but defense in depth).
- [ ] **Discount type consistency**: `discountType` in admin types vs `discount_type` in API input vs `_bundle_discount_type` cart attribute. Verify the mapping chain is correct end-to-end.
- [ ] **Price in cents**: Admin types use `price: number // cents`. Verify Rust code also works in cents (Shopify Functions use decimal strings for amounts). Check for unit mismatch.
- [ ] **Rounding in proportional distribution**: Verify no penny is lost. Sum of allocated amounts must equal total_discount exactly.
- [ ] **Empty bundle edge case**: What happens when a bundle has 0 qualifying items? Should return no discount.
- [ ] **Single-tier bundle**: Bundle with exactly 1 tier — verify it works correctly in both Rust functions.

### D. Type Safety & Validation Alignment

- [ ] **BundleTier.label**: Must be `label?: string` (optional) in types.ts. Must be handled in validation.ts. Must pass through to Shopify config.
- [ ] **Color validation regex**: `HEX_COLOR_RE` should match `#fff` and `#ffffff`. `RGB_COLOR_RE` should match `rgb(0, 0, 0)` but reject `rgb(999, 999, 999)` — check if the regex actually validates ranges or just format.
- [ ] **parseBundleConfig runtime validation**: In `bundle-config.server.ts`, verify the parser doesn't just cast `as BundleDiscountConfig` but actually checks types at runtime.
- [ ] **Form → API → DB → Shopify chain**: Trace a bundle creation from the admin form through the API, into the DB, and out to Shopify metafield. Verify no fields are dropped or misnamed.

### E. Integration Consistency

- [ ] **Admin ↔ Shopify sync**: When a bundle is created/updated in admin, does the Shopify discount get created/updated? Check `app.bundles.$id.tsx` action handler.
- [ ] **Webhook → Admin**: When a Shopify order comes in for a bundle, does the webhook correctly call the orders API? Check the Bearer token flow.
- [ ] **Cart attributes → Functions**: Verify the cart line attributes (`_bundle_id`, `_bundle_name`, `_bundle_discount`, `_bundle_discount_type`, `_bundle_free_gift`) are set by `bundle-builder.js` and read by both Rust functions.
- [ ] **Multi-tenant considerations**: Current app uses `CGK_TENANT_SLUG` env var (hardcoded). Document any places where this assumption is baked in. Reference `MULTI-TENANT-DESIGN.md` for the planned migration.

### F. Dead Code & Cleanup

- [ ] **No dead GraphQL fields**: `amountPerQuantity { amount }` should be removed from order discount GraphQL. `cartTransform { metafield }` should be removed from cart transform GraphQL.
- [ ] **No stale test fixture data**: Test fixtures should not contain `cartTransform` blocks or other dead data.
- [ ] **No unused imports**: Check all modified files for unused imports.

### G. Shopify Theme Extension (JS) Audit

- [ ] **No innerHTML usage anywhere**: Search the entire `bundle-builder.js` for `innerHTML` — should be zero occurrences.
- [ ] **Free gift race condition**: `manageFreeGifts` must use a single promise chain with `freeGiftPending` guard released ONLY in terminal `.then()`/`.catch()`. No intermediate guard releases.
- [ ] **Cart API error handling**: All `fetch()` calls to Shopify Cart API should handle network errors and non-2xx responses.
- [ ] **No hardcoded URLs**: Bundle builder should work on any Shopify store domain, not just a specific one.

---

## How to Report Findings

For each finding, report:
1. **Severity**: CRITICAL / HIGH / MEDIUM / LOW / INFO
2. **File**: Full path + line number
3. **Issue**: What's wrong
4. **Evidence**: Code snippet or test result
5. **Fix**: Recommended fix (code if possible)

Group findings by section (A-G). At the end, provide a summary with:
- Total findings by severity
- Overall assessment (PASS / PASS WITH NOTES / FAIL)
- Any items that need immediate attention before next deploy

---

## Running Tests

```bash
# Rust tests (both extensions)
cd apps/shopify-app/extensions/bundle-order-discount && cargo test
cd apps/shopify-app/extensions/bundle-cart-transform && cargo test

# TypeScript type check
cd ~/Documents/cgk-platform && pnpm turbo typecheck

# Check for any remaining TS errors in admin
cd apps/admin && npx tsc --noEmit
```

---

## Key Auth Pattern Reference

The correct auth pattern (from `packages/auth`):

```typescript
import { requireAuth, checkPermissionOrRespond, type AuthContext } from '@cgk-platform/auth'

let auth: AuthContext
try {
  auth = await requireAuth(request)
} catch {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
// checkPermissionOrRespond takes EXACTLY 3 args: userId, tenantId, permission
const denied = await checkPermissionOrRespond(auth.userId, tenantId, 'products.view')
if (denied) return denied
```
