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
  | 'store-locator'
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
  | 'announcement-bar'
  | 'newsletter-signup'
  // PDP blocks
  | 'pdp-hero'
  | 'pdp-trust-badges'
  | 'pdp-reviews'
  | 'pdp-ready-to-buy'
  | 'pdp-recommendations'
  | 'pdp-specifications'
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
  | 'collection-grid'
  | 'collection-filters'
  | 'collection-sort'
  | 'quick-view-modal'
  | 'wishlist-button'
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
  // Content blocks
  | 'accordion'
  | 'tabs'
  | 'image-gallery'
  // Social/UGC blocks
  | 'instagram-feed'
  | 'social-proof'
  // Conversion blocks
  | 'before-after'
  | 'testimonial-carousel'
  | 'guarantee'
  | 'urgency-banner'
  | 'exit-intent'
  // Layout - Header/Footer blocks
  | 'header'
  | 'footer'
  | 'mega-menu'
  | 'breadcrumb'
  | 'sidebar'

/**
 * Block category for organizing in palette
 */
export type BlockCategory =
  | 'core'
  | 'brand'
  | 'interactive'
  | 'layout'
  | 'social'
  | 'content'
  | 'promo'
  | 'pdp'
  | 'shop'
  | 'policy'
  | 'about'
  | 'science'
  | 'conversion'

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

// ============================================================================
// Content Block Configuration Types
// ============================================================================

/**
 * Accordion item
 */
export interface AccordionItem {
  id: string
  title: string
  content: string
}

/**
 * Accordion block configuration
 */
export interface AccordionConfig {
  headline?: string
  subheadline?: string
  items: AccordionItem[]
  allowMultipleOpen?: boolean
  defaultOpenItems?: string[]
  iconStyle?: 'plus-minus' | 'chevron'
  backgroundColor?: string
}

/**
 * Tab item
 */
export interface TabItem {
  id: string
  label: string
  content: string
  icon?: string
}

/**
 * Tabs block configuration
 */
export interface TabsConfig {
  headline?: string
  subheadline?: string
  tabs: TabItem[]
  layout?: 'horizontal' | 'vertical'
  defaultTab?: string
  backgroundColor?: string
}

/**
 * Gallery image item
 */
export interface GalleryImageItem {
  id: string
  src: string
  alt: string
  caption?: string
  width?: number
  height?: number
}

/**
 * Image gallery block configuration
 */
