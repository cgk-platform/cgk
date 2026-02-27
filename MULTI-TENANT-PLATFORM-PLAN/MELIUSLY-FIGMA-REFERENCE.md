# Meliusly Figma Reference - IMMUTABLE

**Purpose:** Complete Figma knowledge base for pixel-perfect Meliusly storefront implementation.

**Figma File:** https://www.figma.com/design/P14Fv87DK7Bj5Zf162DA61/Meliusly?node-id=0-1

**CRITICAL:** This file contains immutable reference data. All Figma node IDs and design tokens are documented here and must be preserved across sessions.

---

## Quick Reference: All Figma Node IDs

### Homepage Sections

| Section | Key | Node ID | Height (px) | Description |
|---------|-----|---------|-------------|-------------|
| Header | `header` | 1:4243 | 700 | Navigation, logo, cart icon |
| Trust Bar | `trustBar` | 1:4244 | 121 | Trust badges (durability, protection, sizing) |
| Product Type | `productType` | 1:4245 | 623 | Product category selector |
| Products | `products` | 1:4246 | 878 | Best sellers grid |
| Shipping | `shipping` | 1:4247 | 82 | Shipping info banner |
| Why Meliusly | `why` | 1:4248 | 525 | USP/value propositions |
| Reviews | `reviews` | 1:4249 | 877 | Customer testimonials carousel |
| About | `about` | 1:4250 | 743 | Brand story section |
| Product Guides | `guides` | 1:4251 | 423 | Educational content links |
| Org | `org` | 1:4252 | 358 | Organizational/company info |
| Traits | `traits` | 1:4253 | 104 | Product traits/features bar |
| Footer | `footer` | 1:4254 | 396 (desktop)<br>1149 (mobile) | Site footer with navigation |

**Full Pages:**
- Homepage Desktop: `1:4242`
- Homepage Mobile: `1:4257`

### Product Detail Page (PDP) Sections

| Section | Key | Node ID | Height (px) | Description |
|---------|-----|---------|-------------|-------------|
| PDP Header | `header` | 1:4128 | 1455 | Gallery, title, price, add to cart |
| Benefits | `benefits` | 1:4129 | 741 | Product benefits grid |
| Features | `features` | 1:4130 | 722 | Product features section |
| Reviews | `reviews` | 1:4131 | 895 | Product reviews section |
| Dimensions | `dimensions` | 1:4132 | 554 | Product measurements |
| How to Install | `install` | 1:4133 | 545 | Installation instructions |
| Video | `video` | 1:4134 | 943 | Product demo video |
| Press | `press` | 1:4135 | 245 | Press mentions and logos |
| FAQ | `faq` | 1:4136 | 610 | FAQ accordion |
| Comparison | `comparison` | 1:4137 | 1066 | Product comparison table |
| Customer Reviews | `customerReviews` | 1:4138 | 1832 | Extended reviews with photos |
| Traits | `traits` | 1:4139 | 104 | Product traits bar |

**Full Pages:**
- PDP Desktop: `1:4127`
- PDP Mobile: `1:4154`

### Collections Page Sections

| Section | Key | Node ID | Height (px) | Description |
|---------|-----|---------|-------------|-------------|
| Nav | `nav` | 1:4175 | 108 | Collection page navigation |
| Band | `band` | 1:4176 | - | Collection hero/header |
| Filters | `filters` | 1:4178 | - | Filter and sort controls |
| Product List | `list` | 1:4182 | - | Product grid listing |

**Full Pages:**
- Collections Desktop: `1:4174`
- Collections Mobile: `1:4206`

### Cart States

| State | Key | Node ID | Dimensions | Description |
|-------|-----|---------|------------|-------------|
| Cart Drawer | `drawer` | 1:4292 | 360x800px | Cart with items (mobile) |
| Cart Empty | `empty` | 1:4290 | 360x800px | Empty cart state |

### How It Works Page

