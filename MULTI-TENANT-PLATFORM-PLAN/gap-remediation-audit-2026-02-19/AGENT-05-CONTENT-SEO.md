# Gap Remediation Audit: Admin Content & SEO

**Agent:** 05 | **Date:** 2026-02-19 | **Pass:** 1

---

## Executive Summary

This audit covers three planned phases:
- **Phase 2C** — Admin Content (Blog, Landing Pages, SEO per-page, Brand Context)
- **Phase 2I-A** — Advanced Blog (Topic Clusters, Quality Scoring, Link Health, AI Tracking)
- **Phase 2I-B** — SEO Management Suite (Keywords, Redirects, Schema Validation, Site Audit)
- **Phase 2I-C** — UGC Gallery (Removed by business decision)

**Overall Assessment:** Phase 2C and 2I-B are largely implemented, but Phase 2I-A has critical gaps — all library logic exists but every UI page and component is missing. Two cross-cutting problems affect the entire content domain:

1. **Critical DB Schema Mismatch (Phase 2C Blog):** The `007_blog_posts.sql` migration creates a legacy schema (`body TEXT`, `author_name TEXT`, `seo_title TEXT`) that doesn't match what the TypeScript service layer expects (`content TEXT`, `author_id`, `category_id`, `meta_title`, `meta_description`). No migration creates `blog_authors` or `blog_categories` tables. The blog system cannot function in production without fixing this.

2. **No Storefront Blog Rendering:** There are no `/blog/` or `/blog/[slug]/` pages in the storefront app. Blog posts are written and managed in the admin but cannot be visited by end users.

---

## Feature Status Matrix

