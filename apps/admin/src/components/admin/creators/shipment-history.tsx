'use client'

import { useCallback, useEffect, useState } from 'react'
import { ExternalLink, Package, RefreshCw } from 'lucide-react'

import { Button, Card, CardContent } from '@cgk/ui'

import type { ProductShipment } from '../../../lib/creators/lifecycle-types'
import { getTrackingUrl } from '../../../lib/creators/lifecycle-types'

import { ShipmentBadge } from './shipment-badge'

interface ShipmentHistoryProps {
  creatorId: string
  onSendProduct?: () => void
}

export function ShipmentHistory({ creatorId, onSendProduct }: ShipmentHistoryProps) {
  const [shipments, setShipments] = useState<ProductShipment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadShipments = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/admin/creators/${creatorId}/shipments`)
      if (!res.ok) throw new Error('Failed to load shipments')
      const data = await res.json()
      setShipments(data.shipments)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [creatorId])

  useEffect(() => {
    loadShipments()
  }, [loadShipments])

  async function syncShipment(shipmentId: string) {
    try {
      await fetch(`/api/admin/creators/${creatorId}/shipments/${shipmentId}/sync`, {
        method: 'POST',
      })
      loadShipments()
    } catch {
      // Silent fail - user can retry
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={loadShipments}>
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex items-center justify-between border-b p-4">
          <h3 className="font-medium">Product Shipments</h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadShipments}>
              <RefreshCw className="mr-1 h-3 w-3" />
              Refresh
            </Button>
            {onSendProduct && (
              <Button size="sm" onClick={onSendProduct}>
                <Package className="mr-1 h-3 w-3" />
                Send Product
              </Button>
            )}
          </div>
        </div>

        {shipments.length === 0 ? (
          <div className="py-8 text-center">
            <Package className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">No products sent yet</p>
            {onSendProduct && (
              <Button variant="outline" size="sm" className="mt-3" onClick={onSendProduct}>
                Send First Product
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y">
            {shipments.map((shipment) => (
              <div key={shipment.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <ShipmentBadge
                        status={shipment.status}
                        trackingNumber={shipment.trackingNumber}
                        carrier={shipment.carrier}
                      />
                      {shipment.shopifyOrderNumber && (
                        <span className="text-xs text-muted-foreground">
                          Order #{shipment.shopifyOrderNumber}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Created {formatDate(shipment.createdAt)}
                      {shipment.shippedAt && ` / Shipped ${formatDate(shipment.shippedAt)}`}
                      {shipment.deliveredAt && ` / Delivered ${formatDate(shipment.deliveredAt)}`}
                    </div>
                  </div>

                  <div className="flex gap-1">
                    {shipment.trackingNumber && shipment.carrier && (
                      <a
                        href={getTrackingUrl(shipment.carrier, shipment.trackingNumber)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </a>
                    )}
                    {(shipment.status === 'ordered' || shipment.status === 'shipped') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => syncShipment(shipment.id)}
                      >
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Products list */}
                <div className="mt-3 space-y-1">
                  {shipment.products.map((product, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <div className="h-6 w-6 shrink-0 overflow-hidden rounded bg-muted">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Package className="h-3 w-3 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <span>{product.title}</span>
                      <span className="text-muted-foreground">x{product.quantity}</span>
                    </div>
                  ))}
                </div>

                {shipment.notes && (
                  <p className="mt-2 text-xs text-muted-foreground">Note: {shipment.notes}</p>
                )}

                {shipment.errorMessage && (
                  <p className="mt-2 text-xs text-destructive">Error: {shipment.errorMessage}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