| Variant | Key | Node ID | Description |
|---------|-----|---------|-------------|
| Desktop | `desktop` | 1:4301 | How It Works desktop layout |
| Mobile | `mobile` | 1:4363 | How It Works mobile layout |

---

## Design Tokens

### Colors

```css
/* Primary Colors */
--meliusly-primary: #0268A0;      /* rgb(2, 104, 160) */
--meliusly-dark: #161F2B;         /* rgb(22, 31, 43) */
--meliusly-white: #FFFFFF;

/* Usage in Tailwind */
.text-meliusly-blue    /* Primary color */
.bg-meliusly-blue      /* Primary background */
.text-meliusly-dark    /* Dark text */
.bg-meliusly-dark      /* Dark background */
```

### Typography

```css
/* Font Family */
font-family: 'Manrope', system-ui, sans-serif;

/* Font Weights */
font-weight: 400;  /* Normal */
font-weight: 500;  /* Medium */
font-weight: 600;  /* Semibold */

/* Font Sizes (with line-heights) */
.text-xs   { font-size: 12px; line-height: 16px; }
.text-sm   { font-size: 13px; line-height: 18px; }
.text-base { font-size: 14px; line-height: 20px; }
.text-md   { font-size: 16px; line-height: 24px; }
.text-lg   { font-size: 18px; line-height: 28px; }
.text-xl   { font-size: 24px; line-height: 32px; }
.text-2xl  { font-size: 32px; line-height: 40px; }
.text-3xl  { font-size: 40px; line-height: 48px; }
```

### Breakpoints

```javascript
{
  mobile: '360px',   // Min mobile size
  tablet: '768px',   // Tablet breakpoint
  desktop: '1024px', // Desktop breakpoint
  wide: '1440px',    // Wide desktop (design artboard width)
}
```

### Spacing Rules

**Tolerance:** ±2px

All spacing measurements (margins, padding, gaps) should match Figma within ±2px tolerance. Use browser DevTools to verify exact pixel values.

---

## Figma MCP Tool Usage

### Get Screenshot

```typescript
mcp__figma-desktop__get_screenshot({
  nodeId: "1:4243",  // Section node ID
  clientLanguages: "typescript,javascript",
  clientFrameworks: "react,next.js"
})
```

**Returns:** Visual screenshot of the Figma section for reference.

### Get Design Context

```typescript
mcp__figma-desktop__get_design_context({
  nodeId: "1:4243",  // Section node ID
  artifactType: "COMPONENT_WITHIN_A_WEB_PAGE_OR_APP_SCREEN",
  clientLanguages: "typescript,javascript",
  clientFrameworks: "react,next.js"
})
```

**Returns:** Design context with measurements, colors, typography, and reference code.

### Get Variable Definitions

```typescript
mcp__figma-desktop__get_variable_defs({
  nodeId: "1:4243",  // Section node ID
  clientLanguages: "typescript,javascript",
  clientFrameworks: "react,next.js"
})
```

**Returns:** Figma variables (design tokens) used in the section.

### Get Metadata

```typescript
mcp__figma-desktop__get_metadata({
  nodeId: "1:4243",  // Section node ID
  clientLanguages: "typescript,javascript",
  clientFrameworks: "react,next.js"
})
```

**Returns:** XML structure of the section (node hierarchy, layer types, names).

---

## Pixel-Perfect Implementation Workflow

### Phase 1: Extract Figma Data

**For every section before building:**

1. **Get screenshot** (visual reference):
   ```typescript
   mcp__figma-desktop__get_screenshot({ nodeId: "<node-id>" })
   ```

2. **Get design context** (measurements, colors):
   ```typescript
   mcp__figma-desktop__get_design_context({ nodeId: "<node-id>" })
   ```

3. **Document expected measurements:**
   - Section height (from table above)
   - Typography (sizes, weights, line-heights)
   - Colors (exact hex values)
   - Spacing (margins, padding, gaps)

### Phase 2: Build Component

