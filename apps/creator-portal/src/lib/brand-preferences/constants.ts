/**
 * Brand Preferences Constants
 *
 * Metadata for categories, content types, platforms, etc.
 */

import type {
  BrandCategory,
  BrandCategoryInfo,
  ContentFormat,
  ContentFormatInfo,
  ContentType,
  ContentTypeInfo,
  PartnershipType,
  PartnershipTypeInfo,
  Platform,
  PlatformInfo,
  PricingRange,
} from '@/lib/types'

/**
 * Brand category metadata
 */
export const BRAND_CATEGORIES: BrandCategoryInfo[] = [
  { id: 'fashion', label: 'Fashion', icon: 'shirt' },
  { id: 'beauty', label: 'Beauty & Skincare', icon: 'sparkles' },
  { id: 'food', label: 'Food & Beverage', icon: 'utensils' },
  { id: 'tech', label: 'Technology', icon: 'laptop' },
  { id: 'lifestyle', label: 'Lifestyle', icon: 'heart' },
  { id: 'fitness', label: 'Fitness & Wellness', icon: 'dumbbell' },
  { id: 'gaming', label: 'Gaming', icon: 'gamepad' },
  { id: 'travel', label: 'Travel', icon: 'plane' },
  { id: 'home', label: 'Home & Decor', icon: 'home' },
  { id: 'finance', label: 'Finance', icon: 'wallet' },
  { id: 'automotive', label: 'Automotive', icon: 'car' },
  { id: 'pets', label: 'Pets', icon: 'paw' },
  { id: 'parenting', label: 'Parenting & Family', icon: 'baby' },
  { id: 'education', label: 'Education', icon: 'book' },
  { id: 'entertainment', label: 'Entertainment', icon: 'film' },
  { id: 'health', label: 'Health & Medical', icon: 'heart-pulse' },
  { id: 'sports', label: 'Sports', icon: 'trophy' },
  { id: 'art', label: 'Art & Design', icon: 'palette' },
]

/**
 * Get category info by ID
 */
export function getCategoryInfo(id: BrandCategory): BrandCategoryInfo | undefined {
  return BRAND_CATEGORIES.find((c) => c.id === id)
}

/**
 * Content type metadata
 */
export const CONTENT_TYPES: ContentTypeInfo[] = [
  { id: 'product_reviews', label: 'Product Reviews', description: 'In-depth reviews of products' },
  { id: 'tutorials', label: 'Tutorials', description: 'How-to guides and educational content' },
  { id: 'lifestyle', label: 'Lifestyle', description: 'Day-in-life and lifestyle content' },
  { id: 'unboxing', label: 'Unboxing', description: 'First impressions and unboxing videos' },
  { id: 'hauls', label: 'Hauls', description: 'Shopping hauls and multi-product showcases' },
  { id: 'get_ready_with_me', label: 'Get Ready With Me', description: 'GRWM style content' },
  { id: 'day_in_life', label: 'Day in the Life', description: 'Vlogs and daily content' },
  { id: 'comparison', label: 'Comparisons', description: 'Product comparisons and versus content' },
  { id: 'storytelling', label: 'Storytelling', description: 'Narrative-driven content' },
  { id: 'educational', label: 'Educational', description: 'Informative and educational content' },
  { id: 'comedy', label: 'Comedy', description: 'Funny and entertaining content' },
  { id: 'challenges', label: 'Challenges', description: 'Trending challenges and trends' },
]

/**
 * Get content type info by ID
 */
export function getContentTypeInfo(id: ContentType): ContentTypeInfo | undefined {
  return CONTENT_TYPES.find((c) => c.id === id)
}

/**
 * Pricing range metadata
 */
export const PRICING_RANGES: { id: PricingRange; label: string; description: string }[] = [
  { id: 'budget', label: 'Budget', description: 'Under $50' },
  { id: 'midrange', label: 'Mid-Range', description: '$50 - $200' },
  { id: 'premium', label: 'Premium', description: '$200 - $500' },
  { id: 'luxury', label: 'Luxury', description: '$500+' },
]

/**
 * Partnership type metadata
 */
