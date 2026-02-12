/**
 * Landing Page Block Types and Configurations
 *
 * Defines all block types available in the landing page builder.
 * Each block type has specific configuration options.
 */

// ============================================================================
// Block Type Registry
// ============================================================================

/**
 * All available block types organized by category
 */
export type BlockType =
  // Core blocks - Essential building blocks
  | 'hero'
  | 'benefits'
  | 'reviews'
  | 'markdown'
  | 'cta-banner'
  | 'ugc-banner'
  | 'trust-signals'
  | 'product-lineup'
  | 'blog-grid'
  | 'thank-you-content'
  // Interactive blocks
  | 'faq'
  | 'countdown'
  | 'community'
  | 'contact-form'
  // Layout blocks
  | 'image-text'
  | 'video-embed'
  | 'testimonial'
  | 'icon-grid'
  | 'spacer'
  | 'divider'
  // Promo blocks
  | 'promo-countdown'
  | 'promo-hero'
  | 'text-banner'
  | 'split-text-banner'
  | 'centered-text'
  | 'feature-cards'
  | 'promo-buy-box'
  | 'dynamic-reviews'
  | 'bundle-builder'
  | 'faq-lifestyle'
  // PDP blocks
  | 'pdp-hero'
  | 'pdp-trust-badges'
  | 'pdp-ready-to-buy'
  | 'pdp-recommendations'
  | 'pdp-before-after'
  | 'pdp-science-section'
  | 'pdp-usage-guide'
  | 'pdp-ingredient-deep-dive'
  | 'pdp-bundle-why'
  | 'pdp-bundle-included'
  | 'pdp-bundle-pricing'
  | 'pdp-featured-reviews'
  | 'pdp-yotpo-reviews'
  | 'pdp-lifestyle-image'
  // Shop blocks
  | 'shop-all-hero'
  | 'shop-all-countdown'
  | 'shop-all-why-choose'
  | 'shop-all-testimonials'
  | 'shop-all-cta'
  // Policy blocks
  | 'policy-header'
  | 'policy-content'
  | 'policy-contact'
  | 'policy-notice'
  | 'text-content'
  // About blocks
  | 'about-hero'
  | 'brand-story'
  | 'founder-section'
  | 'mission-values'
  | 'team-section'
  | 'manifesto-section'
  // Science blocks
  | 'science-hero'
  | 'philosophy-principles'
  | 'ingredient-exclusions'
  | 'biomimetic-technology'
  | 'endocrine-health'
  | 'peptide-technology'
  | 'product-deep-dive'
  | 'brand-comparison'
  | 'full-width-cta'
  // Brand-specific blocks
  | 'results'
  | 'rawdog-standard'
  | 'no-mens-brand'
  | 'new-standard'
  | 'upgrade'
  | 'science'
  | 'health-matrix'

/**
 * Block category for organizing in palette
 */
export type BlockCategory =
  | 'core'
  | 'brand'
  | 'interactive'
  | 'layout'
  | 'promo'
  | 'pdp'
  | 'shop'
  | 'policy'
  | 'about'
  | 'science'

// ============================================================================
// Block Configuration Types
// ============================================================================

/**
 * Common button configuration
 */
export interface ButtonConfig {
  text: string
  href: string
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  openInNewTab?: boolean
}

/**
 * Common image configuration
 */
export interface ImageConfig {
  src: string
  alt: string
  width?: number
  height?: number
  priority?: boolean
}

/**
 * Hero block configuration
 */
export interface HeroConfig {
  headline: string
  subheadline?: string
  description?: string
  backgroundImage?: ImageConfig
  backgroundColor?: string
  overlayOpacity?: number
  textAlignment?: 'left' | 'center' | 'right'
  primaryButton?: ButtonConfig
  secondaryButton?: ButtonConfig
  badge?: string
  height?: 'sm' | 'md' | 'lg' | 'full'
  showScrollIndicator?: boolean
}

/**
 * Benefit item for benefits block
 */
export interface BenefitItem {
  icon?: string
  iconColor?: string
  title: string
  description: string
  image?: ImageConfig
}

/**
 * Benefits block configuration
 */
export interface BenefitsConfig {
  headline?: string
  subheadline?: string
  items: BenefitItem[]
  columns?: 2 | 3 | 4
  layout?: 'grid' | 'list' | 'alternating'
  showDividers?: boolean
  backgroundColor?: string
}

