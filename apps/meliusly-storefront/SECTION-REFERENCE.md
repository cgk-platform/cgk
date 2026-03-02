# Meliusly Storefront - Complete Section Reference

**Purpose:** Comprehensive guide for all 32+ sections with Figma node IDs and pixel-perfect requirements.

**Priority:** **PIXEL-PERFECT MATCH TO FIGMA** - Every section must be >95% visual parity (>98% for final audit).

---

## 📐 Pixel-Perfect Requirements (MANDATORY)

### Verification Workflow (EVERY Section):

1. **Extract Figma screenshot** - `mcp__figma-desktop__get_screenshot({ nodeId: "X:XXXX" })`
2. **Build component** - Match exact measurements from Figma
3. **Screenshot live component** - Desktop (1440px) + Mobile (360px)
4. **Visual comparison** - Use `/reviewer` agent or overlay screenshots
5. **Measure discrepancies** - Use DevTools, check: typography, colors, spacing, layout
6. **Fix until pixel-perfect** - Iterate until >95% visual parity
7. **Mark complete** - Only after verification passed

### Tolerance Levels:

- **Typography:** EXACT match (font family, size, weight, line-height, letter-spacing)
- **Colors:** EXACT hex values (verified with DevTools color picker)
- **Spacing:** ±2px tolerance (margins, padding, gaps)
- **Section Height:** ±5px tolerance
- **Layout:** EXACT grid columns, alignment, responsive behavior

---

## Homepage Sections (12 Sections)

### 1. Hero (Figma: 1:4243, Height: 700px)

**Visual Requirements:**

- Desktop hero image: `/meliusly/hero/hero-desktop.webp` (1920x1153px)
- Mobile hero image: `/meliusly/hero/hero-mobile.webp` (768x461px)
- Overlay: `bg-black/20`
- Content: Centered, fade-in animation

**Typography:**

- Headline: Manrope SemiBold 48px (desktop), 36px (mobile), line-height: 1.3
- Subheadline: Manrope Medium 22px (desktop), 18px (mobile), line-height: 1.5
- CTA Button: Manrope SemiBold 16px

**Colors:**

- Text: `#FFFFFF` (white)
- CTA Button BG: `#0268A0` (primary blue)
- CTA Button Text: `#FFFFFF` (white)

**Content:**

- Headline: "Premium Sofa Bed Support"
- Subheadline: "Built for Comfort, Designed to Last"
- CTA: "Shop Now" → `/collections/all`

**Spacing:**

- Section height: 700px (desktop), 600px (mobile)
- Content max-width: 768px
- CTA button: px-8 py-3

**Verification Checklist:**

- [ ] Hero images load (priority loading)
- [ ] Fade-in animation works
- [ ] CTA button styled correctly (rounded-full, hover state)
- [ ] Text centered and legible on image
- [ ] Responsive behavior correct (desktop/mobile images)
- [ ] Lighthouse LCP <2.5s
- [ ] Visual parity >95% vs Figma 1:4243

---

### 2. Trust Bar (Figma: 1:4244, Height: 121px)

**Visual Requirements:**

- 4 trust badges (icons + text)
- Icons from `/meliusly/icons/` directory

**Typography:**

- Badge Title: Manrope SemiBold 16px
- Badge Subtitle: Manrope Medium 13px

**Colors:**

- Background: `#2E3F56` (dark blue)
- Text: `#FFFFFF` (white)
- Dividers: `rgba(255, 255, 255, 0.2)`

**Layout:**

- Desktop: Horizontal row, 4 badges with dividers
- Mobile: 2x2 grid or vertical stack (no dividers)
- Icons: 32x32px (lucide-react or SVG from assets)

**Content:**

- Badge 1: "Built to Last" / "Premium materials"
- Badge 2: "Protected" / "Lifetime warranty"
- Badge 3: "Perfect Fit" / "Custom sizes"
- Badge 4: "Made in USA" / "Quality craftsmanship"

**Spacing:**