export const PARTNERSHIP_TYPES: PartnershipTypeInfo[] = [
  {
    id: 'affiliate',
    label: 'Affiliate',
    description: 'Earn commission on sales through your unique link',
  },
  {
    id: 'sponsored',
    label: 'Sponsored',
    description: 'Paid content creation for brands',
  },
  {
    id: 'ambassador',
    label: 'Ambassador',
    description: 'Long-term brand partnership and representation',
  },
  {
    id: 'ugc',
    label: 'UGC',
    description: 'User-generated content for brands to use',
  },
  {
    id: 'gifted',
    label: 'Gifted',
    description: 'Products in exchange for content',
  },
]

/**
 * Get partnership type info by ID
 */
export function getPartnershipTypeInfo(id: PartnershipType): PartnershipTypeInfo | undefined {
  return PARTNERSHIP_TYPES.find((p) => p.id === id)
}

/**
 * Content format metadata
 */
export const CONTENT_FORMATS: ContentFormatInfo[] = [
  { id: 'video', label: 'Video', icon: 'video' },
  { id: 'photo', label: 'Photography', icon: 'camera' },
  { id: 'written', label: 'Written', icon: 'pen' },
  { id: 'audio', label: 'Audio/Podcast', icon: 'microphone' },
  { id: 'live_stream', label: 'Live Streaming', icon: 'broadcast' },
]

/**
 * Get content format info by ID
 */
export function getContentFormatInfo(id: ContentFormat): ContentFormatInfo | undefined {
  return CONTENT_FORMATS.find((f) => f.id === id)
}

/**
 * Platform metadata
 */
export const PLATFORMS: PlatformInfo[] = [
  { id: 'instagram', label: 'Instagram', icon: 'instagram', color: '#E4405F' },
  { id: 'tiktok', label: 'TikTok', icon: 'tiktok', color: '#000000' },
  { id: 'youtube', label: 'YouTube', icon: 'youtube', color: '#FF0000' },
  { id: 'twitter', label: 'X (Twitter)', icon: 'twitter', color: '#1DA1F2' },
  { id: 'facebook', label: 'Facebook', icon: 'facebook', color: '#1877F2' },
  { id: 'pinterest', label: 'Pinterest', icon: 'pinterest', color: '#BD081C' },
  { id: 'linkedin', label: 'LinkedIn', icon: 'linkedin', color: '#0A66C2' },
  { id: 'twitch', label: 'Twitch', icon: 'twitch', color: '#9146FF' },
  { id: 'snapchat', label: 'Snapchat', icon: 'snapchat', color: '#FFFC00' },
  { id: 'threads', label: 'Threads', icon: 'threads', color: '#000000' },
]

/**
 * Get platform info by ID
 */
export function getPlatformInfo(id: Platform): PlatformInfo | undefined {
  return PLATFORMS.find((p) => p.id === id)
}

/**
 * Proficiency level options
 */
export const PROFICIENCY_LEVELS = [
  { id: 'beginner', label: 'Beginner' },
  { id: 'intermediate', label: 'Intermediate' },
  { id: 'expert', label: 'Expert' },
] as const

/**
 * Common rate card templates
 */
export const RATE_CARD_TEMPLATES = [
  { platformOrType: 'instagram_post', label: 'Instagram Post' },
  { platformOrType: 'instagram_story', label: 'Instagram Story' },
  { platformOrType: 'instagram_reel', label: 'Instagram Reel' },
  { platformOrType: 'tiktok_video', label: 'TikTok Video' },
  { platformOrType: 'youtube_video', label: 'YouTube Video' },
  { platformOrType: 'youtube_short', label: 'YouTube Short' },
  { platformOrType: 'blog_post', label: 'Blog Post' },
  { platformOrType: 'twitter_post', label: 'Twitter/X Post' },
  { platformOrType: 'ugc_video', label: 'UGC Video' },
  { platformOrType: 'ugc_photo', label: 'UGC Photo Set' },
] as const

/**
 * Format follower count for display
 */
export function formatFollowerCount(count: number): string {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1)}M`
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1)}K`
  }
  return count.toString()
}