| Feature | Status | Notes |
|---------|--------|-------|
| **Phase 2C — Admin Content** | | |
| Blog post CRUD (API + UI) | ⚠️ PARTIAL | Code complete; DB schema mismatch prevents production use |
| Blog categories management | ⚠️ PARTIAL | Code complete; `blog_categories` table migration missing |
| Blog authors management | ⚠️ PARTIAL | Code complete; `blog_authors` table migration missing |
| Blog markdown editor | ✅ DONE | `markdown-editor.tsx` present and integrated |
| Blog content scheduling (`scheduled_at`) | ✅ DONE | Field exists in code and DB |
| Landing page list + CRUD | ✅ DONE | Full implementation confirmed |
| Landing page block editor (dnd-kit) | ✅ DONE | 79 block types, drag-and-drop confirmed |
| Block config panels | ✅ DONE | `block-config-panel.tsx` present |
| SEO editor (per landing page) | ✅ DONE | `seo-editor.tsx` sidebar present |
| Page preview (desktop/mobile) | ✅ DONE | Integrated into `page-editor.tsx` |
| Global SEO settings | ✅ DONE | `/admin/seo/page.tsx` + `global-seo-settings.tsx` |
| Brand Context Documents CRUD | ✅ DONE | Full UI + API + lib layer confirmed |
| Status badge component | ✅ DONE | `status-badge.tsx` present |
| **Phase 2I-A — Advanced Blog** | | |
| Topic cluster DB schema | ✅ DONE | `010_blog_clusters.sql` creates all tables |
| Cluster library (CRUD + graph) | ✅ DONE | `clusters-db.ts` fully implemented |
| Quality analyzer (100-pt scoring) | ✅ DONE | `quality-analyzer.ts` fully implemented |
| Readability calculator (Flesch) | ✅ DONE | `readability.ts` fully implemented |
| E-E-A-T detector | ✅ DONE | `eeat-detector.ts` fully implemented |
| Link analyzer | ✅ DONE | `link-analyzer.ts` fully implemented |
| Link suggestion engine | ✅ DONE | `link-suggester.ts` fully implemented |
| Diff calculator (edit %) | ✅ DONE | `diff-calculator.ts` fully implemented |
| Content freshness helper | ✅ DONE | `content-freshness.ts` present |
| Cluster CRUD API routes | ✅ DONE | `/api/admin/blog/clusters/` routes present |
| Link health API route | ❌ NOT DONE | `/api/admin/blog/link-health/route.ts` missing |
| Quality score API route | ❌ NOT DONE | `/api/admin/blog/quality/route.ts` missing |
| Link suggestion API route | ❌ NOT DONE | `/api/admin/blog/suggestions/route.ts` missing |
| Clusters admin page | ❌ NOT DONE | `/admin/blog/clusters/page.tsx` missing |
| Cluster visualization page | ❌ NOT DONE | `/admin/blog/clusters/visualization/page.tsx` missing |
| Link health admin page | ❌ NOT DONE | `/admin/blog/link-health/page.tsx` missing |
| Best practices page | ❌ NOT DONE | `/admin/blog/best-practices/page.tsx` missing |
| QualityScoreModal component | ❌ NOT DONE | No components/admin/blog/ directory exists |
| QualityScoreBadge component | ❌ NOT DONE | Missing |
| ClusterGraph (Cytoscape.js) | ❌ NOT DONE | Missing |
| LinkHealthDashboard component | ❌ NOT DONE | Missing |
| AIContentTracker widget | ❌ NOT DONE | Missing |
| LinkSuggestions panel | ❌ NOT DONE | Missing |
| FreshnessBadge component | ❌ NOT DONE | Missing |
| Quality/AI tracking in post editor | ❌ NOT DONE | `post-editor.tsx` has no quality score or AI tracking UI |
| **Phase 2I-B — SEO Suite** | | |
| DB migration (all SEO tables) | ✅ DONE | `010_seo_management.sql` confirmed |
| SEO service layer (all 7 files) | ✅ DONE | All present in `lib/seo/` |
| Keyword CRUD + sync API routes | ✅ DONE | All routes confirmed |
| GSC OAuth routes | ✅ DONE | Connect + callback routes present |
| Content gap analysis | ✅ DONE | Route + service present |
| Redirect management + CSV | ✅ DONE | Full implementation |
| Schema validation API | ✅ DONE | Route present |
| Site audit API | ✅ DONE | Route present |
| SEO dashboard page | ✅ DONE | `/admin/seo/page.tsx` present |
| Keywords page | ✅ DONE | Present |
| Content gap page | ✅ DONE | Present |
| Redirects page | ✅ DONE | Present |
| Schema validation page | ✅ DONE | Present |
| Site analysis page | ✅ DONE | Present |
| SEO settings page | ✅ DONE | Present |
| SEO UI components (7) | ✅ DONE | All present in `components/admin/seo/` |
| **Phase 2I-C — UGC Gallery** | | |
| UGC Gallery feature | 🔄 CHANGED | Removed by business decision; redirected to Reviews, DAM, Creator Portal |
| Residual: `016_ugc_submissions.sql` | ⚠️ PARTIAL | Migration still exists in DB (orphaned — no app code uses it) |
| **Storefront — Blog/Content Rendering** | | |
| Blog index page (`/blog/`) | ❌ NOT DONE | Does not exist in storefront |
| Blog post page (`/blog/[slug]/`) | ❌ NOT DONE | Does not exist in storefront |
| Sitemap generation (`sitemap.ts`) | ❌ NOT DONE | No sitemap in storefront |
| Robots.txt (`robots.ts`) | ❌ NOT DONE | Referenced in middleware exclusion but file not present |
| Blog SEO metadata (generateMetadata) | ❌ NOT DONE | No blog pages to attach metadata to |
| **DAM Package** | | |
| Asset CRUD + metadata extraction | ✅ DONE | Full implementation in `packages/dam/` |
| Thumbnail generation | ✅ DONE | `thumbnails.ts` present |
| Full-text search + tags | ✅ DONE | Present |
| Google Drive integration | ✅ DONE | OAuth, sync, tokens all present |
| Collections (smart + manual) | ✅ DONE | Present |
| Import queue | ✅ DONE | Present |
| Audit logging | ✅ DONE | Present |
| AI tagging engine | ❌ NOT DONE | `ai_tags` field in schema but no auto-tagging logic |
| DAM admin UI (upload page) | ✅ DONE | Pages and components confirmed |

