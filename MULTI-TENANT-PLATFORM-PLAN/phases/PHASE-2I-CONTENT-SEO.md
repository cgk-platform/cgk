# PHASE-2I-B: SEO Management Suite

**Duration**: 1.5 weeks (Week 11-12)
**Depends On**: Phase 2C (Admin Content - Basic SEO)
**Parallel With**: Phase 2I-A (Blog Advanced), Phase 2I-C (UGC Gallery)
**Blocks**: None

---

## Goal

Implement comprehensive SEO management tools including keyword tracking with Google Search Console integration, content gap analysis (internal and competitor), URL redirect management with loop detection, schema/structured data validation, and site-wide SEO auditing with scoring.

---

## Success Criteria

- [ ] Keyword tracking with GSC sync
- [ ] Position history (90-day rolling)
- [ ] Content gap analysis (internal coverage)
- [ ] Optional competitor analysis (with DataForSEO)
- [ ] Redirect management with CRUD + CSV import/export
- [ ] Redirect loop detection
- [ ] Schema validation for all blog posts
- [ ] Site SEO audit with page-by-page scoring
- [ ] Audit history (30 audits retained)

---

## Feature Overview

### Keyword Tracking

**Purpose**: Track keyword rankings over time using Google Search Console data.

**Database Schema**:
```sql
CREATE TABLE seo_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  keyword VARCHAR(500) NOT NULL,
  priority VARCHAR(50) DEFAULT 'medium', -- high, medium, low
  target_url TEXT,
  current_position DECIMAL,
  clicks INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  ctr DECIMAL,
  linked_post_ids UUID[], -- Posts targeting this keyword
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, keyword)
);

CREATE TABLE seo_keyword_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  keyword_id UUID NOT NULL REFERENCES seo_keywords(id) ON DELETE CASCADE,
  position DECIMAL,
  clicks INTEGER,
  impressions INTEGER,
  ctr DECIMAL,
  recorded_at DATE NOT NULL,
  UNIQUE(tenant_id, keyword_id, recorded_at)
);
```

**GSC Integration**:
```typescript
interface GSCSyncResult {
  keyword: string
  position: number | null
  clicks: number
  impressions: number
  ctr: number
  dateRange: { start: string; end: string }
}

async function syncKeywordsWithGSC(tenantId: string): Promise<void> {
  const gscClient = await getGSCClient(tenantId)
  const trackedKeywords = await getTrackedKeywords(tenantId)

  const performanceData = await gscClient.searchAnalytics.query({
    siteUrl: 'https://...',
    dimensions: ['query'],
    startDate: '28daysAgo',
    endDate: 'today',
    rowLimit: 1000
  })

  for (const keyword of trackedKeywords) {
    const match = performanceData.find(r => r.query === keyword.keyword)
    if (match) {
      await updateKeywordMetrics(keyword.id, {
        position: match.position,
        clicks: match.clicks,
        impressions: match.impressions,
        ctr: match.ctr
      })
      await recordHistorySnapshot(keyword.id, match)
    }
  }
}
```

**Trend Analysis**:
- 7-day / 30-day / 90-day trends
- Status: `improving` | `declining` | `stable`
- Position change calculation (negative = better)

**Features**:
- CSV export of full history
- Auto-link blog posts to keywords
- Priority classification (high/medium/low)
- Target URL assignment

---

### Content Gap Analysis

**Two Types**:

**A. Internal Coverage Gap** (always available):
- Search all published posts for keyword mentions
- Check if keyword is primary target, secondary target, or just mentioned
- Assign relevance scores

**Scoring**:
| Match Type | Score |
|------------|-------|
| Primary target keyword | 100 |
| Secondary target keyword | 50 |
| Title mention | 30 |
| Content mention | 10 |

**Gap Types**:
- `no_content`: Keyword not mentioned anywhere
- `weak_content`: Mentioned but not targeted
- `no_dedicated_page`: No post has this as primary target

