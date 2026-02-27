# Bundle Builder Theme App Extension — Audit Plan

## Summary

Thorough audit of all 5 files in `apps/shopify-app/extensions/bundle-builder/`. Found **5 critical**, **9 major**, and **14 minor** issues across schema validation, Liquid correctness, JS compatibility, CSS scoping, accessibility, performance, and edge cases.

---

## CRITICAL Issues (will break functionality or fail deployment)

### C1. Missing Shopify Theme Editor Re-initialization Events (JS)
**File:** `assets/bundle-builder.js` (lines 490-494)
**Problem:** The JS only initializes on `DOMContentLoaded`. When a merchant edits settings in the Shopify theme editor, Shopify re-renders the Liquid block but doesn't trigger `DOMContentLoaded`. The JS never re-initializes, so live preview in the theme editor is completely broken — settings changes appear to do nothing until a full page refresh.
**Fix:** Add event listeners for Shopify's section rendering lifecycle events at the bottom of the IIFE:
```js
document.addEventListener('shopify:section:load', init);
document.addEventListener('shopify:section:select', init);
document.addEventListener('shopify:block:select', function(e) {
  // Scroll to the selected block if it's a bundle builder
  var target = e.target.querySelector('[data-bundle-builder]');
  if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
});
```
Also: on `shopify:section:load`, clear `_bbInstance` from old elements before re-init (the old DOM is replaced, so this happens naturally).

### C2. Accent Color Derivations Are Hardcoded — Ignore Merchant Color Choices (CSS)
**File:** `assets/bundle-builder.css` (lines 8-12)
**Problem:** The CSS custom properties `--bb-accent-light`, `--bb-accent-hover`, `--bb-accent-muted`, `--bb-text-muted`, `--bb-text-faded`, `--bb-text-hint` use hardcoded `rgba(37, 99, 235, ...)` and `rgba(26, 26, 46, ...)` values. When a merchant changes the accent or text color in settings, these derivative colors remain blue/navy. The tier badge, quantity button hovers, tier progress background, and muted text will all look wrong with non-default colors.
**Fix:** Use CSS `color-mix()` (supported in all browsers since 2023):
```css
--bb-accent-light: color-mix(in srgb, var(--bb-accent) 12%, transparent);
--bb-accent-hover: color-mix(in srgb, var(--bb-accent) 40%, transparent);
--bb-accent-muted: color-mix(in srgb, var(--bb-accent) 20%, transparent);
--bb-text-muted: color-mix(in srgb, var(--bb-text) 65%, transparent);
--bb-text-faded: color-mix(in srgb, var(--bb-text) 50%, transparent);
--bb-text-hint: color-mix(in srgb, var(--bb-text) 60%, transparent);
```

### C3. Tier Label JSON Encoding Uses HTML Escape Instead of JSON Escape (Liquid)
**File:** `blocks/bundle-builder.liquid` (lines 30, 35, 40, 45)
**Problem:** Tier labels use `| escape` (HTML encoding) inside a JSON string. If a merchant enters a label like `Best "Deal" Ever`, `escape` produces `Best &quot;Deal&quot; Ever`. After the outer `| escape` on the `data-tiers` attribute and the browser's HTML attribute decoding, `JSON.parse()` receives `&quot;` as literal text. The tier label displays with HTML entities instead of actual characters.
**Fix:** Use `| json` filter (available in Shopify Liquid) which properly JSON-encodes strings:
```liquid
{"count":2,"discount":{{ block.settings.discount_2_items }},"label":{{ block.settings.tier_2_label | default: 'Starter Bundle' | json }}}
```
The `| json` filter outputs a quoted, properly escaped JSON string (e.g., `"Best \"Deal\" Ever"`), so remove the wrapping `"` around the label value in the template.

