# Meliusly Figma Audit Skill - Usage Example

This document demonstrates how to use the Meliusly Figma Reference Guide during implementation.

---

## Example: Building the Trust Bar Section

### Step 1: Consult the Reference Guide

**From `.claude/skills/meliusly-figma-audit/MELIUSLY-FIGMA-REFERENCE.md`:**

```
| Section | Key | Node ID | Height (px) | Description |
|---------|-----|---------|-------------|-------------|
| Trust Bar | `trustBar` | 1:4244 | 121 | Trust badges (durability, protection, sizing) |
```

**Design Tokens:**
```
Primary Color: #0268A0
Dark Color: #161F2B
Font: Manrope
Breakpoints: 360px, 768px, 1024px, 1440px
```

### Step 2: Extract Figma Data

**Get Screenshot:**
```typescript
mcp__figma-desktop__get_screenshot({
  nodeId: "1:4244",
  clientLanguages: "typescript,javascript",
  clientFrameworks: "react,next.js"
})
```

**Result:** Screenshot showing trust badges with icons and text:
- "Over 500,000 Happy Customers" (person icon)
- "Over 8,000 5-Star Reviews" (star icon)
- "Engineered and Designed in USA" (wrench icon)
- "Featured in New York Times Wirecutter" (badge icon)

**Get Design Context:**
```typescript
mcp__figma-desktop__get_design_context({
  nodeId: "1:4244",
  artifactType: "COMPONENT_WITHIN_A_WEB_PAGE_OR_APP_SCREEN",
  clientLanguages: "typescript,javascript",
  clientFrameworks: "react,next.js"
})
```