- Section padding: py-8
- Badge spacing: px-12 (desktop), gap-8 (mobile)

**Verification Checklist:**

- [ ] 4 badges display correctly
- [ ] Icons match Figma (Star, Shield, Ruler, Badge)
- [ ] Dividers show on desktop only
- [ ] Mobile layout stacks/grids correctly
- [ ] Background color exact: #2E3F56
- [ ] Text color exact: #FFFFFF
- [ ] Visual parity >95% vs Figma 1:4244

---

### 3. Product Type Selector (Figma: 1:4245, Height: 623px)

**Visual Requirements:**

- 3 product type cards with images
- Hover states (scale + shadow)

**Typography:**

- Section Title: Manrope SemiBold 32px (desktop), 28px (mobile)
- Product Name: Manrope SemiBold 24px
- Product Description: Manrope Medium 16px

**Colors:**

- Primary: `#0268A0` (hover state, CTA)
- Dark: `#161F2B` (text)
- Light Gray: `#F6F6F6` (card background)

**Layout:**

- Desktop: 3 columns
- Mobile: 1 column (vertical stack)
- Card aspect ratio: 3:4
- Gap: 32px

**Content:**

- Product 1: "SleepSaver Pro" → `/products/sleepsaver-pro`
- Product 2: "Classic Sleeper" → `/products/classic-sleeper`
- Product 3: "Flex Sleeper" → `/products/flex-sleeper`

**Spacing:**

- Section padding: py-16
- Title margin-bottom: mb-12
- Card padding: p-6

**Verification Checklist:**

- [ ] 3 product cards display
- [ ] Images load (aspect ratio 3:4)
- [ ] Hover states work (scale-105 transition-transform)
- [ ] Cards clickable, navigate to product pages
- [ ] Grid layout responsive (3 cols → 1 col)
- [ ] Typography exact match
- [ ] Visual parity >95% vs Figma 1:4245

---

### 4. Product Grid (Figma: 1:4246, Height: 878px)

**Visual Requirements:**

- 8 best-selling products from Shopify
- Product cards: image, title, price, quick add button

**Typography:**

- Section Title: Manrope SemiBold 32px (desktop), 28px (mobile)
- Product Title: Manrope Medium 16px
- Price: Manrope SemiBold 18px
- Compare-at Price: Manrope Medium 16px, strikethrough
- CTA Button: Manrope SemiBold 14px

**Colors:**

- Primary: `#0268A0` (button, hover states)
- Dark: `#161F2B` (text)
- Gray: `#777777` (compare-at price)
- Sale Badge: `#DC2626` (red background)

**Layout:**

- Desktop: 4 columns
- Tablet: 3 columns
- Mobile: 2 columns
- Gap: 24px
- Section max-width: 1440px

**Content:**

- Fetch from Shopify: `products(first: 8, sortKey: BEST_SELLING)`
- "Shop All" link → `/collections/all`

**Spacing:**

- Section padding: py-16
- Card spacing: gap-6
- Button: w-full px-4 py-2

**Verification Checklist:**

- [ ] 8 products fetch from Shopify (using database credentials)
- [ ] Product images load (lazy loading)
- [ ] Prices display correctly ($XX.XX format)
- [ ] Sale badges show for discounted products
- [ ] "Add to Cart" buttons functional
- [ ] Grid responsive (4 → 3 → 2 cols)
- [ ] "Shop All" link works
- [ ] Visual parity >95% vs Figma 1:4246

---

### 5. Shipping Banner (Figma: 1:4247, Height: 82px)

**Visual Requirements:**

- Full-width banner with centered text
- Icon: Shipping truck (lucide-react: Truck)

**Typography:**

- Banner Text: Manrope SemiBold 14px (desktop), 13px (mobile)

**Colors:**

- Background: `#0268A0` (primary blue)
- Text: `#FFFFFF` (white)

**Content:**

- "Free Shipping on Orders Over $99"

**Spacing:**

- Section padding: py-6
- Icon margin-right: mr-2

