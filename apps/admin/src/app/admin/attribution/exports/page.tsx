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
  Play,
  Download,
  Cloud,
  Database,
  X,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  HardDrive,
} from 'lucide-react'
import { useEffect, useState, useCallback } from 'react'

import type {
  ExportConfiguration,
  ExportConfigurationCreate,
  ExportDestinationType,
  ExportSchedule,
  ExportFormat,
  ExportableTable,
} from '@/lib/attribution'

const DESTINATION_OPTIONS: { value: ExportDestinationType; label: string; icon: React.ReactNode }[] = [
  { value: 's3', label: 'Amazon S3', icon: <Cloud className="h-4 w-4" /> },
  { value: 'gcs', label: 'Google Cloud Storage', icon: <Cloud className="h-4 w-4" /> },
  { value: 'webhook', label: 'Webhook', icon: <Database className="h-4 w-4" /> },
  { value: 'sftp', label: 'SFTP', icon: <HardDrive className="h-4 w-4" /> },
]

const TABLE_OPTIONS: { value: ExportableTable; label: string }[] = [
  { value: 'attribution_touchpoints', label: 'Touchpoints' },
  { value: 'attribution_conversions', label: 'Conversions' },
  { value: 'attribution_results', label: 'Attribution Results' },
  { value: 'attribution_daily_metrics', label: 'Daily Metrics' },
  { value: 'customer_identities', label: 'Customer Identities (Anonymized)' },
]

const FORMAT_OPTIONS: { value: ExportFormat; label: string }[] = [
  { value: 'csv', label: 'CSV' },
  { value: 'json', label: 'JSON' },
  { value: 'parquet', label: 'Parquet' },
]

