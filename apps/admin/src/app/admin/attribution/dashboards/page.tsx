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
  LayoutDashboard,
  Star,
  X,
  Loader2,
  BarChart2,
  LineChart,
  PieChart,
  Table2,
  Type,
  Eye,
  GripVertical,
} from 'lucide-react'
import { useEffect, useState, useCallback } from 'react'

import type {
  CustomDashboard,
  CustomDashboardCreate,
  DashboardWidget,
  DashboardDateRange,
  WidgetType,
} from '@/lib/attribution'

const DATE_RANGE_OPTIONS: { value: DashboardDateRange; label: string }[] = [
  { value: 'last_7d', label: 'Last 7 Days' },
  { value: 'last_14d', label: 'Last 14 Days' },
  { value: 'last_30d', label: 'Last 30 Days' },
]

const WIDGET_TYPES: { value: WidgetType; label: string; icon: React.ReactNode }[] = [
  { value: 'kpi', label: 'KPI Card', icon: <Type className="h-4 w-4" /> },
  { value: 'line_chart', label: 'Line Chart', icon: <LineChart className="h-4 w-4" /> },
  { value: 'bar_chart', label: 'Bar Chart', icon: <BarChart2 className="h-4 w-4" /> },
  { value: 'pie', label: 'Pie Chart', icon: <PieChart className="h-4 w-4" /> },
  { value: 'table', label: 'Table', icon: <Table2 className="h-4 w-4" /> },
  { value: 'text', label: 'Text/Markdown', icon: <Type className="h-4 w-4" /> },
]

const MAX_WIDGETS = 20

