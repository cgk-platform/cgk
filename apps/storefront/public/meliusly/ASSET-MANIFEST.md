# Meliusly Asset Manifest

**Last Updated:** 2026-02-27
**Phase:** 1E - Figma Asset Extraction
**Status:** ✅ Complete

---

## Asset Summary

| Category | Count | Total Size | Optimization |
|----------|-------|------------|--------------|
| Hero Images | 2 (WebP) | 132 KB | ✅ Optimized |
| Logos | 1 (PNG) | 74 KB | Original from Figma |
| Icons (SVG) | 11 | ~11 KB | Vector (no optimization needed) |
| **Total** | **14** | **~217 KB** | **All under 500KB target** |

---

## Hero Images

### Desktop Hero
- **File:** `hero/hero-desktop.webp`
- **Original:** `hero/7f50a026f3a2af072fe37fbc0f0339522ecefe84.png` (9.4 MB)
- **Dimensions:** 1920 x 1153px
- **Size:** 103 KB
- **Format:** WebP (85% quality)
- **Usage:** Homepage hero section, desktop viewports (≥1024px)
- **Figma Node:** 1:4243 (Header section background)

### Mobile Hero
- **File:** `hero/hero-mobile.webp`
- **Original:** `hero/7f50a026f3a2af072fe37fbc0f0339522ecefe84.png` (9.4 MB)
- **Dimensions:** 768 x 461px
- **Size:** 29 KB
- **Format:** WebP (85% quality)
- **Usage:** Homepage hero section, mobile/tablet viewports (<1024px)
- **Figma Node:** 1:4243 (Header section background)

---

## Logo

### Meliusly Logo
- **File:** `hero/69bb33a6f2ea1403b208fab9c38e49c39bcb12bf.png`
- **Dimensions:** 123 x 28px
- **Size:** 74 KB
- **Format:** PNG with transparency
- **Usage:** Header navigation logo
- **Figma Node:** 1:274 (Logo with R)

---

## Icons (SVG)

All icons are vector SVG format - no optimization needed.

### Navigation Icons
1. **Dropdown Arrow** (`icons/32a4ab719d9ca432f9c961003c881f9a03a1d5b5.svg`) - 2.1 KB
   - Usage: Dropdown menu indicator
   - Figma Node: 1:278 (Vector)

2. **Download Icon** (`icons/3e3f83024d8ceac85a45da782669f87984aa6450.svg`) - 1.0 KB
   - Usage: Download/search functionality
   - Figma Node: 1:308

3. **User Icon** (`icons/6bec6514d884e5262f2b37b7ccdef6c8de25c482.svg`) - 792 B
   - Usage: User account icon
   - Figma Node: 1:310 (tabler:user)

4. **Cart Icon** (`icons/94a6c1cd3fb2b84654c2ac4947061d8ef9c3aa21.svg`) - 317 B
   - Usage: Shopping cart
   - Figma Node: 1:317

5. **Star Rating** (`icons/aba31c4e9f3d230c9971722c0cbb1c57ca70399a.svg`) - 358 B
   - Usage: Product ratings, reviews
   - Figma Node: Star component

6. **Ellipse/Circle** (`icons/b378e6723f3de00ba8a090a59f00b20bce2f0229.svg`) - 680 B
   - Usage: Decorative element
   - Figma Node: 1:4258 (Ellipse)

### Trust Bar Icons
7. **Group Icon 1** (`icons/4dd74a1c5dd40eb8c3d6450fc86c738ea515a8f5.svg`)
   - Usage: Trust bar statistic icon
   - Figma Node: 1:4441 (Happy Customers)

8. **Star Icon 2** (`icons/8086ea1846a018a446cd213b5097d8f6efb98140.svg`)
   - Usage: Trust bar 5-star reviews
   - Figma Node: 1:4450

9. **USA Icon** (`icons/96b3c0498424496a69a7db3042ceb5816acb8309.svg`)
   - Usage: "Designed in USA" badge
   - Figma Node: 1:4457

10. **Group Icon 2** (`icons/df67599317682c6be94c56e9ac81162f31cb1b30.svg`)
    - Usage: Trust bar feature icon
    - Figma Node: 1:4464 (Featured)