---

## Detailed Gaps

---

### [1] Blog DB Schema Mismatch — ⚠️ CRITICAL

**Planned (Phase 2C):** Full blog system with authors table (FK), categories table (FK), meta_title/meta_description, og_image_url, content (markdown body).

**Found:** The `007_blog_posts.sql` migration creates a legacy schema with:
- `body TEXT` — but TypeScript code queries `content`
- `author_name TEXT`, `author_email TEXT` — but TypeScript expects `author_id` (FK)
- `seo_title TEXT`, `seo_description TEXT` — but TypeScript expects `meta_title`, `meta_description`
- `category TEXT` — but TypeScript expects `category_id` (FK to `blog_categories`)
- No `og_image_url` column
- No `blog_authors` table migration anywhere
- No `blog_categories` table migration anywhere

The `010_blog_clusters.sql` adds AI tracking columns via `ALTER TABLE` but conditionally references `blog_authors` without verifying the table was created.

**Files checked:**
- `packages/db/src/migrations/tenant/007_blog_posts.sql`
- `packages/db/src/migrations/tenant/010_blog_clusters.sql`
- `apps/admin/src/lib/blog/db.ts`
- `apps/admin/src/lib/blog/types.ts`

**TODO List:**
- [ ] Write new migration `packages/db/src/migrations/tenant/060_blog_schema_v2.sql` that:
  - Creates `blog_authors` table with fields: `id, name, bio, avatar_url, email, social_links JSONB, credentials TEXT[], expertise_areas TEXT[], is_team_account BOOLEAN, post_count (computed), created_at, updated_at`
  - Creates `blog_categories` table with fields: `id, slug, name, description, parent_id, created_at, updated_at`
  - Alters `blog_posts` to add: `content TEXT`, `author_id TEXT REFERENCES blog_authors(id)`, `category_id TEXT REFERENCES blog_categories(id)`, `meta_title TEXT`, `meta_description TEXT`, `og_image_url TEXT`
  - Migrates existing data: `SET content = body, meta_title = seo_title, meta_description = seo_description`
  - Adds missing indexes for author_id, category_id, meta_title
- [ ] Decide whether to keep or deprecate `body`, `author_name`, `author_email`, `seo_title`, `seo_description`, `category` columns (suggest deprecating after migration is confirmed)
- [ ] Verify `pnpm turbo typecheck` passes after schema migration is applied

---

### [2] Phase 2I-A Blog Advanced — UI Layer Entirely Missing — ❌

**Planned:** Complete UI for topic clusters, link health, quality scoring, AI content tracking, link suggestions, freshness tracking, best practices guide.

**Found:** All 7 library files fully implemented with correct logic. Cluster API routes exist. But:
- `apps/admin/src/components/admin/blog/` directory does not exist at all
- `apps/admin/src/app/admin/blog/clusters/` directory does not exist
- `apps/admin/src/app/admin/blog/link-health/` directory does not exist
- `apps/admin/src/app/admin/blog/best-practices/` directory does not exist
- The blog post editor (`post-editor.tsx`) has no quality score badge, no AI tracking controls
- The blog post list page has no freshness badges or quality indicators
- API routes for `/api/admin/blog/link-health/`, `/api/admin/blog/quality/`, `/api/admin/blog/suggestions/` do not exist

**Files checked:**
- `apps/admin/src/app/admin/blog/` (directory listing)
- `apps/admin/src/components/admin/blog/` (does not exist)
- `apps/admin/src/app/api/admin/blog/` (only clusters + basic posts/categories/authors)
- `apps/admin/src/components/content/post-editor.tsx`

