# Meliusly Asset to Section Mapping

**Purpose:** Quick reference for linking Figma sections to their required assets during implementation.

**Date:** 2026-03-02
**Status:** Complete

---

## Homepage Sections

### Hero (1:4243, 700px)

**Assets:**

- Desktop Image: `/meliusly/hero/hero-desktop.webp` (1920x1153px, 103 KB)
- Mobile Image: `/meliusly/hero/hero-mobile.webp` (768x461px, 29 KB)
- Logo: `/meliusly/hero/69bb33a6f2ea1403b208fab9c38e49c39bcb12bf.png` (123x28px, 74 KB)

**Typography:**

- Headline: Manrope SemiBold 40px (desktop), 32px (mobile)
- Subheadline: Manrope Medium 22px (desktop), 18px (mobile)
- CTA Button: Manrope SemiBold 16px

**Colors:**

- Primary: #0268A0 (CTA button background)
- White: #FFFFFF (text on hero image)
- Dark: #161F2B (button text)

**CTA Destination:**

- "Shop Now" → `/collections/all`

---

### Trust Bar (1:4244, 121px)

**Assets:**

- Happy Customers Icon: `/meliusly/icons/4dd74a1c5dd40eb8c3d6450fc86c738ea515a8f5.svg`
- 5-Star Reviews Icon: `/meliusly/icons/8086ea1846a018a446cd213b5097d8f6efb98140.svg`
- USA Icon: `/meliusly/icons/96b3c0498424496a69a7db3042ceb5816acb8309.svg`
- Featured Icon: `/meliusly/icons/df67599317682c6be94c56e9ac81162f31cb1b30.svg`

**Typography:**

- Badge Title: Manrope SemiBold 16px
- Badge Subtitle: Manrope Medium 13px

**Colors:**

- Background: #2E3F56 (dark blue)
- Text: #FFFFFF (white)

**Layout:**

- 4 badges
- Desktop: Horizontal row with dividers
- Mobile: 2x2 grid or vertical stack

---

### Product Type Selector (1:4245, 623px)

**Assets:**

- Product Images: To be extracted per product type
  - SleepSaver: TBD
  - Classic Sleeper: TBD
  - Flex Sleeper: TBD

**Typography:**

- Section Title: Manrope SemiBold 32px (desktop), 28px (mobile)
- Product Name: Manrope SemiBold 24px
- Product Description: Manrope Medium 16px

**Colors:**

- Primary: #0268A0 (hover state, CTA)
- Dark: #161F2B (text)
- Light Gray: #F6F6F6 (card background)

**CTAs:**

- Each product card → `/products/{handle}`

**Layout:**

- 3 product type cards
- Desktop: 3 columns
- Mobile: 1 column (vertical stack)
- Aspect Ratio: 3:4

---

### Product Grid (1:4246, 878px)

**Assets:**

- Product images fetched from Shopify
- Cart icon: `/meliusly/icons/94a6c1cd3fb2b84654c2ac4947061d8ef9c3aa21.svg`
- Star rating icon: `/meliusly/icons/aba31c4e9f3d230c9971722c0cbb1c57ca70399a.svg`

**Typography:**

- Section Title: Manrope SemiBold 32px (desktop), 28px (mobile)
- Product Title: Manrope Medium 16px
- Price: Manrope SemiBold 18px
- CTA Button: Manrope SemiBold 14px

**Colors:**

- Primary: #0268A0 (button, hover states)
- Dark: #161F2B (text)
- Gray: #777777 (compare-at price strikethrough)

**CTAs:**

- Product card → `/products/{handle}`
- "Shop All" → `/collections/all`
- "Add to Cart" → Opens cart drawer

**Layout:**

- Desktop: 4 columns
- Tablet: 3 columns
- Mobile: 2 columns
- Display: 8 best-selling products

---

### Shipping Banner (1:4247, 82px)

**Assets:**

- Icon: TBD (shipping truck or checkmark)

**Typography:**

- Banner Text: Manrope SemiBold 14px (desktop), 13px (mobile)

