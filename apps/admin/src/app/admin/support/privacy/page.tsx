'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@cgk/ui'

import type { PrivacyRequest, PrivacyRequestStatus, PrivacyRequestType } from '@cgk/support'

interface PrivacyStats {
  pending: number
  processing: number
  completed: number
  rejected: number
  overdue: number
  avgProcessingDays: number | null
}

export default function PrivacyRequestsPage() {
  const [requests, setRequests] = useState<PrivacyRequest[]>([])
  const [stats, setStats] = useState<PrivacyStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<PrivacyRequestStatus | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<PrivacyRequestType | 'all'>('all')

  useEffect(() => {
    async function fetchData() {
      try {
        const params = new URLSearchParams()
        params.set('includeStats', 'true')
        if (statusFilter !== 'all') params.set('status', statusFilter)
        if (typeFilter !== 'all') params.set('type', typeFilter)

        const response = await fetch(`/api/admin/support/privacy?${params}`)
        if (response.ok) {
          const data = await response.json()
          setRequests(data.requests)
          setStats(data.stats)
        }
      } catch (error) {
        console.error('Failed to fetch privacy requests:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [statusFilter, typeFilter])

  const getStatusBadge = (status: PrivacyRequestStatus) => {
    const variants: Record<PrivacyRequestStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      pending: { variant: 'secondary', label: 'Pending' },
      processing: { variant: 'default', label: 'Processing' },
      completed: { variant: 'outline', label: 'Completed' },
      rejected: { variant: 'destructive', label: 'Rejected' },
    }
    const config = variants[status]
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const getTypeBadge = (type: PrivacyRequestType) => {
    const labels: Record<PrivacyRequestType, string> = {
      export: 'Data Export',
      delete: 'Deletion',
      do_not_sell: 'Do Not Sell',
      disclosure: 'Disclosure',
    }
    return (
      <Badge variant="outline" className="border-zinc-700">
        {labels[type]}
      </Badge>
    )
  }

  const getDaysUntilDeadline = (request: PrivacyRequest): number => {
    const now = new Date()
    const deadline = new Date(request.deadlineAt)
    return Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  }

  const getDeadlineIndicator = (request: PrivacyRequest) => {
    if (request.status === 'completed' || request.status === 'rejected') {
      return null
    }

    const days = getDaysUntilDeadline(request)
    if (days < 0) {
      return <span className="text-xs font-bold text-red-500">OVERDUE</span>
    }
    if (days <= 7) {
      return <span className="text-xs font-bold text-amber-500">{days}d left</span>
    }
    return <span className="text-xs text-zinc-500">{days}d left</span>
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <span className="text-sm text-zinc-500">Loading privacy requests...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Privacy Requests
          </h1>
          <p className="text-sm text-zinc-500">
            Manage GDPR/CCPA data requests and compliance
          </p>
        </div>
        <Link href="/admin/support/privacy/consent">
          <Button variant="outline">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-2"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
              <path d="m9 12 2 2 4-4" />
            </svg>
            Consent Records
          </Button>
        </Link>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card className={stats.overdue > 0 ? 'border-red-500/50' : ''}>
            <CardContent className="pt-6">
              <div className="text-sm font-medium text-zinc-500">Overdue</div>
              <div className={`mt-1 text-2xl font-bold ${stats.overdue > 0 ? 'text-red-400' : 'text-zinc-200'}`}>
                {stats.overdue}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm font-medium text-zinc-500">Pending</div>
              <div className="mt-1 text-2xl font-bold text-amber-400">
                {stats.pending}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm font-medium text-zinc-500">Processing</div>
              <div className="mt-1 text-2xl font-bold text-blue-400">
                {stats.processing}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm font-medium text-zinc-500">Completed</div>
              <div className="mt-1 text-2xl font-bold text-emerald-400">
                {stats.completed}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm font-medium text-zinc-500">Avg. Processing</div>
              <div className="mt-1 text-2xl font-bold text-zinc-200">
                {stats.avgProcessingDays?.toFixed(1) ?? '--'}
                <span className="ml-1 text-sm text-zinc-500">days</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-500">Status:</span>
          <div className="flex gap-1">
            {(['all', 'pending', 'processing', 'completed', 'rejected'] as const).map(
              (status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    statusFilter === status
                      ? 'bg-zinc-800 text-white'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              )
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-500">Type:</span>
          <div className="flex gap-1">
            {(['all', 'export', 'delete', 'do_not_sell', 'disclosure'] as const).map(
              (type) => (
                <button
                  key={type}
                  onClick={() => setTypeFilter(type)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    typeFilter === type
                      ? 'bg-zinc-800 text-white'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {type === 'all'
                    ? 'All'
                    : type === 'do_not_sell'
                      ? 'DNT'
                      : type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Requests List */}
      <Card>
        <CardHeader>
          <CardTitle>Requests</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {requests.length === 0 ? (
            <div className="flex h-48 items-center justify-center">
              <p className="text-sm text-zinc-500">No requests found</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center gap-4 p-4 transition-colors hover:bg-zinc-800/50"
                >
                  {/* Request Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium text-zinc-200">
                        {request.customerEmail}
                      </span>
                      {getTypeBadge(request.requestType)}
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-zinc-500">
                      <span>
                        Created{' '}
                        {new Date(request.createdAt).toLocaleDateString()}
                      </span>
                      {request.verifiedAt && (
                        <span className="flex items-center gap-1 text-emerald-400">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                            <path d="m9 11 3 3L22 4" />
                          </svg>
                          Verified
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status & Deadline */}
                  <div className="flex items-center gap-4">
                    {getDeadlineIndicator(request)}
                    {getStatusBadge(request.status)}
                  </div>

                  {/* Actions */}
                  <Link href={`/admin/support/privacy/${request.id}`}>
                    <Button variant="ghost" size="sm">
                      View
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="ml-1"
                      >
                        <path d="m9 18 6-6-6-6" />
                      </svg>
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