**TODO List (API Routes):**
- [ ] Create `apps/admin/src/app/api/admin/blog/link-health/route.ts` — calls `link-analyzer.ts` and returns issues + health score from cache
- [ ] Create `apps/admin/src/app/api/admin/blog/quality/route.ts` — accepts `postId`, fetches post + author, runs `analyzeQualityScore()`, optionally caches result
- [ ] Create `apps/admin/src/app/api/admin/blog/suggestions/route.ts` — accepts `postId`, fetches all published posts, runs `generateLinkSuggestions()`

**TODO List (Components — create `apps/admin/src/components/admin/blog/` dir):**
- [ ] Create `QualityScoreBadge.tsx` — color-coded badge showing score 0-100 with level label (Excellent/Good/Needs Work/Poor)
- [ ] Create `QualityScoreModal.tsx` — full breakdown modal with 4 category tabs (SEO/Readability/E-E-A-T/Formatting), per-criterion pass/fail rows, AI modifiers section, publish-blocked warning
- [ ] Create `AIContentTracker.tsx` — toggle "Mark as AI-generated", AI source selector, edit percentage progress bar (red < 20%, amber 20-40%, green 40%+), "Capture original" button
- [ ] Create `LinkSuggestions.tsx` — panel showing top 5 relevant posts with relevance score, match reason, anchor text, and copy-markdown-link button
- [ ] Create `FreshnessBadge.tsx` — label based on content age (Fresh/Aging/Stale/Outdated)
- [ ] Create `ClusterGraph.tsx` — Cytoscape.js network visualization; nodes are pillar/spoke/unclustered with cluster color coding; edges show links
- [ ] Create `LinkHealthDashboard.tsx` — health score gauge, issue list with severity (CRITICAL/WARNING/INFO), issue type breakdown chart

**TODO List (Admin Pages):**
- [ ] Create `apps/admin/src/app/admin/blog/clusters/page.tsx` — cluster list with color swatches, post counts, pillar post indicator, create/edit/delete
- [ ] Create `apps/admin/src/app/admin/blog/clusters/[id]/page.tsx` — cluster editor with pillar/spoke post assignment
- [ ] Create `apps/admin/src/app/admin/blog/clusters/visualization/page.tsx` — Cytoscape.js full-page cluster graph
- [ ] Create `apps/admin/src/app/admin/blog/link-health/page.tsx` — link health dashboard with graph + issue list
- [ ] Create `apps/admin/src/app/admin/blog/best-practices/page.tsx` — accordion-based static guide covering all 25 quality criteria + E-E-A-T + AI policy

**TODO List (Blog Post Editor Integration):**
- [ ] Update `post-editor.tsx` to fetch quality score from `/api/admin/blog/quality/[id]` on edit mode
- [ ] Add `QualityScoreBadge` to post editor header area (click-to-open modal)
- [ ] Add `AIContentTracker` widget to post editor sidebar (visible when editing)
- [ ] Add `LinkSuggestions` panel to post editor sidebar
- [ ] Add `FreshnessBadge` to blog post list table rows

---

### [3] Storefront Blog Rendering — ❌ NOT DONE

**Planned:** Storefront blog index and individual post pages with SEO metadata, Open Graph tags, structured data (Article schema, BreadcrumbList).

**Found:** The storefront has NO blog routes. The only blog-related component is `BlogGridBlock.tsx` which is used as an embeddable block in landing pages — it renders static post data passed via block config, not from the live database. There is no `sitemap.ts`, no `robots.ts`, and no dynamic blog page routing.

**Files checked:**
- `apps/storefront/src/app/` (full directory tree)
- `apps/storefront/src/components/blocks/content/BlogGridBlock.tsx`
- `apps/storefront/src/middleware.ts` (references `robots.txt` and `sitemap.xml` in exclusion but neither file exists)