**Colors:**

- Background: #0268A0 (primary blue)
- Text: #FFFFFF (white)

**Content:**

- "Free Shipping on Orders Over $99"

---

### Why Meliusly (1:4248, 525px)

**Assets:**

- Icon/Illustration per USP (TBD - extract from Figma)

**Typography:**

- Section Title: Manrope SemiBold 32px (desktop), 28px (mobile)
- USP Title: Manrope SemiBold 18px
- USP Description: Manrope Medium 14px

**Colors:**

- Primary: #0268A0 (icons, accents)
- Dark: #161F2B (titles)
- Gray: #737373 (descriptions)

**Layout:**

- Desktop: 3 columns
- Mobile: 1 column (vertical stack)
- Each USP: Icon + Title + Description

---

### Reviews Carousel (1:4249, 877px)

**Assets:**

- Star rating icon: `/meliusly/icons/aba31c4e9f3d230c9971722c0cbb1c57ca70399a.svg`
- Customer photos: TBD (if user-generated content)
- Navigation arrows: `/meliusly/icons/32a4ab719d9ca432f9c961003c881f9a03a1d5b5.svg` (rotated)

**Typography:**

- Section Title: Manrope SemiBold 32px (desktop), 28px (mobile)
- Review Title: Manrope SemiBold 16px
- Review Text: Manrope Medium 14px, line-height: 1.6
- Reviewer Name: Manrope SemiBold 13px
- Verified Badge: Manrope Medium 12px

**Colors:**

- Primary: #0268A0 (stars)
- Dark: #161F2B (text)
- Light Gray: #F6F6F6 (review card background)

**Layout:**

- Carousel with 3 visible reviews (desktop)
- Carousel with 1 visible review (mobile)
- Dots pagination below

---

### About Section (1:4250, 743px)

**Assets:**

- About image/photo: TBD (extract from Figma)

**Typography:**

- Section Title: Manrope SemiBold 32px (desktop), 28px (mobile)
- Body Text: Manrope Medium 16px, line-height: 1.6
- CTA Button: Manrope SemiBold 16px

**Colors:**

- Primary: #0268A0 (CTA button)
- Dark: #161F2B (text)
- White: #FFFFFF (button text)

**CTAs:**

- "Learn More" → `/about`

**Layout:**

- Desktop: 2 columns (image left, text right)
- Mobile: 1 column (image top, text bottom)

---

### Product Guides (1:4251, 423px)

**Assets:**

- Guide thumbnails: TBD (extract from Figma)
- Download icon: `/meliusly/icons/3e3f83024d8ceac85a45da782669f87984aa6450.svg`

**Typography:**

- Section Title: Manrope SemiBold 28px (desktop), 24px (mobile)
- Guide Title: Manrope SemiBold 16px
- Guide Description: Manrope Medium 14px

**Colors:**

- Primary: #0268A0 (download icon, hover)
- Dark: #161F2B (text)
- Light Gray: #F6F6F6 (card background)

**CTAs:**

- Guide cards → PDF downloads or guide pages

**Layout:**

- Desktop: 3 columns
- Mobile: 1 column

---

### Org Section (1:4252, 358px)

**Assets:**

- Company logo/badge: TBD
- Certification icons: TBD

**Typography:**

- Section Title: Manrope SemiBold 28px (desktop), 24px (mobile)
- Body Text: Manrope Medium 16px, line-height: 1.6

**Colors:**

- Primary: #0268A0 (accents)
- Dark: #161F2B (text)

**Layout:**

- Centered content
- Logo/badge above text

---

### Traits Bar (1:4253, 104px)

**Assets:**

- Trait icons: TBD (extract from Figma)

**Typography:**

- Trait Label: Manrope Medium 13px

**Colors:**

- Background: #F6F6F6 (light gray)
- Text: #161F2B (dark)
- Icons: #0268A0 (primary)

**Layout:**

- Horizontal row
- 4-5 traits
- Desktop: All visible
- Mobile: Horizontal scroll or wrap

