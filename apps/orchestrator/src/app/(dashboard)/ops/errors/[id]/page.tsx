'use client'

import { Badge, Button, Card, CardContent, CardHeader } from '@cgk-platform/ui'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Clock,
  Copy,
  ExternalLink,
  RefreshCw,
  User,
} from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

interface ErrorMetadata {
  url?: string
  method?: string
  headers?: Record<string, string>
  userId?: string
  userEmail?: string
  requestId?: string
  [key: string]: unknown
}

interface RelatedError {
  id: string
  occurredAt: string
  tenantId: string | null
}

interface PlatformErrorDetail {
  id: string
  tenantId: string | null
  tenantName: string | null
  tenantSlug: string | null
  severity: 'p1' | 'p2' | 'p3'
  status: 'open' | 'acknowledged' | 'resolved'
  errorType: string
  message: string
  stack: string | null
  metadata: ErrorMetadata | null
  patternHash: string | null
  occurredAt: string
  acknowledgedAt: string | null
  acknowledgedBy: string | null
  acknowledgedByEmail: string | null
  resolvedAt: string | null
  resolvedBy: string | null
  resolvedByEmail: string | null
  relatedErrors: RelatedError[]
}

/**
 * Error detail page
 *
 * Displays comprehensive information about a single error including:
 * - Error message and stack trace
 * - Tenant and user context
 * - Request details
 * - Related errors
 * - Actions to acknowledge/resolve
 */