export interface ImageGalleryConfig {
  headline?: string
  subheadline?: string
  images: GalleryImageItem[]
  layout?: 'grid' | 'masonry'
  columns?: 2 | 3 | 4
  showCaptions?: boolean
  enableLightbox?: boolean
  backgroundColor?: string
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
// Promo Block Configuration Types
// ============================================================================

/**
 * Promo Hero block configuration
 */
export interface PromoHeroConfig {
  /** Main promotional headline */
  headline: string
  /** Optional subheadline */
  subheadline?: string
  /** Promotional description */
  description?: string
  /** Discount badge text (e.g., "50% OFF", "BOGO") */
  discountBadge?: string
  /** Original price for strikethrough display */
  originalPrice?: string
  /** Sale/promo price */
  salePrice?: string
  /** Price savings text */
  savingsText?: string
  /** Background image */
  backgroundImage?: ImageConfig
  /** Background color fallback */
  backgroundColor?: string
  /** Overlay opacity for background images (0-1) */
  overlayOpacity?: number
  /** Text alignment */
  textAlignment?: 'left' | 'center' | 'right'
  /** Primary CTA button */
  primaryButton?: ButtonConfig
  /** Secondary CTA button */
  secondaryButton?: ButtonConfig
  /** Urgency text (e.g., "Limited Time Only") */
  urgencyText?: string
  /** Trust badges below CTA */
  trustBadges?: string[]
  /** Height variant */
  height?: 'sm' | 'md' | 'lg' | 'full'
  /** Enable gradient overlay */
  enableGradient?: boolean
}

/**
 * Bundle item type
 */
export interface BundleItem {
  /** Unique item ID */
  id: string
  /** Item name */
  name: string
  /** Item description */
  description?: string
  /** Item image */
  image?: ImageConfig
  /** Individual price */
  price: number
  /** Compare at price (original) */
  compareAtPrice?: number
  /** Category for grouping */
  category?: string
  /** Whether item is required in bundle */
  required?: boolean
  /** Max quantity allowed */
  maxQuantity?: number
  /** Default quantity when selected */
  defaultQuantity?: number
}

/**
 * Bundle tier for progressive discounts
 */
export interface BundleTier {
  /** Minimum items to qualify */
  minItems: number
  /** Discount percentage */
  discountPercent: number
  /** Tier label */
  label: string
}

/**
 * Bundle Builder block configuration
 */
export interface BundleBuilderConfig {
  /** Section headline */
  headline: string
  /** Section description */
  description?: string
  /** Available items to bundle */
  items: BundleItem[]
  /** Progressive discount tiers */
  tiers?: BundleTier[]
  /** Minimum items required */
  minItems?: number
  /** Maximum items allowed */
  maxItems?: number
  /** Background color */
  backgroundColor?: string
  /** CTA button configuration */
  ctaButton?: ButtonConfig
  /** Currency symbol */
  currencySymbol?: string
  /** Show savings indicator */
  showSavings?: boolean
  /** Layout style */
  layout?: 'grid' | 'list'
  /** Enable quantity selection */
  enableQuantity?: boolean
}

/**
 * Countdown Timer block configuration (promo-countdown)
 */
export interface CountdownTimerConfig {
  /** Section headline */
  headline?: string
  /** Urgency message */
  urgencyMessage?: string
  /** Target date/time (ISO string) */
  targetDate: string
  /** What to do when countdown ends */
  endBehavior?: 'hide' | 'show-message' | 'redirect'
  /** Message to show when countdown ends */
  endMessage?: string
  /** URL to redirect to when countdown ends */
  redirectUrl?: string
  /** Visual style variant */
  style?: 'minimal' | 'boxed' | 'flip' | 'gradient'
  /** Show individual time units */
  showDays?: boolean
  showHours?: boolean
  showMinutes?: boolean
  showSeconds?: boolean
  /** Background color */
  backgroundColor?: string
  /** Text color */
  textColor?: string
  /** Accent color for numbers */
  accentColor?: string
  /** CTA button (optional) */
  ctaButton?: ButtonConfig
  /** Show progress bar */
  showProgressBar?: boolean
  /** Sale start date (for progress bar) */
  startDate?: string
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Announcement item for rotating messages
 */
export interface AnnouncementItem {
  /** Announcement text */
  text: string
  /** Optional link */
  link?: ButtonConfig
  /** Icon name */
  icon?: string
}

/**
 * Announcement Bar block configuration
 */
export interface AnnouncementBarConfig {
  /** Single message or multiple rotating messages */
  messages: AnnouncementItem[]
  /** Background color */
  backgroundColor?: string
  /** Text color */
  textColor?: string
  /** Accent color for links/icons */
  accentColor?: string
  /** Visual style */
  style?: 'solid' | 'gradient' | 'animated'
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Enable dismissal */
  dismissible?: boolean
  /** Storage key for dismiss state */
  dismissKey?: string
  /** Auto-rotate interval (ms) - 0 to disable */
  rotateInterval?: number
  /** Enable marquee animation */
  marquee?: boolean
  /** Marquee speed (px/sec) */
  marqueeSpeed?: number
  /** Show close button */
  showClose?: boolean
  /** Position: fixed or relative */
  position?: 'fixed' | 'relative'
  /** Alignment */
  alignment?: 'left' | 'center' | 'right'
}

/**
 * Newsletter Signup block configuration
 */
export interface NewsletterSignupConfig {
  /** Section headline */
  headline: string
  /** Section description */
  description?: string
  /** Input placeholder text */
  placeholder?: string
  /** Submit button text */
  buttonText?: string
  /** Success message */
  successMessage?: string
  /** Error message */
  errorMessage?: string
  /** Incentive text (e.g., "Get 10% off your first order") */
  incentive?: string
  /** Privacy notice text */
  privacyText?: string
  /** Privacy link URL */
  privacyLink?: string
  /** Background image */
  backgroundImage?: ImageConfig
  /** Background color */
  backgroundColor?: string
  /** Text color */
  textColor?: string
  /** Layout style */
  layout?: 'inline' | 'stacked' | 'split'
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Form action URL (for native form submission) */
  formAction?: string
  /** Enable double opt-in message */
  doubleOptIn?: boolean
  /** Show name field */
  showNameField?: boolean
  /** Show phone field */
  showPhoneField?: boolean
  /** Tags to apply to subscriber */
  tags?: string[]
  /** Custom form ID for tracking */
  formId?: string
}

// ============================================================================
// Policy Block Configuration Types
// ============================================================================

/**
 * Policy content block configuration
 */
export interface PolicyContentConfig {
  title?: string
  content: string
  lastUpdated?: string
  showTableOfContents?: boolean
  maxWidth?: 'sm' | 'md' | 'lg' | 'full'
  backgroundColor?: string
}

// ============================================================================
// About Block Configuration Types
// ============================================================================

/**
 * About hero block configuration
 */
export interface AboutHeroConfig {
  headline: string
  subheadline?: string
  description?: string
  backgroundImage?: ImageConfig
  backgroundColor?: string
  overlayOpacity?: number
  textAlignment?: 'left' | 'center' | 'right'
  button?: ButtonConfig
  badge?: string
  height?: 'sm' | 'md' | 'lg'
  showPattern?: boolean
}

/**
 * Team member item
 */
export interface TeamMember {
  id: string
  name: string
  role: string
  bio?: string
  avatar?: ImageConfig
  socialLinks?: Array<{
    platform: string
    url: string
  }>
}

/**
 * Team grid block configuration (team-section)
 */
export interface TeamGridConfig {
  headline?: string
  subheadline?: string
  description?: string
  members: TeamMember[]
  columns?: 2 | 3 | 4
  layout?: 'grid' | 'list'
  showBio?: boolean
  showSocialLinks?: boolean
  backgroundColor?: string
}

/**
 * Timeline event item
 */
export interface TimelineEvent {
  id: string
  year: string
  title: string
  description: string
  image?: ImageConfig
  icon?: string
}

/**
 * Timeline block configuration (brand-story, company history)
 */
export interface TimelineConfig {
  headline?: string
  subheadline?: string
  events: TimelineEvent[]
  layout?: 'vertical' | 'alternating'
  showConnectors?: boolean
  backgroundColor?: string
}

/**
 * Value item
 */
export interface ValueItem {
  id: string
  title: string
  description: string
  icon?: string
  image?: ImageConfig
}

/**
 * Values grid block configuration (mission-values)
 */
export interface ValuesGridConfig {
  headline?: string
  subheadline?: string
  missionStatement?: string
  values: ValueItem[]
  columns?: 2 | 3 | 4
  layout?: 'grid' | 'list' | 'cards'
  showIcons?: boolean
  backgroundColor?: string
}

/**
 * Store location item
 */
export interface StoreLocation {
  id: string
  name: string
  address: string
  city: string
  state?: string
  zipCode?: string
  country: string
  phone?: string
  email?: string
  hours?: string[]
  coordinates?: {
    lat: number
    lng: number
  }
  image?: ImageConfig
}

/**
 * Store locator block configuration
 */
export interface StoreLocatorConfig {
  headline?: string
  subheadline?: string
  locations: StoreLocation[]
  showMap?: boolean
  showSearch?: boolean
  showFilters?: boolean
  defaultZoom?: number
  mapStyle?: 'standard' | 'dark' | 'light'
  layout?: 'map-left' | 'map-right' | 'map-top'
  backgroundColor?: string
}

// ============================================================================
// PDP Block Configuration Types
// ============================================================================

/**
 * PDP Hero block configuration
 */
export interface PDPHeroConfig {
  product?: {
    id: string
    title: string
    description?: string
    price: number
    compareAtPrice?: number
    currency?: string
    images: ImageConfig[]
    variants?: Array<{
      id: string
      title: string
      price: number
      available: boolean
      options: Record<string, string>
    }>
    options?: Array<{
      name: string
      values: string[]
    }>
  }
  showBreadcrumbs?: boolean
  showRatings?: boolean
  averageRating?: number
  totalReviews?: number
  showQuantitySelector?: boolean
  showAddToCart?: boolean
  showWishlist?: boolean
  showShareButtons?: boolean
  galleryLayout?: 'grid' | 'carousel' | 'stacked'
  backgroundColor?: string
}

/**
 * Trust badge item for PDP
 */
export interface TrustBadgeItem {
  icon: string
  title: string
  description?: string
}

/**
 * PDP Trust Badges block configuration
 */
export interface PDPTrustBadgesConfig {
  headline?: string
  badges: TrustBadgeItem[]
  layout?: 'inline' | 'grid' | 'compact'
  showDividers?: boolean
  backgroundColor?: string
}

/**
 * PDP Reviews block configuration (product-specific reviews)
 */
export interface PDPReviewsConfig {
  productId?: string
  headline?: string
  subheadline?: string
  reviews?: ReviewItem[]
  showWriteReview?: boolean
  showFilters?: boolean
  showSortOptions?: boolean
  showRatingsSummary?: boolean
  averageRating?: number
  totalReviews?: number
  layout?: 'list' | 'grid' | 'masonry'
  initialDisplayCount?: number
  backgroundColor?: string
}

/**
 * Recommendation item
 */
export interface RecommendationItem {
  productId: string
  title?: string
  price?: number
  compareAtPrice?: number
  image?: ImageConfig
  badge?: string
  href?: string
}

/**
 * PDP Recommendations block configuration
 */
export interface PDPRecommendationsConfig {
  headline?: string
  subheadline?: string
  type?: 'related' | 'upsell' | 'cross-sell' | 'recently-viewed' | 'custom'
  products?: RecommendationItem[]
  productIds?: string[]
  maxProducts?: number
  layout?: 'grid' | 'carousel'
  columns?: 2 | 3 | 4
  showPrices?: boolean
  showAddToCart?: boolean
  backgroundColor?: string
}

/**
 * Specification item
 */
export interface SpecificationItem {
  label: string
  value: string
  icon?: string
}

/**
 * Specification group
 */
export interface SpecificationGroup {
  title: string
  items: SpecificationItem[]
}

/**
 * PDP Specifications block configuration
 */
export interface PDPSpecificationsConfig {
  headline?: string
  subheadline?: string
  groups?: SpecificationGroup[]
  items?: SpecificationItem[]
  layout?: 'table' | 'grid' | 'list'
  columns?: 2 | 3
  showIcons?: boolean
  backgroundColor?: string
}

// ============================================================================
// Shop/Collection Block Configurations
// ============================================================================

/**
 * Product item for collection grids
 */
export interface CollectionProductItem {
  id: string
  handle: string
  title: string
  description?: string
  price: number
  compareAtPrice?: number
  currency?: string
  images: ImageConfig[]
  tags?: string[]
  vendor?: string
  productType?: string
  availableForSale: boolean
  variants?: Array<{
    id: string
    title: string
    price: number
    availableForSale: boolean
  }>
}

/**
 * Collection grid block configuration
 */
export interface CollectionGridConfig {
  headline?: string
  subheadline?: string
  collectionHandle?: string
  products: CollectionProductItem[]
  columns?: 2 | 3 | 4
  layout?: 'grid' | 'list'
  showPrices?: boolean
  showAddToCart?: boolean
  showQuickView?: boolean
  showWishlist?: boolean
  emptyMessage?: string
  backgroundColor?: string
}

/**
 * Filter option for collection filters
 */
export interface FilterOption {
  value: string
  label: string
  count?: number
}

/**
 * Filter group configuration
 */
export interface FilterGroup {
  id: string
  label: string
  type: 'checkbox' | 'range' | 'color'
  options?: FilterOption[]
  min?: number
  max?: number
  step?: number
}

/**
 * Collection filters block configuration
 */
export interface CollectionFiltersConfig {
  headline?: string
  filters: FilterGroup[]
  layout?: 'sidebar' | 'horizontal' | 'drawer'
  showClearAll?: boolean
  showActiveCount?: boolean
  collapsible?: boolean
  defaultExpanded?: string[]
  backgroundColor?: string
}

/**
 * Sort option for collection
 */
export interface SortOption {
  value: string
  label: string
}

/**
 * Collection sort block configuration
 */
export interface CollectionSortConfig {
  options?: SortOption[]
  defaultValue?: string
  showProductCount?: boolean
  productCount?: number
  layout?: 'dropdown' | 'inline'
  backgroundColor?: string
}

/**
 * Quick view modal configuration
 */
export interface QuickViewModalConfig {
  showAddToCart?: boolean
  showVariantSelector?: boolean
  showQuantitySelector?: boolean
  showWishlist?: boolean
  showShare?: boolean
  showViewFullDetails?: boolean
  imageLayout?: 'single' | 'gallery' | 'thumbnails'
  backgroundColor?: string
}

/**
 * Wishlist button configuration
 */
export interface WishlistButtonConfig {
  variant?: 'icon' | 'button' | 'text'
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  labelAdded?: string
  labelRemove?: string
  labelAdd?: string
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'inline'
}

// ============================================================================
// Layout Block Configurations (Header/Footer/Navigation)
// ============================================================================

/**
 * Navigation link item
 */
export interface NavLinkItem {
  label: string
  href: string
  openInNewTab?: boolean
  children?: NavLinkItem[]
  featured?: boolean
  badge?: string
}

/**
 * Header block configuration
 */
export interface HeaderBlockConfig {
  /** Logo image configuration */
  logo?: ImageConfig
  /** Logo text fallback if no image */
  logoText?: string
  /** Navigation links */
  navLinks?: NavLinkItem[]
  /** Show search icon/button */
  showSearch?: boolean
  /** Show cart icon with count */
  showCart?: boolean
  /** Show user account icon */
  showAccount?: boolean
  /** Sticky header on scroll */
  sticky?: boolean
  /** Transparent background (for hero overlays) */
  transparent?: boolean
  /** Background color */
  backgroundColor?: string
  /** Text color override */
  textColor?: string
  /** Announcement bar text */
  announcementText?: string
  /** Announcement bar link */
  announcementLink?: string
}

/**
 * Footer column configuration
 */
export interface FooterColumn {
  title: string
  links: Array<{
    label: string
    href: string
    openInNewTab?: boolean
  }>
}

/**
 * Social link configuration
 */
export interface SocialLink {
  platform: 'facebook' | 'twitter' | 'instagram' | 'linkedin' | 'youtube' | 'tiktok' | 'pinterest'
  url: string
}

/**
 * Footer block configuration
 */
export interface FooterBlockConfig {
  /** Logo image configuration */
  logo?: ImageConfig
  /** Logo text fallback */
  logoText?: string
  /** Company description/tagline */
  description?: string
  /** Footer columns with links */
  columns?: FooterColumn[]
  /** Social media links */
  socialLinks?: SocialLink[]
  /** Show newsletter signup */
  showNewsletter?: boolean
  /** Newsletter headline */
  newsletterHeadline?: string
  /** Newsletter description */
  newsletterDescription?: string
  /** Copyright text (supports {year} placeholder) */
  copyrightText?: string
  /** Legal links (privacy, terms, etc.) */
  legalLinks?: Array<{
    label: string
    href: string
  }>
  /** Background color */
  backgroundColor?: string
  /** Text color override */
  textColor?: string
}

/**
 * Mega menu item with optional image
 */
export interface MegaMenuItem {
  label: string
  href: string
  description?: string
  image?: ImageConfig
  badge?: string
  featured?: boolean
}

/**
 * Mega menu category
 */
export interface MegaMenuCategory {
  title: string
  items: MegaMenuItem[]
  viewAllLink?: {
    label: string
    href: string
  }
}

/**
 * Mega menu block configuration
 */
export interface MegaMenuBlockConfig {
  /** Menu trigger label */
  triggerLabel: string
  /** Menu categories */
  categories?: MegaMenuCategory[]
  /** Featured section (right side) */
  featuredSection?: {
    title: string
    items: MegaMenuItem[]
  }
  /** Number of columns for categories */
  columns?: 2 | 3 | 4
  /** Show featured images */
  showImages?: boolean
  /** Open on hover or click */
  openOn?: 'hover' | 'click'
  /** Background color */
  backgroundColor?: string
}

/**
 * Breadcrumb item
 */
export interface BreadcrumbItem {
  label: string
  href?: string
}

/**
 * Breadcrumb block configuration
 */
export interface BreadcrumbBlockConfig {
  /** Breadcrumb items */
  items?: BreadcrumbItem[]
  /** Separator character */
  separator?: '/' | '>' | '-' | 'chevron'
  /** Show home link */
  showHome?: boolean
  /** Home link label */
  homeLabel?: string
  /** Home link href */
  homeHref?: string
  /** Show current page (last item) */
  showCurrentPage?: boolean
  /** Max items to show (collapses middle items) */
  maxItems?: number
  /** Background color */
  backgroundColor?: string
}

/**
 * Sidebar block configuration
 */
export interface SidebarBlockConfig {
  /** Sidebar position */
  position?: 'left' | 'right'
  /** Sidebar width */
  width?: 'sm' | 'md' | 'lg'
  /** Sticky sidebar on scroll */
  sticky?: boolean
  /** Sticky offset from top (px) */
  stickyOffset?: number
  /** Background color */
  backgroundColor?: string
  /** Show border */
  showBorder?: boolean
  /** Collapsible on mobile */
  collapsibleOnMobile?: boolean
  /** Default collapsed state on mobile */
  defaultCollapsed?: boolean
  /** Sidebar content blocks */
  children?: Array<{
    type: string
    config: Record<string, unknown>
  }>
}

// ============================================================================
// Social/UGC Block Configurations
// ============================================================================

/**
 * Instagram feed item configuration
 */
export interface InstagramFeedItem {
  id: string
  image: ImageConfig
  likes?: number
  comments?: number
  caption?: string
  permalink?: string
}

/**
 * Instagram Feed block configuration
 */
export interface InstagramFeedConfig {
  headline?: string
  subheadline?: string
  items: InstagramFeedItem[]
  instagramHandle?: string
  instagramUrl?: string
  columns?: 3 | 4 | 5 | 6
  showEngagement?: boolean
  showCaptions?: boolean
  backgroundColor?: string
}

/**
 * Press logo for social proof
 */
export interface PressLogo {
  id: string
  name: string
  logo: ImageConfig
  url?: string
}

/**
 * Social proof badge
 */
export interface SocialProofBadge {
  id: string
  icon: string
  text: string
}

/**
 * Social Proof block configuration
 */
export interface SocialProofConfig {
  headline?: string
  customerCount?: string
  customerCountLabel?: string
  reviewStats?: {
    rating: number
    reviewCount: string
  }
  reviewStatsLabel?: string
  pressLogos?: PressLogo[]
  pressHeadline?: string
  trustBadges?: SocialProofBadge[]
  layout?: 'horizontal' | 'vertical' | 'compact'
  showDividers?: boolean
  backgroundColor?: string
  textColor?: string
}

/**
 * Community post preview
 */
export interface CommunityPost {
  id: string
  author: string
  avatar?: ImageConfig
  content: string
  likes?: number
  comments?: number
  timestamp?: string
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
  | PromoHeroConfig
  | BundleBuilderConfig
  | CountdownTimerConfig
  | AnnouncementBarConfig
  | NewsletterSignupConfig
  | PolicyContentConfig
  | AboutHeroConfig
  | TeamGridConfig
  | TimelineConfig
  | ValuesGridConfig
  | StoreLocatorConfig
  | PDPHeroConfig
  | PDPTrustBadgesConfig
  | PDPReviewsConfig
  | PDPRecommendationsConfig
  | PDPSpecificationsConfig
  | CollectionGridConfig
  | CollectionFiltersConfig
  | CollectionSortConfig
  | QuickViewModalConfig
  | WishlistButtonConfig
  | AccordionConfig
  | TabsConfig
  | ImageGalleryConfig
  | InstagramFeedConfig
  | SocialProofConfig
  | HeaderBlockConfig
  | FooterBlockConfig
  | MegaMenuBlockConfig
  | BreadcrumbBlockConfig
  | SidebarBlockConfig
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