---

### Footer (1:4254, 396px desktop, 1149px mobile)

**Assets:**

- Logo: `/meliusly/hero/69bb33a6f2ea1403b208fab9c38e49c39bcb12bf.png`
- Social icons: TBD (Facebook, Instagram, Twitter, YouTube - use lucide-react)
- Payment icons: TBD (Visa, Mastercard, Amex, PayPal)

**Typography:**

- Column Title: Manrope SemiBold 16px
- Links: Manrope Medium 14px
- Newsletter Input: Manrope Medium 14px
- Copyright: Manrope Medium 12px

**Colors:**

- Background: #161F2B (dark navy)
- Text: #FFFFFF (white)
- Link Hover: #6ABFEF (light blue)
- Input Border: #777777 (dark gray)

**Layout:**

- Desktop: 4 columns (Brand, Shop, Support, Company)
- Mobile: 1 column (accordion or full expand)
- Newsletter signup at bottom
- Social links in brand column
- Payment icons in bottom bar

---

## Product Detail Page (PDP) Sections

### PDP Header (1:4128, 1455px)

**Assets:**

- Product images from Shopify
- Thumbnail grid: Product images
- Cart icon: `/meliusly/icons/94a6c1cd3fb2b84654c2ac4947061d8ef9c3aa21.svg`
- Star rating icon: `/meliusly/icons/aba31c4e9f3d230c9971722c0cbb1c57ca70399a.svg`

**Typography:**

- Product Title: Manrope SemiBold 32px (desktop), 28px (mobile)
- Price: Manrope Bold 32px
- Compare-at Price: Manrope Medium 24px, strikethrough
- Variant Label: Manrope SemiBold 14px
- Description: Manrope Medium 16px, line-height: 1.6
- CTA Button: Manrope SemiBold 16px

**Colors:**

- Primary: #0268A0 (selected variant, add to cart button)
- Dark: #161F2B (text)
- Gray: #777777 (compare-at price)
- Light Gray: #F6F6F6 (variant button background)

**CTAs:**

- Variant selector → Update price/availability
- Quantity selector → Update quantity
- "Add to Cart" → Add to cart, open drawer

**Layout:**

- Desktop: 2 columns (gallery left, info right)
- Mobile: 1 column (gallery top, info bottom)
- Gallery: Main image + thumbnail grid

---

### Benefits Block (1:4129, 741px)

**Assets:**

- Benefit icons: TBD (extract from Figma)

**Typography:**

- Section Title: Manrope SemiBold 32px (desktop), 28px (mobile)
- Benefit Title: Manrope SemiBold 18px
- Benefit Description: Manrope Medium 14px, line-height: 1.6

**Colors:**

- Primary: #0268A0 (icons)
- Dark: #161F2B (text)

**Layout:**

- Desktop: 3 columns
- Mobile: 1 column
- Each benefit: Icon + Title + Description

---

### Features Block (1:4130, 722px)

**Assets:**

- Feature images/diagrams: TBD

**Typography:**

- Section Title: Manrope SemiBold 32px (desktop), 28px (mobile)
- Feature Title: Manrope SemiBold 18px
- Feature Description: Manrope Medium 14px, line-height: 1.6

**Colors:**

- Primary: #0268A0 (accents)
- Dark: #161F2B (text)

**Layout:**

- Desktop: Alternating layout (image left, text right, then text left, image right)
- Mobile: 1 column (image top, text bottom)

---

### Reviews Section (1:4131, 895px)

**Assets:**

- Star rating icon: `/meliusly/icons/aba31c4e9f3d230c9971722c0cbb1c57ca70399a.svg`
- Customer photos: TBD (user-generated)

**Typography:**

- Section Title: Manrope SemiBold 32px (desktop), 28px (mobile)
- Review Title: Manrope SemiBold 16px
- Review Text: Manrope Medium 14px, line-height: 1.6
- Reviewer Name: Manrope SemiBold 13px
- Verified Badge: Manrope Medium 12px

