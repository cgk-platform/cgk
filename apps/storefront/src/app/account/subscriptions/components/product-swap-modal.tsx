'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Alert, AlertDescription, Button, cn, Spinner } from '@cgk/ui'
import { getSwappableProducts, swapItem } from '@/lib/subscriptions/api'
import { formatPrice } from '@/lib/subscriptions/format'
import type { SubscriptionItem, SwappableProduct } from '@/lib/subscriptions/types'
import { Modal, ModalContent, ModalFooter, ModalHeader, ModalTitle, ModalDescription } from './modals'

interface ProductSwapModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  subscriptionId: string
  item: SubscriptionItem
}

/**
 * Product swap modal
 *
 * Allows customers to swap a product in their subscription
 * for another compatible product.
 */
export function ProductSwapModal({
  open,
  onOpenChange,
  subscriptionId,
  item,
}: ProductSwapModalProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState<SwappableProduct[]>([])
  const [selectedProduct, setSelectedProduct] = useState<SwappableProduct | null>(null)
  const [swapping, setSwapping] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load swappable products
  useEffect(() => {
    if (!open) return

    async function loadProducts() {
      setLoading(true)
      setError(null)
      try {
        const data = await getSwappableProducts(subscriptionId, item.id)
        setProducts(data)
      } catch {
        setError('Failed to load available products')
      } finally {
        setLoading(false)
      }
    }

    loadProducts()
  }, [open, subscriptionId, item.id])

  const handleSwap = useCallback(async () => {
    if (!selectedProduct) return

    setSwapping(true)
    setError(null)

    try {
      const result = await swapItem(subscriptionId, item.id, selectedProduct.variantId)
      if (result.success) {
        onOpenChange(false)
        startTransition(() => {
          router.refresh()
        })
      } else {
        setError(result.error || 'Failed to swap product')
      }
    } catch {
      setError('Failed to swap product')
    } finally {
      setSwapping(false)
    }
  }, [subscriptionId, item.id, selectedProduct, onOpenChange, router])

  return (
    <Modal open={open} onOpenChange={onOpenChange} className="max-w-lg">
      <ModalHeader onClose={() => onOpenChange(false)}>
        <ModalTitle>Swap Product</ModalTitle>
        <ModalDescription>
          Replace <strong>{item.title}</strong> with another product from your subscription options.
        </ModalDescription>
      </ModalHeader>

      <ModalContent className="max-h-[60vh] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner size="default" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              No alternative products available for swap.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Error Message */}
            {error && (
              <Alert variant="error">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Current Product */}
            <div className="mb-4 pb-4 border-b">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                Currently Selected
              </p>
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 rounded-lg border bg-muted/30 overflow-hidden flex-shrink-0">
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.title}
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                      {item.title.slice(0, 2)}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.title}</p>
                  {item.variantTitle && (
                    <p className="text-xs text-muted-foreground">{item.variantTitle}</p>
                  )}
                </div>
                <p className="text-sm font-medium">
                  {formatPrice(item.priceCents)}
                </p>
              </div>
            </div>

            {/* Available Products */}
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
              Swap To
            </p>
            {products.map((product) => {
              const isSelected = selectedProduct?.variantId === product.variantId
              const priceDiff = product.priceCents - item.priceCents

              return (
                <button
                  key={product.variantId}
                  onClick={() => product.isAvailable && setSelectedProduct(product)}
                  disabled={!product.isAvailable || swapping}
                  className={cn(
                    'w-full text-left p-3 rounded-lg border-2 transition-all',
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : product.isAvailable
                        ? 'border-border hover:border-primary/50'
                        : 'border-border opacity-50 cursor-not-allowed',
                    swapping && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <div className="flex items-center gap-3">
                    {/* Product Image */}
                    <div className="relative w-14 h-14 rounded-lg border bg-muted/30 overflow-hidden flex-shrink-0">
                      {product.imageUrl ? (
                        <Image
                          src={product.imageUrl}
                          alt={product.title}
                          fill
                          className="object-cover"
                          sizes="56px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                          {product.title.slice(0, 2)}
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{product.title}</p>
                      {product.variantTitle && (
                        <p className="text-xs text-muted-foreground">{product.variantTitle}</p>
                      )}
                      {!product.isAvailable && (
                        <p className="text-xs text-destructive mt-1">Out of stock</p>
                      )}
                    </div>

                    {/* Price */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-medium">
                        {formatPrice(product.priceCents)}
                      </p>
                      {priceDiff !== 0 && (
                        <p className={cn(
                          'text-xs',
                          priceDiff > 0 ? 'text-amber-600' : 'text-emerald-600'
                        )}>
                          {priceDiff > 0 ? '+' : ''}{formatPrice(priceDiff)}
                        </p>
                      )}
                    </div>

                    {/* Selection Indicator */}
                    {isSelected && (
                      <div className="flex-shrink-0">
                        <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </ModalContent>

      <ModalFooter>
        <Button
          variant="ghost"
          onClick={() => onOpenChange(false)}
          disabled={swapping}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSwap}
          disabled={swapping || !selectedProduct}
        >
          {swapping ? (
            <>
              <Spinner size="sm" className="mr-2" />
              Swapping...
            </>
          ) : (
            'Swap Product'
          )}
        </Button>
      </ModalFooter>
    </Modal>
  )
}