### C4. Fixed Discount Range Max=100 Means Max $1.00 Discount (Schema)
**File:** `blocks/bundle-builder.liquid` (schema, lines 249-256 and similar)
**Problem:** All discount range settings have `"max": 100`. When `discount_type` is "fixed" (cents), max 100 = $1.00 discount. The `"unit": "%"` label is also misleading for fixed mode. Merchants using fixed-amount discounts can't set discounts above $1.00.
**Fix:** Since Shopify doesn't support conditional range settings, add a separate set of range controls for fixed-amount discounts with appropriate max (e.g., 5000 = $50.00) and `"unit": "¢"`. Use a pattern where the JS checks `discount_type` and reads from the appropriate setting. Alternatively, change from `range` to `number` type for discount values (which has no max constraint) and document the cents format. Simplest fix: change `"max"` to `5000` and remove the `"unit": "%"` (since it's not always percentage), adding info text instead.

### C5. Null Check Missing on CTA Button in addToCart (JS)
**File:** `assets/bundle-builder.js` (lines 395-396)
**Problem:** `addToCart()` directly accesses `this.els.cta.disabled` and `this.els.cta.classList` without null-checking `this.els.cta`. If the CTA element is missing from DOM (e.g., theme customizer interference), this throws an uncaught TypeError that breaks the entire bundle builder.
**Fix:** Add guard at top of `addToCart`:
```js
if (this.isLoading || this.selectedProducts.size === 0) return;
if (!this.els.cta) return;
if (this.getTotalItems() < this.minItems) return;
```

---

## MAJOR Issues (degraded UX, accessibility gaps, or incorrect behavior)

### M1. Bundle ID Uses section.id — Collides When Multiple Blocks in Same Section (JS/Liquid)
**File:** `bundle-builder.liquid` line 73, `bundle-builder.js` line 19
**Problem:** `data-section-id="{{ section.id }}"` is used as the `bundleId` for cart line item properties (`_bundle_id`). If a merchant adds two bundle builder blocks within the same section (possible in theme editor), both bundles write the same `_bundle_id` to cart items, making them indistinguishable in order processing.
**Fix:** Use `block.id` instead of `section.id` for the bundle identifier:
- Liquid: change `data-bundle-id="{{ section.id }}"` or add a new attribute `data-bundle-id="{{ block.id }}"`
- JS: read `this.bundleId = section.dataset.blockId || section.dataset.sectionId || 'bundle';`

### M2. No `srcset` for Responsive Images (Snippet/Performance)
**File:** `snippets/bundle-product-card.liquid` (lines 31-37)
**Problem:** Images are loaded at a fixed 400px width. On high-DPI (Retina) displays, 400px images look blurry in a card that may display at 300-400 CSS pixels (needs 600-800px for 2x). On mobile, 400px may be larger than needed, wasting bandwidth.
**Fix:** Add `srcset` with multiple sizes:
```liquid
<img
  src="{{ product.featured_image | image_url: width: 400 }}"
  srcset="{{ product.featured_image | image_url: width: 200 }} 200w,
          {{ product.featured_image | image_url: width: 400 }} 400w,
          {{ product.featured_image | image_url: width: 600 }} 600w,
          {{ product.featured_image | image_url: width: 800 }} 800w"
  sizes="(max-width: 639px) 50vw, 33vw"
  ...
>
```

