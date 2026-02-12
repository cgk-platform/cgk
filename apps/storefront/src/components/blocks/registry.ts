/**
 * Block Registry
 *
 * Maps block types to their definitions and provides block metadata
 * for the landing page builder palette.
 */

import type { BlockType, BlockCategory, BlockDefinition } from './types'

/**
 * Complete registry of all available block types
 */
export const BLOCK_REGISTRY: Record<BlockType, BlockDefinition> = {
  // ============================================================================
  // Core Blocks
  // ============================================================================
  hero: {
    type: 'hero',
    label: 'Hero',
    description: 'Full-width hero section with headline, image, and CTA',
    category: 'core',
    icon: 'layout-template',
    defaultConfig: {
      headline: 'Welcome to our store',
      subheadline: 'Discover amazing products',
      textAlignment: 'center',
      height: 'lg',
    },
  },
  benefits: {
    type: 'benefits',
    label: 'Benefits',
    description: 'Showcase key benefits with icons and descriptions',
    category: 'core',
    icon: 'badge-check',
    defaultConfig: {
      headline: 'Why Choose Us',
      items: [],
      columns: 3,
      layout: 'grid',
    },
  },
  reviews: {
    type: 'reviews',
    label: 'Reviews',
    description: 'Display customer reviews and ratings',
    category: 'core',
    icon: 'star',
    defaultConfig: {
      headline: 'What Our Customers Say',
      reviews: [],
      layout: 'grid',
      showRatingsSummary: true,
    },
  },
  markdown: {
    type: 'markdown',
    label: 'Rich Text',
    description: 'Markdown content block for flexible text',
    category: 'core',
    icon: 'file-text',
    defaultConfig: {
      content: '',
      maxWidth: 'md',
      textAlignment: 'left',
    },
  },
  'cta-banner': {
    type: 'cta-banner',
    label: 'CTA Banner',
    description: 'Call-to-action banner with button',
    category: 'core',
    icon: 'megaphone',
    defaultConfig: {
      headline: 'Ready to get started?',
      layout: 'centered',
    },
  },
  'ugc-banner': {
    type: 'ugc-banner',
    label: 'UGC Banner',
    description: 'User-generated content gallery',
    category: 'core',
    icon: 'image',
    defaultConfig: {
      images: [],
      layout: 'grid',
      columns: 4,
    },
  },
  'trust-signals': {
    type: 'trust-signals',
    label: 'Trust Signals',
    description: 'Trust badges and guarantees',
    category: 'core',
    icon: 'shield-check',
    defaultConfig: {
      signals: [],
      layout: 'inline',
    },
  },
  'product-lineup': {
    type: 'product-lineup',
    label: 'Product Lineup',
    description: 'Showcase products in a grid or carousel',
    category: 'core',
    icon: 'grid',
    defaultConfig: {
      products: [],
      layout: 'grid',
      columns: 3,
      showPrices: true,
      showAddToCart: true,
    },
  },
  'blog-grid': {
    type: 'blog-grid',
    label: 'Blog Grid',
    description: 'Display blog posts in a grid',
    category: 'core',
    icon: 'newspaper',
    defaultConfig: {
      posts: [],
      columns: 3,
      showExcerpts: true,
      showDates: true,
    },
  },
  'thank-you-content': {
    type: 'thank-you-content',
    label: 'Thank You Content',
    description: 'Post-purchase thank you message',
    category: 'core',
    icon: 'heart',
    defaultConfig: {
      headline: 'Thank You!',
      orderConfirmation: true,
    },
  },

  // ============================================================================
  // Interactive Blocks
  // ============================================================================
  faq: {
    type: 'faq',
    label: 'FAQ',
    description: 'Frequently asked questions accordion',
    category: 'interactive',
    icon: 'help-circle',
    defaultConfig: {
      headline: 'Frequently Asked Questions',
      items: [],
      layout: 'accordion',
      allowMultipleOpen: false,
    },
  },
  countdown: {
    type: 'countdown',
    label: 'Countdown',
    description: 'Countdown timer for promotions',
    category: 'interactive',
    icon: 'timer',
    defaultConfig: {
      showDays: true,
      showHours: true,
      showMinutes: true,
      showSeconds: true,
      style: 'boxed',
    },
  },
  community: {
    type: 'community',
    label: 'Community',
    description: 'Community stats and social links',
    category: 'interactive',
    icon: 'users',
    defaultConfig: {
      stats: [],
      socialLinks: [],
    },
  },
  'contact-form': {
    type: 'contact-form',
    label: 'Contact Form',
    description: 'Contact or inquiry form',
    category: 'interactive',
    icon: 'mail',
    defaultConfig: {
      headline: 'Get in Touch',
      submitButtonText: 'Send Message',
      fields: [
        { name: 'name', label: 'Name', type: 'text', required: true },
        { name: 'email', label: 'Email', type: 'email', required: true },
        { name: 'message', label: 'Message', type: 'textarea', required: true },
      ],
    },
  },

  // ============================================================================
  // Layout Blocks
  // ============================================================================
  'image-text': {
    type: 'image-text',
    label: 'Image + Text',
    description: 'Split layout with image and text',
    category: 'layout',
    icon: 'layout',
    defaultConfig: {
      headline: '',
      description: '',
      imagePosition: 'left',
      verticalAlign: 'center',
    },
  },
  'video-embed': {
    type: 'video-embed',
    label: 'Video',
    description: 'Embedded video player',
    category: 'layout',
    icon: 'play-circle',
    defaultConfig: {
      videoUrl: '',
      provider: 'youtube',
      aspectRatio: '16:9',
      controls: true,
    },
  },
  testimonial: {
    type: 'testimonial',
    label: 'Testimonial',
    description: 'Single featured testimonial',
    category: 'layout',
    icon: 'quote',
    defaultConfig: {
      quote: '',
      author: '',
      style: 'card',
    },
  },
  'icon-grid': {
    type: 'icon-grid',
    label: 'Icon Grid',
    description: 'Grid of icons with labels',
    category: 'layout',
    icon: 'grid-3x3',
    defaultConfig: {
      items: [],
      columns: 4,
      iconSize: 'md',
      showDescriptions: true,
    },
  },
  spacer: {
    type: 'spacer',
    label: 'Spacer',
    description: 'Vertical spacing element',
    category: 'layout',
    icon: 'arrow-up-down',
    defaultConfig: {
      height: 'md',
      showOnMobile: true,
    },
  },
  divider: {
    type: 'divider',
    label: 'Divider',
    description: 'Horizontal divider line',
    category: 'layout',
    icon: 'minus',
    defaultConfig: {
      style: 'solid',
      width: 'full',
      margin: 'md',
    },
  },

  // ============================================================================
  // Promo Blocks
  // ============================================================================
  'promo-countdown': {
    type: 'promo-countdown',
    label: 'Promo Countdown',
    description: 'Promotional countdown with urgency messaging',
    category: 'promo',
    icon: 'clock',
    defaultConfig: {},
  },
  'promo-hero': {
    type: 'promo-hero',
    label: 'Promo Hero',
    description: 'Promotional hero with discount display',
    category: 'promo',
    icon: 'tag',
    defaultConfig: {},
  },
  'text-banner': {
    type: 'text-banner',
    label: 'Text Banner',
    description: 'Simple scrolling text banner',
    category: 'promo',
    icon: 'type',
    defaultConfig: {
      text: '',
      size: 'md',
      animate: false,
    },
  },
  'split-text-banner': {
    type: 'split-text-banner',
    label: 'Split Text Banner',
    description: 'Two-column text banner',
    category: 'promo',
    icon: 'columns',
    defaultConfig: {},
  },
  'centered-text': {
    type: 'centered-text',
    label: 'Centered Text',
    description: 'Centered headline and description',
    category: 'promo',
    icon: 'align-center',
    defaultConfig: {
      headline: '',
      maxWidth: 'md',
      textSize: 'lg',
    },
  },
  'feature-cards': {
    type: 'feature-cards',
    label: 'Feature Cards',
    description: 'Grid of feature cards with icons',
    category: 'promo',
    icon: 'layers',
    defaultConfig: {
      cards: [],
      columns: 3,
      cardStyle: 'elevated',
    },
  },
  'promo-buy-box': {
    type: 'promo-buy-box',
    label: 'Promo Buy Box',
    description: 'Product purchase box with promo',
    category: 'promo',
    icon: 'shopping-cart',
    defaultConfig: {},
  },
  'dynamic-reviews': {
    type: 'dynamic-reviews',
    label: 'Dynamic Reviews',
    description: 'Animated review carousel',
    category: 'promo',
    icon: 'message-circle',
    defaultConfig: {},
  },
  'bundle-builder': {
    type: 'bundle-builder',
    label: 'Bundle Builder',
    description: 'Interactive bundle configuration',
    category: 'promo',
    icon: 'package',
    defaultConfig: {},
  },
  'faq-lifestyle': {
    type: 'faq-lifestyle',
    label: 'Lifestyle FAQ',
    description: 'FAQ with lifestyle imagery',
    category: 'promo',
    icon: 'help-circle',
    defaultConfig: {},
  },

  // ============================================================================
  // PDP Blocks
  // ============================================================================
  'pdp-hero': {
    type: 'pdp-hero',
    label: 'PDP Hero',
    description: 'Product detail page hero section',
    category: 'pdp',
    icon: 'box',
    defaultConfig: {},
  },
  'pdp-trust-badges': {
    type: 'pdp-trust-badges',
    label: 'PDP Trust Badges',
    description: 'Product trust signals and badges',
    category: 'pdp',
    icon: 'award',
    defaultConfig: {},
  },
  'pdp-ready-to-buy': {
    type: 'pdp-ready-to-buy',
    label: 'Ready to Buy',
    description: 'Quick add-to-cart section',
    category: 'pdp',
    icon: 'shopping-bag',
    defaultConfig: {},
  },
  'pdp-recommendations': {
    type: 'pdp-recommendations',
    label: 'Recommendations',
    description: 'Related product recommendations',
    category: 'pdp',
    icon: 'thumbs-up',
    defaultConfig: {},
  },
  'pdp-before-after': {
    type: 'pdp-before-after',
    label: 'Before/After',
    description: 'Before and after comparison',
    category: 'pdp',
    icon: 'git-compare',
    defaultConfig: {},
  },
  'pdp-science-section': {
    type: 'pdp-science-section',
    label: 'Science Section',
    description: 'Scientific backing information',
    category: 'pdp',
    icon: 'flask-conical',
    defaultConfig: {},
  },
  'pdp-usage-guide': {
    type: 'pdp-usage-guide',
    label: 'Usage Guide',
    description: 'How to use the product',
    category: 'pdp',
    icon: 'book-open',
    defaultConfig: {},
  },
  'pdp-ingredient-deep-dive': {
    type: 'pdp-ingredient-deep-dive',
    label: 'Ingredient Deep Dive',
    description: 'Detailed ingredient breakdown',
    category: 'pdp',
    icon: 'microscope',
    defaultConfig: {},
  },
  'pdp-bundle-why': {
    type: 'pdp-bundle-why',
    label: 'Bundle Why',
    description: 'Why buy this bundle',
    category: 'pdp',
    icon: 'help-circle',
    defaultConfig: {},
  },
  'pdp-bundle-included': {
    type: 'pdp-bundle-included',
    label: 'Bundle Included',
    description: 'What is included in bundle',
    category: 'pdp',
    icon: 'list',
    defaultConfig: {},
  },
  'pdp-bundle-pricing': {
    type: 'pdp-bundle-pricing',
    label: 'Bundle Pricing',
    description: 'Bundle pricing breakdown',
    category: 'pdp',
    icon: 'dollar-sign',
    defaultConfig: {},
  },
  'pdp-featured-reviews': {
    type: 'pdp-featured-reviews',
    label: 'Featured Reviews',
    description: 'Highlighted customer reviews',
    category: 'pdp',
    icon: 'star',
    defaultConfig: {},
  },
  'pdp-yotpo-reviews': {
    type: 'pdp-yotpo-reviews',
    label: 'Yotpo Reviews',
    description: 'Yotpo review widget integration',
    category: 'pdp',
    icon: 'message-square',
    defaultConfig: {},
  },
  'pdp-lifestyle-image': {
    type: 'pdp-lifestyle-image',
    label: 'Lifestyle Image',
    description: 'Full-width lifestyle image',
    category: 'pdp',
    icon: 'image',
    defaultConfig: {},
  },

  // ============================================================================
  // Shop Blocks
  // ============================================================================
  'shop-all-hero': {
    type: 'shop-all-hero',
    label: 'Shop All Hero',
    description: 'Shop page hero section',
    category: 'shop',
    icon: 'store',
    defaultConfig: {},
  },
  'shop-all-countdown': {
    type: 'shop-all-countdown',
    label: 'Shop Countdown',
    description: 'Shop page promotional countdown',
    category: 'shop',
    icon: 'timer',
    defaultConfig: {},
  },
  'shop-all-why-choose': {
    type: 'shop-all-why-choose',
    label: 'Why Choose',
    description: 'Why choose our products section',
    category: 'shop',
    icon: 'check-circle',
    defaultConfig: {},
  },
  'shop-all-testimonials': {
    type: 'shop-all-testimonials',
    label: 'Shop Testimonials',
    description: 'Shop page testimonials',
    category: 'shop',
    icon: 'users',
    defaultConfig: {},
  },
  'shop-all-cta': {
    type: 'shop-all-cta',
    label: 'Shop CTA',
    description: 'Shop page call-to-action',
    category: 'shop',
    icon: 'arrow-right',
    defaultConfig: {},
  },

  // ============================================================================
  // Policy Blocks
  // ============================================================================
  'policy-header': {
    type: 'policy-header',
    label: 'Policy Header',
    description: 'Policy page header',
    category: 'policy',
    icon: 'file-text',
    defaultConfig: {},
  },
  'policy-content': {
    type: 'policy-content',
    label: 'Policy Content',
    description: 'Policy text content',
    category: 'policy',
    icon: 'align-left',
    defaultConfig: {},
  },
  'policy-contact': {
    type: 'policy-contact',
    label: 'Policy Contact',
    description: 'Policy contact information',
    category: 'policy',
    icon: 'mail',
    defaultConfig: {},
  },
  'policy-notice': {
    type: 'policy-notice',
    label: 'Policy Notice',
    description: 'Important policy notice',
    category: 'policy',
    icon: 'alert-circle',
    defaultConfig: {},
  },
  'text-content': {
    type: 'text-content',
    label: 'Text Content',
    description: 'General text content block',
    category: 'policy',
    icon: 'type',
    defaultConfig: {},
  },

  // ============================================================================
  // About Blocks
  // ============================================================================
  'about-hero': {
    type: 'about-hero',
    label: 'About Hero',
    description: 'About page hero section',
    category: 'about',
    icon: 'info',
    defaultConfig: {},
  },
  'brand-story': {
    type: 'brand-story',
    label: 'Brand Story',
    description: 'Brand origin story',
    category: 'about',
    icon: 'book',
    defaultConfig: {},
  },
  'founder-section': {
    type: 'founder-section',
    label: 'Founder Section',
    description: 'Founder information and story',
    category: 'about',
    icon: 'user',
    defaultConfig: {},
  },
  'mission-values': {
    type: 'mission-values',
    label: 'Mission & Values',
    description: 'Company mission and values',
    category: 'about',
    icon: 'target',
    defaultConfig: {},
  },
  'team-section': {
    type: 'team-section',
    label: 'Team Section',
    description: 'Team members grid',
    category: 'about',
    icon: 'users',
    defaultConfig: {},
  },
  'manifesto-section': {
    type: 'manifesto-section',
    label: 'Manifesto',
    description: 'Brand manifesto section',
    category: 'about',
    icon: 'flag',
    defaultConfig: {},
  },

  // ============================================================================
  // Science Blocks
  // ============================================================================
  'science-hero': {
    type: 'science-hero',
    label: 'Science Hero',
    description: 'Science page hero section',
    category: 'science',
    icon: 'flask-conical',
    defaultConfig: {},
  },
  'philosophy-principles': {
    type: 'philosophy-principles',
    label: 'Philosophy Principles',
    description: 'Scientific philosophy and principles',
    category: 'science',
    icon: 'lightbulb',
    defaultConfig: {},
  },
  'ingredient-exclusions': {
    type: 'ingredient-exclusions',
    label: 'Ingredient Exclusions',
    description: 'What we exclude and why',
    category: 'science',
    icon: 'x-circle',
    defaultConfig: {},
  },
  'biomimetic-technology': {
    type: 'biomimetic-technology',
    label: 'Biomimetic Technology',
    description: 'Biomimetic science explanation',
    category: 'science',
    icon: 'dna',
    defaultConfig: {},
  },
  'endocrine-health': {
    type: 'endocrine-health',
    label: 'Endocrine Health',
    description: 'Endocrine health information',
    category: 'science',
    icon: 'activity',
    defaultConfig: {},
  },
  'peptide-technology': {
    type: 'peptide-technology',
    label: 'Peptide Technology',
    description: 'Peptide technology explanation',
    category: 'science',
    icon: 'zap',
    defaultConfig: {},
  },
  'product-deep-dive': {
    type: 'product-deep-dive',
    label: 'Product Deep Dive',
    description: 'In-depth product analysis',
    category: 'science',
    icon: 'search',
    defaultConfig: {},
  },
  'brand-comparison': {
    type: 'brand-comparison',
    label: 'Brand Comparison',
    description: 'Compare with other brands',
    category: 'science',
    icon: 'git-compare',
    defaultConfig: {},
  },
  'full-width-cta': {
    type: 'full-width-cta',
    label: 'Full Width CTA',
    description: 'Full-width call-to-action',
    category: 'science',
    icon: 'arrow-right-circle',
    defaultConfig: {},
  },

  // ============================================================================
  // Brand-Specific Blocks
  // ============================================================================
  results: {
    type: 'results',
    label: 'Results',
    description: 'Customer results showcase',
    category: 'brand',
    icon: 'trending-up',
    defaultConfig: {},
  },
  'rawdog-standard': {
    type: 'rawdog-standard',
    label: 'The Standard',
    description: 'Brand standard section',
    category: 'brand',
    icon: 'badge',
    defaultConfig: {},
  },
  'no-mens-brand': {
    type: 'no-mens-brand',
    label: 'No Mens Brand',
    description: 'Brand differentiation section',
    category: 'brand',
    icon: 'x',
    defaultConfig: {},
  },
  'new-standard': {
    type: 'new-standard',
    label: 'New Standard',
    description: 'New standard introduction',
    category: 'brand',
    icon: 'star',
    defaultConfig: {},
  },
  upgrade: {
    type: 'upgrade',
    label: 'Upgrade',
    description: 'Upgrade/upsell section',
    category: 'brand',
    icon: 'arrow-up',
    defaultConfig: {},
  },
  science: {
    type: 'science',
    label: 'Science',
    description: 'General science section',
    category: 'brand',
    icon: 'flask-conical',
    defaultConfig: {},
  },
  'health-matrix': {
    type: 'health-matrix',
    label: 'Health Matrix',
    description: 'Health benefits matrix',
    category: 'brand',
    icon: 'grid',
    defaultConfig: {},
  },
}

