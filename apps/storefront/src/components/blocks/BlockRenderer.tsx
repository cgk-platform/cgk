/**
 * Block Renderer Component
 *
 * Renders landing page blocks based on their type.
 * Handles unknown block types gracefully with a console warning.
 */

import { cn } from '@cgk-platform/ui'
import type { LandingPageBlock, BlockType } from './types'
import { isValidBlockType } from './registry'

// Core blocks
import { HeroBlock } from './core/HeroBlock'
import { BenefitsBlock } from './core/BenefitsBlock'
import { ReviewsBlock } from './core/ReviewsBlock'
import { CTABannerBlock } from './core/CTABannerBlock'
import { MarkdownBlock } from './core/MarkdownBlock'

// Interactive blocks
import { FAQBlock } from './interactive/FAQBlock'
import { CountdownBlock } from './interactive/CountdownBlock'
import { ContactFormBlock } from './interactive/ContactFormBlock'
import { StoreLocatorBlock } from './interactive/StoreLocatorBlock'

// Policy blocks
import { PolicyContentBlock } from './policy/PolicyContentBlock'

// About blocks
import { AboutHeroBlock } from './about/AboutHeroBlock'
import { TeamGridBlock } from './about/TeamGridBlock'
import { TimelineBlock } from './about/TimelineBlock'
import { ValuesGridBlock } from './about/ValuesGridBlock'

// Layout blocks
import { ImageTextBlock } from './layout/ImageTextBlock'
import { FeatureCardsBlock } from './layout/FeatureCardsBlock'
import { TestimonialBlock } from './layout/TestimonialBlock'
import { SpacerBlock } from './layout/SpacerBlock'
import { DividerBlock } from './layout/DividerBlock'
import { HeaderBlock } from './layout/HeaderBlock'
import { FooterBlock } from './layout/FooterBlock'
import { MegaMenuBlock } from './layout/MegaMenuBlock'
import { BreadcrumbBlock } from './layout/BreadcrumbBlock'
import { SidebarBlock } from './layout/SidebarBlock'

// PDP blocks
import { PDPHeroBlock } from './pdp/PDPHeroBlock'
import { PDPTrustBadgesBlock } from './pdp/PDPTrustBadgesBlock'
import { PDPReviewsBlock } from './pdp/PDPReviewsBlock'
import { PDPRecommendationsBlock } from './pdp/PDPRecommendationsBlock'
import { PDPSpecificationsBlock } from './pdp/PDPSpecificationsBlock'

// Shop blocks
import { CollectionGridBlock } from './shop/CollectionGridBlock'
import { CollectionFiltersBlock } from './shop/CollectionFiltersBlock'
import { CollectionSortBlock } from './shop/CollectionSortBlock'

// Promo blocks
import { PromoHeroBlock } from './promo/PromoHeroBlock'
import { BundleBuilderBlock } from './promo/BundleBuilderBlock'
import { CountdownTimerBlock } from './promo/CountdownTimerBlock'
import { AnnouncementBarBlock } from './promo/AnnouncementBarBlock'
import { NewsletterSignupBlock } from './promo/NewsletterSignupBlock'

// Social/UGC blocks
import { InstagramFeedBlock } from './social/InstagramFeedBlock'
import { SocialProofBlock } from './social/SocialProofBlock'
import { UGCBannerBlock } from './social/UGCBannerBlock'
import { TrustSignalsBlock } from './social/TrustSignalsBlock'
import { CommunityBlock } from './social/CommunityBlock'

// Content blocks
import { VideoEmbedBlock } from './content/VideoEmbedBlock'
import { BlogGridBlock } from './content/BlogGridBlock'
import { IconGridBlock } from './content/IconGridBlock'
import { ImageGalleryBlock } from './content/ImageGalleryBlock'
import { AccordionBlock } from './content/AccordionBlock'
import { TabsBlock } from './content/TabsBlock'

// Conversion blocks
import { ProductLineupBlock } from './conversion/ProductLineupBlock'
import { BeforeAfterBlock } from './conversion/BeforeAfterBlock'
import { TestimonialCarouselBlock } from './conversion/TestimonialCarouselBlock'
import { GuaranteeBlock } from './conversion/GuaranteeBlock'
import { UrgencyBannerBlock } from './conversion/UrgencyBannerBlock'
import { ExitIntentBlock } from './conversion/ExitIntentBlock'

/**
 * Block component type - generic to handle various config types
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyBlockComponent = React.ComponentType<any>

/**
 * Registry of block components by type
 */
