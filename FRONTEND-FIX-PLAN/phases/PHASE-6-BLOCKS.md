# Phase 6: Storefront Block Components

> **Priority**: P2 - Medium
> **Impact**: Landing page builder completeness
> **Estimated Time**: 5-6 hours
> **Can Run In Parallel**: Yes, with other phases

---

## Overview

The storefront has 89 block types registered but only ~35 implemented. This phase implements the remaining high-value blocks.

**Location**: `/Users/holdenthemic/Documents/cgk/apps/storefront/src/components/blocks/`

---

## Block Categories to Implement

### 1. Layout Blocks (~5 blocks)

| Block | File | Purpose |
|-------|------|---------|
| HeaderBlock | `layout/HeaderBlock.tsx` | Site header with logo, nav, search, cart |
| FooterBlock | `layout/FooterBlock.tsx` | Site footer with columns, social, legal |
| MegaMenuBlock | `layout/MegaMenuBlock.tsx` | Dropdown mega menu |
| BreadcrumbBlock | `layout/BreadcrumbBlock.tsx` | Breadcrumb navigation |
| SidebarBlock | `layout/SidebarBlock.tsx` | Page sidebar container |

### 2. Content Blocks (~6 blocks)

| Block | File | Purpose |
|-------|------|---------|
| VideoEmbedBlock | `content/VideoEmbedBlock.tsx` | YouTube/Vimeo/Mux embed |
| BlogGridBlock | `content/BlogGridBlock.tsx` | Blog posts grid |
| IconGridBlock | `content/IconGridBlock.tsx` | Icon feature grid |
| ImageGalleryBlock | `content/ImageGalleryBlock.tsx` | Image gallery with lightbox |
| AccordionBlock | `content/AccordionBlock.tsx` | Expandable accordion |
| TabsBlock | `content/TabsBlock.tsx` | Tabbed content |

### 3. Social/UGC Blocks (~5 blocks)

| Block | File | Purpose |
|-------|------|---------|
| InstagramFeedBlock | `social/InstagramFeedBlock.tsx` | Instagram feed display |
| SocialProofBlock | `social/SocialProofBlock.tsx` | Social proof indicators |
| UGCBannerBlock | `social/UGCBannerBlock.tsx` | User-generated content |
| TrustSignalsBlock | `social/TrustSignalsBlock.tsx` | Trust badges |
| CommunityBlock | `social/CommunityBlock.tsx` | Community section |

### 4. Conversion Blocks (~6 blocks)

| Block | File | Purpose |
|-------|------|---------|
| ProductLineupBlock | `conversion/ProductLineupBlock.tsx` | Product comparison |
| BeforeAfterBlock | `conversion/BeforeAfterBlock.tsx` | Before/after slider |
| TestimonialCarouselBlock | `conversion/TestimonialCarouselBlock.tsx` | Testimonial carousel |
| GuaranteeBlock | `conversion/GuaranteeBlock.tsx` | Guarantee section |
| UrgencyBannerBlock | `conversion/UrgencyBannerBlock.tsx` | Urgency/scarcity |
| ExitIntentBlock | `conversion/ExitIntentBlock.tsx` | Exit intent config |

---

## Block Component Template

