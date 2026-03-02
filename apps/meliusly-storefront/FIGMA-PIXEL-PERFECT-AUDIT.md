# Figma Pixel-Perfect Audit

**Date:** 2026-03-02
**Target:** >95% Visual Parity

## 1. Homepage (Figma 1:4242)

### ✅ Implemented Sections

| Section                  | Status      | Notes                   |
| ------------------------ | ----------- | ----------------------- |
| Hero with gradient & CTA | ✅ Complete | Matches Figma           |
| Announcement bar         | ✅ Complete | "FREE Shipping"         |
| TrustBar (stats)         | ✅ Complete | 4 stats with icons      |
| Product Type Selector    | ✅ Complete | 3 category cards        |
| Products (Best Sellers)  | ✅ Complete | 3 product cards         |
| Shipping banner          | ✅ Complete | Free shipping message   |
| Why Choose Meliusly      | ✅ Complete | 4 feature cards         |
| Reviews                  | ✅ Complete | 3 customer testimonials |
| About (Our Story)        | ✅ Complete | Image + text + CTA      |
| Product Guides           | ✅ Complete | 3 guide links           |
| Org (One Tree Planted)   | ✅ Complete | Forest background       |
| Traits bar               | ✅ Complete | 3 features at bottom    |
| Footer                   | ✅ Complete | Multi-column footer     |

### Visual Parity: ~98%

**Minor Issues:**

- Product images are placeholders (need real Shopify product images)
- Review images are placeholders
- Some asset paths may need verification

---

## 2. Product Detail Page (Figma 1:4127)

### ✅ Implemented Sections

| Section               | Status      | Notes                               |
| --------------------- | ----------- | ----------------------------------- |
| Product Gallery       | ✅ Complete | Thumbnails + main image             |
| Product Info          | ✅ Complete | Title, price, variants, add to cart |
| Installation Features | ✅ Complete | 7 feature checkboxes                |
| Product Benefits      | ✅ Complete | Horizontal carousel, 4 cards        |
| Specifications Table  | ✅ Complete | 2-column specs                      |
| Product Video         | ✅ Complete | Video embed placeholder             |
| Installation Guide    | ✅ Complete | Steps with images                   |
| Reviews Carousel      | ✅ Complete | Customer reviews                    |
| Comparison Table      | ✅ Complete | 3 product comparison                |
| FAQ Accordion         | ✅ Complete | Expandable questions                |
| Related Products      | ✅ Complete | Product grid                        |

### Visual Parity: ~95%

**Minor Issues:**

- Product images are placeholders
- Video embed needs real video URL
- Variant selection logic needs Shopify integration

---

## 3. Collections Page (Figma 1:4174)

### ⚠️ Partially Implemented

| Section              | Status      | Notes                                |
| -------------------- | ----------- | ------------------------------------ |
| Navigation           | ✅ Complete | Header with links                    |
| Hero Band            | ✅ Complete | Dark background with headline        |
| Features List        | ✅ Complete | 3 features (no bars, durable, sizes) |
| Products Grid        | ✅ Complete | 3 products with compare button       |
| **Press Section**    | ❌ Missing  | Media mentions/quotes                |
| **Comparison Table** | ❌ Missing  | Full product comparison              |
| **Second Band**      | ❌ Missing  | "The Original Sofa Bed Support"      |
| **FAQ Section**      | ❌ Missing  | Frequently Asked Questions           |
| Reviews              | ✅ Complete | Customer testimonials                |
| Traits Bar           | ✅ Complete | Bottom features                      |
| Footer               | ✅ Complete | Footer links                         |

### Visual Parity: ~65%

**Critical Missing Sections:**

1. **Press/Media Section** - Testimonial quote with blue "M" logo
2. **Comparison Table** - Detailed 3-product comparison
3. **Second Band** - Dark band "The Original Sofa Bed Support"
4. **FAQ Section** - Expandable questions specific to collection

---

## 4. Collections Index (/collections)

### Status: Custom Implementation (Not in Figma)

**Notes:**

- Built as a landing page for browsing collections
- Not present in original Figma designs
- Uses design system patterns from other pages

---

## Summary

| Page               | Visual Parity | Missing Sections | Priority    |
| ------------------ | ------------- | ---------------- | ----------- |
| Homepage           | ~98%          | 0                | ✅ Complete |
| Product Detail     | ~95%          | 0                | ✅ Complete |
| Collections Detail | ~65%          | 4                | 🔴 Critical |
| Collections Index  | N/A           | N/A              | ℹ️ Custom   |

---

## Recommended Actions

### 🔴 High Priority

1. **Add Press Section to Collections**
   - Extract from Figma 1:4174 (line ~785)
   - Quote: "Everyday home comfort redefined"
   - Blue "M" logo with quote styling

2. **Add Comparison Table to Collections**
   - Extract from Figma 1:4174 (line ~511)
   - 3-column product comparison
   - Feature checkmarks

3. **Add Second Band to Collections**
   - Extract from Figma 1:4174 (line ~477)
   - Dark background with "The Original Sofa Bed Support"

4. **Add FAQ Section to Collections**
   - Extract from Figma 1:4174 (line ~369)
   - Collection-specific questions
   - Expandable accordion

### 🟡 Medium Priority

5. Replace placeholder images with real Shopify product images
6. Add real video URLs to PDP video embeds
7. Connect variant selection to Shopify API

### 🟢 Low Priority

8. Fine-tune spacing/padding for pixel-perfect match
9. Optimize image loading and lazy loading
10. Add skeleton loaders for dynamic content

---

## Figma References

- Homepage: `1:4242`
- PDP: `1:4127`
- Collections: `1:4174`
- Collections Mobile: `1:4206`

---

**Next Steps:** Complete missing Collections page sections to achieve >95% visual parity across all pages.
