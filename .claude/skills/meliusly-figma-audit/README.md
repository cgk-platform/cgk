# Meliusly Figma Audit Skill

**Purpose:** Encapsulates all Figma knowledge for the Meliusly storefront and provides pixel-perfect audit capabilities throughout the implementation process.

## Overview

This skill provides a complete knowledge base of the Meliusly Figma design, including all node IDs, section metadata, design tokens, and validation workflows. It enables systematic, pixel-perfect translation from Figma to code.

## Installation

The skill is already installed in `.claude/skills/meliusly-figma-audit/`. No additional setup required.

## Commands

### 1. Extract Section

Get Figma node ID and instructions for extracting design context.

```bash
/meliusly-figma-audit extract <section> [page]
```

**Examples:**
```bash
/meliusly-figma-audit extract hero
/meliusly-figma-audit extract benefits pdp
/meliusly-figma-audit extract footer
```

**Output:**
- Section metadata (name, description, node ID)
- Expected height (desktop + mobile)
- MCP tool commands to get screenshot and design context
- Pixel-perfect validation checklist

### 2. List Sections

Show all sections for a given page.

```bash
/meliusly-figma-audit list [page]
```

**Examples:**
```bash
/meliusly-figma-audit list
/meliusly-figma-audit list homepage
/meliusly-figma-audit list pdp
/meliusly-figma-audit list collections
```

**Output:**
- Numbered list of all sections
- Node IDs
- Descriptions
- Heights (desktop + mobile where applicable)

### 3. Get Design Tokens

Display Meliusly design system tokens.

```bash
/meliusly-figma-audit tokens
```

**Output:**
- Colors (hex + RGB values)
- Typography (font family, sizes, weights, line-heights)
- Breakpoints (mobile, tablet, desktop, wide)
- Spacing rules (±2px tolerance)

### 4. Generate Audit Checklist

Create a comprehensive checklist for pixel-perfect validation of a page.

```bash
/meliusly-figma-audit audit <page>
```

**Examples:**
```bash
/meliusly-figma-audit audit homepage
/meliusly-figma-audit audit pdp
```

**Output:**
- Section-by-section checklist
- Validation steps per section
- Final page-level validation criteria

## Knowledge Base

### Figma File

**URL:** https://www.figma.com/design/P14Fv87DK7Bj5Zf162DA61/Meliusly?node-id=0-1

### Pages & Sections

#### Homepage (12 sections)
1. **Header** (1:4243, 700px) - Navigation, logo, cart
2. **Trust Bar** (1:4244, 121px) - Trust badges
3. **Product Type** (1:4245, 623px) - Category selector
4. **Products** (1:4246, 878px) - Best sellers grid
5. **Shipping** (1:4247, 82px) - Shipping info banner
6. **Why Meliusly** (1:4248, 525px) - USP section
7. **Reviews** (1:4249, 877px) - Testimonials carousel
8. **About** (1:4250, 743px) - Brand story
9. **Product Guides** (1:4251, 423px) - Educational links
10. **Org** (1:4252, 358px) - Company info
11. **Traits** (1:4253, 104px) - Product traits bar
12. **Footer** (1:4254, 396px desktop / 1149px mobile) - Site footer

#### Product Detail Page (12 subsections)
1. **Header** (1:4128, 1455px) - Gallery, title, price, add to cart
2. **Benefits** (1:4129, 741px) - Benefits grid
3. **Features** (1:4130, 722px) - Features section
4. **Reviews** (1:4131, 895px) - Reviews section
5. **Dimensions** (1:4132, 554px) - Measurements
6. **How to Install** (1:4133, 545px) - Installation guide
7. **Video** (1:4134, 943px) - Demo video
8. **Press** (1:4135, 245px) - Press mentions
9. **FAQ** (1:4136, 610px) - FAQ accordion
10. **Comparison** (1:4137, 1066px) - Comparison table
11. **Customer Reviews** (1:4138, 1832px) - Extended reviews
12. **Traits** (1:4139, 104px) - Traits bar

#### Collections Page (4 sections)
1. **Nav** (1:4175, 108px) - Navigation
2. **Band** (1:4176) - Collection header
3. **Filters** (1:4178) - Filter controls
4. **Product List** (1:4182) - Product grid