**Verification Checklist:**

- [ ] Banner full-width
- [ ] Text centered
- [ ] Truck icon displays (lucide-react)
- [ ] Background color exact: #0268A0
- [ ] Text color exact: #FFFFFF
- [ ] Height: 82px (±5px)
- [ ] Visual parity >95% vs Figma 1:4247

---

### 6. Why Meliusly (Figma: 1:4248, Height: 525px)

**Visual Requirements:**

- 3 USP columns with icons + text
- Icons: Extract from Figma or use lucide-react

**Typography:**

- Section Title: Manrope SemiBold 32px (desktop), 28px (mobile)
- USP Title: Manrope SemiBold 18px
- USP Description: Manrope Medium 14px, line-height: 1.6

**Colors:**

- Primary: `#0268A0` (icons, accents)
- Dark: `#161F2B` (titles)
- Gray: `#737373` (descriptions)

**Layout:**

- Desktop: 3 columns
- Mobile: 1 column (vertical stack)
- Gap: 48px
- Each USP: Icon (top) + Title + Description

**Content:**

- USP 1: "Premium Quality" - "Built with the finest materials for lasting durability"
- USP 2: "Perfect Comfort" - "Engineered for optimal support and sleep quality"
- USP 3: "Easy Setup" - "Simple installation in minutes, no tools required"

**Spacing:**

- Section padding: py-16
- Title margin-bottom: mb-12
- Icon size: 48x48px
- Icon margin-bottom: mb-4

**Verification Checklist:**

- [ ] 3 USP columns display
- [ ] Icons render correctly (centered above text)
- [ ] Text centered within each column
- [ ] Grid responsive (3 cols → 1 col)
- [ ] Typography exact match
- [ ] Colors exact match
- [ ] Visual parity >95% vs Figma 1:4248

---

### 7. Reviews Carousel (Figma: 1:4249, Height: 877px)

**Visual Requirements:**

- Carousel with 3 visible reviews (desktop), 1 (mobile)
- Star ratings, reviewer photos, verified badges
- Navigation arrows + dots pagination

**Typography:**

- Section Title: Manrope SemiBold 32px (desktop), 28px (mobile)
- Review Title: Manrope SemiBold 16px
- Review Text: Manrope Medium 14px, line-height: 1.6
- Reviewer Name: Manrope SemiBold 13px
- Verified Badge: Manrope Medium 12px

**Colors:**

- Primary: `#0268A0` (stars, verified badge)
- Dark: `#161F2B` (text)
- Light Gray: `#F6F6F6` (review card background)
- Stars: `#FFB81C` (gold)

**Layout:**

- Desktop: 3 cards visible, gap-8
- Mobile: 1 card visible
- Dots pagination below
- Arrow navigation left/right

**Content:**

- Fetch from `tenant_meliusly.reviews` table
- Display: 5-star rating, review text, reviewer name, date, verified badge

**Spacing:**

- Section padding: py-16
- Card padding: p-6
- Star size: 16x16px

**Verification Checklist:**

- [ ] Carousel displays 3 reviews (desktop)
- [ ] Navigation arrows work (prev/next)
- [ ] Dots pagination works
- [ ] Star ratings display correctly
- [ ] Verified badges show for verified reviews
- [ ] Cards have shadow on hover
- [ ] Mobile shows 1 review at a time
- [ ] Visual parity >95% vs Figma 1:4249

---

### 8. About Section (Figma: 1:4250, Height: 743px)

**Visual Requirements:**

- 2-column layout: Image (left) + Text (right)
- About image: Extract from Figma

**Typography:**

- Section Title: Manrope SemiBold 32px (desktop), 28px (mobile)
- Body Text: Manrope Medium 16px, line-height: 1.6
- CTA Button: Manrope SemiBold 16px

**Colors:**

- Primary: `#0268A0` (CTA button)
- Dark: `#161F2B` (text)
- White: `#FFFFFF` (button text)

**Layout:**

