'use client'

import { Badge } from '@cgk-platform/ui'
import { ChevronDown, ChevronRight, ExternalLink, Package } from 'lucide-react'
import { useState } from 'react'

import { AbandonedCheckoutStatusBadge } from '@/components/commerce/status-badge'
import { formatDateTime, formatMoney } from '@/lib/format'
import type { AbandonedCheckout } from '@/lib/abandoned-checkouts/types'
import { CheckoutActions } from './checkout-actions'

interface ExpandableRowProps {
  checkout: AbandonedCheckout
}

export function ExpandableRow({ checkout }: ExpandableRowProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const itemCount = checkout.lineItems.reduce((sum, item) => sum + item.quantity, 0)
  const isHighValue = checkout.cartTotalCents >= 10000 // $100+

  return (
    <>
      <tr
        className={`hover:bg-muted/50 ${isHighValue && checkout.status === 'abandoned' ? 'bg-yellow-50/50 dark:bg-yellow-950/20' : ''}`}
      >
        <td className="px-4 py-3">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex h-6 w-6 items-center justify-center rounded hover:bg-muted"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        </td>
        <td className="px-4 py-3">
          <div>
            <p className="font-medium">
              {checkout.customerName || checkout.customerEmail || 'Guest'}
            </p>
            {checkout.customerEmail && checkout.customerName && (
              <p className="text-xs text-muted-foreground">{checkout.customerEmail}</p>
            )}
          </div>
        </td>
        <td className="px-4 py-3">
          <span className={`font-medium ${isHighValue ? 'text-yellow-600 dark:text-yellow-400' : ''}`}>
            {formatMoney(checkout.cartTotalCents, checkout.currencyCode)}
          </span>
          {isHighValue && (
            <Badge variant="warning" className="ml-2">
              High Value
            </Badge>
          )}
        </td>
        <td className="px-4 py-3">
          <span className="flex items-center gap-1">
            <Package className="h-4 w-4 text-muted-foreground" />
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </span>
        </td>
        <td className="px-4 py-3">
          <AbandonedCheckoutStatusBadge status={checkout.status} />
        </td>
        <td className="px-4 py-3 text-muted-foreground">
          {formatDateTime(checkout.abandonedAt)}
        </td>
        <td className="px-4 py-3">
          <span className="text-sm">
            {checkout.recoveryEmailCount}/{checkout.maxRecoveryEmails}
          </span>
        </td>
        <td className="px-4 py-3 text-right">
          <CheckoutActions checkout={checkout} />
        </td>
      </tr>

      {isExpanded && (
        <tr className="bg-muted/30">
          <td colSpan={8} className="px-4 py-4">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Line Items */}
              <div>
                <h4 className="mb-3 text-sm font-medium">Cart Items</h4>
                <div className="space-y-2">
                  {checkout.lineItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 rounded-md border bg-background p-2"
                    >
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className="h-12 w-12 rounded-md object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-md bg-muted">
                          <Package className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item.title}</p>
                        {item.variantTitle && (
                          <p className="text-xs text-muted-foreground">{item.variantTitle}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Qty: {item.quantity} x {formatMoney(item.price, checkout.currencyCode)}
                        </p>
                      </div>
                      <p className="text-sm font-medium">
                        {formatMoney(item.price * item.quantity, checkout.currencyCode)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Customer & Shipping Info */}
              <div className="space-y-4">
                {checkout.shippingAddress && (
                  <div>
                    <h4 className="mb-2 text-sm font-medium">Shipping Address</h4>
                    <div className="rounded-md border bg-background p-3 text-sm">
                      {checkout.shippingAddress.firstName && (
                        <p>
                          {checkout.shippingAddress.firstName} {checkout.shippingAddress.lastName}
                        </p>
                      )}
                      {checkout.shippingAddress.address1 && (
                        <p className="text-muted-foreground">{checkout.shippingAddress.address1}</p>
                      )}
                      {checkout.shippingAddress.address2 && (
                        <p className="text-muted-foreground">{checkout.shippingAddress.address2}</p>
                      )}
                      {checkout.shippingAddress.city && (
                        <p className="text-muted-foreground">
                          {checkout.shippingAddress.city}, {checkout.shippingAddress.provinceCode}{' '}
                          {checkout.shippingAddress.zip}
                        </p>
                      )}
                      {checkout.shippingAddress.country && (
                        <p className="text-muted-foreground">{checkout.shippingAddress.country}</p>
                      )}
                    </div>
                  </div>
                )}

                {checkout.recoveryUrl && (
                  <div>
                    <h4 className="mb-2 text-sm font-medium">Recovery Link</h4>
                    <a
                      href={checkout.recoveryUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Open recovery checkout
                    </a>
                  </div>
                )}

                {checkout.lastEmailSentAt && (
                  <div>
                    <h4 className="mb-2 text-sm font-medium">Last Email Sent</h4>
                    <p className="text-sm text-muted-foreground">
                      {formatDateTime(checkout.lastEmailSentAt)}
                    </p>
                  </div>
                )}

                {checkout.recoveredAt && (
                  <div>
                    <h4 className="mb-2 text-sm font-medium">Recovered</h4>
                    <p className="text-sm text-muted-foreground">
                      {formatDateTime(checkout.recoveredAt)}
                    </p>
                    {checkout.recoveredOrderId && (
                      <p className="text-sm">
                        Order: <span className="font-mono">{checkout.recoveredOrderId}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