const BLOCK_COMPONENTS: Partial<Record<BlockType, AnyBlockComponent>> = {
  // Core blocks
  hero: HeroBlock,
  benefits: BenefitsBlock,
  reviews: ReviewsBlock,
  'cta-banner': CTABannerBlock,
  markdown: MarkdownBlock,

  // Interactive blocks
  faq: FAQBlock,
  countdown: CountdownBlock,
  'contact-form': ContactFormBlock,
  'store-locator': StoreLocatorBlock,

  // Policy blocks
  'policy-content': PolicyContentBlock,

  // About blocks
  'about-hero': AboutHeroBlock,
  'team-section': TeamGridBlock,
  'brand-story': TimelineBlock,
  'mission-values': ValuesGridBlock,

  // Layout blocks
  'image-text': ImageTextBlock,
  'feature-cards': FeatureCardsBlock,
  testimonial: TestimonialBlock,
  spacer: SpacerBlock,
  divider: DividerBlock,
  header: HeaderBlock,
  footer: FooterBlock,
  'mega-menu': MegaMenuBlock,
  breadcrumb: BreadcrumbBlock,
  sidebar: SidebarBlock,

  // PDP blocks
  'pdp-hero': PDPHeroBlock,
  'pdp-trust-badges': PDPTrustBadgesBlock,
  'pdp-reviews': PDPReviewsBlock,
  'pdp-recommendations': PDPRecommendationsBlock,
  'pdp-specifications': PDPSpecificationsBlock,

  // Shop blocks
  'collection-grid': CollectionGridBlock,
  'collection-filters': CollectionFiltersBlock,
  'collection-sort': CollectionSortBlock,

  // Promo blocks
  'promo-hero': PromoHeroBlock,
  'bundle-builder': BundleBuilderBlock,
  'promo-countdown': CountdownTimerBlock,
  'announcement-bar': AnnouncementBarBlock,
  'newsletter-signup': NewsletterSignupBlock,

  // Social/UGC blocks
  'instagram-feed': InstagramFeedBlock,
  'social-proof': SocialProofBlock,
  'ugc-banner': UGCBannerBlock,
  'trust-signals': TrustSignalsBlock,
  community: CommunityBlock,

  // Content blocks
  'video-embed': VideoEmbedBlock,
  'blog-grid': BlogGridBlock,
  'icon-grid': IconGridBlock,
  'image-gallery': ImageGalleryBlock,
  accordion: AccordionBlock,
  tabs: TabsBlock,

  // Conversion blocks
  'product-lineup': ProductLineupBlock,
  'before-after': BeforeAfterBlock,
  'testimonial-carousel': TestimonialCarouselBlock,
  guarantee: GuaranteeBlock,
  'urgency-banner': UrgencyBannerBlock,
  'exit-intent': ExitIntentBlock,
}

/**
 * Fallback component for unknown block types
 */
function UnknownBlock({ type }: { type: string }) {
  if (process.env.NODE_ENV === 'development') {
    return (
      <div className="mx-auto my-8 max-w-7xl px-6 sm:px-8">
        <div className="rounded-xl border-2 border-dashed border-amber-400/50 bg-amber-50 p-8 text-center dark:border-amber-500/30 dark:bg-amber-900/10">
          <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
            Unknown block type: <code className="rounded bg-amber-100 px-2 py-0.5 font-mono dark:bg-amber-900/50">{type}</code>
          </p>
          <p className="mt-2 text-xs text-amber-500 dark:text-amber-500">
            This block will be skipped in production.
          </p>
        </div>
      </div>
    )
  }
  return null
}

/**
 * Placeholder component for blocks that are registered but not yet implemented
 */
function PlaceholderBlock({
  block,
  className,
}: {
  block: LandingPageBlock
  className?: string
}) {
  if (process.env.NODE_ENV === 'development') {
    return (
      <div className={cn('mx-auto my-8 max-w-7xl px-6 sm:px-8', className)}>
        <div className="rounded-xl border border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-muted))]/30 p-8">
          <div className="flex items-center gap-3 text-[hsl(var(--portal-muted-foreground))]">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[hsl(var(--portal-muted))]">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium">
                Block: <code className="ml-1 rounded bg-[hsl(var(--portal-muted))] px-2 py-0.5 font-mono">{block.type}</code>
              </p>
              <p className="text-xs opacity-70">
                Component implementation pending
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }
  return null
}

/**
 * Props for BlockRenderer component
 */
export interface BlockRendererProps {
  /** The block to render */
  block: LandingPageBlock
  /** Additional CSS classes */
  className?: string
}

/**
 * BlockRenderer Component
 *
 * Renders a single landing page block based on its type.
 * Unknown block types are skipped with a console warning in development.
 */
export function BlockRenderer({ block, className }: BlockRendererProps) {
  // Validate block type
  if (!isValidBlockType(block.type)) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        `[BlockRenderer] Unknown block type "${block.type}" - skipping block with id "${block.id}"`
      )
    }
    return <UnknownBlock type={block.type} />
  }

  // Get the block component
  const Component = BLOCK_COMPONENTS[block.type]

  // If no component is registered, show placeholder in dev
  if (!Component) {
    if (process.env.NODE_ENV === 'development') {
      console.info(
        `[BlockRenderer] Block type "${block.type}" is registered but not implemented - showing placeholder`
      )
    }
    return <PlaceholderBlock block={block} className={className} />
  }

  // Render the block component
  return <Component block={block} className={className} />
}

/**
 * Props for BlockList component
 */
export interface BlockListProps {
  /** Array of blocks to render */
  blocks: LandingPageBlock[]
  /** Additional CSS classes for the container */
  className?: string
  /** Additional CSS classes for each block */
  blockClassName?: string
}

/**
 * BlockList Component
 *
 * Renders a list of landing page blocks in order.
 * Handles sorting by the order property.
 */
export function BlockList({ blocks, className, blockClassName }: BlockListProps) {
  // Sort blocks by order
  const sortedBlocks = [...blocks].sort((a, b) => a.order - b.order)

  return (
    <div className={cn('block-list', className)}>
      {sortedBlocks.map((block) => (
        <BlockRenderer
          key={block.id}
          block={block}
          className={blockClassName}
        />
      ))}
    </div>
  )
}

/**
 * Check if a block type has a component implementation
 */
export function hasBlockComponent(type: BlockType): boolean {
  return type in BLOCK_COMPONENTS
}

/**
 * Get list of implemented block types
 */
export function getImplementedBlockTypes(): BlockType[] {
  return Object.keys(BLOCK_COMPONENTS) as BlockType[]
}
