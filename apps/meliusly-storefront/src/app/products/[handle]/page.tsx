import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import ProductGallery from '@/components/pdp/ProductGallery'
import ProductBenefits from '@/components/pdp/ProductBenefits'
import ProductFeatures from '@/components/pdp/ProductFeatures'
import ProductReviews from '@/components/pdp/ProductReviews'
import ProductDimensions from '@/components/pdp/ProductDimensions'
import { InstallationGuide } from '@/components/pdp/InstallationGuide'
import { ProductVideo } from '@/components/pdp/ProductVideo'
import PressAwards from '@/components/pdp/PressAwards'
import ProductFAQ from '@/components/pdp/ProductFAQ'
import ComparisonTable from '@/components/pdp/ComparisonTable'
import ExtendedReviews from '@/components/pdp/ExtendedReviews'
import RelatedProducts from '@/components/pdp/RelatedProducts'
import { TraitsBar } from '@/components/sections/TraitsBar'
import { ProductSelectorGuide, ProductSelectorTabs } from '@/components/products'
import { logger } from '@cgk-platform/logging'

interface Product {
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
  compareAtPriceRange?: {
    minVariantPrice: {
      amount: string
      currencyCode: string
    }
  }
  featuredImage: {
    url: string
    altText: string | null
    width: number
    height: number
  }
  images: {
    edges: Array<{
      node: {
        url: string
        altText: string | null
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
        compareAtPrice?: {
          amount: string
          currencyCode: string
        }
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

interface ProductResponse {
  success: boolean
  data: Product
  tenant?: {
    id: string
    slug: string
    name: string
  }
}

async function fetchProduct(handle: string): Promise<Product | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3300'
    const res = await fetch(`${baseUrl}/api/products/${handle}`, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!res.ok) {
      logger.error('Failed to fetch product:', new Error(await res.text()))
      return null
    }

    const json = (await res.json()) as ProductResponse

    if (!json.success || !json.data) {
      logger.error('Invalid product response:', undefined, { response: json })
      return null
    }

    return json.data
  } catch (error) {
    logger.error(
      'Error fetching product:',
      error instanceof Error ? error : new Error(String(error))
    )
    return null
  }
}

interface ProductsResponse {
  success: boolean
  data: Product[]
}

async function fetchRelatedProducts(): Promise<Product[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3300'
    const res = await fetch(`${baseUrl}/api/products?limit=8`, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!res.ok) {
      logger.error('Failed to fetch products:', new Error(await res.text()))
      return []
    }

    const json = (await res.json()) as ProductsResponse

    if (!json.success || !json.data) {
      logger.error('Invalid products response:', undefined, { response: json })
      return []
    }

    return json.data
  } catch (error) {
    logger.error(
      'Error fetching products:',
      error instanceof Error ? error : new Error(String(error))
    )
    return []
  }
}

interface PageProps {
  params: Promise<{
    handle: string
  }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { handle } = await params
  const product = await fetchProduct(handle)

  if (!product) {
    return {
      title: 'Product Not Found',
    }
  }

  return {
    title: `${product.title} | Meliusly`,
    description: product.description,
    openGraph: {
      title: product.title,
      description: product.description,
      images: [
        {
          url: product.featuredImage.url,
          width: product.featuredImage.width,
          height: product.featuredImage.height,
          alt: product.featuredImage.altText || product.title,
        },
      ],
    },
  }
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { handle } = await params
  const product = await fetchProduct(handle)

  if (!product) {
    notFound()
  }

  // Fetch related products
  const relatedProducts = await fetchRelatedProducts()

  // Extract product images
  const images = [product.featuredImage, ...product.images.edges.map((edge) => edge.node)]

  // Extract variants
  const variants = product.variants.edges.map((edge) => edge.node)

  // Define tabs for product details
  const productTabs = [
    {
      title: 'Benefits',
      content: '<p>Premium materials and construction for lasting durability.</p>',
    },
    { title: 'Features', content: '<p>Advanced design for maximum support and comfort.</p>' },
    { title: 'Reviews', content: '<p>Rated 4.8/5 stars by hundreds of satisfied customers.</p>' },
    { title: 'Dimensions', content: '<p>Custom sizing available to fit your exact needs.</p>' },
    {
      title: 'Installation',
      content: '<p>Easy installation with included hardware and instructions.</p>',
    },
    { title: 'Video', content: '<p>Watch our installation video for step-by-step guidance.</p>' },
  ]

  return (
    <div className="bg-white">
      {/* Product Selector Guide */}
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <ProductSelectorGuide />
      </div>

      {/* Product Gallery & Info Section */}
      <ProductGallery
        product={{
          id: product.id,
          title: product.title,
          description: product.description,
          images,
          variants,
          options: product.options,
          priceRange: product.priceRange,
          compareAtPriceRange: product.compareAtPriceRange,
        }}
      />

      {/* Traits Bar */}
      <TraitsBar />

      {/* Product Tabs Section */}
      <div className="container mx-auto max-w-7xl px-4 py-12">
        <ProductSelectorTabs tabs={productTabs} />
      </div>

      {/* Product Benefits */}
      <ProductBenefits />

      {/* Product Features */}
      <ProductFeatures />

      {/* Customer Reviews */}
      <ProductReviews />

      {/* Product Dimensions */}
      <ProductDimensions />

      {/* Installation Guide */}
      <InstallationGuide />

      {/* Product Video */}
      <ProductVideo />

      {/* Press & Awards */}
      <PressAwards />

      {/* FAQ */}
      <ProductFAQ />

      {/* Comparison Table */}
      <ComparisonTable currentProductId={product.id} />

      {/* Extended Reviews */}
      <ExtendedReviews />

      {/* Related Products */}
      <RelatedProducts products={relatedProducts} currentProductId={product.id} />
    </div>
  )
}
