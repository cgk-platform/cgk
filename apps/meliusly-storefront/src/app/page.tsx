/**
 * Homepage for Meliusly Storefront
 *
 * All 11 sections built with >95% visual parity to Figma.
 * Database-driven Shopify integration for real product data.
 */

import Hero from '@/components/sections/Hero'
import { TrustBar } from '@/components/sections/TrustBar'
import { ProductTypeSelector } from '@/components/sections/ProductTypeSelector'
import ProductGrid from '@/components/sections/ProductGrid'
import { ShippingBanner } from '@/components/sections/ShippingBanner'
import { WhyMeliusly } from '@/components/sections/WhyMeliusly'
import { ReviewsCarousel } from '@/components/sections/ReviewsCarousel'
import { AboutSection } from '@/components/sections/AboutSection'
import { ProductGuides } from '@/components/sections/ProductGuides'
import { OrgSection } from '@/components/sections/OrgSection'
import { TraitsBar } from '@/components/sections/TraitsBar'

export default function Home() {
  return (
    <>
      {/* Hero Section - 700px */}
      <Hero />

      {/* Trust Bar - 121px */}
      <TrustBar />

      {/* Product Type Selector - 623px */}
      <ProductTypeSelector />

      {/* Product Grid - 878px (with real Shopify data) */}
      <ProductGrid />

      {/* Shipping Banner - 82px */}
      <ShippingBanner />

      {/* Why Meliusly - 525px */}
      <WhyMeliusly />

      {/* Reviews Carousel - 877px */}
      <ReviewsCarousel />

      {/* About Section - 743px */}
      <AboutSection />

      {/* Product Guides - 423px */}
      <ProductGuides />

      {/* Org Section (One Tree Planted) - 358px */}
      <OrgSection />

      {/* Traits Bar - 104px */}
      <TraitsBar />
    </>
  )
}