**TODO List:**
- [ ] Create `apps/storefront/src/app/blog/page.tsx` — blog index with pagination, category filter, author filter; fetches published posts via internal API or DB
- [ ] Create `apps/storefront/src/app/blog/[slug]/page.tsx` — individual post with:
  - Markdown-to-HTML rendering (remark/rehype pipeline)
  - Author bio card
  - Related posts section
  - `generateMetadata()` for title, description, OG tags, canonical URL
  - Article JSON-LD schema
  - BreadcrumbList JSON-LD schema
- [ ] Create `apps/storefront/src/app/blog/[slug]/not-found.tsx`
- [ ] Create `apps/storefront/src/app/sitemap.ts` — Next.js sitemap route that includes all published blog posts, products, collections, landing pages
- [ ] Create `apps/storefront/src/app/robots.ts` — Next.js robots route (tenant-aware: allow/disallow based on tenant config)
- [ ] Create `apps/storefront/src/lib/blog.ts` — client-side fetcher for blog posts (with tenant context from middleware)
- [ ] Update `BlogGridBlock.tsx` to optionally fetch live posts from DB instead of only using static config data

---

### [4] Blog Advanced API Routes — Phase 2I-A — ❌

**Planned:** link-health, quality, and suggestions routes.

**Found:** Only `clusters/` and `clusters/[id]/` API routes exist for blog advanced features. The three other required API routes are entirely absent.

**Files checked:**
- `apps/admin/src/app/api/admin/blog/` (directory listing)

