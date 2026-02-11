/**
 * Blog types for the admin content section
 * Includes advanced features: clusters, quality scoring, AI tracking, link health
 */

export type PostStatus = 'draft' | 'published' | 'scheduled' | 'archived'

export type AISource = 'MCP' | 'ChatGPT' | 'Claude' | 'Other'

export type ClusterColor = 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'pink' | 'orange' | 'teal'

export type ClusterRole = 'pillar' | 'spoke'

export type FreshnessCategory = 'fresh' | 'aging' | 'stale' | 'outdated'

export type LinkHealthIssueType = 'ORPHAN' | 'ONE_WAY' | 'NO_PRODUCT' | 'LOW_AUTHORITY'

export type LinkHealthSeverity = 'critical' | 'warning' | 'info'

export interface BlogPost {
  id: string
  slug: string
  title: string
  excerpt: string | null
  content: string
  featured_image_url: string | null
  status: PostStatus
  published_at: string | null
  scheduled_at: string | null
  author_id: string | null
  category_id: string | null
  tags: string[]
  meta_title: string | null
  meta_description: string | null
  og_image_url: string | null
  canonical_url: string | null
  created_at: string
  updated_at: string
  // AI content tracking
  is_ai_generated: boolean
  ai_source: AISource | null
  original_content: string | null
  human_edit_percentage: number | null
  ai_tracking_calculated_at: string | null
  // Quality score cache
  quality_score: number | null
  quality_breakdown: QualityBreakdown | null
  quality_calculated_at: string | null
}

export interface BlogPostRow extends BlogPost {
  author_name: string | null
  category_name: string | null
}

export interface BlogCategory {
  id: string
  slug: string
  name: string
  description: string | null
  parent_id: string | null
  post_count: number
  created_at: string
  updated_at: string
}

export interface BlogAuthor {
  id: string
  name: string
  bio: string | null
  avatar_url: string | null
  email: string | null
  social_links: AuthorSocialLinks
  credentials: string[]
  expertise_areas: string[]
  is_team_account: boolean
  post_count: number
  created_at: string
  updated_at: string
}

export interface AuthorSocialLinks {
  twitter?: string
  linkedin?: string
  instagram?: string
  website?: string
}

export interface BlogFilters {
  page: number
  limit: number
  offset: number
  search: string
  status: string
  category: string
  author: string
  sort: string
  dir: 'asc' | 'desc'
}

export interface CreatePostInput {
  slug: string
  title: string
  excerpt?: string
  content: string
  featured_image_url?: string
  status: PostStatus
  scheduled_at?: string
  author_id?: string
  category_id?: string
  tags?: string[]
  meta_title?: string
  meta_description?: string
  og_image_url?: string
  canonical_url?: string
}

export interface UpdatePostInput extends Partial<CreatePostInput> {
  id: string
}

export interface CreateCategoryInput {
  slug: string
  name: string
  description?: string
  parent_id?: string
}

export interface CreateAuthorInput {
  name: string
  bio?: string
  avatar_url?: string
  email?: string
  social_links?: AuthorSocialLinks
  credentials?: string[]
  expertise_areas?: string[]
  is_team_account?: boolean
}

// ============================================
// Topic Clustering Types
// ============================================

export interface BlogCluster {
  id: string
  name: string
  slug: string
  description: string | null
  target_keywords: string[]
  color: ClusterColor
  pillar_post_id: string | null
  created_at: string
  updated_at: string
  // Computed fields
  post_count?: number
  pillar_post?: BlogPost | null
}

export interface BlogPostCluster {
  id: string
  post_id: string
  cluster_id: string
  role: ClusterRole
  created_at: string
}

export interface CreateClusterInput {
  name: string
  slug: string
  description?: string
  target_keywords?: string[]
  color?: ClusterColor
  pillar_post_id?: string
}

export interface UpdateClusterInput extends Partial<CreateClusterInput> {
  id: string
}

export interface ClusterWithPosts extends BlogCluster {
  posts: BlogPostRow[]
  pillar_post: BlogPostRow | null
}

// ============================================
// Quality Scoring Types
// ============================================

export interface QualityBreakdown {
  seo: QualityCategoryScore
  readability: QualityCategoryScore
  eeat: QualityCategoryScore
  formatting: QualityCategoryScore
}

export interface QualityCategoryScore {
  score: number
  maxScore: number
  checks: QualityCheck[]
}

export interface QualityCheck {
  name: string
  passed: boolean
  points: number
  maxPoints: number
  message: string
}

export interface QualityScoreResult {
  totalScore: number
  maxScore: number
  breakdown: QualityBreakdown
  level: 'excellent' | 'good' | 'needs_work' | 'poor'
  aiModifiers: AIModifier[]
  publishBlocked: boolean
  blockReason: string | null
}

export interface AIModifier {
  type: string
  points: number
  reason: string
}

// ============================================
// E-E-A-T Types
// ============================================

export interface EEATAnalysis {
  score: number
  maxScore: number
  hasNamedAuthor: boolean
  hasAuthorCredentials: boolean
  experiencePhraseCount: number
  authoritativeCitationCount: number
  hasAuthorBioAndPhoto: boolean
  detectedExperiencePhrases: string[]
  authoritativeDomains: string[]
}

// ============================================
// Readability Types
// ============================================

export interface ReadabilityAnalysis {
  fleschReadingEase: number
  averageSentenceLength: number
  averageParagraphLength: number
  hasBulletPoints: boolean
  hasProperHeadingHierarchy: boolean
  wordCount: number
  sentenceCount: number
  paragraphCount: number
}

// ============================================
// Link Health Types
// ============================================

export interface LinkHealthIssue {
  type: LinkHealthIssueType
  severity: LinkHealthSeverity
  postId: string
  postTitle: string
  details: string
  suggestedFix: string
}

export interface LinkHealthAnalysis {
  healthScore: number
  totalPosts: number
  orphanedPosts: number
  oneWayLinks: number
  postsWithoutProducts: number
  lowAuthorityPosts: number
  issues: LinkHealthIssue[]
  analyzedAt: string
}

export interface ExtractedLink {
  url: string
  text: string
  isInternal: boolean
  isAuthoritative: boolean
  domain: string | null
}

export interface PostLinkAnalysis {
  postId: string
  internalLinks: ExtractedLink[]
  externalLinks: ExtractedLink[]
  incomingLinks: string[] // Post IDs that link to this post
  hasProductLinks: boolean
  authoritativeExternalCount: number
}

// ============================================
// Link Suggestion Types
// ============================================

export interface LinkSuggestion {
  targetPostId: string
  targetTitle: string
  targetSlug: string
  relevanceScore: number
  matchReason: string
  matchDetails: string[]
  suggestedAnchor: string
  markdownLink: string
}

// ============================================
// Content Freshness Types
// ============================================

export interface ContentFreshness {
  postId: string
  lastUpdated: string
  daysSinceUpdate: number
  category: FreshnessCategory
}

export interface FreshnessDistribution {
  fresh: number
  aging: number
  stale: number
  outdated: number
  total: number
}

// ============================================
// Cluster Visualization Types
// ============================================

export interface ClusterNode {
  id: string
  label: string
  type: 'pillar' | 'spoke' | 'unclustered'
  clusterId: string | null
  clusterColor: ClusterColor | null
  url: string
}

export interface ClusterEdge {
  source: string
  target: string
  isCrossCluster: boolean
}

export interface ClusterGraphData {
  nodes: ClusterNode[]
  edges: ClusterEdge[]
}