1. **Invoke `/frontend-design` skill** with Figma screenshot as reference
2. **Build component** matching exact measurements from design context
3. **Use design tokens** from this guide (colors, typography, spacing)
4. **Verify in browser DevTools:**
   - Color picker for exact hex matches
   - Computed styles for spacing (±2px tolerance)
   - Font family, sizes, weights, line-heights

### Phase 3: Validate Implementation

1. **Screenshot live component** at:
   - Desktop: 1440px viewport
   - Mobile: 360px viewport

2. **Invoke `/reviewer` agent** with both screenshots:
   ```
   /Task subagent_type=reviewer "Compare live Meliusly <section> vs Figma screenshot.

   Figma node ID: <node-id>
   Expected height: <height>px

   Check:
   - Typography (Manrope, sizes, weights, line-heights)
   - Colors (#0268A0, #161F2B)
   - Spacing (±2px tolerance)
   - Layout alignment
   - Responsive behavior

   List ALL discrepancies."
   ```

3. **Fix discrepancies:**
   - Typography mismatches
   - Color deviations
   - Spacing errors (use DevTools to measure exactly)
   - Layout issues

4. **Re-validate** until `/reviewer` confirms >95% visual parity

### Phase 4: Page-Level Audit

After all sections on a page are complete:

1. **Screenshot entire page** (desktop + mobile)
2. **Compare to Figma full page screenshots:**
   - Homepage Desktop: `1:4242`
   - Homepage Mobile: `1:4257`
   - PDP Desktop: `1:4127`
   - PDP Mobile: `1:4154`
   - Collections Desktop: `1:4174`
   - Collections Mobile: `1:4206`

3. **Final `/reviewer` validation:**
   - Overall visual parity >98%
   - All sections integrated correctly
   - Responsive behavior exact to Figma mobile/desktop variants
   - No regressions from individual section builds

---

## Section Build Order (Homepage Example)

Build sections in this order for optimal dependencies:

1. **Header** (1:4243) → Used on all pages, build first
2. **Trust Bar** (1:4244) → Simple, below header
3. **Hero Content** (within header) → Main CTA
4. **Product Type** (1:4245) → Category selector
5. **Products** (1:4246) → Best sellers grid (needs Shopify integration)
6. **Shipping** (1:4247) → Simple banner
7. **Why Meliusly** (1:4248) → USP section
8. **Reviews** (1:4249) → Testimonials carousel
9. **About** (1:4250) → Brand story
10. **Product Guides** (1:4251) → Educational links
11. **Org** (1:4252) → Company info
12. **Traits** (1:4253) → Product traits bar
13. **Footer** (1:4254) → Used on all pages, build last

---

## Validation Checklist Template

Use this checklist for EVERY section:

```markdown
### [Section Name] ([Node ID])

**Extract Figma Data:**
- [ ] Screenshot obtained (mcp__figma-desktop__get_screenshot)
- [ ] Design context obtained (mcp__figma-desktop__get_design_context)
- [ ] Expected height documented: [height]px

**Build Component:**
- [ ] /frontend-design skill invoked with Figma reference
- [ ] Component built with exact measurements
- [ ] Design tokens used (colors, typography)
- [ ] Responsive breakpoints implemented (360px, 768px, 1024px, 1440px)

**Verify Typography:**
- [ ] Font family: Manrope (verified in DevTools)
- [ ] Font sizes: [list sizes] (exact match to Figma)
- [ ] Font weights: [list weights] (400, 500, 600)
- [ ] Line heights: [list line-heights] (exact match to Figma)

**Verify Colors:**
- [ ] Primary: #0268A0 (verified with DevTools color picker)
- [ ] Dark: #161F2B (verified with DevTools color picker)
- [ ] All colors exact hex matches (no approximations)

**Verify Spacing:**
- [ ] Margins: [list measurements] (±2px tolerance)
- [ ] Padding: [list measurements] (±2px tolerance)
- [ ] Gaps: [list measurements] (±2px tolerance)
- [ ] Section height: [expected]px (±5px tolerance)

**Verify Layout:**
- [ ] Grid columns match Figma
- [ ] Alignment correct (center/left/right)
- [ ] Responsive layout changes at correct breakpoints
- [ ] Mobile layout matches Figma mobile variant

**Visual Comparison:**
- [ ] Live screenshot captured (desktop 1440px)
- [ ] Live screenshot captured (mobile 360px)
- [ ] /reviewer agent invoked for comparison
- [ ] Visual parity >95% confirmed
- [ ] All discrepancies listed and addressed

**Final Validation:**
- [ ] No TypeScript errors
- [ ] Lighthouse performance >85
- [ ] Lighthouse accessibility >90
- [ ] Section marked as COMPLETE
```

