# PHASE-2I-A: Advanced Blog Features

**Status**: COMPLETE
**Completed**: 2026-02-10

**Duration**: 1.5 weeks (Week 11-12)
**Depends On**: Phase 2C (Admin Content - Basic Blog)
**Parallel With**: Phase 2I-B (SEO Suite), Phase 2I-C (UGC Gallery)
**Blocks**: None

---

## Goal

Implement advanced blog features including topic clustering for SEO authority, link health monitoring, 100-point quality scoring with E-E-A-T analysis, AI content tracking/compliance, and the best practices reference guide.

---

## Success Criteria

- [ ] Topic clusters with pillar-spoke structure
- [ ] Interactive cluster visualization (network graph)
- [ ] Link health analysis with issue detection
- [ ] 100-point quality scoring system
- [ ] E-E-A-T signal detection
- [ ] AI content tracking with human edit percentage
- [ ] Link suggestion engine
- [ ] Content freshness tracking
- [ ] Best practices documentation page

---

## Feature Overview

### Topic Clustering (Pillar-Spoke SEO Strategy)

**Purpose**: Build topical authority by organizing content into clusters where a comprehensive "pillar" post links to focused "spoke" posts.

**Implementation from RAWDOG**:
- Cluster creation with name, slug, description, target keywords
- Color-coded clusters for visual identification
- Pillar post assignment (one per cluster)
- Spoke post assignment (multiple per cluster)
- Automatic link suggestion between cluster members
- Interactive Cytoscape.js network visualization

**Database Schema**:
```sql
CREATE TABLE blog_clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description TEXT,
  target_keywords TEXT[], -- PostgreSQL array
  color VARCHAR(50) DEFAULT 'blue', -- 8 color options
  pillar_post_id UUID REFERENCES blog_posts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, slug)
);

CREATE TABLE blog_post_clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  cluster_id UUID NOT NULL REFERENCES blog_clusters(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'spoke', -- 'pillar' or 'spoke'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, post_id, cluster_id)
);
```

---

### Link Health Analysis

**Purpose**: Ensure internal linking best practices: no orphan posts, bidirectional pillar-spoke links, product links in content, authoritative external links.