**Colors:**

- Primary: #0268A0 (stars, verified badge)
- Dark: #161F2B (text)
- Light Gray: #F6F6F6 (review card background)

**Layout:**

- Desktop: 2 columns
- Mobile: 1 column
- Pagination: Show first 6, "Load More" button

---

### Dimensions (1:4132, 554px)

**Assets:**

- Dimension diagram: TBD (extract from Figma)
- Ruler icon: (use lucide-react)

**Typography:**

- Section Title: Manrope SemiBold 28px (desktop), 24px (mobile)
- Table Headers: Manrope SemiBold 14px
- Table Data: Manrope Medium 14px

**Colors:**

- Primary: #0268A0 (table headers)
- Dark: #161F2B (text)
- Light Gray: #F6F6F6 (table row alternating background)

**Layout:**

- Dimension table (Size, Length, Width, Height)
- Desktop: Table with 4 columns
- Mobile: Stacked cards or horizontal scroll table

---

### Installation Guide (1:4133, 545px)

**Assets:**

- Step images: TBD (extract from Figma)
- Check icon: (use lucide-react)

**Typography:**

- Section Title: Manrope SemiBold 28px (desktop), 24px (mobile)
- Step Number: Manrope Bold 24px
- Step Title: Manrope SemiBold 16px
- Step Description: Manrope Medium 14px, line-height: 1.6

**Colors:**

- Primary: #0268A0 (step numbers, check icons)
- Dark: #161F2B (text)

**Layout:**

- Desktop: 3 columns (3 steps visible)
- Mobile: 1 column
- Each step: Number + Image + Title + Description

---

### Video Section (1:4134, 943px)

**Assets:**

- Video thumbnail: TBD (extract from Figma)
- Play icon: (use lucide-react)

**Typography:**

- Section Title: Manrope SemiBold 32px (desktop), 28px (mobile)
- Video Title: Manrope SemiBold 18px

**Colors:**

- Primary: #0268A0 (play button)
- Dark: #161F2B (text)
- White: #FFFFFF (play icon)

**Layout:**

- Centered video player
- 16:9 aspect ratio
- Desktop: 1200px max-width
- Mobile: Full width

**Video:**

- Embedded YouTube/Vimeo or self-hosted

---

### Press Section (1:4135, 245px)

**Assets:**

- Press logos: TBD (extract from Figma)
- Publication logos (e.g., Forbes, TechCrunch, Wired)

**Typography:**

- Section Title: Manrope SemiBold 24px (desktop), 22px (mobile)
- Quote Text: Manrope Medium 14px, italic

**Colors:**

- Background: #F6F6F6 (light gray)
- Text: #161F2B (dark)
- Logos: Grayscale or original colors

**Layout:**

- Desktop: Horizontal row of logos (4-5 logos)
- Mobile: 2 columns or horizontal scroll

---

### FAQ (1:4136, 610px)

**Assets:**

- Chevron icon: `/meliusly/icons/32a4ab719d9ca432f9c961003c881f9a03a1d5b5.svg`

**Typography:**

- Section Title: Manrope SemiBold 32px (desktop), 28px (mobile)
- Question: Manrope SemiBold 16px
- Answer: Manrope Medium 14px, line-height: 1.6

**Colors:**

- Primary: #0268A0 (chevron icon when expanded)
- Dark: #161F2B (text)
- Light Gray: #F6F6F6 (accordion item background)

**Layout:**

- Accordion component
- Desktop: Single column
- Mobile: Single column
- 5-8 FAQ items

---

### Comparison (1:4137, 1066px)

**Assets:**

- Check icon: (use lucide-react)
- X icon: (use lucide-react)

**Typography:**

- Section Title: Manrope SemiBold 32px (desktop), 28px (mobile)
- Product Name: Manrope SemiBold 18px
- Feature Label: Manrope Medium 14px
- Table Data: Manrope Medium 14px

**Colors:**

