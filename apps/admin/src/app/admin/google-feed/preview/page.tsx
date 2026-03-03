'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

interface GoogleShoppingProduct {
  id: string
  title: string
  description: string
  link: string
  image_link: string
  availability: string
  price: string
  brand: string
  gtin?: string
  mpn?: string
  google_product_category?: string | number
  product_type?: string
  condition?: string
  sale_price?: string
  additional_image_link?: string[]
}

interface PreviewResponse {
  format: 'xml' | 'json' | 'table'
  products: GoogleShoppingProduct[]
  totalCount: number
  sampleSize: number
  lastPublished: string | null
}

type ViewFormat = 'table' | 'xml' | 'json'

export default function GoogleFeedPreviewPage() {
  const [data, setData] = useState<PreviewResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [format, setFormat] = useState<ViewFormat>('table')
  const [limit, setLimit] = useState(10)
  const [rawXml, setRawXml] = useState('')
  const [rawJson, setRawJson] = useState('')

  useEffect(() => {
    async function loadPreview() {
      setLoading(true)
      try {
        const res = await fetch(`/api/admin/google-feed/preview?format=${format}&limit=${limit}`)
        if (res.ok) {
          const previewData = await res.json()
          setData(previewData)

          // Load raw formats for display
          if (format === 'xml') {
            const xmlRes = await fetch(`/api/admin/google-feed/download?format=xml`)
            if (xmlRes.ok) {
              // Get first portion of XML
              const text = await xmlRes.text()
              setRawXml(text.slice(0, 10000) + (text.length > 10000 ? '\n... (truncated)' : ''))
            }
          } else if (format === 'json') {
            const jsonRes = await fetch(`/api/admin/google-feed/download?format=json`)
            if (jsonRes.ok) {
              const text = await jsonRes.text()
              setRawJson(text.slice(0, 10000) + (text.length > 10000 ? '\n... (truncated)' : ''))
            }
          }
        }
      } catch (error) {
        console.error('Failed to load preview:', error)
      } finally {
        setLoading(false)
      }
    }
    loadPreview()
  }, [format, limit])

  const handleDownload = async (downloadFormat: 'xml' | 'json') => {
    const res = await fetch(`/api/admin/google-feed/download?format=${downloadFormat}`)
    if (res.ok) {
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `google-feed.${downloadFormat}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }

  const handleCopyToClipboard = () => {
    const content = format === 'xml' ? rawXml : rawJson
    navigator.clipboard.writeText(content)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Feed Preview</h1>
          <p className="text-muted-foreground">
            Preview your feed before publishing to Google
          </p>
        </div>
        <Link
          href="/admin/google-feed"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Back to Overview
        </Link>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Format Toggle */}
          <div className="flex rounded-md border">
            {(['table', 'xml', 'json'] as ViewFormat[]).map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={`px-3 py-1.5 text-sm font-medium uppercase ${
                  format === f
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                } ${f === 'table' ? 'rounded-l-md' : f === 'json' ? 'rounded-r-md' : ''}`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Sample Size */}
          <select
            value={limit}
            onChange={(e) => setLimit(parseInt(e.target.value, 10))}
            className="rounded-md border px-3 py-1.5 text-sm"
          >
            <option value={5}>5 products</option>
            <option value={10}>10 products</option>
            <option value={25}>25 products</option>
            <option value={50}>50 products</option>
          </select>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => handleDownload('xml')}
            className="rounded-md bg-secondary px-3 py-1.5 text-sm hover:bg-secondary/80"
          >
            Download XML
          </button>
          <button
            onClick={() => handleDownload('json')}
            className="rounded-md bg-secondary px-3 py-1.5 text-sm hover:bg-secondary/80"
          >
            Download JSON
          </button>
          {format !== 'table' && (
            <button
              onClick={handleCopyToClipboard}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Copy to Clipboard
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      {data && (
        <div className="flex gap-6 text-sm">
          <div>
            <span className="text-muted-foreground">Total Products:</span>{' '}
            <span className="font-medium">{data.totalCount}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Sample Size:</span>{' '}
            <span className="font-medium">{data.sampleSize}</span>
          </div>
          {data.lastPublished && (
            <div>
              <span className="text-muted-foreground">Last Published:</span>{' '}
              <span className="font-medium">{new Date(data.lastPublished).toLocaleString()}</span>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="animate-pulse rounded-lg border p-8">
          <div className="h-64 bg-muted" />
        </div>
      ) : format === 'table' ? (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">ID</th>
                <th className="px-4 py-3 text-left font-medium">Title</th>
                <th className="px-4 py-3 text-left font-medium">Brand</th>
                <th className="px-4 py-3 text-left font-medium">Price</th>
                <th className="px-4 py-3 text-left font-medium">Availability</th>
                <th className="px-4 py-3 text-left font-medium">GTIN/MPN</th>
                <th className="px-4 py-3 text-left font-medium">Category</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data?.products.map((product) => (
                <tr key={product.id} className="hover:bg-muted/50">
                  <td className="px-4 py-3 font-mono text-xs">{product.id}</td>
                  <td className="max-w-xs truncate px-4 py-3">{product.title}</td>
                  <td className="px-4 py-3">{product.brand}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {product.price}
                    {product.sale_price && (
                      <span className="ml-1 text-green-600">({product.sale_price})</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        product.availability === 'in_stock'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {product.availability.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {product.gtin || product.mpn || '-'}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {product.google_product_category || product.product_type || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-lg border bg-muted/30">
          <pre className="max-h-[600px] overflow-auto p-4 text-xs">
            <code>{format === 'xml' ? rawXml : rawJson}</code>
          </pre>
        </div>
      )}

      {/* Validation Info */}
      <div className="rounded-lg border p-4">
        <h3 className="font-medium">Feed Validation</h3>
        <div className="mt-2 grid gap-4 text-sm md:grid-cols-3">
          <div className="rounded-md bg-green-50 p-3">
            <p className="font-medium text-green-800">Required Fields</p>
            <ul className="mt-1 text-green-700">
              <li>id, title, description</li>
              <li>link, image_link</li>
              <li>availability, price</li>
            </ul>
          </div>
          <div className="rounded-md bg-yellow-50 p-3">
            <p className="font-medium text-yellow-800">Recommended Fields</p>
            <ul className="mt-1 text-yellow-700">
              <li>brand, gtin, mpn</li>
              <li>google_product_category</li>
              <li>product_type, condition</li>
            </ul>
          </div>
          <div className="rounded-md bg-blue-50 p-3">
            <p className="font-medium text-blue-800">Optional Fields</p>
            <ul className="mt-1 text-blue-700">
              <li>sale_price, additional_image_link</li>
              <li>color, size, material</li>
              <li>custom_label_0-4</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