- Desktop: 2 columns (50/50 split, gap-12)
- Mobile: 1 column (image top, text bottom)

**Content:**

- Title: "About Meliusly"
- Body: Brand story paragraph (2-3 sentences)
- CTA: "Learn More" → `/about`

**Spacing:**

- Section padding: py-16
- Image border-radius: rounded-lg
- CTA margin-top: mt-6

**Verification Checklist:**

- [ ] 2-column layout on desktop
- [ ] Image loads (aspect ratio maintained)
- [ ] Text aligned left
- [ ] CTA button styled correctly
- [ ] Mobile layout stacks correctly
- [ ] Visual parity >95% vs Figma 1:4250

---

### 9. Product Guides (Figma: 1:4251, Height: 423px)

**Visual Requirements:**

- 3 guide cards with thumbnails + download icons
- Guide thumbnails: Extract from Figma

**Typography:**

- Section Title: Manrope SemiBold 28px (desktop), 24px (mobile)
- Guide Title: Manrope SemiBold 16px
- Guide Description: Manrope Medium 14px

**Colors:**

- Primary: `#0268A0` (download icon, hover)
- Dark: `#161F2B` (text)
- Light Gray: `#F6F6F6` (card background)

**Layout:**

- Desktop: 3 columns
- Mobile: 1 column
- Gap: 24px

**Content:**

- Guide 1: "Installation Guide" - PDF download
- Guide 2: "Care Instructions" - PDF download
- Guide 3: "Sizing Chart" - PDF download

**Spacing:**

- Section padding: py-16
- Card padding: p-6
- Download icon: 24x24px (lucide-react: Download)

**Verification Checklist:**

- [ ] 3 guide cards display
- [ ] Thumbnails load
- [ ] Download icons show (lucide-react)
- [ ] Cards clickable (PDF download or page navigation)
- [ ] Hover states work
- [ ] Grid responsive (3 cols → 1 col)
- [ ] Visual parity >95% vs Figma 1:4251

---

### 10. Org Section (Figma: 1:4252, Height: 358px)

**Visual Requirements:**

- Centered content with company badge/logo
- Certification icons (optional)

**Typography:**

- Section Title: Manrope SemiBold 28px (desktop), 24px (mobile)
- Body Text: Manrope Medium 16px, line-height: 1.6

**Colors:**

- Primary: `#0268A0` (accents)
- Dark: `#161F2B` (text)

**Layout:**

- Centered content
- Max-width: 768px
- Logo/badge above text

**Content:**

- Title: "Certified Quality"
- Body: "Meliusly products are manufactured in the USA and meet the highest quality standards."

**Spacing:**

- Section padding: py-16
- Logo margin-bottom: mb-6

**Verification Checklist:**

- [ ] Content centered
- [ ] Logo/badge displays
- [ ] Text centered, max-width 768px
- [ ] Typography exact match
- [ ] Visual parity >95% vs Figma 1:4252

---

### 11. Traits Bar (Figma: 1:4253, Height: 104px)

**Visual Requirements:**

- Horizontal row of 4-5 trait badges (icon + text)

**Typography:**

- Trait Label: Manrope Medium 13px

**Colors:**

- Background: `#F6F6F6` (light gray)
- Text: `#161F2B` (dark)
- Icons: `#0268A0` (primary)

**Layout:**

- Desktop: Horizontal row, all visible
- Mobile: Horizontal scroll or wrap (2 rows)
- Gap: 24px

**Content:**

- Trait 1: "Durable" (Shield icon)
- Trait 2: "Comfortable" (Heart icon)
- Trait 3: "Easy Setup" (Wrench icon)
- Trait 4: "USA Made" (Flag icon)

**Spacing:**

- Section padding: py-6
- Trait padding: px-4 py-2
- Icon margin-right: mr-2

**Verification Checklist:**

- [ ] 4-5 traits display
- [ ] Icons render (lucide-react)
- [ ] Horizontal layout on desktop
- [ ] Mobile scrolls or wraps
- [ ] Background color exact: #F6F6F6
- [ ] Visual parity >95% vs Figma 1:4253

