# PHASE-2SP-KB: Support Knowledge Base

**Status**: COMPLETE
**Completed**: 2026-02-10

**Duration**: 1 week (Week 11-12)
**Depends On**: PHASE-2A (Admin Shell)
**Parallel With**: PHASE-2SP-TICKETS (Ticket System)
**Blocks**: None (independent subsystem)

---

## ⚠️ MANDATORY: Tenant Isolation

**READ FIRST**: [TENANT-ISOLATION.md](../TENANT-ISOLATION.md)

Knowledge base articles are tenant-scoped. Public articles from Tenant A must NOT be visible in Tenant B's help center. Internal articles are only visible to tenant team members.

```typescript
// ✅ CORRECT - Public articles for a specific tenant's customers
const articles = await withTenant(tenantId, () =>
  sql`SELECT * FROM kb_articles WHERE is_published = true`
)

// ✅ CORRECT - Search within tenant's KB only
const results = await withTenant(tenantId, () =>
  searchKnowledgeBase(tenantId, query)
)
```

---

## Goal

Build a knowledge base system that allows tenants to create, organize, and publish help articles for customers. Includes category management, full-text search, article feedback tracking, and related article suggestions. This reduces ticket volume by enabling customer self-service.

---

## Success Criteria

- [ ] Tenant admins can create and edit knowledge base articles
- [ ] Articles organized into categories with icons and sort order
- [ ] Full-text search across article titles, content, and tags
- [ ] Published vs draft articles with visibility control
- [ ] View count tracking for article analytics
- [ ] Helpful/Not Helpful feedback collection
- [ ] Related articles suggested based on tags/category
- [ ] Public API for customer-facing help center
- [ ] Article feedback with optional comments
- [ ] All KB operations tenant-isolated

---

## Deliverables

### Database Schema (tenant schema)

```sql
-- Knowledge base categories
CREATE TABLE {tenant_schema}.kb_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(50),  -- Emoji or icon name
  sort_order INTEGER DEFAULT 0,
  article_count INTEGER DEFAULT 0,  -- Denormalized for performance
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default categories inserted during tenant onboarding:
-- getting-started, account, products, shipping, creators

-- Knowledge base articles
CREATE TABLE {tenant_schema}.kb_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(255) NOT NULL UNIQUE,

  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,  -- HTML or Markdown
  excerpt VARCHAR(500),   -- Preview text

  category_id UUID REFERENCES {tenant_schema}.kb_categories(id),
  tags TEXT[] DEFAULT '{}',

  is_published BOOLEAN DEFAULT FALSE,
  is_internal BOOLEAN DEFAULT FALSE,  -- Internal docs for agents only

  view_count INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,
  not_helpful_count INTEGER DEFAULT 0,

  author_id UUID REFERENCES public.users(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

CREATE INDEX idx_kb_articles_slug ON {tenant_schema}.kb_articles(slug);
CREATE INDEX idx_kb_articles_category ON {tenant_schema}.kb_articles(category_id);
CREATE INDEX idx_kb_articles_published ON {tenant_schema}.kb_articles(is_published);

-- Full-text search index
CREATE INDEX idx_kb_articles_search ON {tenant_schema}.kb_articles
  USING GIN (to_tsvector('english', title || ' ' || content || ' ' || array_to_string(tags, ' ')));

-- Article feedback
CREATE TABLE {tenant_schema}.kb_article_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES {tenant_schema}.kb_articles(id) ON DELETE CASCADE,
  is_helpful BOOLEAN NOT NULL,
  comment TEXT,
  visitor_id VARCHAR(100),  -- Anonymous tracking
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_kb_feedback_article ON {tenant_schema}.kb_article_feedback(article_id);
```

### Knowledge Base Service (`packages/support/src/knowledge-base.ts`)

