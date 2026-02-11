/**
 * Knowledge Base types for customer support self-service
 * All KB data is tenant-scoped
 */

// Category for organizing articles
export interface KBCategory {
  id: string
  slug: string
  name: string
  description: string | null
  icon: string | null
  sortOrder: number
  articleCount: number
  createdAt: string
  updatedAt: string
}

// Row type from database
export interface KBCategoryRow {
  id: string
  slug: string
  name: string
  description: string | null
  icon: string | null
  sort_order: number
  article_count: number
  created_at: string
  updated_at: string
}

// Knowledge base article
export interface KBArticle {
  id: string
  slug: string
  title: string
  content: string
  excerpt: string | null
  categoryId: string | null
  tags: string[]
  isPublished: boolean
  isInternal: boolean
  viewCount: number
  helpfulCount: number
  notHelpfulCount: number
  authorId: string | null
  metaTitle: string | null
  metaDescription: string | null
  createdAt: string
  updatedAt: string
  publishedAt: string | null
}

// Row type from database
export interface KBArticleRow {
  id: string
  slug: string
  title: string
  content: string
  excerpt: string | null
  category_id: string | null
  tags: string[]
  is_published: boolean
  is_internal: boolean
  view_count: number
  helpful_count: number
  not_helpful_count: number
  author_id: string | null
  meta_title: string | null
  meta_description: string | null
  created_at: string
  updated_at: string
  published_at: string | null
  // Joined fields
  category_name?: string | null
  category_slug?: string | null
  author_name?: string | null
  author_email?: string | null
}

// Article with category info for display
export interface KBArticleWithCategory extends KBArticle {
  category?: {
    id: string
    slug: string
    name: string
    icon: string | null
  } | null
  author?: {
    id: string
    name: string
    email: string
  } | null
}

// Article feedback
export interface KBArticleFeedback {
  id: string
  articleId: string
  isHelpful: boolean
  comment: string | null
  visitorId: string | null
  createdAt: string
}

export interface KBArticleFeedbackRow {
  id: string
  article_id: string
  is_helpful: boolean
  comment: string | null
  visitor_id: string | null
  created_at: string
}

// Article version for history/drafts
export interface KBArticleVersion {
  id: string
  articleId: string
  title: string
  content: string
  excerpt: string | null
  versionNumber: number
  isDraft: boolean
  createdBy: string | null
  createdAt: string
}

export interface KBArticleVersionRow {
  id: string
  article_id: string
  title: string
  content: string
  excerpt: string | null
  version_number: number
  is_draft: boolean
  created_by: string | null
  created_at: string
}

// Input types for creating/updating

export interface CreateCategoryInput {
  slug: string
  name: string
  description?: string
  icon?: string
  sortOrder?: number
}

export interface UpdateCategoryInput {
  slug?: string
  name?: string
  description?: string | null
  icon?: string | null
  sortOrder?: number
}

export interface CreateArticleInput {
  slug: string
  title: string
  content: string
  excerpt?: string
  categoryId?: string
  tags?: string[]
  isPublished?: boolean
  isInternal?: boolean
  authorId?: string
  metaTitle?: string
  metaDescription?: string
}

export interface UpdateArticleInput {
  slug?: string
  title?: string
  content?: string
  excerpt?: string | null
  categoryId?: string | null
  tags?: string[]
  isPublished?: boolean
  isInternal?: boolean
  metaTitle?: string | null
  metaDescription?: string | null
}

export interface FeedbackInput {
  isHelpful: boolean
  comment?: string
  visitorId?: string
}

// Filter types

export interface ArticleFilters {
  page: number
  limit: number
  offset: number
  search: string
  categoryId: string
  isPublished?: boolean
  isInternal?: boolean
  sort: string
  dir: 'asc' | 'desc'
}

export interface SearchOptions {
  includeInternal?: boolean
  categoryId?: string
  limit?: number
}

// Search result with ranking
export interface SearchResult {
  article: KBArticleWithCategory
  rank: number
  highlights?: {
    title?: string
    content?: string
  }
}

// Analytics types
export interface KBAnalytics {
  totalArticles: number
  publishedArticles: number
  draftArticles: number
  internalArticles: number
  totalViews: number
  totalHelpful: number
  totalNotHelpful: number
  helpfulRate: number
  topArticles: Array<{
    id: string
    title: string
    slug: string
    viewCount: number
    helpfulRate: number
  }>
  categoryBreakdown: Array<{
    categoryId: string
    categoryName: string
    articleCount: number
    totalViews: number
  }>
  recentFeedback: Array<{
    articleId: string
    articleTitle: string
    isHelpful: boolean
    comment: string | null
    createdAt: string
  }>
}

// Paginated results
export interface PaginatedArticles {
  rows: KBArticleRow[]
  totalCount: number
}

// Default category icons (emoji)
export const DEFAULT_CATEGORY_ICONS: Record<string, string> = {
  'getting-started': '🚀',
  'account': '👤',
  'products': '📦',
  'shipping': '🚚',
  'creators': '⭐',
  'billing': '💳',
  'returns': '↩️',
  'faq': '❓',
}

// Default categories for new tenants
export const DEFAULT_CATEGORIES: Array<Omit<CreateCategoryInput, 'slug'> & { slug: string }> = [
  {
    slug: 'getting-started',
    name: 'Getting Started',
    description: 'Learn the basics',
    icon: '🚀',
    sortOrder: 0,
  },
  {
    slug: 'account',
    name: 'Account & Billing',
    description: 'Manage your account',
    icon: '👤',
    sortOrder: 1,
  },
  {
    slug: 'products',
    name: 'Products & Orders',
    description: 'Product information and ordering',
    icon: '📦',
    sortOrder: 2,
  },
  {
    slug: 'shipping',
    name: 'Shipping & Returns',
    description: 'Delivery and return policies',
    icon: '🚚',
    sortOrder: 3,
  },
]
