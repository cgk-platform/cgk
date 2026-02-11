'use client'

import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@cgk/ui'
import { ArrowLeft, Download, Filter, Eye, X } from 'lucide-react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'

import { Pagination } from '@/components/commerce/pagination'
import { formatDate } from '@/lib/format'
import type { Survey, SurveyResponse, SurveyAnswer } from '@/lib/surveys'

export default function ResponsesPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const surveyId = params.id as string

  const [survey, setSurvey] = useState<Survey | null>(null)
  const [responses, setResponses] = useState<SurveyResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedResponse, setSelectedResponse] = useState<SurveyResponse | null>(null)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    totalCount: 0,
    totalPages: 0,
  })

  const page = parseInt(searchParams.get('page') || '1', 10)
  const isComplete = searchParams.get('isComplete')
  const attributionSource = searchParams.get('attributionSource')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [surveyRes, responsesRes] = await Promise.all([
        fetch(`/api/admin/surveys/${surveyId}`),
        fetch(
          `/api/admin/surveys/${surveyId}/responses?` +
            new URLSearchParams({
              page: page.toString(),
              limit: '20',
              ...(isComplete && { isComplete }),
              ...(attributionSource && { attributionSource }),
            }),
        ),
      ])

      const [surveyData, responsesData] = await Promise.all([
        surveyRes.json(),
        responsesRes.json(),
      ])

      if (surveyRes.ok) setSurvey(surveyData.survey)
      if (responsesRes.ok) {
        setResponses(responsesData.responses)
        setPagination(responsesData.pagination)
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }, [surveyId, page, isComplete, attributionSource])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const fetchResponseDetail = async (responseId: string) => {
    try {
      const response = await fetch(
        `/api/admin/surveys/${surveyId}/responses?responseId=${responseId}`,
      )
      const data = await response.json()
      if (response.ok) {
        setSelectedResponse(data.response)
      }
    } catch (error) {
      console.error('Failed to fetch response detail:', error)
    }
  }

  const handleExport = async () => {
    try {
      const allResponses: SurveyResponse[] = []
      let currentPage = 1
      let hasMore = true

      while (hasMore) {
        const response = await fetch(
          `/api/admin/surveys/${surveyId}/responses?page=${currentPage}&limit=100`,
        )
        const data = await response.json()

        if (response.ok) {
          allResponses.push(...data.responses)
          hasMore = data.pagination.page < data.pagination.totalPages
          currentPage++
        } else {
          hasMore = false
        }
      }

      // Convert to CSV
      const headers = [
        'Response ID',
        'Order ID',
        'Customer Email',
        'Started At',
        'Completed At',
        'Is Complete',
        'NPS Score',
        'Attribution Source',
      ]

      const rows = allResponses.map((r) => [
        r.id,
        r.order_id || '',
        r.customer_email || '',
        r.started_at,
        r.completed_at || '',
        r.is_complete ? 'Yes' : 'No',
        r.nps_score?.toString() || '',
        r.attribution_source || '',
      ])

      const csv = [
        headers.join(','),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
      ].join('\n')

      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `survey-responses-${surveyId}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to export responses:', error)
    }
  }

  if (loading) {
    return <ResponsesSkeleton />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/admin/surveys/${surveyId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Responses</h1>
            <p className="text-muted-foreground">{survey?.name}</p>
          </div>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          <Link
            href={`/admin/surveys/${surveyId}/responses`}
            className={`rounded-md px-3 py-1.5 text-sm ${
              !isComplete
                ? 'bg-background font-medium shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            All
          </Link>
          <Link
            href={`/admin/surveys/${surveyId}/responses?isComplete=true`}
            className={`rounded-md px-3 py-1.5 text-sm ${
              isComplete === 'true'
                ? 'bg-background font-medium shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Completed
          </Link>
          <Link
            href={`/admin/surveys/${surveyId}/responses?isComplete=false`}
            className={`rounded-md px-3 py-1.5 text-sm ${
              isComplete === 'false'
                ? 'bg-background font-medium shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Incomplete
          </Link>
        </div>
      </div>

      {responses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Filter className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium">No responses yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Responses will appear here once customers complete the survey
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">Response</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Customer</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Order</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Attribution</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">NPS</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {responses.map((response) => (
                  <tr key={response.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Badge
                          className={
                            response.is_complete
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }
                        >
                          {response.is_complete ? 'Complete' : 'Partial'}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {response.customer_email || 'Anonymous'}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {response.order_id || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {response.attribution_source ? (
                        <Badge variant="outline">{response.attribution_source}</Badge>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {response.nps_score !== null ? (
                        <span
                          className={
                            response.nps_score >= 9
                              ? 'text-green-600 font-medium'
                              : response.nps_score >= 7
                                ? 'text-yellow-600 font-medium'
                                : 'text-red-600 font-medium'
                          }
                        >
                          {response.nps_score}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {formatDate(response.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => fetchResponseDetail(response.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            totalCount={pagination.totalCount}
            limit={pagination.limit}
            basePath={`/admin/surveys/${surveyId}/responses`}
            currentFilters={{ isComplete: isComplete || undefined }}
          />
        </>
      )}

      {selectedResponse && (
        <ResponseDetailModal
          response={selectedResponse}
          onClose={() => setSelectedResponse(null)}
        />
      )}
    </div>
  )
}

function ResponseDetailModal({
  response,
  onClose,
}: {
  response: SurveyResponse
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="max-h-[80vh] w-full max-w-lg overflow-auto">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Response Details</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Customer</p>
              <p className="font-medium">{response.customer_email || 'Anonymous'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Order ID</p>
              <p className="font-medium">{response.order_id || '-'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Status</p>
              <Badge
                className={
                  response.is_complete
                    ? 'bg-green-100 text-green-700'
                    : 'bg-yellow-100 text-yellow-700'
                }
              >
                {response.is_complete ? 'Complete' : 'Partial'}
              </Badge>
            </div>
            <div>
              <p className="text-muted-foreground">Submitted</p>
              <p className="font-medium">{formatDate(response.created_at)}</p>
            </div>
            {response.nps_score !== null && (
              <div>
                <p className="text-muted-foreground">NPS Score</p>
                <p
                  className={`font-medium ${
                    response.nps_score >= 9
                      ? 'text-green-600'
                      : response.nps_score >= 7
                        ? 'text-yellow-600'
                        : 'text-red-600'
                  }`}
                >
                  {response.nps_score}
                </p>
              </div>
            )}
            {response.attribution_source && (
              <div>
                <p className="text-muted-foreground">Attribution</p>
                <Badge variant="outline">{response.attribution_source}</Badge>
              </div>
            )}
          </div>

          {response.answers && response.answers.length > 0 && (
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Answers</h4>
              <div className="space-y-3">
                {response.answers.map((answer) => (
                  <div key={answer.id} className="text-sm">
                    <p className="text-muted-foreground">{answer.question_text}</p>
                    <p className="font-medium mt-0.5">
                      {answer.answer_value ||
                        answer.answer_values?.join(', ') ||
                        answer.answer_numeric?.toString() ||
                        '-'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function ResponsesSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="h-8 w-8 animate-pulse rounded bg-muted" />
        <div className="space-y-2">
          <div className="h-6 w-32 animate-pulse rounded bg-muted" />
          <div className="h-4 w-48 animate-pulse rounded bg-muted" />
        </div>
      </div>
      <div className="h-10 w-64 animate-pulse rounded bg-muted" />
      <div className="overflow-hidden rounded-lg border">
        <div className="bg-muted/50 p-4">
          <div className="flex gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-4 w-20 animate-pulse rounded bg-muted" />
            ))}
          </div>
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="border-t p-4">
            <div className="flex gap-4">
              {Array.from({ length: 6 }).map((_, j) => (
                <div key={j} className="h-4 w-20 animate-pulse rounded bg-muted" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