---

### 12. Footer (Figma: 1:4254, Height: 396px desktop / 1149px mobile)

**Visual Requirements:**

- 4-column layout on desktop
- Mobile: Accordion or full expand (1 column)
- Logo, social icons, newsletter signup

**Typography:**

- Column Title: Manrope SemiBold 16px
- Links: Manrope Medium 14px
- Newsletter Input: Manrope Medium 14px
- Copyright: Manrope Medium 12px

**Colors:**

- Background: `#161F2B` (dark navy)
- Text: `#FFFFFF` (white)
- Link Hover: `#6ABFEF` (light blue)
- Input Border: `#777777` (dark gray)

**Layout:**

- Desktop: 4 columns (Brand, Shop, Support, Company)
- Mobile: 1 column (accordion or full)
- Newsletter signup: Below columns
- Social links: In brand column
- Payment icons: Bottom bar

**Content:**

- Brand: Logo + description + social links (Facebook, Instagram, Twitter, YouTube)
- Shop: All Products, Best Sellers, New Arrivals
- Support: Contact Us, Shipping Info, Returns, FAQ
- Company: About Us, How It Works, Reviews
- Newsletter: Email input + subscribe button
- Bottom bar: Privacy, Terms, Refund policies + Copyright

**Spacing:**

- Section padding: py-16 (desktop), py-12 (mobile)
- Column gap: gap-8
- Newsletter margin-top: mt-12

**Verification Checklist:**

- [ ] 4 columns display on desktop
- [ ] Logo displays in brand column
- [ ] Social icons render (lucide-react: Facebook, Instagram, Twitter, Youtube)
- [ ] All navigation links work
- [ ] Newsletter input + button styled correctly
- [ ] Payment icons display (Visa, Mastercard, Amex, PayPal)
- [ ] Mobile layout stacks or accordion works
- [ ] Background color exact: #161F2B
- [ ] Text color exact: #FFFFFF
- [ ] Link hover color exact: #6ABFEF
- [ ] Visual parity >95% vs Figma 1:4254

---

## Product Detail Page (PDP) Sections (12 Sections)

### 1. PDP Header (Figma: 1:4128, Height: 1455px)

**Visual Requirements:**

- 2-column layout: Gallery (left) + Info (right)
- Main image + thumbnail grid
- Variant selector, quantity, add to cart

**Typography:**

- Product Title: Manrope SemiBold 32px (desktop), 28px (mobile)
- Price: Manrope Bold 32px
- Compare-at Price: Manrope Medium 24px, strikethrough
- Variant Label: Manrope SemiBold 14px
- Description: Manrope Medium 16px, line-height: 1.6
- CTA Button: Manrope SemiBold 16px

**Colors:**

- Primary: `#0268A0` (selected variant, add to cart button)
- Dark: `#161F2B` (text)
- Gray: `#777777` (compare-at price)
- Light Gray: `#F6F6F6` (variant button background)

**Layout:**

- Desktop: 2 columns (50/50 split, gap-12)
- Mobile: 1 column (gallery top, info bottom)
- Gallery: Main image + thumbnail grid (4 columns)

**Content:**

- Fetch product from Shopify: `product(handle: $handle)`
- Display: Images, title, price, description, variants, quantity selector

**Spacing:**

- Section padding: py-8
- Gallery gap: gap-4
- Variant buttons: gap-2

**Verification Checklist:**

- [ ] Product fetches from Shopify (using database credentials)
- [ ] Main image displays (aspect-square)
- [ ] Thumbnail grid shows (4 thumbnails)
- [ ] Clicking thumbnail updates main image
- [ ] Variant selector works (updates price/availability)
- [ ] Quantity selector functional (+/- buttons)
- [ ] Add to cart button styled correctly
- [ ] Out of stock variants disabled
- [ ] Price formats correctly ($XX.XX)
- [ ] Compare-at price shows with strikethrough if discounted
- [ ] 2-column layout on desktop
- [ ] Mobile layout stacks correctly
- [ ] Visual parity >95% vs Figma 1:4128

