# Landing Page Blocks Module

> **Module**: `@/components/blocks`
> **Last Updated**: 2025-02-11

---

## Purpose

This module provides a block-based landing page system for the storefront.
It enables per-tenant landing pages with configurable content blocks that
are rendered at runtime without build-time compilation.

---

## Quick Reference

```typescript
import {
  BlockRenderer,
  BlockList,
  BLOCK_REGISTRY,
  isValidBlockType,
} from '@/components/blocks'

// Render a single block
<BlockRenderer block={block} />

// Render a list of blocks (auto-sorted by order)
<BlockList blocks={blocks} />
```

---

## Architecture

### Block Types

The system supports 70+ block types organized into categories:

| Category | Examples |
|----------|----------|
| Core | hero, benefits, reviews, markdown, cta-banner |
| Interactive | faq, countdown, contact-form |
| Layout | image-text, feature-cards, testimonial, spacer, divider |
| Promo | promo-hero, text-banner, bundle-builder |
| PDP | pdp-hero, pdp-trust-badges, pdp-reviews |
| Shop | shop-all-hero, shop-all-cta |
| Policy | policy-header, policy-content |
| About | about-hero, brand-story, founder-section |
| Science | science-hero, ingredient-exclusions |

### File Structure

```
src/components/blocks/
├── index.ts            # Main exports
├── types.ts            # Type definitions for all blocks
├── registry.ts         # Block type registry and metadata
├── icons.tsx           # Dynamic Lucide icon component
├── BlockRenderer.tsx   # Main renderer component
├── core/               # Core block components
│   ├── HeroBlock.tsx
│   ├── BenefitsBlock.tsx
│   ├── ReviewsBlock.tsx
│   ├── CTABannerBlock.tsx
│   └── MarkdownBlock.tsx
├── interactive/        # Interactive block components
│   ├── FAQBlock.tsx
│   └── CountdownBlock.tsx
└── layout/             # Layout block components
    ├── ImageTextBlock.tsx
    ├── FeatureCardsBlock.tsx
    ├── TestimonialBlock.tsx
    ├── SpacerBlock.tsx
    └── DividerBlock.tsx
```

---

## Key Patterns

### Pattern 1: Block Props Interface

Every block component uses the `BlockProps<T>` interface:

```typescript
import type { BlockProps, HeroConfig } from './types'

export function HeroBlock({ block, className }: BlockProps<HeroConfig>) {
  const { headline, subheadline, ...config } = block.config
  // ...
}
```

### Pattern 2: Unknown Block Handling

The BlockRenderer gracefully handles unknown block types:

```typescript
// Unknown types are skipped with a console warning in development
// In production, they render nothing
if (!isValidBlockType(block.type)) {
  console.warn(`Unknown block type: ${block.type}`)
  return null // Or show placeholder in dev
}
```

### Pattern 3: Theme Integration

All blocks use CSS custom properties for theming:

```tsx
// Use portal theme variables
<div className="bg-[hsl(var(--portal-primary))]">
  <h2 className="text-[hsl(var(--portal-foreground))]">
    {headline}
  </h2>
</div>
```

### Pattern 4: Adding a New Block

1. Add the type to `types.ts`:
```typescript
export type BlockType =
  // ... existing types
  | 'my-new-block'

export interface MyNewBlockConfig {
  // configuration options
}
```

2. Add to registry in `registry.ts`:
```typescript
'my-new-block': {
  type: 'my-new-block',
  label: 'My New Block',
  description: 'Description here',
  category: 'core',
  defaultConfig: {},
}
```

3. Create component in appropriate folder:
```typescript
// core/MyNewBlock.tsx
export function MyNewBlock({ block, className }: BlockProps<MyNewBlockConfig>) {
  // ...
}
```

4. Register in `BlockRenderer.tsx`:
```typescript
import { MyNewBlock } from './core/MyNewBlock'

const BLOCK_COMPONENTS = {
  // ...
  'my-new-block': MyNewBlock,
}
```

---

## Types Reference

### Core Types

```typescript
interface LandingPageBlock {
  id: string
  type: BlockType
  order: number
  config: BlockConfig
}

interface BlockProps<T extends BlockConfig = BlockConfig> {
  block: {
    id: string
    type: BlockType
    config: T
  }
  className?: string
}
```

### Common Config Types

```typescript
interface ButtonConfig {
  text: string
  href: string
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  openInNewTab?: boolean
}

interface ImageConfig {
  src: string
  alt: string
  width?: number
  height?: number
  priority?: boolean
}
```

---

## Animation Utilities

The blocks use these CSS animation classes (defined in globals.css):

- `animate-fade-in-up` - Fade in from below
- `animate-fade-in` - Simple fade in
- `animate-slide-in-left` - Slide in from left
- `animate-slide-in-right` - Slide in from right
- `animate-scale-in` - Scale up from smaller size

Use `animationDelay` for staggered effects:

```tsx
<div
  className="animate-fade-in-up"
  style={{ animationDelay: `${index * 100}ms` }}
>
```

---

## Common Gotchas

### 1. Block Order

Blocks must have an `order` property. The `BlockList` component sorts by this:

```typescript
const sortedBlocks = [...blocks].sort((a, b) => a.order - b.order)
```

### 2. Server vs Client Components

- Most blocks are server components
- Interactive blocks (FAQ accordion, Countdown) are client components
- The BlockRenderer itself is a server component

### 3. Image Handling

Always provide `sizes` prop for responsive images:

```tsx
<Image
  src={image.src}
  alt={image.alt}
  fill
  sizes="(max-width: 768px) 100vw, 50vw"
/>
```

---

## Integration Points

### Landing Pages Route

Landing pages are served from `/lp/[slug]`:

```typescript
// apps/storefront/src/app/lp/[slug]/page.tsx
const page = await getLandingPage(tenantSlug, slug)
return <BlockList blocks={page.blocks} />
```

### Admin Block Editor

The admin app uses the block registry for the builder palette:

```typescript
import { getBlockPalette, BLOCK_REGISTRY } from '@/components/blocks'
```

---

## Performance Notes

- Block components are lazy-loaded via dynamic imports
- Images use Next.js Image component with automatic optimization
- Animations use CSS transforms (GPU accelerated)
- Font loading uses preconnect hints