---

## Common Pitfalls

### Typography Errors
- ❌ Using generic sans-serif instead of Manrope
- ❌ Font size approximations (e.g., 15px instead of 14px or 16px)
- ❌ Wrong font weights (e.g., 700 instead of 600)
- ✅ Use exact Figma values: Manrope, 12/13/14/16/18/24/32/40px, 400/500/600

### Color Errors
- ❌ Using Tailwind defaults (blue-500, gray-800)
- ❌ Eyeballing colors instead of exact hex
- ✅ Use exact hex: #0268A0 (primary), #161F2B (dark)
- ✅ Verify with DevTools color picker

### Spacing Errors
- ❌ Rounding spacing values (e.g., 20px instead of 18px)
- ❌ Not measuring exact pixels in DevTools
- ✅ Match Figma within ±2px tolerance
- ✅ Use DevTools to verify exact rendered spacing

### Responsive Errors
- ❌ Using different breakpoints than Figma (e.g., 640px instead of 360px)
- ❌ Not testing at exact Figma breakpoints
- ✅ Test at 360px, 768px, 1024px, 1440px
- ✅ Ensure layout changes match Figma mobile/desktop variants

---

## Integration with Implementation Plan

This reference guide supports the implementation plan phases:

- **Phase 0C** (this file) → Immutable Figma knowledge base
- **Phase 1** → Use design tokens for theme configuration
- **Phase 2** → Use header/footer node IDs for layout components
- **Phase 3** → Use homepage node IDs for section-by-section build
- **Phase 4** → Use PDP node IDs for product page build
- **Phase 5** → Use cart node IDs for cart drawer
- **Phase 6** → Use "How It Works" node IDs for supporting pages
- **Phase 7** → Use collections node IDs for product listing
- **Phase 8** → Use full page node IDs for final pixel-perfect audit

---

## Quick Command Reference

```bash
# Get screenshot of homepage hero
mcp__figma-desktop__get_screenshot({ nodeId: "1:4243" })

# Get design context for PDP header
mcp__figma-desktop__get_design_context({ nodeId: "1:4128" })

# Get variables for collections page
mcp__figma-desktop__get_variable_defs({ nodeId: "1:4174" })

# Get metadata for footer
mcp__figma-desktop__get_metadata({ nodeId: "1:4254" })
```

---

## Updates & Maintenance

When Figma design changes:

1. Update node IDs in this guide
2. Update design tokens if colors/typography changed
3. Update section heights/dimensions
4. Re-run validation checklists for affected sections
5. Update any components that reference changed sections

---

**Created:** 2026-02-27
**Figma File Version:** Current (as of implementation start)
**Status:** IMMUTABLE REFERENCE - DO NOT DELETE
**Maintained By:** CGK Platform Team

---

## Total Section Count

**Homepage:** 12 sections (Header → Footer)
**PDP:** 12 sections (Header → Traits)
**Collections:** 4 sections (Nav → Product List)
**Cart:** 2 states (Drawer with items, Empty state)
**How It Works:** 2 variants (Desktop, Mobile)

**Total Sections to Build:** 32+
**Full Pages to Audit:** 6 (Homepage Desktop/Mobile, PDP Desktop/Mobile, Collections Desktop/Mobile)
