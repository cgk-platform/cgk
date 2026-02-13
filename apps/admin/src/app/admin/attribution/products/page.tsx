'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button, Card, CardContent, cn } from '@cgk-platform/ui'

import { useAttribution, ModelSelector, TimeRangePicker } from '@/components/attribution'
import type { ProductAttribution, ProductViewMode } from '@/lib/attribution'

const platformColors: Record<string, string> = {
  meta: '#3b82f6',
  google: '#22c55e',
  tiktok: '#ef4444',
  organic: '#8b5cf6',
  direct: '#6b7280',
}

function Scatterplot({
  products,
  roasBenchmark,
  cacBenchmark,
}: {
  products: ProductAttribution[]
  roasBenchmark: number
  cacBenchmark: number
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const padding = 40
  const width = 100
  const height = 100

  const maxRoasIndex = Math.max(...products.map((p) => p.roasIndex), 2)
  const maxCacIndex = Math.max(...products.map((p) => p.cacIndex), 2)
  const maxSpend = Math.max(...products.map((p) => p.spend), 1)

  return (
    <div className="relative h-96 border rounded-lg bg-muted/20">
      <svg className="w-full h-full" viewBox={`0 0 ${width + padding * 2} ${height + padding * 2}`}>
        {/* Quadrant lines */}
        <line
          x1={padding}
          y1={padding + height / 2}
          x2={padding + width}
          y2={padding + height / 2}
          stroke="#e5e7eb"
          strokeWidth="1"
          strokeDasharray="4"
        />
        <line
          x1={padding + width / 2}
          y1={padding}
          x2={padding + width / 2}
          y2={padding + height}
          stroke="#e5e7eb"
          strokeWidth="1"
          strokeDasharray="4"
        />

        {/* Quadrant labels */}
        <text x={padding + 10} y={padding + 15} className="text-[6px] fill-muted-foreground">Question Marks</text>
        <text x={padding + width - 30} y={padding + 15} className="text-[6px] fill-muted-foreground">Stars</text>
        <text x={padding + 10} y={padding + height - 5} className="text-[6px] fill-muted-foreground">Dogs</text>
        <text x={padding + width - 40} y={padding + height - 5} className="text-[6px] fill-muted-foreground">Cash Cows</text>

        {/* Data points */}
        {products.map((product) => {
          const x = padding + (product.roasIndex / maxRoasIndex) * width
          const y = padding + height - (product.cacIndex / maxCacIndex) * height
          const radius = Math.max(3, Math.min(12, (product.spend / maxSpend) * 10 + 3))
          const color = platformColors[product.platform || 'direct'] || platformColors.direct

          return (
            <g key={product.id}>
              <circle
                cx={x}
                cy={y}
                r={radius}
                fill={color}
                fillOpacity={0.7}
                stroke={hoveredId === product.id ? '#000' : 'transparent'}
                strokeWidth={1}
                className="cursor-pointer transition-all"
                onMouseEnter={() => setHoveredId(product.id)}
                onMouseLeave={() => setHoveredId(null)}
              />
            </g>
          )
        })}

        {/* Axes labels */}
        <text x={padding + width / 2} y={padding + height + 30} textAnchor="middle" className="text-[8px] fill-muted-foreground">
          ROAS Index (vs {roasBenchmark.toFixed(1)}x benchmark)
        </text>
        <text
          x={15}
          y={padding + height / 2}
          textAnchor="middle"
          transform={`rotate(-90, 15, ${padding + height / 2})`}
          className="text-[8px] fill-muted-foreground"
        >
          CAC Index (vs ${cacBenchmark} benchmark)
        </text>
      </svg>

      {/* Tooltip */}
      {hoveredId && (
        <div className="absolute top-4 right-4 bg-white shadow-lg rounded-lg p-3 text-sm border max-w-xs">
          {products
            .filter((p) => p.id === hoveredId)
            .map((p) => (
              <div key={p.id}>
                <p className="font-medium">{p.name}</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-xs">
                  <span className="text-muted-foreground">Revenue:</span>
                  <span>${p.revenue.toLocaleString()}</span>
                  <span className="text-muted-foreground">ROAS:</span>
                  <span>{p.roas.toFixed(2)}x</span>
                  <span className="text-muted-foreground">CAC:</span>
                  <span>${p.cac.toFixed(2)}</span>
                  <span className="text-muted-foreground">Conversions:</span>
                  <span>{p.conversions}</span>
                  <span className="text-muted-foreground">New Customer %:</span>
                  <span>{p.newCustomerPercent.toFixed(1)}%</span>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 flex flex-wrap gap-3 text-xs">
        {Object.entries(platformColors).map(([platform, color]) => (
          <div key={platform} className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            <span className="capitalize">{platform}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ProductsPage() {
  const { model, window, startDate, endDate } = useAttribution()
  const [products, setProducts] = useState<ProductAttribution[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ProductViewMode>('product')
  const [roasBenchmark, setRoasBenchmark] = useState(3.0)
  const [cacBenchmark, setCacBenchmark] = useState(30)
  const [sortBy, setSortBy] = useState<'revenue' | 'roas' | 'cac'>('revenue')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [search, setSearch] = useState('')

  const fetchProducts = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        model,
        window,
        startDate,
        endDate,
        viewMode,
        roasBenchmark: roasBenchmark.toString(),
        cacBenchmark: cacBenchmark.toString(),
      })
      const response = await fetch(`/api/admin/attribution/products?${params}`)
      const data = await response.json()
      setProducts(data.products || [])
    } catch (error) {
      console.error('Failed to fetch products:', error)
    } finally {
      setIsLoading(false)
    }
  }, [model, window, startDate, endDate, viewMode, roasBenchmark, cacBenchmark])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const filteredProducts = products
    .filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const aVal = a[sortBy]
      const bVal = b[sortBy]
      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal
    })

  const handleExportCsv = () => {
    const headers = ['Name', 'Platform', 'Spend', 'Revenue', 'ROAS', 'CAC', 'Conversions', 'New Customer %', 'ROAS Index', 'CAC Index']
    const rows = filteredProducts.map((p) => [
      p.name,
      p.platform || '',
      p.spend,
      p.revenue,
      p.roas,
      p.cac,
      p.conversions,
      p.newCustomerPercent,
      p.roasIndex,
      p.cacIndex,
    ])

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `products-${viewMode}-${startDate}-${endDate}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <ModelSelector />
          <TimeRangePicker />
        </div>
        <Button variant="outline" onClick={handleExportCsv}>
          Export CSV
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {(['product', 'platform', 'campaign', 'ad'] as ProductViewMode[]).map((mode) => (
            <Button
              key={mode}
              variant={viewMode === mode ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode(mode)}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <span className="text-sm text-muted-foreground">ROAS Benchmark:</span>
          <input
            type="number"
            value={roasBenchmark}
            onChange={(e) => setRoasBenchmark(parseFloat(e.target.value) || 3)}
            step="0.5"
            min="0"
            className="w-20 px-2 py-1 text-sm border rounded"
          />
          <span className="text-sm text-muted-foreground ml-4">CAC Benchmark:</span>
          <input
            type="number"
            value={cacBenchmark}
            onChange={(e) => setCacBenchmark(parseFloat(e.target.value) || 30)}
            step="5"
            min="0"
            className="w-20 px-2 py-1 text-sm border rounded"
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <h3 className="text-sm font-medium mb-4">Performance Scatterplot</h3>
          {isLoading ? (
            <div className="h-96 bg-muted animate-pulse rounded" />
          ) : (
            <Scatterplot products={filteredProducts} roasBenchmark={roasBenchmark} cacBenchmark={cacBenchmark} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium">Metrics Table</h3>
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-3 py-1.5 text-sm border rounded-md w-64"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-3 text-left font-medium">Name</th>
                  {viewMode !== 'product' && <th className="p-3 text-left font-medium">Platform</th>}
                  <th
                    className="p-3 text-right font-medium cursor-pointer hover:bg-muted"
                    onClick={() => {
                      if (sortBy === 'revenue') {
                        setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')
                      } else {
                        setSortBy('revenue')
                        setSortOrder('desc')
                      }
                    }}
                  >
                    Revenue {sortBy === 'revenue' && (sortOrder === 'desc' ? '\u2193' : '\u2191')}
                  </th>
                  <th
                    className="p-3 text-right font-medium cursor-pointer hover:bg-muted"
                    onClick={() => {
                      if (sortBy === 'roas') {
                        setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')
                      } else {
                        setSortBy('roas')
                        setSortOrder('desc')
                      }
                    }}
                  >
                    ROAS {sortBy === 'roas' && (sortOrder === 'desc' ? '\u2193' : '\u2191')}
                  </th>
                  <th
                    className="p-3 text-right font-medium cursor-pointer hover:bg-muted"
                    onClick={() => {
                      if (sortBy === 'cac') {
                        setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')
                      } else {
                        setSortBy('cac')
                        setSortOrder('asc')
                      }
                    }}
                  >
                    CAC {sortBy === 'cac' && (sortOrder === 'desc' ? '\u2193' : '\u2191')}
                  </th>
                  <th className="p-3 text-right font-medium">Conversions</th>
                  <th className="p-3 text-right font-medium">New Customer %</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      <td colSpan={7} className="p-3">
                        <div className="h-6 bg-muted animate-pulse rounded" />
                      </td>
                    </tr>
                  ))
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-muted-foreground">
                      No product data found
                    </td>
                  </tr>
                ) : (
                  filteredProducts.slice(0, 50).map((product) => (
                    <tr key={product.id} className="border-b hover:bg-muted/50">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {product.imageUrl && (
                            <img
                              src={product.imageUrl}
                              alt=""
                              className="w-8 h-8 rounded object-cover"
                            />
                          )}
                          <span className="font-medium">{product.name}</span>
                        </div>
                      </td>
                      {viewMode !== 'product' && (
                        <td className="p-3">
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium capitalize"
                            style={{
                              backgroundColor: `${platformColors[product.platform || 'direct']}20`,
                              color: platformColors[product.platform || 'direct'],
                            }}
                          >
                            {product.platform}
                          </span>
                        </td>
                      )}
                      <td className="p-3 text-right">${product.revenue.toLocaleString()}</td>
                      <td className="p-3 text-right">
                        <span className={cn(product.roas >= roasBenchmark ? 'text-green-600' : 'text-red-600')}>
                          {product.roas.toFixed(2)}x
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <span className={cn(product.cac <= cacBenchmark ? 'text-green-600' : 'text-red-600')}>
                          ${product.cac.toFixed(2)}
                        </span>
                      </td>
                      <td className="p-3 text-right">{product.conversions}</td>
                      <td className="p-3 text-right">{product.newCustomerPercent.toFixed(1)}%</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
