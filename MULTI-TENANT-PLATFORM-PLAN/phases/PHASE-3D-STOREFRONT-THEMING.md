# PHASE-3D: Storefront Theming & Customization

**Duration**: 1 week (Week 14)
**Depends On**: PHASE-3C-STOREFRONT-FEATURES
**Parallel With**: None
**Blocks**: PHASE-4A-CREATOR-PORTAL

---

## Goal

Enable per-tenant visual customization through theming, custom domain support, and dynamic landing pages, allowing each brand to have a unique storefront appearance without code changes.

---

## Success Criteria

- [ ] Per-tenant theming applies colors, fonts, and styling from tenant config
- [ ] `generateThemeStyles()` produces valid CSS custom properties
- [ ] `ThemeConfig` interface covers all customizable aspects
- [ ] Custom domains route to correct tenant storefront
- [ ] Domain middleware resolves tenant from hostname
- [ ] Dynamic landing pages render from database configuration
- [ ] `BlockRenderer` renders all block types correctly
- [ ] 70+ block types available for landing page builder
- [ ] `npx tsc --noEmit` passes

---

## Deliverables

### Per-Tenant Theming
- `apps/storefront/src/lib/theme/` - Theme module
- `ThemeConfig` interface with customizable properties
- `generateThemeStyles(config)` - Generates CSS custom properties
- Theme CSS injection in root layout
- Support for: primary/secondary colors, accent colors, fonts, border radius, shadows

### ThemeConfig Interface
```
ThemeConfig properties:
- primaryColor, secondaryColor, accentColor
- backgroundColor, surfaceColor
- textColor, textMutedColor
- borderColor, borderRadius
- fontFamily, headingFontFamily
- fontSizeBase, lineHeight
- logoUrl, faviconUrl
- headerStyle, footerStyle
```

### CSS Variable System
- `--theme-primary`, `--theme-secondary`, etc.
- Component library uses CSS variables exclusively
- Dark mode support via color scheme toggle
- Responsive typography scaling

### Custom Domain Support
- Middleware for domain-based tenant resolution
- Domain -> tenant mapping from database
- SSL certificate automation (Vercel, or manual via API)
- Subdomain support (brand.platform.com)
- Custom domain support (www.brand.com)

### Dynamic Landing Pages
- `/lp/[slug]` route for landing pages
- `getLandingPage(slug)` - Fetch page config from database
- Page status check (draft, published, archived)
- SEO metadata from page config

### Block Renderer System
- `BlockRenderer` component - Renders blocks by type
- Block type registry
- Block-level configuration support
- 70+ block types ported from RAWDOG

Block categories:
- **PDP Blocks**: pdp-hero, pdp-trust-badges, pdp-science-section, pdp-usage-guide, pdp-ready-to-buy, pdp-ingredient-deep-dive, pdp-featured-reviews, pdp-yotpo-reviews, pdp-recommendations
- **Promo Blocks**: bundle-builder, promo-hero, feature-cards, text-banner, faq-lifestyle
- **Core Blocks**: hero, benefits, reviews, cta-banner, markdown

### Storefront File Structure
```
apps/storefront/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Theme injection
│   │   ├── page.tsx                # Homepage
│   │   ├── products/               # Product pages
│   │   ├── collections/            # Collection pages
│   │   ├── cart/                   # Cart page
│   │   ├── checkout/               # Custom checkout (scaffold)
│   │   ├── lp/[slug]/              # Landing pages
│   │   └── api/
│   │       ├── cart/               # Cart API
│   │       ├── attribution/        # Attribution API
│   │       └── webhooks/           # Commerce webhooks
│   ├── components/
│   │   ├── product/                # Product components
│   │   ├── cart/                   # Cart components
│   │   ├── blocks/                 # Landing page blocks
│   │   │   ├── renderer.tsx        # BlockRenderer
│   │   │   └── [block-type]/       # Individual blocks
│   │   └── reviews/                # Review components
│   ├── lib/
│   │   ├── commerce.ts             # Provider integration
│   │   ├── tenant.ts               # Tenant context
│   │   ├── theme/                  # Theming
│   │   ├── cart/                   # Cart logic
│   │   ├── reviews/                # Reviews logic
│   │   ├── ab-testing/             # A/B testing
│   │   ├── attribution/            # Attribution
│   │   └── analytics/              # Pixel tracking
│   └── hooks/
│       ├── use-cart.ts
│       ├── use-bundle-pricing.ts
│       └── use-ab-test.ts
└── package.json
```