**TODO List:**
- [ ] See [Gap #2] — API route tasks listed there

---

### [5] DAM AI Tagging Engine — ❌ NOT DONE

**Planned (Phase 3F):** AI tagging and categorization of media assets.

**Found:** The DAM `Asset` type includes `ai_tags: string[]` and the `asset-detail-modal.tsx` renders AI tags in the UI, but there is no code that populates these tags automatically. The `dam_core.sql` migration presumably includes `ai_tags TEXT[]`. No AI vision call, no tagging pipeline, no background job for auto-tagging is implemented.

**Files checked:**
- `packages/dam/src/types.ts` (line 39: `ai_tags: string[]`)
- `apps/admin/src/components/admin/dam/asset-detail-modal.tsx` (lines 353-362: renders `asset.ai_tags`)
- `packages/dam/src/` (no `ai-tagger.ts` or similar file)

**TODO List:**
- [ ] Create `packages/dam/src/assets/ai-tagger.ts` — sends image URL to vision API (e.g., OpenAI GPT-4o Vision), returns tags array
- [ ] Integrate auto-tagging into the upload flow in `apps/admin/src/app/api/admin/dam/assets/route.ts` — call `generateAITags(asset.file_url)` after upload
- [ ] Add background job `dam/ai-tag` for batch tagging existing untagged assets
- [ ] Add UI indicator in `asset-detail-modal.tsx` for "tags are AI-generated" vs manual

---

### [6] Orphaned UGC Submissions Migration — ⚠️ PARTIAL

**Planned:** UGC Phase was removed; all files were deleted.

**Found:** `packages/db/src/migrations/tenant/016_ugc_submissions.sql` still exists and creates a `ugc_submissions` table that no application code references.

**Files checked:**
- `packages/db/src/migrations/tenant/016_ugc_submissions.sql`

**TODO List:**
- [ ] Decide: Keep migration (table is harmless and costs nothing) OR write a compensating drop migration
- [ ] If keeping: Add a comment at top of file noting it's intentionally un-used (reserved for future campaign use)
- [ ] If dropping: Create `packages/db/src/migrations/tenant/061_drop_ugc_submissions.sql` with `DROP TABLE IF EXISTS ugc_submissions;`

---

### [7] Content Approval Workflow — ❌ NOT DONE

**Planned (Phase 2C):** Not explicitly called out in the phase doc, but standard CMS feature; blog_post_status includes `draft/scheduled/published/archived` but no "review" or "pending_approval" state.

**Found:** No approval workflow, no reviewer assignment, no "pending review" status. The `PostEditor` saves directly to `published` or `draft` with no intermediate approval step. No RBAC on publish action.

**Files checked:**
- `packages/db/src/migrations/tenant/007_blog_posts.sql` (enum: draft/scheduled/published/archived)
- `apps/admin/src/components/content/post-editor.tsx`

**TODO List:**
- [ ] Evaluate whether content approval is required for the MVP or a later phase
- [ ] If required: Add `under_review` to `blog_post_status` enum (migration)
- [ ] If required: Add `reviewed_by`, `reviewed_at`, `reviewer_notes` columns to blog_posts
- [ ] If required: Create approval API endpoint and UI flow in post editor

---

## Architectural Observations

### 1. Phase Status vs. Reality Mismatch
Phase 2I-A is marked `✅ COMPLETE` in the plan doc header, and `STATUS: COMPLETE (2026-02-13)`, but every task checkbox is unchecked and the UI layer is entirely absent. The library backend was implemented but the implementer either forgot to update checkboxes or confused "library done" with "phase done." This is a systemic issue — auditors and planners should cross-reference code, not just the plan doc.

### 2. Blog DB Schema Was Never Updated
The original `007_blog_posts.sql` was written before Phase 2C. Phase 2C added `blog_authors`, `blog_categories`, and changed column names, but never wrote a migration to reflect those changes. The application layer was coded to the new schema, leaving a gap between code and database. This affects every blog feature.

### 3. Storefront Content Rendering Is a Complete Blind Spot
The admin has a robust content management system, but none of it is visible to end users. Blog posts cannot be read by website visitors. This means all blog SEO benefits (organic traffic, E-E-A-T scoring, keyword rankings) cannot be realized. The sitemap generator in Phase 2I-B audits the storefront but assumes blog routes exist — it will find nothing.

### 4. Phase 2I-B Is Solid But Jobs Are Deferred
All SEO management library and UI code is complete. The background jobs (daily keyword sync, weekly audit, etc.) are documented as "Phase 5 jobs" and intentionally deferred. This is acceptable architectural decision but should be tracked.

### 5. DAM Is Well-Architected
The `packages/dam/` package is production-quality: proper tenant isolation, Google Drive OAuth with encrypted token storage, full-text search, thumbnail generation, audit logs, soft deletes. Only AI tagging is missing, which is clearly a Phase 3F concern.

### 6. No Sitemap or Robots.txt
The storefront middleware explicitly excludes `robots.txt` and `sitemap.xml` from auth handling, indicating these were planned. Neither file exists. Without a sitemap, Google cannot efficiently crawl content (especially blog posts once they're added). This is an SEO blind spot.

---

## Priority Ranking

| Priority | Gap | Effort | Impact |
|----------|-----|--------|--------|
| 🔴 P0 — Critical | Blog DB schema mismatch (Gap #1) | Medium | Blocks all blog functionality in production |
| 🔴 P0 — Critical | Storefront blog pages missing (Gap #3) | Medium | No content reaches end users |
| 🟠 P1 — High | Phase 2I-A UI components + pages (Gap #2) | Large | Blog advanced features unusable without UI |
| 🟠 P1 — High | Sitemap + robots.txt (Gap #3 sub-item) | Small | Core SEO infrastructure missing |
| 🟡 P2 — Medium | Blog Advanced API routes (Gap #4) | Small | Prerequisite to Gap #2 UI work |
| 🟡 P2 — Medium | Post editor quality/AI tracking integration (Gap #2) | Medium | Key editorial workflow feature |
| 🟢 P3 — Low | DAM AI tagging engine (Gap #5) | Large | Phase 3F concern; field exists as placeholder |
| 🟢 P3 — Low | Orphaned UGC migration (Gap #6) | Tiny | Cosmetic/housekeeping |
| 🔵 P4 — Future | Content approval workflow (Gap #7) | Large | Not in MVP scope per current plan |
