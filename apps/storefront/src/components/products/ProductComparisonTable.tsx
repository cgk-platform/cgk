/**
 * Product Comparison Table Component
 *
 * Displays a comparison table of products with features in a scrollable horizontal layout.
 * Used on PDP to show current product vs alternatives.
 * Based on Figma node 1-4301 (Sofa bed support guide - comparison section)
 */

'use client'

import type { Product } from '@cgk-platform/commerce'
import { PriceDisplay } from './PriceDisplay'
import { Check, X } from 'lucide-react'
import Link from 'next/link'

export interface ComparisonFeature {
  label: string
  values: (string | boolean | null)[]
}

export interface ProductComparisonTableProps {
  products: Product[]
  features: ComparisonFeature[]
  sectionTitle?: string
  currentProductId?: string
}

/**
 * ProductComparisonTable
 *
 * Responsive comparison table that scrolls horizontally on mobile.
 * Highlights the current product if currentProductId is provided.
 */
export function ProductComparisonTable({
  products,
  features,
  sectionTitle = 'Compare Our Products',
  currentProductId,
}: ProductComparisonTableProps) {
  if (products.length === 0) {
    return null
  }

  return (
    <section className="w-full">
      {/* Section Heading */}
      <h2 className="mb-8 text-center font-manrope text-2xl font-bold text-meliusly-dark md:text-3xl">
        {sectionTitle}
      </h2>

      {/* Comparison Table - Horizontal scroll on mobile */}
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full align-middle">
          <table className="min-w-full border-collapse">
            <thead>
              <tr>
                {/* Empty cell for feature labels column */}
                <th className="w-48 border-b-2 border-gray-200 bg-white p-4" />

                {/* Product Headers */}
                {products.map((product) => {
                  const isCurrentProduct = currentProductId === product.id
                  return (
                    <th
                      key={product.id}
                      className={`min-w-[200px] border-b-2 p-4 ${
                        isCurrentProduct
                          ? 'border-meliusly-primary bg-meliusly-primary/5'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-3">
                        {/* Product Image */}
                        {product.images[0] && (
                          <img
                            src={product.images[0].url}
                            alt={product.images[0].altText || product.title}
                            className="h-24 w-24 rounded-lg object-cover"
                          />
                        )}

                        {/* Product Title */}
                        <h3 className="text-center font-manrope text-sm font-semibold text-meliusly-dark">
                          {product.title}
                        </h3>

                        {/* Price */}
                        <div className="flex flex-col items-center gap-1">
                          <PriceDisplay
                            price={product.priceRange.minVariantPrice}
                            compareAtPrice={
                              product.variants[0]?.compareAtPrice &&
                              parseFloat(product.variants[0].compareAtPrice.amount) >
                                parseFloat(product.variants[0].price.amount)
                                ? product.variants[0].compareAtPrice
                                : undefined
                            }
                            size="sm"
                          />
                        </div>

                        {/* CTA Button */}
                        <Link
                          href={`/products/${product.handle}`}
                          className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
                            isCurrentProduct
                              ? 'cursor-not-allowed bg-gray-200 text-gray-500'
                              : 'bg-meliusly-primary text-white hover:bg-meliusly-primary/90'
                          }`}
                          onClick={(e) => {
                            if (isCurrentProduct) {
                              e.preventDefault()
                            }
                          }}
                        >
                          {isCurrentProduct ? 'Current Item' : 'View Details'}
                        </Link>
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>

            <tbody>
              {/* Feature Rows */}
              {features.map((feature, featureIndex) => (
                <tr
                  key={featureIndex}
                  className={featureIndex % 2 === 0 ? 'bg-gray-50' : 'bg-white'}
                >
                  {/* Feature Label */}
                  <td className="border-b border-gray-200 p-4 font-manrope text-sm font-medium text-meliusly-dark">
                    {feature.label}
                  </td>

                  {/* Feature Values for each product */}
                  {feature.values.map((value, productIndex) => {
                    const product = products[productIndex]
                    const isCurrentProduct = currentProductId === product?.id

                    return (
                      <td
                        key={productIndex}
                        className={`border-b p-4 text-center ${
                          isCurrentProduct
                            ? 'border-meliusly-primary/30 bg-meliusly-primary/5'
                            : 'border-gray-200'
                        }`}
                      >
                        {typeof value === 'boolean' ? (
                          value ? (
                            <Check className="mx-auto h-5 w-5 text-green-600" strokeWidth={2.5} />
                          ) : (
                            <X className="mx-auto h-5 w-5 text-gray-400" strokeWidth={2} />
                          )
                        ) : value === null ? (
                          <span className="text-sm text-gray-400">—</span>
                        ) : (
                          <span className="font-manrope text-sm text-meliusly-dark">{value}</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile scroll hint */}
      <p className="mt-4 text-center text-xs text-gray-500 md:hidden">
        Swipe left to see more products
      </p>
    </section>
  )
}