**B. Competitor Gap Analysis** (optional, requires DataForSEO or similar):
- Discover competing domains
- Find keywords competitors rank for
- Surface high-volume opportunities
- Return: keyword, search volume, difficulty, CPC, competitor URL

**Database Schema**:
```sql
CREATE TABLE seo_content_gaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  keyword VARCHAR(500) NOT NULL,
  gap_type VARCHAR(50) NOT NULL, -- no_content, weak_content, no_dedicated_page
  relevance_score INTEGER,
  search_volume INTEGER, -- If from external API
  difficulty INTEGER, -- If from external API
  competitor_url TEXT, -- If competitor analysis
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, keyword)
);
```

---

### URL Redirect Management

**Purpose**: Manage 301/302/307/308 redirects with analytics and safety features.

**Database Schema**:
```sql
CREATE TABLE seo_redirects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  source VARCHAR(2000) NOT NULL, -- Normalized path
  destination VARCHAR(2000) NOT NULL,
  status_code INTEGER DEFAULT 301,
  note TEXT,
  hits INTEGER DEFAULT 0,
  last_hit_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, source)
);
```

**Safety Features**:

**1. Source Normalization**:
```typescript
function normalizeSource(source: string): string {
  // Remove trailing slashes, query strings
  // Ensure starts with /
  return source
    .replace(/\?.*$/, '')
    .replace(/\/+$/, '')
    .replace(/^(?!\/)/, '/')
}
```

**2. Loop Detection**:
```typescript
async function detectRedirectLoop(
  tenantId: string,
  source: string,
  destination: string,
  maxDepth: number = 10
): Promise<boolean> {
  const visited = new Set<string>([source])
  let current = destination

  for (let i = 0; i < maxDepth; i++) {
    if (visited.has(current)) return true // Loop detected!
    visited.add(current)

    const next = await getRedirectDestination(tenantId, current)
    if (!next) break
    current = next
  }

  return false
}
```

**Bulk Operations**:
- **CSV Import**: Format `source,destination,statusCode,note`
- **CSV Export**: Includes hit counts for analytics
- **Statistics**: Most used, recently added, never used count

---

### Schema Validation

**Purpose**: Validate JSON-LD structured data for all blog posts.

**Expected Schemas**:
- **Article Schema**: headline, description, image, datePublished, author, publisher
- **BreadcrumbList Schema**: Home > Blog > Category > Post
- **Person Schema**: For author (via author field)
- **Organization Schema**: For publisher

**Validation Scoring** (0-100):

**Errors** (-20 points each):
- Missing title
- Missing description
- Missing publication date

**Warnings** (-5-10 points):
- Title too long (> 70 chars)
- Title too short (< 30 chars)
- Missing featured image
- No author specified
- No category assigned

**Suggestions** (-2-3 points):
- Missing image alt text
- No canonical URL
- Missing dateModified

**Return Type**:
```typescript
interface SchemaValidationResult {
  postId: string
  postTitle: string
  postSlug: string
  hasArticleSchema: boolean
  hasBreadcrumbSchema: boolean
  hasAuthorSchema: boolean
  hasOrganizationSchema: boolean
  overallScore: number // 0-100
  issues: Array<{
    type: 'error' | 'warning' | 'suggestion'
    field: string
    message: string
  }>
  generatedSchema: {
    article: object
    breadcrumb: object
  }
}
```

**Bulk Validation**:
- `validateAllPostSchemas()` - All published posts
- `getPostsWithSchemaIssues()` - Filter problematic posts
- Summary: total posts, average score, issue counts

---

### Site SEO Audit

**Purpose**: Analyze all site pages for SEO issues with page-by-page scoring.

**Scoring Algorithm** (100-point baseline):

**Critical Issues** (-15 each):
- Missing title tag
- Missing meta description
- Missing H1 tag

**Warnings** (-5 each):
- Title outside 30-60 char range
- Meta description outside 120-160 char range
- Multiple H1 tags
- Images without alt text (up to -10 total)
- Fewer than 2 internal links
- Missing structured data

