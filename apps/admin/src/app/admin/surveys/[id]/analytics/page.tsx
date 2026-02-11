'use client'

import { Button, Card, CardContent } from '@cgk/ui'
import { ArrowLeft, Download, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

import {
  SurveyStatsCards,
  SurveyStatsCardsSkeleton,
  AttributionBreakdownChart,
  AttributionBreakdownSkeleton,
  RecentResponsesList,
  RecentResponsesSkeleton,
} from '@/components/surveys'
import type {
  Survey,
  SurveyStats,
  AttributionBreakdown,
  SurveyResponse,
} from '@/lib/surveys'

interface AnalyticsData {
  survey: Survey
  stats: SurveyStats
  attribution: AttributionBreakdown[]
  recentResponses: SurveyResponse[]
}

export default function SurveyAnalyticsPage() {
  const params = useParams()
  const surveyId = params.id as string

  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchAnalytics = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      const [surveyRes, analyticsRes, responsesRes] = await Promise.all([
        fetch(`/api/admin/surveys/${surveyId}`),
        fetch(`/api/admin/surveys/${surveyId}/analytics`),
        fetch(`/api/admin/surveys/${surveyId}/responses?limit=10`),
      ])

      const [surveyData, analyticsData, responsesData] = await Promise.all([
        surveyRes.json(),
        analyticsRes.json(),
        responsesRes.json(),
      ])

      setData({
        survey: surveyData.survey,
        stats: analyticsData.stats,
        attribution: analyticsData.attribution || [],
        recentResponses: responsesData.responses || [],
      })
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [surveyId])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  const handleExport = async () => {
    try {
      const response = await fetch(`/api/admin/surveys/${surveyId}/responses?export=csv`)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `survey-responses-${surveyId}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 animate-pulse rounded bg-muted" />
          <div className="space-y-2">
            <div className="h-6 w-48 animate-pulse rounded bg-muted" />
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
          </div>
        </div>
        <SurveyStatsCardsSkeleton />
        <div className="grid gap-6 lg:grid-cols-2">
          <AttributionBreakdownSkeleton />
          <RecentResponsesSkeleton />
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <p className="text-lg font-medium">Survey not found</p>
          <Link href="/admin/surveys" className="mt-4">
            <Button variant="outline">Back to Surveys</Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/surveys">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{data.survey.name}</h1>
            <p className="text-muted-foreground">Survey Analytics</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchAnalytics(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Link href={`/admin/surveys/${surveyId}`}>
            <Button size="sm">Edit Survey</Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <SurveyStatsCards stats={data.stats} />

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Attribution Breakdown */}
        <AttributionBreakdownChart data={data.attribution} />

        {/* Recent Responses */}
        <RecentResponsesList
          responses={data.recentResponses}
          surveyId={surveyId}
        />
      </div>

      {/* Responses by Day Chart Placeholder */}
      <Card>
        <CardContent className="p-6">
          <h3 className="mb-4 text-base font-semibold">Responses Over Time</h3>
          <div className="flex h-[200px] items-center justify-center rounded-lg border-2 border-dashed">
            <div className="text-center text-muted-foreground">
              <p className="text-sm">Response trend chart</p>
              <p className="text-xs">
                {data.stats.responsesByDay.length} data points available
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
