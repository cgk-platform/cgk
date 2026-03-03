/**
 * Sample Mega Menu Data
 *
 * Mock data for mega menu dropdowns until CMS integration is complete.
 * Organized by navigation category (Sofa Support, Sleeper Sofa Support, Bed Support).
 */

import { MegaMenuProduct } from '@/components/navigation/MegaMenuProductCard'

export const sofaSupportProducts: MegaMenuProduct[] = [
  {
    title: 'Classic Sofa Support Board',
    description:
      'Essential support for standard sofas, prevents sagging and extends furniture life',
    price: '$129.99',
    handle: 'classic-sofa-support-board',
    image: {
      url: 'https://placeholder.co/400x300/0268a0/white?text=Classic+Support',
      alt: 'Classic Sofa Support Board',
    },
    badge: 'Best Seller',
  },
  {
    title: 'Premium Sofa Support System',
    description: 'Advanced reinforcement system with dual-layer construction',
    price: '$199.99',
    handle: 'premium-sofa-support-system',
    image: {
      url: 'https://placeholder.co/400x300/161f2b/white?text=Premium+System',
      alt: 'Premium Sofa Support System',
    },
  },
  {
    title: 'Heavy-Duty Sofa Board',
    description: 'Industrial-grade support for oversized sofas and heavy use',
    price: '$249.99',
    handle: 'heavy-duty-sofa-board',
    image: {
      url: 'https://placeholder.co/400x300/0268a0/white?text=Heavy+Duty',
      alt: 'Heavy-Duty Sofa Board',
    },
  },
]

export const sleeperSofaSupportProducts: MegaMenuProduct[] = [
  {
    title: 'Sleeper Sofa Support Board',
    description: 'Designed to increase support and comfort for sleeper sofas',
    price: '$159.99',
    handle: 'sleeper-sofa-support-board',
    image: {
      url: 'https://placeholder.co/400x300/0268a0/white?text=Sleeper+Support',
      alt: 'Sleeper Sofa Support Board',
    },
    badge: 'New',
  },
  {
    title: 'Pro Sleeper Sofa Support',
    description: 'For permanent installations with dual support boards',
    price: '$229.99',
    handle: 'pro-sleeper-sofa-support',
    image: {
      url: 'https://placeholder.co/400x300/161f2b/white?text=Pro+Sleeper',
      alt: 'Pro Sleeper Sofa Support',
    },
  },
  {
    title: 'Custom Sleeper Package',
    description: 'Maximum comfort built to meet your exact needs',
    price: '$299.99',
    handle: 'custom-sleeper-package',
    image: {
      url: 'https://placeholder.co/400x300/0268a0/white?text=Custom+Package',
      alt: 'Custom Sleeper Package',
    },
    badge: 'Premium',
  },
]

export const bedSupportProducts: MegaMenuProduct[] = [
  {
    title: 'Standard Bed Support Board',
    description: 'Essential support for mattresses, prevents sagging',
    price: '$179.99',
    handle: 'standard-bed-support-board',
    image: {
      url: 'https://placeholder.co/400x300/0268a0/white?text=Standard+Bed',
      alt: 'Standard Bed Support Board',
    },
  },
  {
    title: 'King Size Bed Support',
    description: 'Heavy-duty support designed for king-size mattresses',
    price: '$259.99',
    handle: 'king-size-bed-support',
    image: {
      url: 'https://placeholder.co/400x300/161f2b/white?text=King+Size',
      alt: 'King Size Bed Support',
    },
    badge: 'Popular',
  },
  {
    title: 'Adjustable Bed Support System',
    description: 'Versatile system compatible with adjustable bed frames',
    price: '$319.99',
    handle: 'adjustable-bed-support-system',
    image: {
      url: 'https://placeholder.co/400x300/0268a0/white?text=Adjustable+System',
      alt: 'Adjustable Bed Support System',
    },
  },
]

export const productGuidesLinks = [
  { title: 'How to Measure Your Sofa', href: '/guides/measure-sofa' },
  { title: 'Installation Instructions', href: '/guides/installation' },
  { title: 'Choosing the Right Support', href: '/guides/choosing-support' },
  { title: 'Care & Maintenance', href: '/guides/maintenance' },
]

export const helpLinks = [
  { title: 'FAQ', href: '/help/faq' },
  { title: 'Contact Us', href: '/help/contact' },
  { title: 'Shipping & Returns', href: '/help/shipping-returns' },
  { title: 'Warranty Information', href: '/help/warranty' },
]
