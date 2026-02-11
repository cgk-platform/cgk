/**
 * Block palette configuration for the landing page editor
 * This file defines all 70+ block types and their metadata
 */

import type { BlockType } from '@/lib/landing-pages/types'

export interface BlockDefinition {
  type: BlockType
  label: string
  description: string
  icon: string
  category: string
  defaultConfig: Record<string, unknown>
}

export const BLOCK_DEFINITIONS: BlockDefinition[] = [
  // PDP Blocks (15)
  { type: 'pdp-hero', label: 'PDP Hero', description: 'Product hero with images and add to cart', icon: 'shopping-cart', category: 'pdp', defaultConfig: { show_reviews: true, show_trust_badges: true } },
  { type: 'pdp-trust-badges', label: 'Trust Badges', description: 'Security and shipping trust indicators', icon: 'shield', category: 'pdp', defaultConfig: {} },
  { type: 'pdp-science-section', label: 'Science Section', description: 'Scientific backing and research', icon: 'flask', category: 'pdp', defaultConfig: {} },
  { type: 'pdp-usage-guide', label: 'Usage Guide', description: 'How to use the product', icon: 'book', category: 'pdp', defaultConfig: {} },
  { type: 'pdp-ready-to-buy', label: 'Ready to Buy', description: 'Final CTA with product', icon: 'check', category: 'pdp', defaultConfig: {} },
  { type: 'pdp-ingredient-deep-dive', label: 'Ingredient Deep Dive', description: 'Detailed ingredient breakdown', icon: 'list', category: 'pdp', defaultConfig: {} },
  { type: 'pdp-featured-reviews', label: 'Featured Reviews', description: 'Highlighted customer reviews', icon: 'star', category: 'pdp', defaultConfig: {} },
  { type: 'pdp-yotpo-reviews', label: 'Yotpo Reviews', description: 'Yotpo reviews integration', icon: 'star', category: 'pdp', defaultConfig: {} },
  { type: 'pdp-recommendations', label: 'Recommendations', description: 'Related products', icon: 'grid', category: 'pdp', defaultConfig: {} },
  { type: 'pdp-benefits-grid', label: 'Benefits Grid', description: 'Product benefits layout', icon: 'grid', category: 'pdp', defaultConfig: {} },
  { type: 'pdp-before-after', label: 'Before/After', description: 'Before and after comparison', icon: 'compare', category: 'pdp', defaultConfig: {} },
  { type: 'pdp-video-testimonial', label: 'Video Testimonial', description: 'Customer video review', icon: 'video', category: 'pdp', defaultConfig: {} },
  { type: 'pdp-comparison-table', label: 'Comparison Table', description: 'Product comparison', icon: 'table', category: 'pdp', defaultConfig: {} },
  { type: 'pdp-how-it-works', label: 'How It Works', description: 'Step-by-step guide', icon: 'list-ordered', category: 'pdp', defaultConfig: {} },
  { type: 'pdp-subscription-options', label: 'Subscription Options', description: 'Subscribe and save', icon: 'repeat', category: 'pdp', defaultConfig: {} },

  // Promo Blocks (10)
  { type: 'bundle-builder', label: 'Bundle Builder', description: 'Create custom bundles', icon: 'package', category: 'promo', defaultConfig: {} },
  { type: 'promo-hero', label: 'Promo Hero', description: 'Promotional hero banner', icon: 'sparkles', category: 'promo', defaultConfig: {} },
  { type: 'feature-cards', label: 'Feature Cards', description: 'Feature highlight cards', icon: 'grid', category: 'promo', defaultConfig: {} },
  { type: 'text-banner', label: 'Text Banner', description: 'Announcement banner', icon: 'megaphone', category: 'promo', defaultConfig: {} },
  { type: 'faq-lifestyle', label: 'FAQ Lifestyle', description: 'FAQ with lifestyle imagery', icon: 'help-circle', category: 'promo', defaultConfig: {} },
  { type: 'countdown-timer', label: 'Countdown Timer', description: 'Sale countdown', icon: 'clock', category: 'promo', defaultConfig: {} },
  { type: 'sale-banner', label: 'Sale Banner', description: 'Sale announcement', icon: 'tag', category: 'promo', defaultConfig: {} },
  { type: 'flash-sale', label: 'Flash Sale', description: 'Limited time offer', icon: 'zap', category: 'promo', defaultConfig: {} },
  { type: 'gift-with-purchase', label: 'Gift with Purchase', description: 'Free gift promotion', icon: 'gift', category: 'promo', defaultConfig: {} },
  { type: 'tiered-discount', label: 'Tiered Discount', description: 'Buy more save more', icon: 'layers', category: 'promo', defaultConfig: {} },

  // Core Blocks (10)
  { type: 'hero', label: 'Hero', description: 'Main hero section', icon: 'layout', category: 'core', defaultConfig: { heading: '', subheading: '', cta_text: 'Shop Now', cta_url: '/shop' } },
  { type: 'benefits', label: 'Benefits', description: 'Benefits/features list', icon: 'check-circle', category: 'core', defaultConfig: {} },
  { type: 'reviews', label: 'Reviews', description: 'Customer reviews section', icon: 'star', category: 'core', defaultConfig: {} },
  { type: 'cta-banner', label: 'CTA Banner', description: 'Call-to-action banner', icon: 'megaphone', category: 'core', defaultConfig: {} },
  { type: 'markdown', label: 'Markdown', description: 'Rich text content', icon: 'type', category: 'core', defaultConfig: { content: '' } },
  { type: 'rich-text', label: 'Rich Text', description: 'HTML content', icon: 'type', category: 'core', defaultConfig: { content: '' } },
  { type: 'image', label: 'Image', description: 'Single image', icon: 'image', category: 'core', defaultConfig: { src: '', alt: '' } },
  { type: 'video', label: 'Video', description: 'Video embed', icon: 'video', category: 'core', defaultConfig: { src: '', autoplay: false, loop: false, muted: true } },
  { type: 'spacer', label: 'Spacer', description: 'Vertical spacing', icon: 'move-vertical', category: 'core', defaultConfig: { height: 40 } },
  { type: 'divider', label: 'Divider', description: 'Horizontal line', icon: 'minus', category: 'core', defaultConfig: {} },

  // Content Blocks (12)
  { type: 'text-image', label: 'Text + Image', description: 'Text with image on right', icon: 'layout', category: 'content', defaultConfig: {} },
  { type: 'image-text', label: 'Image + Text', description: 'Image with text on right', icon: 'layout', category: 'content', defaultConfig: {} },
  { type: 'two-column', label: 'Two Column', description: '2-column layout', icon: 'columns', category: 'content', defaultConfig: {} },
  { type: 'three-column', label: 'Three Column', description: '3-column layout', icon: 'columns', category: 'content', defaultConfig: {} },
  { type: 'four-column', label: 'Four Column', description: '4-column layout', icon: 'grid', category: 'content', defaultConfig: {} },
  { type: 'grid', label: 'Grid', description: 'Flexible grid layout', icon: 'grid', category: 'content', defaultConfig: {} },
  { type: 'masonry', label: 'Masonry', description: 'Masonry gallery', icon: 'grid', category: 'content', defaultConfig: {} },
  { type: 'carousel', label: 'Carousel', description: 'Image carousel', icon: 'play-circle', category: 'content', defaultConfig: {} },
  { type: 'slider', label: 'Slider', description: 'Content slider', icon: 'play-circle', category: 'content', defaultConfig: {} },
  { type: 'tabs', label: 'Tabs', description: 'Tabbed content', icon: 'folder', category: 'content', defaultConfig: {} },
  { type: 'accordion', label: 'Accordion', description: 'Collapsible sections', icon: 'chevrons-down', category: 'content', defaultConfig: {} },
  { type: 'timeline', label: 'Timeline', description: 'Chronological timeline', icon: 'clock', category: 'content', defaultConfig: {} },

  // Social Proof Blocks (8)
  { type: 'testimonials', label: 'Testimonials', description: 'Customer testimonials', icon: 'message-circle', category: 'social', defaultConfig: { layout: 'carousel' } },
  { type: 'logo-bar', label: 'Logo Bar', description: 'Partner/press logos', icon: 'image', category: 'social', defaultConfig: {} },
  { type: 'press-mentions', label: 'Press Mentions', description: 'Media coverage', icon: 'newspaper', category: 'social', defaultConfig: {} },
  { type: 'instagram-feed', label: 'Instagram Feed', description: 'Instagram gallery', icon: 'instagram', category: 'social', defaultConfig: {} },
  { type: 'ugc-gallery', label: 'UGC Gallery', description: 'User-generated content', icon: 'users', category: 'social', defaultConfig: {} },
  { type: 'trust-signals', label: 'Trust Signals', description: 'Security badges', icon: 'shield', category: 'social', defaultConfig: {} },
  { type: 'certifications', label: 'Certifications', description: 'Quality certifications', icon: 'award', category: 'social', defaultConfig: {} },
  { type: 'awards', label: 'Awards', description: 'Award badges', icon: 'trophy', category: 'social', defaultConfig: {} },

  // Commerce Blocks (8)
  { type: 'product-grid', label: 'Product Grid', description: 'Product collection', icon: 'grid', category: 'commerce', defaultConfig: { columns: 4, limit: 8 } },
  { type: 'product-carousel', label: 'Product Carousel', description: 'Scrolling products', icon: 'play-circle', category: 'commerce', defaultConfig: {} },
  { type: 'collection-list', label: 'Collection List', description: 'Collection links', icon: 'folder', category: 'commerce', defaultConfig: {} },
  { type: 'featured-product', label: 'Featured Product', description: 'Single product highlight', icon: 'star', category: 'commerce', defaultConfig: {} },
  { type: 'quick-add', label: 'Quick Add', description: 'Quick add to cart', icon: 'plus', category: 'commerce', defaultConfig: {} },
  { type: 'mini-cart', label: 'Mini Cart', description: 'Inline cart preview', icon: 'shopping-cart', category: 'commerce', defaultConfig: {} },
  { type: 'subscription-box', label: 'Subscription Box', description: 'Subscription signup', icon: 'repeat', category: 'commerce', defaultConfig: {} },
  { type: 'gift-card', label: 'Gift Card', description: 'Gift card purchase', icon: 'gift', category: 'commerce', defaultConfig: {} },

  // Interactive Blocks (9)
  { type: 'quiz', label: 'Quiz', description: 'Product finder quiz', icon: 'help-circle', category: 'interactive', defaultConfig: {} },
  { type: 'survey', label: 'Survey', description: 'Customer survey', icon: 'clipboard', category: 'interactive', defaultConfig: {} },
  { type: 'calculator', label: 'Calculator', description: 'Value calculator', icon: 'calculator', category: 'interactive', defaultConfig: {} },
  { type: 'configurator', label: 'Configurator', description: 'Product configurator', icon: 'settings', category: 'interactive', defaultConfig: {} },
  { type: 'size-guide', label: 'Size Guide', description: 'Size selection helper', icon: 'ruler', category: 'interactive', defaultConfig: {} },
  { type: 'ingredients-lookup', label: 'Ingredients Lookup', description: 'Search ingredients', icon: 'search', category: 'interactive', defaultConfig: {} },
  { type: 'store-locator', label: 'Store Locator', description: 'Find nearby stores', icon: 'map-pin', category: 'interactive', defaultConfig: {} },
  { type: 'contact-form', label: 'Contact Form', description: 'Contact submission', icon: 'mail', category: 'interactive', defaultConfig: {} },
  { type: 'newsletter-signup', label: 'Newsletter Signup', description: 'Email subscription', icon: 'mail', category: 'interactive', defaultConfig: { button_text: 'Subscribe', success_message: 'Thanks for subscribing!' } },

  // FAQ & Support Blocks (4)
  { type: 'faq-accordion', label: 'FAQ Accordion', description: 'Expandable FAQ', icon: 'help-circle', category: 'faq', defaultConfig: { allow_multiple: false } },
  { type: 'faq-categories', label: 'FAQ Categories', description: 'Categorized FAQ', icon: 'folder', category: 'faq', defaultConfig: {} },
  { type: 'help-center', label: 'Help Center', description: 'Support hub', icon: 'life-buoy', category: 'faq', defaultConfig: {} },
  { type: 'chat-widget', label: 'Chat Widget', description: 'Live chat trigger', icon: 'message-circle', category: 'faq', defaultConfig: {} },

  // Custom Blocks (3)
  { type: 'html-embed', label: 'HTML Embed', description: 'Custom HTML', icon: 'code', category: 'custom', defaultConfig: { html: '' } },
  { type: 'script-embed', label: 'Script Embed', description: 'External script', icon: 'code', category: 'custom', defaultConfig: { src: '' } },
  { type: 'custom-component', label: 'Custom Component', description: 'React component', icon: 'component', category: 'custom', defaultConfig: { component_name: '' } },
]

export function getBlockDefinition(type: BlockType): BlockDefinition | undefined {
  return BLOCK_DEFINITIONS.find((b) => b.type === type)
}

export function getBlocksByCategory(category: string): BlockDefinition[] {
  return BLOCK_DEFINITIONS.filter((b) => b.category === category)
}

export const BLOCK_COUNT = BLOCK_DEFINITIONS.length
