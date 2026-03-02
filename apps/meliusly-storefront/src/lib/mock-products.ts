/**
 * Mock Product Data for Offline/Demo Mode
 *
 * Provides realistic fallback product data when Shopify GraphQL isn't available.
 * Uses real images from /public/assets/ directory.
 */

export interface MockProduct {
  id: string
  title: string
  handle: string
  description: string
  descriptionHtml: string
  priceRange: {
    minVariantPrice: {
      amount: string
      currencyCode: string
    }
  }
  compareAtPriceRange: {
    minVariantPrice: {
      amount: string
      currencyCode: string
    }
  } | null
  featuredImage: {
    url: string
    altText: string
    width: number
    height: number
  }
  images: {
    edges: Array<{
      node: {
        url: string
        altText: string
        width: number
        height: number
      }
    }>
  }
  variants: {
    edges: Array<{
      node: {
        id: string
        title: string
        availableForSale: boolean
        price: {
          amount: string
          currencyCode: string
        }
        compareAtPrice: {
          amount: string
          currencyCode: string
        } | null
        selectedOptions: Array<{
          name: string
          value: string
        }>
      }
    }>
  }
  options: Array<{
    id: string
    name: string
    values: string[]
  }>
}

const MOCK_PRODUCTS: MockProduct[] = [
  {
    id: 'gid://shopify/Product/mock-1',
    title: 'SleeperSaver Pro',
    handle: 'sleepersaver-pro',
    description:
      'The ultimate sofa bed support solution. Our premium SleeperSaver Pro provides unmatched comfort and support for your sleeper sofa. Features reinforced construction and adjustable support zones for maximum durability and comfort.',
    descriptionHtml:
      '<p>The ultimate sofa bed support solution. Our premium SleeperSaver Pro provides unmatched comfort and support for your sleeper sofa.</p><p>Features:</p><ul><li>Reinforced construction for long-lasting durability</li><li>Adjustable support zones for personalized comfort</li><li>Easy installation in minutes</li><li>Works with all standard sleeper sofas</li></ul>',
    priceRange: {
      minVariantPrice: {
        amount: '149.99',
        currencyCode: 'USD',
      },
    },
    compareAtPriceRange: {
      minVariantPrice: {
        amount: '199.99',
        currencyCode: 'USD',
      },
    },
    featuredImage: {
      url: '/assets/sleepersaver-thumb.webp',
      altText: 'SleeperSaver Pro - Premium Sofa Bed Support',
      width: 800,
      height: 800,
    },
    images: {
      edges: [
        {
          node: {
            url: '/assets/sleepersaver-thumb.webp',
            altText: 'SleeperSaver Pro - Main View',
            width: 800,
            height: 800,
          },
        },
        {
          node: {
            url: '/assets/grey-gold-living-room.webp',
            altText: 'SleeperSaver Pro in Living Room Setting',
            width: 1200,
            height: 800,
          },
        },
        {
          node: {
            url: '/assets/product-display.webp',
            altText: 'SleeperSaver Pro Detail View',
            width: 800,
            height: 600,
          },
        },
      ],
    },
    variants: {
      edges: [
        {
          node: {
            id: 'gid://shopify/ProductVariant/mock-1-1',
            title: 'Queen',
            availableForSale: true,
            price: {
              amount: '149.99',
              currencyCode: 'USD',
            },
            compareAtPrice: {
              amount: '199.99',
              currencyCode: 'USD',
            },
            selectedOptions: [
              {
                name: 'Size',
                value: 'Queen',
              },
            ],
          },
        },
        {
          node: {
            id: 'gid://shopify/ProductVariant/mock-1-2',
            title: 'Full',
            availableForSale: true,
            price: {
              amount: '129.99',
              currencyCode: 'USD',
            },
            compareAtPrice: {
              amount: '179.99',
              currencyCode: 'USD',
            },
            selectedOptions: [
              {
                name: 'Size',
                value: 'Full',
              },
            ],
          },
        },
      ],
    },
    options: [
      {
        id: 'gid://shopify/ProductOption/mock-1-size',
        name: 'Size',
        values: ['Queen', 'Full'],
      },
    ],
  },
  {
    id: 'gid://shopify/Product/mock-2',
    title: 'Classic Sleeper Support',
    handle: 'classic-sleeper-support',
    description:
      'Our best-selling classic support board. Designed for comfort and durability, the Classic Sleeper Support transforms your sleeper sofa into a comfortable sleeping surface. Perfect for guest rooms and frequent use.',
    descriptionHtml:
      '<p>Our best-selling classic support board. Designed for comfort and durability, the Classic Sleeper Support transforms your sleeper sofa into a comfortable sleeping surface.</p><p>Perfect for:</p><ul><li>Guest rooms</li><li>Frequent use</li><li>All sleeper sofa types</li><li>Budget-conscious buyers</li></ul>',
    priceRange: {
      minVariantPrice: {
        amount: '99.99',
        currencyCode: 'USD',
      },
    },
    compareAtPriceRange: null,
    featuredImage: {
      url: '/assets/classic-sleeper-thumb.webp',
      altText: 'Classic Sleeper Support',
      width: 800,
      height: 800,
    },
    images: {
      edges: [
        {
          node: {
            url: '/assets/classic-sleeper-thumb.webp',
            altText: 'Classic Sleeper Support - Main View',
            width: 800,
            height: 800,
          },
        },
        {
          node: {
            url: '/assets/product-display.webp',
            altText: 'Classic Sleeper Support Display',
            width: 800,
            height: 600,
          },
        },
      ],
    },
    variants: {
      edges: [
        {
          node: {
            id: 'gid://shopify/ProductVariant/mock-2-1',
            title: 'Queen',
            availableForSale: true,
            price: {
              amount: '99.99',
              currencyCode: 'USD',
            },
            compareAtPrice: null,
            selectedOptions: [
              {
                name: 'Size',
                value: 'Queen',
              },
            ],
          },
        },
        {
          node: {
            id: 'gid://shopify/ProductVariant/mock-2-2',
            title: 'Full',
            availableForSale: true,
            price: {
              amount: '89.99',
              currencyCode: 'USD',
            },
            compareAtPrice: null,
            selectedOptions: [
              {
                name: 'Size',
                value: 'Full',
              },
            ],
          },
        },
        {
          node: {
            id: 'gid://shopify/ProductVariant/mock-2-3',
            title: 'Twin',
            availableForSale: true,
            price: {
              amount: '79.99',
              currencyCode: 'USD',
            },
            compareAtPrice: null,
            selectedOptions: [
              {
                name: 'Size',
                value: 'Twin',
              },
            ],
          },
        },
      ],
    },
    options: [
      {
        id: 'gid://shopify/ProductOption/mock-2-size',
        name: 'Size',
        values: ['Queen', 'Full', 'Twin'],
      },
    ],
  },
  {
    id: 'gid://shopify/Product/mock-3',
    title: 'Flex Sleeper Support',
    handle: 'flex-sleeper-support',
    description:
      'Flexible support solution for modern sleeper sofas. The Flex Sleeper Support features innovative flexible design that adapts to your sofa bed frame while providing consistent support. Ideal for contemporary furniture.',
    descriptionHtml:
      '<p>Flexible support solution for modern sleeper sofas. The Flex Sleeper Support features innovative flexible design that adapts to your sofa bed frame while providing consistent support.</p><p>Features:</p><ul><li>Innovative flexible design</li><li>Adapts to various frame types</li><li>Lightweight yet durable</li><li>Easy to store when not in use</li></ul>',
    priceRange: {
      minVariantPrice: {
        amount: '129.99',
        currencyCode: 'USD',
      },
    },
    compareAtPriceRange: null,
    featuredImage: {
      url: '/assets/flex-sleeper-thumb.webp',
      altText: 'Flex Sleeper Support',
      width: 800,
      height: 800,
    },
    images: {
      edges: [
        {
          node: {
            url: '/assets/flex-sleeper-thumb.webp',
            altText: 'Flex Sleeper Support - Main View',
            width: 800,
            height: 800,
          },
        },
        {
          node: {
            url: '/assets/grey-gold-living-room.webp',
            altText: 'Flex Sleeper in Modern Living Room',
            width: 1200,
            height: 800,
          },
        },
      ],
    },
    variants: {
      edges: [
        {
          node: {
            id: 'gid://shopify/ProductVariant/mock-3-1',
            title: 'Queen',
            availableForSale: true,
            price: {
              amount: '129.99',
              currencyCode: 'USD',
            },
            compareAtPrice: null,
            selectedOptions: [
              {
                name: 'Size',
                value: 'Queen',
              },
            ],
          },
        },
        {
          node: {
            id: 'gid://shopify/ProductVariant/mock-3-2',
            title: 'Full',
            availableForSale: true,
            price: {
              amount: '119.99',
              currencyCode: 'USD',
            },
            compareAtPrice: null,
            selectedOptions: [
              {
                name: 'Size',
                value: 'Full',
              },
            ],
          },
        },
      ],
    },
    options: [
      {
        id: 'gid://shopify/ProductOption/mock-3-size',
        name: 'Size',
        values: ['Queen', 'Full'],
      },
    ],
  },
  {
    id: 'gid://shopify/Product/mock-4',
    title: 'Premium Support Board',
    handle: 'premium-support-board',
    description:
      'Top-of-the-line support for luxury sleeper sofas. Our Premium Support Board features advanced materials and construction techniques for the ultimate in comfort and longevity. Perfect for high-end furniture.',
    descriptionHtml:
      '<p>Top-of-the-line support for luxury sleeper sofas. Our Premium Support Board features advanced materials and construction techniques for the ultimate in comfort and longevity.</p><p>Premium Features:</p><ul><li>Advanced composite materials</li><li>Multi-layer support system</li><li>Lifetime warranty</li><li>Professional installation available</li></ul>',
    priceRange: {
      minVariantPrice: {
        amount: '179.99',
        currencyCode: 'USD',
      },
    },
    compareAtPriceRange: {
      minVariantPrice: {
        amount: '229.99',
        currencyCode: 'USD',
      },
    },
    featuredImage: {
      url: '/assets/sleepersaver-thumb.webp',
      altText: 'Premium Support Board',
      width: 800,
      height: 800,
    },
    images: {
      edges: [
        {
          node: {
            url: '/assets/sleepersaver-thumb.webp',
            altText: 'Premium Support Board',
            width: 800,
            height: 800,
          },
        },
      ],
    },
    variants: {
      edges: [
        {
          node: {
            id: 'gid://shopify/ProductVariant/mock-4-1',
            title: 'Queen / Standard',
            availableForSale: true,
            price: {
              amount: '179.99',
              currencyCode: 'USD',
            },
            compareAtPrice: {
              amount: '229.99',
              currencyCode: 'USD',
            },
            selectedOptions: [
              {
                name: 'Size',
                value: 'Queen',
              },
              {
                name: 'Thickness',
                value: 'Standard',
              },
            ],
          },
        },
        {
          node: {
            id: 'gid://shopify/ProductVariant/mock-4-2',
            title: 'Queen / Extra Support',
            availableForSale: true,
            price: {
              amount: '199.99',
              currencyCode: 'USD',
            },
            compareAtPrice: {
              amount: '249.99',
              currencyCode: 'USD',
            },
            selectedOptions: [
              {
                name: 'Size',
                value: 'Queen',
              },
              {
                name: 'Thickness',
                value: 'Extra Support',
              },
            ],
          },
        },
      ],
    },
    options: [
      {
        id: 'gid://shopify/ProductOption/mock-4-size',
        name: 'Size',
        values: ['Queen'],
      },
      {
        id: 'gid://shopify/ProductOption/mock-4-thickness',
        name: 'Thickness',
        values: ['Standard', 'Extra Support'],
      },
    ],
  },
  {
    id: 'gid://shopify/Product/mock-5',
    title: 'Comfort Plus Board',
    handle: 'comfort-plus-board',
    description:
      'Enhanced comfort at an affordable price. The Comfort Plus Board adds an extra layer of support without breaking the bank. Great for occasional use and guest rooms.',
    descriptionHtml:
      '<p>Enhanced comfort at an affordable price. The Comfort Plus Board adds an extra layer of support without breaking the bank.</p><p>Ideal for:</p><ul><li>Occasional use</li><li>Guest rooms</li><li>Budget-friendly option</li><li>Easy installation</li></ul>',
    priceRange: {
      minVariantPrice: {
        amount: '79.99',
        currencyCode: 'USD',
      },
    },
    compareAtPriceRange: null,
    featuredImage: {
      url: '/assets/classic-sleeper-thumb.webp',
      altText: 'Comfort Plus Board',
      width: 800,
      height: 800,
    },
    images: {
      edges: [
        {
          node: {
            url: '/assets/classic-sleeper-thumb.webp',
            altText: 'Comfort Plus Board',
            width: 800,
            height: 800,
          },
        },
      ],
    },
    variants: {
      edges: [
        {
          node: {
            id: 'gid://shopify/ProductVariant/mock-5-1',
            title: 'Full',
            availableForSale: true,
            price: {
              amount: '79.99',
              currencyCode: 'USD',
            },
            compareAtPrice: null,
            selectedOptions: [
              {
                name: 'Size',
                value: 'Full',
              },
            ],
          },
        },
        {
          node: {
            id: 'gid://shopify/ProductVariant/mock-5-2',
            title: 'Twin',
            availableForSale: true,
            price: {
              amount: '69.99',
              currencyCode: 'USD',
            },
            compareAtPrice: null,
            selectedOptions: [
              {
                name: 'Size',
                value: 'Twin',
              },
            ],
          },
        },
      ],
    },
    options: [
      {
        id: 'gid://shopify/ProductOption/mock-5-size',
        name: 'Size',
        values: ['Full', 'Twin'],
      },
    ],
  },
  {
    id: 'gid://shopify/Product/mock-6',
    title: 'Elite Sleeper Pro',
    handle: 'elite-sleeper-pro',
    description:
      'Professional-grade support system for commercial applications. The Elite Sleeper Pro is designed for hotels, rental properties, and high-use environments. Built to last with commercial-grade materials.',
    descriptionHtml:
      '<p>Professional-grade support system for commercial applications. The Elite Sleeper Pro is designed for hotels, rental properties, and high-use environments.</p><p>Commercial Features:</p><ul><li>Commercial-grade materials</li><li>Heavy-duty construction</li><li>Extended warranty</li><li>Volume pricing available</li></ul>',
    priceRange: {
      minVariantPrice: {
        amount: '199.99',
        currencyCode: 'USD',
      },
    },
    compareAtPriceRange: null,
    featuredImage: {
      url: '/assets/flex-sleeper-thumb.webp',
      altText: 'Elite Sleeper Pro',
      width: 800,
      height: 800,
    },
    images: {
      edges: [
        {
          node: {
            url: '/assets/flex-sleeper-thumb.webp',
            altText: 'Elite Sleeper Pro',
            width: 800,
            height: 800,
          },
        },
        {
          node: {
            url: '/assets/product-display.webp',
            altText: 'Elite Sleeper Pro Detail',
            width: 800,
            height: 600,
          },
        },
      ],
    },
    variants: {
      edges: [
        {
          node: {
            id: 'gid://shopify/ProductVariant/mock-6-1',
            title: 'Queen',
            availableForSale: true,
            price: {
              amount: '199.99',
              currencyCode: 'USD',
            },
            compareAtPrice: null,
            selectedOptions: [
              {
                name: 'Size',
                value: 'Queen',
              },
            ],
          },
        },
      ],
    },
    options: [
      {
        id: 'gid://shopify/ProductOption/mock-6-size',
        name: 'Size',
        values: ['Queen'],
      },
    ],
  },
  {
    id: 'gid://shopify/Product/mock-7',
    title: 'Standard Support',
    handle: 'standard-support',
    description:
      'Essential support at an entry-level price. The Standard Support provides basic reinforcement for your sleeper sofa at an affordable price point. Perfect for light use and budget-conscious buyers.',
    descriptionHtml:
      '<p>Essential support at an entry-level price. The Standard Support provides basic reinforcement for your sleeper sofa at an affordable price point.</p><p>Benefits:</p><ul><li>Affordable pricing</li><li>Easy installation</li><li>Suitable for light use</li><li>Universal fit</li></ul>',
    priceRange: {
      minVariantPrice: {
        amount: '59.99',
        currencyCode: 'USD',
      },
    },
    compareAtPriceRange: null,
    featuredImage: {
      url: '/assets/classic-sleeper-thumb.webp',
      altText: 'Standard Support',
      width: 800,
      height: 800,
    },
    images: {
      edges: [
        {
          node: {
            url: '/assets/classic-sleeper-thumb.webp',
            altText: 'Standard Support',
            width: 800,
            height: 800,
          },
        },
      ],
    },
    variants: {
      edges: [
        {
          node: {
            id: 'gid://shopify/ProductVariant/mock-7-1',
            title: 'Full',
            availableForSale: true,
            price: {
              amount: '59.99',
              currencyCode: 'USD',
            },
            compareAtPrice: null,
            selectedOptions: [
              {
                name: 'Size',
                value: 'Full',
              },
            ],
          },
        },
        {
          node: {
            id: 'gid://shopify/ProductVariant/mock-7-2',
            title: 'Twin',
            availableForSale: true,
            price: {
              amount: '49.99',
              currencyCode: 'USD',
            },
            compareAtPrice: null,
            selectedOptions: [
              {
                name: 'Size',
                value: 'Twin',
              },
            ],
          },
        },
      ],
    },
    options: [
      {
        id: 'gid://shopify/ProductOption/mock-7-size',
        name: 'Size',
        values: ['Full', 'Twin'],
      },
    ],
  },
  {
    id: 'gid://shopify/Product/mock-8',
    title: 'Deluxe Support Board',
    handle: 'deluxe-support-board',
    description:
      'Premium comfort with advanced features. The Deluxe Support Board includes multiple support zones, enhanced materials, and a premium finish. Ideal for those who want the best sleeping experience.',
    descriptionHtml:
      '<p>Premium comfort with advanced features. The Deluxe Support Board includes multiple support zones, enhanced materials, and a premium finish.</p><p>Premium Features:</p><ul><li>Multi-zone support system</li><li>Enhanced materials</li><li>Premium finish</li><li>5-year warranty</li></ul>',
    priceRange: {
      minVariantPrice: {
        amount: '159.99',
        currencyCode: 'USD',
      },
    },
    compareAtPriceRange: {
      minVariantPrice: {
        amount: '189.99',
        currencyCode: 'USD',
      },
    },
    featuredImage: {
      url: '/assets/sleepersaver-thumb.webp',
      altText: 'Deluxe Support Board',
      width: 800,
      height: 800,
    },
    images: {
      edges: [
        {
          node: {
            url: '/assets/sleepersaver-thumb.webp',
            altText: 'Deluxe Support Board',
            width: 800,
            height: 800,
          },
        },
        {
          node: {
            url: '/assets/grey-gold-living-room.webp',
            altText: 'Deluxe Support Board in Luxury Setting',
            width: 1200,
            height: 800,
          },
        },
      ],
    },
    variants: {
      edges: [
        {
          node: {
            id: 'gid://shopify/ProductVariant/mock-8-1',
            title: 'Queen',
            availableForSale: true,
            price: {
              amount: '159.99',
              currencyCode: 'USD',
            },
            compareAtPrice: {
              amount: '189.99',
              currencyCode: 'USD',
            },
            selectedOptions: [
              {
                name: 'Size',
                value: 'Queen',
              },
            ],
          },
        },
        {
          node: {
            id: 'gid://shopify/ProductVariant/mock-8-2',
            title: 'Full',
            availableForSale: true,
            price: {
              amount: '139.99',
              currencyCode: 'USD',
            },
            compareAtPrice: {
              amount: '169.99',
              currencyCode: 'USD',
            },
            selectedOptions: [
              {
                name: 'Size',
                value: 'Full',
              },
            ],
          },
        },
      ],
    },
    options: [
      {
        id: 'gid://shopify/ProductOption/mock-8-size',
        name: 'Size',
        values: ['Queen', 'Full'],
      },
    ],
  },
]

/**
 * Get all mock products or a subset
 */
export function getMockProducts(count?: number): MockProduct[] {
  if (count && count < MOCK_PRODUCTS.length) {
    return MOCK_PRODUCTS.slice(0, count)
  }
  return MOCK_PRODUCTS
}

/**
 * Get a single mock product by handle
 */
export function getMockProductByHandle(handle: string): MockProduct | null {
  return MOCK_PRODUCTS.find((product) => product.handle === handle) || null
}

/**
 * Generate simplified mock products for product list view
 * (lighter payload, only essential fields)
 */
export function getMockProductsSimplified(count: number) {
  const products = getMockProducts(count)
  return products.map((product) => ({
    id: product.id,
    title: product.title,
    handle: product.handle,
    description: product.description,
    priceRange: product.priceRange,
    compareAtPriceRange: product.compareAtPriceRange,
    featuredImage: product.featuredImage,
    images: {
      edges: product.images.edges.slice(0, 1), // Only first image for list view
    },
    variants: {
      edges: product.variants.edges.map((edge) => ({
        node: {
          id: edge.node.id,
          title: edge.node.title,
          availableForSale: edge.node.availableForSale,
          price: edge.node.price,
        },
      })),
    },
  }))
}