- Primary: #0268A0 (highlighted column, check icons)
- Dark: #161F2B (text)
- Light Gray: #F6F6F6 (table alternating rows)
- Red: #DC2626 (X icons)

**Layout:**

- Desktop: 4 columns (Feature, Product A, Product B, Product C)
- Mobile: Horizontal scroll table
- Highlight Meliusly product column

---

### Extended Reviews (1:4138, 1832px)

**Assets:**

- Star rating icon: `/meliusly/icons/aba31c4e9f3d230c9971722c0cbb1c57ca70399a.svg`
- Customer photos: TBD (user-generated)

**Typography:**

- Section Title: Manrope SemiBold 32px (desktop), 28px (mobile)
- Review Title: Manrope SemiBold 16px
- Review Text: Manrope Medium 14px, line-height: 1.6
- Reviewer Name: Manrope SemiBold 13px
- Date: Manrope Medium 12px

**Colors:**

- Primary: #0268A0 (stars)
- Dark: #161F2B (text)
- Light Gray: #F6F6F6 (review card background)

**Layout:**

- Desktop: 2 columns
- Mobile: 1 column
- Pagination: Show 12 per page, "Load More" button

---

### PDP Traits (1:4139, 104px)

**Reuse:** Same as homepage Traits Bar (1:4253)

---

## Collections Page Sections

### Collections Nav (1:4175, 108px)

**Reuse:** Same as homepage Header/Nav

---

### Collections Band (1:4176)

**Assets:**

- Collection banner image: TBD (if applicable)

**Typography:**

- Collection Title: Manrope SemiBold 40px (desktop), 32px (mobile)
- Collection Description: Manrope Medium 18px, line-height: 1.6

**Colors:**

- Background: #F6F6F6 (light gray)
- Text: #161F2B (dark)

**Layout:**

- Centered content
- Desktop: 1200px max-width
- Mobile: Full width with padding

---

### Filter Bar (1:4178)

**Assets:**

- Filter icon: (use lucide-react)
- Sort icon: (use lucide-react)

**Typography:**

- Filter Label: Manrope SemiBold 14px
- Filter Option: Manrope Medium 14px

**Colors:**

- Primary: #0268A0 (active filter)
- Dark: #161F2B (text)
- Light Gray: #F6F6F6 (filter button background)

**Layout:**

- Desktop: Horizontal bar (filters left, sort right)
- Mobile: Filter/sort buttons open drawer

---

### Product List (1:4182)

**Reuse:** Same as homepage Product Grid (1:4246)

**Layout:**

- Desktop: 4 columns
- Tablet: 3 columns
- Mobile: 2 columns
- Pagination: Show 20 per page

---

## Cart States

### Cart Drawer with Items (1:4292, 360x800px)

**Assets:**

- Product images from cart
- X icon: (use lucide-react)
- Cart icon: `/meliusly/icons/94a6c1cd3fb2b84654c2ac4947061d8ef9c3aa21.svg`

**Typography:**

- Drawer Title: Manrope SemiBold 18px
- Product Title: Manrope Medium 14px
- Product Variant: Manrope Medium 13px
- Price: Manrope SemiBold 16px
- Quantity: Manrope Medium 14px
- Subtotal: Manrope SemiBold 18px
- CTA Button: Manrope SemiBold 16px

**Colors:**

- Primary: #0268A0 (checkout button)
- Dark: #161F2B (text)
- Light Gray: #F6F6F6 (drawer background)
- Red: #DC2626 (remove button)

**CTAs:**

- "Checkout" → Redirect to Shopify checkout
- "View Full Cart" → `/cart`
- Remove item → Remove from cart

**Layout:**

- Slide-in from right
- 360px width (mobile full-width)
- Header: Title + Close button
- Body: Cart items (scrollable)
- Footer: Subtotal + Checkout button

---

### Cart Empty State (1:4290, 360x800px)

**Assets:**

- Cart icon: `/meliusly/icons/94a6c1cd3fb2b84654c2ac4947061d8ef9c3aa21.svg` (large, centered)

**Typography:**