export default function ExportsPage() {
  const [exports, setExports] = useState<ExportConfiguration[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingExport, setEditingExport] = useState<ExportConfiguration | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [runningExportId, setRunningExportId] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState<ExportConfigurationCreate>({
    name: '',
    destinationType: 's3',
    destinationConfig: {},
    schedule: 'daily',
    tables: [],
    format: 'csv',
  })

  const fetchExports = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/attribution/exports')
      const data = await response.json()
      setExports(data.exports)
    } catch (err) {
      setError('Failed to load exports')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchExports()
  }, [fetchExports])

  const openCreateModal = () => {
    setEditingExport(null)
    setFormData({
      name: '',
      destinationType: 's3',
      destinationConfig: {},
      schedule: 'daily',
      tables: [],
      format: 'csv',
    })
    setShowModal(true)
  }

  const openEditModal = (exportConfig: ExportConfiguration) => {
    setEditingExport(exportConfig)
    setFormData({
      name: exportConfig.name,
      destinationType: exportConfig.destinationType,
      destinationConfig: exportConfig.destinationConfig,
      schedule: exportConfig.schedule,
      tables: exportConfig.tables,
      format: exportConfig.format,
      enabled: exportConfig.enabled,
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const url = editingExport
        ? `/api/admin/attribution/exports/${editingExport.id}`
        : '/api/admin/attribution/exports'

      const response = await fetch(url, {
        method: editingExport ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save export')
      }

      setShowModal(false)
      await fetchExports()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save export')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this export configuration?')) return

    try {
      const response = await fetch(`/api/admin/attribution/exports/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete export')
      }

      await fetchExports()
    } catch (err) {
      setError('Failed to delete export')
    }
  }

  const handleRunNow = async (id: string) => {
    setRunningExportId(id)
    try {
      const response = await fetch(`/api/admin/attribution/exports/${id}/run`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to run export')
      }

      await fetchExports()
    } catch (err) {
      setError('Failed to run export')
    } finally {
      setRunningExportId(null)
    }
  }

  const toggleTable = (table: ExportableTable) => {
    setFormData((prev) => ({
      ...prev,
      tables: prev.tables.includes(table)
        ? prev.tables.filter((t) => t !== table)
        : [...prev.tables, table],
    }))
  }

  const getDestinationIcon = (type: ExportDestinationType) => {
    const option = DESTINATION_OPTIONS.find((o) => o.value === type)
    return option?.icon ?? <Cloud className="h-4 w-4" />
  }

  const getScheduleLabel = (schedule: ExportSchedule) => {
    switch (schedule) {
      case 'hourly':
        return 'Every Hour'
      case 'daily':
        return 'Daily'
      case 'weekly':
        return 'Weekly'
      default:
        return schedule
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
          <h2 className="text-lg font-semibold">Data Exports</h2>
          <p className="text-sm text-muted-foreground">
            Configure automated data exports to external destinations
          </p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="mr-2 h-4 w-4" />
          Create Export
        </Button>
      </div>

      {/* Exports List */}
      <Card>
        <CardContent className="p-0">
          {exports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Database className="h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 font-medium">No Export Configurations</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Create your first data export
              </p>
              <Button className="mt-4" onClick={openCreateModal}>
                <Plus className="mr-2 h-4 w-4" />
                Create Export
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {exports.map((exportConfig) => (
                <div key={exportConfig.id} className="flex items-center justify-between p-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      {getDestinationIcon(exportConfig.destinationType)}
                      <h3 className="font-medium">{exportConfig.name}</h3>
                      <Badge
                        className={cn(
                          exportConfig.enabled
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        )}
                      >
                        {exportConfig.enabled ? 'Active' : 'Paused'}
                      </Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {getScheduleLabel(exportConfig.schedule)}
                      </span>
                      <span className="uppercase">
                        {exportConfig.format}
                      </span>
                      <span>
                        {exportConfig.tables.length} table
                        {exportConfig.tables.length !== 1 ? 's' : ''}
                      </span>
                      {exportConfig.lastExportAt && (
                        <span className="flex items-center gap-1">
                          {exportConfig.lastExportStatus === 'success' ? (
                            <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5 text-red-500" />
                          )}
                          Last: {new Date(exportConfig.lastExportAt).toLocaleDateString()}
                          {exportConfig.lastExportRecordCount !== null && (
                            <span>({exportConfig.lastExportRecordCount.toLocaleString()} rows)</span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRunNow(exportConfig.id)}
                      disabled={runningExportId === exportConfig.id}
                    >
                      {runningExportId === exportConfig.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal(exportConfig)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(exportConfig.id)}
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
                {editingExport ? 'Edit Export' : 'Create Export'}
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setShowModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Export Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Daily Attribution Export"
                />
              </div>

              <div className="space-y-2">
                <Label>Destination</Label>
                <Select
                  value={formData.destinationType}
                  onValueChange={(value: ExportDestinationType) =>
                    setFormData((prev) => ({ ...prev, destinationType: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DESTINATION_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          {option.icon}
                          {option.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Destination-specific configuration */}
              {formData.destinationType === 's3' && (
                <>
                  <div className="space-y-2">
                    <Label>S3 Bucket</Label>
                    <Input
                      value={formData.destinationConfig.bucket ?? ''}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          destinationConfig: {
                            ...prev.destinationConfig,
                            bucket: e.target.value,
                          },
                        }))
                      }
                      placeholder="my-bucket"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Path Prefix</Label>
                    <Input
                      value={formData.destinationConfig.path ?? ''}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          destinationConfig: {
                            ...prev.destinationConfig,
                            path: e.target.value,
                          },
                        }))
                      }
                      placeholder="exports/attribution/"
                    />
                  </div>
                </>
              )}

              {formData.destinationType === 'webhook' && (
                <div className="space-y-2">
                  <Label>Webhook URL</Label>
                  <Input
                    value={formData.destinationConfig.url ?? ''}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        destinationConfig: {
                          ...prev.destinationConfig,
                          url: e.target.value,
                        },
                      }))
                    }
                    placeholder="https://api.example.com/webhook"
                  />
                </div>
              )}

              {formData.destinationType === 'sftp' && (
                <>
                  <div className="space-y-2">
                    <Label>Host</Label>
                    <Input
                      value={formData.destinationConfig.host ?? ''}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          destinationConfig: {
                            ...prev.destinationConfig,
                            host: e.target.value,
                          },
                        }))
                      }
                      placeholder="sftp.example.com"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Port</Label>
                      <Input
                        type="number"
                        value={formData.destinationConfig.port ?? 22}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            destinationConfig: {
                              ...prev.destinationConfig,
                              port: parseInt(e.target.value) || 22,
                            },
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Username</Label>
                      <Input
                        value={formData.destinationConfig.username ?? ''}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            destinationConfig: {
                              ...prev.destinationConfig,
                              username: e.target.value,
                            },
                          }))
                        }
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Schedule</Label>
                  <Select
                    value={formData.schedule}
                    onValueChange={(value: ExportSchedule) =>
                      setFormData((prev) => ({ ...prev, schedule: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Format</Label>
                  <Select
                    value={formData.format ?? 'csv'}
                    onValueChange={(value: ExportFormat) =>
                      setFormData((prev) => ({ ...prev, format: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FORMAT_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tables to Export *</Label>
                <div className="space-y-2">
                  {TABLE_OPTIONS.map((table) => (
                    <label
                      key={table.value}
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-lg border p-3',
                        formData.tables.includes(table.value)
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200'
                      )}
                    >
                      <input
                        type="checkbox"
                        className="rounded border-gray-300"
                        checked={formData.tables.includes(table.value)}
                        onChange={() => toggleTable(table.value)}
                      />
                      <span className="text-sm">{table.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {editingExport && (
                <div className="flex items-center justify-between border-t pt-4">
                  <div>
                    <Label>Enabled</Label>
                    <p className="text-xs text-muted-foreground">
                      Enable scheduled exports
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
                disabled={isSaving || !formData.name || formData.tables.length === 0}
              >
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {editingExport ? 'Save Changes' : 'Create Export'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
