'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Button,
  Card,
  CardContent,
  Input,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@cgk-platform/ui'
import { Check, Pencil, X } from 'lucide-react'

interface ProductCost {
  id: string
  title: string
  vendor: string | null
  product_type: string | null
  cost_per_item: number
  price: string | null
}

export default function ProductCostsPage() {
  const [products, setProducts] = useState<ProductCost[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/products/costs')
      if (res.ok) {
        const data = await res.json() as { products: ProductCost[] }
        setProducts(data.products)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchProducts()
  }, [fetchProducts])

  function startEdit(product: ProductCost) {
    setEditingId(product.id)
    setEditValue(String(product.cost_per_item))
  }

  function cancelEdit() {
    setEditingId(null)
    setEditValue('')
  }

  async function saveEdit(productId: string) {
    const costPerItem = parseFloat(editValue)
    if (isNaN(costPerItem) || costPerItem < 0) return

    setSaving(true)
    try {
      const res = await fetch('/api/admin/products/costs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, costPerItem }),
      })
      if (res.ok) {
        setProducts((prev) =>
          prev.map((p) => (p.id === productId ? { ...p, cost_per_item: costPerItem } : p))
        )
        cancelEdit()
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Product Costs</h1>
        <p className="text-muted-foreground">
          Set per-product cost overrides for COGS calculations.
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Spinner className="h-6 w-6 text-muted-foreground" />
            </div>
          ) : products.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              No products found. Sync Shopify products first.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Sale Price</TableHead>
                  <TableHead className="text-right">COGS ($)</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.title}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {product.vendor ?? '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {product.product_type ?? '—'}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {product.price ? `$${product.price}` : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      {editingId === product.id ? (
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="ml-auto w-24 text-right"
                          autoFocus
                        />
                      ) : (
                        <span>${product.cost_per_item.toFixed(2)}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {editingId === product.id ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => void saveEdit(product.id)}
                              disabled={saving}
                              className="h-8 w-8 p-0"
                            >
                              <Check className="h-4 w-4 text-success" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={cancelEdit}
                              className="h-8 w-8 p-0"
                            >
                              <X className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEdit(product)}
                            className="h-8 w-8 p-0"
                          >
                            <Pencil className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