**Page Analysis Result**:
```typescript
interface PageSEOAnalysis {
  url: string
  score: number // 0-100
  title: {
    value: string | null
    length: number
    hasKeyword: boolean
    issues: string[]
  }
  metaDescription: {
    value: string | null
    length: number
    issues: string[]
  }
  headings: {
    h1Count: number
    h1s: string[]
    h2Count: number
    hasKeywordInH1: boolean
    issues: string[]
  }
  images: {
    total: number
    withAlt: number
    withoutAlt: Array<{ src: string }>
    issues: string[]
  }
  links: {
    internal: number
    external: number
    broken: string[]
    issues: string[]
  }
  schema: {
    hasSchema: boolean
    types: string[]
    issues: string[]
  }
  criticalIssues: string[]
  warnings: string[]
  passed: string[]
}
```

**Default Pages Analyzed**:
- Homepage (`/`)
- All product pages (`/products/*`)
- All collection pages (`/collections/*`)
- Blog index and posts (`/blog/*`)
- Static pages (quiz, FAQ, about)

**Audit History**:
- Store last 30 audits in Redis
- Compare current vs previous scores
- Track improvement over time

---

## Deliverables

### Database Layer
- [ ] `packages/db/src/schemas/seo-keywords.ts`
- [ ] `packages/db/src/schemas/seo-keyword-history.ts`
- [ ] `packages/db/src/schemas/seo-content-gaps.ts`
- [ ] `packages/db/src/schemas/seo-redirects.ts`

### Library Functions
- [ ] `apps/admin/src/lib/seo/keyword-tracker.ts`
- [ ] `apps/admin/src/lib/seo/content-gap.ts`
- [ ] `apps/admin/src/lib/seo/redirects.ts`
- [ ] `apps/admin/src/lib/seo/schema-validator.ts`
- [ ] `apps/admin/src/lib/seo/site-analyzer.ts`
- [ ] `apps/admin/src/lib/seo/google-search-console.ts`

### API Routes
- [ ] `apps/admin/src/app/api/admin/seo/keywords/route.ts`
- [ ] `apps/admin/src/app/api/admin/seo/keywords/sync/route.ts`
- [ ] `apps/admin/src/app/api/admin/seo/keywords/history/route.ts`
- [ ] `apps/admin/src/app/api/admin/seo/content-gap/route.ts`
- [ ] `apps/admin/src/app/api/admin/seo/redirects/route.ts`
- [ ] `apps/admin/src/app/api/admin/seo/schema-validation/route.ts`
- [ ] `apps/admin/src/app/api/admin/seo/analysis/site/route.ts`
- [ ] `apps/admin/src/app/api/admin/seo/gsc/connect/route.ts`
- [ ] `apps/admin/src/app/api/admin/seo/gsc/callback/route.ts`

### Admin Pages
- [ ] `apps/admin/src/app/admin/seo/page.tsx` (dashboard)
- [ ] `apps/admin/src/app/admin/seo/keywords/page.tsx`
- [ ] `apps/admin/src/app/admin/seo/content-gap/page.tsx`
- [ ] `apps/admin/src/app/admin/seo/redirects/page.tsx`
- [ ] `apps/admin/src/app/admin/seo/schema/page.tsx`
- [ ] `apps/admin/src/app/admin/seo/analysis/page.tsx`

### Components
- [ ] `apps/admin/src/components/admin/seo/KeywordChart.tsx`
- [ ] `apps/admin/src/components/admin/seo/ContentGapTable.tsx`
- [ ] `apps/admin/src/components/admin/seo/RedirectManager.tsx`
- [ ] `apps/admin/src/components/admin/seo/SchemaValidation.tsx`
- [ ] `apps/admin/src/components/admin/seo/SiteAuditResults.tsx`
- [ ] `apps/admin/src/components/admin/seo/SERPPreview.tsx`
- [ ] `apps/admin/src/components/admin/seo/SEONav.tsx`

---

## Constraints

- GSC OAuth requires web dashboard configuration (documented)
- DataForSEO is optional (competitor analysis feature-flagged)
- Redirects must be applied in Next.js middleware
- Audit results cached for 24 hours
- Keyword history limited to 90 days rolling