export default function ErrorDetailPage() {
  const params = useParams()
  const errorId = params.id as string

  const [error, setError] = useState<PlatformErrorDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [copiedStack, setCopiedStack] = useState(false)

  const fetchErrorDetail = useCallback(async () => {
    setIsLoading(true)
    setFetchError(null)
    try {
      const response = await fetch(`/api/platform/errors/${errorId}`)
      if (response.ok) {
        const data = await response.json()
        setError(data.error)
      } else if (response.status === 404) {
        setFetchError('Error not found')
      } else {
        setFetchError('Failed to fetch error details')
      }
    } catch (err) {
      console.error('Failed to fetch error:', err)
      setFetchError('Failed to fetch error details')
    } finally {
      setIsLoading(false)
    }
  }, [errorId])

  useEffect(() => {
    fetchErrorDetail()
  }, [fetchErrorDetail])

  const handleUpdateStatus = async (status: 'acknowledged' | 'resolved' | 'open') => {
    setActionLoading(true)
    try {
      const response = await fetch(`/api/platform/errors/${errorId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      if (response.ok) {
        await fetchErrorDetail()
      }
    } catch (err) {
      console.error('Failed to update error:', err)
    } finally {
      setActionLoading(false)
    }
  }

  const handleCopyStack = async () => {
    if (error?.stack) {
      await navigator.clipboard.writeText(error.stack)
      setCopiedStack(true)
      setTimeout(() => setCopiedStack(false), 2000)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'p1':
        return 'bg-destructive/10 text-destructive border-destructive/20'
      case 'p2':
        return 'bg-warning/10 text-warning border-warning/20'
      case 'p3':
        return 'bg-info/10 text-info border-info/20'
      default:
        return 'bg-muted text-muted-foreground'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <AlertCircle className="h-5 w-5 text-destructive" />
      case 'acknowledged':
        return <Clock className="h-5 w-5 text-warning" />
      case 'resolved':
        return <CheckCircle className="h-5 w-5 text-success" />
      default:
        return null
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'open':
        return 'Open'
      case 'acknowledged':
        return 'Acknowledged'
      case 'resolved':
        return 'Resolved'
      default:
        return status
    }
  }

  if (isLoading) {
    return <ErrorDetailSkeleton />
  }

  if (fetchError || !error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="mb-4 h-12 w-12 text-muted-foreground" />
        <p className="text-lg font-medium text-muted-foreground">
          {fetchError || 'Error not found'}
        </p>
        <Link href="/ops/errors">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Errors
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Link href="/ops/errors">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>

          <div>
            <div className="flex items-center gap-3">
              {getStatusIcon(error.status)}
              <h1 className="text-2xl font-bold">{error.errorType}</h1>
              <Badge className={getSeverityColor(error.severity)}>
                {error.severity.toUpperCase()}
              </Badge>
            </div>
            <p className="mt-1 text-muted-foreground">
              {new Date(error.occurredAt).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchErrorDetail}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Message */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold">Error Message</h2>
        </CardHeader>
        <CardContent>
          <p className="font-mono text-sm">{error.message}</p>
        </CardContent>
      </Card>

      {/* Status and Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Status</h2>
            <Badge variant={error.status === 'resolved' ? 'success' : error.status === 'acknowledged' ? 'warning' : 'destructive'}>
              {getStatusLabel(error.status)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error.acknowledgedAt && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>
                Acknowledged {new Date(error.acknowledgedAt).toLocaleString()}
                {error.acknowledgedByEmail && ` by ${error.acknowledgedByEmail}`}
              </span>
            </div>
          )}
          {error.resolvedAt && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4" />
              <span>
                Resolved {new Date(error.resolvedAt).toLocaleString()}
                {error.resolvedByEmail && ` by ${error.resolvedByEmail}`}
              </span>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            {error.status === 'open' && (
              <Button
                onClick={() => handleUpdateStatus('acknowledged')}
                disabled={actionLoading}
              >
                Acknowledge
              </Button>
            )}
            {error.status === 'acknowledged' && (
              <Button
                onClick={() => handleUpdateStatus('resolved')}
                disabled={actionLoading}
              >
                Mark Resolved
              </Button>
            )}
            {error.status === 'resolved' && (
              <Button
                variant="outline"
                onClick={() => handleUpdateStatus('open')}
                disabled={actionLoading}
              >
                Re-open
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Context Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Tenant Context */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold">Tenant Context</h2>
          </CardHeader>
          <CardContent>
            {error.tenantId ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Tenant</span>
                  <Link
                    href={`/brands/${error.tenantId}`}
                    className="flex items-center gap-1 text-sm font-medium hover:underline"
                  >
                    {error.tenantName || error.tenantSlug || error.tenantId}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
                {error.tenantSlug && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Slug</span>
                    <span className="font-mono text-sm">{error.tenantSlug}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No tenant context</p>
            )}
          </CardContent>
        </Card>

        {/* User Context */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold">User Context</h2>
          </CardHeader>
          <CardContent>
            {error.metadata?.userId || error.metadata?.userEmail ? (
              <div className="space-y-3">
                {error.metadata.userId && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">User ID</span>
                    <Link
                      href={`/users/${error.metadata.userId}`}
                      className="flex items-center gap-1 text-sm font-medium hover:underline"
                    >
                      {error.metadata.userId.slice(0, 8)}...
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                )}
                {error.metadata.userEmail && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Email</span>
                    <span className="text-sm">{error.metadata.userEmail}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span>No user context available</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Request Details */}
      {(error.metadata?.url || error.metadata?.method || error.metadata?.requestId) && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold">Request Details</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {error.metadata.method && error.metadata.url && (
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="font-mono text-xs">
                    {error.metadata.method}
                  </Badge>
                  <span className="break-all font-mono text-sm">{error.metadata.url}</span>
                </div>
              )}
              {error.metadata.requestId && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Request ID</span>
                  <span className="font-mono text-sm">{error.metadata.requestId}</span>
                </div>
              )}
              {error.metadata.headers && Object.keys(error.metadata.headers).length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-sm font-medium text-muted-foreground">Headers</p>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <pre className="overflow-x-auto text-xs">
                      {JSON.stringify(error.metadata.headers, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stack Trace */}
      {error.stack && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Stack Trace</h2>
              <Button variant="ghost" size="sm" onClick={handleCopyStack}>
                <Copy className="mr-2 h-4 w-4" />
                {copiedStack ? 'Copied!' : 'Copy'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg bg-muted/50 p-4">
              <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-xs leading-relaxed">
                {error.stack}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Additional Metadata */}
      {error.metadata && Object.keys(error.metadata).some(k => !['url', 'method', 'headers', 'userId', 'userEmail', 'requestId'].includes(k)) && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold">Additional Metadata</h2>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg bg-muted/50 p-4">
              <pre className="overflow-x-auto text-xs">
                {JSON.stringify(
                  Object.fromEntries(
                    Object.entries(error.metadata).filter(
                      ([k]) => !['url', 'method', 'headers', 'userId', 'userEmail', 'requestId'].includes(k)
                    )
                  ),
                  null,
                  2
                )}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Related Errors */}
      {error.relatedErrors && error.relatedErrors.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">
                Related Errors ({error.relatedErrors.length})
              </h2>
              <p className="text-sm text-muted-foreground">
                Errors with same pattern
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {error.relatedErrors.map((related) => (
                <div
                  key={related.id}
                  className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                >
                  <div>
                    <p className="text-sm">
                      {new Date(related.occurredAt).toLocaleString()}
                    </p>
                    {related.tenantId && (
                      <p className="text-xs text-muted-foreground">
                        Tenant: {related.tenantId.slice(0, 8)}...
                      </p>
                    )}
                  </div>
                  <Link href={`/ops/errors/${related.id}`}>
                    <Button variant="ghost" size="sm">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Occurrence Info */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold">Occurrence Information</h2>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">First Seen</p>
              <p className="font-medium">
                {new Date(error.occurredAt).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pattern Hash</p>
              <p className="font-mono text-sm">
                {error.patternHash || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Related Occurrences</p>
              <p className="font-medium">
                {error.relatedErrors?.length || 0} similar errors
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function ErrorDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <div className="h-8 w-8 animate-pulse rounded bg-muted" />
        <div className="space-y-2">
          <div className="h-8 w-64 animate-pulse rounded bg-muted" />
          <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        </div>
      </div>
      <div className="h-32 animate-pulse rounded-xl border bg-card" />
      <div className="h-48 animate-pulse rounded-xl border bg-card" />
      <div className="grid gap-6 md:grid-cols-2">
        <div className="h-32 animate-pulse rounded-xl border bg-card" />
        <div className="h-32 animate-pulse rounded-xl border bg-card" />
      </div>
    </div>
  )
}
