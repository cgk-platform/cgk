/**
 * SEO Management types
 */

// Priority levels for keywords
export type KeywordPriority = 'high' | 'medium' | 'low'

// Gap types for content analysis
export type GapType = 'no_content' | 'weak_content' | 'no_dedicated_page'

// Trend status
export type TrendStatus = 'improving' | 'declining' | 'stable'

// Issue severity levels
export type IssueSeverity = 'error' | 'warning' | 'suggestion'

// SEO Keyword
export interface SEOKeyword {
  id: string
  keyword: string
  priority: KeywordPriority
  target_url: string | null
  current_position: number | null
  clicks: number
  impressions: number
  ctr: number | null
  linked_post_ids: string[]
  last_synced_at: string | null
  created_at: string
  updated_at: string
}

// Keyword with trend data
export interface SEOKeywordWithTrend extends SEOKeyword {
  trend_7d: TrendStatus
  trend_30d: TrendStatus
  trend_90d: TrendStatus
  position_change_7d: number | null
  position_change_30d: number | null
  position_change_90d: number | null
}

// Keyword history record
export interface KeywordHistory {
  id: string
  keyword_id: string
  position: number | null
  clicks: number | null
  impressions: number | null
  ctr: number | null
  recorded_at: string
}

// Input for creating keywords
export interface CreateKeywordInput {
  keyword: string
  priority?: KeywordPriority
  target_url?: string
  linked_post_ids?: string[]
}

// Input for updating keywords
export interface UpdateKeywordInput {
  id: string
  priority?: KeywordPriority
  target_url?: string | null
  linked_post_ids?: string[]
}

// Content Gap
export interface ContentGap {
  id: string
  keyword: string
  gap_type: GapType
  relevance_score: number | null
  search_volume: number | null
  difficulty: number | null
  cpc: number | null
  competitor_url: string | null
  analyzed_at: string
}

// Content gap analysis result
export interface ContentGapAnalysis {
  keyword: string
  gap_type: GapType
  relevance_score: number
  matched_posts: Array<{
    id: string
    title: string
    slug: string
    match_type: 'primary' | 'secondary' | 'title' | 'content'
  }>
}

// SEO Redirect
export interface SEORedirect {
  id: string
  source: string
  destination: string
  status_code: number
  note: string | null
  hits: number
  last_hit_at: string | null
  created_at: string
  updated_at: string
}

// Input for creating redirects
export interface CreateRedirectInput {
  source: string
  destination: string
  status_code?: number
  note?: string
}

// Input for updating redirects
export interface UpdateRedirectInput {
  id: string
  source?: string
  destination?: string
  status_code?: number
  note?: string | null
}

// Redirect CSV row
export interface RedirectCSVRow {
  source: string
  destination: string
  status_code: number
  note: string
}

// Schema validation issue
export interface SchemaIssue {
  type: IssueSeverity
  field: string
  message: string
}

// Schema validation result for a post
export interface SchemaValidationResult {
  postId: string
  postTitle: string
  postSlug: string
  hasArticleSchema: boolean
  hasBreadcrumbSchema: boolean
  hasAuthorSchema: boolean
  hasOrganizationSchema: boolean
  overallScore: number
  issues: SchemaIssue[]
  generatedSchema: {
    article: Record<string, unknown>
    breadcrumb: Record<string, unknown>
  }
}

// Page SEO Analysis
export interface PageSEOAnalysis {
  url: string
  score: number
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

// SEO Audit
export interface SEOAudit {
  id: string
  total_pages: number
  average_score: number
  critical_issues: number
  warnings: number
  passed: number
  page_results: PageSEOAnalysis[]
  started_at: string
  completed_at: string | null
}

// GSC Credentials (for display, tokens excluded)
export interface GSCConnection {
  id: string
  site_url: string
  is_connected: boolean
  last_error: string | null
  connected_at: string
  updated_at: string
}

// GSC Sync Result
export interface GSCSyncResult {
  keyword: string
  position: number | null
  clicks: number
  impressions: number
  ctr: number
  dateRange: {
    start: string
    end: string
  }
}

// Keyword filters
export interface KeywordFilters {
  page: number
  limit: number
  offset: number
  search: string
  priority: string
  sort: string
  dir: 'asc' | 'desc'
}

// Redirect filters
export interface RedirectFilters {
  page: number
  limit: number
  offset: number
  search: string
  sort: string
  dir: 'asc' | 'desc'
}

// Audit summary for dashboard
export interface AuditSummary {
  latestAudit: SEOAudit | null
  previousAudit: SEOAudit | null
  scoreChange: number
  totalAudits: number
}

// Keyword stats for dashboard
export interface KeywordStats {
  totalKeywords: number
  avgPosition: number | null
  totalClicks: number
  totalImpressions: number
  topKeywords: SEOKeywordWithTrend[]
  improvingKeywords: number
  decliningKeywords: number
}

// Redirect stats for dashboard
export interface RedirectStats {
  totalRedirects: number
  totalHits: number
  mostUsed: SEORedirect[]
  recentlyAdded: SEORedirect[]
  neverUsedCount: number
}

// Dashboard data
export interface SEODashboardData {
  gscConnection: GSCConnection | null
  keywordStats: KeywordStats
  redirectStats: RedirectStats
  auditSummary: AuditSummary
  contentGaps: ContentGap[]
}
