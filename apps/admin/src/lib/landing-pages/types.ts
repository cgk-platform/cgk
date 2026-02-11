/**
 * Landing page types for the admin content section
 */

export type PageStatus = 'draft' | 'published' | 'scheduled' | 'archived'

export interface LandingPage {
  id: string
  slug: string
  title: string
  description: string | null
  status: PageStatus
  published_at: string | null
  scheduled_at: string | null
  blocks: Block[]
  meta_title: string | null
  meta_description: string | null
  og_image_url: string | null
  canonical_url: string | null
  structured_data: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface LandingPageRow {
  id: string
  slug: string
  title: string
  description: string | null
  status: PageStatus
  published_at: string | null
  scheduled_at: string | null
  block_count: number
  created_at: string
  updated_at: string
}

export interface Block {
  id: string
  type: BlockType
  config: BlockConfig
  order: number
}

export interface BlockConfig {
  [key: string]: unknown
}

// All 70+ block types organized by category
export type BlockType =
  // PDP Blocks
  | 'pdp-hero'
  | 'pdp-trust-badges'
  | 'pdp-science-section'
  | 'pdp-usage-guide'
  | 'pdp-ready-to-buy'
  | 'pdp-ingredient-deep-dive'
  | 'pdp-featured-reviews'
  | 'pdp-yotpo-reviews'
  | 'pdp-recommendations'
  | 'pdp-benefits-grid'
  | 'pdp-before-after'
  | 'pdp-video-testimonial'
  | 'pdp-comparison-table'
  | 'pdp-how-it-works'
  | 'pdp-subscription-options'
  // Promo Blocks
  | 'bundle-builder'
  | 'promo-hero'
  | 'feature-cards'
  | 'text-banner'
  | 'faq-lifestyle'
  | 'countdown-timer'
  | 'sale-banner'
  | 'flash-sale'
  | 'gift-with-purchase'
  | 'tiered-discount'
  // Core Blocks
  | 'hero'
  | 'benefits'
  | 'reviews'
  | 'cta-banner'
  | 'markdown'
  | 'rich-text'
  | 'image'
  | 'video'
  | 'spacer'
  | 'divider'
  // Content Blocks
  | 'text-image'
  | 'image-text'
  | 'two-column'
  | 'three-column'
  | 'four-column'
  | 'grid'
  | 'masonry'
  | 'carousel'
  | 'slider'
  | 'tabs'
  | 'accordion'
  | 'timeline'
  // Social Proof
  | 'testimonials'
  | 'logo-bar'
  | 'press-mentions'
  | 'instagram-feed'
  | 'ugc-gallery'
  | 'trust-signals'
  | 'certifications'
  | 'awards'
  // Commerce Blocks
  | 'product-grid'
  | 'product-carousel'
  | 'collection-list'
  | 'featured-product'
  | 'quick-add'
  | 'mini-cart'
  | 'subscription-box'
  | 'gift-card'
  // Interactive Blocks
  | 'quiz'
  | 'survey'
  | 'calculator'
  | 'configurator'
  | 'size-guide'
  | 'ingredients-lookup'
  | 'store-locator'
  | 'contact-form'
  | 'newsletter-signup'
  // FAQ & Support
  | 'faq-accordion'
  | 'faq-categories'
  | 'help-center'
  | 'chat-widget'
  // Custom
  | 'html-embed'
  | 'script-embed'
  | 'custom-component'

export interface BlockCategory {
  id: string
  name: string
  description: string
  types: BlockType[]
}

export const BLOCK_CATEGORIES: BlockCategory[] = [
  {
    id: 'pdp',
    name: 'Product Detail',
    description: 'Blocks optimized for product pages',
    types: [
      'pdp-hero', 'pdp-trust-badges', 'pdp-science-section', 'pdp-usage-guide',
      'pdp-ready-to-buy', 'pdp-ingredient-deep-dive', 'pdp-featured-reviews',
      'pdp-yotpo-reviews', 'pdp-recommendations', 'pdp-benefits-grid',
      'pdp-before-after', 'pdp-video-testimonial', 'pdp-comparison-table',
      'pdp-how-it-works', 'pdp-subscription-options',
    ],
  },
  {
    id: 'promo',
    name: 'Promotions',
    description: 'Sales and promotional blocks',
    types: [
      'bundle-builder', 'promo-hero', 'feature-cards', 'text-banner',
      'faq-lifestyle', 'countdown-timer', 'sale-banner', 'flash-sale',
      'gift-with-purchase', 'tiered-discount',
    ],
  },
  {
    id: 'core',
    name: 'Core',
    description: 'Essential building blocks',
    types: [
      'hero', 'benefits', 'reviews', 'cta-banner', 'markdown', 'rich-text',
      'image', 'video', 'spacer', 'divider',
    ],
  },
  {
    id: 'content',
    name: 'Content Layout',
    description: 'Content organization blocks',
    types: [
      'text-image', 'image-text', 'two-column', 'three-column', 'four-column',
      'grid', 'masonry', 'carousel', 'slider', 'tabs', 'accordion', 'timeline',
    ],
  },
  {
    id: 'social',
    name: 'Social Proof',
    description: 'Trust and credibility blocks',
    types: [
      'testimonials', 'logo-bar', 'press-mentions', 'instagram-feed',
      'ugc-gallery', 'trust-signals', 'certifications', 'awards',
    ],
  },
  {
    id: 'commerce',
    name: 'Commerce',
    description: 'Product and shopping blocks',
    types: [
      'product-grid', 'product-carousel', 'collection-list', 'featured-product',
      'quick-add', 'mini-cart', 'subscription-box', 'gift-card',
    ],
  },
  {
    id: 'interactive',
    name: 'Interactive',
    description: 'Engagement and conversion blocks',
    types: [
      'quiz', 'survey', 'calculator', 'configurator', 'size-guide',
      'ingredients-lookup', 'store-locator', 'contact-form', 'newsletter-signup',
    ],
  },
  {
    id: 'faq',
    name: 'FAQ & Support',
    description: 'Help and support blocks',
    types: ['faq-accordion', 'faq-categories', 'help-center', 'chat-widget'],
  },
  {
    id: 'custom',
    name: 'Custom',
    description: 'Advanced customization',
    types: ['html-embed', 'script-embed', 'custom-component'],
  },
]

export interface PageFilters {
  page: number
  limit: number
  offset: number
  search: string
  status: string
  sort: string
  dir: 'asc' | 'desc'
}

export interface CreatePageInput {
  slug: string
  title: string
  description?: string
  status: PageStatus
  scheduled_at?: string
  blocks?: Block[]
  meta_title?: string
  meta_description?: string
  og_image_url?: string
  canonical_url?: string
  structured_data?: Record<string, unknown>
}

export interface UpdatePageInput extends Partial<CreatePageInput> {
  id: string
}

export interface SEOSettings {
  default_title_template: string
  default_description: string
  site_name: string
  og_default_image: string | null
  twitter_handle: string | null
  google_site_verification: string | null
  bing_site_verification: string | null
  robots_txt: string
  sitemap_enabled: boolean
}