**Health Score Calculation** (0-100%):
- Orphaned posts (no internal links to them) - CRITICAL issue
- One-way links (spoke doesn't link back to pillar) - WARNING issue
- Posts without product links - INFO issue
- External link authority mix (should include .gov, .edu, journals)

**Issue Types**:
```typescript
type LinkHealthIssue = {
  type: 'ORPHAN' | 'ONE_WAY' | 'NO_PRODUCT' | 'LOW_AUTHORITY'
  severity: 'critical' | 'warning' | 'info'
  postId: string
  postTitle: string
  details: string
  suggestedFix: string
}
```

**Authoritative Domains**:
- `.gov`, `.edu` domains
- Scientific journals (pubmed, nature, sciencedirect)
- Industry authorities (NIH, FDA, Mayo Clinic)

**Visualization**:
- Interactive Cytoscape.js network graph
- Node types: pillar (large), spoke (medium), unclustered (small)
- Cross-cluster links highlighted
- Click nodes to highlight in issues list

---

### Quality Scoring System (100 Points)

**Four Categories** (25 points each):

**1. SEO (25 pts)**:
- Title length (50-60 chars optimal): 5 pts
- Meta description (120-160 chars): 5 pts
- URL-friendly slug: 3 pts
- Content length (800+ words): 5 pts
- Featured image present: 3 pts
- Internal links (2+ recommended): 4 pts

**2. Readability (25 pts)**:
- Flesch Reading Ease (60+ target): 8 pts
- Short paragraphs (2-3 sentences): 5 pts
- Sentence length (<25 words avg): 4 pts
- Bullet points for lists: 4 pts
- Heading hierarchy (H2, H3 structure): 4 pts

**3. E-E-A-T (25 pts)**:
- Named author (not "Team"): 5 pts
- Author credentials present: 5 pts
- Experience phrases (3+ phrases): 5 pts
- External citations (2+ authoritative): 5 pts
- Author bio and photo: 5 pts

**4. Formatting (25 pts)**:
- No em dashes (use hyphens): 4 pts
- Correct brand name styling: 4 pts
- Excerpt present (150-160 chars): 5 pts
- Tags assigned (1-5 tags): 4 pts
- Category assigned: 4 pts
- Proper markdown structure: 4 pts

**AI Content Modifiers**:
- AI + Team Author: -3 E-E-A-T points
- AI + No Experience Phrases: -4 E-E-A-T points
- AI + <20% Human Edits: -10 overall + BLOCKED
- AI + 40%+ Human Edits: +5 bonus points

**Score Thresholds**:
| Range | Level | Action |
|-------|-------|--------|
| 80-100 | Excellent | Ready to publish |
| 65-79 | Good | Can publish with review |
| 50-64 | Needs Work | Review before publish |
| 0-49 | Poor | Major edits required |

---

### E-E-A-T Signal Detection

**Experience Phrases** (detected in content):
- "In our testing..."
- "When we formulated..."
- "In my experience..."
- "After X years of..."
- "We found that..."

**Author Requirements**:
- Real name (not "Team" or "Editorial")
- Profile photo (not stock/AI)
- Credentials (professional certs, degrees)
- Expertise areas (matched to topic)
- Social links (LinkedIn for schema sameAs)

**External Citation Detection**:
- .gov / .edu domains
- Peer-reviewed journals (PubMed, Nature)
- Industry authorities
- Mark citations as authoritative in link health

---

### AI Content Tracking

**Purpose**: Ensure AI-generated content meets quality standards and has sufficient human contribution.

**Tracked Fields**:
```typescript
interface AIContentTracking {
  isAiGenerated: boolean
  aiSource: 'MCP' | 'ChatGPT' | 'Claude' | 'Other' | null
  originalContent: string | null // Captured at AI generation
  currentContent: string
  humanEditPercentage: number // Calculated via diff algorithm
  lastCalculated: Date
}
```

**Human Edit Percentage Calculation**:
- Use Levenshtein distance or character diff
- Compare originalContent to currentContent
- Percentage = (changedChars / originalLength) * 100

**Edit Percentage Feedback**:
- **< 20%**: Red badge + publish BLOCKED
- **20-40%**: Amber badge + acceptable
- **40%+**: Green badge + bonus points

**UI Controls**:
- "Mark as AI-generated" toggle
- AI source selector dropdown
- "Capture current as original" button
- "Clear AI tracking" button
- Edit percentage progress bar

---

### Link Suggestion Engine

**Relevance Scoring** (0-100):
- Same cluster: +30 (pillar) / +20 (spoke)
- Same category: +15
- Shared tags: +5 per tag (max 25)
- Keyword overlap: +2 per keyword (max 20)
- Featured post: +10
- Recency (<90 days): +5

**Output**:
```typescript
interface LinkSuggestion {
  targetPostId: string
  targetTitle: string
  targetSlug: string
  relevanceScore: number
  matchReason: string
  matchDetails: string[]
  suggestedAnchor: string
  markdownLink: string // Ready to paste
}
```

**Features**:
- Exclude self-references and unpublished
- Skip already-linked posts
- Prioritize cluster connections
- Generate 5 suggestions by default

---

### Content Freshness Tracking

**Freshness Categories**:
- **Fresh**: Updated within 30 days
- **Aging**: Updated 31-90 days ago
- **Stale**: Updated 91-180 days ago
- **Outdated**: Updated 180+ days ago

**Dashboard**:
- Content freshness distribution chart
- Posts sorted by staleness
- Quick filter for stale/outdated
- Bulk refresh scheduling

---

### Best Practices Documentation Page

**Interactive guide covering**:
- Quality scoring breakdown (all 25 criteria)
- E-E-A-T requirements with examples
- AI content policy
- Formatting rules (do's and don'ts)
- Readability targets
- Author guidelines

**Implementation**: Static page with accordion sections and examples.

---

## Deliverables

### Database Layer
- [ ] `packages/db/src/schemas/blog-clusters.ts`
- [ ] `packages/db/src/schemas/blog-link-health.ts` (cached scores)

### Library Functions
- [ ] `apps/admin/src/lib/blog/quality-analyzer.ts`
- [ ] `apps/admin/src/lib/blog/readability.ts`
- [ ] `apps/admin/src/lib/blog/eeat-detector.ts`
- [ ] `apps/admin/src/lib/blog/link-analyzer.ts`
- [ ] `apps/admin/src/lib/blog/link-suggester.ts`
- [ ] `apps/admin/src/lib/blog/diff-calculator.ts`
- [ ] `apps/admin/src/lib/blog/content-freshness.ts`

### API Routes
- [ ] `apps/admin/src/app/api/admin/blog/clusters/route.ts`
- [ ] `apps/admin/src/app/api/admin/blog/clusters/[id]/route.ts`
- [ ] `apps/admin/src/app/api/admin/blog/link-health/route.ts`
- [ ] `apps/admin/src/app/api/admin/blog/quality/route.ts`
- [ ] `apps/admin/src/app/api/admin/blog/suggestions/route.ts`

### Admin Pages
- [ ] `apps/admin/src/app/admin/blog/clusters/page.tsx`
- [ ] `apps/admin/src/app/admin/blog/clusters/visualization/page.tsx`
- [ ] `apps/admin/src/app/admin/blog/link-health/page.tsx`
- [ ] `apps/admin/src/app/admin/blog/best-practices/page.tsx`

### Components
- [ ] `apps/admin/src/components/admin/blog/QualityScoreModal.tsx`
- [ ] `apps/admin/src/components/admin/blog/QualityScoreBadge.tsx`
- [ ] `apps/admin/src/components/admin/blog/ClusterGraph.tsx` (Cytoscape.js)
- [ ] `apps/admin/src/components/admin/blog/LinkHealthDashboard.tsx`
- [ ] `apps/admin/src/components/admin/blog/AIContentTracker.tsx`
- [ ] `apps/admin/src/components/admin/blog/LinkSuggestions.tsx`
- [ ] `apps/admin/src/components/admin/blog/FreshnessBadge.tsx`

---

## Constraints

- Quality scores must be calculated in real-time (< 200ms)
- Cluster visualization must handle 100+ posts
- Link health cache refreshed hourly via background job
- AI edit percentage diff algorithm must be deterministic

---

## Pattern References

**Skills to invoke:**
- `/frontend-design` - For quality modal, cluster graph, link health dashboard

**RAWDOG code to reference:**
- `src/app/admin/blog/clusters/` - Cluster management pattern
- `src/app/admin/blog/clusters/visualization/page.tsx` - Cytoscape.js usage
- `src/app/admin/blog/link-health/page.tsx` - Link health dashboard
- `src/app/admin/blog/best-practices/page.tsx` - Documentation page
- `src/lib/blog/quality-analyzer.ts` - Quality scoring implementation
- `src/lib/blog/readability.ts` - Readability analysis
- `src/lib/blog/eeat-detector.ts` - E-E-A-T detection
- `src/lib/blog/link-suggester.ts` - Link suggestions
- `src/lib/blog/diff-calculator.ts` - Human edit percentage

---

## Tasks

### [PARALLEL] Database & Types
- [ ] Create blog cluster schema
- [ ] Create blog post cluster junction table
- [ ] Create link health cache table
- [ ] Create all TypeScript types

### [PARALLEL] Library Functions
- [ ] Implement quality analyzer (4 categories, 25 criteria)
- [ ] Implement readability calculator (Flesch)
- [ ] Implement E-E-A-T detector
- [ ] Implement link analyzer (internal/external extraction)
- [ ] Implement link suggester (relevance scoring)
- [ ] Implement diff calculator (edit percentage)
- [ ] Implement content freshness helper

### [SEQUENTIAL after above] API Routes
- [ ] Cluster CRUD routes
- [ ] Link health analysis route
- [ ] Quality score route
- [ ] Link suggestion route

### [SEQUENTIAL after API] UI Components
- [ ] Quality score modal with breakdown
- [ ] Quality score badge
- [ ] Cluster visualization with Cytoscape.js
- [ ] Link health dashboard
- [ ] AI content tracker widget
- [ ] Link suggestions panel
- [ ] Freshness badge and dashboard

### [SEQUENTIAL after components] Admin Pages
- [ ] Clusters management page
- [ ] Cluster visualization page
- [ ] Link health page
- [ ] Best practices page
- [ ] Update blog post editor with quality score, AI tracking

---

## Definition of Done

- [ ] Topic clusters CRUD working with pillar/spoke assignments
- [ ] Cluster visualization renders interactive network graph
- [ ] Link health analysis detects all 4 issue types
- [ ] Quality scores calculate in real-time with breakdown modal
- [ ] E-E-A-T signals detected from author and content
- [ ] AI content tracking calculates human edit percentage
- [ ] Link suggestions show relevant posts with reasons
- [ ] Content freshness visible in post list
- [ ] Best practices page complete with all sections
- [ ] All tenant isolation patterns followed
- [ ] `npx tsc --noEmit` passes