---

## Constraints

- Theme changes MUST apply without code deployment (config-driven)
- CSS variables MUST be used for all themeable properties
- Custom domains require DNS verification before activation
- Landing pages respect tenant isolation (can only fetch own pages)
- Block renderer MUST handle unknown block types gracefully (skip with warning)
- SEO metadata MUST be present on all landing pages

---

## Pattern References

**Skills to invoke:**
- `/frontend-design` - Theme system design, block components

**MCPs to consult:**
- Context7 MCP: CSS custom properties patterns, Next.js middleware

**RAWDOG code to reference:**
- `src/app/lp/[slug]/page.tsx` - Landing page routing
- `src/components/blocks/` - Block components
- `src/app/admin/landing-pages/[id]/constants/block-palette.ts` - Block type definitions
- `src/lib/theme/` - Theme utilities (if exists)

**Spec documents:**
- `CODEBASE-ANALYSIS/API-ROUTES-2025-02-10.md` - Landing page API patterns

---

## AI Discretion Areas

The implementing agent should determine the best approach for:
1. Theme CSS injection method (style tag, CSS file generation)
2. Font loading strategy (self-hosted vs. Google Fonts vs. tenant-uploaded)
3. Block component code-splitting strategy
4. Domain verification flow (DNS TXT record vs. CNAME)
5. Theme preview/editing UX (live preview vs. save-and-refresh)

---

## Tasks

### [PARALLEL] Theme System
- [ ] Create `apps/storefront/src/lib/theme/` module
- [ ] Define `ThemeConfig` interface
- [ ] Implement `generateThemeStyles()` function
- [ ] Inject theme CSS in root layout
- [ ] Create theme CSS variable definitions

### [PARALLEL] Custom Domain Support
- [ ] Add domain resolution to middleware
- [ ] Create domain -> tenant lookup
- [ ] Handle subdomain pattern matching
- [ ] Handle custom domain mapping
- [ ] Test multi-domain routing

### [SEQUENTIAL after parallel tasks] Landing Page System
- [ ] Create `/lp/[slug]` route
- [ ] Implement `getLandingPage()` function
- [ ] Build `BlockRenderer` component
- [ ] Port block components (prioritize most-used)
- [ ] Add SEO metadata injection

### [SEQUENTIAL after landing pages] Block Components
- [ ] Create block registry with all 70+ types
- [ ] Implement core blocks (hero, cta-banner, markdown)
- [ ] Implement PDP blocks (pdp-hero, pdp-trust-badges, etc.)
- [ ] Implement promo blocks (bundle-builder, feature-cards)
- [ ] Add fallback for unknown block types

---

## Definition of Done

- [ ] Tenant theme colors apply to storefront
- [ ] CSS custom properties available for all theme values
- [ ] Custom domain resolves to correct tenant
- [ ] Subdomain (brand.platform.com) works
- [ ] `/lp/[slug]` renders landing pages from database
- [ ] BlockRenderer handles all block types
- [ ] Unknown block types skip gracefully with console warning
- [ ] Mobile and desktop layouts work for all blocks
- [ ] `npx tsc --noEmit` passes

---

## Dependencies for Next Phase

Phase 4 (Creator Portal) requires:
- [x] Tenant configuration system (from theming)
- [x] Attribution tracking working (from 3C)
- [x] Order webhooks processing (from 3B checkout flow)
