'use client'

import { Button, Card, CardContent, Badge } from '@cgk/ui'
import {
  Download,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  Phone,
  Mail,
} from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

import type { SmsAuditLogEntry } from '@/lib/integrations/types'

const PAGE_SIZE = 50

type ActionType = 'all' | 'opt_in' | 'opt_out' | 'consent_granted' | 'consent_revoked' | 'consent_violation_attempt'
type SourceType = 'all' | 'checkout' | 'admin' | 'stop_keyword' | 'api' | 'import'

const actionLabels: Record<string, { label: string; variant: 'success' | 'destructive' | 'warning' | 'secondary' }> = {
  opt_in: { label: 'Opt In', variant: 'success' },
  opt_out: { label: 'Opt Out', variant: 'destructive' },
  consent_granted: { label: 'Consent Granted', variant: 'success' },
  consent_revoked: { label: 'Consent Revoked', variant: 'destructive' },
  consent_violation_attempt: { label: 'Violation Attempt', variant: 'warning' },
}

const sourceLabels: Record<string, string> = {
  checkout: 'Checkout',
  admin: 'Admin',
  stop_keyword: 'STOP Keyword',
  api: 'API',
  import: 'Import',
}

export default function SmsAuditLogPage() {
  const [entries, setEntries] = useState<SmsAuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState<ActionType>('all')
  const [sourceFilter, setSourceFilter] = useState<SourceType>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [exporting, setExporting] = useState(false)

  const fetchAuditLog = async (searchTerm: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: PAGE_SIZE.toString(),
      })
      if (searchTerm) params.set('search', searchTerm)
      if (actionFilter !== 'all') params.set('action', actionFilter)
      if (sourceFilter !== 'all') params.set('source', sourceFilter)
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)

      const response = await fetch(`/api/admin/sms/audit-log?${params}`)
      if (response.ok) {
        const data = await response.json()
        setEntries(data.entries || [])
        setTotalPages(data.totalPages || 1)
      }
    } catch (error) {
      console.error('Failed to fetch audit log:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAuditLog(search)
  }, [page, actionFilter, sourceFilter, dateFrom, dateTo, search])

  const handleSearch = () => {
    setPage(1)
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (actionFilter !== 'all') params.set('action', actionFilter)
      if (sourceFilter !== 'all') params.set('source', sourceFilter)
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)

      const response = await fetch(`/api/admin/sms/audit-log/export?${params}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `sms-audit-log-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Failed to export:', error)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/integrations/sms">
            <Button variant="ghost" size="icon">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h2 className="text-xl font-semibold">TCPA Audit Log</h2>
            <p className="text-sm text-muted-foreground">
              Consent tracking for compliance
            </p>
          </div>
        </div>

        <Button onClick={handleExport} disabled={exporting}>
          <Download className="mr-2 h-4 w-4" />
          {exporting ? 'Exporting...' : 'Export CSV'}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search phone or email..."
                  className="w-full rounded-md border bg-background pl-9 pr-3 py-2 text-sm"
                />
              </div>
            </div>

            {/* Action Filter */}
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value as ActionType)
                setPage(1)
              }}
              className="rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="all">All Actions</option>
              <option value="opt_in">Opt In</option>
              <option value="opt_out">Opt Out</option>
              <option value="consent_granted">Consent Granted</option>
              <option value="consent_revoked">Consent Revoked</option>
              <option value="consent_violation_attempt">Violation Attempts</option>
            </select>

            {/* Source Filter */}
            <select
              value={sourceFilter}
              onChange={(e) => {
                setSourceFilter(e.target.value as SourceType)
                setPage(1)
              }}
              className="rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="all">All Sources</option>
              <option value="checkout">Checkout</option>
              <option value="admin">Admin</option>
              <option value="stop_keyword">STOP Keyword</option>
              <option value="api">API</option>
              <option value="import">Import</option>
            </select>

            {/* Date Range */}
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value)
                setPage(1)
              }}
              className="rounded-md border bg-background px-3 py-2 text-sm"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value)
                setPage(1)
              }}
              className="rounded-md border bg-background px-3 py-2 text-sm"
            />

            <Button variant="outline" onClick={handleSearch}>
              <Filter className="mr-2 h-4 w-4" />
              Apply
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Contact</th>
                <th className="px-4 py-3 text-left font-medium">Channel</th>
                <th className="px-4 py-3 text-left font-medium">Action</th>
                <th className="px-4 py-3 text-left font-medium">Source</th>
                <th className="px-4 py-3 text-left font-medium">IP Address</th>
                <th className="px-4 py-3 text-left font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    <td className="px-4 py-3"><div className="h-4 w-32 animate-pulse rounded bg-muted" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-16 animate-pulse rounded bg-muted" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-20 animate-pulse rounded bg-muted" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-24 animate-pulse rounded bg-muted" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-28 animate-pulse rounded bg-muted" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-36 animate-pulse rounded bg-muted" /></td>
                  </tr>
                ))
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    No audit log entries found
                  </td>
                </tr>
              ) : (
                entries.map((entry) => {
                  const actionConfig = actionLabels[entry.action] || { label: entry.action, variant: 'secondary' as const }

                  return (
                    <tr key={entry.id} className="border-b hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs">{entry.phone}</div>
                        {entry.email && (
                          <div className="text-xs text-muted-foreground">{entry.email}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {entry.channel === 'sms' ? (
                            <Phone className="h-3 w-3 text-muted-foreground" />
                          ) : (
                            <Mail className="h-3 w-3 text-muted-foreground" />
                          )}
                          <span className="capitalize">{entry.channel}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={actionConfig.variant}>
                          {actionConfig.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {sourceLabels[entry.source] || entry.source}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {entry.ipAddress || '-'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(entry.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t px-4 py-3">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
