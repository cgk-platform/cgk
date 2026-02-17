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
  // PDP configs
  PDPHeroConfig,
  PDPTrustBadgesConfig,
  TrustBadgeItem,
  PDPReviewsConfig,
  PDPRecommendationsConfig,
  RecommendationItem,
  PDPSpecificationsConfig,
  SpecificationItem,
  SpecificationGroup,
  // Policy configs
  PolicyContentConfig,
  // About configs
  AboutHeroConfig,
  TeamMember,
  TeamGridConfig,
  TimelineEvent,
  TimelineConfig,
  ValueItem,
  ValuesGridConfig,
  StoreLocation,
  StoreLocatorConfig,
  // Shop/Collection configs
  CollectionProductItem,
  CollectionGridConfig,
  FilterOption,
  FilterGroup,
  CollectionFiltersConfig,
  SortOption,
  CollectionSortConfig,
  QuickViewModalConfig,
  WishlistButtonConfig,
  // Promo configs
  PromoHeroConfig,
  BundleBuilderConfig,
  BundleItem,
  BundleTier,
  CountdownTimerConfig,
  AnnouncementBarConfig,
  AnnouncementItem,
  NewsletterSignupConfig,
  // Layout block configs (Header/Footer/Navigation)
  NavLinkItem,
  HeaderBlockConfig,
  FooterColumn,
  SocialLink,
  FooterBlockConfig,
  MegaMenuItem,
  MegaMenuCategory,
  MegaMenuBlockConfig,
  BreadcrumbItem,
  BreadcrumbBlockConfig,
  SidebarBlockConfig,
  // Content block configs
  AccordionItem,
  AccordionConfig,
  TabItem,
  TabsConfig,
  GalleryImageItem,
  ImageGalleryConfig,
  // Social/UGC block configs
  InstagramFeedConfig,
  InstagramFeedItem,
  SocialProofConfig,
  PressLogo,
  SocialProofBadge,
  CommunityPost,
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
export { ContactFormBlock } from './interactive/ContactFormBlock'
export { StoreLocatorBlock } from './interactive/StoreLocatorBlock'

// Policy blocks
export { PolicyContentBlock } from './policy/PolicyContentBlock'

// About blocks
export { AboutHeroBlock } from './about/AboutHeroBlock'
export { TeamGridBlock } from './about/TeamGridBlock'
export { TimelineBlock } from './about/TimelineBlock'
export { ValuesGridBlock } from './about/ValuesGridBlock'

export { ImageTextBlock } from './layout/ImageTextBlock'
export { FeatureCardsBlock } from './layout/FeatureCardsBlock'
export { TestimonialBlock } from './layout/TestimonialBlock'
export { SpacerBlock } from './layout/SpacerBlock'
export { DividerBlock } from './layout/DividerBlock'
export { HeaderBlock } from './layout/HeaderBlock'
export { FooterBlock } from './layout/FooterBlock'
export { MegaMenuBlock } from './layout/MegaMenuBlock'
export { BreadcrumbBlock } from './layout/BreadcrumbBlock'
export { SidebarBlock } from './layout/SidebarBlock'
export { PDPHeroBlock } from './pdp/PDPHeroBlock'
export { PDPTrustBadgesBlock } from './pdp/PDPTrustBadgesBlock'
export { PDPReviewsBlock } from './pdp/PDPReviewsBlock'
export { PDPRecommendationsBlock } from './pdp/PDPRecommendationsBlock'
export { PDPSpecificationsBlock } from './pdp/PDPSpecificationsBlock'

// Shop blocks
export { CollectionGridBlock } from './shop/CollectionGridBlock'
export { CollectionFiltersBlock } from './shop/CollectionFiltersBlock'
export { CollectionSortBlock, CollectionSort } from './shop/CollectionSortBlock'
export { QuickViewModal, type QuickViewModalProps } from './shop/QuickViewModal'
export { WishlistButton, WishlistBadge, WishlistIconLink, WishlistStyles, type WishlistButtonProps } from './shop/WishlistButton'

// Promo blocks
export { PromoHeroBlock } from './promo/PromoHeroBlock'
export { BundleBuilderBlock } from './promo/BundleBuilderBlock'
export { CountdownTimerBlock } from './promo/CountdownTimerBlock'
export { AnnouncementBarBlock } from './promo/AnnouncementBarBlock'
export { NewsletterSignupBlock } from './promo/NewsletterSignupBlock'

// Social/UGC blocks
export { InstagramFeedBlock } from './social/InstagramFeedBlock'
export { SocialProofBlock } from './social/SocialProofBlock'
export { UGCBannerBlock } from './social/UGCBannerBlock'
export { TrustSignalsBlock } from './social/TrustSignalsBlock'
export { CommunityBlock } from './social/CommunityBlock'

// Content blocks
export { VideoEmbedBlock } from './content/VideoEmbedBlock'
export { BlogGridBlock } from './content/BlogGridBlock'
export { IconGridBlock } from './content/IconGridBlock'
export { ImageGalleryBlock } from './content/ImageGalleryBlock'
export { AccordionBlock } from './content/AccordionBlock'
export { TabsBlock } from './content/TabsBlock'

// Conversion blocks
export { ProductLineupBlock } from './conversion/ProductLineupBlock'
export type { ProductLineupBlockConfig } from './conversion/ProductLineupBlock'
export type { ProductLineupItem as ConversionProductItem } from './conversion/ProductLineupBlock'
export { BeforeAfterBlock } from './conversion/BeforeAfterBlock'
export type { BeforeAfterBlockConfig } from './conversion/BeforeAfterBlock'
export { TestimonialCarouselBlock } from './conversion/TestimonialCarouselBlock'
export type { TestimonialCarouselBlockConfig, TestimonialItem } from './conversion/TestimonialCarouselBlock'
export { GuaranteeBlock } from './conversion/GuaranteeBlock'
export type { GuaranteeBlockConfig, GuaranteeItem } from './conversion/GuaranteeBlock'
export { UrgencyBannerBlock } from './conversion/UrgencyBannerBlock'
export type { UrgencyBannerBlockConfig } from './conversion/UrgencyBannerBlock'
export { ExitIntentBlock } from './conversion/ExitIntentBlock'
export type { ExitIntentBlockConfig } from './conversion/ExitIntentBlock'
