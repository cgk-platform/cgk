'use client'

import { useEffect, useState } from 'react'
import { Button, Card, CardContent, CardHeader, Badge, Input } from '@cgk-platform/ui'

import type { AnalyticsReport } from '@/lib/analytics'

const PRESET_REPORTS = [
  { id: 'sales_summary', name: 'Sales Summary', description: 'Overview of sales performance' },
  { id: 'product_performance', name: 'Product Performance', description: 'Product-level metrics and trends' },
  { id: 'customer_cohort', name: 'Customer Cohort', description: 'Cohort analysis and LTV tracking' },
  { id: 'channel_attribution', name: 'Channel Attribution', description: 'Marketing channel performance' },
  { id: 'subscription_health', name: 'Subscription Health', description: 'Subscription metrics and churn' },
  { id: 'marketing_roi', name: 'Marketing ROI', description: 'Ad spend efficiency analysis' },
]

export default function ReportsPage() {
  const [reports, setReports] = useState<AnalyticsReport[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    fetchReports()
  }, [])

  async function fetchReports() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/analytics/reports')
      const json = await res.json()
      setReports(json.reports || [])
    } catch (error) {
      console.error('Failed to fetch reports:', error)
    } finally {
      setLoading(false)
    }
  }

  async function runReport(id: string) {
    try {
      const res = await fetch(`/api/admin/analytics/reports/${id}/run`, {
        method: 'POST',
      })
      const json = await res.json()
      if (json.run?.status === 'completed') {
        alert('Report generated successfully!')
      } else if (json.run?.status === 'failed') {
        alert(`Report failed: ${json.run.errorMessage}`)
      }
      fetchReports()
    } catch (error) {
      console.error('Failed to run report:', error)
    }
  }

  async function deleteReport(id: string) {
    if (!confirm('Are you sure you want to delete this report?')) return

    try {
      await fetch(`/api/admin/analytics/reports/${id}`, {
        method: 'DELETE',
      })
      setReports((prev) => prev.filter((r) => r.id !== id))
    } catch (error) {
      console.error('Failed to delete report:', error)
    }
  }

  const filteredReports = reports.filter((r) =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-muted-foreground">
            Build and run custom analytics reports
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>Create Report</Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <Input
          placeholder="Search reports..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {/* Pre-built Reports */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold">Pre-Built Reports</h3>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {PRESET_REPORTS.map((preset) => (
              <div
                key={preset.id}
                className="rounded-lg border p-4 transition-colors hover:bg-muted/30"
              >
                <h4 className="font-medium">{preset.name}</h4>
                <p className="mt-1 text-sm text-muted-foreground">{preset.description}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => alert(`Running ${preset.name}...`)}
                >
                  Run Report
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Saved Reports */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold">Saved Reports</h3>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex justify-between">
                  <div className="h-5 w-48 animate-pulse rounded bg-muted" />
                  <div className="h-5 w-24 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              {searchQuery ? 'No reports match your search' : 'No saved reports yet'}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 font-medium">Name</th>
                  <th className="pb-3 font-medium">Type</th>
                  <th className="pb-3 font-medium">Schedule</th>
                  <th className="pb-3 font-medium">Last Run</th>
                  <th className="pb-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredReports.map((report) => (
                  <tr key={report.id}>
                    <td className="py-3 font-medium">{report.name}</td>
                    <td className="py-3">
                      <Badge variant={report.type === 'preset' ? 'secondary' : 'default'}>
                        {report.type}
                      </Badge>
                    </td>
                    <td className="py-3">
                      {report.schedule?.enabled ? (
                        <Badge variant="default">Scheduled</Badge>
                      ) : (
                        <span className="text-muted-foreground">Manual</span>
                      )}
                    </td>
                    <td className="py-3 text-muted-foreground">
                      {report.lastRunAt
                        ? new Date(report.lastRunAt).toLocaleString()
                        : 'Never'}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => runReport(report.id)}
                        >
                          Run
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => deleteReport(report.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Create Report Modal */}
      {showCreateModal && (
        <CreateReportModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false)
            fetchReports()
          }}
        />
      )}
    </div>
  )
}

interface CreateReportModalProps {
  onClose: () => void
  onCreated: () => void
}

function CreateReportModal({ onClose, onCreated }: CreateReportModalProps) {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    try {
      await fetch('/api/admin/analytics/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          type: 'custom',
          config: {
            dimensions: [],
            metrics: [],
            filters: [],
            visualization: 'table',
          },
        }),
      })
      onCreated()
    } catch (error) {
      console.error('Failed to create report:', error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <h3 className="font-semibold">Create Custom Report</h3>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">Report Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Custom Report"
                required
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? 'Creating...' : 'Create Report'}
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