```typescript
// Category management
export async function getCategories(tenantId: string): Promise<KBCategory[]>
export async function createCategory(tenantId: string, data: CreateCategoryInput): Promise<KBCategory>
export async function updateCategory(tenantId: string, categoryId: string, data: UpdateCategoryInput): Promise<KBCategory>
export async function deleteCategory(tenantId: string, categoryId: string): Promise<void>
export async function reorderCategories(tenantId: string, categoryIds: string[]): Promise<void>

// Article management
export async function getArticles(tenantId: string, filters: ArticleFilters): Promise<PaginatedArticles>
export async function getArticle(tenantId: string, articleId: string): Promise<KBArticle | null>
export async function getArticleBySlug(tenantId: string, slug: string): Promise<KBArticle | null>
export async function createArticle(tenantId: string, data: CreateArticleInput): Promise<KBArticle>
export async function updateArticle(tenantId: string, articleId: string, data: UpdateArticleInput): Promise<KBArticle>
export async function deleteArticle(tenantId: string, articleId: string): Promise<void>
export async function publishArticle(tenantId: string, articleId: string): Promise<void>
export async function unpublishArticle(tenantId: string, articleId: string): Promise<void>

// Search
export async function searchArticles(tenantId: string, query: string, options?: SearchOptions): Promise<SearchResult[]>
export async function getRelatedArticles(tenantId: string, articleId: string, limit?: number): Promise<KBArticle[]>
export async function getPopularArticles(tenantId: string, limit?: number): Promise<KBArticle[]>

// Feedback
export async function submitFeedback(tenantId: string, articleId: string, feedback: FeedbackInput): Promise<void>
export async function getArticleFeedback(tenantId: string, articleId: string): Promise<ArticleFeedback[]>

// Analytics
export async function incrementViewCount(tenantId: string, articleId: string): Promise<void>
export async function getKBAnalytics(tenantId: string): Promise<KBAnalytics>
```

### API Routes

```
# Admin routes (auth required)
/api/admin/support/kb/
  route.ts                     # GET articles list, POST create
  categories/route.ts          # GET, POST, PATCH categories
  [id]/route.ts                # GET, PATCH, DELETE article
  [id]/publish/route.ts        # POST publish, DELETE unpublish
  analytics/route.ts           # GET KB analytics

# Public routes (for customer help center)
/api/support/kb/
  route.ts                     # GET search, GET by category
  [slug]/route.ts              # GET article by slug
  [slug]/feedback/route.ts     # POST submit feedback
  popular/route.ts             # GET popular articles
  categories/route.ts          # GET public categories
```

### Admin Pages

```
/admin/support/kb              # Knowledge base manager
/admin/support/kb/new          # Create new article
/admin/support/kb/[id]         # Edit article
/admin/support/kb/categories   # Category management
/admin/support/kb/analytics    # KB performance metrics
```

### UI Components

- `ArticleEditor` - Rich text editor for article content (WYSIWYG or Markdown)
- `ArticleList` - Filterable table of articles with status badges
- `ArticlePreview` - Preview card showing excerpt and stats
- `CategoryManager` - Drag-and-drop category ordering
- `CategoryPicker` - Dropdown for article categorization
- `TagInput` - Multi-tag input component
- `PublishToggle` - Visual publish/draft toggle
- `FeedbackWidget` - "Was this helpful?" UI
- `ArticleStats` - View count, helpful rate display
- `SearchBar` - Full-text search input
- `RelatedArticles` - Sidebar with related article links

---

## Default Categories

Created during tenant onboarding:

| Slug | Name | Icon | Description |
|------|------|------|-------------|
| getting-started | Getting Started | 🚀 | Learn the basics |
| account | Account & Billing | 👤 | Manage your account |
| products | Products & Orders | 📦 | Product information and ordering |
| shipping | Shipping & Returns | 🚚 | Delivery and return policies |
| creators | Creator Program | ⭐ | For content creators (if enabled) |

---

## Search Implementation

**Full-Text Search Strategy:**

```sql
-- PostgreSQL full-text search
SELECT *,
  ts_rank(
    to_tsvector('english', title || ' ' || content || ' ' || array_to_string(tags, ' ')),
    plainto_tsquery('english', $1)
  ) AS rank
FROM kb_articles
WHERE is_published = true
  AND to_tsvector('english', title || ' ' || content || ' ' || array_to_string(tags, ' '))
      @@ plainto_tsquery('english', $1)
ORDER BY rank DESC
LIMIT 10
```

**Related Articles Algorithm:**
1. Get current article's category and tags
2. Find articles with matching tags (weighted higher)
3. Find articles in same category
4. Exclude current article
5. Sort by match score + view count
6. Return top N results

---

## Constraints