---

### 2-12. Additional PDP Sections

**Sections:**

- Benefits Block (1:4129, 741px) - 3 benefits with icons
- Features Block (1:4130, 722px) - Alternating image/text layout
- Reviews Section (1:4131, 895px) - 2-column review grid, pagination
- Dimensions (1:4132, 554px) - Measurement table
- Installation Guide (1:4133, 545px) - 3-step process with images
- Video Section (1:4134, 943px) - Embedded video player
- Press Section (1:4135, 245px) - Press logos horizontal row
- FAQ (1:4136, 610px) - Accordion component
- Comparison (1:4137, 1066px) - 4-column comparison table
- Extended Reviews (1:4138, 1832px) - Full review list, pagination
- PDP Traits (1:4139, 104px) - Reuse homepage Traits Bar

**Each section follows same verification workflow:**

1. Extract Figma screenshot
2. Build component matching measurements
3. Screenshot live component
4. Compare and fix discrepancies
5. Verify >95% visual parity

---

## Collections Page Sections (4 Sections)

### 1. Collections Nav (Figma: 1:4175, Height: 108px)

- Reuse homepage Header/Nav

### 2. Collections Band (Figma: 1:4176)

- Collection title + description, centered
- Background: #F6F6F6
- Typography: Manrope SemiBold 40px (title), Medium 18px (description)

### 3. Filter Bar (Figma: 1:4178)

- Desktop: Horizontal bar (filters left, sort right)
- Mobile: Drawer for filters/sort
- Active filter: #0268A0

### 4. Product List (Figma: 1:4182)

- Reuse homepage Product Grid
- Layout: 4 columns (desktop), 3 (tablet), 2 (mobile)
- Pagination: 20 products per page

**Verification:** Each section >95% visual parity vs Figma

---

## Cart States (2 States)

### 1. Cart Drawer with Items (Figma: 1:4292, 360x800px)

**Visual Requirements:**

- Slide-in from right
- 360px width (mobile full-width)
- Header: Title + Close button
- Body: Cart items (scrollable)
- Footer: Subtotal + Checkout button

**Typography:**

- Drawer Title: Manrope SemiBold 18px
- Product Title: Manrope Medium 14px
- Product Variant: Manrope Medium 13px
- Price: Manrope SemiBold 16px
- Quantity: Manrope Medium 14px
- Subtotal: Manrope SemiBold 18px
- CTA Button: Manrope SemiBold 16px

**Colors:**

- Primary: `#0268A0` (checkout button)
- Dark: `#161F2B` (text)
- Light Gray: `#F6F6F6` (drawer background)
- Red: `#DC2626` (remove button)

**Verification Checklist:**

- [ ] Drawer slides in from right (transition-transform)
- [ ] Overlay closes drawer on click
- [ ] ESC key closes drawer
- [ ] Cart items display with images
- [ ] Quantity selector works (+/-)
- [ ] Remove button works
- [ ] Subtotal calculates correctly
- [ ] Checkout button navigates or creates Shopify cart
- [ ] "View Full Cart" link works
- [ ] Visual parity >95% vs Figma 1:4292

---

### 2. Cart Empty State (Figma: 1:4290, 360x800px)

**Visual Requirements:**

- Centered empty state
- Large cart icon (lucide-react: ShoppingCart)
- "Continue Shopping" CTA

**Typography:**

- Title: Manrope SemiBold 18px
- Subtitle: Manrope Medium 14px
- CTA Button: Manrope SemiBold 16px

**Colors:**

- Primary: `#0268A0` (CTA button)
- Dark: `#161F2B` (title)
- Gray: `#737373` (subtitle)
- Light Gray: `#F6F6F6` (icon color)

**Verification Checklist:**

