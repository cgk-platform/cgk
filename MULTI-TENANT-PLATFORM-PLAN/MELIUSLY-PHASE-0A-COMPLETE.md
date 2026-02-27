# Meliusly Phase 0A: Figma Audit Skill - COMPLETE ✅

**Phase:** 0A - Create Meliusly Figma Audit Skill
**Status:** ✅ COMPLETE
**Date:** 2026-02-27

---

## What Was Built

### 1. Meliusly Figma Reference Guide

**Location:** `.claude/skills/meliusly-figma-audit/MELIUSLY-FIGMA-REFERENCE.md`

**Contents:**
- Complete Figma node ID reference (all sections, all pages)
- Design tokens (colors, typography, breakpoints, spacing)
- Figma MCP tool usage patterns
- Pixel-perfect implementation workflow (4-phase process)
- Section build order recommendations
- Validation checklist template
- Common pitfalls and solutions

### 2. Supporting Files

- `package.json` - Skill metadata
- `index.js` - Skill implementation (reference/documentation format)
- `README.md` - Skill documentation and usage guide

---

## Knowledge Base Coverage

### Pages & Sections Documented

✅ **Homepage** (12 sections)
- Header, Trust Bar, Product Type, Products, Shipping, Why Meliusly, Reviews, About, Product Guides, Org, Traits, Footer
- Full page node IDs: Desktop (1:4242), Mobile (1:4257)

✅ **Product Detail Page** (12 subsections)
- Header, Benefits, Features, Reviews, Dimensions, Install, Video, Press, FAQ, Comparison, Customer Reviews, Traits
- Full page node IDs: Desktop (1:4127), Mobile (1:4154)

✅ **Collections Page** (4 sections)
- Nav, Band, Filters, Product List
- Full page node IDs: Desktop (1:4174), Mobile (1:4206)

✅ **Cart** (2 states)
- Cart Drawer (1:4292), Cart Empty (1:4290)

✅ **How It Works Page**
- Desktop (1:4301), Mobile (1:4363)

### Design Tokens

✅ **Colors:**
- Primary: #0268A0 / rgb(2, 104, 160)
- Dark: #161F2B / rgb(22, 31, 43)
- White: #FFFFFF

✅ **Typography:**
- Font: Manrope (400, 500, 600 weights)
- Sizes: 12/13/14/16/18/24/32/40px with line-heights

✅ **Breakpoints:**
- Mobile: 360px, Tablet: 768px, Desktop: 1024px, Wide: 1440px

✅ **Spacing:**
- Tolerance: ±2px for all measurements

---

## Workflow Defined

### 4-Phase Pixel-Perfect Process

**Phase 1: Extract Figma Data**
1. Get screenshot (`mcp__figma-desktop__get_screenshot`)
2. Get design context (`mcp__figma-desktop__get_design_context`)
3. Document expected measurements

**Phase 2: Build Component**
1. Invoke `/frontend-design` skill with Figma reference
2. Build component matching exact measurements
3. Use design tokens (colors, typography, spacing)
4. Verify in browser DevTools

**Phase 3: Validate Implementation**
1. Screenshot live component (desktop + mobile)
2. Invoke `/reviewer` agent for comparison
3. Fix all discrepancies
4. Re-validate until >95% visual parity

**Phase 4: Page-Level Audit**
1. Screenshot entire page
2. Compare to Figma full page screenshots
3. Final `/reviewer` validation (>98% parity)

---

## Figma Access Verified

✅ **Figma MCP Tool Working**
- Successfully retrieved screenshot of homepage header (node 1:4243)
- Confirmed access to Meliusly Figma file
- MCP tools ready for use throughout implementation

---

## How to Use This Skill

### Before Building ANY Section:

1. **Consult the reference guide:**
   ```bash
   Read file_path=".claude/skills/meliusly-figma-audit/MELIUSLY-FIGMA-REFERENCE.md"
   ```

2. **Find the section** in the node ID table

3. **Extract Figma data** using MCP tools:
   ```typescript
   mcp__figma-desktop__get_screenshot({ nodeId: "<node-id>" })
   mcp__figma-desktop__get_design_context({ nodeId: "<node-id>" })
   ```

4. **Follow the 4-phase workflow** documented in the guide

5. **Use the validation checklist** to ensure pixel-perfect implementation

### Integration with Agents:

- **`/frontend-design`** - Use Figma screenshot as visual reference when designing
- **`/implementer`** - Provide exact measurements from design context
- **`/reviewer`** - Use for visual comparison (live vs Figma)
- **`/tester`** - Test responsive behavior at documented breakpoints

---

## Definition of Done ✅

- [x] Figma reference guide created with all node IDs
- [x] Design tokens documented (colors, typography, breakpoints, spacing)
- [x] Pixel-perfect workflow defined (4 phases)
- [x] Validation checklist template provided
- [x] Common pitfalls documented
- [x] Figma MCP tool access verified
- [x] Integration with agents documented
- [x] README and package.json created
- [x] Ready for use in subsequent phases

---

## Next Steps

**Ready to Proceed to Phase 1: Foundation & Tenant Setup**

**Phase 1 Tasks:**
1. **Phase 1A:** Database & Tenant Registration
   - Create `meliusly` tenant in `public.organizations`
   - Create `tenant_meliusly` schema
   - Run all tenant migrations

2. **Phase 1B:** Shopify Integration
   - Obtain Shopify credentials from user
   - Configure environment variables in Vercel
   - Verify Shopify API connection

3. **Phase 1C:** Figma Asset Extraction
   - Extract hero images (desktop + mobile)
   - Extract section background images
   - Extract icons (SVG preferred)
   - Optimize all images (<500KB)

4. **Phase 1D:** Theme Configuration
   - Create Meliusly theme config file
   - Extend Tailwind with Meliusly tokens
   - Load Manrope font via next/font/google
   - Test theme switching

---

## Files Created

```
.claude/skills/meliusly-figma-audit/
├── package.json                     # Skill metadata
├── index.js                         # Skill implementation (reference)
├── README.md                        # Skill documentation
└── MELIUSLY-FIGMA-REFERENCE.md     # ⭐ Main reference guide (use this!)
```

---

## Success Metrics

✅ **Comprehensive Coverage:**
- 30+ sections across 5 page types documented
- All node IDs cross-referenced
- Complete design token specification

✅ **Actionable Workflow:**
- 4-phase pixel-perfect process defined
- Validation checklist template ready
- Agent integration patterns documented

✅ **Quality Assurance:**
- Common pitfalls identified and solved
- Spacing tolerance defined (±2px)
- Visual parity thresholds set (>95% section, >98% page)

---

**Phase 0A Status:** ✅ **COMPLETE**
**Ready for Phase 1:** ✅ **YES**
**Blocking Issues:** None

---

**Mr. Tinkleberry**, Phase 0A is complete! The Meliusly Figma audit skill is ready to guide pixel-perfect implementation throughout all subsequent phases.

The reference guide at `.claude/skills/meliusly-figma-audit/MELIUSLY-FIGMA-REFERENCE.md` now serves as the single source of truth for all Figma knowledge (node IDs, design tokens, validation workflows).

Ready to proceed to **Phase 1: Foundation & Tenant Setup**?