/**
 * Review item for reviews block
 */
export interface ReviewItem {
  id: string
  author: string
  rating: number
  content: string
  date?: string
  verified?: boolean
  avatar?: ImageConfig
  productName?: string
}

/**
 * Reviews block configuration
 */
export interface ReviewsConfig {
  headline?: string
  subheadline?: string
  reviews: ReviewItem[]
  layout?: 'grid' | 'carousel' | 'masonry'
  showRatingsSummary?: boolean
  averageRating?: number
  totalReviews?: number
  backgroundColor?: string
}

/**
 * Markdown block configuration
 */
export interface MarkdownConfig {
  content: string
  maxWidth?: 'sm' | 'md' | 'lg' | 'full'
  textAlignment?: 'left' | 'center' | 'right'
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

/**
 * CTA Banner block configuration
 */
export interface CTABannerConfig {
  headline: string
  description?: string
  button: ButtonConfig
  backgroundColor?: string
  backgroundImage?: ImageConfig
  textColor?: string
  layout?: 'centered' | 'split'
  showPattern?: boolean
}

/**
 * Trust signal item
 */
export interface TrustSignalItem {
  icon: string
  text: string
  subtext?: string
}

/**
 * Trust signals block configuration
 */
export interface TrustSignalsConfig {
  signals: TrustSignalItem[]
  layout?: 'inline' | 'grid'
  showDividers?: boolean
  backgroundColor?: string
}

/**
 * FAQ item
 */
export interface FAQItem {
  question: string
  answer: string
}

/**
 * FAQ block configuration
 */
export interface FAQConfig {
  headline?: string
  subheadline?: string
  items: FAQItem[]
  layout?: 'accordion' | 'grid'
  allowMultipleOpen?: boolean
  backgroundColor?: string
}

/**
 * Countdown block configuration
 */
export interface CountdownConfig {
  headline?: string
  targetDate: string
  endBehavior?: 'hide' | 'show-message'
  endMessage?: string
  showDays?: boolean
  showHours?: boolean
  showMinutes?: boolean
  showSeconds?: boolean
  backgroundColor?: string
  style?: 'minimal' | 'boxed' | 'circular'
}

/**
 * Contact form block configuration
 */
export interface ContactFormConfig {
  headline?: string
  description?: string
  submitButtonText?: string
  successMessage?: string
  fields: Array<{
    name: string
    label: string
    type: 'text' | 'email' | 'textarea' | 'select'
    required?: boolean
    options?: string[]
  }>
  submitEndpoint?: string
}

/**
 * Image-Text block configuration
 */
export interface ImageTextConfig {
  headline: string
  description: string
  image: ImageConfig
  imagePosition?: 'left' | 'right'
  button?: ButtonConfig
  backgroundColor?: string
  verticalAlign?: 'top' | 'center' | 'bottom'
}

/**
 * Video embed block configuration
 */
export interface VideoEmbedConfig {
  headline?: string
  description?: string
  videoUrl: string
  provider?: 'youtube' | 'vimeo' | 'mux' | 'custom'
  thumbnailImage?: ImageConfig
  autoplay?: boolean
  controls?: boolean
  loop?: boolean
  aspectRatio?: '16:9' | '4:3' | '1:1' | '9:16'
}

/**
 * Testimonial block configuration
 */
export interface TestimonialConfig {
  quote: string
  author: string
  role?: string
  company?: string
  avatar?: ImageConfig
  rating?: number
  backgroundColor?: string
  style?: 'card' | 'minimal' | 'featured'
}

/**
 * Icon grid item
 */
export interface IconGridItem {
  icon: string
  title: string
  description?: string
}

/**
 * Icon grid block configuration
 */
export interface IconGridConfig {
  headline?: string
  subheadline?: string
  items: IconGridItem[]
  columns?: 2 | 3 | 4 | 6
  iconSize?: 'sm' | 'md' | 'lg'
  showDescriptions?: boolean
  backgroundColor?: string
}

/**
 * Spacer block configuration
 */
export interface SpacerConfig {
  height: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  showOnMobile?: boolean
}

/**
 * Divider block configuration
 */
export interface DividerConfig {
  style?: 'solid' | 'dashed' | 'dotted' | 'gradient'
  color?: string
  width?: 'full' | 'half' | 'quarter'
  margin?: 'sm' | 'md' | 'lg'
}

/**
 * Feature card item
 */
export interface FeatureCardItem {
  icon?: string
  image?: ImageConfig
  title: string
  description: string
  button?: ButtonConfig
  badge?: string
}

/**
 * Feature cards block configuration
 */
export interface FeatureCardsConfig {
  headline?: string
  subheadline?: string
  cards: FeatureCardItem[]
  columns?: 2 | 3 | 4
  cardStyle?: 'elevated' | 'bordered' | 'flat'
  backgroundColor?: string
}

/**
 * Text banner block configuration
 */
export interface TextBannerConfig {
  text: string
  backgroundColor?: string
  textColor?: string
  size?: 'sm' | 'md' | 'lg'
  animate?: boolean
}

/**
 * Centered text block configuration
 */
export interface CenteredTextConfig {
  headline: string
  description?: string
  maxWidth?: 'sm' | 'md' | 'lg'
  textSize?: 'sm' | 'md' | 'lg' | 'xl'
  backgroundColor?: string
}

/**
 * Product lineup item
 */
export interface ProductLineupItem {
  productId: string
  badge?: string
  customTitle?: string
  customDescription?: string
}

/**
 * Product lineup block configuration
 */
export interface ProductLineupConfig {
  headline?: string
  subheadline?: string
  products: ProductLineupItem[]
  layout?: 'grid' | 'carousel'
  columns?: 2 | 3 | 4
  showPrices?: boolean
  showAddToCart?: boolean
  backgroundColor?: string
}

/**
 * UGC Banner block configuration
 */
export interface UGCBannerConfig {
  headline?: string
  images: ImageConfig[]
  layout?: 'grid' | 'masonry' | 'carousel'
  columns?: 3 | 4 | 5
  instagramHandle?: string
  showCaptions?: boolean
}

/**
 * Community block configuration
 */
export interface CommunityConfig {
  headline?: string
  description?: string
  stats?: Array<{
    value: string
    label: string
  }>
  socialLinks?: Array<{
    platform: string
    url: string
  }>
  backgroundColor?: string
}

/**
 * Blog grid item
 */
export interface BlogGridItem {
  id: string
  title: string
  excerpt?: string
  image?: ImageConfig
  author?: string
  date?: string
  slug: string
  category?: string
}

/**
 * Blog grid block configuration
 */
export interface BlogGridConfig {
  headline?: string
  posts: BlogGridItem[]
  columns?: 2 | 3
  showExcerpts?: boolean
  showDates?: boolean
  showAuthors?: boolean
  backgroundColor?: string
}

/**
 * Thank you content block configuration
 */
export interface ThankYouContentConfig {
  headline: string
  description?: string
  orderConfirmation?: boolean
  nextSteps?: string[]
  socialSharing?: boolean
  backgroundColor?: string
}

// ============================================================================
// Block Definition
// ============================================================================

/**
 * Landing page block definition
 */
export interface LandingPageBlock {
  id: string
  type: BlockType
  order: number
  config: BlockConfig
}

/**
 * Block configuration union type
 */
export type BlockConfig =
  | HeroConfig
  | BenefitsConfig
  | ReviewsConfig
  | MarkdownConfig
  | CTABannerConfig
  | TrustSignalsConfig
  | FAQConfig
  | CountdownConfig
  | ContactFormConfig
  | ImageTextConfig
  | VideoEmbedConfig
  | TestimonialConfig
  | IconGridConfig
  | SpacerConfig
  | DividerConfig
  | FeatureCardsConfig
  | TextBannerConfig
  | CenteredTextConfig
  | ProductLineupConfig
  | UGCBannerConfig
  | CommunityConfig
  | BlogGridConfig
  | ThankYouContentConfig
  | Record<string, unknown>

/**
 * Block definition for palette/registry
 */
export interface BlockDefinition {
  type: BlockType
  label: string
  description: string
  category: BlockCategory
  icon?: string
  defaultConfig: Partial<BlockConfig>
}

/**
 * Props for individual block components
 */
export interface BlockProps<T extends BlockConfig = BlockConfig> {
  block: {
    id: string
    type: BlockType
    config: T
  }
  className?: string
}
