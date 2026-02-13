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

// Layout blocks
import { ImageTextBlock } from './layout/ImageTextBlock'
import { FeatureCardsBlock } from './layout/FeatureCardsBlock'
import { TestimonialBlock } from './layout/TestimonialBlock'
import { SpacerBlock } from './layout/SpacerBlock'
import { DividerBlock } from './layout/DividerBlock'

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

  // Layout blocks
  'image-text': ImageTextBlock,
  'feature-cards': FeatureCardsBlock,
  testimonial: TestimonialBlock,
  spacer: SpacerBlock,
  divider: DividerBlock,
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