export default function DashboardsPage() {
  const [dashboards, setDashboards] = useState<CustomDashboard[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingDashboard, setEditingDashboard] = useState<CustomDashboard | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [showEditor, setShowEditor] = useState(false)
  const [editorDashboard, setEditorDashboard] = useState<CustomDashboard | null>(null)

  // Form state
  const [formData, setFormData] = useState<CustomDashboardCreate>({
    name: '',
    description: '',
    isDefault: false,
    dateRangeDefault: 'last_30d',
    refreshIntervalMinutes: undefined,
    layout: [],
  })

  const fetchDashboards = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/attribution/dashboards')
      const data = await response.json()
      setDashboards(data.dashboards)
    } catch (err) {
      setError('Failed to load dashboards')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboards()
  }, [fetchDashboards])

  const openCreateModal = () => {
    setEditingDashboard(null)
    setFormData({
      name: '',
      description: '',
      isDefault: false,
      dateRangeDefault: 'last_30d',
      refreshIntervalMinutes: undefined,
      layout: [],
    })
    setShowModal(true)
  }

  const openEditModal = (dashboard: CustomDashboard) => {
    setEditingDashboard(dashboard)
    setFormData({
      name: dashboard.name,
      description: dashboard.description ?? '',
      isDefault: dashboard.isDefault,
      dateRangeDefault: dashboard.dateRangeDefault,
      refreshIntervalMinutes: dashboard.refreshIntervalMinutes ?? undefined,
      layout: dashboard.layout,
    })
    setShowModal(true)
  }

  const openEditor = (dashboard: CustomDashboard) => {
    setEditorDashboard(dashboard)
    setFormData({
      name: dashboard.name,
      description: dashboard.description ?? '',
      isDefault: dashboard.isDefault,
      dateRangeDefault: dashboard.dateRangeDefault,
      refreshIntervalMinutes: dashboard.refreshIntervalMinutes ?? undefined,
      layout: [...dashboard.layout],
    })
    setShowEditor(true)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const url = editingDashboard
        ? `/api/admin/attribution/dashboards/${editingDashboard.id}`
        : '/api/admin/attribution/dashboards'

      const response = await fetch(url, {
        method: editingDashboard ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save dashboard')
      }

      setShowModal(false)
      setShowEditor(false)
      await fetchDashboards()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save dashboard')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this dashboard?')) return

    try {
      const response = await fetch(`/api/admin/attribution/dashboards/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete dashboard')
      }

      await fetchDashboards()
    } catch (err) {
      setError('Failed to delete dashboard')
    }
  }

  const addWidget = (type: WidgetType) => {
    if ((formData.layout?.length ?? 0) >= MAX_WIDGETS) {
      setError(`Maximum of ${MAX_WIDGETS} widgets per dashboard`)
      return
    }

    const newWidget: DashboardWidget = {
      widgetId: `widget_${Date.now()}`,
      widgetType: type,
      x: 0,
      y: formData.layout?.length ?? 0,
      width: type === 'kpi' ? 3 : 6,
      height: type === 'kpi' ? 1 : 2,
      config: {},
    }

    setFormData((prev) => ({
      ...prev,
      layout: [...(prev.layout ?? []), newWidget],
    }))
  }

  const removeWidget = (widgetId: string) => {
    setFormData((prev) => ({
      ...prev,
      layout: (prev.layout ?? []).filter((w) => w.widgetId !== widgetId),
    }))
  }

  const getWidgetIcon = (type: WidgetType) => {
    const widgetType = WIDGET_TYPES.find((w) => w.value === type)
    return widgetType?.icon ?? <LayoutDashboard className="h-4 w-4" />
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="h-9 w-32 animate-pulse rounded bg-muted" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-32 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // Dashboard Editor View
  if (showEditor && editorDashboard) {
    return (
      <div className="space-y-6">
        {/* Editor Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => setShowEditor(false)}>
              <X className="mr-2 h-4 w-4" />
              Close Editor
            </Button>
            <h2 className="text-lg font-semibold">{formData.name}</h2>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowEditor(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Save Changes
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-4">
          {/* Widget Library */}
          <Card className="lg:col-span-1">
            <CardContent className="p-4">
              <h3 className="mb-4 font-medium">Widget Library</h3>
              <div className="space-y-2">
                {WIDGET_TYPES.map((widget) => (
                  <button
                    key={widget.value}
                    onClick={() => addWidget(widget.value)}
                    className="flex w-full items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted"
                  >
                    {widget.icon}
                    <span className="text-sm">{widget.label}</span>
                  </button>
                ))}
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                {formData.layout?.length ?? 0} / {MAX_WIDGETS} widgets
              </p>
            </CardContent>
          </Card>

          {/* Dashboard Canvas */}
          <div className="lg:col-span-3">
            <Card>
              <CardContent className="min-h-[400px] p-4">
                {(formData.layout?.length ?? 0) === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center py-12 text-center">
                    <LayoutDashboard className="h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 font-medium">Empty Dashboard</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Add widgets from the library to build your dashboard
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-12 gap-4">
                    {formData.layout?.map((widget) => (
                      <div
                        key={widget.widgetId}
                        className={cn(
                          'rounded-lg border bg-muted/50 p-4',
                          `col-span-${Math.min(widget.width, 12)}`
                        )}
                        style={{
                          gridColumn: `span ${Math.min(widget.width, 12)}`,
                          minHeight: widget.height * 80,
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <GripVertical className="h-4 w-4 cursor-move text-muted-foreground" />
                            {getWidgetIcon(widget.widgetType)}
                            <span className="text-sm capitalize">
                              {widget.widgetType.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeWidget(widget.widgetId)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="mt-4 flex items-center justify-center text-sm text-muted-foreground">
                          Widget Preview
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  // Dashboard List View
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
          <h2 className="text-lg font-semibold">Custom Dashboards</h2>
          <p className="text-sm text-muted-foreground">
            Create and manage custom attribution dashboards
          </p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="mr-2 h-4 w-4" />
          Create Dashboard
        </Button>
      </div>

      {/* Dashboards Grid */}
      {dashboards.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <LayoutDashboard className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 font-medium">No Custom Dashboards</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Create your first custom dashboard
            </p>
            <Button className="mt-4" onClick={openCreateModal}>
              <Plus className="mr-2 h-4 w-4" />
              Create Dashboard
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {dashboards.map((dashboard) => (
            <Card key={dashboard.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <LayoutDashboard className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{dashboard.name}</h3>
                        {dashboard.isDefault && (
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        )}
                      </div>
                      {dashboard.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {dashboard.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>Widgets</span>
                    <span>{dashboard.layout.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Default Range</span>
                    <span>{dashboard.dateRangeDefault.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Last Updated</span>
                    <span>{new Date(dashboard.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => openEditor(dashboard)}
                  >
                    <Edit2 className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditModal(dashboard)}
                  >
                    Settings
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(dashboard.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-background p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {editingDashboard ? 'Dashboard Settings' : 'Create Dashboard'}
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setShowModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Dashboard Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="My Custom Dashboard"
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={formData.description ?? ''}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Optional description"
                />
              </div>

              <div className="space-y-2">
                <Label>Default Date Range</Label>
                <Select
                  value={formData.dateRangeDefault ?? 'last_30d'}
                  onValueChange={(value: DashboardDateRange) =>
                    setFormData((prev) => ({ ...prev, dateRangeDefault: value }))
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

              <div className="space-y-2">
                <Label>Auto-refresh Interval (minutes)</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.refreshIntervalMinutes ?? ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      refreshIntervalMinutes: e.target.value
                        ? parseInt(e.target.value)
                        : undefined,
                    }))
                  }
                  placeholder="Leave empty to disable"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Set as Default</Label>
                  <p className="text-xs text-muted-foreground">
                    Show this dashboard by default
                  </p>
                </div>
                <Switch
                  checked={formData.isDefault ?? false}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, isDefault: checked }))
                  }
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving || !formData.name}>
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {editingDashboard ? 'Save Changes' : 'Create Dashboard'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