### M3. `formatMoney` Fallback Hardcodes `$` — Breaks Non-USD Stores (JS)
**File:** `assets/bundle-builder.js` (lines 382-388)
**Problem:** When `Shopify.formatMoney` is unavailable (many themes don't provide it), the fallback hardcodes `$` as currency symbol. Stores using EUR, GBP, JPY, etc. show incorrect currency.
**Fix:** Read the money format from Shopify's global if available:
```js
formatMoney(cents) {
  if (typeof Shopify !== 'undefined' && Shopify.formatMoney) {
    return Shopify.formatMoney(cents);
  }
  var moneyFormat = (typeof Shopify !== 'undefined' && Shopify.currency && Shopify.currency.active)
    ? Shopify.currency.active
    : 'USD';
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: moneyFormat,
    }).format(cents / 100);
  } catch (_e) {
    return '$' + (cents / 100).toFixed(2);
  }
}
```
Or pass the shop's `money_format` from Liquid via a data attribute.

### M4. No Maximum Items Reached Feedback (JS/Liquid)
**File:** `assets/bundle-builder.js` (lines 111-112)
**Problem:** When the user reaches `maxItems`, clicking more products silently does nothing. No visual indication that the maximum has been reached. User may think the UI is broken.
**Fix:** Show a notification or update the CTA text when max items is reached. Add a visual state to the cards:
```js
// In recalculate(), after updating cards:
if (totalItems >= this.maxItems) {
  this.section.classList.add('bb-container--max-reached');
} else {
  this.section.classList.remove('bb-container--max-reached');
}
```
And add CSS for unselected cards when max is reached:
```css
.bb-container--max-reached .bb-card:not(.bb-card--selected):not(.bb-card--sold-out) {
  opacity: 0.5;
  cursor: not-allowed;
}
```

### M5. Missing ARIA `role="progressbar"` on Tier Progress Bar (Accessibility)
**File:** `blocks/bundle-builder.liquid` (lines 125-127)
**Problem:** The tier progress bar is purely visual. Screen reader users have no way to know the progress toward the next tier.
**Fix:** Add ARIA progressbar attributes:
```liquid
<div class="bb-tier__bar" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" aria-label="Discount tier progress">
  <div class="bb-tier__fill"></div>
</div>
```
And update the JS `updateTierProgress` to set `aria-valuenow`:
```js
var barEl = this.els.tierSection.querySelector('[role="progressbar"]');
if (barEl) barEl.setAttribute('aria-valuenow', Math.round(progress));
```

### M6. No `box-sizing: border-box` Reset (CSS)
**File:** `assets/bundle-builder.css`
**Problem:** The styles don't set `box-sizing: border-box` on bundle builder elements. If a theme uses `content-box` (default CSS), all padding calculations will cause layout overflow (e.g., `.bb-cta` has `width: 100%` + `padding: 16px 24px` = wider than container).
**Fix:** Add a scoped reset at the top of the CSS:
```css
.bb-container,
.bb-container *,
.bb-container *::before,
.bb-container *::after {
  box-sizing: border-box;
}
```

### M7. Notification z-index:9999 Conflicts with Theme Chrome (CSS)
**File:** `assets/bundle-builder.css` (line 318)
**Problem:** `z-index: 9999` on `.bb-notification` can cover theme sticky headers, cookie banners, cart drawers, and other critical UI. Some themes use z-index up to 100000.
**Fix:** Lower to a reasonable value (e.g., `1000`) or, better, change the notification from `position: fixed` to `position: sticky` or place it inline within the bundle builder container. For a non-fixed approach:
```css
.bb-notification {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%) translateY(-100%);
  /* remove z-index: 9999 */
  z-index: 10;
}
```
This anchors the notification to the `.bb-container` (which has `position: relative`).

### M8. Script Loaded with Blocking `script_tag` (Performance)
**File:** `blocks/bundle-builder.liquid` (line 162)
**Problem:** `{{ 'bundle-builder.js' | asset_url | script_tag }}` produces a synchronous `<script>` tag that blocks rendering. Although it's at the bottom of the block, it can still delay subsequent block rendering on the page.
**Fix:** Use `defer` for non-blocking load:
```liquid
<script src="{{ 'bundle-builder.js' | asset_url }}" defer></script>
```
The `defer` attribute ensures the script runs after HTML parsing but before `DOMContentLoaded`, which is compatible with the existing init logic.

### M9. Hardcoded Colors Won't Work in Dark Themes (CSS)
**File:** `assets/bundle-builder.css` (multiple lines)
**Problem:** Several colors are hardcoded rather than using custom properties: `#f5f5f5` (image placeholder bg, line 127), `#ccc` (placeholder icon, line 147), `#e5e7eb` (border, line 13), `#fff` (sold-out badge text, CTA text, checkmark, spinner, lines 170/182/430/465-466), `#999` (compare-at price, line 228). These look wrong if the theme uses dark backgrounds or if the merchant sets a dark `bg_color`.
**Fix:** Derive these from the merchant's color settings:
```css
--bb-border: color-mix(in srgb, var(--bb-text) 15%, transparent);
--bb-card-bg-placeholder: color-mix(in srgb, var(--bb-text) 5%, var(--bb-bg));
/* For contrast text on accent (CTA button text), compute or add a setting */
```
Add a new schema setting for "Button text color" (default white) to handle dark/light accent colors.

---

## MINOR Issues (polish, best practices, small improvements)

### m1. `image_ratio` Not Reflected in `width`/`height` Attributes (Snippet)
**File:** `snippets/bundle-product-card.liquid` (lines 34-35)
**Problem:** `width="400" height="400"` is always square, even when `aspect_css` is `3/4` (portrait) or `4/3` (landscape). While `object-fit: cover` handles visual display, these intrinsic size hints don't match the actual display ratio, causing a brief layout reflow on slow connections.
**Fix:** Set height dynamically based on aspect ratio:
```liquid
{%- case card_aspect -%}
  {%- when '3/4' -%}{%- assign img_height = 533 -%}
  {%- when '4/3' -%}{%- assign img_height = 300 -%}
  {%- else -%}{%- assign img_height = 400 -%}
{%- endcase -%}
<img ... width="400" height="{{ img_height }}" ...>
```

### m2. `font-family: inherit` Missing on Interactive Elements (CSS)
**File:** `assets/bundle-builder.css` (`.bb-cta`, `.bb-qty-btn`)
**Problem:** Buttons don't inherit `font-family` by default in many browsers. The CTA and quantity buttons may render in the browser's default serif font instead of the theme's font.
**Fix:** Add to `.bb-cta` and `.bb-qty-btn`:
```css
font-family: inherit;
```

### m3. Notification Race Condition on Rapid Tier Unlocks (JS)
**File:** `assets/bundle-builder.js` (lines 363-380)
**Problem:** If a user rapidly selects items and unlocks two tiers within 3 seconds, the first notification's `setTimeout` fires and removes `bb-notification--visible` while the second notification is showing, causing it to disappear early.
**Fix:** Track and clear the timeout:
```js
// In constructor:
this.notificationTimeout = null;

// In showTierNotification:
if (this.notificationTimeout) clearTimeout(this.notificationTimeout);
// ... show notification ...
this.notificationTimeout = setTimeout(function() { /* hide */ }, 3000);
```

### m4. `_bbInstance` Expando Property on DOM Element (JS)
**File:** `assets/bundle-builder.js` (line 485)
**Problem:** `el._bbInstance` attaches a custom property to a DOM element. This works but is a minor anti-pattern that some linters flag. Could also cause memory leaks if the DOM element is removed but the instance holds references.
**Fix:** Use a `WeakMap` instead:
```js
var instances = new WeakMap();
// ...
if (!instances.has(el)) {
  instances.set(el, new BundleBuilder(el));
}
```

### m5. Tier Active Row `style="display: none"` — Inline Style vs CSS Class (Liquid)
**File:** `blocks/bundle-builder.liquid` (lines 139, 147, 128)
**Problem:** Several elements use `style="display: none;"` for initial hidden state. The JS then sets `style.display = ''` to show and `style.display = 'none'` to hide. This works but mixes concerns — CSS classes are cleaner and easier to debug.
**Fix:** Use a `hidden` attribute or CSS class (like `.bb-hidden { display: none; }`) and toggle with `classList.add/remove`.

### m6. `finally` Block Enables CTA Button During Cart Redirect (JS)
**File:** `assets/bundle-builder.js` (lines 475-478)
**Problem:** When `cartRedirect` is true, after `window.location.href = '/cart'`, the `finally` block runs and sets `this.isLoading = false; this.els.cta.disabled = false;`. During the (possibly slow) redirect, the button becomes clickable again, allowing double-submission.
**Fix:** Skip the `finally` cleanup when redirecting:
```js
if (this.cartRedirect) {
  window.location.href = '/cart';
  return; // finally still runs, but add a flag:
}
```
Better: set a `this.isRedirecting = true` flag and check it in `finally`:
```js
finally {
  if (!this.isRedirecting) {
    this.isLoading = false;
    this.els.cta.disabled = false;
  }
}
```

### m7. `var self` / `var self2` Inconsistency (JS)
**File:** `assets/bundle-builder.js` (lines 461, 471)
**Problem:** `addToCart` uses both `var self` and `var self2` for `this` references in nested functions. This is because `self` is already declared in the `try` block and can't be redeclared in `catch`.
**Fix:** Declare `var self = this;` once at the top of the method (before `try`) and use it in all nested functions.

### m8. Missing `aria-label` on Main Container (Accessibility)
**File:** `blocks/bundle-builder.liquid` (line 70)
**Problem:** The container has no landmark role or label. Screen reader users navigating by regions won't find the bundle builder.
**Fix:** Add `role="region"` and `aria-label`:
```liquid
<div class="bb-container" data-bundle-builder role="region" aria-label="{{ bundle_name }}">
```

### m9. Summary Row for Tier Has No `aria-live` (Accessibility)
**File:** `blocks/bundle-builder.liquid` (lines 134-155)
**Problem:** The summary section updates dynamically but only the notification has `aria-live`. The subtotal, discount, and total values change without announcement.
**Fix:** Add `aria-live="polite"` to the summary container:
```liquid
<div class="bb-summary" aria-live="polite" aria-atomic="false">
```

### m10. `bb-card__image-wrap` Hardcodes `aspect-ratio: 1` in CSS (CSS)
**File:** `assets/bundle-builder.css` (line 124)
**Problem:** The CSS sets `aspect-ratio: 1` on `.bb-card__image-wrap`, which is always overridden by the inline `style="aspect-ratio: ..."` from the snippet. The CSS rule is dead code.
**Fix:** Remove `aspect-ratio: 1` from the CSS rule (the inline style handles it), or keep it as a fallback but document the intent.

### m11. Sold-Out Cards Have `pointer-events: none` — Prevents Tooltip/Hover Info (CSS)
**File:** `assets/bundle-builder.css` (line 114)
**Problem:** `pointer-events: none` on `.bb-card--sold-out` disables ALL mouse interactions, including hovering over the "Sold Out" badge. Users can't inspect the card at all.
**Fix:** Remove `pointer-events: none` and rely on the JS guards (`data-available="false"` checks) to prevent selection. Keep `cursor: not-allowed` for visual feedback.

### m12. No "All Products Sold Out" Empty State (Edge Case)
**File:** `blocks/bundle-builder.liquid` / `assets/bundle-builder.js`
**Problem:** If all 8 configured products are sold out, the grid shows all dimmed cards but no message explaining why nothing can be selected. The CTA stays disabled with no explanation.
**Fix:** In `recalculate()`, check if all cards are sold out and show a message:
```js
var availableCards = this.section.querySelectorAll('.bb-card:not(.bb-card--sold-out)');
if (availableCards.length === 0) {
  this.els.cta.textContent = 'All items currently sold out';
}
```

### m13. Discount Tier Range Settings Show "%" Unit for Both Modes (Schema/UX)
**File:** `blocks/bundle-builder.liquid` (schema, discount range settings)
**Problem:** The `"unit": "%"` label on discount range settings is always shown, even when `discount_type` is "fixed" (cents). Merchants see "10%" when they mean "10 cents". The `info` text on `discount_type` explains this, but it's easy to miss.
**Fix:** Remove `"unit": "%"` from the discount ranges and add descriptive `"info"` text on each: `"Set as percentage (e.g., 10 = 10% off) or cents (e.g., 500 = $5.00 off) depending on discount type above"`.

### m14. Multiple Variants Not Supported (Feature Gap / Edge Case)
**File:** `snippets/bundle-product-card.liquid` (line 7)
**Problem:** Only `product.selected_or_first_available_variant` is used. Products with multiple variants (e.g., size, color) can't have their variants selected. The user gets whichever variant Shopify picks first.
**Fix:** This is a feature gap rather than a bug. For v1, document this limitation. For v2, add variant selectors (dropdowns or swatches) within the card when `product.variants.size > 1`.

---

## Implementation Order

1. **C1** (theme editor events) — Most impactful for merchant experience
2. **C3** (JSON encoding) — Data correctness
3. **C5** (null check) — Crash prevention
4. **C2** (accent colors) — Visual correctness for all merchants
5. **C4** (discount range) — Functional limitation
6. **M6** (box-sizing) — Layout correctness
7. **M1** (bundle ID) — Data correctness
8. **M3** (formatMoney) — International stores
9. **M8** (script defer) — Performance
10. **M2** (srcset) — Image quality
11. **M5** (progressbar ARIA) — Accessibility
12. **M9** (dark theme colors) — Visual
13. **M4** (max items feedback) — UX
14. **M7** (z-index) — Theme compatibility
15. All minor issues in file order
