'use client'

import { Badge, Button, Card, CardContent, CardHeader, cn, Input, Select, SelectOption } from '@cgk-platform/ui'
import { AlertCircle, CheckCircle, Clock, ExternalLink, RefreshCw, Search } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

interface PlatformError {
  id: string
  tenantId: string | null
  tenantName: string | null
  tenantSlug: string | null
  severity: 'p1' | 'p2' | 'p3'
  status: 'open' | 'acknowledged' | 'resolved'
  errorType: string
  message: string
  occurredAt: string
  acknowledgedAt: string | null
  resolvedAt: string | null
}

interface ErrorStats {
  openCount: number
  acknowledgedCount: number
  resolvedCount: number
  p1Active: number
  p2Active: number
  p3Active: number
}

interface Tenant {
  id: string
  name: string
  slug: string
}

/**
 * Error Explorer page
 *
 * Cross-tenant error viewer with filtering by tenant, severity, and status.
 * Allows acknowledging and resolving errors.
 */
export default function ErrorsPage() {
  const [errors, setErrors] = useState<PlatformError[]>([])
  const [stats, setStats] = useState<ErrorStats | null>(null)
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Filters
  const [tenantFilter, setTenantFilter] = useState('')
  const [severityFilter, setSeverityFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const fetchErrors = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (tenantFilter) params.set('tenantId', tenantFilter)
      if (severityFilter) params.set('severity', severityFilter)
      if (statusFilter) params.set('status', statusFilter)
      params.set('limit', '100')

      const response = await fetch(`/api/platform/errors?${params}`)
      if (response.ok) {
        const data = await response.json()
        setErrors(data.errors)
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Failed to fetch errors:', error)
    } finally {
      setLoading(false)
    }
  }, [tenantFilter, severityFilter, statusFilter])

  const fetchTenants = useCallback(async () => {
    try {
      const response = await fetch('/api/platform/overview/brands')
      if (response.ok) {
        const data = await response.json()
        setTenants(
          data.brands.map((b: { id: string; name: string; slug: string }) => ({
            id: b.id,
            name: b.name,
            slug: b.slug,
          }))
        )
      }
    } catch (error) {
      console.error('Failed to fetch tenants:', error)
    }
  }, [])

  useEffect(() => {
    fetchErrors()
    fetchTenants()
  }, [fetchErrors, fetchTenants])

  const handleUpdateStatus = async (errorId: string, status: 'acknowledged' | 'resolved' | 'open') => {
    setActionLoading(errorId)
    try {
      const response = await fetch(`/api/platform/errors/${errorId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      if (response.ok) {
        await fetchErrors()
      }
    } catch (error) {
      console.error('Failed to update error:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const filteredErrors = errors.filter((error) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      error.message.toLowerCase().includes(query) ||
      error.errorType.toLowerCase().includes(query) ||
      error.tenantName?.toLowerCase().includes(query)
    )
  })

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'p1':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'p2':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'p3':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'acknowledged':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'resolved':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Error Explorer</h1>
          <p className="text-muted-foreground">
            View and manage platform errors across all tenants.
          </p>
        </div>
        <Button onClick={fetchErrors} disabled={loading} variant="outline">
          <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Stats Summary */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-6">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{stats.openCount}</p>
              <p className="text-sm text-muted-foreground">Open</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-yellow-600">{stats.acknowledgedCount}</p>
              <p className="text-sm text-muted-foreground">Acknowledged</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{stats.resolvedCount}</p>
              <p className="text-sm text-muted-foreground">Resolved</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{stats.p1Active}</p>
              <p className="text-sm text-muted-foreground">P1 Active</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-yellow-600">{stats.p2Active}</p>
              <p className="text-sm text-muted-foreground">P2 Active</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.p3Active}</p>
              <p className="text-sm text-muted-foreground">P3 Active</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search errors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={tenantFilter}
              onChange={(e) => setTenantFilter(e.target.value)}
            >
              <SelectOption value="">All Tenants</SelectOption>
              {tenants.map((tenant) => (
                <SelectOption key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </SelectOption>
              ))}
            </Select>
            <Select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
            >
              <SelectOption value="">All Severities</SelectOption>
              <SelectOption value="p1">P1 - Critical</SelectOption>
              <SelectOption value="p2">P2 - High</SelectOption>
              <SelectOption value="p3">P3 - Medium</SelectOption>
            </Select>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <SelectOption value="">All Statuses</SelectOption>
              <SelectOption value="open">Open</SelectOption>
              <SelectOption value="acknowledged">Acknowledged</SelectOption>
              <SelectOption value="resolved">Resolved</SelectOption>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Error List */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold">Errors ({filteredErrors.length})</h2>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading errors...</div>
          ) : filteredErrors.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No errors found</div>
          ) : (
            <div className="divide-y">
              {filteredErrors.map((error) => (
                <div key={error.id} className="flex items-start gap-4 py-4">
                  <div className="flex-shrink-0 pt-1">
                    {getStatusIcon(error.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={getSeverityColor(error.severity)}>
                        {error.severity.toUpperCase()}
                      </Badge>
                      <span className="text-sm font-medium">{error.errorType}</span>
                      {error.tenantName && (
                        <span className="text-sm text-muted-foreground">
                          in {error.tenantName}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-foreground truncate">{error.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(error.occurredAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {error.status === 'open' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdateStatus(error.id, 'acknowledged')}
                        disabled={actionLoading === error.id}
                      >
                        Acknowledge
                      </Button>
                    )}
                    {error.status === 'acknowledged' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdateStatus(error.id, 'resolved')}
                        disabled={actionLoading === error.id}
                      >
                        Resolve
                      </Button>
                    )}
                    {error.status === 'resolved' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleUpdateStatus(error.id, 'open')}
                        disabled={actionLoading === error.id}
                      >
                        Re-open
                      </Button>
                    )}
                    <Link href={`/ops/errors/${error.id}`}>
                      <Button size="sm" variant="ghost">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </Link>
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