- Slugs MUST be unique per tenant and URL-safe
- Published articles visible to anyone with help center access
- Internal articles only visible to authenticated team members
- Deleting a category should NOT delete articles (set category_id to null)
- Article content supports HTML with sanitization (XSS prevention)
- Maximum article size: 100KB (configurable)
- Rate limit feedback submissions (1 per article per visitor per day)

---

## Pattern References

**Skills to invoke:**
- `/frontend-design` - For ArticleEditor, ArticleList, category manager

**RAWDOG code to reference:**
- `src/lib/support/knowledge-base.ts` - Article CRUD patterns
- `src/app/admin/support/kb/page.tsx` - KB admin UI
- `src/components/support/ArticleFeedback.tsx` - Feedback widget

**Other references:**
- Context7 MCP: "Rich text editor React components"
- Context7 MCP: "PostgreSQL full-text search best practices"

---

## AI Discretion Areas

The implementing agent should determine:
1. Rich text editor choice (TipTap, Lexical, Slate, etc.)
2. Markdown vs HTML storage format
3. Article versioning/history implementation
4. AI-generated article suggestions (from ticket patterns)
5. Multi-language article support (if needed)
6. SEO metadata per article

---

## Tasks

### [PARALLEL] Database & Core Service
- [ ] Create KB categories schema
- [ ] Create KB articles schema with full-text search index
- [ ] Create feedback schema
- [ ] Implement category CRUD functions
- [ ] Implement article CRUD functions
- [ ] Implement full-text search with ranking

### [PARALLEL] Search & Discovery
- [ ] Implement PostgreSQL full-text search
- [ ] Implement related articles algorithm
- [ ] Implement popular articles (by view count)
- [ ] Build search API endpoint

### [SEQUENTIAL after Core] Admin API Routes
- [ ] Create article CRUD routes
- [ ] Create category management routes
- [ ] Create publish/unpublish routes
- [ ] Create analytics endpoint

### [PARALLEL with Admin API] Public API Routes
- [ ] Create public article search route
- [ ] Create article by slug route
- [ ] Create feedback submission route
- [ ] Create popular articles route

### [SEQUENTIAL after API] UI Components
- [ ] Invoke `/frontend-design` for ArticleEditor
- [ ] Invoke `/frontend-design` for ArticleList
- [ ] Build article editor with preview
- [ ] Build category manager with drag-drop
- [ ] Build feedback widget
- [ ] Build search interface

### [SEQUENTIAL after Components] Admin Pages
- [ ] Create KB manager page
- [ ] Create article edit page
- [ ] Create category management page
- [ ] Create KB analytics page

### [SEQUENTIAL after All] Testing
- [ ] Unit tests for search functionality
- [ ] Unit tests for feedback tracking
- [ ] Tenant isolation tests
- [ ] Integration tests for article workflow

---

## Interfaces

### KBCategory

```typescript
interface KBCategory {
  id: string
  slug: string
  name: string
  description?: string
  icon?: string
  sortOrder: number
  articleCount: number
  createdAt: Date
  updatedAt: Date
}
```

### KBArticle

```typescript
interface KBArticle {
  id: string
  slug: string
  title: string
  content: string
  excerpt?: string
  category?: KBCategory
  tags: string[]
  isPublished: boolean
  isInternal: boolean
  viewCount: number
  helpfulCount: number
  notHelpfulCount: number
  author?: {
    id: string
    name: string
  }
  createdAt: Date
  updatedAt: Date
  publishedAt?: Date
}
```

### ArticleFeedback

```typescript
interface ArticleFeedback {
  id: string
  articleId: string
  isHelpful: boolean
  comment?: string
  createdAt: Date
}
```

### SearchResult

```typescript
interface SearchResult {
  article: KBArticle
  rank: number
  highlights: {
    title?: string
    content?: string
  }
}
```

---

## Definition of Done

- [ ] Articles can be created, edited, published, unpublished
- [ ] Categories can be created, reordered, deleted
- [ ] Full-text search returns relevant results
- [ ] Related articles suggested based on tags/category
- [ ] View counts tracked accurately
- [ ] Feedback (helpful/not helpful) collected
- [ ] Public API serves only published articles
- [ ] Internal articles only accessible to team
- [ ] Tenant A cannot see Tenant B's articles
- [ ] `npx tsc --noEmit` passes
- [ ] Unit and integration tests pass