#### Cart (2 states)
1. **Cart Drawer** (1:4292, 360x800px) - Cart with items (mobile)
2. **Cart Empty** (1:4290, 360x800px) - Empty cart state

#### How It Works Page
1. **Desktop** (1:4301) - Desktop layout
2. **Mobile** (1:4363) - Mobile layout

### Design Tokens

**Colors:**
- Primary: `#0268A0` / `rgb(2, 104, 160)`
- Dark: `#161F2B` / `rgb(22, 31, 43)`
- White: `#FFFFFF`

**Typography:**
- Font Family: `Manrope, system-ui, sans-serif`
- Sizes: 12/13/14/16/18/24/32/40px with corresponding line-heights
- Weights: 400 (normal), 500 (medium), 600 (semibold)

**Breakpoints:**
- Mobile: 360px
- Tablet: 768px
- Desktop: 1024px
- Wide: 1440px

**Spacing:**
- Tolerance: ±2px (all measurements should match Figma within this tolerance)

## Workflow: Pixel-Perfect Section Build

Use this skill throughout the implementation of every section:

### 1. Before Building
```bash
/meliusly-figma-audit extract <section>
```
- Get node ID and metadata
- Use provided MCP commands to get screenshot + design context
- Review pixel-perfect validation checklist

### 2. During Building
- Reference design tokens for colors, typography, spacing
- Ensure exact matches (no eyeballing)
- Use browser DevTools to verify measurements

### 3. After Building
- Screenshot live component at same viewport as Figma
- Use `/reviewer` agent to compare live vs Figma
- Fix all discrepancies listed
- Re-validate until >95% visual parity

### 4. Page Completion
```bash
/meliusly-figma-audit audit <page>
```
- Use checklist to verify all sections completed
- Ensure overall visual parity >98%
- Get `/reviewer` agent final approval

## Integration with Agents

### With `/implementer` Agent
```bash
# 1. Extract Figma data
/meliusly-figma-audit extract hero

# 2. Invoke implementer with exact requirements
/Task subagent_type=implementer "Build Meliusly hero section matching Figma node 1:4243..."
```

### With `/reviewer` Agent
```bash
# After building, use reviewer for visual comparison
/Task subagent_type=reviewer "Compare live Meliusly hero vs Figma screenshot..."
```

### With `/tester` Agent
```bash
# Test responsive behavior at all breakpoints
/Task subagent_type=tester "Test Meliusly hero section at 360px, 768px, 1024px, 1440px..."
```

## Benefits

1. **Single Source of Truth**: All Figma knowledge centralized in one skill
2. **Systematic Workflow**: Consistent process for every section
3. **Pixel-Perfect Validation**: Built-in checklists ensure quality
4. **Reusable**: Use throughout entire implementation (40-50 times)
5. **Documentation**: Self-documenting design system

## Example Usage Session

```bash
# Start homepage hero section
/meliusly-figma-audit extract hero
# → Returns node ID 1:4243, screenshot instructions, validation checklist

# Use MCP tools to get Figma data
mcp__figma-desktop__get_screenshot({ nodeId: "1:4243", ... })
mcp__figma-desktop__get_design_context({ nodeId: "1:4243", ... })

# Build component (using /frontend-design + /implementer)

# Validate with reviewer
/Task subagent_type=reviewer "Compare live hero vs Figma 1:4243..."

# Move to next section
/meliusly-figma-audit extract trustBar
# → Returns node ID 1:4244, instructions...
```

## Maintenance

When Figma design changes:
1. Update node IDs in `index.js` config
2. Update design tokens if colors/typography changed
3. Update section heights/metadata
4. Re-run audit checklists for affected sections

## Related Files

- `.claude/skills/meliusly-figma-audit/index.js` - Main skill implementation
- `.claude/skills/meliusly-figma-audit/package.json` - Package metadata
- `MULTI-TENANT-PLATFORM-PLAN/MELIUSLY-IMPLEMENTATION-PLAN.md` - Implementation plan

## Support

For questions or issues with this skill, refer to:
- Implementation plan (Phase 0A documentation)
- CGK CLAUDE.md (Figma MCP tool usage)
- Figma file: https://www.figma.com/design/P14Fv87DK7Bj5Zf162DA61/Meliusly