/**
 * Get blocks by category
 */
export function getBlocksByCategory(category: BlockCategory): BlockDefinition[] {
  return Object.values(BLOCK_REGISTRY).filter((block) => block.category === category)
}

/**
 * Get all block categories with their blocks
 */
export function getBlockPalette(): Array<{
  category: BlockCategory
  label: string
  blocks: BlockDefinition[]
}> {
  const categoryLabels: Record<BlockCategory, string> = {
    core: 'Core',
    brand: 'Brand',
    interactive: 'Interactive',
    layout: 'Layout',
    promo: 'Promotional',
    pdp: 'Product Page',
    shop: 'Shop Page',
    policy: 'Policy',
    about: 'About',
    science: 'Science',
  }

  const categories: BlockCategory[] = [
    'core',
    'layout',
    'interactive',
    'promo',
    'pdp',
    'shop',
    'about',
    'science',
    'policy',
    'brand',
  ]

  return categories.map((category) => ({
    category,
    label: categoryLabels[category],
    blocks: getBlocksByCategory(category),
  }))
}

/**
 * Check if a block type exists in the registry
 */
export function isValidBlockType(type: string): type is BlockType {
  return type in BLOCK_REGISTRY
}

/**
 * Get block definition by type
 */
export function getBlockDefinition(type: BlockType): BlockDefinition | undefined {
  return BLOCK_REGISTRY[type]
}