- Title: Manrope SemiBold 18px
- Subtitle: Manrope Medium 14px
- CTA Button: Manrope SemiBold 16px

**Colors:**

- Primary: #0268A0 (CTA button)
- Dark: #161F2B (title)
- Gray: #737373 (subtitle)
- Light Gray: #F6F6F6 (icon color)

**CTAs:**

- "Continue Shopping" → `/collections/all`

**Layout:**

- Centered content
- Large cart icon above text
- CTA button below

---

## Mobile Navigation

### Mobile Drawer (1:4294, 360x800px)

**Assets:**

- Logo: `/meliusly/hero/69bb33a6f2ea1403b208fab9c38e49c39bcb12bf.png`
- X icon: (use lucide-react)
- Chevron icon: `/meliusly/icons/32a4ab719d9ca432f9c961003c881f9a03a1d5b5.svg` (for dropdown)

**Typography:**

- Drawer Title: Manrope SemiBold 18px
- Nav Link: Manrope Medium 16px

**Colors:**

- Background: #FFFFFF (white)
- Text: #161F2B (dark)
- Link Hover: #0268A0 (primary)

**CTAs:**

- Home → `/`
- Shop → `/collections/all`
- How It Works → `/how-it-works`
- About → `/about`
- Contact → `/contact`

**Layout:**

- Slide-in from left
- 80vw width (max 360px)
- Header: Logo + Close button
- Body: Nav links (vertical stack)

---

## How It Works Page

### Desktop (1:4301)

**Assets:**

- Step illustrations: TBD (extract from Figma)

**Typography:**

- Page Title: Manrope SemiBold 40px
- Step Number: Manrope Bold 24px
- Step Title: Manrope SemiBold 18px
- Step Description: Manrope Medium 16px, line-height: 1.6

**Colors:**

- Primary: #0268A0 (step numbers, accents)
- Dark: #161F2B (text)

**Layout:**

- Desktop: 3 columns (3 steps)
- Each step: Number + Illustration + Title + Description

---

### Mobile (1:4363)

**Reuse:** Same as desktop, stacked vertically

**Layout:**

- Mobile: 1 column (vertical stack)
- Each step: Number + Illustration + Title + Description

---

## Asset Extraction Priorities

### Phase 1 (Immediate - Foundation)

- ✅ Hero images (desktop/mobile)
- ✅ Logo
- ✅ Trust bar icons
- ✅ Navigation icons
- ✅ Cart icon
- ✅ Star rating icon

### Phase 2 (Homepage Sections)

- Product type images (Phase 3C)
- Why Meliusly icons (Phase 3F)
- About section image (Phase 3H)
- Product guide thumbnails (Phase 3I)
- Org section badges (Phase 3J)
- Trait icons (Phase 3K)

### Phase 3 (PDP Sections)

- Benefit icons (Phase 4B)
- Feature images (Phase 4C)
- Dimension diagram (Phase 4E)
- Installation step images (Phase 4F)
- Video thumbnail (Phase 4G)
- Press logos (Phase 4H)

### Phase 4 (Collections & Cart)

- Filter/sort icons (already using lucide-react)
- Social icons for footer (using lucide-react)
- Payment icons (TBD or use lucide-react)

---

## Notes

**Using lucide-react for UI icons:**

- Check icons, X icons, chevrons, arrows, play buttons
- Social icons (Facebook, Instagram, Twitter, YouTube)
- Filter/sort icons
- Reduces asset count, ensures consistency

**Figma extraction workflow:**

- Use `mcp__figma-desktop__get_design_context` with `dirForAssetWrites` parameter
- Automatically extracts images to specified directory
- Reference images by path from asset manifest

**Asset naming convention:**

- Keep Figma hash names for traceability
- Create human-readable symlinks or copies (e.g., `hero-desktop.webp`)
- Document both in ASSET-MANIFEST.md

---

**Last Updated:** 2026-03-02
**Status:** Complete
**Total Sections Mapped:** 32+
**Assets Documented:** 13 existing + TBD for remaining sections
