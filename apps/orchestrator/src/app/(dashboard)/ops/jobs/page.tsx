'use client'

import { Badge, Button, Card, CardContent, CardHeader, cn, Select, SelectOption } from '@cgk-platform/ui'
import { AlertCircle, CheckCircle, Clock, Loader2, Play, RefreshCw, XCircle } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

interface PlatformJob {
  id: string
  tenantId: string | null
  tenantName: string | null
  tenantSlug: string | null
  jobType: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  errorMessage: string | null
  attempts: number
  maxAttempts: number
  scheduledAt: string | null
  startedAt: string | null
  completedAt: string | null
  createdAt: string
  canRetry?: boolean
}

interface JobStats {
  pendingCount: number
  runningCount: number
  completedCount: number
  failedCount: number
  cancelledCount: number
  failed24h: number
}

/**
 * Job Monitoring page
 *
 * Cross-tenant job status viewer with retry functionality for failed jobs.
 */
export default function JobsPage() {
  const [jobs, setJobs] = useState<PlatformJob[]>([])
  const [stats, setStats] = useState<JobStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [retrying, setRetrying] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [showFailed, setShowFailed] = useState(false)

  const fetchJobs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      params.set('limit', '100')

      const endpoint = showFailed ? '/api/platform/jobs/failed' : `/api/platform/jobs?${params}`
      const response = await fetch(endpoint)

      if (response.ok) {
        const data = await response.json()
        setJobs(data.jobs)
        if (data.stats) {
          setStats(data.stats)
        }
      }
    } catch (error) {
      console.error('Failed to fetch jobs:', error)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, showFailed])

  useEffect(() => {
    fetchJobs()
    const interval = setInterval(fetchJobs, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [fetchJobs])

  const handleRetry = async (jobId: string) => {
    setRetrying(jobId)
    try {
      const response = await fetch(`/api/platform/jobs/${jobId}/retry`, {
        method: 'POST',
      })

      if (response.ok) {
        await fetchJobs()
      }
    } catch (error) {
      console.error('Failed to retry job:', error)
    } finally {
      setRetrying(null)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-gray-500" />
      case 'running':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-gray-500" />
      default:
        return null
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-gray-100 text-gray-800'
      case 'running':
        return 'bg-blue-100 text-blue-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      case 'cancelled':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Background Jobs</h1>
          <p className="text-muted-foreground">
            Monitor job queues and processing status across all tenants.
          </p>
        </div>
        <Button onClick={fetchJobs} disabled={loading} variant="outline">
          <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Stats Summary */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-6">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-gray-600">{stats.pendingCount}</p>
              <p className="text-sm text-muted-foreground">Pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.runningCount}</p>
              <p className="text-sm text-muted-foreground">Running</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{stats.completedCount}</p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{stats.failedCount}</p>
              <p className="text-sm text-muted-foreground">Failed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-gray-600">{stats.cancelledCount}</p>
              <p className="text-sm text-muted-foreground">Cancelled</p>
            </CardContent>
          </Card>
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{stats.failed24h}</p>
              <p className="text-sm text-red-700">Failed (24h)</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <Button
              variant={showFailed ? 'default' : 'outline'}
              onClick={() => setShowFailed(!showFailed)}
            >
              <AlertCircle className="mr-2 h-4 w-4" />
              Failed Jobs Only
            </Button>
            {!showFailed && (
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <SelectOption value="">All Statuses</SelectOption>
                <SelectOption value="pending">Pending</SelectOption>
                <SelectOption value="running">Running</SelectOption>
                <SelectOption value="completed">Completed</SelectOption>
                <SelectOption value="failed">Failed</SelectOption>
                <SelectOption value="cancelled">Cancelled</SelectOption>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Job List */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold">
            {showFailed ? 'Failed Jobs' : 'All Jobs'} ({jobs.length})
          </h2>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading jobs...</div>
          ) : jobs.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No jobs found</div>
          ) : (
            <div className="divide-y">
              {jobs.map((job) => (
                <div key={job.id} className="flex items-start gap-4 py-4">
                  <div className="flex-shrink-0 pt-1">
                    {getStatusIcon(job.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={getStatusColor(job.status)}>
                        {job.status}
                      </Badge>
                      <span className="text-sm font-medium font-mono">{job.jobType}</span>
                      {job.tenantName && (
                        <span className="text-sm text-muted-foreground">
                          for {job.tenantName}
                        </span>
                      )}
                    </div>
                    {job.errorMessage && (
                      <p className="text-sm text-red-600 truncate">{job.errorMessage}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                      <span>ID: {job.id.slice(0, 8)}...</span>
                      <span>Attempts: {job.attempts}/{job.maxAttempts}</span>
                      <span>{new Date(job.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {job.status === 'failed' && job.canRetry !== false && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRetry(job.id)}
                        disabled={retrying === job.id}
                      >
                        {retrying === job.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Play className="mr-2 h-4 w-4" />
                        )}
                        Retry
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
