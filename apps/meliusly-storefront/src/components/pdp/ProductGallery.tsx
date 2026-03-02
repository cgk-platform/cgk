'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Check, Minus, Plus, ShoppingCart, Play } from 'lucide-react'

interface ProductImage {
  url: string
  altText: string | null
  width: number
  height: number
}

interface ProductVariant {
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

interface ProductOption {
  id: string
  name: string
  values: string[]
}

interface ProductGalleryProps {
  product: {
    id: string
    title: string
    description: string
    images: ProductImage[]
    variants: ProductVariant[]
    options: ProductOption[]
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
  }
}

function formatPrice(amount: string, currencyCode: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
  }).format(parseFloat(amount))
}

export default function ProductGallery({ product }: ProductGalleryProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [selectedVariant, setSelectedVariant] = useState(product.variants[0])

  const handleVariantChange = (optionName: string, value: string) => {
    const newVariant = product.variants.find((variant) =>
      variant.selectedOptions.some((opt) => opt.name === optionName && opt.value === value)
    )
    if (newVariant) {
      setSelectedVariant(newVariant)
    }
  }

  const currentPrice = formatPrice(selectedVariant.price.amount, selectedVariant.price.currencyCode)

  const compareAtPrice = selectedVariant.compareAtPrice
    ? formatPrice(
        selectedVariant.compareAtPrice.amount,
        selectedVariant.compareAtPrice.currencyCode
      )
    : null

  const hasDiscount =
    compareAtPrice &&
    selectedVariant.compareAtPrice &&
    parseFloat(selectedVariant.compareAtPrice.amount) > parseFloat(selectedVariant.price.amount)

  return (
    <section className="bg-white px-6 py-8 lg:px-12">
      <div className="mx-auto max-w-[1440px]">
        {/* Breadcrumbs */}
        <div className="mb-8 flex items-center gap-1 text-[14px] text-[#777777]">
          <span>Home</span>
          <span>&gt;</span>
          <span>Sofa Bed Support</span>
          <span>&gt;</span>
          <span className="text-[#161F2B]">{product.title}</span>
        </div>

        <div className="flex flex-col gap-12 lg:flex-row lg:gap-12">
          {/* Left: Gallery */}
          <div className="flex gap-3 lg:w-[752px]">
            {/* Thumbnails */}
            <div className="flex flex-col gap-2.5">
              {product.images.slice(0, 9).map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImageIndex(index)}
                  className={`relative h-[90px] w-[90px] overflow-hidden rounded-lg transition-all ${
                    selectedImageIndex === index
                      ? 'ring-2 ring-[#0268A0]'
                      : 'ring-1 ring-[#E5E7EB] hover:ring-[#0268A0]'
                  }`}
                >
                  <div className="flex h-full w-full items-center justify-center bg-[#F6F6F6]">
                    <span className="text-xs text-[#161F2B]/30">Image {index + 1}</span>
                  </div>
                </button>
              ))}
              <div className="pointer-events-none absolute bottom-0 h-12 w-[90px] bg-gradient-to-t from-white to-transparent" />
            </div>

            {/* Main Image */}
            <div className="relative h-[650px] w-[650px] overflow-hidden rounded-2xl bg-[#F6F6F6]">
              <div className="flex h-full w-full items-center justify-center">
                <span className="text-lg text-[#161F2B]/30">Main Product Image</span>
              </div>

              {/* Best Seller Badge */}
              <div className="absolute top-6 left-0 flex items-center">
                <div className="h-[26px] bg-[#0268A0] px-2.5 py-1.5 text-[13px] font-semibold text-white">
                  BEST SELLER
                </div>
                <div className="h-0 w-0 border-t-[13px] border-b-[13px] border-l-[16px] border-t-transparent border-b-transparent border-l-[#0268A0]" />
              </div>

              {/* Permanently Installed Badge */}
              <div className="absolute top-52 left-16 flex h-[126px] w-[126px] flex-col items-center justify-center rounded-full border-[2.5px] border-[#0268A0] bg-[#F3FAFE] text-center">
                <p className="text-[14px] leading-tight font-extrabold tracking-wide text-[#0268A0] uppercase">
                  Permanently
                </p>
                <p className="text-[18px] leading-tight font-extrabold tracking-wide text-[#0268A0] uppercase">
                  Installed
                </p>
              </div>

              {/* Watch Installation Button */}
              <button className="absolute right-8 bottom-8 flex items-center gap-2.5 rounded-lg border border-[#0268A0] bg-[#F3FAFE] px-5 py-2.5 backdrop-blur-sm transition-all hover:bg-[#0268A0] hover:text-white">
                <Play className="h-3 w-3 fill-current" />
                <span className="text-[16px] font-medium text-[#0268A0] hover:text-white">
                  Watch Installation
                </span>
              </button>
            </div>
          </div>

          {/* Right: Product Info */}
          <div className="flex flex-1 flex-col gap-8">
            {/* Rating */}
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-[13px] w-[13px] text-[#FFB81C]">
                    ★
                  </div>
                ))}
              </div>
              <p className="text-[14px] text-[#161F2B]">
                5.0 Based on <span className="underline">472 Reviews</span>
              </p>
            </div>

            {/* Title */}
            <h1 className="text-[40px] leading-[1.3] font-semibold text-black">{product.title}</h1>

            {/* Price */}
            <div className="flex items-center gap-2">
              {hasDiscount && (
                <span className="text-[16px] text-[#777777] line-through">
                  from {compareAtPrice}
                </span>
              )}
              <span className="text-[24px] font-semibold text-black">{currentPrice}</span>
              {hasDiscount && (
                <span className="rounded-full bg-[#0268A0] px-2.5 py-1.5 text-[13px] font-bold text-white uppercase">
                  SAVE $20
                </span>
              )}
            </div>

            {/* Description */}
            <div className="flex flex-col gap-4">
              <p className="text-[16px] font-semibold text-[#161F2B]">
                Premium permanently installed support for sofa beds
              </p>
              <div className="flex flex-col gap-4">
                <div className="flex items-start gap-2">
                  <Check className="mt-0.5 h-3.5 w-3.5 text-[#0268A0]" />
                  <span className="text-[16px] text-[#161F2B]">
                    Blocks metal bars across the entire sleeping surface
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="mt-0.5 h-3.5 w-3.5 text-[#0268A0]" />
                  <span className="text-[16px] text-[#161F2B]">
                    Stays in place and folds with the sofa bed
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="mt-0.5 h-3.5 w-3.5 text-[#0268A0]" />
                  <span className="text-[16px] text-[#161F2B]">
                    Installs easily without drilling or hardware
                  </span>
                </div>
              </div>
            </div>

            {/* Size Selector */}
            {product.options.map((option) => (
              <div key={option.id} className="flex flex-col gap-3.5">
                <div className="flex items-center justify-between">
                  <p className="text-[15px] text-black">
                    Size: <span className="text-[#6A6A6A]">Select a size</span>
                  </p>
                  <button className="text-[18px] font-semibold text-[#0268A0] underline">
                    Size chart
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {option.values.map((value) => {
                    const variant = product.variants.find((v) =>
                      v.selectedOptions.some((opt) => opt.value === value)
                    )
                    return (
                      <button
                        key={value}
                        onClick={() => handleVariantChange(option.name, value)}
                        className="flex items-start justify-between rounded-lg border border-[rgba(34,34,34,0.1)] bg-white p-4 transition-all hover:border-[#0268A0]"
                      >
                        <div className="flex flex-col gap-3 text-left">
                          <p className="text-[15px] font-medium text-[#161F2B]">{value} Size</p>
                          <p className="text-[15px] text-[#777777]">35&quot; x 64&quot;</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div className="flex items-center gap-1">
                            {variant?.compareAtPrice && (
                              <span className="text-[14px] text-[#7F7F7F] line-through">
                                {formatPrice(
                                  variant.compareAtPrice.amount,
                                  variant.compareAtPrice.currencyCode
                                )}
                              </span>
                            )}
                            <span className="text-[16px] font-semibold text-black">
                              {variant
                                ? formatPrice(variant.price.amount, variant.price.currencyCode)
                                : ''}
                            </span>
                          </div>
                          {variant?.compareAtPrice && (
                            <span className="rounded-full bg-[#0268A0] px-2 py-1 text-[13px] font-bold text-white uppercase">
                              SAVE $32
                            </span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}

            {/* Add to Cart Button */}
            <div className="flex flex-col gap-4">
              <button
                disabled={!selectedVariant.availableForSale}
                className="flex h-14 items-center justify-center rounded-lg bg-[#0268A0] text-[16px] font-semibold text-white opacity-40 transition-all hover:bg-[#015580] disabled:cursor-not-allowed"
              >
                Select a size
              </button>
              <p className="flex items-center justify-center gap-3 text-[15px] text-[#020A0A]">
                <span className="text-[13px]">📦</span>
                Est. delivery to <span className="text-[#0268A0] underline">90210</span> by Thurs,
                10 Oct
              </p>
            </div>

            {/* Trust Badges */}
            <div className="flex gap-8 border-t border-[#E5E7EB] pt-10">
              <div className="flex flex-1 flex-col items-center gap-3 text-center">
                <div className="text-2xl">🚚</div>
                <p className="text-[16px] text-[#161F2B]">Free Shipping on all orders</p>
              </div>
              <div className="flex flex-1 flex-col items-center gap-3 text-center">
                <div className="text-2xl">🛡️</div>
                <p className="text-[16px] text-[#161F2B]">30-Day Returns</p>
              </div>
              <div className="flex flex-1 flex-col items-center gap-3 text-center">
                <div className="text-2xl">💰</div>
                <p className="text-[16px] text-[#161F2B]">US-Based Customer Support</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
