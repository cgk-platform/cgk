'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input } from '@cgk-platform/ui'

import type { ConsentRecord, ConsentType } from '@cgk-platform/support'

export default function ConsentBrowserPage() {
  const [records, setRecords] = useState<ConsentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchEmail, setSearchEmail] = useState('')
  const [typeFilter, setTypeFilter] = useState<ConsentType | 'all'>('all')
  const [activeOnly, setActiveOnly] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const params = new URLSearchParams()
        if (searchEmail) params.set('email', searchEmail)
        if (typeFilter !== 'all') params.set('type', typeFilter)
        if (activeOnly) params.set('active', 'true')

        const response = await fetch(`/api/admin/support/privacy/consent?${params}`)
        if (response.ok) {
          const data = await response.json()
          setRecords(data.records)
        }
      } catch (error) {
        console.error('Failed to fetch consent records:', error)
      } finally {
        setLoading(false)
      }
    }

    const debounce = setTimeout(fetchData, 300)
    return () => clearTimeout(debounce)
  }, [searchEmail, typeFilter, activeOnly])

  const getConsentTypeLabel = (type: ConsentType): string => {
    const labels: Record<ConsentType, string> = {
      marketing: 'Marketing',
      analytics: 'Analytics',
      third_party: 'Third Party',
      data_processing: 'Data Processing',
    }
    return labels[type]
  }

  const getConsentTypeColor = (type: ConsentType): string => {
    const colors: Record<ConsentType, string> = {
      marketing: 'border-purple-500/50 text-purple-400',
      analytics: 'border-blue-500/50 text-blue-400',
      third_party: 'border-amber-500/50 text-amber-400',
      data_processing: 'border-emerald-500/50 text-emerald-400',
    }
    return colors[type]
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/support/privacy"
              className="text-zinc-400 hover:text-zinc-200"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight">
              Consent Records
            </h1>
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            View and manage customer consent preferences
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <Input
          placeholder="Search by email..."
          value={searchEmail}
          onChange={(e) => setSearchEmail(e.target.value)}
          className="w-64"
        />

        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-500">Type:</span>
          <div className="flex gap-1">
            {(['all', 'marketing', 'analytics', 'third_party', 'data_processing'] as const).map(
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
                  {type === 'all' ? 'All' : getConsentTypeLabel(type as ConsentType)}
                </button>
              )
            )}
          </div>
        </div>

        <Button
          variant={activeOnly ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveOnly(!activeOnly)}
        >
          {activeOnly ? 'Active Only' : 'Show All'}
        </Button>
      </div>

      {/* Records */}
      <Card>
        <CardHeader>
          <CardTitle>Records</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <span className="text-sm text-zinc-500">Loading...</span>
            </div>
          ) : records.length === 0 ? (
            <div className="flex h-48 items-center justify-center">
              <p className="text-sm text-zinc-500">No consent records found</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {records.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center gap-4 p-4 transition-colors hover:bg-zinc-800/50"
                >
                  {/* Consent Icon */}
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                      record.granted ? 'bg-emerald-500/20' : 'bg-red-500/20'
                    }`}
                  >
                    {record.granted ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-emerald-400"
                      >
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-red-400"
                      >
                        <path d="M18 6 6 18" />
                        <path d="m6 6 12 12" />
                      </svg>
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium text-zinc-200">
                        {record.customerEmail}
                      </span>
                      <Badge
                        variant="outline"
                        className={getConsentTypeColor(record.consentType)}
                      >
                        {getConsentTypeLabel(record.consentType)}
                      </Badge>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-zinc-500">
                      <span>
                        {record.granted ? 'Granted' : 'Denied'}{' '}
                        {new Date(record.createdAt).toLocaleDateString()}
                      </span>
                      {record.source && <span>via {record.source}</span>}
                      {record.revokedAt && (
                        <span className="text-amber-400">
                          Revoked {new Date(record.revokedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status */}
                  <Badge
                    variant={
                      record.revokedAt
                        ? 'secondary'
                        : record.granted
                          ? 'default'
                          : 'destructive'
                    }
                  >
                    {record.revokedAt
                      ? 'Revoked'
                      : record.granted
                        ? 'Active'
                        : 'Denied'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
