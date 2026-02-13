'use client'

import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@cgk/ui'
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

import { formatDate, formatMoney, formatNumber } from '@/lib/format'
import { RFM_SEGMENT_INFO, type RfmSegmentType } from '@/lib/segments/types'

interface SegmentCustomer {
  id: string
  customerId: string
  email: string | null
  name?: string | null
  rfmScore?: number
  rScore?: number
  fScore?: number
  mScore?: number
  monetaryTotal?: number | null
  currency?: string
  lastOrderAt?: string | null
  cachedAt?: string
}

interface SegmentData {
  segmentId: string
  segmentType: 'shopify' | 'rfm'
  segmentName: string
  segmentDescription?: string
  segmentQuery?: string
  customers: SegmentCustomer[]
  totalCount: number
  page: number
  limit: number
  totalPages: number
  note?: string
}

export default function SegmentDetailPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const segmentId = params.id as string
  const segmentType = searchParams.get('type') || 'auto'

  const [segmentData, setSegmentData] = useState<SegmentData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)

  const fetchData = useCallback(async (page: number) => {
    setIsLoading(true)
    try {
      const res = await fetch(
        `/api/admin/segments/${segmentId}/customers?type=${segmentType}&page=${page}&limit=20`
      )
      if (res.ok) {
        const data = await res.json()
        setSegmentData(data)
        setCurrentPage(page)
      }
    } catch (error) {
      console.error('Failed to fetch segment customers:', error)
    } finally {
      setIsLoading(false)
    }
  }, [segmentId, segmentType])

  useEffect(() => {
    fetchData(1)
  }, [fetchData])

  const isRfmSegment = segmentData?.segmentType === 'rfm'
  const segmentInfo = isRfmSegment ? RFM_SEGMENT_INFO[segmentId as RfmSegmentType] : null

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/segments">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Segments
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              {isLoading ? (
                <div className="h-8 w-48 animate-pulse rounded bg-muted" />
              ) : (
                <div className="flex items-center gap-3">
                  <CardTitle className="text-2xl">
                    {segmentData?.segmentName || segmentId}
                  </CardTitle>
                  <Badge variant={isRfmSegment ? 'default' : 'secondary'}>
                    {isRfmSegment ? 'RFM' : 'Shopify'}
                  </Badge>
                </div>
              )}
              {segmentInfo && (
                <p className="text-muted-foreground">{segmentInfo.description}</p>
              )}
              {segmentData?.segmentQuery && (
                <p className="text-sm text-muted-foreground bg-muted px-3 py-1.5 rounded">
                  {segmentData.segmentQuery}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold">
                {isLoading ? '-' : formatNumber(segmentData?.totalCount || 0)}
              </p>
              <p className="text-sm text-muted-foreground">customers</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {segmentData?.note && (
            <div className="mb-4 rounded-lg bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-800">
              {segmentData.note}
            </div>
          )}

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : segmentData && segmentData.customers.length > 0 ? (
            <>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Customer</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
                      {isRfmSegment && (
                        <>
                          <th className="px-4 py-3 text-right font-medium text-muted-foreground">RFM Score</th>
                          <th className="px-4 py-3 text-center font-medium text-muted-foreground">R/F/M</th>
                          <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total Spent</th>
                          <th className="px-4 py-3 text-right font-medium text-muted-foreground">Last Order</th>
                        </>
                      )}
                      {!isRfmSegment && (
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">Cached</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {segmentData.customers.map((customer) => (
                      <tr key={customer.id} className="hover:bg-muted/50">
                        <td className="px-4 py-3">
                          <Link
                            href={`/admin/commerce/customers/${customer.customerId}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {customer.name || customer.customerId}
                          </Link>
                        </td>
                        <td className="px-4 py-3">{customer.email || '-'}</td>
                        {isRfmSegment && (
                          <>
                            <td className="px-4 py-3 text-right">
                              <Badge variant="outline" className="font-mono">
                                {customer.rfmScore}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="font-mono text-xs">
                                {customer.rScore}/{customer.fScore}/{customer.mScore}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              {customer.monetaryTotal !== null && customer.monetaryTotal !== undefined
                                ? formatMoney(customer.monetaryTotal * 100, customer.currency || 'USD')
                                : '-'}
                            </td>
                            <td className="px-4 py-3 text-right text-muted-foreground">
                              {customer.lastOrderAt ? formatDate(customer.lastOrderAt) : '-'}
                            </td>
                          </>
                        )}
                        {!isRfmSegment && (
                          <td className="px-4 py-3 text-right text-muted-foreground">
                            {customer.cachedAt ? formatDate(customer.cachedAt) : '-'}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {segmentData.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * segmentData.limit + 1} to{' '}
                    {Math.min(currentPage * segmentData.limit, segmentData.totalCount)} of{' '}
                    {segmentData.totalCount} customers
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchData(currentPage - 1)}
                      disabled={currentPage === 1 || isLoading}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground px-2">
                      Page {currentPage} of {segmentData.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchData(currentPage + 1)}
                      disabled={currentPage === segmentData.totalPages || isLoading}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No customers in this segment</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