```typescript
'use client'

import { cn } from '@cgk-platform/ui'
import type { BlockProps } from '../types'

export interface MyBlockConfig {
  title?: string
  subtitle?: string
  items?: Array<{
    id: string
    // ... item properties
  }>
  layout?: 'grid' | 'list' | 'carousel'
  columns?: 2 | 3 | 4
}

export function MyBlock({ config, className }: BlockProps<MyBlockConfig>) {
  const {
    title,
    subtitle,
    items = [],
    layout = 'grid',
    columns = 3
  } = config

  return (
    <section className={cn('py-12 px-4', className)}>
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        {(title || subtitle) && (
          <div className="mb-8 text-center">
            {title && (
              <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
            )}
            {subtitle && (
              <p className="mt-2 text-lg text-muted-foreground">{subtitle}</p>
            )}
          </div>
        )}

        {/* Content */}
        <div className={cn(
          layout === 'grid' && `grid gap-6`,
          layout === 'grid' && columns === 2 && 'grid-cols-1 md:grid-cols-2',
          layout === 'grid' && columns === 3 && 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
          layout === 'grid' && columns === 4 && 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
          layout === 'list' && 'space-y-4'
        )}>
          {items.map((item) => (
            <div key={item.id} className="rounded-lg border p-6">
              {/* Render item */}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

---

## Registration Steps

After creating each block:

1. **Add to types** (`types.ts`):
```typescript
export interface MyBlockConfig {
  // ...
}

export type BlockConfig =
  | // existing...
  | MyBlockConfig
```

2. **Add to registry** (`registry.ts`):
```typescript
{
  type: 'my-block',
  name: 'My Block',
  icon: 'layout',
  category: 'content',
  defaultConfig: {
    title: 'Default Title',
    items: []
  }
}
```

3. **Add to BlockRenderer** (`BlockRenderer.tsx`):
```typescript
import { MyBlock } from './content/MyBlock'

const BLOCK_COMPONENTS: Record<string, ComponentType<BlockProps<any>>> = {
  // existing...
  'my-block': MyBlock,
}
```

4. **Export from index** (`index.ts`):
```typescript
export { MyBlock } from './content/MyBlock'
export type { MyBlockConfig } from './types'
```

---

## Implementation Notes

### Video Embed
- Support YouTube, Vimeo, and Mux
- Use iframe with proper attributes
- Lazy loading with thumbnail preview
- Responsive aspect ratio (16:9)

### Image Gallery
- Use CSS grid or Masonry layout
- Click to open lightbox
- Support captions
- Lazy load images

### Before/After Slider
- Drag to reveal comparison
- Touch support for mobile
- Labels for before/after

### Testimonial Carousel
- Auto-rotate with pause on hover
- Dot navigation
- Customer photo and name
- Star rating display

### Exit Intent
- Detect mouse leaving viewport
- Show modal with offer
- Cookie to prevent repeat shows
- Mobile-friendly alternative

---

## Tenant Theming

All blocks should support tenant theming via CSS variables:

```typescript
// Use portal theme variables
<div style={{
  backgroundColor: 'var(--portal-card)',
  color: 'var(--portal-foreground)',
  borderColor: 'var(--portal-border)',
}}>
```

Or with Tailwind classes that map to CSS variables in the theme.

---

## Verification

```bash
cd /Users/holdenthemic/Documents/cgk/apps/storefront
npx tsc --noEmit
```

---

## Completion Checklist

### Layout Blocks
- [x] HeaderBlock
- [x] FooterBlock
- [x] MegaMenuBlock
- [x] BreadcrumbBlock
- [x] SidebarBlock

### Content Blocks
- [x] VideoEmbedBlock
- [x] BlogGridBlock
- [x] IconGridBlock
- [x] ImageGalleryBlock
- [x] AccordionBlock
- [x] TabsBlock

### Social Blocks
- [x] InstagramFeedBlock
- [x] SocialProofBlock
- [x] UGCBannerBlock
- [x] TrustSignalsBlock
- [x] CommunityBlock

### Conversion Blocks
- [x] ProductLineupBlock
- [x] BeforeAfterBlock
- [x] TestimonialCarouselBlock
- [x] GuaranteeBlock
- [x] UrgencyBannerBlock
- [x] ExitIntentBlock

### Registration
- [x] All blocks added to types.ts
- [x] All blocks added to registry.ts
- [x] All blocks added to BlockRenderer.tsx
- [x] All blocks exported from index.ts

### Final
- [x] TypeScript check passes
- [x] All blocks support tenant theming

**Status**: ✅ COMPLETE (2026-02-16)
