'use client'

import {
  Button,
  Card,
  CardContent,
  Badge,
  Alert,
  AlertDescription,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Input,
  Label,
  Switch,
} from '@cgk/ui'
import { cn } from '@cgk/ui'
import {
  Plus,
  Edit2,
  Trash2,
  Send,
  Mail,
  Clock,
  Calendar,
  X,
  Loader2,
  FileText,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import { useEffect, useState, useCallback } from 'react'

import {
  ATTRIBUTION_MODELS,
  ATTRIBUTION_WINDOWS,
  type ScheduledReport,
  type ScheduledReportCreate,
  type ReportFrequency,
  type ReportDateRange,
  type AttributionModel,
  type AttributionWindow,
} from '@/lib/attribution'

const TIMEZONE_OPTIONS = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Australia/Sydney',
]

const DATE_RANGE_OPTIONS: { value: ReportDateRange; label: string }[] = [
  { value: 'last_7d', label: 'Last 7 Days' },
  { value: 'last_30d', label: 'Last 30 Days' },
  { value: 'last_mtd', label: 'Month to Date' },
  { value: 'last_month', label: 'Last Month' },
]

const METRICS_OPTIONS = [
  'revenue',
  'conversions',
  'roas',
  'cpa',
  'aov',
  'new_customers',
  'returning_customers',
]

