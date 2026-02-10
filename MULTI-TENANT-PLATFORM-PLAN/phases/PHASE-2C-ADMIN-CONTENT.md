# PHASE-2C: Admin Content Features

**Duration**: 1 week (Week 6)
**Depends On**: Phase 2A (Admin Shell)
**Parallel With**: Phase 2B (Commerce), Phase 2D (Finance)
**Blocks**: Phase 3D (Storefront Theming - needs landing page patterns)

---

## Goal

Implement the Content section of the admin portal including blog management, landing page builder with 70+ block types, SEO tools, and brand context document management.

---

## Success Criteria

- [ ] Blog posts list with status filters
- [ ] Blog post editor with rich text/markdown support
- [ ] Blog categories and authors management
- [ ] Landing page list with status (draft/published/scheduled)
- [ ] Landing page block editor with drag-and-drop
- [ ] All 70+ block types available in block palette
- [ ] SEO editor for meta tags and structured data
- [ ] Brand context documents CRUD
- [ ] Page preview functionality

---

## Deliverables

### Blog Management
- Blog posts list with filters (status, category, author)
- Blog post create/edit page with markdown editor
- Categories management page
- Authors management page
- Featured image upload integration
- SEO metadata per post

### Landing Page Builder
- Landing pages list page
- Page settings (slug, title, status, scheduling)
- Block editor with visual canvas
- Block palette with 70+ block types organized by category
- Block configuration panels
- Drag-and-drop reordering (dnd-kit)
- Page preview (desktop/mobile toggle)
- SEO editor sidebar

### Block Types to Support
**PDP Blocks**: pdp-hero, pdp-trust-badges, pdp-science-section, pdp-usage-guide, pdp-ready-to-buy, pdp-ingredient-deep-dive, pdp-featured-reviews, pdp-yotpo-reviews, pdp-recommendations

**Promo Blocks**: bundle-builder, promo-hero, feature-cards, text-banner, faq-lifestyle

**Core Blocks**: hero, benefits, reviews, cta-banner, markdown

*(Plus 50+ additional types from RAWDOG - reference block-palette.ts)*

### SEO Tools
- Meta title/description editor
- Canonical URL management
- Structured data editor (JSON-LD)
- Open Graph preview

### Brand Context Documents
- Documents list page
- Document editor with markdown
- Document categories (brand voice, product info, FAQs)
- Version history (optional)

---

## Constraints

- Landing page blocks stored as JSON array in database
- Block configs must be validated before save
- Use Vercel Blob for image uploads
- Markdown editor must support live preview
- Block editor must not re-render entire page on config change

---

## Pattern References

**Skills to invoke:**
- `/frontend-design` - For block editor and markdown editor UIs
- Context7 MCP: "dnd-kit sortable vertical list"
- Context7 MCP: "MDX editor React components"

**RAWDOG code to reference:**
- `src/app/admin/landing-pages/[id]/page.tsx` - Landing page editor pattern
- `src/app/admin/landing-pages/[id]/constants/block-palette.ts` - ALL 70+ block types
- `src/app/admin/blog/` - Blog management patterns
- `src/lib/landing-pages/` - Landing page types and database

**Spec documents:**
- `CLAUDE.md` - Landing page builder section with block types list

**Reference docs (copied to plan folder):**
- `reference-docs/ADMIN-PATTERNS.md` - **CRITICAL**: Batch save, cache-busting, Neon pooling patterns with multi-tenant context

---

## AI Discretion Areas

The implementing agent should determine the best approach for:
1. Markdown/rich text editor library (MDXEditor, TipTap, etc.)
2. Block editor state management (Zustand vs Context)
3. Block palette organization (categories, search, favorites)
4. Preview implementation (iframe vs inline rendering)
5. Image upload component integration

---

## Tasks

### [PARALLEL] Database Layer
- [ ] Create `apps/admin/src/lib/blog/db.ts` (posts, categories, authors)
- [ ] Create `apps/admin/src/lib/blog/types.ts`
- [ ] Create `apps/admin/src/lib/landing-pages/db.ts`
- [ ] Create `apps/admin/src/lib/landing-pages/types.ts` (LandingPage, Block, BlockType)
- [ ] Create `apps/admin/src/lib/brand-context/db.ts`

### [PARALLEL] API Routes
- [ ] Create `apps/admin/src/app/api/admin/blog/posts/route.ts`
- [ ] Create `apps/admin/src/app/api/admin/blog/posts/[id]/route.ts`
- [ ] Create `apps/admin/src/app/api/admin/blog/categories/route.ts`
- [ ] Create `apps/admin/src/app/api/admin/landing-pages/route.ts`
- [ ] Create `apps/admin/src/app/api/admin/landing-pages/[id]/route.ts`
- [ ] Create `apps/admin/src/app/api/admin/landing-pages/[id]/blocks/route.ts`
- [ ] Create `apps/admin/src/app/api/admin/brand-context/route.ts`

### [SEQUENTIAL after API] Blog UI
- [ ] Create `apps/admin/src/app/admin/blog/page.tsx` (posts list)
- [ ] Create `apps/admin/src/app/admin/blog/new/page.tsx`
- [ ] Create `apps/admin/src/app/admin/blog/[id]/page.tsx` (edit)
- [ ] Create `apps/admin/src/app/admin/blog/categories/page.tsx`
- [ ] Create markdown editor component

### [SEQUENTIAL after API] Landing Page Builder UI
- [ ] Create `apps/admin/src/app/admin/landing-pages/page.tsx` (list)
- [ ] Create `apps/admin/src/app/admin/landing-pages/new/page.tsx`
- [ ] Create `apps/admin/src/app/admin/landing-pages/[id]/page.tsx` (editor)
- [ ] Create `apps/admin/src/components/admin/landing-pages/block-editor.tsx`
- [ ] Create `apps/admin/src/components/admin/landing-pages/block-palette.tsx`
- [ ] Create `apps/admin/src/components/admin/landing-pages/block-config-panel.tsx`
- [ ] Create `apps/admin/src/app/admin/landing-pages/[id]/constants/block-palette.ts` (70+ types)
- [ ] Create `apps/admin/src/components/admin/landing-pages/page-settings.tsx`
- [ ] Create `apps/admin/src/components/admin/landing-pages/seo-editor.tsx`
- [ ] Implement drag-and-drop with dnd-kit

### [SEQUENTIAL after API] SEO & Brand Context
- [ ] Create `apps/admin/src/app/admin/seo/page.tsx` (global SEO settings)
- [ ] Create `apps/admin/src/app/admin/brand-context/page.tsx`
- [ ] Create `apps/admin/src/app/admin/brand-context/[id]/page.tsx`

---

## Definition of Done

- [ ] Blog posts CRUD working with markdown editor
- [ ] Blog categories and authors manageable
- [ ] Landing pages list shows status correctly
- [ ] Block editor allows add/remove/reorder blocks
- [ ] All 70+ block types in palette (organized by category)
- [ ] Block config panels save correctly
- [ ] SEO metadata saves per page
- [ ] Brand context documents CRUD working
- [ ] `npx tsc --noEmit` passes
- [ ] Block editor performance acceptable (no lag on 20+ blocks)