- [ ] Empty state shows when cart is empty
- [ ] Cart icon displays (lucide-react, 64x64px)
- [ ] Text centered
- [ ] CTA button works (navigates to /collections/all)
- [ ] Visual parity >95% vs Figma 1:4290

---

## Mobile Navigation

### Mobile Drawer (Figma: 1:4294, 360x800px)

**Visual Requirements:**

- Slide-in from left
- 80vw width (max 360px)
- Vertical nav stack

**Typography:**

- Drawer Title: Manrope SemiBold 18px
- Nav Link: Manrope Medium 16px

**Colors:**

- Background: `#FFFFFF` (white)
- Text: `#161F2B` (dark)
- Link Hover: `#0268A0` (primary)

**Content:**

- Nav links: Home, Shop, How It Works, About, Contact

**Verification Checklist:**

- [ ] Drawer slides in from left
- [ ] Overlay closes drawer on click
- [ ] ESC key closes drawer
- [ ] All nav links work
- [ ] Link hover states work
- [ ] Logo displays in header
- [ ] Visual parity >95% vs Figma 1:4294

---

## Supporting Pages

### 1. How It Works Page

**Desktop (Figma: 1:4301):**

- 3-column layout (3 steps)
- Step illustrations
- Typography: Manrope SemiBold 40px (title), Bold 24px (step number), SemiBold 18px (step title)
- Colors: #0268A0 (step numbers), #161F2B (text)

**Mobile (Figma: 1:4363):**

- 1-column layout (vertical stack)
- Same content as desktop

**Verification:** Visual parity >95% vs Figma for both variants

---

## Summary: Total Section Count

| Page             | Sections   | Figma Nodes               |
| ---------------- | ---------- | ------------------------- |
| **Homepage**     | 12         | 1:4243 - 1:4254           |
| **PDP**          | 12         | 1:4128 - 1:4139           |
| **Collections**  | 4          | 1:4174 - 1:4182           |
| **Cart**         | 2 states   | 1:4290, 1:4292            |
| **Mobile Nav**   | 1          | 1:4294                    |
| **How It Works** | 2 variants | 1:4301, 1:4363            |
| **Supporting**   | 3 pages    | About, Contact (no Figma) |
| **TOTAL**        | **36+**    | **32+ Figma nodes**       |

---

## Pixel-Perfect Audit Checklist (Phase 8A)

**For EVERY page, verify:**

### Desktop (1440px viewport):

1. Screenshot live page
2. Screenshot Figma page (1:4242 homepage, 1:4127 PDP, 1:4174 collections)
3. Overlay screenshots in image editor
4. Measure discrepancies:
   - Typography: Font family, size, weight, line-height, letter-spacing
   - Colors: Hex values (use DevTools color picker)
   - Spacing: Margins, padding, gaps (±2px tolerance)
   - Layout: Grid columns, alignment, responsive behavior
   - Images: Position, size, aspect ratio
   - Borders, shadows, border-radius
5. Document all discrepancies
6. Fix all issues
7. Re-validate until >98% visual parity

### Mobile (360px viewport):

1. Screenshot live page (DevTools device mode)
2. Screenshot Figma mobile variant (1:4257 homepage, 1:4154 PDP, 1:4206 collections)
3. Overlay screenshots
4. Measure discrepancies (same categories as desktop)
5. Fix all issues
6. Re-validate until >98% visual parity

---

**Priority Order for Implementation:**

1. **Phase 2:** Layout (Header, Mobile Nav, Footer) - Foundation for all pages
2. **Phase 3:** Homepage Sections - High-value, user-facing
3. **Phase 4:** PDP - Conversion-critical
4. **Phase 5:** Cart & Checkout - Purchase flow
5. **Phase 6:** Supporting Pages - Content pages
6. **Phase 7:** Collections - Product discovery
7. **Phase 8:** Testing & Optimization - Quality assurance
8. **Phase 9:** Deployment - Production launch

**Every section must be >95% visual parity before moving to next section.**
**Final audit (Phase 8A) must achieve >98% visual parity for all pages.**