export default function ReportsPage() {
  const [reports, setReports] = useState<ScheduledReport[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingReport, setEditingReport] = useState<ScheduledReport | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [sendingReportId, setSendingReportId] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState<ScheduledReportCreate>({
    name: '',
    frequency: 'weekly',
    scheduleConfig: {
      dayOfWeek: 1,
      hour: 9,
      minute: 0,
      timezone: 'America/New_York',
    },
    recipients: [],
    reportConfig: {
      model: 'time_decay',
      window: '7d',
      metrics: ['revenue', 'conversions', 'roas'],
      dateRange: 'last_7d',
    },
  })

  const [recipientInput, setRecipientInput] = useState('')

  const fetchReports = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/attribution/reports')
      const data = await response.json()
      setReports(data.reports)
    } catch (err) {
      setError('Failed to load reports')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchReports()
  }, [fetchReports])

  const openCreateModal = () => {
    setEditingReport(null)
    setFormData({
      name: '',
      frequency: 'weekly',
      scheduleConfig: {
        dayOfWeek: 1,
        hour: 9,
        minute: 0,
        timezone: 'America/New_York',
      },
      recipients: [],
      reportConfig: {
        model: 'time_decay',
        window: '7d',
        metrics: ['revenue', 'conversions', 'roas'],
        dateRange: 'last_7d',
      },
    })
    setShowModal(true)
  }

  const openEditModal = (report: ScheduledReport) => {
    setEditingReport(report)
    setFormData({
      name: report.name,
      frequency: report.frequency,
      scheduleConfig: report.scheduleConfig,
      recipients: report.recipients,
      slackChannel: report.slackChannel ?? undefined,
      reportConfig: report.reportConfig,
      enabled: report.enabled,
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const url = editingReport
        ? `/api/admin/attribution/reports/${editingReport.id}`
        : '/api/admin/attribution/reports'

      const response = await fetch(url, {
        method: editingReport ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save report')
      }

      setShowModal(false)
      await fetchReports()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save report')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this report?')) return

    try {
      const response = await fetch(`/api/admin/attribution/reports/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete report')
      }

      await fetchReports()
    } catch (err) {
      setError('Failed to delete report')
    }
  }

  const handleSendNow = async (id: string) => {
    setSendingReportId(id)
    try {
      const response = await fetch(`/api/admin/attribution/reports/${id}/send`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to send report')
      }

      await fetchReports()
    } catch (err) {
      setError('Failed to send report')
    } finally {
      setSendingReportId(null)
    }
  }

  const addRecipient = () => {
    if (!recipientInput.trim() || !recipientInput.includes('@')) return
    setFormData((prev) => ({
      ...prev,
      recipients: [...prev.recipients, recipientInput.trim()],
    }))
    setRecipientInput('')
  }

  const removeRecipient = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      recipients: prev.recipients.filter((_, i) => i !== index),
    }))
  }

  const toggleMetric = (metric: string) => {
    setFormData((prev) => ({
      ...prev,
      reportConfig: {
        ...prev.reportConfig,
        metrics: prev.reportConfig.metrics.includes(metric)
          ? prev.reportConfig.metrics.filter((m) => m !== metric)
          : [...prev.reportConfig.metrics, metric],
      },
    }))
  }

  const getFrequencyLabel = (report: ScheduledReport) => {
    const { frequency, scheduleConfig } = report
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const time = `${scheduleConfig.hour.toString().padStart(2, '0')}:${scheduleConfig.minute.toString().padStart(2, '0')}`

    switch (frequency) {
      case 'daily':
        return `Daily at ${time}`
      case 'weekly':
        return `${days[scheduleConfig.dayOfWeek ?? 0]} at ${time}`
      case 'monthly':
        return `Day ${scheduleConfig.dayOfMonth} at ${time}`
      default:
        return frequency
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="h-9 w-32 animate-pulse rounded bg-muted" />
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="h-64 animate-pulse rounded bg-muted" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="error">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Scheduled Reports</h2>
          <p className="text-sm text-muted-foreground">
            Configure automated attribution report delivery
          </p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="mr-2 h-4 w-4" />
          Create Report
        </Button>
      </div>

      {/* Reports List */}
      <Card>
        <CardContent className="p-0">
          {reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 font-medium">No Scheduled Reports</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Create your first scheduled report
              </p>
              <Button className="mt-4" onClick={openCreateModal}>
                <Plus className="mr-2 h-4 w-4" />
                Create Report
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {reports.map((report) => (
                <div key={report.id} className="flex items-center justify-between p-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-medium">{report.name}</h3>
                      <Badge
                        className={cn(
                          report.enabled
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        )}
                      >
                        {report.enabled ? 'Active' : 'Paused'}
                      </Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {getFrequencyLabel(report)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5" />
                        {report.recipients.length} recipient
                        {report.recipients.length !== 1 ? 's' : ''}
                      </span>
                      {report.lastSentAt && (
                        <span className="flex items-center gap-1">
                          {report.lastStatus === 'success' ? (
                            <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5 text-red-500" />
                          )}
                          Last sent: {new Date(report.lastSentAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSendNow(report.id)}
                      disabled={sendingReportId === report.id}
                    >
                      {sendingReportId === report.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal(report)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(report.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-background p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {editingReport ? 'Edit Report' : 'Create Report'}
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setShowModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Report Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Weekly Attribution Report"
                />
              </div>

              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select
                  value={formData.frequency}
                  onValueChange={(value: ReportFrequency) =>
                    setFormData((prev) => ({ ...prev, frequency: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.frequency === 'weekly' && (
                <div className="space-y-2">
                  <Label>Day of Week</Label>
                  <Select
                    value={String(formData.scheduleConfig.dayOfWeek ?? 1)}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        scheduleConfig: {
                          ...prev.scheduleConfig,
                          dayOfWeek: parseInt(value),
                        },
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Sunday</SelectItem>
                      <SelectItem value="1">Monday</SelectItem>
                      <SelectItem value="2">Tuesday</SelectItem>
                      <SelectItem value="3">Wednesday</SelectItem>
                      <SelectItem value="4">Thursday</SelectItem>
                      <SelectItem value="5">Friday</SelectItem>
                      <SelectItem value="6">Saturday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {formData.frequency === 'monthly' && (
                <div className="space-y-2">
                  <Label>Day of Month</Label>
                  <Input
                    type="number"
                    min="1"
                    max="31"
                    value={formData.scheduleConfig.dayOfMonth ?? 1}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        scheduleConfig: {
                          ...prev.scheduleConfig,
                          dayOfMonth: parseInt(e.target.value) || 1,
                        },
                      }))
                    }
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Time</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min="0"
                      max="23"
                      value={formData.scheduleConfig.hour}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          scheduleConfig: {
                            ...prev.scheduleConfig,
                            hour: parseInt(e.target.value) || 0,
                          },
                        }))
                      }
                      placeholder="Hour"
                    />
                    <Input
                      type="number"
                      min="0"
                      max="59"
                      value={formData.scheduleConfig.minute}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          scheduleConfig: {
                            ...prev.scheduleConfig,
                            minute: parseInt(e.target.value) || 0,
                          },
                        }))
                      }
                      placeholder="Min"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Select
                    value={formData.scheduleConfig.timezone}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        scheduleConfig: {
                          ...prev.scheduleConfig,
                          timezone: value,
                        },
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONE_OPTIONS.map((tz) => (
                        <SelectItem key={tz} value={tz}>
                          {tz}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Recipients */}
              <div className="space-y-2">
                <Label>Recipients *</Label>
                <div className="flex gap-2">
                  <Input
                    value={recipientInput}
                    onChange={(e) => setRecipientInput(e.target.value)}
                    placeholder="email@example.com"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addRecipient()
                      }
                    }}
                  />
                  <Button type="button" variant="outline" onClick={addRecipient}>
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {formData.recipients.map((email, i) => (
                    <Badge key={i} variant="outline" className="gap-1">
                      {email}
                      <button onClick={() => removeRecipient(i)}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Slack Channel (optional)</Label>
                <Input
                  value={formData.slackChannel ?? ''}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, slackChannel: e.target.value }))
                  }
                  placeholder="#marketing"
                />
              </div>

              <div className="border-t pt-4">
                <h3 className="mb-3 font-medium">Report Configuration</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Attribution Model</Label>
                    <Select
                      value={formData.reportConfig.model}
                      onValueChange={(value: AttributionModel) =>
                        setFormData((prev) => ({
                          ...prev,
                          reportConfig: { ...prev.reportConfig, model: value },
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ATTRIBUTION_MODELS.map((model) => (
                          <SelectItem key={model.value} value={model.value}>
                            {model.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Attribution Window</Label>
                    <Select
                      value={formData.reportConfig.window}
                      onValueChange={(value: AttributionWindow) =>
                        setFormData((prev) => ({
                          ...prev,
                          reportConfig: { ...prev.reportConfig, window: value },
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ATTRIBUTION_WINDOWS.map((w) => (
                          <SelectItem key={w.value} value={w.value}>
                            {w.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <Label>Date Range</Label>
                  <Select
                    value={formData.reportConfig.dateRange}
                    onValueChange={(value: ReportDateRange) =>
                      setFormData((prev) => ({
                        ...prev,
                        reportConfig: { ...prev.reportConfig, dateRange: value },
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DATE_RANGE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="mt-4 space-y-2">
                  <Label>Metrics to Include</Label>
                  <div className="flex flex-wrap gap-2">
                    {METRICS_OPTIONS.map((metric) => (
                      <label
                        key={metric}
                        className={cn(
                          'flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-sm',
                          formData.reportConfig.metrics.includes(metric)
                            ? 'border-primary bg-primary/10'
                            : 'border-gray-200'
                        )}
                      >
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={formData.reportConfig.metrics.includes(metric)}
                          onChange={() => toggleMetric(metric)}
                        />
                        {metric.replace(/_/g, ' ')}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {editingReport && (
                <div className="flex items-center justify-between border-t pt-4">
                  <div>
                    <Label>Enabled</Label>
                    <p className="text-xs text-muted-foreground">
                      Enable scheduled delivery
                    </p>
                  </div>
                  <Switch
                    checked={formData.enabled ?? true}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, enabled: checked }))
                    }
                  />
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={
                  isSaving ||
                  !formData.name ||
                  formData.recipients.length === 0 ||
                  formData.reportConfig.metrics.length === 0
                }
              >
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {editingReport ? 'Save Changes' : 'Create Report'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