---

## External Integrations

### Google Search Console (GSC)
**Setup**:
1. User connects GSC via OAuth
2. Stores encrypted refresh token per tenant
3. Daily sync via background job
4. Manual sync available

**Credentials Storage**:
```typescript
// Encrypted per-tenant
interface GSCCredentials {
  tenantId: string
  accessToken: string // Encrypted
  refreshToken: string // Encrypted
  expiresAt: Date
  siteUrl: string
}
```

### DataForSEO (Optional)
**Purpose**: Competitor analysis, search volume data
**Integration**: API key per tenant, usage metering
**Feature Flag**: `seo.competitor_analysis`

---

## Pattern References

**Skills to invoke:**
- `/frontend-design` - For keyword charts, audit results, redirect manager

**RAWDOG code to reference:**
- `src/app/admin/seo/keywords/page.tsx` - Keyword management UI
- `src/app/admin/seo/redirects/page.tsx` - Redirect manager
- `src/app/admin/seo/analysis/page.tsx` - Site audit UI
- `src/lib/seo/keyword-tracker.ts` - Keyword CRUD + GSC sync
- `src/lib/seo/content-gap.ts` - Gap analysis logic
- `src/lib/seo/redirects.ts` - Redirect management + loop detection
- `src/lib/seo/schema-validator.ts` - Schema validation
- `src/lib/seo/site-analyzer.ts` - Page scoring

---

## Tasks

### [PARALLEL] Database & Types
- [ ] Create seo_keywords table
- [ ] Create seo_keyword_history table
- [ ] Create seo_content_gaps table
- [ ] Create seo_redirects table
- [ ] Create all TypeScript types

### [PARALLEL] Library Functions
- [ ] Implement keyword tracker (CRUD, sync, trends)
- [ ] Implement content gap analyzer (internal + competitor)
- [ ] Implement redirect manager (CRUD, loop detection, CSV)
- [ ] Implement schema validator (Article, Breadcrumb, Author)
- [ ] Implement site analyzer (page scoring, audit history)
- [ ] Implement GSC client (OAuth, queries)

### [SEQUENTIAL after above] API Routes
- [ ] Keyword CRUD + sync routes
- [ ] Content gap analysis route
- [ ] Redirect CRUD + CSV routes
- [ ] Schema validation route
- [ ] Site audit route
- [ ] GSC OAuth routes

### [SEQUENTIAL after API] UI Components
- [ ] Keyword chart (trend visualization)
- [ ] Content gap table
- [ ] Redirect manager (table + modal)
- [ ] Schema validation results
- [ ] Site audit dashboard
- [ ] SERP preview component

### [SEQUENTIAL after components] Admin Pages
- [ ] SEO dashboard (overview + GSC connection)
- [ ] Keywords page
- [ ] Content gap page
- [ ] Redirects page
- [ ] Schema validation page
- [ ] Site audit page

---

## Background Jobs

The following background jobs should be created in Phase 5:

| Job ID | Schedule | Purpose |
|--------|----------|---------|
| `seo/keywords/sync` | Daily 6 AM | Sync all tenant keywords with GSC |
| `seo/audit/run` | Weekly Sunday | Run full site audit per tenant |
| `seo/content-gap/refresh` | Weekly | Refresh internal content gap analysis |
| `seo/redirects/cleanup` | Monthly | Remove unused redirects (0 hits) |

---

## Definition of Done

- [ ] Keywords CRUD working with priority and target URL
- [ ] GSC OAuth connection flow complete
- [ ] Keyword sync updates position and metrics
- [ ] 90-day position history tracked
- [ ] Trend analysis (7d/30d/90d) calculated
- [ ] Internal content gap analysis working
- [ ] Redirects CRUD with CSV import/export
- [ ] Loop detection prevents circular redirects
- [ ] Schema validation scores all published posts
- [ ] Site audit generates page-by-page scores
- [ ] Audit history retained (30 audits)
- [ ] All tenant isolation patterns followed
- [ ] `npx tsc --noEmit` passes
