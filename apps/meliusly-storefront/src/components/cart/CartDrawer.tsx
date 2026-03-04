'use client'

import { X, Minus, Plus, Trash2, Lock, ChevronRight, Package } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useCart } from '@/lib/cart'
import { useEffect, useState } from 'react'

const logger = { info: console.log, warn: console.warn, error: console.error, debug: console.debug }

interface CartDrawerProps {
  isOpen: boolean
  onClose: () => void
}

function formatPrice(amount: string, currencyCode: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
  }).format(parseFloat(amount))
}

const productCategories = [
  {
    title: 'Sleeper Sofa Support',
    description: 'Improve sleeper comfort',
    image: '/meliusly/products/sleepsaver.png',
    href: '/collections/sofa-bed-supports',
  },
  {
    title: 'Sofa & Chair Support',
    description: 'Fix sagging sofa & chairs',
    image: '/meliusly/products/classic.png',
    href: '/collections/sofa-support',
  },
  {
    title: 'Bed Support',
    description: 'For a solid, even surface',
    image: '/meliusly/products/flex.png',
    href: '/collections/bed-support',
  },
]

export function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { cart, updateQuantity, removeItem, isLoading } = useCart()
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)

  // Handle checkout
  const handleCheckout = async () => {
    if (!cart || cart.items.length === 0) return

    setIsCheckingOut(true)
    setCheckoutError(null)

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.items.map((item) => ({
            variantId: item.variantId,
            quantity: item.quantity,
          })),
        }),
      })

      const data = (await response.json()) as {
        success: boolean
        checkoutUrl?: string
        error?: string
      }

      if (data.success && data.checkoutUrl) {
        // Redirect to Shopify checkout
        window.location.href = data.checkoutUrl
      } else {
        setCheckoutError(data.error || 'Failed to create checkout')
      }
    } catch (error) {
      logger.error('Checkout error:', error)
      setCheckoutError('Failed to create checkout. Please try again.')
    } finally {
      setIsCheckingOut(false)
    }
  }

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  const hasItems = cart && cart.items.length > 0

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-full bg-white shadow-2xl transition-transform duration-300 ease-in-out sm:w-[400px] ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#E5E7EB] px-6 py-5">
            <h2 className="font-manrope text-[20px] font-semibold text-[#161F2B]">
              Your Cart ({cart?.itemCount || 0})
            </h2>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-[#F6F6F6]"
              aria-label="Close cart"
            >
              <X className="h-5 w-5 text-[#161F2B]" strokeWidth={2} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex h-full items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#E5E7EB] border-t-[#0268A0]" />
              </div>
            ) : hasItems ? (
              <div className="px-6 py-4">
                {/* Free Shipping Banner */}
                <div className="mb-6 flex items-center justify-center gap-2 rounded-lg bg-[#E6F7FF] py-3">
                  <Package className="h-4 w-4 text-[#0268A0]" strokeWidth={2.5} />
                  <span className="font-manrope text-[13px] font-bold tracking-wide text-[#0268A0] uppercase">
                    This Item Ships Free
                  </span>
                </div>

                {/* Cart Items */}
                <div className="space-y-6">
                  {cart.items.map((item) => {
                    const currentPrice = formatPrice(item.price.amount, item.price.currencyCode)
                    const compareAtPrice = item.compareAtPrice
                      ? formatPrice(item.compareAtPrice.amount, item.compareAtPrice.currencyCode)
                      : null

                    const hasDiscount =
                      compareAtPrice &&
                      item.compareAtPrice &&
                      parseFloat(item.compareAtPrice.amount) > parseFloat(item.price.amount)

                    const savings = hasDiscount
                      ? (
                          parseFloat(item.compareAtPrice!.amount) - parseFloat(item.price.amount)
                        ).toFixed(2)
                      : null

                    return (
                      <div key={item.variantId} className="flex gap-4">
                        {/* Product Image */}
                        <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-[#F6F6F6]">
                          {item.image ? (
                            <Image
                              src={item.image.url}
                              alt={item.image.altText || item.productTitle}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs text-[#161F2B]/20">
                              No image
                            </div>
                          )}
                        </div>

                        {/* Product Info */}
                        <div className="flex flex-1 flex-col">
                          <div className="mb-2 flex items-start justify-between">
                            <div className="flex-1 pr-2">
                              <h3 className="font-manrope text-[15px] leading-tight font-semibold text-[#161F2B]">
                                {item.productTitle}
                              </h3>
                              <p className="font-manrope text-[13px] text-[#777777]">
                                {item.variantTitle}
                              </p>
                            </div>

                            {/* Remove Button */}
                            <button
                              onClick={() => removeItem(item.variantId)}
                              className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[#F6F6F6]"
                              aria-label="Remove item"
                            >
                              <Trash2 className="h-4 w-4 text-[#777777]" strokeWidth={2} />
                            </button>
                          </div>

                          {/* Price */}
                          <div className="mb-3 flex items-center gap-2">
                            {hasDiscount && (
                              <span className="font-manrope text-[14px] text-[#777777] line-through">
                                {compareAtPrice}
                              </span>
                            )}
                            <span className="font-manrope text-[16px] font-bold text-[#161F2B]">
                              {currentPrice}
                            </span>
                            {hasDiscount && savings && (
                              <span className="font-manrope rounded-full bg-[#0268A0] px-2 py-0.5 text-[11px] font-bold text-white uppercase">
                                Save ${savings}
                              </span>
                            )}
                          </div>

                          {/* Quantity Selector */}
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 rounded-lg border border-[#E5E7EB]">
                              <button
                                onClick={() =>
                                  updateQuantity(item.variantId, Math.max(1, item.quantity - 1))
                                }
                                disabled={item.quantity <= 1}
                                className="flex h-8 w-8 items-center justify-center transition-colors hover:bg-[#F6F6F6] disabled:opacity-40"
                                aria-label="Decrease quantity"
                              >
                                <Minus className="h-3.5 w-3.5 text-[#161F2B]" strokeWidth={2.5} />
                              </button>

                              <span className="font-manrope min-w-[20px] text-center text-[15px] font-semibold text-[#161F2B]">
                                {item.quantity}
                              </span>

                              <button
                                onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                                className="flex h-8 w-8 items-center justify-center transition-colors hover:bg-[#F6F6F6]"
                                aria-label="Increase quantity"
                              >
                                <Plus className="h-3.5 w-3.5 text-[#161F2B]" strokeWidth={2.5} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Customer Review (Optional - can be dynamic) */}
                <div className="mt-6 rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] p-4">
                  <div className="mb-2 flex justify-center gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-3.5 w-3.5 text-[#FFB81C]">
                        ★
                      </div>
                    ))}
                  </div>
                  <p className="font-manrope mb-3 text-center text-[13px] leading-relaxed text-[#161F2B]">
                    &quot;...Our camper&apos;s queen hideaway had bars and dips everywhere, and this
                    gave full, comfortable support right away. It fit the frame, folded up
                    perfectly, and I slept great all night — I highly recommend it.&quot;
                  </p>
                  <p className="font-manrope flex items-center justify-center gap-1.5 text-center text-[13px] font-bold text-[#161F2B] uppercase">
                    Victor M.
                    <span className="h-3 w-3 rounded-full bg-[#0268A0] text-[9px] leading-[12px] text-white">
                      ✓
                    </span>
                  </p>
                </div>
              </div>
            ) : (
              // Empty State
              <div className="flex h-full flex-col px-6 py-8">
                {/* Empty State Message */}
                <div className="mb-8 text-center">
                  <h3 className="font-manrope mb-3 text-[24px] leading-tight font-semibold text-[#161F2B]">
                    Nothing here yet — but better sleep starts now.
                  </h3>
                  <p className="font-manrope text-[15px] leading-relaxed text-[#777777]">
                    Find the right support board to make your sleeper sofa feel more like a real
                    bed.
                  </p>
                </div>

                {/* Product Categories */}
                <div className="mb-8 space-y-3">
                  {productCategories.map((category) => (
                    <Link
                      key={category.title}
                      href={category.href}
                      onClick={onClose}
                      className="group flex items-center gap-4 rounded-xl border border-[#E5E7EB] bg-white p-4 transition-all hover:border-[#0268A0] hover:shadow-md"
                    >
                      {/* Category Image */}
                      <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-[#F6F6F6]">
                        <div className="flex h-full w-full items-center justify-center text-xs text-[#161F2B]/20">
                          Product
                        </div>
                      </div>

                      {/* Category Info */}
                      <div className="flex-1">
                        <h4 className="font-manrope mb-0.5 text-[16px] leading-tight font-semibold text-[#161F2B]">
                          {category.title}
                        </h4>
                        <p className="font-manrope text-[13px] text-[#777777]">
                          {category.description}
                        </p>
                      </div>

                      {/* Arrow */}
                      <ChevronRight className="h-5 w-5 text-[#777777] transition-transform group-hover:translate-x-1 group-hover:text-[#0268A0]" />
                    </Link>
                  ))}
                </div>

                {/* Shop All Button */}
                <Link
                  href="/collections/all"
                  onClick={onClose}
                  className="font-manrope w-full rounded-lg bg-[#0268A0] py-4 text-center text-[16px] font-semibold text-white transition-colors hover:bg-[#015580]"
                >
                  Shop All Products
                </Link>

                {/* Free Shipping Note */}
                <p className="font-manrope mt-4 text-center text-[13px] text-[#777777]">
                  Free shipping on all orders
                </p>
              </div>
            )}
          </div>

          {/* Footer - Checkout (Only show when cart has items) */}
          {hasItems && cart && (
            <div className="border-t border-[#E5E7EB] px-6 py-5">
              {/* Subtotal */}
              <div className="mb-4 flex items-center justify-between">
                <span className="font-manrope text-[16px] font-medium text-[#161F2B]">
                  Subtotal ({cart.itemCount} Item{cart.itemCount !== 1 ? 's' : ''})
                </span>
                <span className="font-manrope text-[24px] font-bold text-[#161F2B]">
                  {formatPrice(cart.subtotal.amount, cart.subtotal.currencyCode)}
                </span>
              </div>

              {/* Error Message */}
              {checkoutError && (
                <div className="mb-3 rounded-lg bg-red-50 px-4 py-3 text-center">
                  <p className="font-manrope text-[13px] text-red-600">{checkoutError}</p>
                </div>
              )}

              {/* Secure Checkout Button */}
              <button
                onClick={handleCheckout}
                disabled={isCheckingOut}
                className="font-manrope mb-3 flex w-full items-center justify-center gap-2 rounded-lg bg-[#0268A0] py-4 text-[16px] font-semibold text-white transition-colors hover:bg-[#015580] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCheckingOut ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" strokeWidth={2.5} />
                    Secure Checkout
                  </>
                )}
              </button>

              {/* Google Pay Button */}
              <button className="font-manrope flex w-full items-center justify-center gap-2 rounded-lg bg-black py-4 text-[16px] font-semibold text-white transition-colors hover:bg-black/90">
                Buy With <span className="font-bold">G</span> Pay
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