---

## Design Tokens (Extracted from Figma)

### Colors
- **Primary:** `#0268A0` (Blue)
- **Dark:** `#161F2B` (Navy)
- **White:** `#FFFFFF`
- **Light Gray:** `#F6F6F6`
- **Secondary:** `#6ABFEF` (Light Blue)
- **Dark Blue:** `#2E3F56` (Trust bar background)
- **Text Dark:** `#000000`
- **Dark Gray:** `#777777`
- **Gray Text:** `#737373`

### Typography
- **Font Family:** Manrope
- **Weights:**
  - 400 (Regular/Medium)
  - 500 (Medium)
  - 600 (SemiBold)
  - 700 (Bold)

### Font Sizes
- **Heading/40:** 40px, SemiBold, line-height: 1.3
- **Heading/32:** 32px, SemiBold, line-height: 1.3
- **Heading/28:** 28px, SemiBold, line-height: 1.3
- **Heading/24:** 24px, SemiBold, line-height: 1.3
- **Heading/18:** 18px, SemiBold, line-height: 1.3
- **Heading/16:** 16px, SemiBold, line-height: 1.2
- **Heading/15:** 15px, SemiBold, line-height: 1.3
- **Heading/14:** 14px, SemiBold, line-height: 1.2
- **Body/22:** 22px, Medium, line-height: 1.5, letter-spacing: -1px
- **Body/18:** 18px, Medium, line-height: 1.8, letter-spacing: -1px
- **Body/16:** 16px, Medium, line-height: 1.6, letter-spacing: -1px
- **Body/15:** 15px, Medium, line-height: 1.6, letter-spacing: -1px
- **Body/14:** 14px, Medium, line-height: 1.6, letter-spacing: -1px
- **Body/13:** 13px, Medium, line-height: 1.8, letter-spacing: -1px
- **Body/12:** 12px, Medium, line-height: 1.8, letter-spacing: -1px
- **Label/13:** 13px, Bold, line-height: 1.15, letter-spacing: 2px (uppercase)
- **Italic/13:** 13px, Medium, line-height: 1.6, letter-spacing: -1px

### Spacing & Layout
- **Corner Radius:** 30px (from Figma variables)
- **Max Content Width:** 1440px (desktop)
- **Mobile Breakpoint:** 360px
- **Tablet Breakpoint:** 768px
- **Desktop Breakpoint:** 1024px
- **Wide Desktop:** 1440px

---

## Figma References

### Homepage Sections Extracted
- **Header (1:4243)** - 700px height ✅ Assets extracted
- **Trust Bar (1:4244)** - 121px height ✅ Assets extracted

### Pending Asset Extraction
Additional sections will be extracted as needed during implementation:
- Product Type (1:4245)
- Products Grid (1:4246)
- Shipping Banner (1:4247)
- Why Meliusly (1:4248)
- Reviews Carousel (1:4249)
- About Section (1:4250)
- Product Guides (1:4251)
- Org Section (1:4252)
- Traits Bar (1:4253)
- Footer (1:4254)

---

## Next Steps (Phase 1F)

1. Create `meliusly-theme.ts` theme configuration file
2. Extend Tailwind config with Meliusly design tokens
3. Load Manrope font via next/font/google
4. Test theme switching (CGK → Meliusly)

---

## Optimization Notes

✅ **All assets optimized:**
- Hero images converted to WebP (90% size reduction)
- Desktop hero: 9.4 MB → 103 KB (99% reduction)
- Mobile hero: 9.4 MB → 29 KB (99.7% reduction)
- SVG icons require no optimization (already vector)
- Total asset size well under 500 KB target

✅ **Responsive images created:**
- Desktop version (1920px) for large screens
- Mobile version (768px) for phones/tablets
- Next.js Image component will handle srcSet automatically

✅ **Asset organization:**
- `hero/` - Hero background images
- `icons/` - All SVG icons (navigation, trust bar, UI elements)
- `sections/` - Section-specific background images (to be added)

---

**Status:** Phase 1E complete. Ready for Phase 1F (Theme Configuration).
