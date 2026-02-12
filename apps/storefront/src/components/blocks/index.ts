/**
 * Landing Page Blocks Module
 *
 * Exports all block components, types, and utilities for the landing page system.
 */

// Main renderer
export { BlockRenderer, BlockList, hasBlockComponent, getImplementedBlockTypes } from './BlockRenderer'
export type { BlockRendererProps, BlockListProps } from './BlockRenderer'

// Types
export type {
  BlockType,
  BlockCategory,
  BlockConfig,
  BlockProps,
  BlockDefinition,
  LandingPageBlock,
  // Specific configs
  HeroConfig,
  BenefitsConfig,
  BenefitItem,
  ReviewsConfig,
  ReviewItem,
  MarkdownConfig,
  CTABannerConfig,
  TrustSignalsConfig,
  TrustSignalItem,
  FAQConfig,
  FAQItem,
  CountdownConfig,
  ContactFormConfig,
  ImageTextConfig,
  VideoEmbedConfig,
  TestimonialConfig,
  IconGridConfig,
  IconGridItem,
  SpacerConfig,
  DividerConfig,
  FeatureCardsConfig,
  FeatureCardItem,
  TextBannerConfig,
  CenteredTextConfig,
  ProductLineupConfig,
  ProductLineupItem,
  UGCBannerConfig,
  CommunityConfig,
  BlogGridConfig,
  BlogGridItem,
  ThankYouContentConfig,
  ButtonConfig,
  ImageConfig,
} from './types'

// Registry
export {
  BLOCK_REGISTRY,
  getBlocksByCategory,
  getBlockPalette,
  isValidBlockType,
  getBlockDefinition,
} from './registry'

// Icons utility
export { LucideIcon, getIconByName, getSocialIcon, COMMON_ICONS, SOCIAL_ICONS } from './icons'

// Individual block components (for direct use if needed)
export { HeroBlock } from './core/HeroBlock'
export { BenefitsBlock } from './core/BenefitsBlock'
export { ReviewsBlock } from './core/ReviewsBlock'
export { CTABannerBlock } from './core/CTABannerBlock'
export { MarkdownBlock } from './core/MarkdownBlock'
export { FAQBlock } from './interactive/FAQBlock'
export { CountdownBlock } from './interactive/CountdownBlock'
export { ImageTextBlock } from './layout/ImageTextBlock'
export { FeatureCardsBlock } from './layout/FeatureCardsBlock'
export { TestimonialBlock } from './layout/TestimonialBlock'
export { SpacerBlock } from './layout/SpacerBlock'
export { DividerBlock } from './layout/DividerBlock'