**Expected measurements from Figma:**
- Height: 121px
- Background: Dark navy (#161F2B or similar)
- Text color: White
- Icons: Light blue (#0268A0 or white)
- Layout: 4 columns, evenly spaced

### Step 3: Build Component

**Invoke /frontend-design:**
```
/frontend-design

Building Meliusly trust bar section.

Requirements from Figma (node 1:4244, 121px height):
- 4 trust badges in a row (desktop)
- Icon + stat + description per badge
- Dark background (#161F2B)
- White text, light blue icons (#0268A0)
- Responsive: Stack on mobile (360px)

Reference screenshot: [attach Figma screenshot]

Constraints:
- lucide-react icons (User, Star, Wrench, Badge)
- @cgk-platform/ui components
- Tailwind CSS with Meliusly tokens
```

**Build the component:**
```tsx
// apps/storefront/src/components/meliusly/sections/TrustBar.tsx

export function TrustBar() {
  const badges = [
    {
      icon: User,
      stat: 'Over 500,000',
      description: 'Happy Customers',
    },
    {
      icon: Star,
      stat: 'Over 8,000',
      description: '5-Star Reviews',
    },
    {
      icon: Wrench,
      stat: 'Engineered',
      description: 'and Designed in USA',
    },
    {
      icon: Badge,
      stat: 'Featured',
      description: 'in New York Times Wirecutter',
    },
  ]

  return (
    <section className="bg-meliusly-dark py-8">
      <div className="mx-auto max-w-store px-4">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {badges.map((badge, index) => (
            <div key={index} className="flex items-center gap-4 text-white">
              <badge.icon className="h-8 w-8 flex-shrink-0 text-meliusly-blue" />
              <div>
                <div className="text-lg font-medium">{badge.stat}</div>
                <div className="text-sm opacity-90">{badge.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

### Step 4: Verify in Browser DevTools

**Typography Check:**
- ✅ Font family: Manrope (verified in Computed styles)
- ✅ Stat text: 18px, font-weight: 500 (matches "text-lg font-medium")
- ✅ Description text: 13px, opacity: 0.9 (matches "text-sm opacity-90")

**Color Check:**
- ✅ Background: #161F2B (verified with color picker)
- ✅ Icon color: #0268A0 (verified with color picker)
- ✅ Text color: #FFFFFF (white)

**Spacing Check:**
- ✅ Padding Y: 32px (matches "py-8" = 2rem)
- ✅ Gap between badges: 24px (matches "gap-6" = 1.5rem)
- ✅ Icon-to-text gap: 16px (matches "gap-4" = 1rem)

**Layout Check:**
- ✅ Grid: 1 column on mobile, 2 columns on tablet (sm:), 4 columns on desktop (lg:)
- ✅ Section height: ~121px on desktop (verified by measuring in DevTools)

### Step 5: Screenshot & Compare

**Live Screenshots:**
- Desktop (1440px): [Screenshot live trust bar]
- Mobile (360px): [Screenshot mobile trust bar]

**Invoke /reviewer agent:**
```
/Task subagent_type=reviewer "Compare live Meliusly trust bar vs Figma screenshot.

Figma node ID: 1:4244
Expected height: 121px

Compare:
- Figma screenshot (attached)
- Live screenshot at 1440px (attached)

Check:
- Typography (Manrope, 18px stat, 13px description)
- Colors (background #161F2B, icons #0268A0, text white)
- Spacing (gap-6 between badges, gap-4 icon-to-text)
- Layout (4 columns desktop, stack on mobile)
- Icon size (32px = h-8 w-8)

List ALL discrepancies."
```

**Reviewer Response:**
```
Visual Parity: 97%

Discrepancies found:
1. Icon size: Currently 32px (h-8 w-8), Figma shows ~28px
   → Reduce to h-7 w-7 (28px)

2. Stat font weight: Currently 500 (font-medium), Figma shows 600
   → Change to font-semibold

3. Description opacity: Currently 0.9, appears too bright
   → Reduce to opacity-80

All other measurements match within ±2px tolerance.
```

### Step 6: Fix Discrepancies

**Updated component:**
```tsx
<badge.icon className="h-7 w-7 flex-shrink-0 text-meliusly-blue" />
<div>
  <div className="text-lg font-semibold">{badge.stat}</div>
  <div className="text-sm opacity-80">{badge.description}</div>
</div>
```

### Step 7: Re-validate

**Re-run /reviewer agent:**
```
Visual Parity: 99%

No significant discrepancies found. All measurements within ±2px tolerance.
Typography, colors, spacing, and layout match Figma design.

✅ APPROVED - Pixel-perfect match achieved.
```

### Step 8: Mark Complete

**Validation Checklist:**
- [x] Extract Figma Data (screenshot + design context)
- [x] Build Component (with /frontend-design guidance)
- [x] Verify Typography (Manrope, 18px/13px, semibold/normal)
- [x] Verify Colors (#161F2B, #0268A0, white)
- [x] Verify Spacing (gap-6, gap-4, within ±2px)
- [x] Verify Layout (4 cols desktop, stack mobile)
- [x] Visual Comparison (99% parity)
- [x] /reviewer Approval (APPROVED)
- [x] Section COMPLETE ✅

---

## Example: Building the Traits Bar Section

### Step 1: Consult Reference Guide

**From the reference guide:**
```
| Section | Key | Node ID | Height (px) | Description |
|---------|-----|---------|-------------|-------------|
| Traits | `traits` | 1:4253 | 104 | Product traits/features bar |
```

### Step 2: Extract Figma Data

**Get Screenshot:**
```typescript
mcp__figma-desktop__get_screenshot({ nodeId: "1:4253" })
```

**Result:** Horizontal bar with 3 traits:
- "Free Shipping on all orders" (package icon)
- "30-Day Returns" (refresh icon)
- "US-Based Customer Support" (headphones icon)

**Observations:**
- Light gray background
- Icons: Primary blue (#0268A0)
- Text: Dark gray/black
- Compact horizontal layout

### Step 3: Build Component

```tsx
// apps/storefront/src/components/meliusly/sections/TraitsBar.tsx

export function TraitsBar() {
  const traits = [
    { icon: Package, text: 'Free Shipping on all orders' },
    { icon: RotateCcw, text: '30-Day Returns' },
    { icon: Headphones, text: 'US-Based Customer Support' },
  ]

  return (
    <section className="border-y bg-gray-50 py-4">
      <div className="mx-auto max-w-store px-4">
        <div className="flex flex-wrap items-center justify-center gap-8">
          {traits.map((trait, index) => (
            <div key={index} className="flex items-center gap-2">
              <trait.icon className="h-5 w-5 text-meliusly-blue" />
              <span className="text-sm text-meliusly-dark">{trait.text}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

### Step 4: Verify & Validate

**Typography:**
- ✅ Text size: 14px (text-sm)
- ✅ Font: Manrope

**Colors:**
- ✅ Icons: #0268A0 (text-meliusly-blue)
- ✅ Text: #161F2B (text-meliusly-dark)
- ✅ Background: Light gray (bg-gray-50)

**Layout:**
- ✅ Horizontal layout with flex-wrap
- ✅ Gap between items: 32px (gap-8)
- ✅ Icon-to-text gap: 8px (gap-2)
- ✅ Section height: ~104px (py-4 with borders)

**Reviewer Validation:**
- Visual Parity: 98%
- ✅ APPROVED

---

## Key Takeaways

1. **Always consult the reference guide first** - Get the node ID, expected height, and description
2. **Extract Figma data** - Screenshot + design context before building
3. **Use design tokens** - Don't hardcode colors/fonts, use the documented tokens
4. **Verify in DevTools** - Measure exact pixels, check computed styles
5. **Invoke /reviewer agent** - Get systematic visual comparison
6. **Fix ALL discrepancies** - Don't settle for "close enough"
7. **Re-validate until >95%** - Iterate until pixel-perfect

---

## Reference Guide Location

**Main guide:**
`.claude/skills/meliusly-figma-audit/MELIUSLY-FIGMA-REFERENCE.md`

**This usage example:**
`.claude/skills/meliusly-figma-audit/USAGE-EXAMPLE.md`

**Always read the reference guide before building ANY section!**
